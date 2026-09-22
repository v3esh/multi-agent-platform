import os
import json
import httpx
import random
from app.core.config import settings

class AIService:
    """
    AI Service for generating personas and content using Groq AI or OpenAI compatible endpoints.
    Groq endpoint: https://api.groq.com/openai/v1/chat/completions
    """
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    def _build_dynamic_persona(self, base_description: str) -> dict:
        """
        Creates a custom, unique persona derived directly from user's base_description prompt.
        Used as dynamic fallback when LLM API is unavailable.
        """
        words = [w.strip(" .,!?:;") for w in base_description.split() if len(w) > 2]
        topic = " ".join(words[:4]).title() if words else "Specialist"
        
        name_prefixes = ["Scout", "Analyst", "Guru", "Echo", "Maven", "Voyager", "Pulse", "Nexus"]
        prefix = random.choice(name_prefixes)
        name = f"{topic}_{prefix}"

        styles = [
            f"Direct, insightful, and focused on {base_description.lower()}.",
            f"Analytical, detailed, with emphasis on real-world examples in {base_description.lower()}.",
            f"Engaging, conversational tone tailored for Reddit communities interested in {base_description.lower()}.",
            f"Technical, concise, and pragmatic when discussing {base_description.lower()}."
        ]
        
        temperaments = [
            f"Passionate advocate and thought-leader in {base_description.lower()}.",
            f"Curious researcher dedicated to analyzing trends in {base_description.lower()}.",
            f"Experienced practitioner sharing actionable insights on {base_description.lower()}.",
            f"Balanced reviewer offering objective perspectives on {base_description.lower()}."
        ]

        return {
            "name": name,
            "personality": random.choice(temperaments),
            "interests": f"{base_description}, Innovation, Best Practices",
            "communication_style": random.choice(styles),
            "behavior": f"Monitors online discussions regarding {base_description.lower()} and posts constructive comments."
        }

    async def generate_persona(self, base_description: str) -> dict:
        """
        Uses Groq AI to generate a detailed persona profile based on a brief description.
        """
        api_key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
        
        # If no key or placeholder key, use dynamic generator
        if not api_key or "your_groq_api_key" in api_key.lower():
            return self._build_dynamic_persona(base_description)

        prompt = f"""
You are an expert persona engine. Generate a detailed agent persona JSON based on this description: "{base_description}".
Return ONLY a valid JSON object with the following keys:
- "name": A realistic name/handle
- "personality": 1-2 sentences describing temperament
- "interests": key topics separated by commas
- "communication_style": tone, style, formatting choices
- "behavior": how the persona interacts on social platforms like Reddit
"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.LLM_MODEL or "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(self.GROQ_URL, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)
                else:
                    print(f"Groq API returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"Groq API call error: {e}")

        # Fallback if API call fails
        return self._build_dynamic_persona(base_description)

    async def generate_content(self, persona: dict, topic: str) -> str:
        """
        Uses Groq LLM to generate content/comment matching the persona's style.
        """
        api_key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
        if not api_key or "your_groq_api_key" in api_key.lower():
            return f"As {persona.get('name', 'an agent')}, here is a key insight on {topic}: focusing on practical application yields the best outcomes."

        prompt = f"""
You are {persona.get('name')}. 
Personality: {persona.get('personality')}
Style: {persona.get('communication_style')}

Write a concise, natural Reddit comment responding to a post about: "{topic}".
Return ONLY the comment text.
"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.LLM_MODEL or "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(self.GROQ_URL, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Groq API call error: {e}")

        return f"Interesting perspective on {topic}! From my experience, clear system design makes all the difference."

ai_service = AIService()
