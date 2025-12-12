import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw, Save, Check, Sparkles, X, ZoomIn, Clock, ArrowDownToLine, Loader2, ImagePlus, ToggleLeft, ToggleRight, Layers, Shuffle, SlidersHorizontal, Wand2, ShieldCheck, LayoutTemplate, Square, ChevronDown } from 'lucide-react';
import { generateCreativeImage, generatePromptAnalysis, fileToBase64 } from '../services/geminiService';
import { saveAsset } from '../services/storageService';
import { checkDailyLimit, incrementUsage } from '../services/usageService';
import { translations } from '../utils/translations';

interface ProductPhotoStudioProps {
  apiKey: string;
  onUsageUpdate?: () => void;
  lang: 'en' | 'id';
}

interface HistoryItem {
  id: string;
  image: string;
  prompt: string;
  timestamp: number;
}

// --- Configuration Constants ---

const ADS_TEMPLATES = [
  // 1-8: Original Set
  { id: 'minimal', label: 'Minimalist', prompt: 'Style: Minimalist Podium. Background: Clean solid pastel color. Lighting: Soft studio lighting, 45-degree angle.', color: 'from-zinc-100 to-zinc-300' },
  { id: 'nature', label: 'Nature', prompt: 'Style: Nature/Organic. Background: Stone texture with moss and leaves. Lighting: Dappled sunlight filtering through trees.', color: 'from-emerald-700 to-emerald-900' },
  { id: 'cyberpunk', label: 'Neon', prompt: 'Style: Cyberpunk. Background: Dark city street with wet pavement. Lighting: Neon blue and pink rim lighting, dramatic contrast.', color: 'from-purple-900 to-blue-900' },
  { id: 'luxury', label: 'Luxury', prompt: 'Style: Luxury. Background: Black silk or velvet draped fabric. Lighting: Golden spotlight, warm and elegant.', color: 'from-amber-900 to-black' },
  { id: 'splash', label: 'Splash', prompt: 'Style: Water Splash. Background: Gradient blue. Lighting: Bright high-speed flash, freezing water droplets in motion.', color: 'from-blue-400 to-blue-600' },
  { id: 'industrial', label: 'Industrial', prompt: 'Style: Industrial. Background: Raw concrete wall and metal surface. Lighting: Harsh side lighting, strong shadows.', color: 'from-gray-500 to-gray-700' },
  { id: 'sunset', label: 'Sunset', prompt: 'Style: Sunset/Golden Hour. Background: Blurred beach or horizon. Lighting: Warm backlight, creating a halo effect.', color: 'from-orange-400 to-red-500' },
  { id: 'pop', label: 'Pop Art', prompt: 'Style: Pop Art. Background: Bold contrasting geometric shapes. Lighting: Flat, bright, even lighting.', color: 'from-yellow-400 to-pink-500' },
  
  // 9-16: Materials
  { id: 'wood', label: 'Wooden', prompt: 'Style: Rustic Wood. Background: Weathered oak table. Lighting: Warm, cozy ambient light.', color: 'from-orange-800 to-amber-900' },
  { id: 'marble', label: 'Marble', prompt: 'Style: Elegant Marble. Background: White Carrara marble surface with grey veins. Lighting: Cool, crisp studio strobe.', color: 'from-slate-100 to-slate-300' },
  { id: 'glass', label: 'Glass', prompt: 'Style: Refractive Glass. Background: Abstract glass geometric shapes. Lighting: Backlit with prismatic flares.', color: 'from-cyan-100 to-blue-200' },
  { id: 'gold', label: 'Gold', prompt: 'Style: Opulent Gold. Background: Gold leaf texture. Lighting: Warm yellow highlights, rich reflections.', color: 'from-yellow-500 to-amber-600' },
  { id: 'ice', label: 'Ice', prompt: 'Style: Frozen Ice. Background: Cracked ice texture with frost. Lighting: Cool blue tones, sharp contrast.', color: 'from-cyan-500 to-blue-700' },
  { id: 'fire', label: 'Fire', prompt: 'Style: Inferno. Background: Dark smoky background with embers. Lighting: Warm orange glow from below.', color: 'from-red-600 to-orange-600' },
  { id: 'fabric', label: 'Silk', prompt: 'Style: Flowing Silk. Background: Flying satin fabric ribbons. Lighting: Soft, diffused beauty dish.', color: 'from-pink-300 to-rose-400' },
  { id: 'concrete', label: 'Concrete', prompt: 'Style: Modern Concrete. Background: Smooth architectural concrete. Lighting: Minimalist shadows.', color: 'from-gray-300 to-gray-500' },

  // 17-24: Environment
  { id: 'beach', label: 'Beach', prompt: 'Style: Tropical Beach. Background: White sand and turquoise ocean. Lighting: Bright noon sunlight.', color: 'from-cyan-400 to-blue-500' },
  { id: 'forest', label: 'Forest', prompt: 'Style: Deep Forest. Background: Ferns and ancient trees. Lighting: Rays of light breaking through canopy.', color: 'from-green-800 to-emerald-950' },
  { id: 'space', label: 'Space', prompt: 'Style: Outer Space. Background: Stars and nebula. Lighting: Cool violet rim light, zero gravity feel.', color: 'from-indigo-900 to-black' },
  { id: 'desert', label: 'Desert', prompt: 'Style: Sahara Desert. Background: Rolling sand dunes. Lighting: Harsh, hot sun with deep shadows.', color: 'from-orange-300 to-amber-500' },
  { id: 'snow', label: 'Snow', prompt: 'Style: Arctic Snow. Background: Pure white snow field. Lighting: Bright, high-key white lighting.', color: 'from-white to-slate-200' },
  { id: 'city', label: 'City', prompt: 'Style: Urban City. Background: Blurred city skyline bokeh. Lighting: Streetlights and city glow.', color: 'from-gray-700 to-slate-800' },
  { id: 'underwater', label: 'Underwater', prompt: 'Style: Deep Dive. Background: Blue water with caustic light patterns. Lighting: Filtered top-down sunlight.', color: 'from-blue-600 to-indigo-900' },
  { id: 'sky', label: 'Sky', prompt: 'Style: Cloud Kingdom. Background: Fluffy white clouds in blue sky. Lighting: Airy, bright, heavenly.', color: 'from-sky-300 to-blue-400' },

  // 25-32: Art Style
  { id: 'sketch', label: 'Sketch', prompt: 'Style: Pencil Sketch. Background: White paper texture. Lighting: Flat illustration style.', color: 'from-gray-100 to-gray-300' },
  { id: 'oil', label: 'Oil Paint', prompt: 'Style: Oil Painting. Background: Canvas texture with brushstrokes. Lighting: Painterly, dramatic.', color: 'from-amber-700 to-red-900' },
  { id: 'anime', label: 'Anime', prompt: 'Style: Anime Background. Background: Shinkai-style vibrant sky and details. Lighting: Vibrant, saturated colors.', color: 'from-pink-400 to-purple-500' },
  { id: 'lowpoly', label: 'Low Poly', prompt: 'Style: Low Poly 3D. Background: Geometric faceted shapes. Lighting: Digital ambient occlusion.', color: 'from-violet-500 to-fuchsia-600' },
  { id: 'vaporwave', label: 'Vaporwave', prompt: 'Style: Vaporwave. Background: Grid floor and 80s sun. Lighting: Pink and cyan neon.', color: 'from-pink-500 to-cyan-500' },
  { id: 'noir', label: 'Noir', prompt: 'Style: Film Noir. Background: Black and white rainy street. Lighting: High contrast chiaroscuro.', color: 'from-black to-gray-800' },
  { id: 'vintage', label: 'Vintage', prompt: 'Style: Vintage Photo. Background: Sepia tones and dust scratches. Lighting: Warm, faded nostalgic.', color: 'from-yellow-800 to-orange-900' },
  { id: 'futuristic', label: 'Futuristic', prompt: 'Style: High Tech Lab. Background: Clean white laboratory with holograms. Lighting: Clinical white and blue LEDs.', color: 'from-slate-100 to-cyan-200' },

  // 33-40: Lighting Focus
  { id: 'neon', label: 'Neon Ring', prompt: 'Style: Neon Ring Light. Background: Dark studio. Lighting: Circular neon ring reflection on product.', color: 'from-fuchsia-600 to-purple-800' },
  { id: 'shadows', label: 'Shadows', prompt: 'Style: Gobo Shadows. Background: Plain wall. Lighting: Shadows of palm leaves or blinds cast on product.', color: 'from-gray-400 to-gray-600' },
  { id: 'rim', label: 'Rim Light', prompt: 'Style: Silhouette Rim. Background: Pitch black. Lighting: Only the outline of the product is lit.', color: 'from-zinc-800 to-black' },
  { id: 'softbox', label: 'Softbox', prompt: 'Style: Giant Softbox. Background: Infinite grey. Lighting: incredibly soft, wrap-around lighting.', color: 'from-gray-200 to-gray-400' },
  { id: 'disco', label: 'Disco', prompt: 'Style: Disco Fever. Background: Glitter and bokeh. Lighting: Multi-colored party lights.', color: 'from-indigo-500 to-pink-500' },
  { id: 'candle', label: 'Candle', prompt: 'Style: Candlelight. Background: Dark room. Lighting: Flickering warm orange flame light.', color: 'from-orange-700 to-red-900' },
  { id: 'biolum', label: 'Biolum', prompt: 'Style: Bioluminescent. Background: Dark alien flora. Lighting: Glowing blue/green organic light.', color: 'from-emerald-500 to-teal-700' },
  { id: 'godrays', label: 'God Rays', prompt: 'Style: Divine Light. Background: Dusty room. Lighting: Volumetric light beams hitting the product.', color: 'from-yellow-100 to-amber-200' },

  // 41-48: Seasonal
  { id: 'spring', label: 'Spring', prompt: 'Style: Spring Garden. Background: Blooming cherry blossoms. Lighting: Fresh, bright morning light.', color: 'from-pink-200 to-rose-300' },
  { id: 'summer', label: 'Summer', prompt: 'Style: Summer Poolside. Background: Swimming pool water and tiles. Lighting: Hard sunlight.', color: 'from-cyan-300 to-blue-500' },
  { id: 'autumn', label: 'Autumn', prompt: 'Style: Autumn Leaves. Background: Orange and brown fallen leaves. Lighting: Warm, golden afternoon.', color: 'from-orange-500 to-amber-700' },
  { id: 'winter', label: 'Winter', prompt: 'Style: Winter Cabin. Background: Cozy fireplace bokeh. Lighting: Warm indoor light against cold window.', color: 'from-blue-100 to-slate-300' },
  { id: 'xmas', label: 'Festive', prompt: 'Style: Christmas Holiday. Background: Bokeh lights and ornaments. Lighting: Warm, sparkly magical.', color: 'from-red-600 to-green-700' },
  { id: 'halloween', label: 'Spooky', prompt: 'Style: Halloween. Background: Fog and pumpkins. Lighting: Eerie green and purple.', color: 'from-purple-800 to-orange-600' },
  { id: 'valentine', label: 'Romance', prompt: 'Style: Valentine. Background: Rose petals and red silk. Lighting: Romantic, soft pink.', color: 'from-red-400 to-pink-600' },
  { id: 'easter', label: 'Pastel', prompt: 'Style: Easter Pastels. Background: Soft pastel geometric shapes. Lighting: Gentle, high-key.', color: 'from-yellow-200 to-green-200' },

  // 49-56: Context
  { id: 'kitchen', label: 'Kitchen', prompt: 'Style: Modern Kitchen. Background: Marble counter with blurred kitchen tools. Lighting: Window light.', color: 'from-slate-200 to-gray-300' },
  { id: 'office', label: 'Office', prompt: 'Style: Executive Desk. Background: Wood desk with laptop and plant. Lighting: Professional office lighting.', color: 'from-amber-100 to-orange-200' },
  { id: 'bathroom', label: 'Bathroom', prompt: 'Style: Spa Bathroom. Background: White tile and bamboo. Lighting: Clean, fresh sanitary lighting.', color: 'from-cyan-50 to-white' },
  { id: 'cafe', label: 'Cafe', prompt: 'Style: Coffee Shop. Background: Rustic table with coffee beans. Lighting: Warm cafe ambience.', color: 'from-brown-600 to-yellow-800' },
  { id: 'gym', label: 'Gym', prompt: 'Style: Fitness Gym. Background: Rubber floor and weights. Lighting: High energy contrast.', color: 'from-gray-800 to-red-600' },
  { id: 'garden', label: 'Garden', prompt: 'Style: Botanic Garden. Background: Lush green plants. Lighting: Greenhouse natural light.', color: 'from-green-400 to-emerald-600' },
  { id: 'bedroom', label: 'Bedroom', prompt: 'Style: Cozy Bedroom. Background: Soft duvet and pillows. Lighting: Morning sunlight.', color: 'from-indigo-100 to-white' },
  { id: 'street', label: 'Street', prompt: 'Style: Street Style. Background: Graffiti wall or brick. Lighting: Natural outdoor shade.', color: 'from-gray-400 to-zinc-500' },

  // 57-64: Abstract
  { id: 'fluid', label: 'Fluid', prompt: 'Style: 3D Fluid Art. Background: Swirling colorful liquid paint. Lighting: Glossy studio reflections.', color: 'from-purple-400 to-pink-400' },
  { id: 'smoke', label: 'Smoke', prompt: 'Style: Colored Smoke. Background: Black with swirling colored smoke bomb. Lighting: Dramatic side lighting.', color: 'from-gray-800 to-blue-500' },
  { id: 'bokeh', label: 'Bokeh', prompt: 'Style: Abstract Bokeh. Background: Defocused lights of various colors. Lighting: Soft and dreamy.', color: 'from-yellow-200 to-pink-300' },
  { id: 'glitch', label: 'Glitch', prompt: 'Style: Glitch Art. Background: Digital distortion and pixel sorting. Lighting: RGB split lighting.', color: 'from-red-500 to-cyan-500' },
  { id: 'gradient', label: 'Gradient', prompt: 'Style: Smooth Gradient. Background: Mesh gradient of trending colors. Lighting: Soft, even illumination.', color: 'from-violet-300 to-fuchsia-300' },
  { id: 'pattern', label: 'Pattern', prompt: 'Style: Memphis Pattern. Background: 80s geometric shapes pattern. Lighting: Flat pop-art light.', color: 'from-yellow-300 to-blue-300' },
  { id: 'minimal_dark', label: 'Dark Mode', prompt: 'Style: Dark Minimal. Background: Matte black geometric shapes. Lighting: Subtle rim lighting.', color: 'from-zinc-800 to-black' },
  { id: 'wireframe', label: 'Wireframe', prompt: 'Style: 3D Wireframe. Background: Glowing grid lines. Lighting: Cybernetic glow.', color: 'from-green-400 to-black' }
];

const ASPECT_RATIOS = [
  { label: 'Automatic (Follow Reference)', value: 'Automatic' },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '16:9 (Cinematic)', value: '16:9' },
  { label: '9:16 (Social Media)', value: '9:16' },
  { label: '4:3 (Standard)', value: '4:3' },
  { label: '3:4 (Portrait)', value: '3:4' },
];

const LIGHTING_STYLES = [
  { label: 'Automatic (Follow Reference)', value: 'Automatic' },
  { label: 'Studio Balanced', value: 'Studio Balanced' },
  { label: 'Soft Window Light', value: 'Soft Window Light' },
  { label: 'Golden Hour', value: 'Golden Hour' },
  { label: 'Rembrandt', value: 'Rembrandt' },
  { label: 'Split Lighting', value: 'Split Lighting' },
  { label: 'Rim Lighting', value: 'Rim Lighting' },
  { label: 'Butterfly', value: 'Butterfly' },
  { label: 'Cinematic Teal & Orange', value: 'Cinematic Teal & Orange' },
  { label: 'Neon Cyberpunk', value: 'Neon Cyberpunk' },
  { label: 'Moody Dark', value: 'Moody Dark' },
  { label: 'High Key (Bright White)', value: 'High Key' },
  { label: 'Low Key (Dramatic)', value: 'Low Key' },
  { label: 'Product Lightbox', value: 'Product Lightbox' },
  { label: 'Dappled Sunlight', value: 'Dappled Sunlight' },
  { label: 'Hard Flash', value: 'Hard Flash' },
  { label: 'Softbox', value: 'Softbox' },
  { label: 'Ring Light', value: 'Ring Light' },
  { label: 'Silhouette', value: 'Silhouette' },
  { label: 'Volumetric Fog', value: 'Volumetric Fog' },
  { label: 'Bioluminescent', value: 'Bioluminescent' }
];

const CAMERA_ANGLES = [
  { label: 'Automatic (Follow Reference)', value: 'Automatic' },
  { label: 'Front Level', value: 'Front Level' },
  { label: 'Low Angle (Hero)', value: 'Low Angle' },
  { label: 'High Angle', value: 'High Angle' },
  { label: 'Top Down (Flat Lay)', value: 'Top Down' },
  { label: 'Isometric (45°)', value: 'Isometric' },
  { label: 'Dutch Angle (Tilted)', value: 'Dutch Angle' },
  { label: 'Close-Up (Macro)', value: 'Close-Up' },
  { label: 'Extreme Close-Up', value: 'Extreme Close-Up' },
  { label: 'Wide Shot', value: 'Wide Shot' },
  { label: 'Over the Shoulder', value: 'Over the Shoulder' },
  { label: 'Point of View (POV)', value: 'POV' },
  { label: 'Bird\'s Eye View', value: 'Bird\'s Eye View' },
  { label: 'Worm\'s Eye View', value: 'Worm\'s Eye View' },
  { label: 'Side Profile', value: 'Side Profile' },
  { label: 'Three-Quarter View', value: 'Three-Quarter View' },
  { label: 'Rear View', value: 'Rear View' },
  { label: 'Macro Detail', value: 'Macro Detail' },
  { label: 'Fisheye Distortion', value: 'Fisheye Distortion' },
  { label: 'Telephoto Compression', value: 'Telephoto Compression' },
  { label: 'Panoramic', value: 'Panoramic' }
];

const LENS_TYPES = [
  { label: 'Automatic (Follow Reference)', value: 'Automatic' },
  { label: '50mm Prime (Standard)', value: '50mm Prime' },
  { label: '35mm Wide', value: '35mm Wide' },
  { label: '85mm Portrait', value: '85mm Portrait' },
  { label: '24mm Wide Angle', value: '24mm Wide Angle' },
  { label: '100mm Macro', value: '100mm Macro' },
  { label: '200mm Telephoto', value: '200mm Telephoto' },
  { label: '16mm Ultra Wide', value: '16mm Ultra Wide' },
  { label: 'Tilt-Shift', value: 'Tilt-Shift' },
  { label: 'Vintage Anamorphic', value: 'Vintage Anamorphic' },
  { label: 'Fisheye', value: 'Fisheye' }
];

const STYLE_VARIATIONS = [
  "Style: Minimalist Podium. Background: Clean solid pastel color. Lighting: Soft studio lighting, 45-degree angle.",
  "Style: Nature/Organic. Background: Stone texture with moss and leaves. Lighting: Dappled sunlight filtering through trees.",
  "Style: Cyberpunk. Background: Dark city street with wet pavement. Lighting: Neon blue and pink rim lighting, dramatic contrast.",
  "Style: Luxury. Background: Black silk or velvet draped fabric. Lighting: Golden spotlight, warm and elegant.",
  "Style: Water Splash. Background: Gradient blue. Lighting: Bright high-speed flash, freezing water droplets in motion.",
  "Style: Industrial. Background: Raw concrete wall and metal surface. Lighting: Harsh side lighting, strong shadows.",
  "Style: Sunset/Golden Hour. Background: Blurred beach or horizon. Lighting: Warm backlight, creating a halo effect.",
  "Style: Pop Art. Background: Bold contrasting geometric shapes. Lighting: Flat, bright, even lighting.",
  "Style: Ethereal/Dreamy. Background: Clouds or soft fog. Lighting: Diffused softbox, low contrast, airy feel.",
  "Style: Kitchen/Home. Background: Marble countertop with blurred kitchen interior. Lighting: Natural window light from the side."
];

const ProductPhotoStudio: React.FC<ProductPhotoStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  // Helper for translations
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // --- State ---
  
  // Inputs
  const [productImage, setProductImage] = useState<{ file: File; preview: string } | null>(null);
  const [styleImage, setStyleImage] = useState<{ file: File; preview: string } | null>(null);
  const [useStyleRef, setUseStyleRef] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');

  // Configuration
  const [manualOverride, setManualOverride] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('Automatic');
  const [lighting, setLighting] = useState('Automatic');
  const [perspective, setPerspective] = useState('Automatic');
  const [lensType, setLensType] = useState('Automatic');
  const [filmGrain, setFilmGrain] = useState(0);
  const [imageCount, setImageCount] = useState(1);
  const [varyStyles, setVaryStyles] = useState(false);
  
  // New Template State
  const [useTemplateRef, setUseTemplateRef] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [visibleTemplateCount, setVisibleTemplateCount] = useState(8);
  
  // Toggles
  const [preserveDetails, setPreserveDetails] = useState(true);

  // Generation & Output
  const [finalPrompt, setFinalPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // History & Zoom
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'style') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      if (type === 'product') setProductImage({ file, preview });
      else setStyleImage({ file, preview });
    }
  };

  const removeImage = (type: 'product' | 'style') => {
    if (type === 'product') setProductImage(null);
    else setStyleImage(null);
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      return [...prev, id];
    });
  };

  const handleLoadMoreTemplates = () => {
    setVisibleTemplateCount(prev => Math.min(prev + 8, ADS_TEMPLATES.length));
  };

  const handleStopGeneration = () => {
    abortRef.current = true;
    setGenerationStatus(t('ps.stopped'));
    // We let the loop logic handle the cleanup of isGenerating state
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- MASTER FUNCTION: Analyze and Generate ---
  const handleAnalyzeAndGenerate = async () => {
    if (!apiKey) {
      setError(t('ps.error_api'));
      return;
    }
    if (!productImage) {
      setError(t('ps.error_img'));
      return;
    }

    setIsGenerating(true);
    abortRef.current = false;
    setError(null);
    setIsSaved(false);
    setGenerationStatus(t('ps.analyzing'));

    try {
      // --- STEP 1: PREPARE DATA ---
      const productBase64 = await fileToBase64(productImage.file);
      const styleBase64 = (useStyleRef && styleImage) ? await fileToBase64(styleImage.file) : null;

      if (abortRef.current) throw new Error("Stopped by user");

      const config = {
        lighting: manualOverride ? lighting : 'Automatic',
        perspective: manualOverride ? perspective : 'Automatic',
        lensType: manualOverride ? lensType : 'Automatic',
        filmGrain,
        preserveDetails: preserveDetails ? {
            shadows: true,
            reflections: true,
            texture: true,
            lighting: true
        } : {}
      };

      // --- STEP 2: GENERATE PROMPT (ANALYSIS) ---
      let generatedPrompt = "";
      try {
        generatedPrompt = await generatePromptAnalysis(
          apiKey,
          productBase64,
          styleBase64,
          initialPrompt,
          config
        );
        
        if (abortRef.current) throw new Error("Stopped by user");
        
        // Display prompt immediately so user can see what's happening
        setFinalPrompt(generatedPrompt.trim());
      } catch (err: any) {
        if (abortRef.current) throw new Error("Stopped by user");
        throw new Error("Analysis failed: " + err.message);
      }

      // --- STEP 3: GENERATE IMAGE USING THE PROMPT ---
      await runImageGeneration(generatedPrompt, productBase64, styleBase64);

    } catch (err: any) {
      if (err.message === "Stopped by user") {
         setGenerationStatus(t('ps.stopped'));
      } else {
         console.error(err);
         setError(err.message || "Process failed.");
      }
    } finally {
      setIsGenerating(false);
      // Status update handled by loop or stop function
    }
  };

  // Separate function for Image Generation so it can be called by "Regenerate" too
  const runImageGeneration = async (promptText: string, productBase64: string, styleBase64: string | null) => {
    let currentPrompt = promptText || "High-end product photography";

    // Prepare Images Array
    const images: string[] = [];
    images.push(productBase64);
    if (styleBase64) {
      images.push(styleBase64);
    }

    // Collect Technical Settings (for suffixing the prompt)
    const techSpecs = [
       (manualOverride && lighting !== 'Automatic') ? `Lighting Style: ${lighting}` : null,
       (manualOverride && perspective !== 'Automatic') ? `Camera Perspective: ${perspective}` : null,
       (manualOverride && lensType !== 'Automatic') ? `Lens Type: ${lensType}` : null,
       filmGrain > 0 ? `Film Grain: ${filmGrain}%` : null
    ].filter(Boolean).join(', ');
    
    const techSuffix = techSpecs ? `\n\nREQUIRED TECHNICAL SPECIFICATIONS: ${techSpecs}` : "";

    // Construct Final Prompt Logic
    let enhancedPrompt = "";
    if (styleBase64) {
        enhancedPrompt = `
SYSTEM INSTRUCTION: Expert Digital Compositor & Photographer.
TASK: Create a photorealistic composite image.
INPUTS:
- Image 1: THE PRODUCT (Subject).
- Image 2: THE STYLE REFERENCE (Composition, Lighting, Background).
STRICT INSTRUCTIONS:
1. COMPOSITION: Use the exact composition, camera angle, and background of Image 2.
2. SUBJECT: Replace the main object currently in Image 2 with the PRODUCT from Image 1.
3. INTEGRATION: Match lighting, shadows, and reflections.
4. QUALITY: High-fidelity, 4k, commercial photography.
DESCRIPTION OF DESIRED OUTPUT:
${currentPrompt}
${techSuffix}
        `.trim();
    } else {
        enhancedPrompt = `
SYSTEM INSTRUCTION: Expert Commercial Photographer.
TASK: Generate a high-end product advertisement.
INPUT: Image 1 is the PRODUCT (Ignore hands, background, or clutter. Isolate the product object).
INSTRUCTION: 
- Place the isolated PRODUCT in a STUNNING commercial scene.
- Style: Hyper-realistic, 8K, Professional Advertisement.
- Maintain the visual integrity of the PRODUCT.
- Ensure realistic lighting, shadows, and textures.
${currentPrompt}
${techSuffix}
        `.trim();
    }

    const options = {
       aspectRatio: (manualOverride && aspectRatio !== 'Automatic') ? aspectRatio : undefined
    };

    // --- Batch Generation Loop ---
    for (let i = 0; i < imageCount; i++) {
        // Stop check
        if (abortRef.current) break;

        // Check Limit each time
        if (!checkDailyLimit()) {
          setError(t('ps.error_limit'));
          break;
        }

        setGenerationStatus(`${t('ps.status_gen')} ${i + 1} of ${imageCount}...`);
        
        // VARIATION & TEMPLATE LOGIC
        let currentIterationPrompt = enhancedPrompt;
        let variationPromptDisplay = currentPrompt;

        // Priority 1: Templates (if enabled and selected)
        if (useTemplateRef && selectedTemplates.length > 0) {
             const templateId = selectedTemplates[i % selectedTemplates.length];
             const template = ADS_TEMPLATES.find(t => t.id === templateId);
             if (template) {
                  currentIterationPrompt += `\n\nIMPORTANT - TEMPLATE STYLE: ${template.prompt} Keep the product hyper-realistic and isolated.`;
                  variationPromptDisplay = `${currentPrompt} | Template: ${template.label}`;
             }
        } 
        // Priority 2: Generic Style Variation (if enabled and no templates)
        else if (imageCount > 1 && varyStyles) {
           const variation = STYLE_VARIATIONS[i % STYLE_VARIATIONS.length];
           currentIterationPrompt += `\n\nIMPORTANT - BATCH VARIATION ${i+1}: IGNORE previous background/lighting instructions. Instead, strictly use this style: "${variation}". Keep the product hyper-realistic and isolated.`;
           variationPromptDisplay = `${currentPrompt} | Variation: ${variation}`;
        }

        const result = await generateCreativeImage(currentIterationPrompt, apiKey, images, options);
        
        // Stop check after await
        if (abortRef.current) break;

        setGeneratedImage(result);
        
        // Add to History
        const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          image: result,
          prompt: variationPromptDisplay,
          timestamp: Date.now()
        };
        setHistory(prev => [newHistoryItem, ...prev]);

        incrementUsage();
        if (onUsageUpdate) onUsageUpdate();

        // Delay logic
        if (i < imageCount - 1) {
           for (let s = 30; s > 0; s--) {
             if (abortRef.current) break;
             setGenerationStatus(`${t('ps.status_cool')} ${s}s`);
             await delay(1000);
           }
        }
    }
  };

  // Handler for manual regeneration using edited prompt
  const handleRegenerate = async () => {
      if (!apiKey || !productImage) return;
      setIsGenerating(true);
      abortRef.current = false;
      setError(null);
      setIsSaved(false);
      try {
          const productBase64 = await fileToBase64(productImage.file);
          const styleBase64 = (useStyleRef && styleImage) ? await fileToBase64(styleImage.file) : null;
          await runImageGeneration(finalPrompt, productBase64, styleBase64);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsGenerating(false);
          setGenerationStatus('');
      }
  };

  const handleSave = async (imgData: string = generatedImage!, promptText: string = finalPrompt) => {
    if (!imgData) return;
    setIsSaving(true);
    try {
      await saveAsset({
        id: crypto.randomUUID(),
        type: 'generated',
        data: imgData,
        prompt: promptText,
        timestamp: Date.now(),
        title: 'Product Studio Generation'
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (imgUrl: string) => {
    try {
      // Fetch Blob to ensure we get the full binary data
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      
      // Determine extension from blob type if possible, otherwise default to png
      let extension = 'png';
      if (blob.type === 'image/jpeg') extension = 'jpg';
      if (blob.type === 'image/webp') extension = 'webp';

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use timestamp for unique name
      link.download = `gelap-product-hq-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback
      const link = document.createElement('a');
      link.href = imgUrl;
      link.download = `gelap-product-hq-${Date.now()}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-fade-in relative z-10 font-sans">
      
      {/* Zoom Modal */}
      {isZoomOpen && generatedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <img 
            src={generatedImage} 
            alt="Full Scale" 
            className="max-w-none h-auto max-h-full object-contain shadow-2xl" 
          />
          <button className="absolute top-6 right-6 text-zinc-400 hover:text-white">
            <X size={32} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">{t('ps.title')}</h1>
        <p className="text-zinc-400">{t('ps.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT PANEL: Inputs, Config, & Generate */}
        <div className="space-y-6">
          
          {/* 1. Upload Assets */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-white font-semibold">{t('ps.step1')}</h3>
               
               {/* Style Ref Toggle */}
               <button 
                 onClick={() => setUseStyleRef(!useStyleRef)}
                 className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
               >
                 <span>{t('ps.use_style')}</span>
                 {useStyleRef ? (
                   <ToggleRight className="text-lime-500" size={24} />
                 ) : (
                   <ToggleLeft className="text-zinc-600" size={24} />
                 )}
               </button>
            </div>

            <div className={`grid gap-4 mb-4 ${useStyleRef ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Product Image Box */}
              <div 
                className={`
                  relative border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer transition-colors group
                  ${productImage ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
                `}
                onClick={() => !productImage && productInputRef.current?.click()}
              >
                {productImage ? (
                  <>
                    <img src={productImage.preview} alt="Product" className="h-full w-full object-contain p-2" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage('product'); }}
                      className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-red-500/80 transition-colors"
                    >
                      <X size={14} className="text-white" />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                       <span className="text-[10px] bg-black/60 text-white px-2 py-1 rounded-full">{t('ps.prod_img')}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                     <Upload className="mx-auto mb-2 text-zinc-500 group-hover:text-zinc-300" size={24} />
                     <p className="text-xs text-zinc-500">{t('ps.prod_img')} <span className="text-red-500">*</span></p>
                  </div>
                )}
                <input ref={productInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'product')} />
              </div>

              {/* Style Reference Box - Conditionally Rendered */}
              {useStyleRef && (
                <div 
                  className={`
                    relative border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer transition-colors group
                    ${styleImage ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
                  `}
                  onClick={() => !styleImage && styleInputRef.current?.click()}
                >
                  {styleImage ? (
                    <>
                      <img src={styleImage.preview} alt="Style" className="h-full w-full object-contain p-2" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeImage('style'); }}
                        className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-red-500/80 transition-colors"
                      >
                        <X size={14} className="text-white" />
                      </button>
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                         <span className="text-[10px] bg-black/60 text-white px-2 py-1 rounded-full">{t('ps.style_ref')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                       <ImagePlus className="mx-auto mb-2 text-zinc-500 group-hover:text-zinc-300" size={24} />
                       <p className="text-xs text-zinc-500">{t('ps.style_ref')}</p>
                    </div>
                  )}
                  <input ref={styleInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'style')} />
                </div>
              )}
            </div>

            {/* Initial Prompt Input */}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-2">{t('ps.initial_desc')}</label>
              <input 
                type="text"
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                placeholder={t('ps.desc_placeholder')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 placeholder-zinc-700"
              />
            </div>
          </div>

          {/* 2. Configure Shot */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4">{t('ps.step2')}</h3>
             
             <div className="space-y-4">
                {/* Image Quantity Slider with Vary Styles Switch */}
                <div className="space-y-3 pb-4 border-b border-zinc-800/50">
                   <div className="flex justify-between items-end">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-400 font-medium">{t('ps.batch_size')}</span>
                          <span className="text-xs text-lime-400 font-bold px-2 py-0.5 bg-lime-500/10 rounded border border-lime-500/20">{imageCount} Image{imageCount > 1 ? 's' : ''}</span>
                       </div>
                       <p className="text-[10px] text-zinc-600 max-w-[180px] leading-tight">
                         {imageCount > 1 ? 'Includes 30s delay between images.' : 'Single image generation.'}
                       </p>
                     </div>
                     
                     {/* Vary Styles Toggle - Only visible when multiple images selected AND template is OFF */}
                     {imageCount > 1 && !useTemplateRef && (
                         <button 
                           onClick={() => setVaryStyles(!varyStyles)}
                           className={`flex items-center gap-2 text-[10px] font-medium transition-all px-3 py-1.5 rounded-full border ${
                             varyStyles 
                               ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                               : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                           }`}
                         >
                           <Shuffle size={12} />
                           <span>{t('ps.vary_styles')}</span>
                           <div className={`w-6 h-3 rounded-full relative transition-colors ${varyStyles ? 'bg-indigo-500' : 'bg-zinc-600'}`}>
                              <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${varyStyles ? 'left-3.5' : 'left-0.5'}`} />
                           </div>
                         </button>
                     )}
                   </div>
                   
                   <input 
                     type="range" 
                     min="1" max="10" 
                     value={imageCount} 
                     onChange={(e) => setImageCount(parseInt(e.target.value))}
                     className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
                   />
                </div>

                {/* Ads Style Concept Reference (NEW SECTION) */}
                <div className="pt-2 pb-4 border-b border-zinc-800/50">
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-2">
                        <LayoutTemplate size={14} className="text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.use_template')}</span>
                     </div>
                     <button 
                       onClick={() => setUseTemplateRef(!useTemplateRef)}
                       className={`w-10 h-5 rounded-full relative transition-colors ${useTemplateRef ? 'bg-lime-500' : 'bg-zinc-700'}`}
                     >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useTemplateRef ? 'left-6' : 'left-1'}`} />
                     </button>
                  </div>
                  
                  {useTemplateRef && (
                    <div className="animate-fade-in mt-3">
                       <label className="text-[10px] text-zinc-500 font-medium block mb-2">{t('ps.template_select')}</label>
                       
                       <div className="grid grid-cols-4 gap-2">
                         {ADS_TEMPLATES.slice(0, visibleTemplateCount).map((tpl) => {
                           const isSelected = selectedTemplates.includes(tpl.id);
                           return (
                             <button
                               key={tpl.id}
                               onClick={() => toggleTemplate(tpl.id)}
                               className={`
                                 relative aspect-square rounded-lg flex flex-col items-center justify-center p-1 transition-all
                                 bg-gradient-to-br ${tpl.color}
                                 ${isSelected ? 'ring-2 ring-white scale-95' : 'opacity-70 hover:opacity-100 hover:scale-105'}
                               `}
                               title={tpl.label}
                             >
                               {isSelected && (
                                 <div className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                                   <Check size={10} className="text-white" />
                                 </div>
                               )}
                               <span className="text-[9px] font-bold text-white drop-shadow-md text-center leading-tight">
                                 {tpl.label}
                               </span>
                             </button>
                           );
                         })}
                       </div>

                       {/* Load More Button */}
                       {visibleTemplateCount < ADS_TEMPLATES.length && (
                         <button 
                           onClick={handleLoadMoreTemplates}
                           className="w-full mt-3 py-1.5 text-[10px] font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-800 rounded-lg hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1"
                         >
                            <ChevronDown size={12} /> {t('ps.load_more')}
                         </button>
                       )}

                       <p className="text-[9px] text-zinc-600 mt-2">
                         {selectedTemplates.length > 0 ? `${selectedTemplates.length} concepts selected.` : 'Select concepts to guide generation.'}
                       </p>
                    </div>
                  )}
                </div>

                {/* Manual Override Group */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4 bg-zinc-900 p-2 rounded-lg border border-zinc-800/50">
                     <div className="flex items-center gap-2">
                        <SlidersHorizontal size={14} className="text-zinc-400" />
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.manual')}</span>
                           <span className="text-[9px] text-zinc-600">{t('ps.manual_desc')}</span>
                        </div>
                     </div>
                     <button 
                       onClick={() => setManualOverride(!manualOverride)}
                       className={`w-10 h-5 rounded-full relative transition-colors ${manualOverride ? 'bg-lime-500' : 'bg-zinc-700'}`}
                     >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${manualOverride ? 'left-6' : 'left-1'}`} />
                     </button>
                  </div>

                  {manualOverride ? (
                    <div className="grid grid-cols-1 gap-4 pt-2 animate-fade-in">
                      {/* Aspect Ratio */}
                      <div className="space-y-1">
                         <label className="text-xs text-zinc-500 font-medium">{t('ps.aspect_ratio')}</label>
                         <select 
                           value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
                         >
                           {ASPECT_RATIOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>
                      </div>
                      
                      {/* Lighting */}
                      <div className="space-y-1">
                         <label className="text-xs text-zinc-500 font-medium">{t('ps.lighting')}</label>
                         <select 
                           value={lighting} onChange={(e) => setLighting(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
                         >
                            {LIGHTING_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>
                      </div>

                      {/* Perspective */}
                      <div className="space-y-1">
                         <label className="text-xs text-zinc-500 font-medium">{t('ps.perspective')}</label>
                         <select 
                           value={perspective} onChange={(e) => setPerspective(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
                         >
                            {CAMERA_ANGLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>
                      </div>

                      {/* Lens Type */}
                      <div className="space-y-1">
                         <label className="text-xs text-zinc-500 font-medium">{t('ps.lens')}</label>
                         <select 
                           value={lensType} onChange={(e) => setLensType(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
                         >
                            {LENS_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/30 text-center">
                       <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-2">
                         <Sparkles size={10} /> {t('ps.auto_settings')}
                       </p>
                    </div>
                  )}
                </div>

                {/* Film Grain Slider */}
                <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                   <div className="flex justify-between text-xs">
                     <span className="text-zinc-500 font-medium">{t('ps.film_grain')}</span>
                     <span className="text-zinc-400">{filmGrain}%</span>
                   </div>
                   <input 
                     type="range" 
                     min="0" max="100" 
                     value={filmGrain} 
                     onChange={(e) => setFilmGrain(parseInt(e.target.value))}
                     className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
                   />
                </div>

                {/* Toggles - Simplified Preserve Details */}
                <div className="pt-2">
                  <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800/50">
                     <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-zinc-400" />
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.preserve')}</span>
                           <span className="text-[9px] text-zinc-600">Shadows, Reflections, Texture, Lighting</span>
                        </div>
                     </div>
                     <button 
                       onClick={() => setPreserveDetails(!preserveDetails)}
                       className={`w-10 h-5 rounded-full relative transition-colors ${preserveDetails ? 'bg-lime-500' : 'bg-zinc-700'}`}
                     >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preserveDetails ? 'left-6' : 'left-1'}`} />
                     </button>
                  </div>
                </div>
             </div>
          </div>

          {/* 3. Generate Actions (Consolidated) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4">{t('ps.step3')}</h3>
             
             {/* Main Analyze & Generate Button */}
             {isGenerating ? (
               <button 
                 onClick={handleStopGeneration}
                 className="w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex flex-col items-center justify-center mb-4 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800"
               >
                 <div className="flex items-center gap-2 mb-1">
                    <Square size={14} fill="currentColor" /> 
                    <span>{t('ps.btn_stop')}</span>
                 </div>
                 {generationStatus && <span className="text-[10px] normal-case opacity-80">{generationStatus}</span>}
               </button>
             ) : (
               <button 
                 onClick={handleAnalyzeAndGenerate}
                 disabled={!productImage}
                 className={`
                   w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex flex-col items-center justify-center mb-4
                   ${!productImage
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#406828] hover:bg-[#4d7a30] text-white shadow-[#406828]/20'
                   }
                 `}
               >
                 <div className="flex items-center gap-2">
                    <Wand2 size={18} />
                    <span>{t('ps.btn_analyze_generate')}</span>
                 </div>
               </button>
             )}

             {/* Prompt Display Box */}
             <div className="relative mb-4 animate-fade-in">
               <textarea 
                 value={finalPrompt}
                 onChange={(e) => setFinalPrompt(e.target.value)}
                 placeholder={t('ps.prompt_placeholder')}
                 readOnly={isGenerating} 
                 className={`w-full h-32 bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-lime-500 resize-none placeholder-zinc-600 transition-opacity ${isGenerating ? 'opacity-70' : 'opacity-100'}`}
               />
               <span className="absolute bottom-2 right-2 text-[10px] text-zinc-500 bg-black/40 px-2 py-1 rounded">{t('ps.editable')}</span>
             </div>

             {/* Regenerate Button (Only if prompt exists and not generating) */}
             {finalPrompt && !isGenerating && (
                <button 
                  onClick={handleRegenerate}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2"
                >
                   <RefreshCw size={14} /> {t('ps.btn_regenerate')}
                </button>
             )}
             
             {error && (
               <div className="mt-3 text-red-400 text-xs text-center flex items-center justify-center gap-1">
                 <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" /> {error}
               </div>
             )}
          </div>
        </div>

        {/* RIGHT PANEL: Output & History */}
        <div className="space-y-6">
          {/* Generated Image Display */}
          <div className="flex-1">
             <h3 className="text-white font-semibold mb-4 text-center">{t('ps.output_title')}</h3>
             
             <div className="relative w-full aspect-square bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[500px] sticky top-6">
                {generatedImage ? (
                  <>
                     <img src={generatedImage} alt="Result" className="w-full h-full object-contain" />
                     
                     {/* Overlay Actions */}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setIsZoomOpen(true)}
                            className="p-3 bg-white text-black hover:bg-lime-400 rounded-full transition-colors shadow-lg"
                            title={t('ps.zoom')}
                          >
                            <ZoomIn size={24} />
                          </button>
                          
                          <button 
                            onClick={() => handleDownload(generatedImage)} 
                            className="p-3 bg-white text-black hover:bg-lime-400 rounded-full transition-colors shadow-lg"
                            title={t('ps.download')}
                          >
                             <Download size={24} />
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => handleSave()}
                          className={`
                            px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2 font-medium text-sm
                            ${isSaved ? 'bg-lime-500/20 text-lime-400 border border-lime-500/50' : 'bg-black/60 text-white hover:bg-black/80'}
                          `}
                        >
                           {isSaving ? <RefreshCw size={16} className="animate-spin" /> : 
                            isSaved ? <Check size={16} /> : <Save size={16} />}
                           {isSaved ? t('ps.saved') : t('ps.save')}
                        </button>
                     </div>
                  </>
                ) : (
                  <div className="text-center text-zinc-600 px-6">
                    <p className="text-sm">{t('ps.output_placeholder')}</p>
                    {isGenerating && <Loader2 size={32} className="animate-spin mx-auto mt-4 text-lime-500" />}
                  </div>
                )}
             </div>
          </div>

          {/* Generation History */}
          {history.length > 0 && (
            <div className="pt-4 border-t border-zinc-800">
               <div className="flex items-center justify-between mb-3 text-zinc-400">
                 <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{t('ps.history')}</span>
                 </div>
                 <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{history.length} items</span>
               </div>
               <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                 {history.map((item) => (
                   <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer">
                     <img 
                       src={item.image} 
                       alt="History" 
                       className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                       onClick={() => {
                         setGeneratedImage(item.image);
                         setFinalPrompt(item.prompt);
                       }}
                     />
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleDownload(item.image);
                       }}
                       className="absolute bottom-1 right-1 p-1.5 bg-black/60 hover:bg-lime-500 hover:text-black text-white rounded-md opacity-0 group-hover:opacity-100 transition-all"
                       title="Download"
                     >
                       <ArrowDownToLine size={12} />
                     </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProductPhotoStudio;