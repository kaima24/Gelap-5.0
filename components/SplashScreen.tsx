import React, { useEffect, useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for fade out
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
        <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-ping opacity-20"></div>
        <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
        <div className="z-10 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
           <Camera size={40} className="text-white" />
        </div>
        <div className="absolute -top-2 -right-2">
            <Sparkles size={24} className="text-blue-400 animate-pulse" />
        </div>
      </div>
      
      <h1 className="text-4xl font-bold tracking-[0.2em] text-white mb-2 animate-fade-in">
        GELAP<span className="font-light text-zinc-500">5.0</span>
      </h1>
      <p className="text-xs text-zinc-500 uppercase tracking-widest animate-slide-in" style={{ animationDelay: '0.2s' }}>
        All-in-One AI Studio
      </p>
    </div>
  );
};

export default SplashScreen;