import React from 'react';
import { LogoOficial } from '../apresentacao/LogoOficial';

const NEXUS_COLORS = [
  { name: 'Nexus Blue', hex: '#1A9BE8', tailwind: 'bg-[#1A9BE8]' },
  { name: 'Nexus Green', hex: '#22C97A', tailwind: 'bg-[#22C97A]' },
  { name: 'Nexus Dark', hex: '#1B1F28', tailwind: 'bg-[#1B1F28]' },
  { name: 'Nexus Sidebar', hex: '#0B0D11', tailwind: 'bg-[#0B0D11]' },
  { name: 'Pure White', hex: '#FFFFFF', tailwind: 'bg-white' },
];

export const NexusIdentity = () => {
  return (
    <div className="p-10 bg-[#0B0D11] min-h-screen text-white font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">NEXUS Identity System</h1>
          <p className="text-slate-400 max-w-2xl">
            A premium, corporate SaaS identity for furniture industry management. 
            Focused on connectivity (X) and multiplied results.
          </p>
        </header>

        {/* 1. Logos Grid */}
        <section className="mb-20">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-8 font-bold border-b border-white/10 pb-4">Logos & Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <span className="text-xs text-slate-500 uppercase">Main Full Logo</span>
              <div className="bg-[#1B1F28] p-12 rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl">
                <LogoOficial size="xl" glow="soft" />
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs text-slate-500 uppercase">Hero Presence</span>
              <div className="bg-[#0B0D11] p-12 rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A9BE8]/10 to-transparent pointer-events-none" />
                <LogoOficial size="hero" glow="premium" />
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs text-slate-500 uppercase">Symbol Isolated</span>
              <div className="bg-[#1B1F28] p-12 rounded-3xl flex items-center justify-center border border-white/5">
                <img src="/nexus/logos/symbol-x.svg" className="w-24 h-24" alt="Nexus Symbol" />
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs text-slate-500 uppercase">Small Variations (Horizontal/Vertical)</span>
              <div className="bg-[#1B1F28] p-12 rounded-3xl flex flex-col gap-12 items-center justify-center border border-white/5">
                <img src="/nexus/logos/logo-horizontal.svg" className="w-48" alt="Horizontal" />
                <img src="/nexus/logos/logo-vertical.svg" className="w-24" alt="Vertical" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Color Palette */}
        <section className="mb-20">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-8 font-bold border-b border-white/10 pb-4">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {NEXUS_COLORS.map(color => (
              <div key={color.name} className="space-y-3">
                <div className={`${color.tailwind} aspect-square rounded-2xl shadow-xl border border-white/10`} />
                <div>
                  <div className="text-sm font-bold">{color.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{color.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Typography */}
        <section className="mb-20">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-8 font-bold border-b border-white/10 pb-4">Typography & Tone</h2>
          <div className="bg-[#1B1F28] p-10 rounded-3xl border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-5xl font-black italic tracking-tighter uppercase">NEXUS</h3>
                <p className="text-2xl font-semibold tracking-tight leading-tight">
                  Gestão que conecta.<br />
                  <span className="text-[#1A9BE8]">Resultado que multiplica.</span>
                </p>
              </div>
              <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
                <p>NEXUS utilizes a bold, slanted grotesque font for its wordmark, suggesting speed and momentum.</p>
                <p>The "Planejados" subscript uses a wide-tracked medium sans-serif for stability and industry focus.</p>
                <div className="pt-4 flex gap-4">
                  <span className="px-4 py-2 rounded-lg bg-white/5 text-white font-black italic uppercase">Bold Italic</span>
                  <span className="px-4 py-2 rounded-lg bg-white/5 text-white font-medium uppercase tracking-[0.2em]">Wide Medium</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Assets Manifest */}
        <section>
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-8 font-bold border-b border-white/10 pb-4">Export Assets Manifest</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'logo-main.svg', 'logo-white.svg', 'logo-black.svg', 'logo-horizontal.svg', 
              'logo-vertical.svg', 'symbol-x.svg', 'icon-32.svg', 'icon-64.svg',
              'icon-192.svg', 'icon-512.svg'
            ].map(file => (
              <div key={file} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 truncate mr-2">{file}</span>
                <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase">SVG</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
