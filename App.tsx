import React, { useState, useRef, useCallback, useEffect } from 'react';
import FireworkCanvas, { FireworkCanvasHandle } from './components/FireworkCanvas';
import Controls from './components/Controls';
import MainMenu from './components/MainMenu';
import { FireworkConfig, ExplosionShape, GraphicsQuality } from './types';
import { generateFireworkConfig } from './services/geminiService';
import { Flame, Menu } from 'lucide-react';

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
  
  // Settings State
  const [volume, setVolume] = useState<number>(50);
  const [quality, setQuality] = useState<GraphicsQuality>('High');

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
      
      // Auto-launch on generation for instant gratification
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
    const isRainbow = Math.random() > 0.7; // 30% chance of rainbow

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

  const handleSaveSettings = (newVolume: number, newQuality: GraphicsQuality) => {
      setVolume(newVolume);
      setQuality(newQuality);
  };

  const handleStartGame = () => {
    // Explicitly unlock audio context on iOS user gesture
    if (canvasRef.current) {
        canvasRef.current.unlockAudio();
    }
    
    setIsMenuClosing(true);
    // Delay unmounting to allow animation to finish
    setTimeout(() => {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
    }, 800);
  };

  // Background Ambience for Menu
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isMenuOpen) {
        // Launch one immediately if we just entered/loaded
        handleRandom();
        
        interval = setInterval(() => {
            // Randomly fire fireworks to keep the background alive but not chaotic
            if (Math.random() > 0.4) {
                handleRandom();
            }
        }, 2000);
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isMenuOpen, handleRandom]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-950 font-sans selection:bg-indigo-500/30">
      {/* Persistent Background Visuals */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none z-10" />
      
      {/* The Canvas stays mounted so fireworks persist across menu transitions */}
      <FireworkCanvas 
        ref={canvasRef} 
        volume={volume}
        quality={quality}
      />

      {/* Main Menu Overlay */}
      {isMenuOpen && (
        <MainMenu 
            onStart={handleStartGame} 
            initialVolume={volume}
            initialQuality={quality}
            onSaveSettings={handleSaveSettings}
            isClosing={isMenuClosing}
        />
      )}

      {/* Game HUD (Only visible when menu is closed) */}
      {!isMenuOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <header className="absolute top-6 left-6 z-10 pointer-events-none flex items-center justify-between w-[calc(100%-3rem)]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 backdrop-blur-md">
                        <Flame className="w-6 h-6 text-white" fill="white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">Ignis</h1>
                        <p className="text-indigo-300 text-xs font-medium tracking-wider uppercase opacity-80">AI Pyrotechnics</p>
                    </div>
                </div>

                {/* Return to Menu Button */}
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="pointer-events-auto p-2 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/50 backdrop-blur-md"
                    title="Main Menu"
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
            
            {/* Info/Credits */}
            <div className="absolute bottom-4 right-6 z-10 text-right pointer-events-none hidden md:block opacity-50">
                <p className="text-slate-400 text-xs font-light">
                Describe visual parameters • AI translates to physics
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;