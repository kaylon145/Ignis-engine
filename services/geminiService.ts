import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExplosionShape, FireworkConfig, GeneratedFireworkResponse } from "../types";

// Initialize Gemini Client
// We assume process.env.API_KEY is available in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fireworkSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    firework: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "A creative name for this firework design" },
        primaryColor: { type: Type.STRING, description: "Hex color code (e.g., #FF0000)" },
        secondaryColor: { type: Type.STRING, description: "Hex color code for the trail or fade" },
        particleCount: { type: Type.INTEGER, description: "Number of particles (50-300)" },
        explosionShape: { 
          type: Type.STRING, 
          enum: Object.values(ExplosionShape),
          description: "The geometric shape of the explosion" 
        },
        explosionSize: { type: Type.NUMBER, description: "Spread multiplier (1.0 to 4.0)" },
        decayRate: { type: Type.NUMBER, description: "Fade rate (0.01 slow to 0.05 fast)" },
        gravity: { type: Type.NUMBER, description: "Gravity effect (0.05 floaty to 0.2 heavy)" },
      },
      required: ["name", "primaryColor", "secondaryColor", "particleCount", "explosionShape", "explosionSize", "decayRate", "gravity"],
    },
    thought: { type: Type.STRING, description: "Brief explanation of why these parameters fit the user's prompt" }
  },
  required: ["firework", "thought"]
};

export const generateFireworkConfig = async (prompt: string): Promise<GeneratedFireworkResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Design a firework based on this description: "${prompt}". 
      Translate the description into physical parameters. 
      For example, 'huge loud boom' implies high particle count and large spread. 'Gentle rain' implies low gravity and slow decay.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: fireworkSchema,
        systemInstruction: "You are a master pyrotechnic designer. You translate natural language requests into precise physics simulations for a particle engine.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedFireworkResponse;
    }
    throw new Error("No response text generated");
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback config if API fails
    return {
      firework: {
        name: "Fallback Sparkler",
        primaryColor: "#FFD700",
        secondaryColor: "#FFA500",
        particleCount: 100,
        explosionShape: ExplosionShape.SPHERE,
        explosionSize: 2,
        decayRate: 0.02,
        gravity: 0.1
      },
      thought: "The AI service was unavailable, so here is a classic sparkler."
    };
  }
};