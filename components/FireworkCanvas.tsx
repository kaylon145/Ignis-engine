import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ExplosionShape, FireworkConfig, GraphicsQuality } from '../types';

interface FireworkCanvasProps {
  volume: number;
  quality: GraphicsQuality;
}

export interface FireworkCanvasHandle {
  launch: (config: FireworkConfig) => void;
  clear: () => void;
  unlockAudio: () => void;
}

// --- Sound Manager ---
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

  // Critical for iOS: must be called inside a user interaction handler
  resume() {
    this.init();
    if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
      this.ctx.resume().catch((e) => console.warn("Audio resume failed", e));
    }
  },

  playLaunch() {
    this.init();
    if (!this.ctx) return;
    
    // Attempt resume if needed, though strictly this should be done by explicit user action first
    if (this.ctx.state === 'suspended') this.resume();

    const t = this.ctx.currentTime;
    const vol = this.masterVolume;
    if (vol <= 0.01) return;
    
    // 1. Mortar "Thump" (Low frequency burst)
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);
    
    thumpOsc.type = 'triangle'; // More body than sine
    thumpOsc.frequency.setValueAtTime(150, t);
    thumpOsc.frequency.exponentialRampToValueAtTime(0.01, t + 0.2);
    
    thumpGain.gain.setValueAtTime(0.4 * vol, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    
    thumpOsc.start(t);
    thumpOsc.stop(t + 0.2);

    // 2. Whistle (Sine sweep up)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    // Start low, go high
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.8);
    
    // Volume envelope
    gain.gain.setValueAtTime(0.05 * vol, t);
    gain.gain.linearRampToValueAtTime(0.08 * vol, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    
    osc.start(t);
    osc.stop(t + 0.8);

    // 3. Air Friction (Filtered Noise)
    const bufferSize = this.ctx.sampleRate * 1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.value = 1;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseGain.gain.setValueAtTime(0.1 * vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    noise.start(t);
    noise.stop(t + 0.6);
  },

  playExplosion(size: number = 1) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const vol = this.masterVolume;
    if (vol <= 0.01) return;
    
    // Randomize pitch slightly for variety
    const pitchMod = random(0.8, 1.2);
    const sizeMod = Math.min(Math.max(size, 0.5), 3); // Clamp size multiplier

    // 1. The "Crack" (Sharp initial snap)
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.connect(crackGain);
    crackGain.connect(this.ctx.destination);
    
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(200 * pitchMod, t);
    crackOsc.frequency.exponentialRampToValueAtTime(10, t + 0.1);
    
    crackGain.gain.setValueAtTime(0.2 * vol, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    crackOsc.start(t);
    crackOsc.stop(t + 0.1);

    // 2. The "Boom" (Deep Low End)
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(120 * pitchMod, t);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    
    boomGain.gain.setValueAtTime(0.6 * sizeMod * vol, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    
    boomOsc.start(t);
    boomOsc.stop(t + 0.5);

    // 3. The "Rumble" (Filtered Noise Body)
    const bufferSize = this.ctx.sampleRate * 3; // 3 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Pinkish noise approximation
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain loss
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 1.0); // Filter closes

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // Volume envelope
    noiseGain.gain.setValueAtTime(0.4 * sizeMod * vol, t);
    // Fast initial decay then long tail
    noiseGain.gain.setTargetAtTime(0, t, 0.4); 

    noise.start(t);
    noise.stop(t + 3.0);
  }
};

// Physics & Math Helpers
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Convert Hex to RGB for alpha manipulation
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
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.floor(255 * f(0)),
    g: Math.floor(255 * f(8)),
    b: Math.floor(255 * f(4)),
  };
};

// --- Scene Elements ---

class Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
  puffs: { x: number; y: number; radius: number; opacity: number }[];

  constructor(screenWidth: number, y: number) {
    this.x = random(0, screenWidth);
    this.y = y;
    this.width = random(200, 500); // Large cumulus
    this.speed = random(0.02, 0.08); // Slow drift

    this.puffs = [];
    // Create a cluster of circles to form the cloud shape
    const count = Math.floor(this.width / 40);
    for (let i = 0; i < count; i++) {
        // Distribute puffs horizontally with some vertical variance
        // Puffs are denser in the middle
        const px = random(-this.width / 2, this.width / 2);
        const py = random(-30, 40);
        const r = random(40, 90);
        // Vary opacity to create texture
        this.puffs.push({ x: px, y: py, radius: r, opacity: random(0.15, 0.35) });
    }
  }

  update(screenWidth: number) {
     this.x += this.speed;
     if (this.x - this.width/2 > screenWidth) {
         this.x = -this.width/2; // Wrap around
     }
  }

  draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.translate(this.x, this.y);
      
      this.puffs.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          
          // Soft gradient for fluffiness
          // Center is slightly lighter (illuminated by city lights), fading to transparent
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          
          // Using Slate-700/800 colors for night clouds
          gradient.addColorStop(0, `rgba(51, 65, 85, ${p.opacity})`); // Slate 700 (Lighter center)
          gradient.addColorStop(0.5, `rgba(30, 41, 59, ${p.opacity * 0.6})`); // Slate 800
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0)'); // Fade to transparent

          ctx.fillStyle = gradient;
          ctx.fill();
      });

      ctx.restore();
  }
}

interface BuildingPart {
    width: number;
    height: number;
    xOffset: number;
}

interface WindowRect {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    on: boolean;
}

class ComplexBuilding {
  x: number;
  totalHeight: number;
  baseWidth: number;
  parts: BuildingPart[] = [];
  windows: WindowRect[] = [];
  spireHeight: number;
  layer: 'front' | 'back';
  color: string;

  constructor(x: number, maxW: number, maxH: number, layer: 'front' | 'back') {
    this.x = x;
    this.layer = layer;
    this.baseWidth = random(maxW * 0.6, maxW);
    this.totalHeight = random(maxH * 0.4, maxH);
    
    // Darker colors for realism
    // Front layer is slightly darker/clearer, back layer is hazier
    this.color = layer === 'front' ? '#0f172a' : '#020617'; 

    // Generate Shape (Setbacks)
    let currentW = this.baseWidth;
    let currentH = 0;
    
    // Base
    const baseH = this.totalHeight * random(0.4, 0.7);
    this.parts.push({ width: currentW, height: baseH, xOffset: 0 });
    currentH += baseH;

    // Sections going up (Setbacks)
    while (currentH < this.totalHeight && currentW > 20) {
        const nextH = (this.totalHeight - currentH) * random(0.5, 1);
        const nextW = currentW * random(0.6, 0.85); // Get thinner
        this.parts.push({ width: nextW, height: nextH, xOffset: (this.baseWidth - nextW) / 2 });
        currentW = nextW;
        currentH += nextH;
    }

    // Spire
    this.spireHeight = Math.random() > 0.6 ? random(20, 80) : 0;

    // Generate Windows (High Density)
    if (layer === 'front') {
        const windowSize = 2;
        const gapX = 3;
        const gapY = 5;
        
        // Colors: Warm sodium (amber), Cool LED (blueish), Neutral
        const windowColors = ['#fbbf24', '#fef3c7', '#bae6fd', '#e2e8f0'];

        let heightSoFar = 0;
        this.parts.forEach(part => {
            const rows = Math.floor(part.height / gapY);
            const cols = Math.floor((part.width - 4) / gapX); // Padding

            for (let r = 0; r < rows; r++) {
                // Not every floor is lit, some distinct patterns
                if (Math.random() > 0.05) { 
                    for (let c = 0; c < cols; c++) {
                        // Random on/off for realistic "lived in" look
                        if (Math.random() > 0.6) {
                            const cIdx = Math.floor(Math.random() * windowColors.length);
                            this.windows.push({
                                x: part.xOffset + 2 + c * gapX,
                                y: heightSoFar + 4 + r * gapY, // relative from bottom of this part? No, we draw from bottom up or top down
                                w: windowSize,
                                h: windowSize + 1,
                                color: windowColors[cIdx],
                                on: true
                            });
                        }
                    }
                }
            }
            heightSoFar += part.height;
        });
    }
  }

  draw(ctx: CanvasRenderingContext2D, screenHeight: number) {
    let currentBottomY = screenHeight;

    // Draw main structures
    ctx.fillStyle = this.color;
    
    // Draw parts from bottom up
    this.parts.forEach(part => {
        const y = currentBottomY - part.height;
        ctx.fillRect(this.x + part.xOffset, y, part.width, part.height);
        
        // Add subtle shading to right side for 3D feel
        if (this.layer === 'front') {
             ctx.fillStyle = '#00000040';
             ctx.fillRect(this.x + part.xOffset + part.width - 2, y, 2, part.height);
             ctx.fillStyle = this.color;
        }

        currentBottomY -= part.height;
    });

    // Draw Spire
    if (this.spireHeight > 0) {
        const topPart = this.parts[this.parts.length - 1];
        const spireX = this.x + topPart.xOffset + topPart.width / 2;
        ctx.strokeStyle = this.layer === 'front' ? '#1e293b' : '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(spireX, currentBottomY);
        ctx.lineTo(spireX, currentBottomY - this.spireHeight);
        ctx.stroke();
        
        // Antenna light red blinker
        if (this.layer === 'front' && Math.random() > 0.05) { // Occasional blink
             ctx.fillStyle = `rgba(239, 68, 68, ${Math.abs(Math.sin(Date.now() * 0.002))})`; 
             ctx.beginPath();
             ctx.arc(spireX, currentBottomY - this.spireHeight, 1.5, 0, Math.PI*2);
             ctx.fill();
        }
    }

    // Draw Windows
    if (this.layer === 'front') {
        // Reset Y for windows calculation (re-traverse to map windows correctly)
        // Actually we stored windows relative to parts?
        // Let's simplify: My window generation loop above was a bit abstract on 'y'. 
        // Let's assume window.y is relative to the *bottom* of the building going UP.
        
        let bottomBase = screenHeight;
        let hAcc = 0;
        
        // We need to reconstruct the Y layout to place windows
        let yCursor = screenHeight;
        
        this.parts.forEach(part => {
            const partTop = yCursor - part.height;
            // Filter windows for this part? No, they were pushed in order.
            // A clearer way:
            // The window.y in my constructor was "heightSoFar + offset".
            // So screenY = screenHeight - window.y (roughly).
            // Let's correct this.
            
            yCursor -= part.height;
        });

        // Drawing windows
        this.windows.forEach(w => {
             // screenY = screenHeight - w.y
             // w.y in constructor was "height from base".
             ctx.fillStyle = w.color;
             // Add global twinkle
             if (Math.random() > 0.999) return; // Rare flicker off
             
             ctx.fillRect(this.x + w.x, screenHeight - w.y, w.w, w.h);
        });
    }
  }
}

class Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  vx: number;
  vy: number;
  pulseSpeed: number;
  pulseOffset: number;

  constructor(w: number, h: number) {
    this.x = Math.random() * w;
    this.y = Math.random() * h * 0.7; // Stars don't go all the way down, obscured by city light/haze
    this.size = Math.random() * 1.2 + 0.3; 
    this.baseOpacity = Math.random() * 0.6 + 0.1; 
    this.opacity = this.baseOpacity;
    this.vx = (Math.random() - 0.5) * 0.02; // Very slow
    this.vy = (Math.random() - 0.5) * 0.02; 
    this.pulseSpeed = Math.random() * 0.02 + 0.005;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }

  update(w: number, h: number) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0) this.x = w;
    if (this.x > w) this.x = 0;
    if (this.y < 0) this.y = h * 0.7;
    if (this.y > h * 0.7) this.y = 0;

    this.opacity = this.baseOpacity + Math.sin(Date.now() * 0.001 + this.pulseOffset) * 0.15;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, this.opacity)})`;
    ctx.fill();
  }
}

class Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  rgb: { r: number, g: number, b: number };
  speed: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = 1;
    this.maxRadius = random(100, 200);
    this.alpha = 0.5;
    this.rgb = color === 'RAINBOW' ? {r: 255, g: 255, b: 255} : hexToRgb(color);
    this.speed = random(10, 15);
  }

  update() {
    this.radius += this.speed;
    this.speed *= 0.92; // Rapidly slow down expansion
    this.alpha -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0.01) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const { r, g, b } = this.rgb;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  
  alpha: number;
  rgb: { r: number, g: number, b: number };
  secondaryRgb: { r: number, g: number, b: number };
  
  decay: number;
  gravity: number;
  drag: number;
  
  hasTrail: boolean;
  history: { x: number; y: number; z: number, alpha: number }[];
  
  flicker: boolean;
  flickerOffset: number;

  constructor(x: number, y: number, z: number, config: FireworkConfig, vx: number, vy: number, vz: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    
    this.alpha = 1;
    
    if (config.primaryColor === 'RAINBOW') {
        const h = random(0, 360);
        this.rgb = hslToRgb(h, 90, 60);
        this.secondaryRgb = hslToRgb(h + 30, 90, 50);
    } else {
        this.rgb = hexToRgb(config.primaryColor);
        this.secondaryRgb = hexToRgb(config.secondaryColor);
    }
    
    // Randomize physics slightly for realism
    this.decay = config.decayRate * random(0.8, 1.2);
    this.gravity = config.gravity * 0.8; 
    this.drag = 0.92 + random(0, 0.04); // Stronger initial drag for explosive pop then float
    
    this.hasTrail = Math.random() > 0.4; 
    this.history = [];
    
    this.flicker = Math.random() > 0.8; 
    this.flickerOffset = Math.random() * 100;
  }

  update() {
    this.history.push({ x: this.x, y: this.y, z: this.z, alpha: this.alpha });
    if (this.history.length > 8) this.history.shift();

    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vz *= this.drag;
    
    this.vy += this.gravity;
    
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
    
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D, focalLength: number, centerX: number, centerY: number, quality: GraphicsQuality) {
    // 3D Projection
    const scale = focalLength / (focalLength + this.z);
    const screenX = (this.x - centerX) * scale + centerX;
    const screenY = (this.y - centerY) * scale + centerY;
    
    if (this.alpha <= 0.01) return;

    // Flicker Effect
    let drawAlpha = this.alpha;
    if (this.flicker) {
       drawAlpha *= (0.6 + Math.sin(Date.now() * 0.2 + this.flickerOffset) * 0.4);
    }

    ctx.save();
    
    // Draw Trail
    if (this.hasTrail && this.history.length > 1) {
      ctx.beginPath();
      const startP = this.history[0];
      const startScale = focalLength / (focalLength + startP.z);
      const startSX = (startP.x - centerX) * startScale + centerX;
      const startSY = (startP.y - centerY) * startScale + centerY;
      
      ctx.moveTo(startSX, startSY);
      
      for (let i = 1; i < this.history.length; i++) {
        const p = this.history[i];
        const pScale = focalLength / (focalLength + p.z);
        const pSX = (p.x - centerX) * pScale + centerX;
        const pSY = (p.y - centerY) * pScale + centerY;
        ctx.lineTo(pSX, pSY);
      }
      ctx.lineTo(screenX, screenY);
      
      // Gradient Trail Color
      const { r, g, b } = this.alpha < 0.5 ? this.secondaryRgb : this.rgb;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${drawAlpha * 0.3})`;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
    }

    // Glow Rendering
    const { r, g, b } = this.rgb;

    // 1. Outer soft glow (Subtle Halo) - Skip on LOW quality
    if (quality !== 'Low') {
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8 * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${drawAlpha * 0.1})`;
        ctx.fill();
    }

    // 2. Inner colored core
    ctx.beginPath();
    ctx.arc(screenX, screenY, 3 * scale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${drawAlpha * 0.4})`;
    ctx.fill();

    // 3. Hot white center
    ctx.beginPath();
    ctx.arc(screenX, screenY, 1.2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${drawAlpha})`;
    ctx.fill();
    
    ctx.restore();
  }
}

class Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    decay: number;
    color: string;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = random(-1, 1);
        this.vy = random(-1, 1) + 1; // Fall down
        this.alpha = 1;
        this.decay = random(0.03, 0.08);
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 2, 2);
        ctx.restore();
    }
}

class Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
  targetY: number;
  config: FireworkConfig;
  wobblePhase: number;
  sparks: Spark[] = [];

  constructor(canvasWidth: number, canvasHeight: number, config: FireworkConfig) {
    this.x = canvasWidth / 2 + random(-canvasWidth / 6, canvasWidth / 6);
    this.y = canvasHeight;
    this.targetY = canvasHeight * 0.15 + random(0, canvasHeight * 0.25);
    this.vx = random(-1, 1);
    this.vy = -random(14, 18); 
    this.color = config.primaryColor === 'RAINBOW' ? '#FFFFFF' : config.primaryColor;
    this.exploded = false;
    this.config = config;
    this.wobblePhase = random(0, Math.PI * 2);
  }

  update() {
    // Physics
    this.x += this.vx + Math.sin(this.y * 0.05 + this.wobblePhase) * 0.5; // Wobble
    this.y += this.vy;
    this.vy += 0.2; // Gravity

    // Emit sparks for trail
    if (!this.exploded) {
       for(let k=0; k<2; k++) {
         this.sparks.push(new Spark(this.x, this.y + 10, '#ccccccc'));
       }
    }

    // Update sparks
    for(let i = this.sparks.length - 1; i >= 0; i--) {
        this.sparks[i].update();
        if(this.sparks[i].alpha <= 0) this.sparks.splice(i, 1);
    }

    if (this.vy >= -2 || this.y <= this.targetY) {
      this.exploded = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw sparks
    this.sparks.forEach(s => s.draw(ctx));

    // Draw Rocket Head
    if (!this.exploded) {
      ctx.save();
      
      // Glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
      const {r, g, b} = hexToRgb(this.color);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      
      ctx.restore();
    }
  }
}

const FireworkCanvas = forwardRef<FireworkCanvasHandle, FireworkCanvasProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]); 
  const starsRef = useRef<Star[]>([]); 
  const cloudsRef = useRef<Cloud[]>([]); 
  const cityFrontRef = useRef<ComplexBuilding[]>([]); 
  const cityBackRef = useRef<ComplexBuilding[]>([]);
  const requestRef = useRef<number | null>(null);
  const flashOpacity = useRef<number>(0);
  
  // Refs for Props access in animation loop
  const qualityRef = useRef<GraphicsQuality>(props.quality);

  useEffect(() => {
    SoundManager.setVolume(props.volume / 100);
  }, [props.volume]);

  useEffect(() => {
    qualityRef.current = props.quality;
  }, [props.quality]);

  const createParticles = (cx: number, cy: number, config: FireworkConfig) => {
    const particles: Particle[] = [];
    
    // Adjust particle count based on Quality setting
    let qualityMultiplier = 1.0;
    if (qualityRef.current === 'Low') qualityMultiplier = 0.5;
    else if (qualityRef.current === 'Ultra') qualityMultiplier = 1.5;

    const count = Math.floor(config.particleCount * qualityMultiplier);
    const baseSpeed = config.explosionSize * 3; 

    // Rotation matrix for 3D shapes (Random orientation)
    const rotX = random(0, Math.PI * 2);
    const rotY = random(0, Math.PI * 2);

    const rotate = (x: number, y: number, z: number) => {
        // Simple rotation around Y then X
        // Rotate Y
        let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
        let z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
        // Rotate X
        let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        
        return { x: x1, y: y2, z: z2 };
    };

    for (let i = 0; i < count; i++) {
      let vx = 0, vy = 0, vz = 0;
      let speed = random(baseSpeed * 0.8, baseSpeed * 1.2);

      if (config.explosionShape === ExplosionShape.SPHERE || config.explosionShape === ExplosionShape.BURST) {
        // Random point on sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        vx = speed * Math.sin(phi) * Math.cos(theta);
        vy = speed * Math.sin(phi) * Math.sin(theta);
        vz = speed * Math.cos(phi);
        
        if (config.explosionShape === ExplosionShape.BURST) {
            // Burst has varied speeds
            speed *= random(0.5, 1.5);
            vx = vx / baseSpeed * speed;
            vy = vy / baseSpeed * speed;
            vz = vz / baseSpeed * speed;
        }

      } else if (config.explosionShape === ExplosionShape.RING) {
         // Ring on X-Y plane, then rotated
         const angle = (i / count) * Math.PI * 2;
         const rx = Math.cos(angle) * speed;
         const ry = Math.sin(angle) * speed;
         const rz = 0;
         
         const rotated = rotate(rx, ry, rz);
         vx = rotated.x;
         vy = rotated.y;
         vz = rotated.z;

      } else if (config.explosionShape === ExplosionShape.HEART) {
         const angle = (i / count) * Math.PI * 2;
         // Heart equation
         const hx = 16 * Math.pow(Math.sin(angle), 3);
         const hy = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
         
         // Normalize
         const mag = Math.sqrt(hx*hx + hy*hy) || 1;
         
         const rx = (hx / mag) * speed;
         const ry = (hy / mag) * speed;
         const rz = 0;

         const rotated = rotate(rx, ry, rz);
         vx = rotated.x;
         vy = rotated.y;
         vz = rotated.z;

      } else if (config.explosionShape === ExplosionShape.STAR) {
         // 2D Star shape rotated
         const angle = (i / count) * Math.PI * 2;
         const spikes = 5;
         const r = 1 + Math.sin(angle * spikes) * 0.5; // Simple star radius modulation
         
         const rx = Math.cos(angle) * speed * r;
         const ry = Math.sin(angle) * speed * r;
         const rz = 0;

         const rotated = rotate(rx, ry, rz);
         vx = rotated.x;
         vy = rotated.y;
         vz = rotated.z;
      }
      
      particles.push(new Particle(cx, cy, 0, config, vx, vy, vz));
    }
    return particles;
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with trail effect - Dark slate with transparency for trails
    // Lower opacity = longer trails
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(2, 6, 23, 0.15)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Stars
    starsRef.current.forEach(star => {
        star.update(canvas.width, canvas.height);
        star.draw(ctx);
    });

    // 2. Draw Clouds (Behind City, In front of Stars)
    cloudsRef.current.forEach(cloud => {
        cloud.update(canvas.width);
        cloud.draw(ctx);
    });

    // 3. Draw Light Pollution Glow
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height * 0.7);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.5)'); // Slate-800 glow
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 4. Draw City Layers
    // Back Layer (Silhouette, distant)
    cityBackRef.current.forEach(b => b.draw(ctx, canvas.height));
    
    // Front Layer (Detailed)
    cityFrontRef.current.forEach(b => b.draw(ctx, canvas.height));

    // Flash Effect
    if (flashOpacity.current > 0.01) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity.current})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashOpacity.current *= 0.85; // Fast decay
    }
    
    // Additive blending for light effects
    ctx.globalCompositeOperation = 'lighter';

    // Update/Draw Rockets
    for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
      const r = rocketsRef.current[i];
      r.update();
      r.draw(ctx);
      if (r.exploded) {
        // Boom
        particlesRef.current.push(...createParticles(r.x, r.y, r.config));
        
        // Add shockwave (Skip on Low)
        if (qualityRef.current !== 'Low') {
            shockwavesRef.current.push(new Shockwave(r.x, r.y, r.config.primaryColor));
        }
        
        // Play explosion sound
        SoundManager.playExplosion(r.config.explosionSize);
        
        rocketsRef.current.splice(i, 1);
        flashOpacity.current = 0.25; // Trigger flash
      }
    }

    // Update/Draw Shockwaves
    for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.update();
        sw.draw(ctx);
        if (sw.alpha <= 0) {
            shockwavesRef.current.splice(i, 1);
        }
    }

    // Update/Draw Particles
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const focalLength = 600;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.update();
      // Pass camera context and quality for optimization
      p.draw(ctx, focalLength, centerX, centerY, qualityRef.current);
      
      if (p.alpha <= 0) {
        particlesRef.current.splice(i, 1);
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Initialize Scene (Stars + City + Clouds)
      const initScene = () => {
          // Init Stars
          starsRef.current = [];
          const starCount = Math.floor((canvas.width * canvas.height) / 2500); 
          for (let i = 0; i < starCount; i++) {
            starsRef.current.push(new Star(canvas.width, canvas.height));
          }

          // Init Clouds
          cloudsRef.current = [];
          const cloudCount = 6; 
          for (let i = 0; i < cloudCount; i++) {
              // Place clouds randomly in top 60% of screen
              const y = random(50, canvas.height * 0.6);
              cloudsRef.current.push(new Cloud(canvas.width, y));
          }

          // Init City Back Layer (Distant, Taller, Darker)
          cityBackRef.current = [];
          let currentX = -50;
          while(currentX < canvas.width) {
             const width = random(60, 150);
             const height = random(canvas.height * 0.2, canvas.height * 0.5); 
             cityBackRef.current.push(new ComplexBuilding(currentX, width, height, 'back'));
             currentX += width * random(0.6, 0.9); // Heavy overlap
          }

          // Init City Front Layer (Closer, Detailed)
          cityFrontRef.current = [];
          currentX = -20;
          while(currentX < canvas.width) {
             const width = random(40, 100);
             const height = random(canvas.height * 0.1, canvas.height * 0.35); 
             cityFrontRef.current.push(new ComplexBuilding(currentX, width, height, 'front'));
             currentX += width * random(0.9, 1.1); // Slight gap or touch
          }
      };
      
      initScene();

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initScene(); 
      };

      window.addEventListener('resize', handleResize);
      requestRef.current = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }
  }, []);

  useImperativeHandle(ref, () => ({
    launch: (config: FireworkConfig) => {
        if (canvasRef.current) {
            SoundManager.playLaunch();
            rocketsRef.current.push(new Rocket(canvasRef.current.width, canvasRef.current.height, config));
        }
    },
    clear: () => {
        rocketsRef.current = [];
        particlesRef.current = [];
        shockwavesRef.current = [];
        flashOpacity.current = 0;
    },
    unlockAudio: () => {
        SoundManager.resume();
    }
  }));

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
});

export default FireworkCanvas;