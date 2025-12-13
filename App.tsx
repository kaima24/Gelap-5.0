import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  BookOpen, 
  Scissors, 
  Users, 
  Camera, 
  Heart, 
  Palette, 
  Box, 
  Menu, 
  X, 
  Home, 
  Key, 
  ShieldCheck, 
  Layers, 
  Activity, 
  UserPlus, 
  Baby, 
  Zap, 
  Languages, 
  Globe
} from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import ToolInterface from './components/ToolInterface';
import HomeInterface from './components/HomeInterface';
import GalleryInterface from './components/GalleryInterface';
import ProductPhotoStudio from './components/ProductPhotoStudio';
import MockupStudio from './components/MockupStudio';
import PhotoStudio from './components/PhotoStudio';
import HireModelStudio from './components/HireModelStudio';
import CharacterStudio from './components/CharacterStudio'; // Import new component
import ApiKeyModal from './components/ApiKeyModal';
import Logo from './components/Logo';
import { ToolType, ToolConfig } from './types';
import { getDailyUsage, DAILY_LIMIT } from './services/usageService';
import { translations } from './utils/translations';

// Define the structure for dynamic tools generation
const getTools = (t: any): ToolConfig[] => [
  {
    id: ToolType.Home,
    label: t['tool.home'],
    icon: Home,
    description: t['tool.home.desc'],
    requiresImage: false
  },
  {
    id: ToolType.ProductPhoto,
    label: t['tool.product'],
    icon: ShoppingBag,
    description: t['tool.product.desc'],
    promptPlaceholder: 'e.g., A minimalist marble podium with soft morning sunlight casting long shadows...',
    requiresImage: true
  },
  {
    id: ToolType.PhotoStudio,
    label: t['tool.photo'],
    icon: Camera,
    description: t['tool.photo.desc'],
    promptPlaceholder: 'e.g., A cinematic portrait of a cyberpunk chef cooking in a neon-lit kitchen...',
    requiresImage: false
  },
  {
    id: ToolType.HireModel,
    label: t['tool.model'],
    icon: Users,
    description: t['tool.model.desc'],
    promptPlaceholder: 'e.g., A diverse group of young adults laughing at a rooftop party, warm lighting...',
    requiresImage: false
  },
  {
    id: ToolType.CharacterGenerator,
    label: t['tool.character'],
    icon: UserPlus,
    description: t['tool.character.desc'],
    promptPlaceholder: 'e.g., An elven archer with silver hair, wearing intricate leather armor, forest background...',
    requiresImage: true
  },
  {
    id: ToolType.Mockup,
    label: t['tool.mockup'],
    icon: Box,
    description: t['tool.mockup.desc'],
    promptPlaceholder: 'e.g., A clean white t-shirt hanging on a wooden rack against a concrete wall...',
    requiresImage: true
  },
  {
    id: ToolType.GeneratePose,
    label: t['tool.pose'],
    icon: Activity,
    description: t['tool.pose.desc'],
    promptPlaceholder: 'e.g., A dynamic superhero landing pose, low angle view, highly detailed muscle definition...',
    requiresImage: false
  },
  {
    id: ToolType.FashionCatalogue,
    label: t['tool.catalogue'],
    icon: BookOpen,
    description: t['tool.catalogue.desc'],
    promptPlaceholder: 'e.g., A model wearing a beige trench coat walking down a Parisian street in autumn...',
    requiresImage: false
  },
  {
    id: ToolType.FashionMixMatch,
    label: t['tool.mixmatch'],
    icon: Scissors,
    description: t['tool.mixmatch.desc'],
    promptPlaceholder: 'e.g., Combine a denim jacket with a floral summer dress, street style aesthetic...',
    requiresImage: true
  },
  {
    id: ToolType.PreWedding,
    label: t['tool.prewedding'],
    icon: Heart,
    description: t['tool.prewedding.desc'],
    promptPlaceholder: 'e.g., A couple holding hands on a cliff overlooking the ocean at sunset, ethereal style...',
    requiresImage: false
  },
  {
    id: ToolType.BabyPhoto,
    label: t['tool.baby'],
    icon: Baby,
    description: t['tool.baby.desc'],
    promptPlaceholder: 'e.g., A newborn sleeping in a wicker basket filled with white clouds, soft pastel lighting...',
    requiresImage: false
  },
  {
    id: ToolType.Gallery,
    label: t['tool.gallery'],
    icon: Layers,
    description: t['tool.gallery.desc'],
    requiresImage: false
  }
];

function App() {
  const [loadingApp, setLoadingApp] = useState(true);
  
  // Initialize from process.env first (default), then localStorage
  const [apiKey, setApiKey] = useState<string>(() => process.env.API_KEY || localStorage.getItem('gelap_api_key') || '');
  const [projectName, setProjectName] = useState<string>(() => localStorage.getItem('gelap_project_name') || 'JRS Project');
  
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [activeToolId, setActiveToolId] = useState<ToolType>(ToolType.Home);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  
  // Language State
  const [language, setLanguage] = useState<'en' | 'id'>('en');
  
  // Usage State
  const [dailyUsage, setDailyUsage] = useState(0);
  
  // App Version Info
  const APP_VERSION = "v5.1.7";
  const UPDATE_DATE = "Dec 13, 2025 • 18:10 PM";

  useEffect(() => {
    // Load usage on mount
    setDailyUsage(getDailyUsage());
  }, []);

  // Use callback to ensure stable reference and prevent splash timer resets
  const handleSplashComplete = useCallback(() => {
    setLoadingApp(false);
  }, []);

  const handleKeySubmit = (key: string, name?: string) => {
    setApiKey(key);
    const pName = name || 'JRS Project';
    setProjectName(pName);
    localStorage.setItem('gelap_api_key', key);
    localStorage.setItem('gelap_project_name', pName);
    setShowKeyModal(false);
  };

  const handleUsageUpdate = () => {
    setDailyUsage(getDailyUsage());
  };

  const getMaskedKey = (key: string) => {
    if (!key) return 'Not connected';
    return 'XXX........API_Key';
  };

  const t = (key: string) => {
    const dict = translations[language] as any;
    return dict[key] || key;
  };

  // Generate tools based on current language
  const currentTools = getTools(translations[language]);
  const activeTool = currentTools.find(t => t.id === activeToolId) || currentTools[0];
  const usagePercentage = Math.min((dailyUsage / DAILY_LIMIT) * 100, 100);

  if (loadingApp) {
    return <SplashScreen onComplete={handleSplashComplete} logoSrc={logoSrc} />;
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-lime-500/30 selection:text-lime-200 relative">
      
      {/* API Key Modal Overlay */}
      {showKeyModal && (
        <ApiKeyModal 
          onSubmit={handleKeySubmit} 
          logoSrc={logoSrc} 
          onClose={apiKey ? () => setShowKeyModal(false) : undefined}
        />
      )}

      {/* BACKGROUND (Lime Tech Style) */}
      <div className="absolute inset-0 z-0 w-full h-full bg-black pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:50px_50px]" />
        
        {/* Vignette / Fade */}
        <div className="absolute inset-0 bg-black/40 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        
        {/* Top Glow Spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-lime-500/10 blur-[120px] rounded-full opacity-60" />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800 p-4 flex justify-between items-center">
        <button 
          onClick={() => {
            setActiveToolId(ToolType.Home);
            setIsSidebarOpen(false);
          }}
          className="flex items-center gap-3 focus:outline-none group"
        >
           <Logo className="w-6 h-6 transition-transform group-hover:scale-105" src={logoSrc} />
           <span className="font-bold tracking-widest text-sm group-hover:text-lime-400 transition-colors">GELAP 5.0</span>
        </button>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-300 hover:text-white">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-80 bg-black/60 backdrop-blur-xl border-r border-zinc-800/60 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header (Desktop) */}
        <div className="p-8 hidden lg:flex items-center gap-3 mb-2 shrink-0">
          {/* Logo - Fixed Default */}
          <div 
            className="group/logo relative w-10 h-10 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center shadow-lg overflow-hidden cursor-pointer"
            onClick={() => setActiveToolId(ToolType.Home)}
          >
             <Logo className="w-6 h-6 transition-transform group-hover/logo:scale-110" src={logoSrc} />
          </div>
          
          <div 
            className="cursor-pointer group"
            onClick={() => setActiveToolId(ToolType.Home)}
          >
            <h1 className="text-lg font-bold tracking-wider text-white group-hover:text-lime-200 transition-colors">GELAP<span className="text-lime-500 group-hover:text-lime-400">5.0</span></h1>
            <p className="text-xs text-zinc-400 font-medium tracking-wide group-hover:text-white transition-colors">AI Creative Studio</p>
          </div>
        </div>

        {/* Scrollable Container (Nav + Footer) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {/* Navigation */}
          <nav className="px-4 py-4 pt-20 lg:pt-4 space-y-1">
            {currentTools.map((tool) => {
              const isHome = tool.id === ToolType.Home;
              const isProductPhoto = tool.id === ToolType.ProductPhoto;
              const isMockup = tool.id === ToolType.Mockup;
              const isPhotoStudio = tool.id === ToolType.PhotoStudio;
              const isHireModel = tool.id === ToolType.HireModel;
              const isCharacter = tool.id === ToolType.CharacterGenerator;
              
              // Allowed tools
              const isActive = isHome || isProductPhoto || isMockup || isPhotoStudio || isHireModel || isCharacter;
              const isDisabled = !isActive;
              
              // Badge logic
              const showNewBadge = isProductPhoto || isMockup || isPhotoStudio || isHireModel || isCharacter;
              const showSoonBadge = isDisabled && !isHome;

              return (
                <button
                  key={tool.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    setActiveToolId(tool.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden
                    ${activeToolId === tool.id 
                      ? 'bg-zinc-900/80 text-lime-400 border border-zinc-800 shadow-[0_0_15px_rgba(163,230,53,0.15)]' 
                      : isDisabled 
                        ? 'text-zinc-600 opacity-50 cursor-not-allowed'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/30'
                    }
                  `}
                >
                  {activeToolId === tool.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-lime-500 rounded-l-lg shadow-[0_0_10px_rgba(163,230,53,0.5)]"></div>
                  )}
                  <tool.icon 
                    size={18} 
                    className={`transition-colors relative z-10 ${activeToolId === tool.id ? 'text-lime-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} 
                  />
                  <span className="relative z-10 whitespace-nowrap">{tool.label}</span>
                  
                  {showSoonBadge && (
                    <span className="ml-auto relative z-10 text-[9px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {t('home.soon_badge')}
                    </span>
                  )}
                  
                  {showNewBadge && (
                    <span className="ml-auto relative z-10 text-[9px] uppercase tracking-wider font-bold text-lime-500 bg-lime-500/10 px-1.5 py-0.5 rounded border border-lime-500/20">
                      {t('home.new')}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-zinc-800/50 flex flex-col gap-3 mt-auto">
             
             {/* Version Info */}
             <div className="text-center px-1 mb-1">
                <p className="text-[9px] text-zinc-600 font-mono tracking-wide">{APP_VERSION} ({UPDATE_DATE})</p>
             </div>

             {/* Language Switcher */}
             <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-2 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-2 pl-2">
                   <Globe size={14} className="text-zinc-500" />
                   <span className="text-xs font-medium text-zinc-400">{t('footer.language')}</span>
                </div>
                <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                   <button 
                     onClick={() => setLanguage('en')}
                     className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'en' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     EN
                   </button>
                   <button 
                     onClick={() => setLanguage('id')}
                     className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'id' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     ID
                   </button>
                </div>
             </div>

             {/* Account Status Box */}
             <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 backdrop-blur-sm">
               <div className="flex items-center gap-3">
                  {/* Avatar / Icon */}
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lime-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-lime-500/20">
                     <ShieldCheck size={16} />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-white truncate pr-2">{projectName}</p>
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-lime-500 shadow-[0_0_8px_rgba(163,230,53,0.5)]"></span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono truncate" title={apiKey}>
                      {getMaskedKey(apiKey)}
                    </p>
                  </div>
               </div>
               
               {/* Token Status Info with Slider Preview */}
               <div className="mt-4 pt-3 border-t border-zinc-800/50">
                 <div className="flex justify-between items-center text-[10px] mb-1.5">
                   <div className="flex items-center gap-1.5 text-zinc-400">
                      <Zap size={10} className="text-yellow-500" />
                      <span className="uppercase tracking-wider font-semibold">{t('footer.token')}</span>
                   </div>
                   <span className={`font-mono ${dailyUsage >= DAILY_LIMIT ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                     {dailyUsage}/{DAILY_LIMIT}
                   </span>
                 </div>
                 
                 {/* Custom Range Slider Preview */}
                 <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                   {/* Progress Bar */}
                   <div 
                     className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out 
                       ${dailyUsage >= DAILY_LIMIT 
                         ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                         : 'bg-gradient-to-r from-lime-600 via-lime-500 to-emerald-500'
                       }
                     `}
                     style={{ width: `${usagePercentage}%` }}
                   />
                   
                   {/* Slider Thumb Visualization (Decorative) */}
                   <div 
                     className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-lg transition-all duration-700 ease-out"
                     style={{ 
                       left: `calc(${usagePercentage}% - 6px)` 
                     }}
                   />
                 </div>
                 
                 <p className="text-[9px] text-zinc-600 mt-1.5 text-right">
                   {t('footer.reset')}
                 </p>
               </div>
             </div>

             <button 
               onClick={() => setShowKeyModal(true)}
               className="w-full flex items-center justify-center gap-2 px-2 py-3 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800/50 transition-all group"
               title="Change API Key"
             >
               <Key size={14} className="group-hover:text-lime-400 transition-colors" />
               <span className="truncate">{t('footer.manage_key')}</span>
             </button>

             {/* Contact Me Button */}
             <a 
               href="https://wa.me/6282220242750?text=Halo%20saya%20tertarik%20dengan%20apps%20anda"
               target="_blank"
               rel="noopener noreferrer"
               className="w-full flex items-center justify-center gap-2 px-2 py-3 rounded-lg text-xs font-medium text-zinc-500 hover:text-white hover:bg-lime-900/20 border border-transparent hover:border-lime-500/30 transition-all group"
               title="Contact Creator via WhatsApp"
             >
               <svg 
                 width="14" 
                 height="14" 
                 viewBox="0 0 2176 2176" 
                 fill="currentColor" 
                 xmlns="http://www.w3.org/2000/svg"
                 className="group-hover:text-lime-400 transition-colors"
               >
                 <path d="M1077.41 496.859C1241.6 506.334 1369.15 573.602 1443.39 718.085C1517.64 863.043 1507.64 1008 1413.88 1143.48C1388.18 1180.91 1361.53 1217.38 1358.68 1264.28C1353.44 1347.66 1413.88 1421.56 1496.69 1432.93C1579.98 1444.29 1658.98 1388.87 1677.55 1306.44C1692.3 1238.7 1665.65 1173.33 1604.25 1135.43C1574.27 1116.96 1563.32 1095.16 1571.89 1060.58C1581.88 1020.79 1587.6 980.051 1595.69 939.785C1604.73 894.308 1628.53 880.097 1672.79 896.677C1794.62 943.101 1871.72 1032.63 1910.27 1154.38C1986.9 1396.92 1820.8 1646.57 1566.66 1675.94C1315.37 1704.84 1097.87 1501.61 1112.15 1250.54C1116.43 1176.64 1142.61 1109.38 1183.06 1047.32C1202.1 1017.47 1222.09 987.631 1235.41 954.944C1275.87 856.411 1198.29 772.089 1132.61 750.772C1047.9 723.296 953.19 770.668 928.918 854.042C915.116 901.414 928.918 947.838 937.961 994.263C951.287 1064.85 966.992 1134.96 978.89 1205.54C1009.83 1388.87 905.122 1539.04 763.773 1611.99C594.82 1699.63 382.558 1655.57 262.15 1507.77C239.305 1479.35 241.209 1455.66 269.288 1431.98C302.603 1403.55 335.918 1375.61 369.232 1347.66C403.975 1318.76 423.964 1320.18 453.947 1353.34C526.287 1432.93 645.268 1430.56 708.566 1348.6C739.977 1307.39 742.832 1261.44 733.314 1213.59C719.512 1143.01 703.806 1073.37 689.529 1002.79C669.54 902.835 668.112 804.302 721.416 712.875C800.419 576.444 921.303 505.86 1077.41 496.859Z" />
               </svg>
               <span className="truncate">{t('footer.contact')}</span>
             </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
         {/* Persistent Components for Heavy Tools (State Preservation) */}
         <div style={{ display: activeToolId === ToolType.ProductPhoto ? 'block' : 'none' }} className="h-full">
            <ProductPhotoStudio 
              apiKey={apiKey}
              onUsageUpdate={handleUsageUpdate}
              lang={language}
            />
         </div>
         <div style={{ display: activeToolId === ToolType.Mockup ? 'block' : 'none' }} className="h-full">
            <MockupStudio
              apiKey={apiKey}
              onUsageUpdate={handleUsageUpdate}
              lang={language}
            />
         </div>
         <div style={{ display: activeToolId === ToolType.PhotoStudio ? 'block' : 'none' }} className="h-full">
            <PhotoStudio
              apiKey={apiKey}
              onUsageUpdate={handleUsageUpdate}
              lang={language}
            />
         </div>
         <div style={{ display: activeToolId === ToolType.HireModel ? 'block' : 'none' }} className="h-full">
            <HireModelStudio
              apiKey={apiKey}
              onUsageUpdate={handleUsageUpdate}
              lang={language}
            />
         </div>
         <div style={{ display: activeToolId === ToolType.CharacterGenerator ? 'block' : 'none' }} className="h-full">
            <CharacterStudio
              apiKey={apiKey}
              onUsageUpdate={handleUsageUpdate}
              lang={language}
            />
         </div>

         {/* Standard Components (Unmount on switch) */}
         {activeToolId === ToolType.Home && (
            <HomeInterface tools={currentTools} onSelectTool={setActiveToolId} lang={language} />
         )}
         
         {activeToolId === ToolType.Gallery && (
            <GalleryInterface />
         )}

         {!['home', 'gallery', 'product-photo', 'mockup', 'photo-studio', 'hire-model', 'character-generator'].includes(activeToolId) && (
            <ToolInterface 
              key={activeTool.id} 
              tool={activeTool} 
              apiKey={apiKey}
            />
         )}
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;