import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Video,
  Upload,
  Search,
  Grid,
  List,
  Folder,
  Star,
  Play,
  Trash2,
  ExternalLink,
  Film,
  Smartphone,
  Send,
  Sparkles,
  Info,
} from 'lucide-react';
import { MediaAsset } from '../../../shared/types';

export const VideoLibraryView: React.FC = () => {
  const { addToast, setCurrentSection } = useAppStore();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [playingAsset, setPlayingAsset] = useState<MediaAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      if (window.api) {
        const list = await window.api.getMediaAssets({
          folder: activeFolder === 'all' ? undefined : activeFolder,
          query: searchQuery,
        });
        setAssets(list);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load videos', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [activeFolder, searchQuery]);

  const handleImport = async () => {
    if (window.api) {
      try {
        const file = await window.api.openFileDialog(['mp4', 'mov', 'webm', 'mkv']);
        if (file) {
          addToast({ type: 'info', title: 'Importing video...', message: file });
          const target = activeFolder === 'all' ? 'Drafts' : (activeFolder as any);
          const asset = await window.api.importMediaAsset(file, target);
          addToast({ type: 'success', title: 'Video Imported', message: asset.fileName });
          fetchAssets();
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Import Failed', message: err.message });
      }
    }
  };

  const handleToggleFavorite = async (asset: MediaAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.api) {
      await window.api.updateMediaAsset(asset.id, { isFavorite: !asset.isFavorite });
      fetchAssets();
    }
  };

  const handleDelete = async (id: string, deleteFile = false) => {
    if (window.api) {
      const confirmed = window.confirm(
        deleteFile
          ? 'Permanently delete this video from database AND hard drive?'
          : 'Remove this video record from library?'
      );
      if (confirmed) {
        await window.api.deleteMediaAsset(id, deleteFile);
        addToast({ type: 'info', title: 'Video removed' });
        if (selectedAsset?.id === id) setSelectedAsset(null);
        if (playingAsset?.id === id) setPlayingAsset(null);
        fetchAssets();
      }
    }
  };

  const handleReveal = async (filePath: string) => {
    if (window.api) {
      await window.api.revealInFileExplorer(filePath);
    }
  };

  const handleMoveFolder = async (id: string, newFolder: 'Drafts' | 'ReadyToPublish' | 'Published') => {
    if (window.api) {
      await window.api.updateMediaAsset(id, { folder: newFolder });
      addToast({ type: 'success', title: 'Folder updated', message: `Moved to ${newFolder}` });
      fetchAssets();
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Top Action Toolbar */}
      <div className="px-8 py-5 border-b border-studio-800 flex flex-wrap items-center justify-between gap-4 bg-studio-900/60 shrink-0">
        <div className="flex items-center gap-3">
          {/* Folders filter tabs */}
          <div className="flex bg-studio-850 p-1 rounded-xl border border-studio-800 text-xs">
            {['all', 'Drafts', 'ReadyToPublish', 'Published'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeFolder === f
                    ? 'bg-brand-500 text-white shadow-subtle'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                {f === 'all' ? 'All Videos' : f}
              </button>
            ))}
          </div>

          <span className="text-studio-700">|</span>

          {/* Search bar */}
          <div className="w-64">
            <Input
              placeholder="Search by title, filename, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="flex bg-studio-850 p-1 rounded-lg border border-studio-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-studio-750 text-studio-100' : 'text-studio-400'}`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-studio-750 text-studio-100' : 'text-studio-400'}`}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={14} />}
            onClick={handleImport}
          >
            Import Video File
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {assets.length === 0 ? (
          <EmptyState
            icon={<Film size={32} />}
            title="No videos in this folder"
            description="Import existing video clips or export completed stories from the AI Studio to build your library."
            actionText="Import Video File"
            onAction={handleImport}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="group bg-studio-850 border border-studio-800 rounded-xl overflow-hidden hover:border-brand-500/50 transition-all cursor-pointer shadow-subtle flex flex-col"
              >
                {/* Thumbnail / Preview Header */}
                <div className="relative aspect-[9/16] bg-studio-950 flex items-center justify-center overflow-hidden">
                  {asset.thumbnailPath ? (
                    <img
                      src={`file://${asset.thumbnailPath.replace(/\\/g, '/')}`}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Film className="text-studio-600" size={36} />
                  )}

                  {/* Play Overlay Button */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayingAsset(asset);
                    }}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-elevated hover:scale-110 transition-transform">
                      <Play size={20} className="ml-0.5" />
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-studio-200">
                      {asset.aspectRatio}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-studio-200">
                      {formatDuration(asset.duration)}
                    </span>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => handleToggleFavorite(asset, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-studio-400 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      size={15}
                      className={asset.isFavorite ? 'fill-amber-400 text-amber-400' : ''}
                    />
                  </button>
                </div>

                {/* Info Card Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-studio-100 truncate group-hover:text-brand-400 transition-colors">
                      {asset.title}
                    </h4>
                    <p className="text-[11px] text-studio-400 font-mono mt-0.5 truncate">{asset.fileName}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-studio-800 text-[11px] text-studio-500">
                    <span>{formatSize(asset.fileSize)}</span>
                    <Badge
                      variant={
                        asset.folder === 'Published'
                          ? 'success'
                          : asset.folder === 'ReadyToPublish'
                          ? 'cyan'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {asset.folder}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-studio-850 rounded-xl border border-studio-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-studio-900 border-b border-studio-800 text-studio-400">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Folder</th>
                  <th className="py-3 px-4">Ratio</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-800/60">
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="hover:bg-studio-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-studio-100 flex items-center gap-2">
                      <Film size={14} className="text-brand-400 shrink-0" />
                      <span className="truncate max-w-xs">{asset.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={asset.folder === 'Published' ? 'success' : 'neutral'} size="sm">
                        {asset.folder}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono">{asset.aspectRatio}</td>
                    <td className="py-3 px-4 font-mono">{formatDuration(asset.duration)}</td>
                    <td className="py-3 px-4 font-mono">{formatSize(asset.fileSize)}</td>
                    <td className="py-3 px-4 text-studio-400">{new Date(asset.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingAsset(asset);
                        }}
                        className="p-1 hover:text-brand-400 text-studio-400 mr-2"
                        title="Play"
                      >
                        <Play size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReveal(asset.filePath);
                        }}
                        className="p-1 hover:text-studio-200 text-studio-400"
                        title="Reveal in Explorer"
                      >
                        <ExternalLink size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Video Inspector & Action Modal */}
      {selectedAsset && (
        <Modal
          isOpen={Boolean(selectedAsset)}
          onClose={() => setSelectedAsset(null)}
          title={selectedAsset.title}
          subtitle={`Path: ${selectedAsset.filePath}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(selectedAsset.id, false)}
              >
                Delete Record
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Smartphone size={14} />}
                  onClick={() => {
                    setSelectedAsset(null);
                    setCurrentSection('phone-control');
                  }}
                >
                  Send to Phone
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={() => {
                    setSelectedAsset(null);
                    setCurrentSection('publish-center');
                  }}
                >
                  Publish Video
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-36 h-48 bg-studio-950 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
                {selectedAsset.thumbnailPath ? (
                  <img
                    src={`file://${selectedAsset.thumbnailPath.replace(/\\/g, '/')}`}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Film size={28} className="text-studio-600" />
                )}
                <button
                  onClick={() => setPlayingAsset(selectedAsset)}
                  className="absolute p-2.5 rounded-full bg-brand-500 text-white shadow-elevated"
                >
                  <Play size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <div>
                    <span className="text-studio-400 block">Duration</span>
                    <span className="font-mono text-studio-200">{formatDuration(selectedAsset.duration)} ({selectedAsset.duration}s)</span>
                  </div>
                  <div>
                    <span className="text-studio-400 block">Dimensions</span>
                    <span className="font-mono text-studio-200">{selectedAsset.width} × {selectedAsset.height}</span>
                  </div>
                  <div>
                    <span className="text-studio-400 block">File Size</span>
                    <span className="font-mono text-studio-200">{formatSize(selectedAsset.fileSize)}</span>
                  </div>
                  <div>
                    <span className="text-studio-400 block">Aspect Ratio</span>
                    <span className="font-mono text-studio-200">{selectedAsset.aspectRatio}</span>
                  </div>
                </div>

                <div>
                  <label className="text-studio-400 block mb-1">Move to Folder</label>
                  <div className="flex gap-2">
                    {(['Drafts', 'ReadyToPublish', 'Published'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => handleMoveFolder(selectedAsset.id, f)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          selectedAsset.folder === f
                            ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                            : 'border-studio-750 bg-studio-800 text-studio-400 hover:text-studio-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Built-in Video Player Modal */}
      {playingAsset && (
        <Modal
          isOpen={Boolean(playingAsset)}
          onClose={() => setPlayingAsset(null)}
          title={`Playback: ${playingAsset.title}`}
          maxWidth="lg"
        >
          <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-[70vh]">
            <video
              src={`file://${playingAsset.filePath.replace(/\\/g, '/')}`}
              controls
              autoPlay
              className="max-h-[65vh] w-auto mx-auto rounded-lg"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
