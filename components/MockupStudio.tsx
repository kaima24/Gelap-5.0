import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, Save, Check, ZoomIn, Clock, Loader2, ImagePlus, Box, Layers, LayoutTemplate, Square, Wand2, X, Eraser, Stamp, ArrowRight, ArrowDown, Tag, Type, Ratio, Palette, Scissors, ScanLine, Ban } from 'lucide-react';
import { generateCreativeImage, fileToBase64 } from '../services/geminiService';
import { saveAsset } from '../services/storageService';
import { checkDailyLimit, incrementUsage } from '../services/usageService';
import { translations } from '../utils/translations';

interface MockupStudioProps {
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

const MOCKUP_OBJECTS = [
  "T-Shirt (Flat Lay)", "T-Shirt (Hanging)", "T-Shirt (On Model)",
  "Hoodie (Flat Lay)", "Hoodie (On Model)", "Tote Bag", "Baseball Cap",
  "Coffee Mug (Ceramic)", "Paper Coffee Cup", "Water Bottle (Metal)", "Soda Can",
  "Business Cards", "A4 Paper / Letterhead", "Hardcover Book",
  "Box Packaging (Square)", "Mailer Box", "Paper Shopping Bag", 
  "Cosmetic Tube", "Glass Dropper Bottle", "Cream Jar",
  "iPhone / Smartphone", "MacBook / Laptop", "iPad / Tablet",
  "Wall Signage", "Outdoor Billboard", "Storefront Window"
];

const MOCKUP_SCENES = [
  { id: 'studio_white', label: 'Studio White', prompt: 'Clean white minimal studio background, soft shadows.' },
  { id: 'studio_color', label: 'Studio Color', prompt: 'Solid vibrant color background matching the design vibe.' },
  { id: 'wood_desk', label: 'Wooden Desk', prompt: 'Placed on a natural wooden desk surface.' },
  { id: 'marble', label: 'Marble', prompt: 'Placed on a luxury white marble surface.' },
  { id: 'concrete', label: 'Concrete', prompt: 'Against a raw industrial concrete texture.' },
  { id: 'street', label: 'Urban Street', prompt: 'In a city street environment, natural outdoor lighting.' },
  { id: 'nature', label: 'Nature', prompt: 'Outdoors surrounded by nature, leaves, and sunlight.' },
  { id: 'cafe', label: 'Cafe', prompt: 'Inside a cozy coffee shop, blurred background.' },
  { id: 'hand', label: 'Held in Hand', prompt: 'Held naturally by a human hand.' },
  { id: 'luxury', label: 'Luxury Dark', prompt: 'Dark moody lighting, elegant atmosphere.' },
];

const PRODUCT_CATEGORIES = [
  "F&B", "Skincare", "Clothing & Apparel", "Electronics", "Home Appliances", 
  "Automotive", "Health & Wellness", "Personal Care", "Baby & Kids Products", 
  "Books & Stationery", "Furniture & Home Decor", "Sports & Fitness Equipment", 
  "Footwear", "Jewelry & Accessories", "Toys & Games", "Art & Craft Supplies", 
  "Pet Products", "Travel & Luggage", "Office Supplies", "Gardening & Outdoor Equipment"
];

const DESIGN_TYPES = [
  "Logo / Icon", "Full Pattern / Texture", "Typography / Text", "Label Design", "UI / Digital Screen", "Illustration / Artwork"
];

const ASPECT_RATIOS = [
  { label: 'Automatic', value: 'Automatic' },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '16:9 (Landscape)', value: '16:9' },
  { label: '9:16 (Portrait)', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

const PRINT_TECHNIQUES = [
  { id: 'dtg', label: 'Digital Print (DTG)', prompt: 'Direct-to-garment (DTG). The ink appears absorbed into the fabric fibers. Zero relief, matte finish. The fabric texture should be visible through the ink.' },
  { id: 'plastisol', label: 'Plastisol Screen', prompt: 'Plastisol Screen Print. The ink sits on top of the fabric. Smooth, slightly rubbery surface with a satin finish. Vibrant opaque colors.' },
  { id: 'rubber', label: 'Rubber Ink (High Density)', prompt: 'High Density Rubber Ink. Thick, raised 3D texture. Matte finish. The design looks physically elevated from the surface with sharp edges.' },
  { id: 'embroidery', label: 'Embroidery', prompt: 'Direct Embroidery. Render individual thread stitches that are ultra-fine and realistic in scale relative to the object. The threads must have a slight satin sheen and catch the light. The relief should be tangible but subtle, not cartoonishly thick. Ensure proper stitch direction.' },
  { id: 'patch', label: 'Woven Patch', prompt: 'Woven Patch with Merrowed Edge. The design is on a separate piece of fabric/badge sewn onto the object. Include a stitched border/edge around the design.' },
  { id: 'puff', label: 'Puff Print', prompt: 'Puff Ink. The design looks expanded and rounded like marshmallow or foam. Soft, rounded edges with a matte, porous texture.' },
  { id: 'raster', label: 'Raster Sablon', prompt: 'Vintage Raster/Halftone Screen Print. Visible halftone dots, slightly distressed or washed-out look. Retro aesthetic.' },
  { id: 'foil', label: 'Gold/Silver Foil', prompt: 'Hot Stamping Foil. The design is metallic and highly reflective. Catches the light with specular highlights and reflections.' },
  { id: 'debossed', label: 'Debossed / Pressed', prompt: 'Debossed/Blind Emboss. The design is pressed INTO the material. Inner shadows, depth, no ink. Look like stamped leather or paper.' },
  { id: 'sticker', label: 'Sticker / Decal', prompt: 'Vinyl Decal/Sticker. Glossy finish sitting on top of the surface. Sharp edges, wrapped perfectly to the geometry.' }
];

const MockupStudio: React.FC<MockupStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // State
  const [mockupMode, setMockupMode] = useState<'generate' | 'inject'>('inject');
  const [designFile, setDesignFile] = useState<{ file: File; preview: string } | null>(null);
  const [showCategory, setShowCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [designType, setDesignType] = useState<string>(DESIGN_TYPES[0]);
  const [aspectRatio, setAspectRatio] = useState('Automatic');
  
  // Customization States
  const [overrideColor, setOverrideColor] = useState(false);
  const [colorHex, setColorHex] = useState('#000000');
  
  const [overrideTechnique, setOverrideTechnique] = useState(false);
  const [printTechnique, setPrintTechnique] = useState('dtg');
  
  // Mode A: Reference Injection State
  const [targetFile, setTargetFile] = useState<{ file: File; preview: string } | null>(null);
  const [cleanedImage, setCleanedImage] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [isAlreadyClean, setIsAlreadyClean] = useState(false);

  // Mode B: Generation State
  const [selectedObject, setSelectedObject] = useState<string>(MOCKUP_OBJECTS[0]);
  const [selectedScene, setSelectedScene] = useState<string>(MOCKUP_SCENES[0].id);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Common Generation State
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false); // Used for "Generate New" flow
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null);
  const [finalPrompt, setFinalPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // --- Handlers ---

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDesignFile({ file, preview: URL.createObjectURL(file) });
    }
  };

  const processTargetImage = async (file: File) => {
    if (isAlreadyClean) {
      // If already clean, convert to base64 and set as cleaned image immediately
      const base64 = await fileToBase64(file);
      // Construct a data URI for the cleaned image state
      setCleanedImage(`data:${file.type};base64,${base64}`);
    } else {
      setCleanedImage(null);
    }
  };

  const handleTargetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTargetFile({ file, preview: URL.createObjectURL(file) });
      setGeneratedImage(null); // Reset final result
      await processTargetImage(file);
    }
  };

  // Watch for isAlreadyClean toggle changes to re-process if file exists
  useEffect(() => {
    if (targetFile) {
      processTargetImage(targetFile.file);
    }
  }, [isAlreadyClean]);

  const openZoom = (src: string) => {
    setZoomImageSrc(src);
    setIsZoomOpen(true);
  };

  // --- FLOW A: INJECT (Clean -> Inject) ---

  const handleCleanImage = async () => {
    if (!apiKey || !targetFile) return;
    if (isAlreadyClean) return; // Should not happen due to UI logic but good safety
    if (!checkDailyLimit()) { setError(t('ps.error_limit')); return; }
    
    setIsCleaning(true);
    setError(null);
    setGenerationStatus("Removing existing branding...");

    try {
      const targetBase64 = await fileToBase64(targetFile.file);
      
      const prompt = `
        Edit this image. Identify the main product or object in the photo. 
        Remove all text, logos, graphics, and branding from its surface.
        Make the surface look blank and clean, but PRESERVE the original texture, lighting, shadows, and reflections exactly.
        Do not change the background or the object's shape. Just erase the graphics.
      `;
      
      const options = {
         aspectRatio: aspectRatio !== 'Automatic' ? aspectRatio : undefined
      };

      const result = await generateCreativeImage(prompt, apiKey, [targetBase64], options);
      setCleanedImage(result);
    } catch (err: any) {
      setError(err.message || "Failed to clean image");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleInjectDesign = async () => {
    if (!apiKey || !cleanedImage || !designFile) return;
    if (!checkDailyLimit()) { setError(t('ps.error_limit')); return; }

    setIsInjecting(true);
    setError(null);
    setGenerationStatus("Injecting design into mockup...");

    try {
      const designBase64 = await fileToBase64(designFile.file);
      // cleanImage is likely a data URI, we need to extract the base64 part for Gemini if it uses fileToBase64 style logic, 
      // but generateCreativeImage handles data uris in prompts differently depending on implementation.
      // Our service `generateCreativeImage` expects raw base64 in `referenceImages`.
      // `cleanedImage` from `generateCreativeImage` output is a Data URI.
      const cleanBase64Raw = cleanedImage.split(',')[1]; 

      // We pass Clean Image FIRST (as the scene), Design SECOND
      const images = [cleanBase64Raw, designBase64];

      const categoryContext = selectedCategory ? `for a ${selectedCategory} brand` : '';
      
      let colorInstruction = "";
      if (overrideColor) {
        colorInstruction = `
        COLOR OVERRIDE:
        - The uploaded design MUST be rendered in single color: ${colorHex}.
        - Ignore the original colors of the uploaded design. 
        - The texture and lighting of the object should interact with this ${colorHex} ink/material.
        `;
      } else {
        colorInstruction = "Preserve the original colors of the design.";
      }

      let techniqueInstruction = "";
      if (overrideTechnique) {
        const technique = PRINT_TECHNIQUES.find(t => t.id === printTechnique);
        techniqueInstruction = `
        PRINTING TECHNIQUE: ${technique?.label}
        TECHNIQUE SPECIFICS: ${technique?.prompt}
        `;
      } else {
        techniqueInstruction = "PRINTING TECHNIQUE: Analyze the mockup surface and apply the design using a photorealistic printing method suitable for the material (e.g., if fabric, use screen print or DTG; if paper, use offset print).";
      }

      const prompt = `
        Edit the first image (the target mockup). 
        CONTEXT: This is a ${designType} ${categoryContext}.
        
        TASK:
        - Apply the design (from the second image) onto the MAIN surface of the object in the first image.
        
        ${techniqueInstruction}
        
        COLOR INSTRUCTION:
        ${colorInstruction}

        CRITICAL REALISM INSTRUCTIONS:
        1. PHYSICS & LIGHTING: The design must interact with the environment's lighting. If the material is embroidery or foil, it MUST catch the light and show specular highlights. If it's ink, it must accept shadows from folds and wrinkles.
        2. TEXTURE & SCALE: 
           - Match the scale of the texture (e.g. thread thickness) to the object size. Threads must be fine and realistic, not thick ropes.
           - If using embroidery, threads should be fine, dense, and follow the form.
           - If using ink, it should follow the weave of the fabric beneath it.
        3. DISPLACEMENT: The design is not just an overlay. It must wrap around curves, disappear into deep folds, and distort with the geometry of the object.
        4. BLENDING: The edges of the design should blend naturally with the surface, avoiding a "sticker" look unless specified.
        5. Do not change the background or the object's shape.
        
        OUTPUT: A photorealistic commercial photograph.
      `;

      setFinalPrompt(prompt);
      
      const options = {
         aspectRatio: aspectRatio !== 'Automatic' ? aspectRatio : undefined
      };

      const result = await generateCreativeImage(prompt, apiKey, images, options);
      
      setGeneratedImage(result);
      incrementUsage();
      if (onUsageUpdate) onUsageUpdate();
      
      setHistory(prev => [{
        id: crypto.randomUUID(),
        image: result,
        prompt: "Inject Design Flow",
        timestamp: Date.now()
      }, ...prev]);

    } catch (err: any) {
      setError(err.message || "Failed to inject design");
    } finally {
      setIsInjecting(false);
    }
  };

  // --- FLOW B: GENERATE NEW ---

  const handleGenerateNew = async () => {
    if (!apiKey) { setError(t('ps.error_api')); return; }
    if (!designFile) { setError(t('ms.error_design')); return; }
    if (!checkDailyLimit()) { setError(t('ps.error_limit')); return; }

    setIsGenerating(true);
    abortRef.current = false;
    setError(null);
    setIsSaved(false);
    setGenerationStatus(t('ms.generating'));

    try {
      const sceneObj = MOCKUP_SCENES.find(s => s.id === selectedScene);
      const categoryContext = selectedCategory ? `Category: ${selectedCategory}.` : '';
      
      let colorInstruction = "";
      if (overrideColor) {
        colorInstruction = `Render the logo/design in strictly ${colorHex}.`;
      } else {
        colorInstruction = "Use the original colors of the uploaded design.";
      }

      let techniqueInstruction = "";
      if (overrideTechnique) {
        const technique = PRINT_TECHNIQUES.find(t => t.id === printTechnique);
        techniqueInstruction = `
        PRINTING TECHNIQUE: ${technique?.label}
        TECHNIQUE SPECIFICS: ${technique?.prompt}
        `;
      }

      let richPrompt = `
      Create a Photorealistic Professional 3D Mockup.
      OBJECT: ${selectedObject}
      SCENE/ENVIRONMENT: ${sceneObj?.prompt}
      ${categoryContext}
      DESIGN TYPE: ${designType}
      COLOR: ${colorInstruction}
      
      ${techniqueInstruction}
      
      CRITICAL REALISM INSTRUCTIONS:
      - The design must be applied to the ${selectedObject} with hyper-realistic physical properties.
      - Displace the design according to the surface bumps, wrinkles, and folds.
      - LIGHTING INTERACTION: The design material (ink/thread/foil) must reflect light differently than the base object material. 
      - If Embroidery: detailed individual stitches, satin sheen, realistic thread thickness relative to object.
      - If Screen Print: Ink sits on top, slight texture, cracking if vintage.
      - Maintain high resolution details, realistic shadows, and reflections.
      ${customPrompt ? `ADDITIONAL DETAILS: ${customPrompt}` : ''}
      Output: High-end commercial photography style, 8k resolution.
      `;

      setFinalPrompt(richPrompt);
      const base64 = await fileToBase64(designFile.file);
      
      if (abortRef.current) return;
      
      const options = {
         aspectRatio: aspectRatio !== 'Automatic' ? aspectRatio : '1:1'
      };
      
      const result = await generateCreativeImage(richPrompt, apiKey, [base64], options);
      if (abortRef.current) return;

      setGeneratedImage(result);
      incrementUsage();
      if (onUsageUpdate) onUsageUpdate();

      setHistory(prev => [{
        id: crypto.randomUUID(),
        image: result,
        prompt: richPrompt,
        timestamp: Date.now()
      }, ...prev]);

    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedImage) return;
    setIsSaving(true);
    try {
      await saveAsset({
        id: crypto.randomUUID(),
        type: 'generated',
        data: generatedImage,
        prompt: finalPrompt,
        timestamp: Date.now(),
        title: `Mockup: ${mockupMode === 'generate' ? selectedObject : 'Injected'}`
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (url: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Gelap5-MockupStudio_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download error", e);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsGenerating(false);
    setGenerationStatus(t('ps.stopped'));
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-fade-in relative z-10 font-sans">
      
      {/* Zoom Modal */}
      {isZoomOpen && zoomImageSrc && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <img src={zoomImageSrc} alt="Full Scale" className="max-w-none h-auto max-h-full object-contain shadow-2xl" />
          <button className="absolute top-6 right-6 text-zinc-400 hover:text-white"><X size={32} /></button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">{t('ms.title')}</h1>
        <p className="text-zinc-400">{t('ms.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Step 1: Upload Design (Common) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">1</span>
               {t('ms.step1')}
             </h3>
             
             {/* Upload Box */}
             <div 
               onClick={() => fileInputRef.current?.click()}
               className={`
                 relative border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors group mb-4
                 ${designFile ? 'border-lime-500/30 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
               `}
             >
                {designFile ? (
                   <div className="flex flex-col items-center justify-center p-4">
                      <img src={designFile.preview} alt="Ref" className="h-20 w-auto object-contain rounded mb-2 shadow-lg" />
                      <p className="text-xs text-zinc-400">{designFile.file.name}</p>
                      <button 
                         onClick={(e) => { e.stopPropagation(); setDesignFile(null); }}
                         className="absolute top-2 right-2 p-1 bg-zinc-800 rounded-full hover:bg-red-900/50 text-zinc-400 hover:text-red-400 transition-colors"
                       >
                         <X size={14} />
                       </button>
                   </div>
                ) : (
                   <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-300">
                      <ImagePlus size={28} className="mb-2" />
                      <p className="text-sm font-medium">{t('ms.upload_design')}</p>
                   </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleDesignUpload} />
             </div>

             {/* Brand Context, Design Type, Color Override */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Design Type */}
                 <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Type size={14} className="text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Design Type</span>
                    </div>
                    <select 
                      value={designType} 
                      onChange={(e) => setDesignType(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0 text-xs text-zinc-300 focus:border-lime-500/50 h-11"
                    >
                      {DESIGN_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                 </div>

                 {/* Color Override */}
                 <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Palette size={14} className="text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Print Color</span>
                      </div>
                      <button 
                         onClick={() => setOverrideColor(!overrideColor)} 
                         className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${overrideColor ? 'bg-lime-500' : 'bg-zinc-700'}`}
                      >
                         <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${overrideColor ? 'left-5' : 'left-1'}`} />
                      </button>
                    </div>
                    
                    {overrideColor ? (
                      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 animate-fade-in h-11">
                        {/* Custom Swatch with hidden Color Input */}
                        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-zinc-700 shadow-inner cursor-pointer group shrink-0">
                             <input 
                               type="color" 
                               value={colorHex}
                               onChange={(e) => setColorHex(e.target.value)}
                               className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 border-0 opacity-0 cursor-pointer"
                             />
                             <div className="w-full h-full" style={{ backgroundColor: colorHex }} />
                        </div>
                        
                        {/* Hex Input */}
                        <div className="flex-1 relative h-full">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] font-mono select-none">#</span>
                             <input 
                               type="text" 
                               value={colorHex.replace('#', '')}
                               onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0,6);
                                  setColorHex(`#${val}`);
                               }}
                               className="w-full h-full bg-transparent border-none py-1 pl-4 pr-1 text-xs text-zinc-200 font-mono focus:ring-0 uppercase placeholder-zinc-700"
                               placeholder="000000"
                               maxLength={6}
                             />
                        </div>
                      </div>
                    ) : (
                       <div className="text-[10px] text-zinc-500 py-2 leading-relaxed h-11 flex items-center">
                         Original design colors will be used.
                       </div>
                    )}
                 </div>

                 {/* Brand Category Toggle */}
                 <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30 md:col-span-2">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Tag size={14} className="text-zinc-400" />
                         <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('ps.define_category')}</span>
                       </div>
                       <button onClick={() => setShowCategory(!showCategory)} className={`w-8 h-4 rounded-full relative transition-colors ${showCategory ? 'bg-lime-500' : 'bg-zinc-700'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showCategory ? 'left-4.5' : 'left-0.5'}`} style={{ left: showCategory ? '18px' : '2px' }} />
                       </button>
                     </div>
                     {showCategory && (
                       <div className="mt-3 animate-fade-in">
                          <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)} 
                            className="w-full bg-zinc-950 border border-lime-500/30 rounded-lg px-2 py-0 h-10 text-xs text-lime-300"
                          >
                            <option value="">Select Category...</option>
                            {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                       </div>
                     )}
                 </div>
             </div>
          </div>

          {/* Mode Selection */}
          <div className="flex bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
             <button 
               onClick={() => setMockupMode('inject')}
               className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${mockupMode === 'inject' ? 'bg-zinc-800 text-lime-400 shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Stamp size={14} /> {t('ms.mode_inject')}
             </button>
             <button 
               onClick={() => setMockupMode('generate')}
               className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${mockupMode === 'generate' ? 'bg-zinc-800 text-lime-400 shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Box size={14} /> {t('ms.mode_create')}
             </button>
          </div>

          {/* Step 2: CONDITIONAL INTERFACE */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <h3 className="text-white font-semibold flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">2</span>
               {mockupMode === 'inject' ? t('ms.step2_inject') : t('ms.step2')}
             </h3>
            
             {/* ---------------- FLOW A: INJECT ---------------- */}
             {mockupMode === 'inject' && (
                <div className="space-y-6 animate-fade-in">
                   {/* Target Upload */}
                   <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">{t('ms.upload_target')}</label>
                      <div 
                        onClick={() => targetInputRef.current?.click()}
                        className={`
                          relative border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer transition-colors group
                          ${targetFile ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
                        `}
                      >
                         {targetFile ? (
                           <div className="relative w-full h-full flex items-center justify-center p-2">
                             <img src={targetFile.preview} alt="Target" className="max-h-full max-w-full object-contain rounded" />
                             <button onClick={(e) => { e.stopPropagation(); setTargetFile(null); setCleanedImage(null); }} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500 text-white transition-colors"><X size={14} /></button>
                           </div>
                         ) : (
                           <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-300">
                             <Upload size={28} className="mb-2" />
                             <p className="text-sm font-medium">{t('ms.click_target')}</p>
                           </div>
                         )}
                         <input ref={targetInputRef} type="file" className="hidden" accept="image/*" onChange={handleTargetUpload} />
                      </div>
                   </div>

                   {/* Aspect Ratio Selection */}
                   <div>
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                          <Ratio size={14} /> {t('ps.aspect_ratio')}
                       </label>
                       <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {ASPECT_RATIOS.map(ar => (
                             <button
                               key={ar.value}
                               onClick={() => setAspectRatio(ar.value)}
                               className={`px-2 py-2 rounded text-[10px] font-bold border transition-all ${aspectRatio === ar.value ? 'bg-zinc-800 text-lime-400 border-lime-500/50' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                             >
                               {ar.label.split(' ')[0]}
                             </button>
                          ))}
                       </div>
                   </div>

                   {/* Print Technique Selection (Refactored) */}
                   <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <Scissors size={14} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Printing Technique</span>
                         </div>
                         <button 
                            onClick={() => setOverrideTechnique(!overrideTechnique)} 
                            className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${overrideTechnique ? 'bg-lime-500' : 'bg-zinc-700'}`}
                         >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${overrideTechnique ? 'left-5' : 'left-1'}`} />
                         </button>
                       </div>

                       {overrideTechnique ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 animate-fade-in mt-3">
                            {PRINT_TECHNIQUES.map(tech => (
                               <button
                                 key={tech.id}
                                 onClick={() => setPrintTechnique(tech.id)}
                                 className={`
                                   p-2 rounded border text-left transition-all h-full
                                   ${printTechnique === tech.id 
                                     ? 'bg-blue-900/30 border-blue-500 text-blue-100 ring-1 ring-blue-500' 
                                     : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
                                 `}
                               >
                                 <div className="font-bold text-[10px] mb-0.5">{tech.label}</div>
                               </button>
                            ))}
                         </div>
                       ) : (
                         <div className="text-[10px] text-zinc-500 py-2 leading-relaxed flex items-center gap-2">
                           <ScanLine size={12} /> AI will analyze the reference material.
                         </div>
                       )}
                   </div>

                   {/* Sub-Flow: Clean then Inject */}
                   {targetFile && (
                     <div className="space-y-4">
                        <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                           <div className="h-[1px] bg-zinc-800 flex-1"></div>
                           <span>Process</span>
                           <div className="h-[1px] bg-zinc-800 flex-1"></div>
                        </div>

                        {/* Skip Cleaning Toggle */}
                         <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                             <div className="flex items-center gap-2">
                                <Ban size={14} className="text-zinc-400" />
                                <span className="text-xs text-zinc-300 font-medium">Skip Surface Cleaning</span>
                             </div>
                             <button 
                                onClick={() => setIsAlreadyClean(!isAlreadyClean)} 
                                className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${isAlreadyClean ? 'bg-lime-500' : 'bg-zinc-700'}`}
                             >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${isAlreadyClean ? 'left-5' : 'left-1'}`} />
                             </button>
                         </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Action 1: Clean */}
                           <div className={`p-4 rounded-xl border transition-all ${cleanedImage ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800'}`}>
                              <div className="flex justify-between items-start mb-2">
                                 <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                   {isAlreadyClean ? <ImagePlus size={14} className="text-emerald-400" /> : <Eraser size={14} className={cleanedImage ? "text-emerald-400" : "text-zinc-400"} />}
                                   {isAlreadyClean ? 'Original Image' : t('ms.action_clean')}
                                 </h4>
                                 {cleanedImage && <Check size={14} className="text-emerald-400" />}
                              </div>
                              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
                                {isAlreadyClean ? 'Using original image as base (Skipped cleaning).' : t('ms.desc_clean')}
                              </p>
                              
                              {cleanedImage ? (
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-emerald-500/30 mb-2 group/clean">
                                  <img src={cleanedImage} className="w-full h-full object-contain" />
                                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded font-bold backdrop-blur-md">
                                     {isAlreadyClean ? 'ORIGINAL' : 'CLEANED'}
                                  </div>
                                  
                                  {/* Hover Actions for Clean Image */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/clean:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                     <button 
                                       onClick={() => openZoom(cleanedImage)} 
                                       className="p-2 bg-white text-black hover:bg-emerald-400 rounded-full shadow-lg transition-colors"
                                       title="Zoom"
                                     >
                                       <ZoomIn size={16} />
                                     </button>
                                     <button 
                                       onClick={() => handleDownload(cleanedImage)} 
                                       className="p-2 bg-white text-black hover:bg-emerald-400 rounded-full shadow-lg transition-colors"
                                       title="Download"
                                     >
                                       <Download size={16} />
                                     </button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={handleCleanImage}
                                  disabled={isCleaning || !!cleanedImage || isAlreadyClean}
                                  className={`w-full py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${isCleaning ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'}`}
                                >
                                  {isCleaning ? <Loader2 size={12} className="animate-spin" /> : <Eraser size={12} />}
                                  {isCleaning ? 'Cleaning...' : 'Remove Branding'}
                                </button>
                              )}
                           </div>

                           {/* Action 2: Inject (Only enabled after Clean) */}
                           <div className={`p-4 rounded-xl border transition-all ${generatedImage ? 'bg-lime-900/10 border-lime-500/30' : !cleanedImage ? 'opacity-50' : 'bg-zinc-950 border-zinc-800'}`}>
                              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2"><Stamp size={14} className={generatedImage ? "text-lime-400" : "text-zinc-400"} /> {t('ms.action_inject')}</h4>
                              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">{t('ms.desc_inject')}</p>
                              <button 
                                onClick={handleInjectDesign}
                                disabled={!cleanedImage || isInjecting}
                                className={`w-full py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${!cleanedImage ? 'cursor-not-allowed bg-zinc-900 border-zinc-800 text-zinc-600' : isInjecting ? 'bg-zinc-800 text-zinc-500' : 'bg-lime-600 hover:bg-lime-500 text-black border-lime-600'}`}
                              >
                                {isInjecting ? <Loader2 size={12} className="animate-spin" /> : <Stamp size={12} />}
                                {isInjecting ? 'Injecting...' : 'Inject Design'}
                              </button>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             )}

             {/* ---------------- FLOW B: GENERATE NEW ---------------- */}
             {mockupMode === 'generate' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Object Selection */}
                  <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Box size={14} /> {t('ms.select_object')}
                      </label>
                      <div className="relative">
                        <select 
                          value={selectedObject} 
                          onChange={(e) => setSelectedObject(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 focus:border-lime-500/50 focus:outline-none appearance-none"
                        >
                          {MOCKUP_OBJECTS.map(obj => <option key={obj} value={obj}>{obj}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <Layers size={16} />
                        </div>
                      </div>
                  </div>

                  {/* Scene Selection */}
                  <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <LayoutTemplate size={14} /> {t('ms.select_scene')}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {MOCKUP_SCENES.map(scene => (
                            <button
                              key={scene.id}
                              onClick={() => setSelectedScene(scene.id)}
                              className={`
                                p-3 rounded-lg border text-left transition-all h-full
                                ${selectedScene === scene.id 
                                  ? 'bg-lime-900/30 border-lime-500 text-lime-100 ring-1 ring-lime-500' 
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
                              `}
                            >
                              <div className="font-bold text-xs mb-1">{scene.label}</div>
                            </button>
                        ))}
                      </div>
                  </div>
                  
                  {/* Aspect Ratio Selection (Manual Mode) */}
                   <div>
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                          <Ratio size={14} /> {t('ps.aspect_ratio')}
                       </label>
                       <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {ASPECT_RATIOS.map(ar => (
                             <button
                               key={ar.value}
                               onClick={() => setAspectRatio(ar.value)}
                               className={`px-2 py-2 rounded text-[10px] font-bold border transition-all ${aspectRatio === ar.value ? 'bg-zinc-800 text-lime-400 border-lime-500/50' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                             >
                               {ar.label.split(' ')[0]}
                             </button>
                          ))}
                       </div>
                   </div>

                   {/* Print Technique Selection (Refactored for Consistency) */}
                   <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <Scissors size={14} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Printing Technique</span>
                         </div>
                         <button 
                            onClick={() => setOverrideTechnique(!overrideTechnique)} 
                            className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${overrideTechnique ? 'bg-lime-500' : 'bg-zinc-700'}`}
                         >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${overrideTechnique ? 'left-5' : 'left-1'}`} />
                         </button>
                       </div>

                       {overrideTechnique ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 animate-fade-in mt-3">
                            {PRINT_TECHNIQUES.map(tech => (
                               <button
                                 key={tech.id}
                                 onClick={() => setPrintTechnique(tech.id)}
                                 className={`
                                   p-2 rounded border text-left transition-all h-full
                                   ${printTechnique === tech.id 
                                     ? 'bg-blue-900/30 border-blue-500 text-blue-100 ring-1 ring-blue-500' 
                                     : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
                                 `}
                               >
                                 <div className="font-bold text-[10px] mb-0.5">{tech.label}</div>
                               </button>
                            ))}
                         </div>
                       ) : (
                         <div className="text-[10px] text-zinc-500 py-2 leading-relaxed flex items-center gap-2">
                           <ScanLine size={12} /> AI will match the technique to the material.
                         </div>
                       )}
                   </div>

                  {/* Custom Prompt */}
                  <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">{t('ps.initial_desc')}</label>
                      <input 
                        type="text" 
                        value={customPrompt} 
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="E.g., Dark moody lighting, gold foil texture..." 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-lime-500/50 focus:outline-none"
                      />
                  </div>

                  {/* Generate Button (Specific to this flow) */}
                  <div>
                     {isGenerating ? (
                        <button onClick={handleStop} className="w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex flex-col items-center justify-center mb-4 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800">
                           <div className="flex items-center gap-2 mb-1"><Square size={14} fill="currentColor" /> <span>{t('ps.btn_stop')}</span></div>
                           {generationStatus && <span className="text-[10px] normal-case opacity-80">{generationStatus}</span>}
                        </button>
                     ) : (
                        <button 
                           onClick={handleGenerateNew}
                           disabled={!designFile}
                           className={`
                             w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex items-center justify-center gap-2
                             ${!designFile 
                             ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                             : 'bg-lime-600 hover:bg-lime-500 text-black shadow-lime-900/20'}
                           `}
                        >
                           <Wand2 size={18} />
                           {t('ms.btn_generate')}
                        </button>
                     )}
                  </div>
                </div>
             )}
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded text-red-400 text-xs text-center flex items-center justify-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
               {error}
            </div>
          )}

        </div>

        {/* RIGHT PANEL (Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 relative">
           <div className="sticky top-6 flex flex-col gap-6">
              
              {/* Output Preview */}
              <div>
                <h3 className="text-white font-semibold mb-4 text-center">{t('ps.output_title')}</h3>
                <div className="relative w-full aspect-square bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[400px]">
                    {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Mockup Result" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                            <div className="flex gap-4">
                              <button onClick={() => openZoom(generatedImage)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><ZoomIn size={24} /></button>
                              <button onClick={() => handleDownload(generatedImage)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><Download size={24} /></button>
                            </div>
                            <button onClick={handleSave} className={`px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2 font-medium text-sm ${isSaved ? 'bg-lime-500/20 text-lime-400 border border-lime-500/50' : 'bg-black/60 text-white hover:bg-black/80'}`}>
                              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : isSaved ? <Check size={16} /> : <Save size={16} />}
                              {isSaved ? t('ps.saved') : t('ps.save')}
                            </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-zinc-600 px-6">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                           <Box size={24} />
                        </div>
                        <p className="text-sm">{t('ps.output_placeholder')}</p>
                        {(isGenerating || isCleaning || isInjecting) && (
                           <div className="mt-4 flex flex-col items-center">
                              <Loader2 size={32} className="animate-spin text-lime-500 mb-2" />
                              <span className="text-[10px] text-zinc-500">{generationStatus}</span>
                           </div>
                        )}
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

      </div>
    </div>
  );
};

export default MockupStudio;