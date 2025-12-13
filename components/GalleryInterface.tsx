import React, { useEffect, useState } from 'react';
import { Download, Trash2, Search, Image as ImageIcon, Grid, Layers, ExternalLink } from 'lucide-react';
import { AssetItem } from '../types';
import { getAssets, deleteAsset, downloadAsset } from '../services/storageService';

const GalleryInterface: React.FC = () => {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'generated' | 'upload'>('all');
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const items = await getAssets();
      setAssets(items);
    } catch (error) {
      console.error("Failed to load assets", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this asset?')) {
      await deleteAsset(id);
      setAssets(prev => prev.filter(item => item.id !== id));
      if (selectedAsset?.id === id) setSelectedAsset(null);
    }
  };

  const handleDownload = (asset: AssetItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Create a safe filename from title or type
    const safeTitle = asset.title ? asset.title.replace(/[^a-zA-Z0-9]/g, '') : (asset.type === 'generated' ? 'Generated' : 'Upload');
    const filename = `Gelap5-${safeTitle}_${asset.timestamp}.png`;
    downloadAsset(asset.data, filename);
  };

  const filteredAssets = assets.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'upload') return item.type === 'upload' || item.type === 'logo';
    return item.type === 'generated';
  });

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
            <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <Layers className="w-6 h-6 text-zinc-300" />
            </div>
            Asset Library
          </h2>
          <p className="text-zinc-400 text-sm pl-1 mt-1">
            Manage your generated masterpieces and uploaded resources.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-zinc-900/40 p-1 rounded-lg border border-zinc-800 backdrop-blur-sm self-start">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${filter === 'all' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('generated')}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${filter === 'generated' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Generated
          </button>
          <button 
            onClick={() => setFilter('upload')}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${filter === 'upload' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Uploads
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto min-h-[500px] rounded-xl bg-zinc-900/20 border border-zinc-800/40 p-6 backdrop-blur-md">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Grid size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No assets found</p>
            <p className="text-sm">Generate some images or upload assets to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                onClick={() => setSelectedAsset(asset)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50 cursor-pointer shadow-sm hover:shadow-xl hover:border-zinc-500 transition-all duration-300"
              >
                <img 
                  src={asset.data} 
                  alt={asset.title || 'Asset'} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                   <div className="flex items-center justify-between gap-2">
                      <button 
                        onClick={(e) => handleDownload(asset, e)}
                        className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg backdrop-blur-sm transition-colors"
                        title="Download to Device"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(asset.id, e)}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg backdrop-blur-sm transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                   </div>
                   {asset.prompt && (
                     <p className="text-[10px] text-zinc-300 mt-2 line-clamp-2 leading-tight">
                       {asset.prompt}
                     </p>
                   )}
                </div>

                {/* Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[9px] text-zinc-300 border border-white/10">
                  {asset.type === 'generated' ? 'AI Generated' : 'Upload'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setSelectedAsset(null)}>
           <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <img 
                src={selectedAsset.data} 
                alt="Selected Asset" 
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl border border-zinc-800"
              />
              
              <div className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">
                      {selectedAsset.title || 'Untitled Asset'}
                    </h3>
                    <p className="text-zinc-400 text-xs font-mono">
                      {new Date(selectedAsset.timestamp).toLocaleString()}
                    </p>
                    {selectedAsset.prompt && (
                      <p className="text-zinc-300 text-sm mt-3 p-3 bg-black/40 rounded border border-zinc-800/50 italic">
                        "{selectedAsset.prompt}"
                      </p>
                    )}
                 </div>
                 
                 <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={() => handleDownload(selectedAsset)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <Download size={16} /> Save to Device
                    </button>
                    <button 
                       onClick={(e) => handleDelete(selectedAsset.id, e)}
                       className="p-2.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                    >
                      <Trash2 size={20} />
                    </button>
                 </div>
              </div>

              <button 
                onClick={() => setSelectedAsset(null)}
                className="absolute -top-12 right-0 text-zinc-400 hover:text-white transition-colors"
              >
                Close (Esc)
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default GalleryInterface;