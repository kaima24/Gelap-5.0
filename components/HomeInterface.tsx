import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ToolConfig, ToolType } from '../types';
import { translations } from '../utils/translations';

interface HomeInterfaceProps {
  tools: ToolConfig[];
  onSelectTool: (id: ToolType) => void;
  lang: 'en' | 'id';
}

const HomeInterface: React.FC<HomeInterfaceProps> = ({ tools, onSelectTool, lang }) => {
  // Helper for translations
  const t = (key: string) => {
    const dict = translations[lang] as any;
    return dict[key] || key;
  };

  // Filter out the Home tool itself so it doesn't appear in the grid
  const featureTools = tools.filter(t => t.id !== ToolType.Home);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 animate-fade-in relative z-10">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 py-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm mb-4">
          <Sparkles size={16} className="text-blue-400" />
          <span className="text-xs font-medium text-zinc-400 tracking-wider uppercase">{t('home.new_features')}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
          {t('home.hero_title_1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">{t('home.hero_title_2')}</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          {t('home.hero_subtitle')}
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureTools.map((tool) => {
          // Logic matching the Sidebar
          const isProductPhoto = tool.id === ToolType.ProductPhoto;
          
          // Only ProductPhoto is active (Home is filtered out of featureTools)
          const isActive = isProductPhoto;
          const isDisabled = !isActive;

          // Badges
          const showNewBadge = isProductPhoto;
          const showSoonBadge = isDisabled;

          return (
            <button
              key={tool.id}
              onClick={() => !isDisabled && onSelectTool(tool.id)}
              disabled={isDisabled}
              className={`
                group relative flex flex-col items-start p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 transition-all duration-300 backdrop-blur-sm text-left overflow-hidden h-full
                ${isDisabled 
                  ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' 
                  : 'hover:bg-zinc-900/60 hover:border-zinc-700 cursor-pointer'
                }
              `}
            >
              {/* Hover Gradient Background */}
              {!isDisabled && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              )}
              
              <div className="relative z-10 w-full flex flex-col h-full">
                <div className={`
                  relative mb-6 inline-flex p-3 rounded-xl border transition-colors shadow-lg
                  ${isDisabled 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-600' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 group-hover:text-white group-hover:border-zinc-700'
                  }
                `}>
                  <tool.icon size={24} />

                  {/* Badges - Inside Icon Box */}
                  {(showSoonBadge || showNewBadge) && (
                    <div className="absolute -top-2 -right-3 shadow-md z-20">
                      {showSoonBadge ? (
                         <span className="flex items-center justify-center text-[9px] font-extrabold tracking-wider text-amber-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-amber-500/30">
                            {t('home.soon_badge')}
                         </span>
                      ) : (
                         <span className="flex items-center justify-center text-[9px] font-extrabold tracking-wider text-emerald-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {t('home.new')}
                         </span>
                      )}
                    </div>
                  )}
                </div>
                
                <h3 className={`text-lg font-semibold mb-2 transition-colors ${isDisabled ? 'text-zinc-500' : 'text-white group-hover:text-blue-100'}`}>
                  {tool.label}
                </h3>
                
                <p className={`text-sm leading-relaxed mb-6 transition-colors line-clamp-3 ${isDisabled ? 'text-zinc-600' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                  {tool.description}
                </p>
                
                <div className={`
                  flex items-center text-xs font-bold tracking-widest uppercase mt-auto pt-4 border-t w-full transition-colors
                  ${isDisabled 
                    ? 'border-zinc-800/30 text-zinc-700' 
                    : 'border-zinc-800/50 text-zinc-600 group-hover:text-blue-400'
                  }
                `}>
                  {isDisabled ? t('home.soon') : t('home.launch')}
                  {!isDisabled && <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomeInterface;