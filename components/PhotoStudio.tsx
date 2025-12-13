import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, Save, Check, ZoomIn, Clock, Loader2, Camera, User, Users, Shirt, Image as ImageIcon, ScanFace, Sliders, X, Wand2, Plus, Trash2, UserPlus, Calendar, Activity, LayoutTemplate, ToggleLeft, ToggleRight, Palette } from 'lucide-react';
import { generateCreativeImage, fileToBase64 } from '../services/geminiService';
import { saveAsset } from '../services/storageService';
import { checkDailyLimit, incrementUsage } from '../services/usageService';
import { translations } from '../utils/translations';

interface PhotoStudioProps {
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

interface PersonReference {
  id: string;
  label: string;
  images: { file: File; preview: string }[];
  overrideOutfit: boolean;
  outfitImage: { file: File; preview: string } | null;
}

// --- CONSTANTS & LIBRARIES ---

const SUBJECT_TYPES = [
  { id: 'single', labelKey: 'ps.type_single', icon: User, min: 1, max: 1 },
  { id: 'couple', labelKey: 'ps.type_couple', icon: Users, min: 2, max: 2 },
  { id: 'group', labelKey: 'ps.type_group', icon: Users, min: 3, max: 10 },
];

const OCCASIONS = [
  "Professional Headshot / LinkedIn", "Wedding Day / Bridal", "Red Carpet Gala", 
  "Casual Coffee Date", "Beach Vacation", "Gym / Fitness Session", 
  "Graduation Ceremony", "Birthday Party Celebration", "Business Conference", 
  "Cozy Christmas Morning", "Eid al-Fitr Celebration", "Diwali Festival of Lights", 
  "Halloween Costume Party", "Romantic Valentine's Dinner", "Outdoor Hiking / Adventure", 
  "Summer Music Festival", "Winter Ski Trip", "Urban Street Fashion Shoot", 
  "Vintage 1920s Gatsby Party", "Cyberpunk / Sci-Fi Concept", "Royal / Monarch Portrait",
  "Ted Talk Speaker", "Cooking Class", "Yoga Retreat", "Airport Travel Style"
];

// Split Poses by Type
const POSES_SINGLE = [
  "Standing Confidence (Arms Crossed)", "Standing Casual (Hand in Pocket)", "Leaning Against Wall", 
  "Walking Towards Camera", "Looking Over Shoulder", "Hands on Hips (Power Pose)", 
  "Adjusting Tie / Cufflinks", "Running Hand Through Hair", "Full Body Side Profile",
  "Sitting on Stool", "Sitting on Floor (Cross-legged)", "Sitting at Desk (Working)", 
  "Lounging on Sofa", "Sitting on Steps", "Kneeling One Leg",
  "Action Jump", "Selfie Style", "Thinking / Chin on Hand"
];

const POSES_COUPLE = [
  "Holding Hands Walking", "Back to Back", "Forehead to Forehead", "Piggyback Ride", 
  "Dancing (Waltz)", "Whispering Secret", "Embracing / Hugging", "Laughing at Each Other",
  "Sitting Together on Bench", "Arm in Arm (Formal)", "Leaning on Each Other",
  "Kissing on Cheek", "Looking at Sunset Together", "Playful Chasing"
];

const POSES_GROUP = [
  "V-Formation (Charlie's Angels)", "Group Huddle / Circle", "Jumping in Air", 
  "Formal Line-up (Height Order)", "Looking at Center Object", "Walking in Line (Abbey Road)", 
  "Toast / Cheers", "High Five", "Sitting on Couch Together", "Business Team Arms Crossed",
  "Pyramid Formation", "Lying in Circle (Heads Together)", "Candid Laughter"
];

const ASPECT_RATIOS = [
  { label: 'Automatic', value: 'Automatic' },
  { label: '3:4 (Portrait)', value: '3:4' },
  { label: '4:3 (Landscape)', value: '4:3' },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '16:9 (Cinematic)', value: '16:9' },
  { label: '9:16 (Story)', value: '9:16' },
];

const FRAMING_OPTIONS = [
  { id: 'closeup', label: 'Extreme Close-Up (Face)', desc: 'Focus on eyes and details' },
  { id: 'portrait', label: 'Headshot / Portrait', desc: 'Shoulders and up' },
  { id: 'waist', label: 'Medium Shot (Waist Up)', desc: 'Standard studio crop' },
  { id: 'knees', label: 'American Shot (Knees Up)', desc: 'Fashion standard' },
  { id: 'full', label: 'Full Body', desc: 'Head to toe' },
  { id: 'wide', label: 'Wide / Environmental', desc: 'Subject small in scene' },
];

const COLOR_LUTS = [
  { id: 'natural', label: 'Natural Studio', desc: 'True to life colors' },
  { id: 'bw_high_contrast', label: 'B&W Noir', desc: 'Dramatic black and white' },
  { id: 'warm_gold', label: 'Golden Hour', desc: 'Warm, sunny, inviting' },
  { id: 'cool_blue', label: 'Cinematic Blue', desc: 'Moody, cool tones' },
  { id: 'teal_orange', label: 'Teal & Orange', desc: 'Blockbuster movie look' },
  { id: 'pastel', label: 'Pastel Dream', desc: 'Soft, airy, desaturated' },
  { id: 'vivid', label: 'Vivid Pop', desc: 'High saturation, fashion' },
  { id: 'vintage_film', label: 'Vintage Film', desc: 'Kodak Portra style grain' },
  { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neon purples and cyans' },
  { id: 'matte', label: 'Matte Finish', desc: 'Low contrast, faded blacks' },
];

const OUTFIT_STYLES = [
  "Casual White T-Shirt & Jeans", "Black Turtleneck (Steve Jobs Style)", "Formal Business Suit (Navy)", 
  "Tuxedo / Evening Gown", "Oversized Streetwear Hoodie", "Leather Jacket & Denim", 
  "Summer Floral Dress", "Linen Shirt & Chinos", "Old Money Aesthetic (Beige/White)", 
  "Cyberpunk Techwear", "Vintage 90s Grunge", "Bohemian / Boho Chic", 
  "Minimalist Scandinavian", "Haute Couture Avant-Garde", "Athleisure / Gym Wear", 
  
  // Indonesian Traditional
  "Kebaya Jawa (Velvet & Batik)", "Kebaya Sunda (Modern Brocade)", "Kebaya Betawi (Encim)", 
  "Beskap Jawa (Men's Formal)", "Ulos Batak Traditional Attire", "Songket Palembang Attire",
  "Balinese Payas Agung", "Baju Bodo (Bugis)",

  // Global Traditional
  "Traditional Hanbok", "Traditional Kimono", "Traditional Batik", "Indian Saree / Sherwani", 
  "Safari / Explorer Gear", "Pilot / Aviator Jacket", "Doctor / Medical Coat", 
  "Chef Uniform", "Military Fatigue / Camo", "Sci-Fi Space Suit", 
  "Victorian / Steampunk", "Gothic Black Lace", "Preppy School Uniform", 
  "Hip Hop Bling", "Rockstar Leather & Studs", "Cozy Knitted Sweater", 
  "Silk Pajamas / Loungewear", "Beachwear / Swimsuit", "Winter Parka & Scarf", 
  "Trench Coat Detective", "Retro 70s Disco", "Cowboy / Western", 
  "Fairy / Ethereal Fantasy", "Gladiator / Armor", "Futuristic Minimalist Bodysuit"
];

const BACKGROUND_TEMPLATES = [
  "Solid Studio Grey", "Infinity White Cyclorama", "Pitch Black Void", "Textured Canvas (Brown)", 
  "Textured Canvas (Blue)", "Abstract Bokeh Lights", "Luxury Penthouse Interior", 
  "Minimalist Concrete Wall", "Brick Wall Loft", "Modern Office Glass", 
  "Library / Bookshelves", "Art Gallery", "Botanical Garden / Greenhouse", 
  "Tropical Beach Sunset", "Deep Forest", "Desert Dunes", 
  "Snowy Mountain Peak", "Urban Street City Lights", "Neon Tokyo Alleyway", 
  "Subway Station", "Rooftop at Night", "Cozy Coffee Shop", 
  "Luxury Hotel Lobby", "Marble Palace", "Futuristic Space Station", 
  "Mars Surface", "Underwater Blue", "Cloud Kingdom", 
  "Golden Wheat Field", "Flower Field", "Autumn Park", 
  "Rainy Window", "Old Vintage Room", "Cyberpunk Lab", 
  "Spotlight on Stage", "Fashion Runway", "Poolside Luxury", 
  "Private Jet Interior", "Yacht Deck", "Dreamy Pastel Sky"
];

const PhotoStudio: React.FC<PhotoStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // --- STATE ---
  
  // Subject Config
  const [subjectType, setSubjectType] = useState('single');
  const [people, setPeople] = useState<PersonReference[]>([
    { id: '1', label: 'Person 1', images: [], overrideOutfit: false, outfitImage: null }
  ]);
  const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[0]);
  
  // Style & Environment
  const [selectedOutfit, setSelectedOutfit] = useState<string>(OUTFIT_STYLES[0]);
  const [customOutfit, setCustomOutfit] = useState('');
  
  const [isSolidBg, setIsSolidBg] = useState(false);
  const [solidBgColor, setSolidBgColor] = useState('#ffffff');
  const [selectedBg, setSelectedBg] = useState<string>(BACKGROUND_TEMPLATES[0]); 
  const [customBg, setCustomBg] = useState('');

  // Dynamic Poses based on Subject Type
  const [availablePoses, setAvailablePoses] = useState<string[]>(POSES_SINGLE);
  const [selectedPose, setSelectedPose] = useState<string>(POSES_SINGLE[0]);
  const [customPose, setCustomPose] = useState('');
  
  // Camera Config
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [framing, setFraming] = useState('portrait');
  const [lut, setLut] = useState('natural');

  // Processing
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePersonIdRef = useRef<string | null>(null);

  // --- EFFECT: Handle Subject Type Switching ---
  useEffect(() => {
    const type = SUBJECT_TYPES.find(t => t.id === subjectType);
    if (!type) return;

    // 1. Update People Array
    setPeople(prev => {
       const targetCount = type.min; 
       if (prev.length === targetCount) return prev;
       
       if (prev.length < targetCount) {
         // Add needed
         const needed = targetCount - prev.length;
         const newPeople = [...prev];
         for(let i=0; i<needed; i++) {
           newPeople.push({ 
             id: crypto.randomUUID(), 
             label: `Person ${newPeople.length + 1}`, 
             images: [],
             overrideOutfit: false,
             outfitImage: null
           });
         }
         return newPeople;
       } else {
         // Remove excess (if strict max is set like couple=2)
         if (prev.length > type.max) {
           return prev.slice(0, type.max);
         }
         // If switching from Group (3+) to Single (1), slice
         if (targetCount === 1 && prev.length > 1) {
            return prev.slice(0, 1).map(p => ({ ...p, label: 'Person 1' }));
         }
         return prev; 
       }
    });

    // 2. Update Available Poses
    let newPoses = POSES_SINGLE;
    if (subjectType === 'couple') newPoses = POSES_COUPLE;
    if (subjectType === 'group') newPoses = POSES_GROUP;
    
    setAvailablePoses(newPoses);
    // Reset selection to first available if current is not in new list
    if (!newPoses.includes(selectedPose)) {
        setSelectedPose(newPoses[0]);
    }

  }, [subjectType]);

  // --- HANDLERS ---

  const triggerUpload = (personId: string) => {
    activePersonIdRef.current = personId;
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset
        fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pid = activePersonIdRef.current;
    if (!pid || !e.target.files) return;

    const files = Array.from(e.target.files) as File[];
    const newImages = files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f)
    }));

    setPeople(prev => prev.map(p => {
      if (p.id === pid) {
        // Append new images, maybe limit to 5 per person to prevent token overflow
        const combined = [...p.images, ...newImages];
        return { ...p, images: combined.slice(0, 5) }; 
      }
      return p;
    }));
  };

  const removeImage = (personId: string, index: number) => {
    setPeople(prev => prev.map(p => {
      if (p.id === personId) {
        const newImages = [...p.images];
        newImages.splice(index, 1);
        return { ...p, images: newImages };
      }
      return p;
    }));
  };

  const addPerson = () => {
    if (people.length >= 10) return;
    setPeople(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: `Person ${prev.length + 1}`, images: [], overrideOutfit: false, outfitImage: null }
    ]);
  };

  const removePerson = (id: string) => {
    const type = SUBJECT_TYPES.find(t => t.id === subjectType);
    if (!type || people.length <= type.min) return; // Enforce minimums

    setPeople(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return filtered.map((p, i) => ({ ...p, label: `Person ${i + 1}` }));
    });
  };

  // --- OUTFIT OVERRIDE HANDLERS ---

  const toggleOutfitOverride = (personId: string) => {
    setPeople(prev => prev.map(p => {
      if (p.id === personId) {
        return { ...p, overrideOutfit: !p.overrideOutfit };
      }
      return p;
    }));
  };

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>, personId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setPeople(prev => prev.map(p => {
        if (p.id === personId) {
          return { ...p, outfitImage: { file, preview } };
        }
        return p;
      }));
    }
  };

  const removeOutfitImage = (personId: string) => {
    setPeople(prev => prev.map(p => {
      if (p.id === personId) {
        return { ...p, outfitImage: null };
      }
      return p;
    }));
  };

  // --- GENERATION LOGIC ---

  const handleGenerate = async () => {
    if (!apiKey) { setError(t('prod.error_api')); return; }
    
    // Validation
    const missingImages = people.some(p => p.images.length === 0);
    if (missingImages) { setError("Please upload at least one image for every person listed."); return; }
    
    // Validate outfit uploads if enabled
    const missingOutfits = people.some(p => p.overrideOutfit && !p.outfitImage);
    if (missingOutfits) { setError("Please upload an outfit reference image for people with Outfit Override enabled."); return; }

    if (!checkDailyLimit()) { setError(t('prod.error_limit')); return; }

    setIsGenerating(true);
    setError(null);
    setIsSaved(false);
    setGenerationStatus(t('ps.status_analyzing'));

    try {
      // 1. Prepare Images
      let allBase64s: string[] = [];
      let personIndexMap: { 
        label: string, 
        faceStartIndex: number, 
        faceCount: number,
        outfitIndex?: number
      }[] = [];

      let currentIndex = 0;
      for (const person of people) {
        const base64s = await Promise.all(person.images.map(img => fileToBase64(img.file)));
        
        const faceStartIndex = currentIndex + 1; // 1-based index for prompt
        const faceCount = base64s.length;
        
        allBase64s = [...allBase64s, ...base64s];
        currentIndex += base64s.length;

        let outfitIndex: number | undefined = undefined;
        // Handle Outfit Image
        if (person.overrideOutfit && person.outfitImage) {
           const outfitBase64 = await fileToBase64(person.outfitImage.file);
           allBase64s.push(outfitBase64);
           currentIndex += 1;
           outfitIndex = currentIndex;
        }

        personIndexMap.push({
          label: person.label,
          faceStartIndex,
          faceCount,
          outfitIndex
        });
      }

      // 2. Construct Prompt
      const outfitPrompt = customOutfit.trim() || selectedOutfit;
      
      const bgPrompt = isSolidBg
        ? `Solid Studio Background. Color Hex: ${solidBgColor}. Clean, seamless, professional studio backdrop.`
        : (customBg.trim() || selectedBg);

      const posePrompt = customPose.trim() || selectedPose;
      const frameObj = FRAMING_OPTIONS.find(f => f.id === framing);
      const lutObj = COLOR_LUTS.find(l => l.id === lut);

      // Construct character mapping string
      const characterMapping = personIndexMap.map(p => {
        let desc = '';
        if (p.faceCount === 1) {
           desc += `${p.label} is Reference Image ${p.faceStartIndex}.`;
        } else {
           desc += `${p.label} is defined by Reference Images ${p.faceStartIndex} to ${p.faceStartIndex + p.faceCount - 1}.`;
        }

        if (p.outfitIndex) {
           desc += `\n   - OUTFIT OVERRIDE: ${p.label} MUST wear the outfit shown in Reference Image ${p.outfitIndex}. Copy the clothing style, texture, and fit from this image exactly. Do NOT apply the Default Wardrobe setting to this person.`;
        } else {
           desc += `\n   - WARDROBE: ${p.label} should wear the 'Default Wardrobe' style defined below.`;
        }

        return desc;
      }).join('\n');

      const generalOutfitInstruction = `DEFAULT WARDROBE: ${outfitPrompt}. This style applies ONLY to persons marked as using the 'Default Wardrobe' above. It must NOT influence persons with explicit Outfit Overrides. Match the vibe of the occasion.`;

      const prompt = `
        Professional Studio Photography Session.
        
        SUBJECT CONFIGURATION:
        Type: ${subjectType === 'single' ? 'Single Portrait' : subjectType === 'couple' ? 'Couple Photoshoot' : 'Group Photo'}.
        Occasion: ${selectedOccasion}.
        
        CHARACTER REFERENCES & OUTFITS:
        ${characterMapping}
        
        CRITICAL IDENTITY INSTRUCTION:
        You are an advanced AI photographer specialized in Face ID preservation.
        The generated faces MUST be 99% identical to the provided reference images.
        - STRICTLY COPY facial structure, eye shape, nose bridge, mouth, and skin texture.
        - Maintain the exact likeness. If the reference is Asian, the output must be Asian. If Caucasian, Caucasian.
        - Sub-surface scattering on skin must be realistic. No plastic skin.
        - Maintain the body size/weight of the person as inferred from reference images.

        INSTRUCTION:
        Generate a photorealistic image featuring exactly ${people.length} person(s).
        For each person, use their corresponding Reference Images to strictly determine their facial features, hair, and likeness.
        Blend the features from the multiple reference images to create a perfect, consistent look for that person.
        
        POSE & ACTION:
        ${posePrompt}. 
        Ensure the pose is natural for the occasion (${selectedOccasion}).
        
        STYLING:
        ${generalOutfitInstruction}
        Environment: ${bgPrompt}.
        
        CAMERA SETTINGS:
        - Shot Type: ${frameObj?.label} (${frameObj?.desc}).
        - Color Grading: ${lutObj?.label} (${lutObj?.desc}).
        - Lighting: Professional studio lighting optimized for ${selectedOccasion}.
        
        REALISM & PHYSICS:
        - Lighting must match the environment perfectly (reflections in eyes, shadows on floor/wall).
        - Fabric textures (cotton, silk, denim) must be distinguishable and high resolution.
        - Shadows must fall correctly based on the light source.
        - Depth of field should be appropriate for the Shot Type (e.g., blurred background for Portrait).
        - Quality: 8k resolution, award-winning photography, sharp focus, highly detailed skin texture.
      `;

      setGenerationStatus(t('ps.status_rendering'));
      
      const result = await generateCreativeImage(
        prompt, 
        apiKey, 
        allBase64s, 
        { aspectRatio: aspectRatio !== 'Automatic' ? aspectRatio : undefined }
      );

      setGeneratedImage(result);
      incrementUsage();
      if (onUsageUpdate) onUsageUpdate();

      setHistory(prev => [{
        id: crypto.randomUUID(),
        image: result,
        prompt: prompt,
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
        prompt: `Studio: ${subjectType} - ${selectedOccasion}`,
        timestamp: Date.now(),
        title: 'Studio Portrait'
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gelap5-PhotoStudio_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-fade-in relative z-10 font-sans">
      
      {/* Hidden File Input for Dynamic Triggers */}
      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        accept="image/*" 
        multiple
        onChange={handleFileUpload} 
      />

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
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Camera className="text-lime-500" /> Photo Studio Pro
        </h1>
        <p className="text-zinc-400">{t('ps.step1_title')} - Professional AI photography with multi-character consistency.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Step 1: Subject & Reference */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">1</span>
               {t('ps.step1_title')}
             </h3>
             
             {/* Subject Type Mode */}
             <div className="grid grid-cols-3 gap-3 mb-6">
               {SUBJECT_TYPES.map(type => (
                 <button
                   key={type.id}
                   onClick={() => setSubjectType(type.id)}
                   className={`
                     flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                     ${subjectType === type.id 
                       ? 'bg-zinc-800 border-lime-500 text-white shadow-lg shadow-lime-900/10' 
                       : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}
                   `}
                 >
                   <type.icon size={20} className={subjectType === type.id ? 'text-lime-400 mb-2' : 'mb-2'} />
                   <span className="text-xs font-medium">{t(type.labelKey)}</span>
                 </button>
               ))}
             </div>

             {/* Dynamic People Uploaders */}
             <div className="space-y-4">
               {people.map((person, index) => (
                 <div key={person.id} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                       <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                         <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">{index + 1}</span>
                         {person.label.replace('Person', t('ps.person_label'))}
                       </h4>
                       {/* Only show remove if above min for current mode */}
                       {(subjectType === 'group' && people.length > 3) && (
                         <button onClick={() => removePerson(person.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                           <Trash2 size={14} />
                         </button>
                       )}
                    </div>

                    {/* Face Reference Images */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-4">
                       {/* Existing Images */}
                       {person.images.map((img, imgIdx) => (
                         <div key={imgIdx} className="relative aspect-square rounded overflow-hidden border border-zinc-700 group/img">
                            <img src={img.preview} alt="Ref" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => removeImage(person.id, imgIdx)}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 text-white rounded opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                         </div>
                       ))}
                       
                       {/* Add Button */}
                       <button 
                         onClick={() => triggerUpload(person.id)}
                         className="aspect-square rounded border border-dashed border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center text-zinc-500 hover:text-lime-400 hover:border-lime-500/50 transition-colors"
                       >
                         <Plus size={16} />
                         <span className="text-[8px] mt-1 font-medium">{t('ps.add_face')}</span>
                       </button>
                    </div>
                    
                    {/* Outfit Override Toggle */}
                    <div className="pt-3 border-t border-zinc-800/50">
                       <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                             <Shirt size={14} className="text-zinc-400" />
                             <span className="text-xs font-medium text-zinc-300">{t('ps.override_outfit')}</span>
                          </div>
                          <button onClick={() => toggleOutfitOverride(person.id)} className="text-zinc-400 hover:text-white transition-colors">
                             {person.overrideOutfit ? <ToggleRight size={24} className="text-lime-500" /> : <ToggleLeft size={24} />}
                          </button>
                       </div>
                       
                       {/* Outfit Upload */}
                       {person.overrideOutfit && (
                          <div className="mt-2 animate-fade-in">
                             {person.outfitImage ? (
                                <div className="relative h-20 w-full rounded border border-zinc-700 bg-zinc-900 overflow-hidden group/outfit">
                                   <div className="absolute inset-0 flex items-center justify-center">
                                      <img src={person.outfitImage.preview} alt="Outfit Ref" className="h-full w-auto object-contain" />
                                   </div>
                                   <button 
                                      onClick={() => removeOutfitImage(person.id)}
                                      className="absolute top-1 right-1 p-1 bg-red-500/80 rounded text-white opacity-0 group-hover/outfit:opacity-100 transition-opacity"
                                   >
                                      <X size={12} />
                                   </button>
                                   <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-zinc-300">
                                      {t('ps.ref_outfit')}
                                   </div>
                                </div>
                             ) : (
                                <div className="relative border border-dashed border-zinc-700 rounded-lg h-20 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                   <label htmlFor={`outfit-upload-${person.id}`} className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                                      <Upload size={14} className="text-zinc-500 mb-1" />
                                      <span className="text-[10px] text-zinc-400">{t('ps.upload_outfit')}</span>
                                   </label>
                                   <input 
                                      id={`outfit-upload-${person.id}`}
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleOutfitUpload(e, person.id)}
                                   />
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 </div>
               ))}

               {/* Add Person Button for Group Mode */}
               {subjectType === 'group' && people.length < 10 && (
                 <button 
                   onClick={addPerson}
                   className="w-full py-2 border border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 text-xs font-medium flex items-center justify-center gap-2 transition-all"
                 >
                   <UserPlus size={14} /> {t('ps.add_person')}
                 </button>
               )}
             </div>

             {/* Occasion Selection */}
             <div className="mt-6">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Calendar size={14}/> {t('ps.occasion_label')}</label>
                <div className="h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-950 p-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                   {OCCASIONS.map(occ => (
                     <button
                       key={occ}
                       onClick={() => setSelectedOccasion(occ)}
                       className={`
                         text-left px-3 py-2 rounded text-[10px] transition-all border
                         ${selectedOccasion === occ 
                           ? 'bg-lime-900/20 border-lime-500/50 text-lime-200' 
                           : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}
                       `}
                     >
                       {occ}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          {/* Step 2: Style & Environment */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <h3 className="text-white font-semibold flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">2</span>
               {t('ps.step2_title')}
             </h3>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Poses (New Feature) */}
                 <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Activity size={14}/> {t('ps.pose_label')}</label>
                       <span className="text-[10px] text-zinc-600">{availablePoses.length} {t('ps.pose_options')}</span>
                    </div>
                    
                    <div className="h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-950 p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-2">
                       {availablePoses.map(pose => (
                         <button
                           key={pose}
                           onClick={() => setSelectedPose(pose)}
                           className={`
                             text-left px-3 py-2 rounded text-[10px] transition-all border
                             ${selectedPose === pose && !customPose
                               ? 'bg-purple-900/20 border-purple-500/50 text-purple-200' 
                               : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}
                           `}
                         >
                           {pose}
                         </button>
                       ))}
                    </div>
                    <input 
                      type="text" 
                      value={customPose} 
                      onChange={(e) => setCustomPose(e.target.value)}
                      placeholder={t('ps.custom_pose_placeholder')}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                    />
                 </div>

                 {/* Outfits (Global) */}
                 <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Shirt size={14}/> {t('ps.wardrobe_label')}</label>
                    <p className="text-[9px] text-zinc-600 mb-2">{t('ps.wardrobe_hint')}</p>
                    
                    <div className="h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-950 p-2 grid grid-cols-1 gap-2 mb-2">
                       {OUTFIT_STYLES.map(style => (
                         <button
                           key={style}
                           onClick={() => setSelectedOutfit(style)}
                           className={`
                             text-left px-3 py-2 rounded text-[10px] transition-all border
                             ${selectedOutfit === style && !customOutfit
                               ? 'bg-lime-900/20 border-lime-500/50 text-lime-200' 
                               : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}
                           `}
                         >
                           {style}
                         </button>
                       ))}
                    </div>
                    <input 
                      type="text" 
                      value={customOutfit} 
                      onChange={(e) => setCustomOutfit(e.target.value)}
                      placeholder={t('ps.custom_outfit_placeholder')} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-lime-500/50 focus:outline-none"
                    />
                 </div>

                 {/* Backgrounds */}
                 <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><ImageIcon size={14}/> {t('ps.environment_label')}</label>
                       
                       {/* Solid Background Toggle */}
                       <button 
                          onClick={() => setIsSolidBg(!isSolidBg)} 
                          className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${isSolidBg ? 'bg-blue-500' : 'bg-zinc-700'}`}
                          title={t('ps.solid_bg_toggle')}
                       >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${isSolidBg ? 'left-5' : 'left-1'}`} />
                       </button>
                    </div>
                    <p className="text-[9px] text-zinc-600 mb-2">{isSolidBg ? t('ps.select_color') : "Select environment"}</p>
                    
                    {isSolidBg ? (
                       <div className="h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center animate-fade-in">
                          <div className="flex items-center gap-4 w-full">
                             {/* Color Swatch / Picker */}
                             <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-lg cursor-pointer group">
                                <input 
                                  type="color" 
                                  value={solidBgColor}
                                  onChange={(e) => setSolidBgColor(e.target.value)}
                                  className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 border-0 opacity-0 cursor-pointer"
                                />
                                <div className="w-full h-full" style={{ backgroundColor: solidBgColor }} />
                                <Palette size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 pointer-events-none mix-blend-difference" />
                             </div>
                             
                             <div className="flex-1">
                                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Hex Code</label>
                                <div className="relative">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono select-none">#</span>
                                   <input 
                                     type="text" 
                                     value={solidBgColor.replace('#', '')}
                                     onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0,6);
                                        setSolidBgColor(`#${val}`);
                                     }}
                                     className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-6 pr-3 text-sm text-zinc-200 font-mono focus:ring-1 focus:ring-blue-500 uppercase focus:outline-none"
                                     maxLength={6}
                                   />
                                </div>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="animate-fade-in">
                          <div className="h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-950 p-2 grid grid-cols-1 gap-2 mb-2">
                             {BACKGROUND_TEMPLATES.map(bg => (
                               <button
                                 key={bg}
                                 onClick={() => setSelectedBg(bg)}
                                 className={`
                                   text-left px-3 py-2 rounded text-[10px] transition-all border
                                   ${selectedBg === bg && !customBg
                                     ? 'bg-blue-900/20 border-blue-500/50 text-blue-200' 
                                     : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}
                                 `}
                               >
                                 {bg}
                               </button>
                             ))}
                          </div>
                          <input 
                            type="text" 
                            value={customBg} 
                            onChange={(e) => setCustomBg(e.target.value)}
                            placeholder={t('ps.custom_bg_placeholder')}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 focus:outline-none"
                          />
                       </div>
                    )}
                 </div>
             </div>
          </div>

          {/* Step 3: Camera Controls */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">3</span>
               {t('ps.step3_title')}
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Framing */}
                <div>
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><ScanFace size={12}/> {t('ps.framing_label')}</label>
                   <div className="space-y-1">
                      {FRAMING_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setFraming(opt.id)}
                          className={`
                            w-full text-left px-3 py-2 rounded border text-[10px] transition-all flex justify-between items-center
                            ${framing === opt.id 
                              ? 'bg-zinc-800 border-zinc-600 text-white' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                          `}
                        >
                          <span>{opt.label}</span>
                          {framing === opt.id && <Check size={10} className="text-lime-500" />}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><LayoutTemplate size={12}/> {t('ps.aspect_label')}</label>
                   <div className="grid grid-cols-2 gap-1.5">
                      {ASPECT_RATIOS.map(ar => (
                        <button
                          key={ar.value}
                          onClick={() => setAspectRatio(ar.value)}
                          className={`
                            px-2 py-2 rounded border text-[10px] font-medium transition-all
                            ${aspectRatio === ar.value 
                              ? 'bg-zinc-800 border-zinc-600 text-white' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                          `}
                        >
                          {ar.label.split(' ')[0]}
                        </button>
                      ))}
                   </div>
                </div>

                {/* LUTs */}
                <div>
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Sliders size={12}/> {t('ps.lut_label')}</label>
                   <div className="h-48 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                      {COLOR_LUTS.map(l => (
                        <button
                          key={l.id}
                          onClick={() => setLut(l.id)}
                          className={`
                            w-full text-left px-3 py-2 rounded border text-[10px] transition-all
                            ${lut === l.id 
                              ? 'bg-zinc-800 border-lime-500/50 text-white shadow-inner' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                          `}
                        >
                          <div className="font-semibold">{l.label}</div>
                          <div className="text-[9px] opacity-60">{l.desc}</div>
                        </button>
                      ))}
                   </div>
                </div>

             </div>
          </div>

          {/* Action */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <button 
               onClick={handleGenerate}
               disabled={isGenerating || people.some(p => p.images.length === 0)}
               className={`
                 w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex items-center justify-center gap-2
                 ${isGenerating || people.some(p => p.images.length === 0)
                   ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                   : 'bg-lime-600 hover:bg-lime-500 text-black shadow-lime-900/20'}
               `}
             >
               {isGenerating ? (
                 <>
                   <Loader2 size={18} className="animate-spin" />
                   {generationStatus}
                 </>
               ) : (
                 <>
                   <Camera size={18} />
                   {t('ps.btn_start')}
                 </>
               )}
             </button>
             
             {error && (
               <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded text-red-400 text-xs text-center flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                 {error}
               </div>
             )}
          </div>

        </div>

        {/* RIGHT PANEL (Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 relative">
           <div className="sticky top-6 flex flex-col gap-6">
              
              {/* Output Preview */}
              <div>
                <h3 className="text-white font-semibold mb-4 text-center">{t('ps.output_title')}</h3>
                <div className="relative w-full aspect-[3/4] bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[400px]">
                    {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Result" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                            <div className="flex gap-4">
                              <button onClick={() => setIsZoomOpen(true)} className="p-3 bg-white text-black hover:bg-lime-400 rounded-full shadow-lg"><ZoomIn size={24} /></button>
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
                           <Camera size={24} />
                        </div>
                        <p className="text-sm">{t('ps.output_default')}</p>
                        {isGenerating && (
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
                        <img src={item.image} alt="History" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => { setGeneratedImage(item.image); }} />
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

export default PhotoStudio;