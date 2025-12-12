import React, { useState } from 'react';
import { Key, ArrowRight, ExternalLink, ShieldCheck, X, Loader2, AlertCircle, Tag } from 'lucide-react';
import Logo from './Logo';
import { verifyApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  onSubmit: (key: string, projectName?: string) => void;
  logoSrc?: string | null;
  onClose?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit, logoSrc, onClose }) => {
  const [inputKey, setInputKey] = useState('');
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      await verifyApiKey(inputKey.trim());
      // Only call onSubmit if verification succeeds
      onSubmit(inputKey.trim(), projectName.trim() || 'JRS Project');
    } catch (err: any) {
      let msg = "Failed to verify API Key.";
      
      // Attempt to parse common error messages
      const errorMessage = err.message || JSON.stringify(err);
      
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        msg = "Invalid API Key. Please check your key and try again.";
      } else if (errorMessage.includes('429')) {
        msg = "Quota exceeded. Please check your plan or try again later.";
      } else if (errorMessage.includes('400')) {
        msg = "Invalid request. Your API key format might be incorrect.";
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
         msg = "Connection failed. Please check your internet.";
      }

      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in">
         <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      </div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl animate-slide-in">
        
        {/* Close Button - only show if not strictly verifying to avoid closing mid-request */}
        {onClose && !isVerifying && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-200 transition-colors p-2"
            title="Close"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-zinc-700">
            <Logo className="w-10 h-10" src={logoSrc} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Gelap 5.0</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            To start creating professional studio content, please enter your Google Gemini API Key.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            {/* Project Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pl-1 flex justify-between">
                <span>Project Name</span>
                <span className="text-zinc-600 font-normal lowercase tracking-normal">(optional)</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag size={16} className="text-zinc-500 group-focus-within:text-lime-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. My Creative Studio"
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500/50 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pl-1">
                Gemini API Key
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={16} className={`transition-colors ${error ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-lime-400'}`} />
                </div>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setError('');
                  }}
                  disabled={isVerifying}
                  placeholder="AIza..."
                  className={`
                    w-full bg-black/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-700 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    ${error 
                      ? 'border-red-900/50 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-zinc-800 focus:ring-lime-500/50 focus:border-lime-500/50'
                    }
                  `}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs pl-1 animate-fade-in">
                  <AlertCircle size={12} />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || !inputKey}
            className={`
              w-full font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg
              ${isVerifying || !inputKey
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-zinc-200 shadow-white/5'
              }
            `}
          >
            {isVerifying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying Key...</span>
              </>
            ) : (
              <>
                <span>Enter Studio</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col gap-4 text-center">
           <a 
             href="https://aistudio.google.com/app/apikey" 
             target="_blank" 
             rel="noopener noreferrer"
             className="inline-flex items-center justify-center gap-2 text-xs text-lime-400 hover:text-lime-300 transition-colors"
           >
             Get your API Key here <ExternalLink size={12} />
           </a>
           <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600">
             <ShieldCheck size={12} />
             <span>Your key is stored locally in your browser</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;