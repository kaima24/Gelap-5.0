import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import ToolInterface from './components/ToolInterface';
import { ToolType, ToolConfig } from './types';

// Tool Definitions
const TOOLS: ToolConfig[] = [
  {
    id: ToolType.ProductPhoto,
    label: 'Product Photo Studio',
    icon: ShoppingBag,
    description: 'Transform simple product shots into professional studio masterpieces. Upload your product and describe the setting.',
    promptPlaceholder: 'e.g., A minimalist marble podium with soft morning sunlight casting long shadows...',
    requiresImage: true
  },
  {
    id: ToolType.FashionCatalogue,
    label: 'Fashion Catalogue',
    icon: BookOpen,
    description: 'Create stunning fashion catalogue entries. Generate models wearing specific styles or enhance garment photos.',
    promptPlaceholder: 'e.g., A model wearing a beige trench coat walking down a Parisian street in autumn...',
    requiresImage: false
  },
  {
    id: ToolType.FashionMixMatch,
    label: 'Fashion Mix & Match',
    icon: Scissors,
    description: 'Visualize outfit combinations. Upload garment items to see how they look together or generate style pairings.',
    promptPlaceholder: 'e.g., Combine a denim jacket with a floral summer dress, street style aesthetic...',
    requiresImage: true
  },
  {
    id: ToolType.HireModel,
    label: 'Hire Model for Brand',
    icon: Users,
    description: 'Generate diverse, photorealistic AI models for your brand campaigns without booking a physical shoot.',
    promptPlaceholder: 'e.g., A diverse group of young adults laughing at a rooftop party, warm lighting...',
    requiresImage: false
  },
  {
    id: ToolType.PhotoStudio,
    label: 'Photo Studio',
    icon: Camera,
    description: 'General purpose professional photography generation. Control lighting, composition, and subject matter.',
    promptPlaceholder: 'e.g., A cinematic portrait of a cyberpunk chef cooking in a neon-lit kitchen...',
    requiresImage: false
  },
  {
    id: ToolType.PreWedding,
    label: 'PreWedding',
    icon: Heart,
    description: 'Visualize pre-wedding shoot concepts. Create romantic, dreamy scenes to plan your perfect photoshoot.',
    promptPlaceholder: 'e.g., A couple holding hands on a cliff overlooking the ocean at sunset, ethereal style...',
    requiresImage: false
  },
  {
    id: ToolType.Rebrand,
    label: 'Rebrand',
    icon: Palette,
    description: 'Explore new visual identities. Generate logo concepts, color palettes, and brand mockups.',
    promptPlaceholder: 'e.g., A modern, minimalist logo for a sustainable coffee brand named "Verde", green and earth tones...',
    requiresImage: false
  },
  {
    id: ToolType.Mockup,
    label: 'Mockup',
    icon: Box,
    description: 'Place your designs on realistic 3D objects. Perfect for packaging, merchandise, and print previews.',
    promptPlaceholder: 'e.g., A clean white t-shirt hanging on a wooden rack against a concrete wall...',
    requiresImage: true
  }
];

function App() {
  const [loadingApp, setLoadingApp] = useState(true);
  const [activeToolId, setActiveToolId] = useState<ToolType>(ToolType.ProductPhoto);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTool = TOOLS.find(t => t.id === activeToolId) || TOOLS[0];

  if (loadingApp) {
    return <SplashScreen onComplete={() => setLoadingApp(false)} />;
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-white/20">
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full z-40 bg-black/90 backdrop-blur-md border-b border-zinc-900 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Camera size={20} className="text-white" />
           <span className="font-bold tracking-widest text-sm">GELAP 5.0</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-300 hover:text-white">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-zinc-950 border-r border-zinc-900 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-8 hidden lg:flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold">
            G
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">GELAP<span className="text-zinc-600">5.0</span></h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">AI Creative Studio</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveToolId(tool.id);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${activeToolId === tool.id 
                  ? 'bg-zinc-900 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }
              `}
            >
              <tool.icon 
                size={18} 
                className={`transition-colors ${activeToolId === tool.id ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} 
              />
              {tool.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-900">
           <div className="bg-zinc-900/50 rounded-lg p-4 text-xs text-zinc-500">
             <p className="mb-2">Logged in as Creator</p>
             <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full w-3/4 bg-white/20"></div>
             </div>
             <p className="mt-2 text-right">750/1000 credits</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden pt-16 lg:pt-0 bg-black">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-40 pointer-events-none"></div>
         
         <ToolInterface key={activeTool.id} tool={activeTool} />
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