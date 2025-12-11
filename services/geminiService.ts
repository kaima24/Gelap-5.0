import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateCreativeImage = async (
  prompt: string, 
  referenceImageBase64?: string,
  modelName: string = 'gemini-2.5-flash-image'
): Promise<string> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure process.env.API_KEY.");
  }

  try {
    const parts: any[] = [];

    // Add reference image if provided (for image-to-image or editing context)
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming jpeg/png for simplicity, ideally detect from file
          data: referenceImageBase64,
        },
      });
    }

    // Add the text prompt
    parts.push({
      text: prompt,
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      // Config for image generation isn't strictly defined in all SDK versions yet for 'generateContent' 
      // but flash-image accepts standard prompts. 
      // We rely on the model's default behavior for image output.
    });

    // Parse response for image
    // The response structure for image generation often returns an inlineData part in the candidate
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No image data found in response. The model might have returned text instead.");

  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};