import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw, Save, Check, ZoomIn, Clock, Loader2, ImagePlus, Palette, Briefcase, Type, Layout, MousePointer2, Wand2, X } from 'lucide-react';
import { generateCreativeImage, fileToBase64 } from '../services/geminiService';
import { saveAsset } from '../services/storageService';
import { checkDailyLimit, incrementUsage } from '../services/usageService';
import { translations } from '../utils/translations';

interface RebrandStudioProps {
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

const INDUSTRIES = [
  "Technology & SaaS", "Fashion & Apparel", "Food & Beverage", "Health & Wellness", 
  "Real Estate", "Finance & Banking", "Education", "Entertainment", "Travel & Hospitality",
  "Automotive", "Beauty & Cosmetics", "Consulting", "Non-Profit", "Gaming"
];

const BRAND_STYLES = [
  { id: 'minimalist', label: 'Minimalist', desc: 'Clean, simple, timeless' },
  { id: 'modern', label: 'Modern', desc: 'Sleek, geometric, current' },
  { id: 'vintage', label: 'Vintage', desc: 'Retro, nostalgic, textured' },
  { id: 'luxury', label: 'Luxury', desc: 'Elegant, serif, gold/black' },
  { id: 'playful', label: 'Playful', desc: 'Fun, rounded, vibrant' },
  { id: 'futuristic', label: 'Futuristic', desc: 'Sci-fi, neon, tech' },
  { id: 'handwritten', label: 'Handwritten', desc: 'Personal, script, signature' },
  { id: 'abstract', label: 'Abstract', desc: 'Conceptual, artistic, unique' }
];

const COLOR_PALETTES = [
  { id: 'monochrome', label: 'Monochrome', colors: ['#000', '#fff', '#888'] },
  { id: 'ocean', label: 'Ocean Blue', colors: ['#0ea5e9', '#0284c7', '#e0f2fe'] },
  { id: 'nature', label: 'Nature Green', colors: ['#84cc16', '#166534', '#dcfce7'] },
  { id: 'sunset', label: 'Sunset Warm', colors: ['#f97316', '#dc2626', '#fef3c7'] },
  { id: 'royal', label: 'Royal Purple', colors: ['#a855f7', '#581c87', '#f3e8ff'] },
  { id: 'pastel', label: 'Soft Pastel', colors: ['#fda4af', '#93c5fd', '#c4b5fd'] },
  { id: 'neon', label: 'Cyber Neon', colors: ['#f0abfc', '#22d3ee', '#a3e635'] },
  { id: 'earth', label: 'Earth Tones', colors: ['#78350f', '#d97706', '#fef3c7'] }
];

const RebrandStudio: React.FC<RebrandStudioProps> = ({ apiKey, onUsageUpdate, lang }) => {
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // State
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('modern');
  const [selectedColors, setSelectedColors] = useState<string>('monochrome');
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);
  
  // Generation
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceImage({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError(t('ps.error_api'));
      return;
    }
    if (!brandName) {
      setError(t('rs.error_name'));
      return;
    }
    if (!checkDailyLimit()) {
      setError(t('ps.error_limit'));
      return;
    }

    setIsGenerating(true);
    abortRef.current = false;
    setError(null);
    setIsSaved(false);
    setGenerationStatus(t('rs.generating'));

    try {
      // Build Prompt
      const styleObj = BRAND_STYLES.find(s => s.id === selectedStyle);
      const colorObj = COLOR_PALETTES.find(c => c.id === selectedColors);
      
      let richPrompt = `
      Create a professional High-Quality Brand Identity Presentation.
      
      BRAND DETAILS:
      - Name: "${brandName}"
      - Industry: ${industry}
      - Description: ${description}
      
      DESIGN DIRECTION:
      - Style: ${styleObj?.label} (${styleObj?.desc})
      - Color Palette: ${colorObj?.label} Theme.
      
      REQUIREMENTS:
      - Generate a high-resolution image featuring the Logo Design clearly.
      - Present it on a high-quality mockup (e.g., business card, signage, or clean wall).
      - Ensure text is legible and spelling of "${brandName}" is correct.
      - Professional studio lighting, 8k resolution.
      `;

      if (referenceImage) {
        richPrompt += `\n\nREFERENCE: Use the attached image as visual inspiration for structure or motif, but modernize it according to the selected style.`;
      }

      setFinalPrompt(richPrompt);

      // Prepare Images
      const images: string[] = [];
      if (referenceImage) {
        const base64 = await fileToBase64(referenceImage.file);
        images.push(base64);
      }

      const result = await generateCreativeImage(richPrompt, apiKey, images.length > 0 ? images : undefined, { aspectRatio: '1:1' });
      
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
        title: `Rebrand: ${brandName}`
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gelap5-RebrandStudio_${Date.now()}.png`;
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

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">{t('rs.title')}</h1>
        <p className="text-zinc-400">{t('rs.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Step 1: Brand Basics */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">1</span>
               {t('rs.step1')}
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('rs.brand_name')}</label>
                  <input 
                    type="text" 
                    value={brandName} 
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-lime-500/50 focus:outline-none"
                  />
               </div>
               
               <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('rs.industry')}</label>
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-3 text-zinc-600" />
                    <select 
                      value={industry} 
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-300 focus:border-lime-500/50 appearance-none"
                    >
                      <option value="">{t('rs.select_industry')}</option>
                      {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </div>
               </div>
               
               <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('rs.desc')}</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('rs.desc_placeholder')}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-lime-500/50 focus:outline-none h-20 resize-none"
                  />
               </div>

               {/* Reference Upload */}
               <div className="col-span-1 md:col-span-2">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">{t('rs.ref_logo')}</label>
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className={`
                     relative border-2 border-dashed rounded-lg h-24 flex items-center justify-center cursor-pointer transition-colors
                     ${referenceImage ? 'border-lime-500/30 bg-lime-500/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'}
                   `}
                 >
                    {referenceImage ? (
                       <div className="flex items-center gap-4 px-4">
                          <img src={referenceImage.preview} alt="Ref" className="h-16 w-16 object-contain rounded" />
                          <div className="text-left">
                             <p className="text-sm text-zinc-200 font-medium truncate max-w-[200px]">{referenceImage.file.name}</p>
                             <button 
                               onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                               className="text-xs text-red-400 hover:text-red-300 mt-1"
                             >
                               Remove
                             </button>
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col items-center text-zinc-500">
                          <div className="flex items-center gap-2">
                            <Upload size={16} />
                            <span className="text-xs font-medium">{t('rs.upload_ref')}</span>
                          </div>
                       </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} />
                 </div>
               </div>
             </div>
          </div>

          {/* Step 2: Visual Identity */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-6">
             <h3 className="text-white font-semibold flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-bold">2</span>
               {t('rs.step2')}
             </h3>

             {/* Style Grid */}
             <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">{t('rs.style')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {BRAND_STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`
                          p-3 rounded-lg border text-left transition-all
                          ${selectedStyle === style.id 
                            ? 'bg-lime-900/30 border-lime-500 text-lime-100 ring-1 ring-lime-500' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
                        `}
                      >
                         <div className="font-bold text-xs mb-1">{style.label}</div>
                         <div className="text-[9px] opacity-60 leading-tight">{style.desc}</div>
                      </button>
                   ))}
                </div>
             </div>

             {/* Color Palette */}
             <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 block">{t('rs.colors')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {COLOR_PALETTES.map(pal => (
                      <button
                        key={pal.id}
                        onClick={() => setSelectedColors(pal.id)}
                        className={`
                          p-2 rounded-lg border text-left transition-all flex items-center justify-between group
                          ${selectedColors === pal.id 
                            ? 'bg-zinc-800 border-lime-500 ring-1 ring-lime-500' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}
                        `}
                      >
                         <span className={`text-xs font-medium ${selectedColors === pal.id ? 'text-white' : 'text-zinc-400'}`}>{pal.label}</span>
                         <div className="flex -space-x-1">
                            {pal.colors.map(c => (
                              <div key={c} className="w-3 h-3 rounded-full ring-1 ring-black" style={{ backgroundColor: c }} />
                            ))}
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          </div>

          {/* Step 3: Action */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
             <button 
               onClick={handleGenerate}
               disabled={isGenerating || !brandName}
               className={`
                 w-full py-4 rounded-lg font-bold text-sm tracking-wide transition-all uppercase shadow-lg flex items-center justify-center gap-2
                 ${isGenerating 
                   ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                   : !brandName 
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
                   <Wand2 size={18} />
                   {t('rs.btn_generate')}
                 </>
               )}
             </button>
             
             {error && (
               <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded text-red-400 text-xs text-center">
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
                <div className="relative w-full aspect-square bg-zinc-950 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden group min-h-[400px]">
                    {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Brand Result" className="w-full h-full object-contain" />
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
                           <Palette size={24} />
                        </div>
                        <p className="text-sm">{t('ps.output_placeholder')}</p>
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

export default RebrandStudio;