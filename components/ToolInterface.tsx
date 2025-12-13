import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Download, RefreshCw, AlertCircle, Image as ImageIcon, Save, Check } from 'lucide-react';
import { ToolConfig } from '../types';
import { generateCreativeImage, fileToBase64 } from '../services/geminiService';
import { saveAsset } from '../services/storageService';

interface ToolInterfaceProps {
  tool: ToolConfig;
  apiKey: string;
  onUsageUpdate?: () => void;
}

const ToolInterface: React.FC<ToolInterfaceProps> = ({ tool, apiKey, onUsageUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsSaved(false); // Reset save state on new input
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("API Key is missing. Please refresh the app to enter your key.");
      return;
    }

    if (!prompt && !selectedFile) {
      setError("Please enter a prompt or upload an image.");
      return;
    }
    
    // For tools that strictly require an image
    if (tool.requiresImage && !selectedFile) {
      setError("This tool requires a reference image.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResultImage(null);
    setIsSaved(false);

    try {
      let imageBase64: string | undefined = undefined;
      if (selectedFile) {
        imageBase64 = await fileToBase64(selectedFile);
      }

      // Construct a tailored system-like prompt enhancement based on the tool
      let finalPrompt = prompt;
      switch (tool.id) {
        case 'product-photo':
          finalPrompt = `Product photography shot. ${prompt}. High quality, studio lighting, commercial aesthetic.`;
          break;
        case 'fashion-catalogue':
          finalPrompt = `Fashion catalogue shot. ${prompt}. Full body or medium shot, professional model, fashion magazine style.`;
          break;
        case 'fashion-mix-match':
          finalPrompt = `Fashion style mix and match. ${prompt}. Cohesive outfit layout or model wearing coordinated items.`;
          break;
        case 'hire-model':
          finalPrompt = `Portrait of a professional model for brand campaign. ${prompt}. Photorealistic, high detail.`;
          break;
        case 'pre-wedding':
          finalPrompt = `Romantic pre-wedding photography. ${prompt}. Soft lighting, dreamy atmosphere, couple portraiture style.`;
          break;
        case 'mockup':
          finalPrompt = `Professional product mockup. ${prompt}. Clean background, focus on the design placement.`;
          break;
        case 'rebrand':
          finalPrompt = `Brand identity concept visualization. ${prompt}. Modern, minimalist, corporate identity style.`;
          break;
        default:
          break;
      }

      const generatedImageBase64 = await generateCreativeImage(finalPrompt, apiKey, imageBase64);
      setResultImage(generatedImageBase64);
      
      // Increment Usage on success
      if (onUsageUpdate) onUsageUpdate();
      
    } catch (err: any) {
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (resultImage) {
      try {
        const response = await fetch(resultImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Construct filename using tool label
        const featureName = tool.label.replace(/\s+/g, '');
        link.download = `Gelap5-${featureName}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (e) {
        console.error("Download failed:", e);
        // Fallback
        const link = document.createElement('a');
        link.href = resultImage;
        const featureName = tool.label.replace(/\s+/g, '');
        link.download = `Gelap5-${featureName}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleSaveToGallery = async () => {
    if (!resultImage) return;
    
    setIsSaving(true);
    try {
      await saveAsset({
        id: crypto.randomUUID(),
        type: 'generated',
        data: resultImage,
        prompt: prompt || tool.label,
        timestamp: Date.now(),
        title: `${tool.label} Generation`
      });
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save to gallery", err);
      // Optional: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
          <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <tool.icon className="w-6 h-6 text-zinc-300" />
          </div>
          {tool.label}
        </h2>
        <p className="text-zinc-400 max-w-2xl text-sm md:text-base pl-1">
          {tool.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        {/* Input Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 shadow-sm backdrop-blur-md">
            
            {/* Image Upload Area */}
            <div className="mb-6">
               <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                 Reference Image {tool.requiresImage && <span className="text-red-500">*</span>}
               </label>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`
                   relative group cursor-pointer border border-dashed rounded-lg h-48 flex flex-col items-center justify-center transition-all duration-300
                   ${previewUrl ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30'}
                 `}
               >
                 {previewUrl ? (
                   <img src={previewUrl} alt="Preview" className="h-full w-full object-contain rounded-lg p-1" />
                 ) : (
                   <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-300">
                     <Upload size={24} className="mb-2" />
                     <span className="text-sm font-medium">Click to upload</span>
                     <span className="text-xs text-zinc-600 mt-1">JPG, PNG up to 5MB</span>
                   </div>
                 )}
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   className="hidden" 
                   accept="image/*"
                 />
                 {previewUrl && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <p className="text-white text-sm font-medium">Change Image</p>
                    </div>
                 )}
               </div>
            </div>

            {/* Prompt Area */}
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Prompt Details
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={tool.promptPlaceholder}
                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-4 text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-lime-500/50 min-h-[140px] resize-none placeholder-zinc-700 backdrop-blur-sm"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`
                w-full py-4 rounded-lg font-medium text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2
                ${isGenerating 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  PROCESSING...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  GENERATE
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-8">
           <div className="h-full bg-zinc-900/20 border border-zinc-800/40 rounded-xl flex items-center justify-center relative overflow-hidden backdrop-blur-md min-h-[500px]">
             {resultImage ? (
               <div className="relative w-full h-full flex items-center justify-center bg-black/40">
                 <img src={resultImage} alt="Generated result" className="max-h-full max-w-full object-contain shadow-2xl" />
                 
                 {/* Action Bar */}
                 <div className="absolute bottom-6 right-6 flex gap-3">
                    <button 
                      onClick={handleSaveToGallery}
                      disabled={isSaved || isSaving}
                      className={`
                        p-3 rounded-full backdrop-blur-md border transition-all flex items-center gap-2
                        ${isSaved 
                          ? 'bg-lime-500/20 border-lime-500/50 text-lime-400' 
                          : 'bg-black/80 hover:bg-zinc-800 text-white border-zinc-800'
                        }
                      `}
                      title={isSaved ? "Saved to Library" : "Save to Library"}
                    >
                      {isSaving ? <RefreshCw size={20} className="animate-spin" /> : 
                       isSaved ? <Check size={20} /> : <Save size={20} />}
                    </button>

                    <button 
                      onClick={handleDownload}
                      className="bg-white text-black hover:bg-zinc-200 p-3 rounded-full backdrop-blur-md border border-transparent shadow-lg transition-colors"
                      title="Download to Device"
                    >
                      <Download size={20} />
                    </button>
                 </div>
               </div>
             ) : (
               <div className="text-center p-8">
                 {isGenerating ? (
                   <div className="flex flex-col items-center animate-pulse">
                     <div className="w-16 h-16 border-4 border-zinc-800 border-t-zinc-600 rounded-full animate-spin mb-4"></div>
                     <p className="text-zinc-500 font-medium tracking-wide">Creating masterpiece...</p>
                     <p className="text-zinc-600 text-xs mt-2">Powered by Gemini 2.5</p>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center text-zinc-700">
                     <div className="w-20 h-20 bg-zinc-900/40 rounded-full flex items-center justify-center mb-4 border border-zinc-800/50">
                       <ImageIcon size={32} />
                     </div>
                     <p className="text-lg font-medium text-zinc-600">No output generated yet</p>
                     <p className="text-sm text-zinc-700 mt-2 max-w-xs">
                       Configure your settings on the left and hit Generate to see the magic happen.
                     </p>
                   </div>
                 )}
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ToolInterface;