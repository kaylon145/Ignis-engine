import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { GraphicsQuality, KaylonMode } from '../types';

interface MainMenuProps {
  onStart: () => void;
  initialVolume: number;
  initialQuality: GraphicsQuality;
  initialKaylonMode: KaylonMode;
  onSaveSettings: (volume: number, quality: GraphicsQuality, kaylonMode: KaylonMode) => void;
  isClosing: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, initialVolume, initialQuality, initialKaylonMode, onSaveSettings, isClosing }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [quality, setQuality] = useState<GraphicsQuality>(initialQuality);
  const [kaylonMode, setKaylonMode] = useState<KaylonMode>(initialKaylonMode);
  
  // 'hidden' | 'visible' | 'fading'
  const [wipStatus, setWipStatus] = useState<'hidden' | 'visible' | 'fading'>('hidden');
  const wipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wipFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal state if initial props change (e.g. re-opening menu)
  useEffect(() => {
    setVolume(initialVolume);
    setQuality(initialQuality);
    setKaylonMode(initialKaylonMode);
  }, [initialVolume, initialQuality, initialKaylonMode]);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    return () => {
        if (wipTimerRef.current) clearTimeout(wipTimerRef.current);
        if (wipFadeTimerRef.current) clearTimeout(wipFadeTimerRef.current);
    };
  }, []);

  const openSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(true);
    requestAnimationFrame(() => setIsSettingsVisible(true));
  };

  const closeSettings = () => {
    setIsSettingsVisible(false);
    setTimeout(() => setIsSettingsOpen(false), 300);
  };

  const handleSave = () => {
    onSaveSettings(volume, quality, kaylonMode);
    closeSettings();
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart();
  };

  const handleVectorClick = () => {
    if (wipStatus !== 'hidden') return; // Prevent spamming while active

    setWipStatus('visible');
    
    // Hold visible for 2.5 seconds
    wipTimerRef.current = setTimeout(() => {
        setWipStatus('fading');
        
        // Allow fade out for 1 second
        wipFadeTimerRef.current = setTimeout(() => {
            setWipStatus('hidden');
        }, 1000);
    }, 2500);
  };

  const letters = "IGNIS".split('');

  return (
    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-[10px] overflow-hidden transition-all duration-1000 ease-in-out px-6
        ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0 scale-105 blur-2xl'}
    `}>
      
      {/* SVG Filters */}
      <svg width="0" height="0" className="absolute invisible pointer-events-none">
        <defs>
          <filter id="particle-displace">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
          </filter>
          <filter id="liquid-wave" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="turbulence" baseFrequency="0.01 0.05" numOctaves="3" result="wave">
              <animate attributeName="baseFrequency" values="0.01 0.05; 0.012 0.06; 0.01 0.05" dur="6s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="wave" scale="10" />
          </filter>
          <filter id="bloom-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b3" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="25" result="b4" />
            <feMerge>
                <feMergeNode in="b4" />
                <feMergeNode in="b3" />
                <feMergeNode in="b2" />
                <feMergeNode in="b1" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="fire-warp">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="2" result="noise">
              <animate attributeName="baseFrequency" values="0.02 0.15;0.02 0.25;0.02 0.15" dur="2s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" />
          </filter>
        </defs>
      </svg>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 blur-[100px] rounded-full animate-pulse-slow pointer-events-none" />

      <div className="flex flex-col items-center justify-center gap-10 py-8 h-full max-h-screen w-full max-w-5xl z-10" style={{ perspective: '1200px' }}>
        
        {/* Logo - Scaled down to save space */}
        <div className="relative flex flex-col items-center pointer-events-none will-change-transform shrink-0" 
             style={{ transformStyle: 'preserve-3d', animation: 'float3D 10s ease-in-out infinite' }}>
            <div className="relative p-8 bg-gradient-to-b from-slate-800/20 to-slate-950/90 border border-white/5 rounded-[2.5rem] backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
                 style={{ transform: 'translateZ(60px)', transformStyle: 'preserve-3d' }}>
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="relative w-full h-full" style={{ filter: 'url(#fire-warp)' }}>
                        <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-18 bg-gradient-to-t from-red-600 via-orange-500 to-transparent rounded-full animate-flame-main" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-10 bg-gradient-to-t from-white via-yellow-100 to-transparent rounded-full animate-flame-core" />
                    </div>
                </div>
            </div>
        </div>

        {/* Title */}
        <div className="relative flex flex-col items-center w-full shrink-0" 
             style={{ 
                transform: 'translateZ(120px)', 
                transformStyle: 'preserve-3d'
             }}>
            <h1 className="text-[5.5rem] md:text-[9rem] font-bold tracking-[0.1em] leading-none select-none italic font-brand text-white text-center"
                style={{ transformStyle: 'preserve-3d' }}>
              
              <span className="relative z-10 block animate-text-plasma-slow">
                 {/* Main Texture Layer with Liquid Wave Filter and Soft True Bloom */}
                 <span className="relative z-10 block" style={{ filter: 'url(#liquid-wave) url(#bloom-glow)' }}>
                     {letters.map((char, i) => (
                        <span key={i} 
                              className="animate-wave inline-block text-transparent bg-clip-text bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0.5px,transparent_1.5px)] bg-[length:4px_4px]"
                              style={{ animationDelay: `${i * 0.12}s` }}>
                            {char}
                        </span>
                     ))}
                 </span>

                 {/* Glow/Color Overlay Layer - Synced Wave */}
                 <div className="absolute inset-0 flex justify-center pointer-events-none mix-blend-screen opacity-60"
                      style={{ transform: 'translateZ(10px)' }}>
                     {letters.map((char, i) => (
                        <span key={i} 
                              className="animate-wave inline-block animate-color-cycle-smooth"
                              style={{ animationDelay: `${i * 0.12}s`, textShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}>
                            {char}
                        </span>
                     ))}
                 </div>
              </span>
            </h1>

            <div className="flex items-center gap-6 mt-2 opacity-30 font-tech" style={{ transform: 'translateZ(40px)' }}>
                <div className="h-[1px] w-16 bg-red-500/50" />
                <span className="text-[8px] uppercase tracking-[1.2em] text-red-100/80 whitespace-nowrap animate-pulse">Neural Engine v2.5</span>
                <div className="h-[1px] w-16 bg-red-500/50" />
            </div>
        </div>

        {/* Buttons - Lifted up */}
        <div className="relative flex flex-col sm:flex-row gap-5 w-full max-w-lg z-50 mt-4 shrink-0" style={{ transform: 'translateZ(150px)', transformStyle: 'preserve-3d' }}>
            <button 
                onClick={handleStart}
                className="flex-[2] group relative h-18 bg-gradient-to-br from-red-500 via-red-600 to-orange-700 text-white font-bold font-brand text-lg rounded-2xl
                        hover:-translate-y-1 transition-all duration-300 shadow-[0_15px_40px_rgba(220,38,38,0.4)] hover:shadow-[0_30px_60px_rgba(220,38,38,0.6)]
                        flex items-center justify-center gap-4 overflow-hidden active:scale-95 cursor-pointer pointer-events-auto"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                <Play className="w-7 h-7 fill-white" />
                <span className="uppercase tracking-[0.3em]">Ignite</span>
            </button>

            <button 
                onClick={openSettings}
                className="flex-1 group relative h-18 bg-slate-900/60 text-white font-bold rounded-2xl
                        hover:-translate-y-1 transition-all duration-300 border border-white/10 hover:border-red-500/40
                        shadow-2xl flex items-center justify-center gap-3 backdrop-blur-3xl active:scale-95 cursor-pointer pointer-events-auto"
            >
                <Settings className="w-5 h-5 text-red-400 group-hover:rotate-90 transition-transform duration-500" />
                <span className="uppercase tracking-widest text-[9px] font-black font-tech">Config</span>
            </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
         <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/95 transition-all duration-500 p-6 pointer-events-auto
             ${isSettingsVisible ? 'opacity-100 backdrop-blur-2xl' : 'opacity-0 backdrop-blur-none'}
         `}>
            <div className={`w-full max-w-sm bg-slate-950 border border-white/10 rounded-[2.5rem] p-8 shadow-[0_80px_160px_rgba(0,0,0,1)] relative transition-all duration-500
                ${isSettingsVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'}
            `}>
                <button onClick={closeSettings} className="absolute top-6 right-6 text-slate-500 hover:text-white p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                <h2 className="text-2xl font-bold text-white tracking-widest font-brand mb-8 uppercase italic">Config</h2>
                
                {/* WIP Popup */}
                {wipStatus !== 'hidden' && (
                    <div className={`absolute inset-0 flex items-center justify-center z-50 pointer-events-none transition-all duration-1000 ease-out
                        ${wipStatus === 'visible' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                    `}>
                        <div className="bg-slate-950/90 border border-red-500/50 px-5 py-3 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.3)] backdrop-blur-xl flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                            <span className="text-red-500 font-tech text-[10px] tracking-[0.2em] font-bold uppercase whitespace-nowrap">
                                ( In Progress )
                            </span>
                        </div>
                    </div>
                )}

                <div className="space-y-10 font-tech">
                    <div className="space-y-4">
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-[0.4em]">Audio Output</span>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Mute', val: 0 },
                                { label: 'Low', val: 25 },
                                { label: 'Mid', val: 50 },
                                { label: 'Max', val: 100 }
                            ].map((opt) => (
                                <button 
                                    key={opt.label} 
                                    onClick={() => setVolume(opt.val)} 
                                    className={`py-3 text-[8px] font-bold rounded-xl transition-all uppercase tracking-[0.2em] border active:scale-95
                                        ${volume === opt.val
                                            ? 'bg-red-600 border-red-500 text-white shadow-lg' 
                                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-[0.4em]">Graphics</span>
                        <div className="grid grid-cols-3 gap-2">
                            {(['Low', 'High', 'Ultra'] as const).map((q) => (
                                <button key={q} onClick={() => setQuality(q)} className={`py-3 text-[8px] font-bold rounded-xl transition-all uppercase tracking-[0.2em] border active:scale-95 ${quality === q ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}>{q}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                         <span className="text-[9px] font-bold uppercase text-slate-500 tracking-[0.4em]">Kaylon Options</span>
                         <div className="grid grid-cols-2 gap-2">
                            {(['Vector', 'Matrix'] as const).map((mode) => {
                                const isVector = mode === 'Vector';
                                return (
                                    <button 
                                        key={mode} 
                                        onClick={isVector ? handleVectorClick : () => setKaylonMode(mode)} 
                                        className={`py-3 text-[8px] font-bold rounded-xl transition-all uppercase tracking-[0.2em] border relative overflow-hidden active:scale-95
                                            ${isVector 
                                                ? 'bg-slate-900/50 border-white/5 text-slate-600 opacity-50 hover:bg-slate-800/80 cursor-pointer' 
                                                : kaylonMode === mode 
                                                    ? 'bg-red-600 border-red-500 text-white shadow-lg' 
                                                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                );
                            })}
                         </div>
                    </div>
                </div>
                <button onClick={handleSave} className="w-full mt-10 py-4 bg-red-600 text-white font-bold rounded-xl text-[9px] uppercase tracking-[0.5em] hover:bg-red-500 transition-all font-brand active:scale-95">Apply</button>
            </div>
         </div>
       )}

       <style dangerouslySetInnerHTML={{ __html: `
            @keyframes float3D { 0%, 100% { transform: rotateX(0deg) rotateY(0deg); } 25% { transform: rotateX(8deg) rotateY(-5deg); } 50% { transform: rotateX(-5deg) rotateY(8deg); } }
            @keyframes text-plasma-slow { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.02); filter: brightness(1.2); } }
            @keyframes color-cycle-smooth { 0%, 100% { color: #ffffff; text-shadow: 0 0 20px #ef4444; } 50% { color: #fff9c4; text-shadow: 0 0 20px #ff9800; } }
            @keyframes shimmer { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(150%) skewX(-20deg); } }
            @keyframes flame-main { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.1, 1.2); } }
            @keyframes flame-core { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.1, 1.3); } }
            @keyframes pulse-slow { 0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.05); } }
            @keyframes wave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
            .animate-shimmer { animation: shimmer 2.5s infinite; }
            .animate-text-plasma-slow { animation: text-plasma-slow 4s infinite ease-in-out; }
            .animate-color-cycle-smooth { animation: color-cycle-smooth 8s infinite ease-in-out; }
            .animate-flame-main { animation: flame-main 0.5s infinite ease-in-out; }
            .animate-flame-core { animation: flame-core 0.3s infinite ease-in-out; }
            .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
            .animate-wave { animation: wave 3s ease-in-out infinite; }
            .will-change-transform { will-change: transform; }
            .h-18 { height: 4.5rem; }
       `}} />
    </div>
  );
};

export default MainMenu;