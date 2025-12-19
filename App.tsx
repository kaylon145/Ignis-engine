import React, { useState, useRef, useCallback, useEffect } from 'react';
import FireworkCanvas, { FireworkCanvasHandle } from './components/FireworkCanvas';
import Controls from './components/Controls';
import MainMenu from './components/MainMenu';
import { FireworkConfig, ExplosionShape, GraphicsQuality, KaylonMode } from './types';
import { generateFireworkConfig } from './services/geminiService';
import { Menu } from 'lucide-react';

const INITIAL_CONFIG: FireworkConfig = {
  name: "Ignis Starter",
  primaryColor: "#ef4444",
  secondaryColor: "#fbbf24",
  particleCount: 150,
  explosionShape: ExplosionShape.SPHERE,
  explosionSize: 2,
  decayRate: 0.015,
  gravity: 0.1,
  description: "A standard red and gold starter."
};

const App: React.FC = () => {
  const canvasRef = useRef<FireworkCanvasHandle>(null);
  const [currentConfig, setCurrentConfig] = useState<FireworkConfig | null>(INITIAL_CONFIG);
  const [aiThought, setAiThought] = useState<string | null>("Let's light up the sky.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [showGameHUD, setShowGameHUD] = useState(false);
  
  // Settings State
  const [volume, setVolume] = useState<number>(50);
  const [quality, setQuality] = useState<GraphicsQuality>('High');
  const [kaylonMode, setKaylonMode] = useState<KaylonMode>('Matrix');

  const handleLaunch = useCallback((config: FireworkConfig) => {
    if (canvasRef.current) {
      canvasRef.current.launch(config);
    }
  }, []);

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    try {
      const response = await generateFireworkConfig(prompt);
      setCurrentConfig(response.firework);
      setAiThought(response.thought);
      
      if (canvasRef.current) {
        setTimeout(() => {
             canvasRef.current?.launch(response.firework);
        }, 100);
      }
    } catch (err) {
      console.error("Failed to generate", err);
      setAiThought("Something went wrong. Try a simpler description.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  }, []);

  const handleRandom = useCallback(() => {
    const randomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };
    
    const shapes = Object.values(ExplosionShape);
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    const isRainbow = Math.random() > 0.7;

    const randomConfig: FireworkConfig = {
        name: isRainbow ? "Rainbow Surprise" : "Random Burst",
        primaryColor: isRainbow ? 'RAINBOW' : randomColor(),
        secondaryColor: randomColor(),
        particleCount: Math.floor(Math.random() * 200) + 100,
        explosionShape: randomShape as ExplosionShape,
        explosionSize: Math.random() * 2 + 1.5,
        decayRate: Math.random() * 0.02 + 0.01,
        gravity: 0.1,
        description: "Generated randomly"
    };

    setCurrentConfig(randomConfig);
    if (canvasRef.current) {
        canvasRef.current.launch(randomConfig);
    }
  }, []);

  const handleSaveSettings = (newVolume: number, newQuality: GraphicsQuality, newKaylonMode: KaylonMode) => {
      setVolume(newVolume);
      setQuality(newQuality);
      setKaylonMode(newKaylonMode);
  };

  const handleStartGame = () => {
    if (canvasRef.current) {
        canvasRef.current.unlockAudio();
    }
    setIsMenuClosing(true);
    // Begin showing HUD slightly after the fade starts
    setTimeout(() => {
        setShowGameHUD(true);
    }, 400);

    setTimeout(() => {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
    }, 800);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isMenuOpen) {
        handleRandom();
        interval = setInterval(() => {
            if (Math.random() > 0.4) {
                handleRandom();
            }
        }, 2000);
    } else {
        setShowGameHUD(true);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isMenuOpen, handleRandom]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-950 font-sans selection:bg-red-500/30">
      {/* SVG Filters (Shared with In-Game Branding) */}
      <svg width="0" height="0" className="absolute invisible pointer-events-none">
        <defs>
          <filter id="particle-displace-hud"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="1" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" /></filter>
          <filter id="liquid-wave-hud" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="turbulence" baseFrequency="0.02 0.08" numOctaves="2" result="wave"><animate attributeName="baseFrequency" values="0.02 0.08; 0.022 0.1; 0.02 0.08" dur="4s" repeatCount="indefinite" /></feTurbulence><feDisplacementMap in="SourceGraphic" in2="wave" scale="8" /></filter>
          <filter id="fire-warp-hud"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.2" numOctaves="2" result="noise"><animate attributeName="baseFrequency" values="0.03 0.2;0.03 0.3;0.03 0.2" dur="1.5s" repeatCount="indefinite" /></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="10" /></filter>
        </defs>
      </svg>

      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-950/20 to-transparent pointer-events-none z-10" />
      
      <FireworkCanvas 
        ref={canvasRef} 
        volume={volume}
        quality={quality}
        kaylonMode={kaylonMode}
      />

      {isMenuOpen && (
        <MainMenu 
            onStart={handleStartGame} 
            initialVolume={volume}
            initialQuality={quality}
            initialKaylonMode={kaylonMode}
            onSaveSettings={handleSaveSettings}
            isClosing={isMenuClosing}
        />
      )}

      {showGameHUD && !isMenuOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            {/* Header Redesigned to match Main Menu branding */}
            <header className="absolute top-6 left-6 z-10 pointer-events-none flex items-center justify-between w-[calc(100%-3rem)]">
                <div className="flex items-center gap-4">
                    {/* Mini Flame Logo */}
                    <div className="relative p-3 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-xl shadow-xl overflow-hidden shrink-0">
                         <div className="relative w-8 h-8" style={{ filter: 'url(#fire-warp-hud)' }}>
                            <div className="absolute inset-0 bg-red-600 blur-xl opacity-30 animate-pulse" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-gradient-to-t from-red-600 via-orange-500 to-transparent rounded-full animate-flame-main-hud" />
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-4 bg-gradient-to-t from-white via-yellow-100 to-transparent rounded-full animate-flame-core-hud" />
                         </div>
                    </div>
                    
                    {/* Mini Liquid Title */}
                    <div className="flex flex-col" style={{ filter: 'url(#liquid-wave-hud)' }}>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-[0.15em] font-brand italic leading-none">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-red-400" style={{ filter: 'url(#particle-displace-hud)' }}>IGNIS</span>
                        </h1>
                        <p className="text-[8px] text-red-500 font-tech font-bold tracking-[0.6em] uppercase opacity-60 mt-1">Neural Engine</p>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setShowGameHUD(false);
                        setIsMenuOpen(true);
                    }}
                    className="pointer-events-auto p-3 bg-slate-950/60 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-2xl transition-all border border-white/5 hover:border-red-500/40 backdrop-blur-xl shadow-2xl active:scale-90"
                    title="Return to Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </header>

            <Controls 
                onGenerate={handleGenerate}
                onLaunch={handleLaunch}
                onClear={handleClear}
                onRandom={handleRandom}
                isGenerating={isGenerating}
                currentConfig={currentConfig}
                aiThought={aiThought}
            />
            
            <div className="absolute bottom-4 right-6 z-10 text-right pointer-events-none hidden md:block opacity-40">
                <p className="text-slate-500 text-[10px] font-tech uppercase tracking-[0.3em]">
                   Pyrotechnic Sandbox v2.5
                </p>
            </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flame-main-hud { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.1, 1.2); } }
        @keyframes flame-core-hud { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.1, 1.3); } }
        .animate-flame-main-hud { animation: flame-main-hud 0.6s infinite ease-in-out; }
        .animate-flame-core-hud { animation: flame-core-hud 0.4s infinite ease-in-out; }
      `}} />
    </div>
  );
};

export default App;