import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Logo from './Logo';

interface SplashScreenProps {
  onComplete: () => void;
  logoSrc?: string | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, logoSrc }) => {
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
      {/* Background Grid for Splash */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] pointer-events-none"></div>
      
      <div className="relative flex items-center justify-center w-32 h-32 mb-8">
        <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-ping opacity-20"></div>
        <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
        
        {/* Logo Container */}
        <div className="z-10 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-[0_0_50px_rgba(255,255,255,0.15)] backdrop-blur-xl">
           <Logo className="w-16 h-16" src={logoSrc} />
        </div>
        
        <div className="absolute -top-4 -right-4">
            <Sparkles size={28} className="text-blue-400 animate-pulse" />
        </div>
      </div>
      
      <h1 className="text-5xl font-bold tracking-[0.2em] text-white mb-3 animate-fade-in relative z-10">
        GELAP<span className="font-light text-zinc-500">5.0</span>
      </h1>
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-500 to-transparent mb-3 opacity-50"></div>
      <p className="text-xs text-zinc-400 uppercase tracking-[0.3em] animate-slide-in relative z-10" style={{ animationDelay: '0.2s' }}>
        All-in-One AI Studio
      </p>
    </div>
  );
};

export default SplashScreen;