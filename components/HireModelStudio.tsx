import React, { useState, useEffect, useRef } from 'react';
import { Users, Upload, Download, RefreshCw, Save, Check, ZoomIn, Clock, Loader2, Wand2, X, Plus, Search, Tag, Shirt, PawPrint, User, Briefcase, Camera, ScanFace, ImagePlus, Palette, Layout, Move, Box, MapPin, Layers, Sparkles, Trash2, ToggleLeft, ToggleRight, Ratio, Settings, PenLine, AlertTriangle, Utensils, Eye } from 'lucide-react';
import { generateCreativeImage, fileToBase64, blobToBase64 } from '../services/geminiService';
import { saveAsset, getCustomCharacters, saveCustomCharacter, deleteCustomCharacter, CustomCharacter } from '../services/storageService';
import { checkDailyLimit, incrementUsage } from '../services/usageService';
import { translations } from '../utils/translations';

interface HireModelStudioProps {
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

// --- CONSTANTS ---

const CAMPAIGN_CONTEXTS = [
  "Clothing Line", 
  "F&B Product", 
  "Skincare & Beauty", 
  "Outdoor & Adventure", 
  "Digital Product / App", 
  "Consumer Electronics"
];

const DISABLED_CONTEXTS = [
  "Skincare & Beauty", 
  "Outdoor & Adventure", 
  "Digital Product / App", 
  "Consumer Electronics"
];

const CLOTHING_TYPES = [
  "T-Shirt / Tee", "Hoodie / Sweatshirt", "Denim Jeans", "Summer Dress", "Evening Gown",
  "Business Suit", "Blazer", "Leather Jacket", "Winter Coat", "Activewear / Gym Set",
  "Swimwear / Bikini", "Lingerie / Intimates", "Skirt (Mini)", "Skirt (Midi/Maxi)", 
  "Button-down Shirt", "Sweater / Knitwear", "Shorts", "Cargo Pants", "Streetwear Oversized Fit",
  "Pyjamas / Loungewear", "Scarf / Shawl", "Beanie / Hat", "Socks / Hosiery", "Footwear / Sneakers",
  "Hijab / Headscarf"
];

const INTERACTION_TYPES = [
  "Wearing (Standard Fit)", 
  "Wearing (Oversized / Loose)", 
  "Wearing (Tight / Fitted)",
  "Holding product in hands", 
  "Holding against body", 
  "Draped over shoulder", 
  "Biting (Playful / Edgy)", 
  "Touching / Adjusting fabric", 
  "Pulling collar / Hood",
  "Hands in pockets showing product", 
  "Walking motion while wearing", 
  "Sitting / Relaxed pose wearing",
  "Laying down wearing product", 
  "Product next to face (Close up)",
  "Partially wearing (e.g. jacket off shoulder)"
];

const FOOD_DRINK_INTERACTIONS = [
  "Holding product near face (Smiling)",
  "Taking a big bite (Action shot)",
  "Sipping drink through straw",
  "Drinking directly from glass/cup",
  "Cheers / Toasting gesture",
  "Smelling the aroma (Eyes closed)",
  "Licking lips (Hungry/Anticipation)",
  "Holding tray with product",
  "Offering product to camera (POV)",
  "Squeezing lime/sauce onto product",
  "Dipping food into sauce",
  "Holding spoon/fork ready to eat",
  "Blowing on hot food/drink",
  "Catching dripping sauce/cheese",
  "Examining texture closely",
  "Biting lip while looking at food",
  "Holding with two hands (Cozy)",
  "One hand holding, one hand pointing",
  "Sitting at table with product plated",
  "Walking while eating/drinking",
  "Clinking glasses (Celebration)",
  "Pouring drink into glass",
  "Sprinkling seasoning/toppings",
  "Posing with product on shoulder (Playful)"
];

// INSTRUCTIONS FOR ADDING MODEL THUMBNAILS:
// 1. Add your image file to 'public/model_thumbnail/'
// 2. Name it exactly: [folder_name]_thumbnail.jpg
// 3. Example: if folder is 'jono', file must be 'jono_thumbnail.jpg'
const PREDEFINED_MODELS = [
  { id: 'm7', name: 'Jono (Local)', folder: 'jono', desc: 'Edgy, Tattooed, Confident', fallback: 'https://images.unsplash.com/photo-1596727147705-01a298de8ead?q=80&w=600&auto=format&fit=crop' }
];

const BODY_TYPES = [
  "Skinny", "Slim", "Athletic", "Muscular", "Average", "Curvy", "Plus Size", "Heavyset"
];

const ETHNICITIES = [
  "Asian (East)", "Asian (South)", "Caucasian", "Black / African", "Hispanic / Latino", "Middle Eastern", "Mixed Race", "Pacific Islander"
];

const ANIMAL_TYPES = [
  "Dog", "Cat", "Rabbit", "Hamster", "Parrot", "Horse"
];

const OUTFIT_STYLES = [
  "Casual T-Shirt & Jeans", "Business Suit (Navy)", "Summer Floral Dress", "Leather Jacket & Boots", 
  "Yoga / Activewear", "Cocktail Evening Gown", "Winter Coat & Scarf", "Streetwear Hoodie",
  "Medical Scrubs", "Chef Uniform", "Bohemian Chic", "Minimalist Beige", 
  "Cyberpunk Techwear", "Vintage 90s Grunge", "Preppy Sweater", "Swimwear / Beach",
  "Pajamas / Loungewear", "Tuxedo", "Traditional Hanbok", "Safari Gear",
  "Construction Vest", "Lab Coat", "Denim on Denim", "Silk Blouse",
  "Turtleneck (Black)", "Oversized Sweater", "Gym Tank Top", "Floral Shirt",
  "Trench Coat", "Varsity Jacket", "Pilot Uniform", "Military Fatigue",
  "Space Suit", "Fantasy Armor", "Gothic Lace", "Hip Hop Style",
  "Country Western", "Rockstar Leather", "Smart Casual Blazer", "Avant-Garde High Fashion"
];

const BACKGROUND_OPTIONS = [
  "Modern Minimalist Studio", "Luxury Penthouse Interior", "Urban Street City Lights", "Tropical Beach", 
  "Botanical Garden", "Abstract Bokeh", "Concrete Wall", "Brick Loft", 
  "Neon Cyberpunk Alley", "Cozy Coffee Shop", "Office Glass Interior", "Library Bookshelves",
  "Art Gallery White", "Rooftop Sunset", "Deep Forest", "Desert Dunes",
  "Snowy Mountain", "Poolside Luxury", "Gym Interior", "Kitchen Counter",
  "Bedroom Morning Light", "Bathroom Spa", "Fashion Runway", "Red Carpet Event",
  "Subway Station", "Private Jet Interior", "Yacht Deck", "Old Vintage Room",
  "Golden Wheat Field", "Flower Field", "Autumn Park", "Rainy Window",
  "Textured Canvas (Beige)", "Textured Canvas (Grey)", "Cloud Kingdom", "Underwater Blue",
  "Mars Surface", "Futuristic Lab", "Spotlight Stage", "Marble Hall"
];

const POSE_OPTIONS = [
  "Standing Confidence (Arms Crossed)", "Standing Casual (Hand in Pocket)", "Leaning Against Wall", 
  "Walking Towards Camera", "Looking Over Shoulder", "Hands on Hips (Power Pose)", 
  "Adjusting Tie / Cufflinks", "Running Hand Through Hair", "Full Body Side Profile",
  "Sitting on Stool", "Sitting on Floor (Cross-legged)", "Sitting at Desk (Working)", 
  "Lounging on Sofa", "Sitting on Steps", "Kneeling One Leg",
  "Action Jump", "Selfie Style", "Thinking / Chin on Hand",
  "Holding Product (Two Hands)", "Holding Product (One Hand Extended)", "Presenting Product (Palm Open)",
  "Pointing at Product", "Examining Product Closely", "Interacting with Product",
  "Back to Camera", "Profile View Looking Up", "Profile View Looking Down",
  "Twirling / Dancing", "Stretching (Yoga)", "Fashion Strut",
  "Hero Pose (Low Angle)", "Silhouette", "Laughing Candid", "Serious Intense Stare",
  "Shushing Finger", "Waving Hello", "Hands Clenched", "Touching Face",
  "Legs Crossed Standing", "Wide Stance"
];

const SHOT_FRAMING = [
  "Extreme Close-Up", "Close-Up", "Medium Close-Up",
  "Medium Shot", "American Shot", "Full Body",
  "Wide Shot"
];

const CAMERA_ANGLES = [
  "Eye Level", "Low Angle (Heroic)", "High Angle", "Overhead", "Dutch Angle", "Side Profile"
];

// Mapping friendly names to explicit prompt instructions
const FRAMING_PROMPTS: Record<string, string> = {
  "Extreme Close-Up": "CAMERA FRAMING: EXTREME CLOSE-UP. Focus tightly on the face/eyes or product details. Blur background significantly.",
  "Close-Up": "CAMERA FRAMING: CLOSE-UP. Head and shoulders composition. Focus on expression and connection.",
  "Medium Close-Up": "CAMERA FRAMING: MEDIUM CLOSE-UP. Frame from the chest up. Standard portrait.",
  "Medium Shot": "CAMERA FRAMING: MEDIUM SHOT. Frame from the waist up. Commercial standard.",
  "American Shot": "CAMERA FRAMING: AMERICAN SHOT. Frame from the knees up (3/4 shot). Fashion standard.",
  "Full Body": "CAMERA FRAMING: FULL BODY SHOT. Include the entire subject from head to toe. Ensure feet are visible and grounded.",
  "Wide Shot": "CAMERA FRAMING: WIDE SHOT. Show the subject small within the environment. Emphasize the background and atmosphere."
};

const ANGLE_PROMPTS: Record<string, string> = {
  "Eye Level": "CAMERA ANGLE: EYE LEVEL. Neutral perspective, parallel to the ground.",
  "Low Angle (Heroic)": "CAMERA ANGLE: LOW ANGLE (Worm's-eye view). Camera placed low on the ground looking UP at the subject. The subject appears dominant, tall, and heroic. Background shows ceiling or sky.",
  "High Angle": "CAMERA ANGLE: HIGH ANGLE. Camera placed high looking DOWN at the subject. The subject appears smaller or approachable. Background shows floor/ground.",
  "Overhead": "CAMERA ANGLE: DIRECT OVERHEAD (Bird's Eye). Looking straight down from above.",
  "Dutch Angle": "CAMERA ANGLE: DUTCH ANGLE/TILT. Camera axis tilted for dynamic energy.",
  "Side Profile": "CAMERA ANGLE: SIDE PROFILE. 90-degree side view of the subject."
};

const ASPECT_RATIOS = [
  { label: 'Portrait (3:4)', value: '3:4' },
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Landscape (4:3)', value: '4:3' },
  { label: 'Story (9:16)', value: '9:16' },
  { label: 'Cinematic (16:9)', value: '16:9' },
];

const HireModelStudio: React.FC<HireModelStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // State
  const [context, setContext] = useState(CAMPAIGN_CONTEXTS[0]);
  const [productRef, setProductRef] = useState<{ file: File; preview: string } | null>(null);
  
  // Clothing Line Specific State
  const [clothingType, setClothingType] = useState(CLOTHING_TYPES[0]);
  const [customClothingType, setCustomClothingType] = useState(''); // Manual Override
  const [interactionType, setInteractionType] = useState(''); // Unselected by default
  const [customInteraction, setCustomInteraction] = useState(''); // Manual interaction input

  // F&B Specific State
  const [foodItem, setFoodItem] = useState('');
  const [foodInteraction, setFoodInteraction] = useState(''); // Unselected by default

  const [mode, setMode] = useState<'human' | 'animal'>('human');
  
  // Selection Mode (Human)
  const [isCustomModel, setIsCustomModel] = useState(false);
  // Default to the first available or empty if none
  const [selectedPredefinedModel, setSelectedPredefinedModel] = useState<string>(PREDEFINED_MODELS[0]?.id || '');
  const [customCharacters, setCustomCharacters] = useState<CustomCharacter[]>([]);
  const [uploadName, setUploadName] = useState(''); // New input state
  
  // Editing Modal State
  const [editingModel, setEditingModel] = useState<CustomCharacter | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // Image Loading State (Boolean flags for robustness)
  const [failedLocal, setFailedLocal] = useState<Record<string, boolean>>({});
  const [failedFallback, setFailedFallback] = useState<Record<string, boolean>>({});

  // Custom Human Config
  const [ethnicity, setEthnicity] = useState(ETHNICITIES[0]);
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState('25');
  const [bodyType, setBodyType] = useState(BODY_TYPES[2]);
  const [height, setHeight] = useState('170cm');
  const [weight, setWeight] = useState('60kg');
  
  // Custom Animal Config
  const [animalType, setAnimalType] = useState(ANIMAL_TYPES[0]);
  const [animalBreed, setAnimalBreed] = useState('');
  
  // Pose & Framing
  const [enablePoseOverride, setEnablePoseOverride] = useState(false);
  const [selectedPose, setSelectedPose] = useState(POSE_OPTIONS[0]);
  const [customPose, setCustomPose] = useState('');
  const [selectedFraming, setSelectedFraming] = useState(SHOT_FRAMING[3]); // Medium Shot
  const [customFraming, setCustomFraming] = useState('');
  const [selectedAngle, setSelectedAngle] = useState(CAMERA_ANGLES[0]); // Eye Level
  const [customAngle, setCustomAngle] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('3:4');

  // Outfit Config (Shared)
  const [overrideOutfit, setOverrideOutfit] = useState(false); // New Toggle
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFIT_STYLES[0]);
  const [customOutfit, setCustomOutfit] = useState('');
  const [outfitReference, setOutfitReference] = useState<{ file: File; preview: string } | null>(null);
  
  // Background / Scene
  const [isSolidBg, setIsSolidBg] = useState(false);
  const [solidBgColor, setSolidBgColor] = useState('#ffffff');
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_OPTIONS[0]);
  const [customBg, setCustomBg] = useState('');

  // Generation
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const outfitInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const uploadModelInputRef = useRef<HTMLInputElement>(null);

  // Reset custom interactions when context changes
  useEffect(() => {
    setInteractionType('');
    setFoodInteraction('');
    setCustomInteraction('');
  }, [context]);

  // Load custom characters
  const loadCustomChars = async () => {
    try {
      const chars = await getCustomCharacters();
      setCustomCharacters(chars);
      
      // If custom characters exist, select the most recent one by default
      if (chars.length > 0 && !selectedPredefinedModel) {
        setSelectedPredefinedModel(chars[0].id);
      } else if (PREDEFINED_MODELS.length > 0 && !selectedPredefinedModel) {
        setSelectedPredefinedModel(PREDEFINED_MODELS[0].id);
      }
    } catch (e) {
      console.error("Failed to load custom characters", e);
    }
  };

  useEffect(() => {
    loadCustomChars();

    // Listen for updates from CharacterStudio
    const handleUpdate = () => {
      loadCustomChars();
    };
    
    window.addEventListener('characterSaved', handleUpdate);
    return () => {
      window.removeEventListener('characterSaved', handleUpdate);
    };
  }, []);

  // --- Image Handling Logic ---
  const handleImageError = (id: string) => {
    if (!failedLocal[id]) {
      // First failure: Local failed, mark it so we switch to fallback
      console.warn(`Local thumbnail for ${id} failed. Attempting fallback.`);
      setFailedLocal(prev => ({ ...prev, [id]: true }));
    } else if (!failedFallback[id]) {
      // Second failure: Fallback also failed, mark it so we show placeholder
      console.warn(`Fallback thumbnail for ${id} failed.`);
      setFailedFallback(prev => ({ ...prev, [id]: true }));
    }
  };

  const getModelThumbnailSrc = (model: typeof PREDEFINED_MODELS[0]) => {
    if (failedLocal[model.id]) {
      return model.fallback; // Try fallback if local failed
    }
    return `/model_thumbnail/${model.folder}_thumbnail.jpg`; // Try local first
  };

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOutfitReference({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProductRef({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        const dataUri = `data:${file.type};base64,${base64}`;
        
        // Use user input name or filename
        const finalName = uploadName.trim() || file.name.split('.')[0].substring(0, 15);

        const newModel: CustomCharacter = {
          id: crypto.randomUUID(),
          name: finalName,
          thumbnail: dataUri,
          description: 'Uploaded Model Reference',
          timestamp: Date.now()
        };

        await saveCustomCharacter(newModel);
        await loadCustomChars();
        setSelectedPredefinedModel(newModel.id);
        setUploadName(''); // Reset input
      } catch (err) {
        console.error(err);
        setError("Failed to upload model.");
      }
    }
  };

  // --- EDIT MODAL HANDLERS ---

  const handleOpenEditModal = (model: CustomCharacter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModel(model);
    setEditName(model.name);
    setEditImage(model.thumbnail);
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        const dataUri = `data:${file.type};base64,${base64}`;
        setEditImage(dataUri);
      } catch (err) {
        console.error("Failed to process image", err);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingModel || !editName || !editImage) return;
    
    const updatedModel: CustomCharacter = {
        ...editingModel,
        name: editName,
        thumbnail: editImage
    };
    
    try {
        await saveCustomCharacter(updatedModel);
        await loadCustomChars(); 
        setEditingModel(null); // Close modal
    } catch (err) {
        console.error("Failed to update model", err);
        setError("Failed to update model details.");
    }
  };

  const handleDeleteFromModal = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editingModel) return;
    
    if (window.confirm('Are you sure you want to permanently delete this model?')) {
      try {
        await deleteCustomCharacter(editingModel.id);
        
        // Optimistic UI Update
        const remainingChars = customCharacters.filter(c => c.id !== editingModel.id);
        setCustomCharacters(remainingChars);
        
        // Adjust selection if the deleted model was active
        if (selectedPredefinedModel === editingModel.id) {
           if (remainingChars.length > 0) {
             setSelectedPredefinedModel(remainingChars[0].id);
           } else {
             setSelectedPredefinedModel(PREDEFINED_MODELS[0]?.id || '');
           }
        }
        
        setEditingModel(null); // Close modal
      } catch (error) {
        console.error("Delete failed", error);
        setError("Failed to delete model.");
        await loadCustomChars(); // Re-sync on error
      }
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) { setError(t('prod.error_api')); return; }
    if (!checkDailyLimit()) { setError(t('prod.error_limit')); return; }

    // Interaction Validation
    if (context === "Clothing Line" && !interactionType && !customInteraction) {
        setError("Please select or describe a model interaction.");
        return;
    }
    if (context === "F&B Product" && !foodInteraction && !customInteraction) {
        setError("Please select or describe a model interaction.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    setIsSaved(false);
    setGenerationStatus('Designing Model...');

    try {
      let prompt = `Professional Studio Portrait. Campaign Context: ${context}. `;
      let referenceImages: string[] = [];

      // Logic to fetch predefined model image if not custom
      if (mode === 'human' && !isCustomModel) {
         // Check if it's a Custom Created Character first
         const customChar = customCharacters.find(c => c.id === selectedPredefinedModel);
         if (customChar) {
            // It's a custom character from Character Studio or Upload
            // Convert Data URI from storage to raw base64
            // Format is "data:image/png;base64,..."
            const base64Raw = customChar.thumbnail.split(',')[1];
            referenceImages.push(base64Raw);
            
            prompt += `\nCRITICAL IDENTITY INSTRUCTION (99% MATCH):
            - Reference Image 1 is the MODEL REFERENCE.
            - YOU MUST GENERATE THE EXACT SAME PERSON.
            - STRICTLY COPY: Face structure, Skin tone/texture, Hairstyle & Hair color, Accessories, Tattoos, and Body weight.
            - The result must look like a photograph of this specific person.
            `;
            
            prompt += `\nSUBJECT: Professional Model (${customChar.name}). ${customChar.description}. `;
         } else {
             // It's a predefined hardcoded model
             const predefined = PREDEFINED_MODELS.find(m => m.id === selectedPredefinedModel);
             if (predefined) {
                // Priority: 1. Dedicated Reference in /models folder, 2. Thumbnail (Local/Fallback)
                let imageBase64: string | null = null;

                // 1. Try fetching high-res reference from /models/[folder]/reference.jpg
                try {
                   const refPath = `/models/${predefined.folder}/reference.jpg`;
                   const res = await fetch(refPath);
                   if (res.ok) {
                      const blob = await res.blob();
                      imageBase64 = await blobToBase64(blob);
                   }
                } catch (e) { 
                   // Proceed to thumbnail if high-res fails
                }

                // 2. Fallback to Thumbnail
                if (!imageBase64) {
                    const urlToFetch = getModelThumbnailSrc(predefined);
                    try {
                       const res = await fetch(urlToFetch);
                       if (res.ok) {
                          const blob = await res.blob();
                          imageBase64 = await blobToBase64(blob);
                       }
                    } catch (e) { console.warn("Failed to fetch model reference image", e); }
                }

                if (imageBase64) {
                    referenceImages.push(imageBase64);
                    prompt += `\nCRITICAL IDENTITY INSTRUCTION (99% MATCH):
                    - Reference Image 1 is the MODEL REFERENCE.
                    - YOU MUST GENERATE THE EXACT SAME PERSON.
                    - STRICTLY COPY: Face structure, Skin tone/texture, Hairstyle & Hair color, Accessories, Tattoos, and Body weight.
                    - The result must look like a photograph of this specific person.
                    `;
                } else {
                    // Fallback to text description if no image accessible
                    prompt += `\nSUBJECT: Professional Model (${predefined.name}). ${predefined.desc}. `;
                }
             }
         }
      }

      // Add product ref if present
      if (productRef) {
        const base64 = await fileToBase64(productRef.file);
        referenceImages.push(base64);
        prompt += `\nPRODUCT INTERACTION: The model is interacting with or holding the product shown in the Product Reference Image. Integrate the product naturally into the scene. `;
      } 
      
      // Contextual Logic (Clothing / F&B)
      if (context === "Clothing Line") {
          const finalClothing = customClothingType.trim() || clothingType;
          const finalAction = customInteraction.trim() || interactionType;
          
          prompt += `\nCLOTHING ITEM TYPE: ${finalClothing}.`;
          prompt += `\nMODEL ACTION: ${finalAction}. `;
          prompt += `\nFABRIC PHYSICS: Ensure the ${finalClothing} drapes, folds, and fits realistically based on the action '${finalAction}'.`;
          
          if (productRef) {
             prompt += ` Match the texture/look of the Product Reference Image.`;
          }
      } else if (context === "F&B Product") {
          const item = foodItem.trim() || "Food/Drink Product";
          const finalAction = customInteraction.trim() || foodInteraction;
          
          prompt += `\nF&B ITEM: ${item}.`;
          prompt += `\nMODEL ACTION: ${finalAction}.`;
          prompt += `\nREALISM INSTRUCTION: Make the food/drink look delicious and fresh. Ensure the model's interaction (bite, sip, hold) obeys physics. If eating, mouth shape must match the action.`;
          
          if (productRef) {
              prompt += ` Match the visual appearance of the uploaded Product Reference Image.`;
          }
      }

      // OUTFIT LOGIC (Unified)
      let outfitInstruction = "";
      if (overrideOutfit) {
          if (outfitReference) {
              const base64 = await fileToBase64(outfitReference.file);
              referenceImages.push(base64); // Add to inputs
              outfitInstruction += `WEARING REFERENCE: Model is wearing the outfit from the Outfit Reference Image. Match style and fit. `;
          } else {
              const textOutfit = customOutfit.trim() || selectedOutfit;
              if (textOutfit) outfitInstruction += `WEARING: ${textOutfit}. `;
          }
      } else {
          // DEFAULT MODE: Use Model's default outfit
          outfitInstruction = "WEARING: Keep the model's outfit consistent with the Reference Image (if provided) or use context-appropriate attire. Do not change clothes if the reference shows a distinct outfit.";
      }

      if (context === "Clothing Line") {
          const productItem = customClothingType.trim() || clothingType;
          outfitInstruction += `\nIMPORTANT: This is a clothing campaign for '${productItem}'. The model must be wearing/interacting with this specific item type.`;
      }

      prompt += `\nSTYLING & OUTFIT: ${outfitInstruction}`;

      if (mode === 'animal') {
         prompt += `\nSUBJECT: ${animalBreed ? `${animalBreed} ` : ''}${animalType}. `;
         prompt += `The animal is posing professionally for a commercial shoot. `;
      } else {
         if (isCustomModel) {
            prompt += `\nSUBJECT: ${age} year old ${ethnicity} ${gender}. `;
            prompt += `Body Type: ${bodyType}. Height: ${height}. Weight: ${weight}. `;
            prompt += `Features: Photorealistic skin texture, detailed eyes, professional pose. `;
         } 
      }

      // Pose & Framing
      // Only force a specific Professional Pose if the override is enabled.
      // Otherwise, the action implies the pose.
      if (enablePoseOverride) {
         prompt += `\nPOSE OVERRIDE: ${customPose.trim() || selectedPose}. Ignore implied poses from interaction if they conflict.`;
      } else {
         // Natural pose matching interaction
         prompt += `\nPOSE: Natural pose that fits the action described above.`;
      }
      
      // Use explicit camera framing and angle instructions, overriding with custom input if present
      const framingInstruction = customFraming.trim() 
        ? `CAMERA FRAMING: ${customFraming}` 
        : (FRAMING_PROMPTS[selectedFraming] || `FRAMING: ${selectedFraming}.`);
        
      const angleInstruction = customAngle.trim() 
        ? `CAMERA ANGLE: ${customAngle}` 
        : (ANGLE_PROMPTS[selectedAngle] || `ANGLE: ${selectedAngle}.`);
        
      prompt += `\n${framingInstruction} ${angleInstruction}`;

      // Background
      if (isSolidBg) {
         prompt += `\nBACKGROUND: Solid Studio Background. Color Hex: ${solidBgColor}. Professional studio lighting. `;
      } else {
         prompt += `\nBACKGROUND: ${customBg.trim() || selectedBg}. `;
      }

      // PHYSICS & REALISM ENGINE
      prompt += `
      \nHYPER-REALISM & PHYSICS INTEGRATION:
      1. GLOBAL ILLUMINATION: The subject, product, and background MUST share the exact same lighting environment. Light direction, color temperature, and intensity must be consistent across the entire scene.
      2. CONTACT SHADOWS: Where the model touches the product or the ground, there must be realistic ambient occlusion and contact shadows. No floating objects.
      3. REFLECTIONS: If the product or background is reflective, it must reflect the model and environment accurately.
      4. TEXTURE COHERENCE: Skin texture (pores, subsurface scattering) and fabric texture must render with the same level of detail and noise as the environment.
      5. COLOR BLEED: Subtle light bounce (color bleeding) from the environment onto the subject and vice versa to ground them in the scene.
      6. PERSPECTIVE ALIGNMENT: Shadows, background geometry, and model proportions must strictly follow the requested camera angle and framing.
         - If Low Angle: Underside of chin/nose visible, background ceiling/sky visible, legs elongated.
         - If High Angle: Top of head visible, background floor visible, body tapered.
      `;

      prompt += `\nQUALITY: 8k resolution, highly detailed, photorealistic, commercial advertisement standard. Lighting: Commercial photography lighting optimized for ${context}.`;

      const result = await generateCreativeImage(prompt, apiKey, referenceImages.length ? referenceImages : undefined, { aspectRatio: selectedAspectRatio });
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
      console.error(err);
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
        prompt: `Hire Model: ${mode} - ${context}`,
        timestamp: Date.now(),
        title: 'Model Portfolio'
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gelap5-Model_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* Edit Model Modal */}
      {editingModel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingModel(null)} />
           
           {/* Content */}
           <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                 <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings size={16} className="text-zinc-400" />
                    Edit Model Details
                 </h3>
                 <button onClick={() => setEditingModel(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={18} />
                 </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Left: Image */}
                 <div className="space-y-3">
                    <div 
                       className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700 bg-black group cursor-pointer"
                       onClick={() => editImageInputRef.current?.click()}
                    >
                       <img src={editImage || ''} className="w-full h-full object-cover" alt="Model Preview" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <ImagePlus size={24} className="text-white" />
                          <span className="text-xs text-white font-medium">Replace Image</span>
                       </div>
                    </div>
                    <input type="file" ref={editImageInputRef} hidden accept="image/*" onChange={handleEditImageUpload} />
                 </div>

                 {/* Right: Info */}
                 <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Model Name</label>
                       <div className="relative">
                          <input 
                             type="text" 
                             value={editName}
                             onChange={(e) => setEditName(e.target.value)}
                             className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-3 pr-8 text-sm text-white focus:border-purple-500 focus:outline-none"
                          />
                          <PenLine size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                       </div>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-zinc-800 flex flex-col gap-2">
                       <button 
                          onClick={handleDeleteFromModal}
                          type="button"
                          className="w-full py-2.5 rounded-lg border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                       >
                          <Trash2 size={14} /> Delete Model
                       </button>
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                 <button 
                    onClick={() => setEditingModel(null)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleSaveEdit}
                    disabled={!editName || !editImage}
                    className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <Save size={14} /> Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Users className="text-purple-500" /> {t('hm.title')}
        </h1>
        <p className="text-zinc-400">{t('hm.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* 1. Campaign Context & Product */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
               <Briefcase size={16} className="text-purple-400" /> {t('hm.section_purpose')}
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {CAMPAIGN_CONTEXTS.map(ctx => {
                   const isDisabled = DISABLED_CONTEXTS.includes(ctx);
                   return (
                     <button
                       key={ctx}
                       disabled={isDisabled}
                       onClick={() => !isDisabled && setContext(ctx)}
                       className={`
                         px-3 py-3 rounded-lg text-xs font-medium border transition-all relative overflow-hidden
                         ${context === ctx 
                           ? 'bg-purple-900/30 border-purple-500 text-purple-200' 
                           : isDisabled
                             ? 'bg-zinc-950/50 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
                             : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}
                       `}
                     >
                       {ctx}
                       {isDisabled && (
                          <div className="absolute top-0 right-0">
                             <span className="bg-amber-500 text-black text-[7px] font-extrabold px-1.5 py-0.5 rounded-bl-md shadow-sm">SOON</span>
                          </div>
                       )}
                     </button>
                   );
                })}
             </div>

             {/* Product Upload for Context */}
             <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Box size={14}/> Campaign Product (Optional)</label>
                <div 
                  onClick={() => productInputRef.current?.click()}
                  className={`
                    relative border border-dashed rounded-lg h-20 flex items-center justify-center cursor-pointer transition-colors
                    ${productRef ? 'border-purple-500/30 bg-purple-900/10' : 'border-zinc-700 hover:bg-zinc-900'}
                  `}
                >
                   {productRef ? (
                      <div className="flex items-center gap-3 px-4">
                         <img src={productRef.preview} alt="Product" className="h-14 w-14 object-contain rounded bg-black" />
                         <div className="text-left">
                            <div className="text-xs font-bold text-purple-300">Product Uploaded</div>
                            <button onClick={(e) => { e.stopPropagation(); setProductRef(null); }} className="text-[10px] text-red-400 hover:text-red-300 mt-1">Remove</button>
                         </div>
                      </div>
                   ) : (
                      <div className="flex flex-col items-center text-zinc-500">
                         <Upload size={16} className="mb-1" />
                         <span className="text-[10px]">Upload Product to Hold/Interact</span>
                      </div>
                   )}
                   <input ref={productInputRef} type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                </div>
             </div>

             {/* Dynamic Clothing Line Options */}
             {context === 'Clothing Line' && (
                <div className="mt-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Shirt size={12}/> Clothing Type</label>
                      <select 
                        value={clothingType} 
                        onChange={(e) => setClothingType(e.target.value)} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-xs text-zinc-300 focus:border-purple-500"
                      >
                         {CLOTHING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {/* Manual Input for Clothing Type */}
                      <input 
                        type="text" 
                        value={customClothingType} 
                        onChange={(e) => setCustomClothingType(e.target.value)} 
                        placeholder="Or type custom clothing (e.g. Kimono, Poncho)..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-2 text-xs text-white focus:border-purple-500 focus:outline-none placeholder-zinc-600" 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Layers size={12}/> Model Interaction</label>
                      <select 
                        value={interactionType} 
                        onChange={(e) => setInteractionType(e.target.value)} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-xs text-zinc-300 focus:border-purple-500"
                      >
                         <option value="" disabled>Select Action...</option>
                         {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input 
                        type="text" 
                        value={customInteraction} 
                        onChange={(e) => setCustomInteraction(e.target.value)} 
                        placeholder="Or describe custom action..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-2 text-xs text-white focus:border-purple-500 focus:outline-none placeholder-zinc-600" 
                      />
                   </div>
                </div>
             )}

             {/* Dynamic F&B Product Options */}
             {context === 'F&B Product' && (
                <div className="mt-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Utensils size={12}/> Food/Drink Name</label>
                      <input 
                        type="text" 
                        value={foodItem} 
                        onChange={(e) => setFoodItem(e.target.value)} 
                        placeholder="e.g. Cheeseburger, Iced Matcha..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-xs text-white focus:border-purple-500 focus:outline-none placeholder-zinc-600" 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Layers size={12}/> Interaction</label>
                      <select 
                        value={foodInteraction} 
                        onChange={(e) => setFoodInteraction(e.target.value)} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-xs text-zinc-300 focus:border-purple-500"
                      >
                         <option value="" disabled>Select Action...</option>
                         {FOOD_DRINK_INTERACTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input 
                        type="text" 
                        value={customInteraction} 
                        onChange={(e) => setCustomInteraction(e.target.value)} 
                        placeholder="Or describe custom action..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-2 text-xs text-white focus:border-purple-500 focus:outline-none placeholder-zinc-600" 
                      />
                   </div>
                </div>
             )}
          </div>

          {/* 2. Model Configuration */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <ScanFace size={16} className="text-purple-400" /> {t('hm.section_config')}
                </h3>
                
                {/* Human/Animal Toggle */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                   <button 
                     onClick={() => setMode('human')}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'human' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     <User size={12} /> {t('hm.mode_human')}
                   </button>
                   <button 
                     onClick={() => setMode('animal')}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'animal' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     <PawPrint size={12} /> {t('hm.mode_animal')}
                   </button>
                </div>
             </div>

             {/* HUMAN MODE CONFIG */}
             {mode === 'human' && (
                <div className="space-y-6 animate-fade-in">
                   {/* Selection Method */}
                   <div className="flex gap-4 border-b border-zinc-800 pb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" checked={!isCustomModel} onChange={() => setIsCustomModel(false)} className="accent-purple-500" />
                         <span className={`text-xs ${!isCustomModel ? 'text-white font-medium' : 'text-zinc-500'}`}>{t('hm.select_existing')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" checked={isCustomModel} onChange={() => setIsCustomModel(true)} className="accent-purple-500" />
                         <span className={`text-xs ${isCustomModel ? 'text-white font-medium' : 'text-zinc-500'}`}>{t('hm.generate_new')}</span>
                      </label>
                   </div>

                   {/* Existing Models Slider */}
                   {!isCustomModel && (
                      <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x touch-pan-x">
                         {/* Upload Card */}
                         <div className="min-w-[140px] w-[140px] shrink-0 snap-start flex flex-col gap-2">
                            <div
                              onClick={() => uploadModelInputRef.current?.click()}
                              className="flex-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 flex flex-col items-center justify-center text-zinc-500 hover:text-purple-400 hover:border-purple-500/50 transition-all cursor-pointer group min-h-[160px] relative p-3"
                            >
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2 group-hover:bg-purple-500/20 transition-colors">
                                 <Upload size={18} />
                              </div>
                              <span className="text-[10px] font-bold text-center mb-2">Upload Model</span>
                              
                              {/* Name Input */}
                              <input 
                                type="text" 
                                value={uploadName}
                                onChange={(e) => setUploadName(e.target.value)}
                                onClick={(e) => e.stopPropagation()} 
                                placeholder="Name (Optional)"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-white focus:border-purple-500 outline-none placeholder-zinc-600 text-center"
                              />
                            </div>
                            <input ref={uploadModelInputRef} type="file" hidden accept="image/*" onChange={handleModelUpload} />
                         </div>

                         {/* Custom Characters */}
                         {customCharacters.map(char => (
                            <div
                                key={char.id}
                                onClick={() => setSelectedPredefinedModel(char.id)}
                                className={`
                                  min-w-[140px] w-[140px] shrink-0 snap-start p-2 rounded-lg border text-left transition-all relative overflow-hidden group cursor-pointer
                                  ${selectedPredefinedModel === char.id 
                                    ? 'bg-zinc-800 border-lime-500 ring-1 ring-lime-500' 
                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}
                                `}
                                role="button"
                              >
                                 <div className="relative w-full aspect-[3/4] bg-zinc-800 mb-2 rounded overflow-hidden border border-zinc-700 group/image">
                                    <img 
                                      src={char.thumbnail} 
                                      alt={char.name} 
                                      className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute top-1 right-1 bg-lime-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md">
                                       <Sparkles size={8} /> Custom
                                    </div>
                                 </div>
                                 
                                 {/* Edit Button Outside Image Preview */}
                                 <div className="flex items-start justify-between gap-2 px-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-xs text-white truncate">{char.name}</div>
                                      <div className="text-[9px] text-zinc-500 truncate">{char.description}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditModal(char, e)}
                                      className="shrink-0 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                                      title="Edit Model"
                                    >
                                      <Settings size={12} />
                                    </button>
                                 </div>
                              </div>
                         ))}

                         {/* Predefined Models */}
                         {PREDEFINED_MODELS.map(m => {
                            const isFailedFallback = failedFallback[m.id];
                            return (
                              <div
                                key={m.id}
                                onClick={() => setSelectedPredefinedModel(m.id)}
                                className={`
                                  min-w-[140px] w-[140px] shrink-0 snap-start p-2 rounded-lg border text-left transition-all relative overflow-hidden group cursor-pointer
                                  ${selectedPredefinedModel === m.id 
                                    ? 'bg-zinc-800 border-purple-500 ring-1 ring-purple-500' 
                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}
                                `}
                                role="button"
                              >
                                 <div className="relative w-full aspect-[3/4] bg-zinc-800 mb-2 rounded overflow-hidden border border-zinc-700 group/image">
                                    {isFailedFallback ? (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500">
                                         <User size={24} className="mb-2 opacity-50" />
                                      </div>
                                    ) : (
                                      <img 
                                        src={getModelThumbnailSrc(m)} 
                                        alt={m.name} 
                                        className={`w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity`}
                                        onError={() => handleImageError(m.id)}
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                 </div>
                                 <div className="font-bold text-xs text-white px-1">{m.name}</div>
                                 <div className="text-[9px] text-zinc-500 px-1">{m.desc}</div>
                              </div>
                            );
                         })}
                      </div>
                   )}

                   {/* Custom Model Form */}
                   {isCustomModel && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.ethnicity')}</label>
                            <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                               {ETHNICITIES.map(e => <option key={e}>{e}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.gender')}</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                               <option>Female</option><option>Male</option><option>Non-Binary</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.age')}</label>
                            <input type="text" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.body_type')}</label>
                            <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                               {BODY_TYPES.map(b => <option key={b}>{b}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.height')}</label>
                            <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.weight')}</label>
                            <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300" />
                         </div>
                      </div>
                   )}
                </div>
             )}

             {/* ANIMAL MODE CONFIG */}
             {mode === 'animal' && (
                <div className="space-y-4 animate-fade-in bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.animal_type')}</label>
                         <select value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
                            {ANIMAL_TYPES.map(a => <option key={a}>{a}</option>)}
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] text-zinc-500 uppercase font-bold">{t('hm.animal_breed')}</label>
                         <input 
                           type="text" 
                           value={animalBreed} 
                           onChange={(e) => setAnimalBreed(e.target.value)} 
                           placeholder="e.g. Golden Retriever"
                           className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600" 
                         />
                      </div>
                   </div>
                </div>
             )}
          </div>

          {/* 3. Outfit & Environment (MOVED UP) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <h3 className="text-white font-semibold flex items-center gap-2">
               <Shirt size={16} className="text-purple-400" /> Style & Environment
             </h3>

             {/* OUTFIT Selection - Now with Toggle */}
             <div>
                <div className="flex items-center justify-between mb-3">
                   <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Outfit Selection</label>
                   <button onClick={() => setOverrideOutfit(!overrideOutfit)} className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-white transition-colors">
                      {overrideOutfit ? 'Override Outfit' : 'Use Default'}
                      {overrideOutfit ? <ToggleRight size={20} className="text-purple-500" /> : <ToggleLeft size={20} />}
                   </button>
                </div>

                {overrideOutfit ? (
                   <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-4 animate-fade-in">
                      {/* Reference Upload */}
                      <div className="mb-4">
                         <div 
                           onClick={() => outfitInputRef.current?.click()}
                           className={`
                             relative border border-dashed rounded-lg h-24 flex items-center justify-center cursor-pointer transition-colors
                             ${outfitReference ? 'border-purple-500/30 bg-purple-900/10' : 'border-zinc-700 hover:bg-zinc-900'}
                           `}
                         >
                            {outfitReference ? (
                               <div className="flex items-center gap-3 px-4">
                                  <img src={outfitReference.preview} alt="Ref" className="h-16 w-16 object-contain rounded bg-black" />
                                  <div className="text-left">
                                     <div className="text-xs font-bold text-purple-300">{t('hm.outfit_ref')}</div>
                                     <button onClick={(e) => { e.stopPropagation(); setOutfitReference(null); }} className="text-[10px] text-red-400 hover:text-red-300 mt-1">Remove</button>
                                  </div>
                               </div>
                            ) : (
                               <div className="flex flex-col items-center text-zinc-500">
                                  <Upload size={16} className="mb-1" />
                                  <span className="text-[10px]">{t('hm.upload_outfit')}</span>
                               </div>
                            )}
                            <input ref={outfitInputRef} type="file" className="hidden" accept="image/*" onChange={handleOutfitUpload} />
                         </div>
                      </div>

                      {/* Preset Selection & Text Input */}
                      <div className={`transition-opacity ${outfitReference ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                         <div className="h-24 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-900 p-2 grid grid-cols-1 gap-2 mb-2">
                            {OUTFIT_STYLES.map(style => (
                              <button
                                key={style}
                                onClick={() => setSelectedOutfit(style)}
                                className={`
                                  text-left px-3 py-2 rounded text-[10px] transition-all border
                                  ${selectedOutfit === style && !customOutfit
                                    ? 'bg-purple-900/20 border-purple-500/50 text-purple-200' 
                                    : 'bg-zinc-950 border-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
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
                           placeholder={t('hm.custom_outfit')}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                         />
                      </div>
                   </div>
                ) : (
                   <div className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg mb-4 text-center">
                      <p className="text-[10px] text-zinc-500 italic">Using model's default attire from reference.</p>
                   </div>
                )}
             </div>

             {/* ENVIRONMENT */}
             <div>
                <div className="flex items-center justify-between mb-2">
                   <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><MapPin size={14}/> Background & Atmosphere</label>
                   
                   {/* Solid Background Toggle */}
                   <button 
                      onClick={() => setIsSolidBg(!isSolidBg)} 
                      className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${isSolidBg ? 'bg-purple-500' : 'bg-zinc-700'}`}
                      title="Solid Studio Color"
                   >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${isSolidBg ? 'left-5' : 'left-1'}`} />
                   </button>
                </div>
                
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
                            <input 
                              type="text" 
                              value={solidBgColor.replace('#', '')}
                              onChange={(e) => {
                                 const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0,6);
                                 setSolidBgColor(`#${val}`);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-3 pr-3 text-sm text-zinc-200 font-mono focus:ring-1 focus:ring-purple-500 uppercase focus:outline-none"
                              maxLength={6}
                            />
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="animate-fade-in">
                      <div className="h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-950 p-2 grid grid-cols-2 gap-2 mb-2">
                         {BACKGROUND_OPTIONS.map(bg => (
                           <button
                             key={bg}
                             onClick={() => setSelectedBg(bg)}
                             className={`
                               text-left px-3 py-2 rounded text-[10px] transition-all border
                               ${selectedBg === bg && !customBg
                                 ? 'bg-purple-900/20 border-purple-500/50 text-purple-200' 
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
                        placeholder="Or describe custom environment..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                      />
                   </div>
                )}
             </div>
          </div>

          {/* 4. Pose & Framing (NOW LAST) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <h3 className="text-white font-semibold flex items-center gap-2">
               <Move size={16} className="text-purple-400" /> Pose & Framing
             </h3>
             
             {/* Poses */}
             <div>
                <div className="flex items-center justify-between mb-3">
                   <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Professional Pose</label>
                   <button onClick={() => setEnablePoseOverride(!enablePoseOverride)} className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-white transition-colors">
                      {enablePoseOverride ? 'Pose Override ON' : 'Using Product Interaction Pose'}
                      {enablePoseOverride ? <ToggleRight size={20} className="text-purple-500" /> : <ToggleLeft size={20} />}
                   </button>
                </div>

                {enablePoseOverride ? (
                   <div className="animate-fade-in">
                      <div className="h-32 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-zinc-900 p-2 grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                         {POSE_OPTIONS.map(pose => (
                           <button
                             key={pose}
                             onClick={() => setSelectedPose(pose)}
                             className={`
                               text-left px-3 py-2 rounded text-[10px] transition-all border
                               ${selectedPose === pose && !customPose
                                 ? 'bg-purple-900/20 border-purple-500/50 text-purple-200' 
                                 : 'bg-zinc-950 border-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
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
                        placeholder="Or describe custom pose..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                      />
                   </div>
                ) : (
                   <div className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg mb-4 text-center">
                      <p className="text-[10px] text-zinc-500 italic">Pose is determined by the selected Product Interaction above.</p>
                   </div>
                )}
             </div>

             {/* Camera Controls Split */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><ScanFace size={12}/> Shot Framing</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       {SHOT_FRAMING.map(opt => (
                         <button
                           key={opt}
                           onClick={() => setSelectedFraming(opt)}
                           className={`
                             px-2 py-2 rounded border text-[10px] font-medium transition-all text-center
                             ${selectedFraming === opt && !customFraming
                               ? 'bg-zinc-800 border-purple-500/50 text-white' 
                               : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                           `}
                         >
                           {opt}
                         </button>
                       ))}
                    </div>
                    <input 
                      type="text" 
                      value={customFraming} 
                      onChange={(e) => setCustomFraming(e.target.value)}
                      placeholder="Or describe custom framing..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                    />
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Eye size={12}/> Camera Angle</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       {CAMERA_ANGLES.map(opt => (
                         <button
                           key={opt}
                           onClick={() => setSelectedAngle(opt)}
                           className={`
                             px-2 py-2 rounded border text-[10px] font-medium transition-all text-center
                             ${selectedAngle === opt && !customAngle
                               ? 'bg-zinc-800 border-purple-500/50 text-white' 
                               : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                           `}
                         >
                           {opt}
                         </button>
                       ))}
                    </div>
                    <input 
                      type="text" 
                      value={customAngle} 
                      onChange={(e) => setCustomAngle(e.target.value)}
                      placeholder="Or describe custom angle..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                    />
                 </div>
             </div>

             {/* Aspect Ratio (NEW) */}
             <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Ratio size={12}/> Image Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                   {ASPECT_RATIOS.map(ar => (
                     <button
                       key={ar.value}
                       onClick={() => setSelectedAspectRatio(ar.value)}
                       className={`
                         px-2 py-2 rounded border text-[10px] font-medium transition-all text-center flex flex-col items-center justify-center
                         ${selectedAspectRatio === ar.value 
                           ? 'bg-zinc-800 border-purple-500/50 text-white shadow-inner' 
                           : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                       `}
                     >
                       <span className="block truncate w-full">{ar.label.split(' ')[0]}</span>
                       <span className="text-[8px] opacity-60">{ar.value}</span>
                     </button>
                   ))}
                </div>
             </div>
          </div>

          {/* Action */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <button 
               onClick={handleGenerate}
               disabled={isGenerating}
               className={`
                 w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex items-center justify-center gap-2
                 ${isGenerating
                   ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                   : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'}
               `}
             >
               {isGenerating ? (
                 <>
                   <Loader2 size={18} className="animate-spin" />
                   {generationStatus}
                 </>
               ) : (
                 <>
                   <Wand2 size={18} />
                   {t('hm.btn_generate')}
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

        {/* RIGHT PANEL */}
        <div className="lg:col-span-5 xl:col-span-4 relative">
           <div className="sticky top-6 flex flex-col gap-6">
              
              {/* Output Preview */}
              <div>
                <h3 className="text-white font-semibold mb-4 text-center">{t('hm.output_title')}</h3>
                <div className="relative w-full aspect-[3/4] bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[400px]">
                    {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Result" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                            <div className="flex gap-4">
                              <button onClick={() => setIsZoomOpen(true)} className="p-3 bg-white text-black hover:bg-purple-400 rounded-full shadow-lg"><ZoomIn size={24} /></button>
                              <button onClick={() => handleDownload(generatedImage)} className="p-3 bg-white text-black hover:bg-purple-400 rounded-full shadow-lg"><Download size={24} /></button>
                            </div>
                            <button onClick={handleSave} className={`px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2 font-medium text-sm ${isSaved ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-black/60 text-white hover:bg-black/80'}`}>
                              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : isSaved ? <Check size={16} /> : <Save size={16} />}
                              {isSaved ? t('ps.saved') : t('ps.save')}
                            </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-zinc-600 px-6">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                           <User size={24} />
                        </div>
                        <p className="text-sm">{t('ps.output_default')}</p>
                        {isGenerating && (
                           <div className="mt-4 flex flex-col items-center">
                              <Loader2 size={32} className="animate-spin text-purple-500 mb-2" />
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

export default HireModelStudio;