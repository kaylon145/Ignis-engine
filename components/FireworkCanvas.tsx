import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ExplosionShape, FireworkConfig, GraphicsQuality, KaylonMode } from '../types';

interface FireworkCanvasProps {
  volume: number;
  quality: GraphicsQuality;
  kaylonMode: KaylonMode;
}

export interface FireworkCanvasHandle {
  launch: (config: FireworkConfig) => void;
  clear: () => void;
  unlockAudio: () => void;
}

const SoundManager = {
  ctx: null as AudioContext | null,
  masterVolume: 1.0,

  setVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
  },
  
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  },

  resume() {
    this.init();
    if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
      this.ctx.resume().catch((e) => console.warn("Audio resume failed", e));
    }
  },

  playLaunch() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const vol = this.masterVolume;
    if (vol <= 0.01) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    gain.gain.setValueAtTime(0.2 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);

    const whistle = this.ctx.createOscillator();
    const wGain = this.ctx.createGain();
    whistle.connect(wGain);
    wGain.connect(this.ctx.destination);
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(400, t);
    whistle.frequency.exponentialRampToValueAtTime(800, t + 0.4);
    wGain.gain.setValueAtTime(0.05 * vol, t);
    wGain.gain.linearRampToValueAtTime(0, t + 0.4);
    whistle.start(t);
    whistle.stop(t + 0.4);
  },

  playExplosion(size: number = 1) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const vol = this.masterVolume;
    if (vol <= 0.01) return;
    const sizeMod = Math.min(Math.max(size, 0.5), 3);

    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.type = 'square';
    boomOsc.frequency.setValueAtTime(80, t);
    boomOsc.frequency.exponentialRampToValueAtTime(10, t + 0.8);
    boomGain.gain.setValueAtTime(0.4 * sizeMod * vol, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    boomOsc.start(t);
    boomOsc.stop(t + 0.8);

    for (let i = 0; i < 3; i++) {
        const crackle = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        crackle.connect(cGain);
        cGain.connect(this.ctx.destination);
        crackle.type = 'sawtooth';
        crackle.frequency.setValueAtTime(random(200, 600), t);
        crackle.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        cGain.gain.setValueAtTime(0.1 * sizeMod * vol, t + i * 0.05);
        cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1 + i * 0.05);
        crackle.start(t + i * 0.05);
        crackle.stop(t + 0.2 + i * 0.05);
    }
  }
};

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const hexToRgb = (hex: string) => {
  if (hex === 'RAINBOW') return { r: 255, g: 255, b: 255 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.floor(255 * f(0)), g: Math.floor(255 * f(8)), b: Math.floor(255 * f(4)) };
};

class Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  alpha: number;
  rgb: { r: number, g: number, b: number };
  secondaryRgb: { r: number, g: number, b: number };
  decay: number;
  gravity: number;
  drag: number;
  flicker: boolean;
  flickerOffset: number;
  size: number;
  history: [number, number, number][];

  constructor(x: number, y: number, z: number, config: FireworkConfig, vx: number, vy: number, vz: number) {
    this.x = x; this.y = y; this.z = z;
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.alpha = 1;
    if (config.primaryColor === 'RAINBOW') {
        const h = random(0, 360);
        this.rgb = hslToRgb(h, 95, 75);
        this.secondaryRgb = hslToRgb(h + 30, 95, 60);
    } else {
        this.rgb = hexToRgb(config.primaryColor);
        this.secondaryRgb = hexToRgb(config.secondaryColor);
    }
    this.decay = config.decayRate * random(0.5, 1.2);
    this.gravity = config.gravity * random(0.7, 1.0);
    this.drag = 0.92 + random(0, 0.04); 
    this.flicker = Math.random() > 0.4;
    this.flickerOffset = Math.random() * 500;
    this.size = random(2.0, 4.5);
    
    // Reduced history for performance
    this.history = [];
    for(let i=0; i<4; i++) {
        this.history.push([x, y, z]);
    }
  }

  update() {
    this.history.pop();
    this.history.unshift([this.x, this.y, this.z]);

    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vz *= this.drag;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D, focalLength: number, centerX: number, centerY: number, quality: GraphicsQuality, kaylonMode: KaylonMode) {
    if (this.alpha <= 0.05) return;
    
    const scale = focalLength / Math.max(1, focalLength + this.z);
    if (scale <= 0) return;

    const screenX = (this.x - centerX) * scale + centerX;
    const screenY = (this.y - centerY) * scale + centerY;
    
    // Culling off-screen particles
    if (screenX < -20 || screenX > ctx.canvas.width + 20 || screenY < -20 || screenY > ctx.canvas.height + 20) return;

    let currentAlpha = this.alpha;
    if (this.flicker && currentAlpha < 0.8) {
         // Cheaper flicker
         if ((Date.now() + this.flickerOffset) % 200 < 100) currentAlpha *= 0.6;
    }
    currentAlpha = Math.max(0, Math.min(1, currentAlpha));

    const color = this.alpha > 0.45 ? this.rgb : this.secondaryRgb;
    const baseRadius = Math.max(0.1, this.size * scale);

    if (kaylonMode === 'Vector') {
        // VECTOR STYLE: Sharp squares, thin lines, no bloom
        if (quality !== 'Low') {
             ctx.beginPath();
             ctx.moveTo(screenX, screenY);
             const hLen = this.history.length;
             for (let i = 0; i < hLen; i++) {
                const h = this.history[i];
                const hScale = focalLength / Math.max(1, focalLength + h[2]);
                ctx.lineTo((h[0] - centerX) * hScale + centerX, (h[1] - centerY) * hScale + centerY);
             }
             ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentAlpha})`;
             ctx.lineWidth = 1;
             ctx.stroke();
        }
        
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentAlpha})`;
        // Draw pixel/square
        ctx.fillRect(screenX - baseRadius, screenY - baseRadius, baseRadius * 2, baseRadius * 2);

    } else {
        // MATRIX STYLE (Standard): Soft circles, bloom, gradients
        if (quality !== 'Low') {
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            
            const hLen = this.history.length;
            for (let i = 0; i < hLen; i++) {
                const h = this.history[i];
                const hScale = focalLength / Math.max(1, focalLength + h[2]);
                ctx.lineTo((h[0] - centerX) * hScale + centerX, (h[1] - centerY) * hScale + centerY);
            }
            
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentAlpha * 0.5})`;
            ctx.lineWidth = baseRadius * 0.8;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        // Bloom
        if (quality !== 'Low' && currentAlpha > 0.2) {
            const bloomRadius = baseRadius * 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, bloomRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentAlpha * 0.15})`;
            ctx.fill();
        }
        
        // Core
        if (baseRadius > 0.2) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, baseRadius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
            ctx.fill();
        }
    }
  }
}

class Rocket {
  x: number; y: number; vx: number; vy: number;
  exploded = false; targetY: number; config: FireworkConfig;
  trail: {x: number, y: number}[];

  constructor(canvasWidth: number, canvasHeight: number, config: FireworkConfig) {
    this.x = canvasWidth / 2 + random(-canvasWidth / 3, canvasWidth / 3);
    this.y = canvasHeight;
    this.targetY = canvasHeight * 0.15 + random(0, canvasHeight * 0.2);
    this.vx = random(-2, 2);
    this.vy = -random(18, 26);
    this.config = config;
    this.trail = [];
  }
  update() {
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > 8) this.trail.shift();

    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.25;
    if (this.vy >= -1 || this.y <= this.targetY) this.exploded = true;
  }
  draw(ctx: CanvasRenderingContext2D, kaylonMode: KaylonMode) {
    if (this.exploded) return;
    
    if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for(let i=1; i<this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.lineWidth = kaylonMode === 'Vector' ? 1 : 2;
        ctx.strokeStyle = kaylonMode === 'Vector' ? '#00f3ff' : 'rgba(255,255,200, 0.3)';
        ctx.stroke();
    }

    if (kaylonMode === 'Vector') {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(this.x - 1.5, this.y - 1.5, 3, 3);
    } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
  }
}

interface WindowRect { x: number; y: number; w: number; h: number; color: string; on: boolean; }
interface Building {
    x: number; y: number; w: number; h: number;
    layer: number;
    type: 'block' | 'spire' | 'tower';
    windows: WindowRect[];
    reflectionHeight: number;
    depth: number; // For 3D extrusions
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

const FireworkCanvas = forwardRef<FireworkCanvasHandle, FireworkCanvasProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);
  const cityBuildings = useRef<Building[]>([]);
  const starsRef = useRef<Star[]>([]);
  const skyFlash = useRef(0);
  const ambientLight = useRef<{ r: number, g: number, b: number, intensity: number }>({ r: 0, g: 0, b: 0, intensity: 0 });

  useEffect(() => {
    SoundManager.setVolume(props.volume / 100);
  }, [props.volume]);

  const initStars = (width: number, height: number) => {
    const starCount = Math.floor((width * height) / 3500); 
    const newStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
        newStars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.85,
            size: Math.random() > 0.99 ? Math.random() * 1.5 + 1 : Math.random() * 0.8 + 0.2,
            baseOpacity: Math.random() * 0.8 + 0.2,
            twinkleSpeed: Math.random() * 0.05 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }
    starsRef.current = newStars;
  };

  const drawSky = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const horizonY = height * 0.94;
    const flashIntensity = Math.min(1, skyFlash.current);
    
    let r1 = 0, g1 = 0, b1 = 5;
    let r2 = 2, g2 = 6, b2 = 23;
    let r3 = 15, g3 = 23, b3 = 42;

    if (flashIntensity > 0.01) {
        r1 += ambientLight.current.r * 0.1 * flashIntensity;
        g1 += ambientLight.current.g * 0.1 * flashIntensity;
        b1 += ambientLight.current.b * 0.1 * flashIntensity;

        r2 += ambientLight.current.r * 0.2 * flashIntensity;
        g2 += ambientLight.current.g * 0.2 * flashIntensity;
        b2 += ambientLight.current.b * 0.2 * flashIntensity;
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, `rgb(${Math.floor(r1)},${Math.floor(g1)},${Math.floor(b1)})`);
    skyGrad.addColorStop(0.4, `rgb(${Math.floor(r2)},${Math.floor(g2)},${Math.floor(b2)})`);
    skyGrad.addColorStop(1, `rgb(${Math.floor(r3)},${Math.floor(g3)},${Math.floor(b3)})`);
    
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    // Stars
    ctx.fillStyle = '#ffffff';
    const time = Date.now();
    
    starsRef.current.forEach(star => {
        if ((time + star.twinkleOffset * 1000) % (200 / star.twinkleSpeed) < 100) return; 
        
        let opacity = star.baseOpacity;
        const horizonFadeStart = height * 0.5;
        if (star.y > horizonFadeStart) {
             opacity *= Math.max(0, 1 - (star.y - horizonFadeStart) / (height * 0.35));
        }

        if (opacity > 0.1) {
            ctx.globalAlpha = opacity;
            const s = star.size;
            ctx.fillRect(star.x, star.y, s, s);
        }
    });
    ctx.globalAlpha = 1.0;
  };

  const drawVectorSky = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Clear pure black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid on floor
      const horizonY = height * 0.94;
      
      ctx.strokeStyle = '#ef4444'; // Red grid
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      
      // Horizontal lines (logarithmic spacing)
      let y = horizonY;
      let step = 2;
      while (y < height) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          y += step;
          step *= 1.2; // Perspective increase
      }

      // Vertical lines (Perspective)
      const centerX = width / 2;
      const vanishingPointY = height * 0.2; // Above horizon
      const lines = 20;
      for (let i = -lines; i <= lines; i++) {
           const x = centerX + i * (width / 10);
           ctx.beginPath();
           ctx.moveTo(x, height);
           // Intersect with horizon
           const slope = (horizonY - height) / (centerX + (i * (width/30) * 0.1) - x); // Faked perspective
           // Simple fan out
           ctx.moveTo(centerX + (i * width), height * 1.5);
           ctx.lineTo(centerX + (i * 20), horizonY);
           ctx.stroke();
      }
      
      // Horizon Line
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();
  };

  const initCity = (width: number, height: number) => {
    const buildings: Building[] = [];
    const layers = 6; // More layers for depth
    const horizonY = height * 0.94;
    
    for (let l = 0; l < layers; l++) {
      let x = -300; // Start offscreen
      const depthFactor = l / (layers - 1); 
      
      while (x < width + 300) {
        // Variable widths based on layer
        const w = random(40, 120) + (depthFactor * 60);
        // Heights get taller in middle layers, shorter in very front (docks) or very back (distant)
        const hBase = random(height * 0.05, height * 0.25);
        const h = hBase + (Math.sin(x/width * Math.PI) * height * 0.1) + (depthFactor * height * 0.15);
        
        const bX = x;
        const bY = horizonY - h;
        const bW = w;
        const bH = h;
        // 3D Depth depends on size
        const depth = 20 + Math.random() * 40;

        const wins: WindowRect[] = [];
        // Only add windows to closer layers for performance and style
        if (l > 1) {
            const winW = 3 + Math.floor(depthFactor * 2);
            const winH = 4 + Math.floor(depthFactor * 4);
            const gapX = winW;
            const gapY = winH;
            
            const cols = Math.floor((bW - 10) / (winW + gapX));
            const rows = Math.floor((bH - 10) / (winH + gapY));
            
            for(let r = 1; r < rows; r++) {
                if (Math.random() > 0.9) continue; // Skip random rows
                for(let c = 1; c < cols; c++) {
                    if (Math.random() > 0.7) { // Random lit windows
                        wins.push({
                            x: 5 + c * (winW + gapX),
                            y: 5 + r * (winH + gapY),
                            w: winW,
                            h: winH,
                            color: Math.random() > 0.7 ? '#fef3c7' : '#e0f2fe',
                            on: true
                        });
                    }
                }
            }
        }

        buildings.push({
            x: bX, y: bY, w: bW, h: bH,
            layer: l, type: 'block', windows: wins,
            reflectionHeight: bH * 0.7,
            depth: depth
        });
        
        // Random Spire on top
        if (l > 2 && Math.random() > 0.7) {
             const spireH = random(20, 80);
             const spireW = random(4, 10);
             buildings.push({
                x: bX + bW/2 - spireW/2, 
                y: bY - spireH, 
                w: spireW, 
                h: spireH,
                layer: l, 
                type: 'spire', 
                windows: [],
                reflectionHeight: (bH + spireH) * 0.7,
                depth: spireW // Square spire
             });
             // Antenna
             if (Math.random() > 0.5) {
                buildings.push({
                    x: bX + bW/2 - 1,
                    y: bY - spireH - random(10, 30),
                    w: 2,
                    h: 30,
                    layer: l,
                    type: 'spire',
                    windows: [],
                    reflectionHeight: 0,
                    depth: 2
                });
             }
        }

        x += w * random(0.6, 1.2); // Overlap allowed
      }
    }
    // Sort by layer
    cityBuildings.current = buildings.sort((a, b) => a.layer - b.layer);
  };

  const drawVectorCity = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const centerX = width / 2;
      // Neon look
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f3ff';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1;

      const bLen = cityBuildings.current.length;
      for(let i=0; i<bLen; i++) {
          const b = cityBuildings.current[i];
          const depth = b.layer / 4;
          
          // Fade distant buildings
          ctx.globalAlpha = 0.2 + depth * 0.8;
          
          const rightSideVisible = (b.x + b.w/2) < centerX;
          const perspX = Math.abs(centerX - (b.x + b.w/2)) / (width/2); 
          const sideWidth = b.depth * perspX;

          // Wireframe Box
          ctx.beginPath();
          // Front Face
          ctx.rect(b.x, b.y, b.w, b.h);
          
          // Side Face Lines
          if (rightSideVisible) {
            ctx.moveTo(b.x + b.w, b.y);
            ctx.lineTo(b.x + b.w + sideWidth, b.y - (sideWidth * 0.2));
            ctx.lineTo(b.x + b.w + sideWidth, b.y + b.h);
            ctx.lineTo(b.x + b.w, b.y + b.h);
          } else {
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x - sideWidth, b.y - (sideWidth * 0.2));
            ctx.lineTo(b.x - sideWidth, b.y + b.h);
            ctx.lineTo(b.x, b.y + b.h);
          }
          
          ctx.stroke();
      }
      
      // Reset
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
  };

  const drawCity = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const horizonY = height * 0.94;
    const flashIntensity = skyFlash.current;
    
    // Water
    const waterR = Math.floor(15 + ambientLight.current.r * 0.2 * flashIntensity);
    const waterG = Math.floor(23 + ambientLight.current.g * 0.2 * flashIntensity);
    const waterB = Math.floor(42 + ambientLight.current.b * 0.2 * flashIntensity);

    ctx.fillStyle = `rgb(${waterR}, ${waterG}, ${waterB})`;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    ambientLight.current.intensity *= 0.94;
    
    const centerX = width / 2;

    const bLen = cityBuildings.current.length;
    for(let i=0; i<bLen; i++) {
      const b = cityBuildings.current[i];
      const depth = b.layer / 4; 
      const receivedFlash = flashIntensity * (0.1 + depth * 0.4);
      
      const baseL = 5 + (depth * 2);
      const hazeB = 15 + ( (1-depth) * 10 );
      
      let r = baseL;
      let g = baseL;
      let blue = hazeB;

      if (receivedFlash > 0.01) {
          r += ambientLight.current.r * receivedFlash;
          g += ambientLight.current.g * receivedFlash;
          blue += ambientLight.current.b * receivedFlash;
      }
      
      const rInt = Math.floor(r);
      const gInt = Math.floor(g);
      const bInt = Math.floor(blue);
      const fillStyle = `rgb(${rInt}, ${gInt}, ${bInt})`;
      
      // Darker side color
      const sideR = Math.floor(r * 0.6);
      const sideG = Math.floor(g * 0.6);
      const sideB = Math.floor(blue * 0.7);
      const sideStyle = `rgb(${sideR}, ${sideG}, ${sideB})`;

      // --- 3D CALCULATION ---
      const rightSideVisible = (b.x + b.w/2) < centerX;
      // Perspective intensity depends on distance from center
      const perspX = Math.abs(centerX - (b.x + b.w/2)) / (width/2); 
      const sideWidth = b.depth * perspX;

      // Draw Side Face (Behind Front)
      // Actually, if we are looking from center:
      // Buildings on Left: We see Right side. Right side is "behind" front? No, it's attached to right edge.
      // Painter's algo for single building 3D parts: Side then Front (usually safe if no weird rotations).
      
      ctx.fillStyle = sideStyle;
      if (rightSideVisible) {
          // Right Side
          ctx.beginPath();
          ctx.moveTo(b.x + b.w, b.y);
          ctx.lineTo(b.x + b.w + sideWidth, b.y - (sideWidth * 0.2)); // Slight upward perspective for top
          ctx.lineTo(b.x + b.w + sideWidth, b.y + b.h);
          ctx.lineTo(b.x + b.w, b.y + b.h);
          ctx.fill();
      } else {
          // Left Side
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - sideWidth, b.y - (sideWidth * 0.2));
          ctx.lineTo(b.x - sideWidth, b.y + b.h);
          ctx.lineTo(b.x, b.y + b.h);
          ctx.fill();
      }

      // Draw Front Face
      ctx.fillStyle = fillStyle;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Edge highlights
      ctx.fillStyle = `rgba(255,255,255, ${0.05 * depth + receivedFlash * 0.3})`;
      // Highlight the "corner"
      if (rightSideVisible) ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
      else ctx.fillRect(b.x, b.y, 1, b.h);

      // Reflections (Simplified 2D reflection of front face)
      if (props.quality === 'High' && b.y < horizonY && b.reflectionHeight > 0) {
          ctx.globalAlpha = 0.1 * (1 - (b.y / height)) + (receivedFlash * 0.2);
          ctx.fillStyle = fillStyle;
          const reflectH = Math.min(b.h, height - horizonY);
          // Skew reflection slightly? No, keep simple
          ctx.fillRect(b.x, horizonY, b.w, reflectH * 0.8);
          
          // Reflect side?
           ctx.fillStyle = sideStyle;
           if (rightSideVisible) {
               ctx.fillRect(b.x + b.w, horizonY, sideWidth, reflectH * 0.8);
           } else {
               ctx.fillRect(b.x - sideWidth, horizonY, sideWidth, reflectH * 0.8);
           }

          ctx.globalAlpha = 1.0;
      }

      // Windows
      if (props.quality !== 'Low' && b.windows.length > 0) {
        if (b.layer > 1 || flashIntensity > 0.1) {
            const winAlpha = (0.3 + depth * 0.7) + (flashIntensity * 0.1);
            const wLen = b.windows.length;
            
            for(let w=0; w<wLen; w++) {
                const win = b.windows[w];
                if (flashIntensity > 0.2 && Math.random() > 0.7) {
                     ctx.fillStyle = `rgba(255, 255, 255, ${winAlpha + flashIntensity * 0.4})`;
                } else {
                     ctx.fillStyle = win.color; 
                }
                ctx.globalAlpha = winAlpha;
                ctx.fillRect(b.x + win.x, b.y + win.y, win.w, win.h);
            }
            ctx.globalAlpha = 1.0;
        }
      }
    }

    // Glow
    if (flashIntensity > 0.01) {
        const glowAlpha = 0.1 + (flashIntensity * 0.2);
        const gR = Math.floor(30 + ambientLight.current.r * flashIntensity * 0.2);
        const gG = Math.floor(41 + ambientLight.current.g * flashIntensity * 0.2);
        const glow = ctx.createLinearGradient(0, height, 0, height - 300);
        glow.addColorStop(0, `rgba(${gR}, ${gG}, 59, ${glowAlpha})`);
        glow.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = glow;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillRect(0, height - 300, width, 300);
    }
  };

  const createParticles = (cx: number, cy: number, config: FireworkConfig) => {
    const particles: Particle[] = [];
    const count = config.particleCount;
    const baseSpeed = config.explosionSize * 6.0;
    
    const color = hexToRgb(config.primaryColor);
    
    ambientLight.current = { r: color.r, g: color.g, b: color.b, intensity: 2.0 };
    skyFlash.current = 1.5; 

    for (let i = 0; i < count; i++) {
      let vx = 0, vy = 0, vz = 0;
      const speed = baseSpeed * random(0.8, 1.2);
      
      switch (config.explosionShape) {
        case ExplosionShape.RING: {
            const angle = (i / count) * Math.PI * 2;
            const r = speed * 0.8;
            vx = Math.cos(angle) * r;
            vy = Math.sin(angle) * r;
            vz = random(-1, 1);
            break;
        }
        case ExplosionShape.HEART: {
            const t = random(0, Math.PI * 2);
            vx = 16 * Math.pow(Math.sin(t), 3) * (speed / 16);
            vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * (speed / 16);
            vz = random(-2, 2);
            break;
        }
        case ExplosionShape.STAR: {
            const angle = random(0, Math.PI * 2);
            const r = (0.5 + Math.abs(Math.sin(angle * 2.5)) * 1.2) * speed;
            vx = Math.cos(angle) * r * 0.6;
            vy = Math.sin(angle) * r * 0.6;
            vz = random(-2, 2);
            break;
        }
        case ExplosionShape.BURST: {
            const angle = random(0, Math.PI * 2);
            const phi = Math.acos(random(-1, 1));
            const r = speed * random(0.1, 2.8);
            vx = r * Math.sin(phi) * Math.cos(angle);
            vy = r * Math.sin(phi) * Math.sin(angle);
            vz = r * Math.cos(phi);
            break;
        }
        default: {
            const angle = random(0, Math.PI * 2);
            const phi = Math.acos(random(-1, 1));
            const r = Math.random() > 0.8 ? speed * random(0.3, 0.5) : speed * random(0.9, 1.1);
            vx = r * Math.sin(phi) * Math.cos(angle);
            vy = r * Math.sin(phi) * Math.sin(angle);
            vz = r * Math.cos(phi);
            break;
        }
      }
      particles.push(new Particle(cx, cy, 0, config, vx, vy, vz));
    }
    return particles;
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas background
    if (!ctx) return;

    // We don't use clearRect because we redraw everything
    ctx.globalCompositeOperation = 'source-over';
    
    if (props.kaylonMode === 'Vector') {
        drawVectorSky(ctx, canvas.width, canvas.height);
        drawVectorCity(ctx, canvas.width, canvas.height);
    } else {
        // Matrix (Standard) Style
        drawSky(ctx, canvas.width, canvas.height);
        drawCity(ctx, canvas.width, canvas.height);
        
        // Global flash overlay (atmospheric scattering) - Only for Matrix
        if (skyFlash.current > 0.01) {
            const fR = ambientLight.current.r;
            const fG = ambientLight.current.g;
            const fB = ambientLight.current.b;
            
            ctx.fillStyle = `rgba(${fR}, ${fG}, ${fB}, ${skyFlash.current * 0.1})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            skyFlash.current *= 0.85;
        }
    }

    ctx.globalCompositeOperation = 'lighter';
    const focalLength = 1000;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
      const r = rocketsRef.current[i];
      r.update();
      r.draw(ctx, props.kaylonMode);
      if (r.exploded) {
        particlesRef.current.push(...createParticles(r.x, r.y, r.config));
        SoundManager.playExplosion(r.config.explosionSize);
        rocketsRef.current.splice(i, 1);
      }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.update();
      p.draw(ctx, focalLength, centerX, centerY, props.quality, props.kaylonMode);
      if (p.alpha <= 0) particlesRef.current.splice(i, 1);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initCity(canvas.width, canvas.height);
        initStars(canvas.width, canvas.height);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      requestRef.current = requestAnimationFrame(animate);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }
  }, [props.quality, props.kaylonMode]); // Re-init on mode change might not be strictly necessary but safe

  useImperativeHandle(ref, () => ({
    launch: (config) => {
        SoundManager.playLaunch();
        rocketsRef.current.push(new Rocket(window.innerWidth, window.innerHeight, config));
    },
    clear: () => {
        rocketsRef.current = [];
        particlesRef.current = [];
        ambientLight.current.intensity = 0;
        skyFlash.current = 0;
    },
    unlockAudio: () => SoundManager.resume()
  }));

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
});

export default FireworkCanvas;