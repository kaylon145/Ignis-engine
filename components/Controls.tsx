import React, { useState } from 'react';
import { Loader2, Sparkles, Trash2, Wand2, Rocket, Dice5 } from 'lucide-react';
import { FireworkConfig } from '../types';

interface ControlsProps {
  onGenerate: (prompt: string) => void;
  onLaunch: (config: FireworkConfig) => void;
  onClear: () => void;
  onRandom: () => void;
  isGenerating: boolean;
  currentConfig: FireworkConfig | null;
  aiThought: string | null;
}

const Controls: React.FC<ControlsProps> = ({ 
  onGenerate, 
  onLaunch, 
  onClear,
  onRandom,
  isGenerating, 
  currentConfig, 
  aiThought 
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] z-10 w-full max-w-md flex flex-col gap-4 pointer-events-auto pr-6 md:pr-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes back-in-down {
          0% {
            transform: translateY(-150%);
            opacity: 0;
          }
          70% {
            transform: translateY(5%);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-back-in-down {
          animation: back-in-down 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}} />

      {/* Configuration Card */}
      {currentConfig && (
        <div className="bg-slate-950/80 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-back-in-down">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white font-brand italic tracking-tight flex items-center gap-2">
                <span className="text-red-500">#</span> {currentConfig.name}
              </h2>
              <p className="text-slate-400 text-[10px] mt-1 italic font-tech uppercase tracking-widest">{aiThought}</p>
            </div>
            <div className="flex flex-col gap-1 items-end">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-tech">Pattern</span>
                <span className="text-[10px] font-bold text-red-400 border border-red-900/40 bg-red-950/20 px-2.5 py-1 rounded-lg font-tech">
                    {currentConfig.explosionShape}
                </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded-full shadow-inner ring-2 ring-white/10" 
                style={{ 
                    background: currentConfig.primaryColor === 'RAINBOW' 
                    ? 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)' 
                    : currentConfig.primaryColor 
                }} 
              />
              <span className="text-[10px] text-slate-400 font-tech uppercase tracking-tighter">Primary</span>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded-full shadow-inner ring-2 ring-white/10" 
                style={{ backgroundColor: currentConfig.secondaryColor }} 
              />
              <span className="text-[10px] text-slate-400 font-tech uppercase tracking-tighter">Secondary</span>
            </div>
            <div className="text-[10px] text-slate-400 font-tech uppercase">
               Payload: <span className="text-white font-bold">{currentConfig.particleCount}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-tech uppercase">
               Magnitude: <span className="text-white font-bold">{currentConfig.explosionSize.toFixed(1)}x</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
                onClick={() => onLaunch(currentConfig)}
                className="flex-[3] bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 shadow-xl shadow-red-900/20 flex items-center justify-center gap-3 group font-brand text-sm"
            >
                <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                LAUNCH
            </button>
            <button
                onClick={onRandom}
                className="flex-1 bg-slate-800/80 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-2xl transition-all active:scale-95 border border-white/10 flex items-center justify-center"
                title="Random Surprise"
            >
                <Dice5 className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl animate-back-in-down [animation-delay:150ms]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] font-tech flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Neural Designer
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your pyrotechnics..."
              className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-sans transition-all"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white p-4 rounded-2xl transition-all shadow-lg shadow-red-900/20 active:scale-90"
            >
              {isGenerating ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Wand2 className="w-6 h-6" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-center px-1">
             <p className="text-[9px] text-slate-600 font-tech uppercase tracking-widest">
                Gemini 2.5 Engine
             </p>
             <button 
                type="button" 
                onClick={onClear}
                className="text-[9px] text-slate-500 hover:text-red-400 font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
             >
                <Trash2 className="w-3 h-3" /> Purge Sky
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Controls;