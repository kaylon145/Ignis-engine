import React, { useState } from 'react';
import { Loader2, Sparkles, Trash2, Wand2, Rocket, Dice5 } from 'lucide-react';
import { FireworkConfig, ExplosionShape } from '../types';

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
      {/* Configuration Card */}
      {currentConfig && (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {currentConfig.name}
              </h2>
              <p className="text-slate-400 text-xs mt-1 italic">{aiThought}</p>
            </div>
            <div className="flex flex-col gap-1 items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Shape</span>
                <span className="text-xs font-medium text-emerald-400 border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 rounded">
                    {currentConfig.explosionShape}
                </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ring-1 ring-slate-600" 
                style={{ 
                    background: currentConfig.primaryColor === 'RAINBOW' 
                    ? 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)' 
                    : currentConfig.primaryColor 
                }} 
              />
              <span className="text-xs text-slate-300">Primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ring-1 ring-slate-600" 
                style={{ backgroundColor: currentConfig.secondaryColor }} 
              />
              <span className="text-xs text-slate-300">Secondary</span>
            </div>
            <div className="text-xs text-slate-300">
               Particles: <span className="text-white font-mono">{currentConfig.particleCount}</span>
            </div>
            <div className="text-xs text-slate-300">
               Size: <span className="text-white font-mono">{currentConfig.explosionSize.toFixed(1)}x</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
                onClick={() => onLaunch(currentConfig)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 group"
            >
                <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                Launch
            </button>
            <button
                onClick={onRandom}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-all active:scale-95 shadow-lg shadow-purple-900/20 flex items-center justify-center"
                title="Random Surprise"
            >
                <Dice5 className="w-5 h-5 animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Design your firework
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A massive red heart that turns to gold dust"
              className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white p-3 rounded-lg transition-colors border border-slate-600"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5 text-indigo-400" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-center mt-1">
             <p className="text-[10px] text-slate-500">
                Powered by Gemini 2.5 Flash
             </p>
             <button 
                type="button" 
                onClick={onClear}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
             >
                <Trash2 className="w-3 h-3" /> Clear Sky
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Controls;