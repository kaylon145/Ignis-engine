import React, { useState, useEffect } from 'react';
import { Play, Flame, Cpu, Settings, X, Volume2, Monitor, Check } from 'lucide-react';
import { GraphicsQuality } from '../types';

interface MainMenuProps {
  onStart: () => void;
  initialVolume: number;
  initialQuality: GraphicsQuality;
  onSaveSettings: (volume: number, quality: GraphicsQuality) => void;
  isClosing: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, initialVolume, initialQuality, onSaveSettings, isClosing }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [quality, setQuality] = useState<GraphicsQuality>(initialQuality);

  useEffect(() => {
    // Trigger entrance animation on mount
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const openSettings = () => {
    setIsSettingsOpen(true);
    // Short delay to ensure DOM render before fading in
    requestAnimationFrame(() => setIsSettingsVisible(true));
  };

  const closeSettings = () => {
    setIsSettingsVisible(false);
    // Wait for animation to finish before removing from DOM
    setTimeout(() => {
        setIsSettingsOpen(false);
    }, 300);
  };

  const handleSave = () => {
    onSaveSettings(volume, quality);
    closeSettings();
  };

  const handleCancel = () => {
    setVolume(initialVolume);
    setQuality(initialQuality);
    closeSettings();
  };

  return (
    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px] overflow-hidden transition-all duration-700 ease-in-out
        ${isVisible && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 blur-sm'}
    `}>
      
      {/* Hero Section */}
      <div className="flex flex-col items-center gap-8 p-8 text-center max-w-4xl w-full z-10">
        
        {/* Animated Logo Container */}
        <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000 rounded-full"></div>
            <div className="relative p-6 bg-slate-900/50 border border-indigo-500/30 rounded-3xl backdrop-blur-md shadow-2xl animate-bounce-slow">
                <Flame className="w-20 h-20 text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" strokeWidth={1.5} />
            </div>
        </div>
        
        <div className="space-y-4">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 drop-shadow-2xl select-none">
              IGNIS
            </h1>
            <div className="flex items-center justify-center gap-3 text-indigo-200/80 text-sm md:text-base font-medium tracking-[0.3em] uppercase">
                <span className="w-8 h-[1px] bg-indigo-500/50"></span>
                <span>AI Pyrotechnics Engine</span>
                <span className="w-8 h-[1px] bg-indigo-500/50"></span>
            </div>
        </div>

        <div className="max-w-md mx-auto space-y-6 mt-4">
            <p className="text-slate-400 text-sm md:text-base leading-relaxed font-light">
                Procedurally generated fireworks powered by <strong className="text-indigo-300 font-semibold">Gemini 2.5</strong>. 
                Describe your vision in natural language and watch the physics simulation adapt instantly.
            </p>
        </div>

        {/* Buttons Container */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-md">
            <button 
                onClick={onStart}
                className="flex-1 group relative px-6 py-4 bg-white text-slate-950 font-bold text-lg rounded-xl
                        hover:-translate-y-1 hover:bg-indigo-50 transition-all duration-300
                        shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]
                        flex items-center justify-center gap-3 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                <Play className="w-5 h-5 fill-slate-950 relative z-10" />
                <span className="relative z-10">Start Engine</span>
            </button>

            <button 
                onClick={openSettings}
                className="flex-1 group relative px-6 py-4 bg-slate-900/60 text-indigo-100 font-bold text-lg rounded-xl
                        hover:-translate-y-1 hover:bg-slate-800/80 transition-all duration-300
                        border border-slate-700 hover:border-indigo-500/50
                        shadow-lg flex items-center justify-center gap-3 backdrop-blur-md"
            >
                <Settings className="w-5 h-5 text-indigo-400 group-hover:rotate-90 transition-transform duration-700 ease-out" />
                <span>Settings</span>
            </button>
        </div>
      </div>

      {/* Feature Pills */}
      <div className="absolute bottom-12 flex gap-4 text-xs font-medium text-slate-500/60 uppercase tracking-wider select-none">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/40 rounded-full border border-slate-800/50">
            <Cpu className="w-3 h-3" />
            <span>Real-time Physics</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/40 rounded-full border border-slate-800/50">
            <Flame className="w-3 h-3" />
            <span>Generative AI</span>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
         <div className={`absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/80 transition-all duration-300 ease-out p-4
             ${isSettingsVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}
         `}>
            <div className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative transition-all duration-300 ease-out
                ${isSettingsVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
            `}>
                <button 
                    onClick={handleCancel}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-400" />
                    System Settings
                </h2>

                <div className="space-y-6">
                    {/* Volume Control */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300 flex items-center gap-2"><Volume2 className="w-4 h-4" /> Master Volume</span>
                            <span className="text-indigo-400 font-mono">{volume}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={volume}
                            onChange={(e) => setVolume(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-colors" 
                        />
                    </div>

                    {/* Graphics Control */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300 flex items-center gap-2"><Monitor className="w-4 h-4" /> Graphics Quality</span>
                            <span className="text-indigo-400 font-mono">{quality}</span>
                        </div>
                         <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                            {(['Low', 'High', 'Ultra'] as const).map((q) => (
                                <button 
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`
                                        py-2 text-xs font-medium rounded-md transition-all
                                        ${quality === q 
                                            ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' 
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}
                                    `}
                                >
                                    {q}
                                </button>
                            ))}
                         </div>
                    </div>

                    <div className="p-4 bg-indigo-900/10 border border-indigo-900/30 rounded-lg">
                        <p className="text-xs text-indigo-200/70 leading-relaxed">
                            <strong className="text-indigo-300">Note:</strong> Quality settings adjust particle counts and lighting effects. Volume controls all generative audio synthesis.
                        </p>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-3">
                    <button 
                        onClick={handleCancel}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all active:scale-95 text-sm flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                        <Check className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default MainMenu;