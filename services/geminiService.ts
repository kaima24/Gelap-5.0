import { GoogleGenAI } from "@google/genai";

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

export const verifyApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) throw new Error("API Key is required");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    // Use the lightweight flash model for a quick sanity check
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: 'test' }] },
      config: {
        maxOutputTokens: 1,
      }
    });
    return true;
  } catch (error: any) {
    console.error("API Key Verification Failed:", error);
    throw error;
  }
};

export interface GenerateImageOptions {
  aspectRatio?: string;
}

export const generateCreativeImage = async (
  prompt: string, 
  apiKey: string,
  referenceImages?: string | string[], // Updated to accept single or array
  options?: GenerateImageOptions,
  modelName: string = 'gemini-2.5-flash-image'
): Promise<string> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [];

    // Handle reference images (single string or array)
    if (referenceImages) {
      const images = Array.isArray(referenceImages) ? referenceImages : [referenceImages];
      
      images.forEach(imgBase64 => {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg', // Assuming jpeg/png for simplicity
            data: imgBase64,
          },
        });
      });
    }

    // Add the text prompt
    parts.push({
      text: prompt,
    });

    const config: any = {};
    if (options?.aspectRatio && options.aspectRatio !== 'Automatic') {
       config.imageConfig = {
         aspectRatio: options.aspectRatio
       };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: config
    });

    // Parse response for image
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

export const generatePromptAnalysis = async (
  apiKey: string,
  productImageBase64: string,
  styleImageBase64: string | null,
  initialDescription: string,
  config: {
    lighting: string;
    perspective: string;
    lensType: string;
    filmGrain: number;
    preserveDetails: any;
  }
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [];
  
  const instruction = `
You are an expert Commercial Photographer and AI Prompt Engineer. 
Your goal is to write the perfect image generation prompt to re-create a product shot.

INPUT DATA:
1. Product Image (Attached first): This is the main subject.
2. Style Reference (Attached second, optional): Use this for lighting, mood, color palette, and background style.
3. User Request: "${initialDescription}"
4. Technical Settings:
   - Lighting: ${config.lighting}
   - Camera Angle: ${config.perspective}
   - Lens: ${config.lensType}
   - Film Grain: ${config.filmGrain}%
   - Preserve: ${Object.keys(config.preserveDetails).filter(k => config.preserveDetails[k]).join(', ')}

CRITICAL ANALYSIS INSTRUCTIONS:
1. PRODUCT ISOLATION: Focus ONLY on the main product object in the "Product Image". IGNORE hands holding it, table surfaces, background clutter, or any other objects. The prompt must describe the product cleanly.
2. IF STYLE REFERENCE IS PROVIDED: Analyze its lighting, composition, and mood. Write a prompt that places the *isolated* product into that exact style.
3. IF STYLE REFERENCE IS MISSING: You MUST invent a "High-End Professional Commercial Advertisement" scene. 
   - Style: Hyper-realistic, 8k resolution, award-winning photography.
   - Context: Place the product in a creative, relevant, and stunning environment (e.g., splashing water for drinks, floating geometry for tech, podiums for beauty).
   - Lighting: Cinematic, perfectly balanced studio lighting.

TASK:
Write a single, highly detailed, descriptive prompt.
- Focus on describing the lighting, textures, composition, and product placement.
- Include the specific camera details provided.
- Output ONLY the prompt text. Do not add "Here is the prompt:" or markdown formatting.
`;

  parts.push({ text: instruction });
  
  // Attach Product
  parts.push({
    inlineData: {
      mimeType: 'image/jpeg',
      data: productImageBase64
    }
  });

  // Attach Style if present
  if (styleImageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: styleImageBase64
      }
    });
  }

  try {
      // Use flash model for text/multimodal analysis
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts }
      });
      return response.text || "";
  } catch (e: any) {
      console.error("Prompt analysis failed", e);
      throw new Error("Failed to analyze images for prompt generation.");
  }
};