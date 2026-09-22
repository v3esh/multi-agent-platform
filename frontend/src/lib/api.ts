const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// Auth
export async function login(email: string, password: string): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  return data.access_token;
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Agents
export interface Agent {
  id: number;
  name: string;
  description?: string;
  status: string;
  active_window?: string;
  frequency_limit: number;
  reddit_username?: string;
  reddit_linked?: boolean;
  permission_profile_id?: number;
  created_at?: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  status?: string;
  active_window?: string;
  frequency_limit?: number;
  permission_profile_id?: number;
}

export const agentsApi = {
  list: () => request<Agent[]>("/api/agents/"),
  create: (data: AgentCreate) =>
    request<Agent>("/api/agents/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<AgentCreate>) =>
    request<Agent>(`/api/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<Agent>(`/api/agents/${id}`, { method: "DELETE" }),
  runCycles: () =>
    request<{ total_agents: number; evaluated: number; queued_approvals: number; auto_executed: number; skipped: number; details: string[] }>("/api/agents/run-cycles", { method: "POST" }),
  bulkStatus: (status: string, agent_ids?: number[]) =>
    request<{ message: string; updated_count: number; status: string }>("/api/agents/bulk-status", {
      method: "POST",
      body: JSON.stringify({ status, agent_ids }),
    }),
};

// Personas
export interface Persona {
  id: number;
  name: string;
  personality?: string;
  interests?: string;
  communication_style?: string;
  behavior?: string;
  agent_id?: number;
}

export interface PersonaCreate {
  name: string;
  personality?: string;
  interests?: string;
  communication_style?: string;
  behavior?: string;
  agent_id?: number;
}

export const personasApi = {
  list: () => request<Persona[]>("/api/personas/"),
  create: (data: PersonaCreate) =>
    request<Persona>("/api/personas/", { method: "POST", body: JSON.stringify(data) }),
  generate: (base_description: string, agent_id?: number) =>
    request<Persona>("/api/personas/generate", {
      method: "POST",
      body: JSON.stringify({ base_description, agent_id }),
    }),
  update: (id: number, data: Partial<PersonaCreate>) =>
    request<Persona>(`/api/personas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<Persona>(`/api/personas/${id}`, { method: "DELETE" }),
};

// Approvals
export interface Approval {
  id: number;
  agent_id: number;
  action_type: string;
  proposed_content: string;
  status: string;
  created_at?: string;
}

export const approvalsApi = {
  list: (status?: string) =>
    request<Approval[]>(`/api/approvals${status ? `?status=${status}` : ""}`),
  create: (data: { agent_id: number; action_type: string; proposed_content: string }) =>
    request<Approval>("/api/approvals/", { method: "POST", body: JSON.stringify(data) }),
  approve: (id: number) => request<Approval>(`/api/approvals/${id}/approve`, { method: "POST" }),
  reject: (id: number) => request<Approval>(`/api/approvals/${id}/reject`, { method: "POST" }),
};

// Logs
export interface ActivityLog {
  id: number;
  agent_id?: number;
  action_type: string;
  status: string;
  details?: string;
  target_reference?: string;
  created_at?: string;
}

export const logsApi = {
  list: () => request<ActivityLog[]>("/api/logs/"),
};

// Reddit Actions
export const redditApi = {
  getAuthUrl: (agent_id: number) =>
    request<{ url: string }>(`/api/reddit/login/${agent_id}`),
  connectAccount: (agent_id: number, reddit_username: string) =>
    request<{ message: string; reddit_username: string }>(`/api/reddit/connect/${agent_id}`, {
      method: "POST",
      body: JSON.stringify({ reddit_username }),
    }),
  disconnectAccount: (agent_id: number) =>
    request<{ message: string }>(`/api/reddit/disconnect/${agent_id}`, {
      method: "DELETE",
    }),
  postComment: (agent_id: number, submission_id: string, content: string) =>
    request<{ status: string; message?: string; approval_id?: number; result?: any }>("/api/reddit/comment", {
      method: "POST",
      body: JSON.stringify({ agent_id, submission_id, content }),
    }),
};

// Permissions & Profiles
export interface PermissionRule {
  id?: number;
  action_type: string;
  requires_approval: boolean;
  daily_limit?: number;
}

export interface PermissionProfile {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  permissions: PermissionRule[];
}

export interface PermissionProfileCreate {
  name: string;
  description?: string;
  permissions: PermissionRule[];
}

export const permissionsApi = {
  listProfiles: () => request<PermissionProfile[]>("/api/permissions/profiles"),
  createProfile: (data: PermissionProfileCreate) =>
    request<PermissionProfile>("/api/permissions/profiles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteProfile: (id: number) =>
    request<{ message: string }>(`/api/permissions/profiles/${id}`, {
      method: "DELETE",
    }),
};
