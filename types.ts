export enum ExplosionShape {
  SPHERE = 'SPHERE',
  HEART = 'HEART',
  STAR = 'STAR',
  RING = 'RING',
  BURST = 'BURST'
}

export type GraphicsQuality = 'Low' | 'High' | 'Ultra';

export interface FireworkConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  particleCount: number; // 50 - 400
  explosionShape: ExplosionShape;
  explosionSize: number; // 1 - 5, multiplier for velocity spread
  decayRate: number; // 0.005 - 0.03, how fast they fade
  gravity: number; // 0.05 - 0.2
  description?: string;
}

export interface GeneratedFireworkResponse {
  firework: FireworkConfig;
  thought: string; // A short reasoning from the AI about the design
}