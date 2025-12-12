import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, Save, Check, Sparkles, X, ZoomIn, Clock, ArrowDownToLine, Loader2, ImagePlus, ToggleLeft, ToggleRight, Layers, Shuffle, SlidersHorizontal, Wand2, ShieldCheck, LayoutTemplate, Square, ChevronDown, User, Boxes, Tag, Leaf, Trash2, Plus } from 'lucide-react';
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

interface ProductAsset {
  id: string;
  file: File;
  preview: string;
}

// --- Constants ---

const PRODUCT_CATEGORIES = [
  "F&B", "Skincare", "Clothing & Apparel", "Electronics", "Home Appliances", 
  "Automotive", "Health & Wellness", "Personal Care", "Baby & Kids Products", 
  "Books & Stationery", "Furniture & Home Decor", "Sports & Fitness Equipment", 
  "Footwear", "Jewelry & Accessories", "Toys & Games", "Art & Craft Supplies", 
  "Pet Products", "Travel & Luggage", "Office Supplies", "Gardening & Outdoor Equipment"
];

const COMMON_INGREDIENTS = [
  "Fruit Slices", "Whole Fruits", "Milk Splash", "Water Splash", "Water Droplets",
  "Coffee Beans", "Steam/Smoke", "Ice Cubes", "Crushed Ice", "Fire/Flames",
  "Flowers", "Flower Petals", "Green Leaves", "Dried Leaves", "Wood Chunks",
  "Stones/Pebbles", "Sand", "Fabric/Silk", "Gold Flakes", "Powder Explosion"
];

const BACKGROUND_TEMPLATES = [
  { id: 'minimal', label: 'Minimalist', prompt: 'Style: Minimalist Podium. Background: Clean solid pastel color.' },
  { id: 'nature', label: 'Nature', prompt: 'Style: Nature/Organic. Background: Stone texture with moss and leaves.' },
  { id: 'industrial', label: 'Industrial', prompt: 'Style: Industrial. Background: Raw concrete wall and metal surface.' },
  { id: 'office', label: 'Office', prompt: 'Style: Modern Office. Background: Executive desk, blurred workspace.' },
  { id: 'kitchen', label: 'Kitchen', prompt: 'Style: Modern Kitchen. Background: Marble countertop, bright interior.' },
  { id: 'bathroom', label: 'Bathroom', prompt: 'Style: Luxury Bathroom. Background: White tiles, bamboo, spa feel.' },
  { id: 'bedroom', label: 'Bedroom', prompt: 'Style: Cozy Bedroom. Background: Soft duvet, morning light.' },
  { id: 'forest', label: 'Forest', prompt: 'Style: Enchanted Forest. Background: Ancient trees, ferns, dappled light.' },
  { id: 'beach', label: 'Beach', prompt: 'Style: Tropical Beach. Background: White sand, turquoise ocean, sunlight.' },
  { id: 'space', label: 'Space', prompt: 'Style: Outer Space. Background: Stars, nebula, zero gravity.' },
  { id: 'desert', label: 'Desert', prompt: 'Style: Desert Dunes. Background: Golden sand, blue sky, heat.' },
  { id: 'snow', label: 'Snow', prompt: 'Style: Arctic Snow. Background: Pure white snow, ice crystals.' },
  { id: 'city', label: 'City', prompt: 'Style: Urban City. Background: City skyline bokeh, street lights.' },
  { id: 'underwater', label: 'Underwater', prompt: 'Style: Underwater. Background: Blue water, bubbles, light rays.' },
  { id: 'sky', label: 'Sky', prompt: 'Style: Clouds. Background: Fluffy white clouds, blue sky, airy.' },
  { id: 'cafe', label: 'Cafe', prompt: 'Style: Coffee Shop. Background: Wooden table, warm ambiance.' },
  { id: 'gym', label: 'Gym', prompt: 'Style: Fitness Gym. Background: Weights, rubber floor, energetic.' },
  { id: 'garden', label: 'Garden', prompt: 'Style: Botanic Garden. Background: Lush flowers, greenhouse.' }
];

const OBJECT_TEMPLATES = [
  { id: 'fire', label: 'Fire', prompt: 'Effect: Fire & Ember. Add dramatic flames or embers around the product.' },
  { id: 'ice', label: 'Ice', prompt: 'Effect: Frozen. Add ice crystals, frost, or cracked ice textures.' },
  { id: 'smoke', label: 'Smoke', prompt: 'Effect: Smoke. Add swirling colored smoke or dry ice fog.' },
  { id: 'water_splash', label: 'Water Splash', prompt: 'Effect: Water Splash. Add dynamic clear water splashes and droplets.' },
  { id: 'milk_splash', label: 'Milk Splash', prompt: 'Effect: Milk Splash. Add creamy white liquid splashes.' },
  { id: 'color_splash', label: 'Paint Splash', prompt: 'Effect: Color Paint. Add exploding colorful paint or powder.' },
  { id: 'flowers', label: 'Flowers', prompt: 'Effect: Floral. Add falling petals or blooming flowers around.' },
  { id: 'fruit', label: 'Fruits', prompt: 'Effect: Fresh Fruits. Add flying slices of fresh citrus or berries.' }
];

const VIBE_TEMPLATES = [
  { id: 'luxury', label: 'Luxury', prompt: 'Vibe: Luxury. Gold accents, silk textures, elegant lighting.' },
  { id: 'summer', label: 'Summer', prompt: 'Vibe: Summer. Bright sun, hard shadows, vibrant colors.' },
  { id: 'winter', label: 'Winter', prompt: 'Vibe: Winter. Cold tones, cozy atmosphere, frost.' },
  { id: 'romance', label: 'Romance', prompt: 'Vibe: Romantic. Soft pinks/reds, roses, candlelight.' },
  { id: 'futuristic', label: 'Futuristic', prompt: 'Vibe: Futuristic. Neon lights, chrome, tech aesthetic.' },
  { id: 'vintage', label: 'Vintage', prompt: 'Vibe: Vintage. Sepia tones, film grain, nostalgic.' },
  { id: 'halloween', label: 'Halloween', prompt: 'Vibe: Halloween. Spooky lighting, pumpkins, dark tones.' },
  { id: 'christmas', label: 'Christmas', prompt: 'Vibe: Christmas. Fairy lights, red and green, festive.' },
  { id: 'sunset', label: 'Sunset', prompt: 'Vibe: Sunset. Golden hour, warm orange glow, silhouette.' },
  { id: 'rainy', label: 'Rainy', prompt: 'Vibe: Rainy Day. Wet surfaces, reflections, moody blue light.' }
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
  { label: 'Cinematic Teal & Orange', value: 'Cinematic Teal & Orange' },
  { label: 'Neon Cyberpunk', value: 'Neon Cyberpunk' },
  { label: 'Moody Dark', value: 'Moody Dark' },
  { label: 'Product Lightbox', value: 'Product Lightbox' },
  { label: 'Dappled Sunlight', value: 'Dappled Sunlight' },
  { label: 'Hard Flash', value: 'Hard Flash' },
  { label: 'Rim Lighting', value: 'Rim Lighting' },
];

const MODEL_RACES = [
  'Asian', 'Caucasian', 'Black / African American', 'American Indian', 'Native Hawaiian', 'Malayan', 'Latino/Hispanic'
];

const MODEL_ANGLES = [
  'Full Body Shot', 'Half Body / Waist Up', 'Face Close-Up', 'Hand Holding Product', 'Legs / Shoes Focus', 'Over the Shoulder'
];

const ProductPhotoStudio: React.FC<ProductPhotoStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  // Helper for translations
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // --- State ---
  
  // Inputs
  const [productImages, setProductImages] = useState<ProductAsset[]>([]);
  const [styleImage, setStyleImage] = useState<{ file: File; preview: string } | null>(null);
  const [useStyleRef, setUseStyleRef] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');

  // Category & Ingredients
  const [showCategory, setShowCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [showIngredients, setShowIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [customIngredient, setCustomIngredient] = useState("");

  // Config
  const [imageCount, setImageCount] = useState(1);
  const [productQuantity, setProductQuantity] = useState(1); // 1-20
  
  // Human Model Config
  const [includeModel, setIncludeModel] = useState(false);
  const [modelConfig, setModelConfig] = useState({
    gender: 'Female',
    age: '25',
    race: 'Asian',
    angle: 'Half Body / Waist Up'
  });

  // Templates - UPDATED TO ARRAYS
  const [useTemplateRef, setUseTemplateRef] = useState(false);
  const [selectedBgs, setSelectedBgs] = useState<string[]>([]);
  const [selectedObjs, setSelectedObjs] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  // Custom Template Inputs
  const [customBg, setCustomBg] = useState("");
  const [customObj, setCustomObj] = useState("");
  const [customVibe, setCustomVibe] = useState("");

  // Manual Override
  const [manualOverride, setManualOverride] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('Automatic');
  const [lighting, setLighting] = useState('Automatic');
  const [filmGrain, setFilmGrain] = useState(0);
  const [preserveDetails, setPreserveDetails] = useState(true);

  // Generation
  const [finalPrompt, setFinalPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // Effect to handle single vs multiple selection based on batch size
  useEffect(() => {
    if (imageCount === 1) {
      // If switching to single generation, keep only the first selected element
      if (selectedBgs.length > 1) setSelectedBgs([selectedBgs[0]]);
      if (selectedObjs.length > 1) setSelectedObjs([selectedObjs[0]]);
      if (selectedVibes.length > 1) setSelectedVibes([selectedVibes[0]]);
    }
  }, [imageCount]);

  // --- Handlers ---

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAssets: ProductAsset[] = (Array.from(e.target.files) as File[]).map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file)
      }));
      setProductImages(prev => [...prev, ...newAssets]);
    }
  };

  const handleStyleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStyleImage({ file, preview: URL.createObjectURL(file) });
    }
  };

  const removeProductImage = (id: string) => {
    setProductImages(prev => prev.filter(p => p.id !== id));
  };

  const removeStyleImage = () => {
    setStyleImage(null);
  };

  const toggleSelection = (id: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (current.includes(id)) {
      setter(current.filter(i => i !== id));
    } else {
      if (imageCount === 1) {
         setter([id]);
      } else {
         setter([...current, id]);
      }
    }
  };

  const toggleIngredient = (item: string) => {
    if (selectedIngredients.includes(item)) {
      setSelectedIngredients(prev => prev.filter(i => i !== item));
    } else {
      setSelectedIngredients(prev => [...prev, item]);
    }
  };

  const handleStopGeneration = () => {
    abortRef.current = true;
    setGenerationStatus(t('ps.stopped'));
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- MASTER FUNCTION ---
  const handleAnalyzeAndGenerate = async () => {
    if (!apiKey) {
      setError(t('ps.error_api'));
      return;
    }
    if (productImages.length === 0) {
      setError(t('ps.error_img'));
      return;
    }

    setIsGenerating(true);
    abortRef.current = false;
    setError(null);
    setIsSaved(false);
    setGenerationStatus(t('ps.analyzing'));

    try {
      // SELECTION LOGIC for Product Variants
      let imagesToUse: ProductAsset[] = [];
      let selectionNote = "";

      if (productQuantity < productImages.length) {
         // Case: Fewer items than uploaded variants -> Pick random subset
         const shuffled = [...productImages].sort(() => 0.5 - Math.random());
         imagesToUse = shuffled.slice(0, productQuantity);
         selectionNote = `Display exactly ${productQuantity} items using the ${productQuantity} reference product images provided.`;
      } else {
         // Case: More items or equal -> Use all uploads
         imagesToUse = productImages;
         if (productQuantity === productImages.length) {
            selectionNote = `Display exactly ${productQuantity} items. Each reference product should appear exactly once.`;
         } else {
            selectionNote = `Display exactly ${productQuantity} items. You must include all the distinct reference products provided. Randomly duplicate them to reach the total count of ${productQuantity}.`;
         }
      }

      // Convert selected product images to base64
      const productBase64s = await Promise.all(imagesToUse.map(p => fileToBase64(p.file)));
      const styleBase64 = (useStyleRef && styleImage) ? await fileToBase64(styleImage.file) : null;

      if (abortRef.current) throw new Error("Stopped by user");

      const config = {
        lighting: manualOverride ? lighting : 'Automatic',
        perspective: 'Automatic', 
        lensType: 'Automatic',
        filmGrain,
        preserveDetails: preserveDetails ? { shadows: true, reflections: true } : {}
      };

      // 1. Generate Base Prompt using the first image for analysis context
      let basePrompt = "";
      try {
        basePrompt = await generatePromptAnalysis(
          apiKey,
          productBase64s[0], // Use first image for analysis
          styleBase64,
          initialPrompt,
          config as any
        );
        if (abortRef.current) throw new Error("Stopped by user");
      } catch (err: any) {
        if (abortRef.current) throw new Error("Stopped by user");
        throw new Error("Analysis failed: " + err.message);
      }

      // 2. Append User Configurations
      let richPrompt = basePrompt;

      // Add realistic scale instruction
      richPrompt += `\n\nCRITICAL SCALE & REALISM INSTRUCTION:
      - Maintain realistic proportions relative to real-world physics.
      - Use the product's likely real-world size (e.g. handheld) as the scale anchor.
      - Ensure all added elements (ingredients, props) are scaled proportionally (e.g., a lemon slice shouldn't be larger than a bottle).
      - DEPTH OF FIELD: Create a realistic sense of depth. Objects closer to the camera (foreground) should be larger and blurred. Objects further away (background) should be smaller and blurred. 
      - The main product must remain the sharpest, perfectly scaled focal point.`;

      // Add selection instructions
      richPrompt += `\n\nPRODUCT VARIANT INSTRUCTION: ${selectionNote}`;

      if (showCategory && selectedCategory) {
         richPrompt += `\n\nCONTEXT: The products belong to the "${selectedCategory}" category. Ensure the environment is suitable for this industry.`;
      }

      const allIngredients = [...selectedIngredients];
      if (customIngredient.trim()) allIngredients.push(customIngredient.trim());
      
      if (showIngredients && allIngredients.length > 0) {
         richPrompt += `\n\nCOMPOSITION ELEMENTS: Seamlessly integrate these elements into the scene: ${allIngredients.join(', ')}. Scale them realistically around the product.`;
      }

      // Custom Template Inputs
      if (useTemplateRef) {
         const customs = [];
         if (customBg.trim()) customs.push(`Custom Background: ${customBg.trim()}`);
         if (customObj.trim()) customs.push(`Additional Elements: ${customObj.trim()}`);
         if (customVibe.trim()) customs.push(`Mood/Vibe: ${customVibe.trim()}`);
         
         if (customs.length > 0) {
            richPrompt += `\n\nUSER CUSTOMIZATIONS:\n${customs.join('\n')}`;
         }
      }

      if (includeModel) {
        richPrompt += `\n\nHUMAN MODEL INSTRUCTION:
        - Subject: A ${modelConfig.age} year old ${modelConfig.race} ${modelConfig.gender}.
        - Action: The model is interacting with the products (holding, using, or posing with them).
        - Framing: ${modelConfig.angle}.
        - Style: Photorealistic, commercial lifestyle photography.`;
      }

      setFinalPrompt(richPrompt);
      
      // 3. Run Generation
      await runImageGeneration(richPrompt, productBase64s, styleBase64);

    } catch (err: any) {
      if (err.message === "Stopped by user") {
         setGenerationStatus(t('ps.stopped'));
      } else {
         console.error(err);
         setError(err.message || "Process failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const runImageGeneration = async (promptText: string, productBase64s: string[], styleBase64: string | null) => {
    // Collect all reference images
    const images: string[] = [...productBase64s];
    if (styleBase64) images.push(styleBase64);

    let baseInstruction = `
SYSTEM: Professional Commercial Photographer.
TASK: Create a high-end product shot.
INPUT: Images 1 to ${productBase64s.length} are the PRODUCT VARIANTS.
${styleBase64 ? `Image ${productBase64s.length + 1} is Style Reference.` : ''}
PROMPT: ${promptText}
    `.trim();

    if (manualOverride && lighting !== 'Automatic') baseInstruction += `\nLighting: ${lighting}`;
    if (filmGrain > 0) baseInstruction += `\nFilm Grain: ${filmGrain}%`;

    const options = {
       aspectRatio: aspectRatio !== 'Automatic' ? aspectRatio : undefined
    };

    for (let i = 0; i < imageCount; i++) {
        if (abortRef.current) break;
        if (!checkDailyLimit()) {
          setError(t('ps.error_limit'));
          break;
        }

        setGenerationStatus(`${t('ps.status_gen')} ${i + 1} of ${imageCount}...`);
        
        let currentPrompt = baseInstruction;
        let variationNote = "";

        if (useTemplateRef) {
           const bgId = selectedBgs.length > 0 ? selectedBgs[i % selectedBgs.length] : null;
           const objId = selectedObjs.length > 0 ? selectedObjs[i % selectedObjs.length] : null;
           const vibeId = selectedVibes.length > 0 ? selectedVibes[i % selectedVibes.length] : null;

           const bg = BACKGROUND_TEMPLATES.find(x => x.id === bgId);
           const obj = OBJECT_TEMPLATES.find(x => x.id === objId);
           const vibe = VIBE_TEMPLATES.find(x => x.id === vibeId);

           let styleInstructions = [];
           if (bg) styleInstructions.push(bg.prompt);
           if (obj) styleInstructions.push(obj.prompt);
           if (vibe) styleInstructions.push(vibe.prompt);
           
           // Append custom inputs to every generation if present
           if (customBg.trim()) styleInstructions.push(`Custom Background: ${customBg.trim()}`);
           if (customObj.trim()) styleInstructions.push(`Elements: ${customObj.trim()}`);
           if (customVibe.trim()) styleInstructions.push(`Vibe: ${customVibe.trim()}`);

           if (styleInstructions.length > 0) {
             currentPrompt += `\n\nSTYLE & ENVIRONMENT:\n${styleInstructions.join('\n')}`;
             variationNote = ` | Style: ${[bg?.label, obj?.label, vibe?.label].filter(Boolean).join(', ')}`;
           }
        } 
        
        if (imageCount > 1) {
             currentPrompt += `\n\nBATCH VARIATION ${i+1}: Ensure this image looks distinct from others by slightly varying the camera angle, product arrangement, or lighting nuance.`;
             variationNote += ` (Var ${i+1})`;
        }

        const result = await generateCreativeImage(currentPrompt, apiKey, images, options);
        if (abortRef.current) break;

        setGeneratedImage(result);
        
        const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          image: result,
          prompt: promptText + variationNote,
          timestamp: Date.now()
        };
        setHistory(prev => [newHistoryItem, ...prev]);

        incrementUsage();
        if (onUsageUpdate) onUsageUpdate();

        if (i < imageCount - 1) {
           for (let s = 15; s > 0; s--) {
             if (abortRef.current) break;
             setGenerationStatus(`${t('ps.status_cool')} ${s}s`);
             await delay(1000);
           }
        }
    }
  };

  const handleRegenerate = async () => {
      if (!apiKey || productImages.length === 0) return;
      setIsGenerating(true);
      abortRef.current = false;
      setError(null);
      setIsSaved(false);
      try {
          // Re-use same logic for "selected" images if possible, or just use all for simplicity in regen
          // For consistency with "Regenerate from Prompt", we assume the PROMPT contains the count instructions.
          // However, we need to send the images again. 
          // NOTE: The previous logic filtered images before prompt generation. 
          // Here we should probably re-run the whole handleAnalyzeAndGenerate logic OR just pass all images if the prompt already handles constraints.
          // Simpler approach: Re-run analyze/generate flow or create a helper that doesn't re-analyze prompt?
          // To keep it simple, we re-use the full flow for now or just regenerate with current text.
          // But wait, runImageGeneration expects base64s. 
          
          // Let's grab all base64s again. 
          // Limitation: "Regenerate" usually implies using the *edited* prompt box.
          // If the user edited the prompt, we use that.
          // We need to pass the images again. Ideally we should pass the same subset used before? 
          // Complex to track. We will pass ALL currently uploaded images and hope the prompt (which contains "use X images") guides it,
          // OR we re-apply the random logic.
          // Let's re-apply random logic if qty < uploads.
          
          let imagesToUse = productImages;
          if (productQuantity < productImages.length) {
             const shuffled = [...productImages].sort(() => 0.5 - Math.random());
             imagesToUse = shuffled.slice(0, productQuantity);
          }
          
          const productBase64s = await Promise.all(imagesToUse.map(p => fileToBase64(p.file)));
          const styleBase64 = (useStyleRef && styleImage) ? await fileToBase64(styleImage.file) : null;
          
          await runImageGeneration(finalPrompt, productBase64s, styleBase64);
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
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gelap-product-hq-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
    } catch (err) {
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
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-fade-in relative z-10 font-sans">
      
      {/* Zoom Modal */}
      {isZoomOpen && generatedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <img src={generatedImage} alt="Full Scale" className="max-w-none h-auto max-h-full object-contain shadow-2xl" />
          <button className="absolute top-6 right-6 text-zinc-400 hover:text-white"><X size={32} /></button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">{t('ps.title')}</h1>
        <p className="text-zinc-400">{t('ps.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* LEFT PANEL (Scrollable) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* 1. Assets */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-white font-semibold">{t('ps.step1')}</h3>
               <button onClick={() => setUseStyleRef(!useStyleRef)} className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                 <span>{t('ps.use_style')}</span>
                 {useStyleRef ? <ToggleRight className="text-lime-500" size={24} /> : <ToggleLeft className="text-zinc-600" size={24} />}
               </button>
            </div>
            
            {/* Upload Grids */}
            <div className={`grid gap-4 mb-4 ${useStyleRef ? 'grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* Product Variants Upload */}
              <div 
                className={`
                  relative border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors group min-h-[160px]
                  ${productImages.length > 0 ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
                `}
                onClick={() => productInputRef.current?.click()}
              >
                {productImages.length > 0 ? (
                  <div className="p-2 w-full h-full">
                     <div className="grid grid-cols-3 gap-2 w-full">
                        {productImages.map((img) => (
                           <div key={img.id} className="relative aspect-square rounded overflow-hidden border border-zinc-700 bg-black group/img">
                              <img src={img.preview} alt="Variant" className="w-full h-full object-cover" />
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeProductImage(img.id); }}
                                className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                              >
                                <X size={10} />
                              </button>
                           </div>
                        ))}
                        {/* Add More Button */}
                        <div className="aspect-square rounded border border-zinc-700 bg-zinc-800 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-700 transition-colors">
                           <Plus size={20} />
                           <span className="text-[9px] mt-1">Add</span>
                        </div>
                     </div>
                     <div className="mt-2 text-center">
                        <span className="text-[10px] bg-black/60 text-white px-2 py-1 rounded-full">{productImages.length} {t('ps.prod_img')}</span>
                     </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                     <Upload className="mx-auto mb-2 text-zinc-500 group-hover:text-zinc-300" size={24} />
                     <p className="text-xs text-zinc-500 font-medium">{t('ps.prod_img')}</p>
                     <p className="text-[10px] text-zinc-600 mt-1">{t('ps.prod_img_hint')}</p>
                  </div>
                )}
                <input ref={productInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} />
              </div>

              {/* Style Reference Upload */}
              {useStyleRef && (
                <div 
                  className={`relative border-2 border-dashed rounded-lg h-full min-h-[160px] flex flex-col items-center justify-center cursor-pointer transition-colors group ${styleImage ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}`}
                  onClick={() => !styleImage && styleInputRef.current?.click()}
                >
                  {styleImage ? (
                    <>
                      <img src={styleImage.preview} alt="Style" className="h-full w-full object-contain p-2 max-h-[160px]" />
                      <button onClick={(e) => { e.stopPropagation(); removeStyleImage(); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-red-500/80 transition-colors"><X size={14} className="text-white" /></button>
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
                  <input ref={styleInputRef} type="file" className="hidden" accept="image/*" onChange={handleStyleUpload} />
                </div>
              )}
            </div>

            {/* Product Details Section: Category & Ingredients */}
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-zinc-800/50">
                {/* Category Toggle */}
                <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Tag size={16} className="text-zinc-400" />
                       <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.define_category')}</span>
                     </div>
                     <button onClick={() => setShowCategory(!showCategory)} className={`w-10 h-5 rounded-full relative transition-colors ${showCategory ? 'bg-lime-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showCategory ? 'left-6' : 'left-1'}`} />
                     </button>
                   </div>
                   {showCategory && (
                     <div className="mt-3 animate-fade-in">
                        <label className="text-[10px] text-zinc-500 block mb-1">{t('ps.select_category')}</label>
                        <select 
                          value={selectedCategory} 
                          onChange={(e) => setSelectedCategory(e.target.value)} 
                          className="w-full bg-zinc-950 border border-lime-500/30 rounded-lg px-2 py-2 text-xs text-lime-300"
                        >
                          <option value="">Select...</option>
                          {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                     </div>
                   )}
                </div>

                {/* Ingredients Toggle */}
                <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Leaf size={16} className="text-zinc-400" />
                       <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.add_ingredients')}</span>
                     </div>
                     <button onClick={() => setShowIngredients(!showIngredients)} className={`w-10 h-5 rounded-full relative transition-colors ${showIngredients ? 'bg-lime-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showIngredients ? 'left-6' : 'left-1'}`} />
                     </button>
                   </div>
                   {showIngredients && (
                     <div className="mt-3 animate-fade-in">
                        <div className="flex flex-wrap gap-2 mb-3">
                           {COMMON_INGREDIENTS.map(item => (
                             <button
                               key={item}
                               onClick={() => toggleIngredient(item)}
                               className={`
                                 px-2 py-1 rounded-full text-[10px] border transition-all
                                 ${selectedIngredients.includes(item) 
                                   ? 'bg-lime-500/20 border-lime-500 text-lime-400' 
                                   : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'}
                               `}
                             >
                               {item}
                             </button>
                           ))}
                        </div>
                        <input 
                          type="text" 
                          value={customIngredient} 
                          onChange={(e) => setCustomIngredient(e.target.value)}
                          placeholder={t('ps.custom_ingredient')} 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-lime-500/50" 
                        />
                     </div>
                   )}
                </div>
            </div>

            <div className="mt-4">
              <input type="text" value={initialPrompt} onChange={(e) => setInitialPrompt(e.target.value)} placeholder={t('ps.desc_placeholder')} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 placeholder-zinc-700" />
            </div>
          </div>

          {/* 2. Configure */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <h3 className="text-white font-semibold">{t('ps.step2')}</h3>
             
             {/* Product Quantity & Batch Size Row */}
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs text-zinc-400 font-medium flex justify-between">
                     <span>{t('ps.batch_size')}</span>
                     <span className="text-lime-400">{imageCount}</span>
                   </label>
                   <input type="range" min="1" max="10" value={imageCount} onChange={(e) => setImageCount(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs text-zinc-400 font-medium flex justify-between">
                     <span>{t('ps.product_qty')}</span>
                     <span className="text-blue-400">{productQuantity}</span>
                   </label>
                   <input type="range" min="1" max="20" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
             </div>

             {/* Human Model Toggle */}
             <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <User size={16} className="text-zinc-400" />
                   <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.add_model')}</span>
                 </div>
                 <button onClick={() => setIncludeModel(!includeModel)} className={`w-10 h-5 rounded-full relative transition-colors ${includeModel ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${includeModel ? 'left-6' : 'left-1'}`} />
                 </button>
               </div>
               
               {includeModel && (
                 <div className="grid grid-cols-2 gap-4 animate-fade-in mt-4">
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('ps.model_gender')}</label>
                      <select value={modelConfig.gender} onChange={e => setModelConfig({...modelConfig, gender: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                        <option>Female</option><option>Male</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('ps.model_age')}</label>
                      <input type="number" value={modelConfig.age} onChange={e => setModelConfig({...modelConfig, age: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('ps.model_race')}</label>
                      <select value={modelConfig.race} onChange={e => setModelConfig({...modelConfig, race: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                        {MODEL_RACES.map(r => <option key={r}>{r}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('ps.model_angle')}</label>
                      <select value={modelConfig.angle} onChange={e => setModelConfig({...modelConfig, angle: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                        {MODEL_ANGLES.map(a => <option key={a}>{a}</option>)}
                      </select>
                   </div>
                 </div>
               )}
             </div>

             {/* Templates Section */}
             <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                      <LayoutTemplate size={16} className="text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.use_template')}</span>
                   </div>
                   <button onClick={() => setUseTemplateRef(!useTemplateRef)} className={`w-10 h-5 rounded-full relative transition-colors ${useTemplateRef ? 'bg-lime-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useTemplateRef ? 'left-6' : 'left-1'}`} />
                   </button>
                </div>
                
                {useTemplateRef && (
                  <div className="space-y-6 mt-4 animate-fade-in">
                    
                    {imageCount > 1 && (
                      <div className="p-2 bg-indigo-900/20 border border-indigo-500/30 rounded text-[10px] text-indigo-300 text-center">
                         {t('ps.multi_select_hint')}
                      </div>
                    )}

                    {/* Backgrounds */}
                    <div>
                      <h4 className="text-[10px] text-zinc-500 uppercase font-bold mb-2 tracking-widest">{t('ps.category_bg')}</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                        {BACKGROUND_TEMPLATES.map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => toggleSelection(t.id, selectedBgs, setSelectedBgs)}
                            className={`p-2 rounded border text-[10px] font-medium transition-all ${selectedBgs.includes(t.id) ? 'bg-lime-900/40 border-lime-500/50 text-lime-400 ring-1 ring-lime-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <input 
                         type="text"
                         value={customBg}
                         onChange={(e) => setCustomBg(e.target.value)}
                         placeholder={t('ps.custom_bg_placeholder')}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:border-lime-500/50 focus:outline-none"
                      />
                    </div>

                    {/* Objects */}
                    <div>
                      <h4 className="text-[10px] text-zinc-500 uppercase font-bold mb-2 tracking-widest">{t('ps.category_obj')}</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                        {OBJECT_TEMPLATES.map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => toggleSelection(t.id, selectedObjs, setSelectedObjs)}
                            className={`p-2 rounded border text-[10px] font-medium transition-all ${selectedObjs.includes(t.id) ? 'bg-blue-900/40 border-blue-500/50 text-blue-400 ring-1 ring-blue-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <input 
                         type="text"
                         value={customObj}
                         onChange={(e) => setCustomObj(e.target.value)}
                         placeholder={t('ps.custom_obj_placeholder')}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:border-blue-500/50 focus:outline-none"
                      />
                    </div>

                    {/* Vibes */}
                    <div>
                      <h4 className="text-[10px] text-zinc-500 uppercase font-bold mb-2 tracking-widest">{t('ps.category_vibe')}</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                        {VIBE_TEMPLATES.map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => toggleSelection(t.id, selectedVibes, setSelectedVibes)}
                            className={`p-2 rounded border text-[10px] font-medium transition-all ${selectedVibes.includes(t.id) ? 'bg-purple-900/40 border-purple-500/50 text-purple-400 ring-1 ring-purple-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <input 
                         type="text"
                         value={customVibe}
                         onChange={(e) => setCustomVibe(e.target.value)}
                         placeholder={t('ps.custom_vibe_placeholder')}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>

                  </div>
                )}
             </div>

             {/* Aspect Ratio (Moved out of Manual Override) */}
             <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/50">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2">{t('ps.aspect_ratio')}</label>
                <div className="grid grid-cols-3 gap-2">
                   {ASPECT_RATIOS.slice(1).map(opt => (
                     <button
                       key={opt.value}
                       onClick={() => setAspectRatio(opt.value)}
                       className={`
                         py-2 text-[10px] font-medium rounded transition-all border
                         ${aspectRatio === opt.value 
                           ? 'bg-lime-900/30 border-lime-500/50 text-lime-400' 
                           : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                         }
                       `}
                     >
                       {opt.label.split(' ')[0]}
                     </button>
                   ))}
                </div>
                {aspectRatio === 'Automatic' && (
                  <p className="text-[10px] text-zinc-600 mt-2 text-center italic">Using automatic aspect ratio based on reference.</p>
                )}
             </div>

             {/* Manual Config & Details */}
             <div className="flex flex-col gap-3">
               {/* Override Toggle */}
               <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-300 pl-2">{t('ps.manual')}</span>
                  <button onClick={() => setManualOverride(!manualOverride)} className={`w-10 h-5 rounded-full relative transition-colors ${manualOverride ? 'bg-lime-500' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${manualOverride ? 'left-6' : 'left-1'}`} />
                  </button>
               </div>
               
               {manualOverride && (
                 <div className="grid grid-cols-2 gap-3 animate-fade-in p-2 bg-zinc-950/50 rounded-lg border border-zinc-800">
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 block mb-1">{t('ps.lighting')}</label>
                      <select value={lighting} onChange={(e) => setLighting(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300">
                        {LIGHTING_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                       <label className="text-[10px] text-zinc-500 block mb-1">{t('ps.film_grain')}: {filmGrain}%</label>
                       <input type="range" min="0" max="100" value={filmGrain} onChange={(e) => setFilmGrain(parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                    </div>
                 </div>
               )}

               {/* Preserve Details Toggle */}
               <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800/50">
                   <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.preserve')}</span>
                   </div>
                   <button onClick={() => setPreserveDetails(!preserveDetails)} className={`w-10 h-5 rounded-full relative transition-colors ${preserveDetails ? 'bg-lime-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preserveDetails ? 'left-6' : 'left-1'}`} />
                   </button>
               </div>
             </div>
          </div>

          {/* 3. Actions */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4">{t('ps.step3')}</h3>
             {isGenerating ? (
               <button onClick={handleStopGeneration} className="w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex flex-col items-center justify-center mb-4 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800">
                 <div className="flex items-center gap-2 mb-1"><Square size={14} fill="currentColor" /> <span>{t('ps.btn_stop')}</span></div>
                 {generationStatus && <span className="text-[10px] normal-case opacity-80">{generationStatus}</span>}
               </button>
             ) : (
               <button onClick={handleAnalyzeAndGenerate} disabled={productImages.length === 0} className={`w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex flex-col items-center justify-center mb-4 ${productImages.length === 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#406828] hover:bg-[#4d7a30] text-white shadow-[#406828]/20'}`}>
                 <div className="flex items-center gap-2"><Wand2 size={18} /><span>{t('ps.btn_analyze_generate')}</span></div>
               </button>
             )}
             
             <div className="relative mb-4">
               <textarea value={finalPrompt} onChange={(e) => setFinalPrompt(e.target.value)} placeholder={t('ps.prompt_placeholder')} readOnly={isGenerating} className={`w-full h-32 bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-lime-500 resize-none placeholder-zinc-600 transition-opacity ${isGenerating ? 'opacity-70' : 'opacity-100'}`} />
               <span className="absolute bottom-2 right-2 text-[10px] text-zinc-500 bg-black/40 px-2 py-1 rounded">{t('ps.editable')}</span>
             </div>

             {finalPrompt && !isGenerating && (
                <button onClick={handleRegenerate} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2">
                   <RefreshCw size={14} /> {t('ps.btn_regenerate')}
                </button>
             )}
             
             {error && (
               <div className="mt-3 text-red-400 text-xs text-center flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" /> {error}</div>
             )}
          </div>
        </div>

        {/* RIGHT PANEL (Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block relative">
           <div className="sticky top-6 flex flex-col gap-6 max-h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar pr-2">
              {/* Output */}
              <div>
                <h3 className="text-white font-semibold mb-4 text-center">{t('ps.output_title')}</h3>
                <div className="relative w-full aspect-square bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[400px]">
                    {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Result" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                            <div className="flex gap-4">
                              <button onClick={() => setIsZoomOpen(true)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><ZoomIn size={24} /></button>
                              <button onClick={() => handleDownload(generatedImage)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><Download size={24} /></button>
                            </div>
                            <button onClick={() => handleSave()} className={`px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2 font-medium text-sm ${isSaved ? 'bg-lime-500/20 text-lime-400 border border-lime-500/50' : 'bg-black/60 text-white hover:bg-black/80'}`}>
                              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : isSaved ? <Check size={16} /> : <Save size={16} />}
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

              {/* History */}
              {history.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-3 text-zinc-400">
                    <div className="flex items-center gap-2"><Clock size={14} /><span className="text-xs font-semibold uppercase tracking-wider">{t('ps.history')}</span></div>
                    <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{history.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {history.map((item) => (
                      <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer">
                        <img src={item.image} alt="History" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => { setGeneratedImage(item.image); setFinalPrompt(item.prompt); }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>
        
        {/* Mobile Only Right Panel (Stacks at bottom) */}
        <div className="lg:hidden space-y-6">
           {/* Same content as sticky but not sticky */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-center">{t('ps.output_title')}</h3>
              <div className="relative w-full aspect-square bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[400px]">
                  {generatedImage ? (
                    <>
                      <img src={generatedImage} alt="Result" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                          <div className="flex gap-4">
                            <button onClick={() => setIsZoomOpen(true)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><ZoomIn size={24} /></button>
                            <button onClick={() => handleDownload(generatedImage)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><Download size={24} /></button>
                          </div>
                          <button onClick={() => handleSave()} className={`px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2 font-medium text-sm ${isSaved ? 'bg-lime-500/20 text-lime-400 border border-lime-500/50' : 'bg-black/60 text-white hover:bg-black/80'}`}>
                            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : isSaved ? <Check size={16} /> : <Save size={16} />}
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
            {history.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-3 text-zinc-400">
                    <div className="flex items-center gap-2"><Clock size={14} /><span className="text-xs font-semibold uppercase tracking-wider">{t('ps.history')}</span></div>
                    <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{history.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {history.map((item) => (
                      <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer">
                        <img src={item.image} alt="History" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => { setGeneratedImage(item.image); setFinalPrompt(item.prompt); }} />
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