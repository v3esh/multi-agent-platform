import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-sm font-medium text-gray-300 tracking-wide">Platform Online</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-tight">
          Multi-Agent Social <br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-600">
            Automation Platform
          </span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Manage AI-driven social personas, coordinate controlled activity, and monitor engagement from a centralized command center.
        </p>
        
        <div className="flex justify-center gap-6">
          <Link href="/agents" className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:scale-105 transition-transform duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            View Agents
          </Link>
          <Link href="/dashboard" className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 backdrop-blur-md">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
