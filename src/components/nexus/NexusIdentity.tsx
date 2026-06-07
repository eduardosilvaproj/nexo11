import React from 'react';

const NEXUS_COLORS = {
  blue: '#1A9BE8',
  green: '#22C97A',
  dark: '#1B1F28',
  white: '#FFFFFF',
};

const NexusSymbol = ({ color1 = NEXUS_COLORS.blue, color2 = NEXUS_COLORS.green, size = "100%", className = "" }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: size, height: size }}>
    <defs>
      <linearGradient id="nexus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color1} />
        <stop offset="100%" stopColor={color2} />
      </linearGradient>
    </defs>
    <path d="M30 20L50 40L70 20" stroke="url(#nexus-gradient)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 80L50 60L70 80" stroke="url(#nexus-gradient)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 30L40 50L20 70" stroke="url(#nexus-gradient)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M80 30L60 50L80 70" stroke="url(#nexus-gradient)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoText = ({ mainColor = NEXUS_COLORS.white, subColor = "rgba(255,255,255,0.6)", horizontal = true }) => (
  <div className={`flex ${horizontal ? 'flex-row items-center ml-4' : 'flex-col items-center mt-4'} font-sans`}>
    <div className="flex flex-col leading-none">
      <span style={{ color: mainColor }} className="text-4xl font-black tracking-tighter uppercase italic">NEXUS</span>
      <span style={{ color: subColor }} className="text-[10px] tracking-[0.4em] uppercase font-medium mt-1">Planejados</span>
    </div>
  </div>
);

export const NexusIdentity = () => {
  return (
    <div className="p-10 bg-[#0B0D11] min-h-screen text-white font-sans">
      <h1 className="text-2xl font-bold mb-8 text-slate-400">NEXUS Visual Identity System</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">1. Main Logo (Color)</h2>
          <div className="bg-[#1B1F28] p-12 rounded-2xl flex items-center justify-center border border-white/5">
            <div className="flex items-center">
              <NexusSymbol size="80px" />
              <LogoText />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">2. Logo White</h2>
          <div className="bg-[#1A9BE8] p-12 rounded-2xl flex items-center justify-center">
            <div className="flex items-center">
              <NexusSymbol size="80px" color1="#FFF" color2="#FFF" />
              <LogoText mainColor="#FFF" subColor="#FFF" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">3. Logo Black</h2>
          <div className="bg-white p-12 rounded-2xl flex items-center justify-center">
            <div className="flex items-center">
              <NexusSymbol size="80px" color1="#000" color2="#000" />
              <LogoText mainColor="#000" subColor="#333" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">4. Horizontal</h2>
          <div className="bg-[#1B1F28] p-8 rounded-2xl flex items-center justify-center border border-white/5">
             <div className="flex items-center">
              <NexusSymbol size="40px" />
              <LogoText />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">5. Vertical</h2>
          <div className="bg-[#1B1F28] p-12 rounded-2xl flex items-center justify-center border border-white/5">
            <div className="flex flex-col items-center">
              <NexusSymbol size="100px" />
              <LogoText horizontal={false} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-500">6. Symbol X</h2>
          <div className="bg-[#1B1F28] p-12 rounded-2xl flex items-center justify-center border border-white/5">
            <NexusSymbol size="120px" />
          </div>
        </section>
      </div>

      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
         <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center overflow-hidden">
               <NexusSymbol size="24px" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase">Favicon 32x32</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-white/5 rounded flex items-center justify-center overflow-hidden">
               <NexusSymbol size="48px" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase">Favicon 64x64</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden">
               <NexusSymbol size="96px" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase">App Icon 192x192</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-48 bg-white/5 rounded-[40px] flex items-center justify-center overflow-hidden">
               <NexusSymbol size="160px" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase">App Icon 512x512</span>
         </div>
      </div>
    </div>
  );
};
