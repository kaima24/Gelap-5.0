import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Upload, X, Palette, Shirt, Zap, Download, Save, Check, Loader2, PlayCircle, Package, ZoomIn, Trash2, User, Ratio } from 'lucide-react';
import { generateCreativeImage, fileToBase64 } from '../services/geminiService';
import { saveCustomCharacter, saveAsset, saveCharacterWorkspace, getCharacterWorkspace } from '../services/storageService';
import { checkDailyLimit, incrementUsage } from '../services/usageService';
import JSZip from 'jszip';

interface CharacterStudioProps {
  apiKey: string;
  onUsageUpdate?: () => void;
  lang: 'en' | 'id';
}

interface GeneratedItem {
  id: string;
  type: 'Headshot' | 'Expression' | 'FullBody';
  label: string;
  url: string; // Base64
}

const OUTFITS = [
  "Casual Hoodie & Jeans", "Business Suit (Navy)", "Cyberpunk Techwear", "Fantasy Armor (Plate)", 
  "Fantasy Robe (Mage)", "School Uniform", "Leather Jacket & Boots", "Summer Floral Dress",
  "Winter Coat & Scarf", "Athletic Gym Wear", "Medical Scrubs", "Chef Uniform", 
  "Space Suit", "Military Tactical Gear", "Bohemian Chic", "Gothic Victorian",
  "Steampunk Inventor", "Ninja / Assassin Gear", "Royal Gown / Tuxedo", "Pajamas / Loungewear",
  "Traditional Kimono", "Vintage 50s Style", "Beachwear / Swimsuit", "Explorer / Safari",
  "Minimalist Modern"
];

const GENDERS = ["Female", "Male", "Non-Binary"];

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
];

// REORDERED: Full Body Front is FIRST to serve as the Anchor Image for outfit consistency
const BATCH_LIST = [
  { type: 'FullBody', label: 'Front Standing', prompt: 'Full Body Shot, Standing Straight, Front View. Show Head to Toe completely.' },
  { type: 'Headshot', label: 'Front View', prompt: 'Extreme Close-Up Face Shot, Front View, Neutral Expression. Focus entirely on the face details.' },
  { type: 'Headshot', label: 'Left Side View', prompt: 'Extreme Close-Up Face Shot, Left Profile View, Neutral Expression. Focus entirely on the face details.' },
  { type: 'Headshot', label: 'Right Side View', prompt: 'Extreme Close-Up Face Shot, Right Profile View, Neutral Expression. Focus entirely on the face details.' },
  { type: 'Headshot', label: 'Back View', prompt: 'Extreme Close-Up Head Shot, Back View. Focus on hair and back of head.' },
  
  { type: 'Expression', label: 'Sad', prompt: 'Medium Shot (Waist Up), Front View, Sad Expression. Visible upper body and face.' },
  { type: 'Expression', label: 'Happy', prompt: 'Medium Shot (Waist Up), Front View, Happy Expression. Visible upper body and face.' },
  { type: 'Expression', label: 'Confused', prompt: 'Medium Shot (Waist Up), Front View, Confused Expression. Visible upper body and face.' },
  { type: 'Expression', label: 'Shocked', prompt: 'Medium Shot (Waist Up), Front View, Shocked Expression. Visible upper body and face.' },
  { type: 'Expression', label: 'Flat', prompt: 'Medium Shot (Waist Up), Front View, Deadpan/Flat Expression. Visible upper body and face.' },
  
  { type: 'FullBody', label: 'Left Side Standing', prompt: 'Full Body Shot, Standing Straight, Left Side View. Show Head to Toe completely.' },
  { type: 'FullBody', label: 'Right Side Standing', prompt: 'Full Body Shot, Standing Straight, Right Side View. Show Head to Toe completely.' },
  { type: 'FullBody', label: 'Back Standing', prompt: 'Full Body Shot, Standing Straight, Back View. Show Head to Toe completely.' }
];

const CharacterStudio: React.FC<CharacterStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [refImages, setRefImages] = useState<{ file: File; preview: string }[]>([]);
  
  // Outfit State
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[0]);
  const [customOutfit, setCustomOutfit] = useState('');
  const [outfitRef, setOutfitRef] = useState<{ file: File; preview: string } | null>(null);
  
  const [solidBgColor, setSolidBgColor] = useState('#808080');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [status, setStatus] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Zoom Modal State
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await getCharacterWorkspace();
        if (saved) {
          setName(saved.name || '');
          setGender(saved.gender || 'Female');
          setSelectedOutfit(saved.selectedOutfit || OUTFITS[0]);
          setCustomOutfit(saved.customOutfit || '');
          setSolidBgColor(saved.solidBgColor || '#808080');
          if (saved.aspectRatio) setAspectRatio(saved.aspectRatio);
          if (saved.generatedItems) setGeneratedItems(saved.generatedItems);
          
          // Rehydrate Images
          if (saved.refImages && Array.isArray(saved.refImages)) {
             const loadedRefs = await Promise.all(saved.refImages.map(async (base64: string) => {
                const res = await fetch(base64);
                const blob = await res.blob();
                const file = new File([blob], "restored_ref.png", { type: blob.type });
                return { file, preview: base64 };
             }));
             setRefImages(loadedRefs);
          }

          if (saved.outfitRef) {
             const res = await fetch(saved.outfitRef);
             const blob = await res.blob();
             const file = new File([blob], "restored_outfit.png", { type: blob.type });
             setOutfitRef({ file, preview: saved.outfitRef });
          }
        }
      } catch (e) {
        console.error("Failed to load workspace", e);
      }
    };
    loadState();
  }, []);

  // Autosave Effect
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
       const refsBase64 = await Promise.all(refImages.map(img => fileToBase64(img.file).then(b64 => `data:${img.file.type};base64,${b64}`)));
       let outfitBase64 = null;
       if (outfitRef) {
          const b64 = await fileToBase64(outfitRef.file);
          outfitBase64 = `data:${outfitRef.file.type};base64,${b64}`;
       }

       const workspaceData = {
         name,
         gender,
         selectedOutfit,
         customOutfit,
         solidBgColor,
         aspectRatio,
         refImages: refsBase64,
         outfitRef: outfitBase64,
         generatedItems,
         timestamp: Date.now()
       };
       await saveCharacterWorkspace(workspaceData);
    }, 2000); // 2s debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [name, gender, selectedOutfit, customOutfit, solidBgColor, aspectRatio, refImages, outfitRef, generatedItems]);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({
        file: f,
        preview: URL.createObjectURL(f)
      }));
      setRefImages(prev => [...prev, ...newFiles].slice(0, 5)); // Limit to 5
    }
  };

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOutfitRef({ file, preview: URL.createObjectURL(file) });
    }
  };

  const removeRef = (index: number) => {
    setRefImages(prev => prev.filter((_, i) => i !== index));
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGeneratePack = async () => {
    if (!apiKey) { setError("API Key required."); return; }
    if (!name) { setError("Character Name required."); return; }
    if (refImages.length === 0) { setError("Reference Image required."); return; }
    
    setIsGenerating(true);
    abortRef.current = false;
    setError(null);
    setGeneratedItems([]);
    setProgress(0);
    setIsSaved(false);

    try {
      // Prepare Identity Images
      const identityBase64s = await Promise.all(refImages.map(img => fileToBase64(img.file)));
      
      // Prepare Outfit Image (if any)
      let outfitBase64: string | null = null;
      if (outfitRef) {
        outfitBase64 = await fileToBase64(outfitRef.file);
      }

      // Initial Image List for the first generation
      const initialImages = [...identityBase64s];
      if (outfitBase64) {
        initialImages.push(outfitBase64);
      }

      const outfitIndex = outfitBase64 ? identityBase64s.length + 1 : null;
      
      // Determine final outfit description
      let outfitPrompt = "";
      if (outfitBase64) {
        outfitPrompt = `WEARING OUTFIT REFERENCE: The character MUST wear the exact outfit shown in Image #${outfitIndex}. Copy the style, fabric, and fit precisely.`;
      } else {
        const textOutfit = customOutfit.trim() || selectedOutfit;
        outfitPrompt = `WEARING: ${textOutfit}.`;
      }

      // Anchor Image (The first generated image, usually Full Body Front)
      // We will feed this into subsequent generations to lock consistency.
      let anchorImageBase64: string | null = null;

      for (let i = 0; i < BATCH_LIST.length; i++) {
        if (abortRef.current) break;
        if (!checkDailyLimit()) {
           setError("Daily usage limit reached.");
           break;
        }

        const item = BATCH_LIST[i];
        setStatus(`Generating ${item.type}: ${item.label} (${i + 1}/${BATCH_LIST.length})`);
        
        let currentPrompt = `
          Character Sheet Generation.
          SUBJECT IDENTITY: ${name} (${gender}).
          
          CRITICAL IDENTITY INSTRUCTION (99% ACCURACY):
          - You are an advanced AI specialized in Face ID preservation.
          - Images 1 to ${identityBase64s.length} are the CHARACTER IDENTITY REFERENCES.
          - You MUST generate a character that is a 99% perfect match to these references.
          - STRICTLY COPY: Facial bone structure, eye shape, nose shape, mouth, skin texture, moles/scars, and hairstyle.
          - STRICTLY COPY: Body weight and build from the references. Do not make them thinner or heavier.
          - The result must be Photorealistic, 8k resolution. Real human skin texture (pores, imperfections). No plastic/3D render look.
          
          TASK: ${item.prompt}.
          
          STYLING:
          - ${outfitPrompt}
          - BACKGROUND: Solid, flat studio background. EXACT COLOR HEX: ${solidBgColor}. Ensure the background is uniform and matches this color code precisely.
          
          CONSISTENCY RULE:
          - The subject MUST look exactly the same in every single generated image.
          - The outfit MUST remain consistent across all angles.
          
          Framing: Follow the TASK framing instruction precisely (Close Up vs Medium vs Full Body).
        `;

        // Prepare inputs for THIS specific generation
        const currentImagesInput = [...initialImages];
        
        // CONSISTENCY LOCK: If we have an anchor image (first generation), use it!
        if (anchorImageBase64 && i > 0) {
           currentImagesInput.push(anchorImageBase64);
           const anchorIndex = currentImagesInput.length;
           
           currentPrompt += `
           
           CRITICAL OUTFIT CONSISTENCY:
           - Reference Image #${anchorIndex} is the OFFICIAL GENERATED DESIGN of this character (Full Body View).
           - You MUST perfectly match the outfit details, colors, fabric textures, and accessories from Image #${anchorIndex}.
           - This is the SAME photoshoot. Do not change the shirt design or color. 
           - Use Image #${anchorIndex} as the primary source of truth for the outfit.
           `;
        }

        // Use selected aspect ratio for all generations to ensure consistency in pack dimensions
        const result = await generateCreativeImage(currentPrompt, apiKey, currentImagesInput, { aspectRatio: aspectRatio });
        
        if (abortRef.current) break;

        // If this was the first image (Full Body Front), save the raw base64 (stripped of prefix) for next iterations
        if (i === 0) {
           anchorImageBase64 = result.split(',')[1];
        }

        setGeneratedItems(prev => [...prev, {
          id: crypto.randomUUID(),
          type: item.type as any,
          label: item.label,
          url: result
        }]);

        incrementUsage();
        if (onUsageUpdate) onUsageUpdate();
        
        setProgress(i + 1);

        // Delay logic
        if (i < BATCH_LIST.length - 1) {
           for (let s = 15; s > 0; s--) {
             if (abortRef.current) break;
             setStatus(`Cooldown: ${s}s remaining to prevent rate limit...`);
             await delay(1000);
           }
        }
      }
      
      if (!abortRef.current) {
        setStatus("Pack Generation Complete!");
      } else {
        setStatus("Stopped by user.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (generatedItems.length === 0) return;
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${name}_CharacterPack`);
      
      generatedItems.forEach((item) => {
        // Remove header data:image/png;base64,
        const data = item.url.split(',')[1];
        // Clean filename
        const safeLabel = item.label.replace(/[^a-z0-9]/gi, '_');
        const filename = `${name}_${item.type}_${safeLabel}.png`;
        folder?.file(filename, data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}_CharacterPack.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Zip Error", e);
      setError("Failed to create zip file.");
    }
  };

  const handleSingleDownload = (item: GeneratedItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `${name}_${item.type}_${item.label}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveCharacter = async () => {
    if (generatedItems.length === 0) return;
    setIsSaving(true);
    try {
      // Find the "Front Standing" (Full Body) image specifically for the thumbnail as requested
      // Fallback to "Front View" (Headshot) if full body not available
      const thumbnailItem = generatedItems.find(i => i.label === 'Front Standing') || 
                            generatedItems.find(i => i.label === 'Front View') || 
                            generatedItems[0];
      
      // Save Character Definition for Hire Model Studio
      await saveCustomCharacter({
        id: crypto.randomUUID(),
        name: name,
        thumbnail: thumbnailItem.url,
        description: `Custom character created in Character Studio. Gender: ${gender}. Outfit: ${customOutfit || selectedOutfit}`,
        timestamp: Date.now()
      });

      // Also Save the main thumbnail to gallery as a record
      await saveAsset({
        id: crypto.randomUUID(),
        type: 'generated',
        data: thumbnailItem.url,
        prompt: `Character Pack: ${name} (Saved as Model)`,
        timestamp: Date.now(),
        title: `${name} Character Sheet`
      });

      setIsSaved(true);
      
      // Trigger global event to notify HireModelStudio to refresh list
      window.dispatchEvent(new CustomEvent('characterSaved'));

    } catch (e) {
      console.error(e);
      setError("Failed to save character.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-fade-in relative z-10 font-sans">
      
      {/* Lightbox / Zoom Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} alt="Full Scale" className="max-w-none h-auto max-h-full object-contain shadow-2xl" />
          <button className="absolute top-6 right-6 text-zinc-400 hover:text-white"><X size={32} /></button>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <UserPlus className="text-lime-500" /> Character Creator
        </h1>
        <p className="text-zinc-400">Generate comprehensive character reference packs with accurate identity and consistent outfits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Configuration */}
        <div className="lg:col-span-5 space-y-6">
           <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-4">Character Details</h3>
              
              {/* Name & Gender */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                 <div className="col-span-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Eldric" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-lime-500/50 focus:outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Gender</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2.5 text-sm text-zinc-300 focus:border-lime-500/50"
                    >
                       {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                 </div>
              </div>

              {/* References */}
              <div className="mb-4">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Identity References (Face/Body)</label>
                 <div className="grid grid-cols-4 gap-2 mb-2">
                    {refImages.map((img, i) => (
                       <div key={i} className="relative aspect-square rounded overflow-hidden border border-zinc-700 group/img">
                          <img src={img.preview} className="w-full h-full object-cover" />
                          <button onClick={() => removeRef(i)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 text-white rounded opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={10} /></button>
                       </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded border border-dashed border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center text-zinc-500 hover:text-lime-400 hover:border-lime-500/50 transition-colors"
                    >
                      <Upload size={16} />
                      <span className="text-[9px] mt-1">Add</span>
                    </button>
                 </div>
                 <input ref={fileInputRef} type="file" hidden multiple accept="image/*" onChange={handleRefUpload} />
                 <p className="text-[10px] text-zinc-500">Upload multiple angles for better accuracy (99% match).</p>
              </div>

              {/* Outfit Configuration */}
              <div className="mb-4 pt-4 border-t border-zinc-800">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2"><Shirt size={14}/> Outfit Selection</label>
                 
                 {/* 1. Upload Option */}
                 <div className="mb-3">
                    {outfitRef ? (
                        <div className="relative h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden flex items-center gap-4 p-3 group/outfit">
                           <img src={outfitRef.preview} className="h-full w-auto object-contain rounded" />
                           <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-medium truncate">{outfitRef.file.name}</p>
                              <p className="text-[10px] text-lime-400">Using Image Reference</p>
                           </div>
                           <button onClick={() => setOutfitRef(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                    ) : (
                        <button 
                           onClick={() => outfitInputRef.current?.click()}
                           className="w-full py-3 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-lime-400 hover:bg-zinc-900/50 hover:border-lime-500/50 transition-all"
                        >
                           <Upload size={14} /> Upload Outfit Reference Image
                        </button>
                    )}
                    <input ref={outfitInputRef} type="file" hidden accept="image/*" onChange={handleOutfitUpload} />
                 </div>

                 {/* 2. Text/Select Option (Disabled if Image Uploaded) */}
                 <div className={`space-y-2 transition-opacity ${outfitRef ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <select 
                      value={selectedOutfit} 
                      onChange={(e) => setSelectedOutfit(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:border-lime-500/50"
                    >
                        {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input 
                      type="text" 
                      value={customOutfit} 
                      onChange={(e) => setCustomOutfit(e.target.value)}
                      placeholder="Or describe custom outfit (e.g. Red silk kimono)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-lime-500/50 focus:outline-none placeholder-zinc-600"
                    />
                 </div>
              </div>

              {/* Background Color & Aspect Ratio */}
              <div>
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Palette size={14}/> Studio Background</label>
                 <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-4">
                    <input type="color" value={solidBgColor} onChange={(e) => setSolidBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                    <span className="text-xs font-mono text-zinc-400 uppercase">{solidBgColor}</span>
                 </div>

                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Ratio size={14}/> Aspect Ratio</label>
                 <div className="grid grid-cols-4 gap-2">
                    {ASPECT_RATIOS.map(ratio => (
                       <button
                         key={ratio.value}
                         onClick={() => setAspectRatio(ratio.value)}
                         className={`px-2 py-2 rounded text-[10px] font-bold border transition-all ${aspectRatio === ratio.value ? 'bg-zinc-800 text-lime-400 border-lime-500/50' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                       >
                         {ratio.label}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex flex-col gap-3">
                 {!isGenerating ? (
                   <button 
                     onClick={handleGeneratePack}
                     disabled={!name || refImages.length === 0}
                     className={`w-full py-4 rounded-lg font-bold text-sm tracking-wide uppercase shadow-lg flex items-center justify-center gap-2 ${!name || refImages.length === 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-lime-600 hover:bg-lime-500 text-black shadow-lime-900/20'}`}
                   >
                     <Zap size={18} /> Generate Character Pack ({BATCH_LIST.length} imgs)
                   </button>
                 ) : (
                   <button onClick={() => abortRef.current = true} className="w-full py-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 hover:bg-red-900/80">
                      <X size={18} /> Stop Generation
                   </button>
                 )}
                 
                 {isGenerating && (
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs text-zinc-400">
                          <span>Progress</span>
                          <span>{Math.round((progress / BATCH_LIST.length) * 100)}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-lime-500 transition-all duration-300" style={{ width: `${(progress / BATCH_LIST.length) * 100}%` }} />
                       </div>
                       <p className="text-[10px] text-lime-400 text-center animate-pulse">{status}</p>
                    </div>
                 )}
                 
                 {error && <div className="p-3 bg-red-900/20 border border-red-900/30 rounded text-red-400 text-xs text-center">{error}</div>}
              </div>
           </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-7">
           <div className="sticky top-6">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-white font-semibold flex items-center gap-2"><Package size={18} /> Generated Pack</h3>
                 <div className="flex gap-2">
                    <button 
                      onClick={handleSaveCharacter} 
                      disabled={generatedItems.length === 0 || isSaving}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${isSaved ? 'bg-lime-900/20 border-lime-500 text-lime-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                    >
                       {isSaving ? <Loader2 size={12} className="animate-spin" /> : isSaved ? <Check size={12} /> : <Save size={12} />}
                       {isSaved ? 'Saved to Model Studio' : 'Save Character'}
                    </button>
                    <button 
                      onClick={handleDownloadZip}
                      disabled={generatedItems.length === 0}
                      className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <Download size={14} /> Download ZIP
                    </button>
                 </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 min-h-[500px] backdrop-blur-sm">
                 {generatedItems.length > 0 ? (
                    <div className={`grid gap-3 animate-fade-in ${aspectRatio.includes('9:16') || aspectRatio === '2:3' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                       {generatedItems.map((item) => (
                          <div key={item.id} className="group relative bg-black rounded-lg overflow-hidden border border-zinc-800" style={{ aspectRatio: aspectRatio.replace(':','/') }}>
                             <img src={item.url} className="w-full h-full object-cover" />
                             
                             {/* Overlay Information */}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                                <span className="text-[10px] text-white font-medium">{item.label}</span>
                                <span className="text-[8px] text-zinc-400">{item.type}</span>
                             </div>

                             {/* Action Buttons (Visible on Hover, Clickable) */}
                             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setZoomImage(item.url); }}
                                  className="p-1.5 bg-black/60 text-white rounded-full hover:bg-lime-500 hover:text-black transition-colors"
                                  title="Zoom"
                                >
                                  <ZoomIn size={12} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleSingleDownload(item); }}
                                  className="p-1.5 bg-black/60 text-white rounded-full hover:bg-lime-500 hover:text-black transition-colors"
                                  title="Download"
                                >
                                  <Download size={12} />
                                </button>
                             </div>
                          </div>
                       ))}
                       
                       {/* Placeholders for pending generations */}
                       {Array.from({ length: Math.max(0, BATCH_LIST.length - generatedItems.length) }).map((_, i) => (
                          <div key={i} className="bg-zinc-900/50 rounded-lg border border-zinc-800/50 flex items-center justify-center" style={{ aspectRatio: aspectRatio.replace(':','/') }}>
                             <div className="w-2 h-2 rounded-full bg-zinc-800" />
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-20">
                       <UserPlus size={48} className="mb-4 opacity-20" />
                       <p className="text-sm">Ready to generate character sheet.</p>
                       <p className="text-xs opacity-60">Configure settings and click Generate.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CharacterStudio;