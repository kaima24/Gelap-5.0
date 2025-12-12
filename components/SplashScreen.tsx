import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Terminal } from 'lucide-react';
import Logo from './Logo';

interface SplashScreenProps {
  onComplete: () => void;
  logoSrc?: string | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, logoSrc }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showText, setShowText] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Sequence timing
    setTimeout(() => setShowText(true), 400); 

    // Fake loading counter
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 5) + 1;
      });
    }, 40);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 600); // Wait for exit animation
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden transition-all duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 blur-md scale-105'}`}>
      
      {/* Tech Background Grid */}
      <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:60px_60px] perspective-[500px] pointer-events-none origin-center animate-[spin_120s_linear_infinite_reverse] opacity-20 scale-[1.5]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
      
      {/* Dynamic Lime Glows - More subtle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-lime-500/5 blur-[120px] rounded-full animate-pulse"></div>

      <div className="relative flex flex-col items-center justify-center z-10 w-full max-w-2xl">
        
        {/* Logo Section - SLAM IN */}
        <div className="relative mb-8 group animate-slam-in">
           <div className="relative z-10">
             <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-950 p-2 rounded-[2rem] border border-zinc-800 shadow-[0_0_30px_rgba(163,230,53,0.15)] flex items-center justify-center relative overflow-hidden ring-1 ring-zinc-800/50">
                {/* Internal Tech Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-lime-500/10 to-transparent w-[200%] h-full animate-shimmer"></div>
                
                <Logo className="w-16 h-16 md:w-20 md:h-20 relative z-10 rounded-xl" src={logoSrc} />
             </div>
             
             {/* Pop Elements - Smaller & Elegant */}
             <div className="absolute -top-6 -right-6 animate-[bounce_2s_infinite]">
                 <Sparkles size={24} className="text-lime-400/80 drop-shadow-[0_0_10px_rgba(163,230,53,0.5)] fill-lime-400/20" />
             </div>
           </div>
        </div>
        
        {/* Text Section - Elegant & Minimal */}
        {showText && (
          <div className="text-center relative mt-2">
            <div className="overflow-hidden mb-3">
              <h1 className="text-3xl md:text-5xl font-light tracking-[0.25em] text-white animate-slide-up leading-tight flex items-center justify-center gap-3 drop-shadow-xl font-sans">
                GELAP
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 to-emerald-400 font-normal tracking-[0.1em] relative">
                  5.0
                  <span className="absolute inset-0 bg-lime-400/10 blur-xl animate-pulse"></span>
                </span>
              </h1>
            </div>
            
            <div className="flex flex-col items-center gap-4">
               {/* Elegant Thin Divider */}
               <div className="h-[1px] w-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto animate-expand-width"></div>
               
               <div className="flex items-center gap-2 animate-fade-in opacity-0 translate-y-2" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                 <Terminal size={12} className="text-lime-500/70" />
                 <p className="text-[10px] md:text-xs text-zinc-500 font-mono tracking-[0.2em] uppercase">
                   AI Creative Studio
                 </p>
               </div>
            </div>
          </div>
        )}

        {/* Loading Bar at Bottom - Minimalist */}
        <div className="absolute -bottom-24 w-48 md:w-64 opacity-60">
           <div className="flex justify-between text-[9px] font-mono text-lime-500/70 mb-1 tracking-wider">
              <span>SYSTEM LOADING</span>
              <span>{Math.min(loadingProgress, 100)}%</span>
           </div>
           <div className="h-0.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-lime-500/80 shadow-[0_0_8px_rgba(163,230,53,0.4)] transition-all duration-75 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;