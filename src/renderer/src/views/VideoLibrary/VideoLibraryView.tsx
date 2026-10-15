import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
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
  Plus,
  Pencil,
  Copy,
  CheckSquare,
  Square,
  Check,
  Layers,
  FileText,
  RefreshCw,
  FolderInput,
  Tag,
  Wand2,
  X,
} from 'lucide-react';
import { MediaAsset } from '../../../shared/types';

type FolderType = 'Drafts' | 'ReadyToPublish' | 'Published';

export const VideoLibraryView: React.FC = () => {
  const { addToast, setCurrentSection } = useAppStore();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [playingAsset, setPlayingAsset] = useState<MediaAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    filePath: '',
    folder: 'Drafts' as FolderType,
    tags: '',
    aspectRatio: '9:16' as '9:16' | '16:9' | '1:1',
    duration: 60,
  });

  // Single Edit (Update) Modal State
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    folder: 'Drafts' as FolderType,
    tags: '',
    aspectRatio: '9:16' as '9:16' | '16:9' | '1:1',
    filePath: '',
    duration: 60,
    isFavorite: false,
  });

  // Delete Confirmation State (single or multi)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    ids: string[];
    titles: string[];
    deleteFiles: boolean;
  }>({
    isOpen: false,
    ids: [],
    titles: [],
    deleteFiles: false,
  });

  // Textbox Multi-CRUD Modal State
  const [isMultiCrudModalOpen, setIsMultiCrudModalOpen] = useState(false);
  const [multiCrudTab, setMultiCrudTab] = useState<'create' | 'update' | 'delete' | 'read'>('create');

  // Multi-Create Textbox State
  const [multiCreateText, setMultiCreateText] = useState(
    'Viral Street Hook #1 | #viral, #shorts | Drafts\n' +
    'Motivational Quote Reel #2 | #mindset | ReadyToPublish\n' +
    'Product Highlight Ep 3 | #tech, #review | Drafts'
  );
  const [defaultCreateFolder, setDefaultCreateFolder] = useState<FolderType>('Drafts');
  const [defaultCreateTags, setDefaultCreateTags] = useState('shorts, ai-video');
  const [defaultCreateRatio, setDefaultCreateRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');

  // Multi-Update Textbox State
  const [multiUpdateText, setMultiUpdateText] = useState('');

  // Multi-Delete Textbox State
  const [multiDeleteText, setMultiDeleteText] = useState('');
  const [multiDeleteWithFiles, setMultiDeleteWithFiles] = useState(false);

  // Multi-Read Export Format
  const [readFormat, setReadFormat] = useState<'titles' | 'pipe' | 'json'>('pipe');

  // Fetch Assets from SQLite
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

  // Clean selection if active folder changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeFolder]);

  // Selection helpers
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map((a) => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // 1. Single Import Video File
  const handleImport = async () => {
    if (window.api) {
      try {
        const file = await window.api.openFileDialog(['mp4', 'mov', 'webm', 'mkv']);
        if (file) {
          addToast({ type: 'info', title: 'Importing video...', message: file });
          const target = activeFolder === 'all' ? 'Drafts' : (activeFolder as FolderType);
          const asset = await window.api.importMediaAsset(file, target);
          addToast({ type: 'success', title: 'Video Imported', message: asset.fileName });
          fetchAssets();
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Import Failed', message: err.message });
      }
    }
  };

  // 2. Single Create Video Record
  const handleOpenCreateModal = () => {
    setCreateForm({
      title: '',
      filePath: '',
      folder: activeFolder === 'all' ? 'Drafts' : (activeFolder as FolderType),
      tags: '',
      aspectRatio: '9:16',
      duration: 60,
    });
    setIsCreateModalOpen(true);
  };

  const handleBrowseCreateFile = async () => {
    if (window.api) {
      const file = await window.api.openFileDialog(['mp4', 'mov', 'webm', 'mkv']);
      if (file) {
        const name = file.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '';
        setCreateForm((prev) => ({
          ...prev,
          filePath: file,
          title: prev.title.trim().length === 0 ? name : prev.title,
        }));
      }
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      addToast({ type: 'warning', title: 'Validation Error', message: 'Video title is required.' });
      return;
    }

    try {
      const tagsArray = createForm.tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      if (window.api?.createMediaAsset) {
        await window.api.createMediaAsset({
          title: createForm.title.trim(),
          filePath: createForm.filePath.trim() || undefined,
          folder: createForm.folder,
          tags: tagsArray,
          aspectRatio: createForm.aspectRatio,
          duration: Number(createForm.duration) || 60,
        });
      }

      addToast({ type: 'success', title: 'Video Created', message: createForm.title.trim() });
      setIsCreateModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Create Failed', message: err.message });
    }
  };

  // 3. Single Edit (Update) Video
  const handleOpenEditModal = (asset: MediaAsset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAsset(asset);
    setEditForm({
      title: asset.title,
      folder: asset.folder,
      tags: asset.tags.join(', '),
      aspectRatio: (asset.aspectRatio as any) || '9:16',
      filePath: asset.filePath,
      duration: asset.duration || 60,
      isFavorite: asset.isFavorite,
    });
  };

  const handleBrowseEditFile = async () => {
    if (window.api) {
      const file = await window.api.openFileDialog(['mp4', 'mov', 'webm', 'mkv']);
      if (file) {
        setEditForm((prev) => ({ ...prev, filePath: file }));
      }
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    try {
      const tagsArray = editForm.tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      if (window.api) {
        await window.api.updateMediaAsset(editingAsset.id, {
          title: editForm.title.trim(),
          folder: editForm.folder,
          tags: tagsArray,
          aspectRatio: editForm.aspectRatio,
          filePath: editForm.filePath.trim(),
          duration: Number(editForm.duration) || 60,
          isFavorite: editForm.isFavorite,
        });
      }

      addToast({ type: 'success', title: 'Video Updated', message: editForm.title.trim() });
      setEditingAsset(null);
      fetchAssets();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  // 4. Delete Flow (Single or Multi)
  const handlePromptDelete = (ids: string[], titles: string[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      ids,
      titles,
      deleteFiles: false,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const { ids, deleteFiles } = deleteDialog;
      if (ids.length === 0) return;

      if (ids.length === 1 && window.api) {
        await window.api.deleteMediaAsset(ids[0], deleteFiles);
      } else if (window.api?.batchDeleteMediaAssets) {
        await window.api.batchDeleteMediaAssets(ids, deleteFiles);
      } else if (window.api) {
        for (const id of ids) {
          await window.api.deleteMediaAsset(id, deleteFiles);
        }
      }

      addToast({
        type: 'info',
        title: ids.length === 1 ? 'Video Removed' : `${ids.length} Videos Deleted`,
        message: deleteFiles ? 'Removed from database and deleted from disk' : 'Removed from database',
      });

      // Clear selections if deleted
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });

      if (selectedAsset && ids.includes(selectedAsset.id)) setSelectedAsset(null);
      if (playingAsset && ids.includes(playingAsset.id)) setPlayingAsset(null);
      setDeleteDialog({ isOpen: false, ids: [], titles: [], deleteFiles: false });
      fetchAssets();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  // 5. Batch Operations from Selection Bar
  const handleBatchMoveFolder = async (targetFolder: FolderType) => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      if (window.api?.batchUpdateMediaAssets) {
        await window.api.batchUpdateMediaAssets(ids, { folder: targetFolder });
      } else if (window.api) {
        for (const id of ids) {
          await window.api.updateMediaAsset(id, { folder: targetFolder });
        }
      }

      addToast({
        type: 'success',
        title: 'Batch Moved',
        message: `Moved ${ids.length} videos to ${targetFolder}`,
      });
      fetchAssets();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Batch Move Failed', message: err.message });
    }
  };

  const handleToggleFavorite = async (asset: MediaAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.api) {
      await window.api.updateMediaAsset(asset.id, { isFavorite: !asset.isFavorite });
      fetchAssets();
    }
  };

  const handleReveal = async (filePath: string) => {
    if (window.api && filePath) {
      await window.api.revealInFileExplorer(filePath);
    }
  };

  // ==========================================
  // TEXTBOX MULTI-CRUD LOGIC
  // ==========================================

  // Parser for Multi-Create Textbox
  const parsedCreateItems = useMemo(() => {
    const lines = multiCreateText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    return lines.map((line) => {
      // Format: Title | Tags | Folder | FilePath
      const parts = line.split('|').map((p) => p.trim());
      const title = parts[0] || 'Untitled Video';

      let tags: string[] = [];
      if (parts[1]) {
        tags = parts[1]
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      } else if (defaultCreateTags) {
        tags = defaultCreateTags
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      }

      let folder: FolderType = defaultCreateFolder;
      if (parts[2]) {
        const f = parts[2].toLowerCase();
        if (f.includes('pub') && !f.includes('ready')) folder = 'Published';
        else if (f.includes('ready')) folder = 'ReadyToPublish';
        else folder = 'Drafts';
      }

      const filePath = parts[3] || undefined;

      return {
        title,
        tags,
        folder,
        filePath,
        aspectRatio: defaultCreateRatio,
        duration: 60,
      };
    });
  }, [multiCreateText, defaultCreateFolder, defaultCreateTags, defaultCreateRatio]);

  const handleExecuteMultiCreate = async () => {
    if (parsedCreateItems.length === 0) {
      addToast({ type: 'warning', title: 'Textbox Empty', message: 'Enter at least one video line in the textbox.' });
      return;
    }

    try {
      if (window.api?.batchCreateMediaAssets) {
        await window.api.batchCreateMediaAssets(parsedCreateItems);
      } else if (window.api?.createMediaAsset) {
        for (const item of parsedCreateItems) {
          await window.api.createMediaAsset(item);
        }
      }

      addToast({
        type: 'success',
        title: 'Multi Create Succeeded',
        message: `Successfully created ${parsedCreateItems.length} videos from textbox!`,
      });
      setIsMultiCrudModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Multi Create Failed', message: err.message });
    }
  };

  // Parser & Loader for Multi-Update Textbox
  const loadVideosIntoUpdateTextbox = (target: 'selected' | 'folder' | 'all') => {
    let sourceList: MediaAsset[] = [];
    if (target === 'selected') {
      sourceList = assets.filter((a) => selectedIds.has(a.id));
      if (sourceList.length === 0) {
        addToast({ type: 'warning', title: 'None Selected', message: 'Select videos using checkboxes first, or load by folder.' });
        return;
      }
    } else if (target === 'folder') {
      sourceList = assets;
    } else {
      sourceList = assets;
    }

    // Format: [id] Title | Folder | Tags
    const formatted = sourceList
      .map(
        (a) =>
          `[${a.id}] ${a.title} | ${a.folder} | ${a.tags.join(', ')}`
      )
      .join('\n');

    setMultiUpdateText(formatted);
    addToast({
      type: 'info',
      title: 'Loaded into Textbox',
      message: `Loaded ${sourceList.length} video records for editing.`,
    });
  };

  const parsedUpdateItems = useMemo(() => {
    const lines = multiUpdateText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    const updates: Array<{ id: string; title: string; folder: FolderType; tags: string[] }> = [];

    for (const line of lines) {
      const match = line.match(/^\[([a-zA-Z0-9_-]+)\]\s*(.*)$/);
      if (!match) continue;
      const id = match[1];
      const remainder = match[2];

      const parts = remainder.split('|').map((p) => p.trim());
      const title = parts[0] || '';

      let folder: FolderType = 'Drafts';
      if (parts[1]) {
        const f = parts[1].toLowerCase();
        if (f.includes('pub') && !f.includes('ready')) folder = 'Published';
        else if (f.includes('ready')) folder = 'ReadyToPublish';
        else folder = 'Drafts';
      }

      let tags: string[] = [];
      if (parts[2]) {
        tags = parts[2]
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      }

      if (id && title) {
        updates.push({ id, title, folder, tags });
      }
    }

    return updates;
  }, [multiUpdateText]);

  const handleExecuteMultiUpdate = async () => {
    if (parsedUpdateItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Valid Lines',
        message: 'Ensure lines follow the format: [ID] Title | Folder | Tags',
      });
      return;
    }

    try {
      if (window.api) {
        for (const item of parsedUpdateItems) {
          await window.api.updateMediaAsset(item.id, {
            title: item.title,
            folder: item.folder,
            tags: item.tags,
          });
        }
      }

      addToast({
        type: 'success',
        title: 'Multi Update Succeeded',
        message: `Successfully updated ${parsedUpdateItems.length} videos from textbox!`,
      });
      setIsMultiCrudModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Multi Update Failed', message: err.message });
    }
  };

  // Helper text transformations for Multi-Update Textbox
  const applyPrefixToUpdateTitles = (prefix: string) => {
    if (!prefix) return;
    const lines = multiUpdateText.split('\n');
    const updated = lines.map((line) => {
      const match = line.match(/^(\[[a-zA-Z0-9_-]+\]\s*)(.*)$/);
      if (!match) return line;
      return `${match[1]}${prefix} ${match[2]}`;
    });
    setMultiUpdateText(updated.join('\n'));
  };

  const applyFolderToAllLines = (folder: FolderType) => {
    const lines = multiUpdateText.split('\n');
    const updated = lines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        parts[1] = folder;
        return parts.join(' | ');
      }
      return `${line} | ${folder} | `;
    });
    setMultiUpdateText(updated.join('\n'));
  };

  // Parser & Execution for Multi-Delete Textbox
  const loadVideosIntoDeleteTextbox = () => {
    const sourceList = selectedIds.size > 0 ? assets.filter((a) => selectedIds.has(a.id)) : assets;
    const formatted = sourceList.map((a) => `[${a.id}] ${a.title}`).join('\n');
    setMultiDeleteText(formatted);
  };

  const parsedDeleteIds = useMemo(() => {
    const lines = multiDeleteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const ids: string[] = [];
    for (const line of lines) {
      const match = line.match(/\[([a-zA-Z0-9_-]+)\]/);
      if (match) {
        ids.push(match[1]);
      } else if (line.startsWith('asset_')) {
        ids.push(line.split(' ')[0]);
      } else {
        // match by title
        const found = assets.find((a) => a.title.toLowerCase() === line.toLowerCase());
        if (found) ids.push(found.id);
      }
    }
    return Array.from(new Set(ids));
  }, [multiDeleteText, assets]);

  const handleExecuteMultiDeleteFromTextbox = async () => {
    if (parsedDeleteIds.length === 0) {
      addToast({ type: 'warning', title: 'No IDs Detected', message: 'Enter at least one video ID or load items into the textbox.' });
      return;
    }

    handlePromptDelete(
      parsedDeleteIds,
      assets.filter((a) => parsedDeleteIds.includes(a.id)).map((a) => a.title)
    );
  };

  // Multi-Read Export Data
  const formattedReadContent = useMemo(() => {
    const sourceList = selectedIds.size > 0 ? assets.filter((a) => selectedIds.has(a.id)) : assets;
    if (readFormat === 'titles') {
      return sourceList.map((a) => a.title).join('\n');
    }
    if (readFormat === 'json') {
      return JSON.stringify(sourceList, null, 2);
    }
    // Pipe delimited
    return sourceList
      .map(
        (a) =>
          `ID: ${a.id} | Title: ${a.title} | Folder: ${a.folder} | Ratio: ${a.aspectRatio} | Duration: ${a.duration}s | Tags: ${a.tags.join(', ')}`
      )
      .join('\n');
  }, [assets, selectedIds, readFormat]);

  const handleCopyReadContent = () => {
    navigator.clipboard.writeText(formattedReadContent);
    addToast({ type: 'success', title: 'Copied to Clipboard', message: 'Exported text copied.' });
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
    <div className="flex flex-col h-full overflow-hidden select-none bg-transparent">
      {/* Top Action Toolbar */}
      <div className="px-8 py-4 border-b border-[rgba(91,145,255,0.18)] flex flex-wrap items-center justify-between gap-4 bg-[#07112A]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          {/* Folders filter tabs */}
          <div className="flex bg-[#081633]/90 p-1 rounded-xl border border-[rgba(91,145,255,0.2)] text-xs shadow-subtle">
            {['all', 'Drafts', 'ReadyToPublish', 'Published'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeFolder === f
                    ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(8,123,255,0.4)]'
                    : 'text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/60'
                }`}
              >
                {f === 'all' ? 'All Videos' : f}
              </button>
            ))}
          </div>

          <span className="text-studio-700">|</span>

          {/* Search bar */}
          <div className="w-60">
            <Input
              placeholder="Search title, file, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
        </div>

        {/* CRUD Buttons & View Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Grid/Table Toggle */}
          <div className="flex bg-[#081633]/90 p-1 rounded-xl border border-[rgba(91,145,255,0.2)] shadow-subtle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#102A50] text-cyan-400 shadow-subtle' : 'text-studio-400 hover:text-studio-200'
              }`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-[#102A50] text-cyan-400 shadow-subtle' : 'text-studio-400 hover:text-studio-200'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>

          {/* CRUD Button 1: Single Create */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} className="text-cyan-400" />}
            onClick={handleOpenCreateModal}
          >
            New Video
          </Button>

          {/* CRUD Button 2: Textbox Multi-CRUD */}
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} className="text-cyan-300 animate-pulse" />}
            onClick={() => {
              if (selectedIds.size > 0) {
                loadVideosIntoUpdateTextbox('selected');
                setMultiCrudTab('update');
              }
              setIsMultiCrudModalOpen(true);
            }}
          >
            Textbox Multi-CRUD
          </Button>

          {/* Import File Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={14} className="text-cyan-400" />}
            onClick={handleImport}
          >
            Import File
          </Button>
        </div>
      </div>

      {/* Floating / Sticky Multi-Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="px-8 py-3 bg-[#081633]/95 border-b border-brand-500/40 backdrop-blur-xl shadow-glass flex items-center justify-between text-xs animate-fade-in shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 text-white font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(8,123,255,0.4)]">
              <Check size={13} />
              {selectedIds.size} Selected
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-cyan-400 hover:text-white underline underline-offset-2 font-medium"
            >
              {selectedIds.size === assets.length ? 'Deselect All' : `Select All (${assets.length})`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-studio-400 font-medium mr-1">Move:</span>
            {(['Drafts', 'ReadyToPublish', 'Published'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleBatchMoveFolder(f)}
                className="px-2.5 py-1 rounded-lg bg-[#0B1D3B] hover:bg-[#102A50] border border-[rgba(91,145,255,0.22)] text-studio-200 hover:text-white text-[11px] font-medium transition-colors"
              >
                {f}
              </button>
            ))}

            <span className="text-studio-700 mx-1">|</span>

            {/* Batch Edit via Textbox */}
            <button
              onClick={() => {
                loadVideosIntoUpdateTextbox('selected');
                setMultiCrudTab('update');
                setIsMultiCrudModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-cyan-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-subtle"
            >
              <Pencil size={12} />
              Batch Edit Textbox
            </button>

            {/* Batch Delete */}
            <button
              onClick={() =>
                handlePromptDelete(
                  Array.from(selectedIds),
                  assets.filter((a) => selectedIds.has(a.id)).map((a) => a.title)
                )
              }
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-subtle"
            >
              <Trash2 size={12} />
              Delete Selected
            </button>

            <button
              onClick={clearSelection}
              className="p-1 rounded-lg text-studio-400 hover:text-white hover:bg-[#102A50]/60 ml-1 transition-colors"
              title="Clear selection"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {assets.length === 0 ? (
          <EmptyState
            icon={<Film size={36} />}
            title="No videos in this view"
            description="Create custom video records, import MP4 files, or use the Textbox Multi-CRUD tool to bulk-create library items."
            actionText="+ New Video"
            onAction={handleOpenCreateModal}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {assets.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`group glass-card rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-subtle flex flex-col relative ${
                    isSelected
                      ? 'border-brand-500 ring-2 ring-brand-500/40 shadow-[0_0_24px_rgba(8,123,255,0.35)]'
                      : 'hover:border-brand-500/50 hover:shadow-[0_8px_30px_rgba(8,123,255,0.2)] hover:scale-[1.01]'
                  }`}
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

                    {/* Multi-Select Checkbox (Top Left) */}
                    <div
                      onClick={(e) => toggleSelect(asset.id, e)}
                      className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-black/60 text-studio-400 opacity-0 group-hover:opacity-100 hover:text-white'
                      }`}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>

                    {/* Top Right Actions: Favorite, Edit, Delete */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleFavorite(asset, e)}
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-studio-400 hover:text-amber-400 transition-colors"
                        title="Toggle favorite"
                      >
                        <Star
                          size={14}
                          className={asset.isFavorite ? 'fill-amber-400 text-amber-400' : ''}
                        />
                      </button>

                      <button
                        onClick={(e) => handleOpenEditModal(asset, e)}
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-studio-400 hover:text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit video record"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={(e) => handlePromptDelete([asset.id], [asset.title], e)}
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-studio-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete video"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Bottom overlay badges */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-studio-200">
                        {asset.aspectRatio || '9:16'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-studio-200">
                        {formatDuration(asset.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Info Card Body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-studio-100 truncate group-hover:text-brand-400 transition-colors">
                        {asset.title}
                      </h4>
                      <p className="text-[11px] text-studio-400 font-mono mt-0.5 truncate">
                        {asset.fileName || asset.filePath || 'No file assigned'}
                      </p>
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
              );
            })}
          </div>
        ) : (
          <div className="bg-studio-850 rounded-xl border border-studio-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-studio-900 border-b border-studio-800 text-studio-400">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button onClick={toggleSelectAll} className="p-1 hover:text-white">
                      {selectedIds.size === assets.length && assets.length > 0 ? (
                        <CheckSquare size={15} className="text-brand-400" />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Folder</th>
                  <th className="py-3 px-4">Ratio</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-800/60">
                {assets.map((asset) => {
                  const isSelected = selectedIds.has(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={`hover:bg-studio-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-brand-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => toggleSelect(asset.id, e)}>
                        <button className="p-1 text-studio-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare size={15} className="text-brand-400" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-semibold text-studio-100 flex items-center gap-2">
                        <Film size={14} className="text-brand-400 shrink-0" />
                        <span className="truncate max-w-xs">{asset.title}</span>
                      </td>
                      <td className="py-3 px-4">
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
                      </td>
                      <td className="py-3 px-4 font-mono">{asset.aspectRatio}</td>
                      <td className="py-3 px-4 font-mono">{formatDuration(asset.duration)}</td>
                      <td className="py-3 px-4 font-mono">{formatSize(asset.fileSize)}</td>
                      <td className="py-3 px-4 text-studio-400 max-w-[150px] truncate">
                        {asset.tags.join(', ') || '-'}
                      </td>
                      <td className="py-3 px-4 text-studio-400">{new Date(asset.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingAsset(asset);
                            }}
                            className="p-1.5 hover:text-brand-400 text-studio-400 rounded hover:bg-studio-800"
                            title="Play"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            onClick={(e) => handleOpenEditModal(asset, e)}
                            className="p-1.5 hover:text-brand-300 text-studio-400 rounded hover:bg-studio-800"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handlePromptDelete([asset.id], [asset.title], e)}
                            className="p-1.5 hover:text-rose-400 text-studio-400 rounded hover:bg-studio-800"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReveal(asset.filePath);
                            }}
                            className="p-1.5 hover:text-studio-200 text-studio-400 rounded hover:bg-studio-800"
                            title="Reveal in Explorer"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TEXTBOX MULTI-CRUD MANAGER                      */}
      {/* ======================================================== */}
      {isMultiCrudModalOpen && (
        <Modal
          isOpen={isMultiCrudModalOpen}
          onClose={() => setIsMultiCrudModalOpen(false)}
          title="⚡ Textbox Multi-CRUD Manager"
          subtitle="Create, read, bulk-edit, and batch-delete library videos using a multi-line textbox"
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Tabs Header */}
            <div className="flex border-b border-studio-800 gap-1 pb-2">
              <button
                onClick={() => setMultiCrudTab('create')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  multiCrudTab === 'create'
                    ? 'bg-brand-500 text-white shadow-subtle'
                    : 'text-studio-400 hover:text-studio-200 hover:bg-studio-800'
                }`}
              >
                <Plus size={14} />
                Multi-Create (Bulk Add)
              </button>
              <button
                onClick={() => {
                  setMultiCrudTab('update');
                  if (!multiUpdateText) loadVideosIntoUpdateTextbox('selected');
                }}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  multiCrudTab === 'update'
                    ? 'bg-brand-500 text-white shadow-subtle'
                    : 'text-studio-400 hover:text-studio-200 hover:bg-studio-800'
                }`}
              >
                <Pencil size={14} />
                Multi-Update (Bulk Edit)
              </button>
              <button
                onClick={() => {
                  setMultiCrudTab('delete');
                  if (!multiDeleteText) loadVideosIntoDeleteTextbox();
                }}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  multiCrudTab === 'delete'
                    ? 'bg-rose-600 text-white shadow-subtle'
                    : 'text-studio-400 hover:text-studio-200 hover:bg-studio-800'
                }`}
              >
                <Trash2 size={14} />
                Multi-Delete
              </button>
              <button
                onClick={() => setMultiCrudTab('read')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  multiCrudTab === 'read'
                    ? 'bg-studio-700 text-white shadow-subtle'
                    : 'text-studio-400 hover:text-studio-200 hover:bg-studio-800'
                }`}
              >
                <FileText size={14} />
                Multi-Read / Export
              </button>
            </div>

            {/* TAB 1: MULTI-CREATE */}
            {multiCrudTab === 'create' && (
              <div className="space-y-4">
                <div className="p-3 bg-studio-900 border border-studio-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-studio-200 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-brand-400" />
                      Multi-Line Textbox (1 Video Per Line)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setMultiCreateText(
                            'AI Street Interview 01 | #viral, #shorts | Drafts\n' +
                            'AI Street Interview 02 | #viral, #shorts | Drafts\n' +
                            'AI Street Interview 03 | #viral, #shorts | ReadyToPublish\n' +
                            'Top 10 Tech Gadgets | #tech, #review | Published'
                          )
                        }
                        className="text-[11px] text-brand-400 hover:underline"
                      >
                        Insert Sample Template
                      </button>
                      <button
                        onClick={() => setMultiCreateText('')}
                        className="text-[11px] text-studio-500 hover:text-rose-400"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Format: <code className="text-brand-300">Title</code> or <code className="text-brand-300">Title | Tags | Folder | OptionalFilePath</code>
                  </p>
                </div>

                {/* Default config row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-studio-400 block mb-1">Default Folder</label>
                    <Select
                      options={[
                        { value: 'Drafts', label: 'Drafts' },
                        { value: 'ReadyToPublish', label: 'ReadyToPublish' },
                        { value: 'Published', label: 'Published' },
                      ]}
                      value={defaultCreateFolder}
                      onChange={(e) => setDefaultCreateFolder(e.target.value as FolderType)}
                    />
                  </div>
                  <div>
                    <label className="text-studio-400 block mb-1">Default Tags</label>
                    <Input
                      placeholder="e.g. shorts, viral"
                      value={defaultCreateTags}
                      onChange={(e) => setDefaultCreateTags(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-studio-400 block mb-1">Aspect Ratio</label>
                    <Select
                      options={[
                        { value: '9:16', label: '9:16 (Vertical Shorts/TikTok)' },
                        { value: '16:9', label: '16:9 (Landscape YouTube)' },
                        { value: '1:1', label: '1:1 (Square Instagram)' },
                      ]}
                      value={defaultCreateRatio}
                      onChange={(e) => setDefaultCreateRatio(e.target.value as any)}
                    />
                  </div>
                </div>

                {/* The Multi-Line Textbox */}
                <div>
                  <textarea
                    rows={8}
                    value={multiCreateText}
                    onChange={(e) => setMultiCreateText(e.target.value)}
                    placeholder="Enter one video title per line..."
                    className="w-full bg-studio-950 border border-studio-750 rounded-xl p-3.5 text-xs font-mono text-studio-100 placeholder-studio-600 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                  />
                </div>

                {/* Live Parser Preview */}
                <div className="flex items-center justify-between p-3 bg-studio-850 rounded-xl border border-studio-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-studio-200 font-semibold">
                      {parsedCreateItems.length} Videos Detected
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={handleExecuteMultiCreate}
                    disabled={parsedCreateItems.length === 0}
                  >
                    Create {parsedCreateItems.length} Videos in Bulk
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: MULTI-UPDATE */}
            {multiCrudTab === 'update' && (
              <div className="space-y-4">
                <div className="p-3 bg-studio-900 border border-studio-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-studio-200 flex items-center gap-1.5">
                      <Pencil size={14} className="text-brand-400" />
                      Bulk Edit via Textbox (Format: [ID] Title | Folder | Tags)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadVideosIntoUpdateTextbox('selected')}
                        className="text-[11px] text-brand-400 hover:underline font-medium"
                      >
                        Load Selected ({selectedIds.size})
                      </button>
                      <span className="text-studio-700">|</span>
                      <button
                        onClick={() => loadVideosIntoUpdateTextbox('folder')}
                        className="text-[11px] text-brand-400 hover:underline font-medium"
                      >
                        Load Current View ({assets.length})
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Edit video titles, change folders (Drafts, ReadyToPublish, Published), or alter tags directly in the textbox lines below.
                  </p>
                </div>

                {/* Quick Transform Bar */}
                <div className="flex flex-wrap items-center gap-2 bg-studio-850 p-2.5 rounded-xl border border-studio-800">
                  <span className="text-studio-400 font-medium">Quick Transforms:</span>
                  <button
                    onClick={() => applyPrefixToUpdateTitles('[Part 1]')}
                    className="px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-750 text-studio-200 text-[11px] border border-studio-700"
                  >
                    + Prefix [Part 1]
                  </button>
                  <button
                    onClick={() => applyFolderToAllLines('ReadyToPublish')}
                    className="px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-750 text-studio-200 text-[11px] border border-studio-700"
                  >
                    Set All to ReadyToPublish
                  </button>
                  <button
                    onClick={() => applyFolderToAllLines('Published')}
                    className="px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-750 text-studio-200 text-[11px] border border-studio-700"
                  >
                    Set All to Published
                  </button>
                </div>

                {/* The Multi-Line Update Textbox */}
                <div>
                  <textarea
                    rows={9}
                    value={multiUpdateText}
                    onChange={(e) => setMultiUpdateText(e.target.value)}
                    placeholder="Load videos or enter [asset_id] New Title | Folder | Tags..."
                    className="w-full bg-studio-950 border border-studio-750 rounded-xl p-3.5 text-xs font-mono text-studio-100 placeholder-studio-600 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-studio-850 rounded-xl border border-studio-800">
                  <span className="text-studio-300 font-semibold">
                    {parsedUpdateItems.length} Valid Updates Ready
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check size={14} />}
                    onClick={handleExecuteMultiUpdate}
                    disabled={parsedUpdateItems.length === 0}
                  >
                    Save & Update {parsedUpdateItems.length} Videos
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: MULTI-DELETE */}
            {multiCrudTab === 'delete' && (
              <div className="space-y-4">
                <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <Trash2 size={14} />
                      Batch Deletion Textbox
                    </span>
                    <button
                      onClick={loadVideosIntoDeleteTextbox}
                      className="text-[11px] text-rose-300 hover:underline font-medium"
                    >
                      Load Selected ({selectedIds.size})
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-200/70">
                    Paste or review video IDs or titles to be removed from the database.
                  </p>
                </div>

                <div>
                  <textarea
                    rows={7}
                    value={multiDeleteText}
                    onChange={(e) => setMultiDeleteText(e.target.value)}
                    placeholder="Enter or paste [asset_id] or titles to delete..."
                    className="w-full bg-studio-950 border border-studio-750 rounded-xl p-3.5 text-xs font-mono text-studio-100 placeholder-studio-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-studio-850 rounded-xl border border-studio-800">
                  <span className="text-rose-400 font-semibold">
                    {parsedDeleteIds.length} Videos to Delete
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={handleExecuteMultiDeleteFromTextbox}
                    disabled={parsedDeleteIds.length === 0}
                  >
                    Delete {parsedDeleteIds.length} Videos
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: MULTI-READ / EXPORT */}
            {multiCrudTab === 'read' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-studio-900 border border-studio-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-studio-300 font-semibold">Format:</span>
                    <div className="flex gap-1">
                      {(['pipe', 'titles', 'json'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setReadFormat(fmt)}
                          className={`px-3 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                            readFormat === fmt
                              ? 'bg-brand-500 text-white'
                              : 'bg-studio-800 text-studio-400 hover:text-white'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Copy size={14} />}
                    onClick={handleCopyReadContent}
                  >
                    Copy to Clipboard
                  </Button>
                </div>

                <div>
                  <textarea
                    rows={10}
                    readOnly
                    value={formattedReadContent}
                    className="w-full bg-studio-950 border border-studio-800 rounded-xl p-3.5 text-xs font-mono text-studio-300 select-all focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SINGLE CREATE VIDEO MODAL                       */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Video Record"
          subtitle="Add an existing video file or register a new video asset in your library"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
            <div>
              <Input
                label="Video Title"
                placeholder="e.g. 5 Morning Habits for Productivity"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Video File Path (Optional)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="C:/Videos/my_clip.mp4"
                  value={createForm.filePath}
                  onChange={(e) => setCreateForm({ ...createForm, filePath: e.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowseCreateFile}
                  className="shrink-0"
                >
                  Browse...
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">Folder</label>
                <Select
                  options={[
                    { value: 'Drafts', label: 'Drafts' },
                    { value: 'ReadyToPublish', label: 'ReadyToPublish' },
                    { value: 'Published', label: 'Published' },
                  ]}
                  value={createForm.folder}
                  onChange={(e) => setCreateForm({ ...createForm, folder: e.target.value as FolderType })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">Aspect Ratio</label>
                <Select
                  options={[
                    { value: '9:16', label: '9:16 (Shorts / TikTok)' },
                    { value: '16:9', label: '16:9 (Landscape YouTube)' },
                    { value: '1:1', label: '1:1 (Square Instagram)' },
                  ]}
                  value={createForm.aspectRatio}
                  onChange={(e) => setCreateForm({ ...createForm, aspectRatio: e.target.value as any })}
                />
              </div>
            </div>

            <div>
              <Input
                label="Tags (Comma Separated)"
                placeholder="youtube, shorts, viral, productivity"
                value={createForm.tags}
                onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-studio-800">
              <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={<Plus size={14} />}>
                Create Video
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: SINGLE EDIT VIDEO MODAL                         */}
      {/* ======================================================== */}
      {editingAsset && (
        <Modal
          isOpen={Boolean(editingAsset)}
          onClose={() => setEditingAsset(null)}
          title={`Edit Video: ${editingAsset.title}`}
          subtitle={`ID: ${editingAsset.id}`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
            <div>
              <Input
                label="Video Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                File Path
              </label>
              <div className="flex gap-2">
                <Input
                  value={editForm.filePath}
                  onChange={(e) => setEditForm({ ...editForm, filePath: e.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowseEditFile}
                  className="shrink-0"
                >
                  Browse...
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">Folder</label>
                <Select
                  options={[
                    { value: 'Drafts', label: 'Drafts' },
                    { value: 'ReadyToPublish', label: 'ReadyToPublish' },
                    { value: 'Published', label: 'Published' },
                  ]}
                  value={editForm.folder}
                  onChange={(e) => setEditForm({ ...editForm, folder: e.target.value as FolderType })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">Aspect Ratio</label>
                <Select
                  options={[
                    { value: '9:16', label: '9:16 (Shorts / TikTok)' },
                    { value: '16:9', label: '16:9 (Landscape YouTube)' },
                    { value: '1:1', label: '1:1 (Square Instagram)' },
                  ]}
                  value={editForm.aspectRatio}
                  onChange={(e) => setEditForm({ ...editForm, aspectRatio: e.target.value as any })}
                />
              </div>
            </div>

            <div>
              <Input
                label="Tags"
                placeholder="tech, gadgets, review"
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsFavorite"
                checked={editForm.isFavorite}
                onChange={(e) => setEditForm({ ...editForm, isFavorite: e.target.checked })}
                className="rounded border-studio-700 text-brand-500 focus:ring-brand-500 bg-studio-900"
              />
              <label htmlFor="editIsFavorite" className="text-studio-300 cursor-pointer">
                Mark as Favorite (Featured in Studio)
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-studio-800">
              <Button type="button" variant="secondary" onClick={() => setEditingAsset(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={<Check size={14} />}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION DIALOG                      */}
      {/* ======================================================== */}
      {deleteDialog.isOpen && (
        <Modal
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, ids: [], titles: [], deleteFiles: false })}
          title={`Confirm Deletion (${deleteDialog.ids.length} Video${deleteDialog.ids.length === 1 ? '' : 's'})`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-studio-300">
              Are you sure you want to remove the following{' '}
              <strong className="text-white">{deleteDialog.ids.length}</strong> video record(s)?
            </p>

            <div className="max-h-36 overflow-y-auto p-2.5 bg-studio-950 rounded-lg border border-studio-800 text-[11px] text-studio-400 space-y-1 font-mono">
              {deleteDialog.titles.slice(0, 10).map((t, idx) => (
                <div key={idx} className="truncate">• {t}</div>
              ))}
              {deleteDialog.titles.length > 10 && (
                <div className="text-studio-500 italic">...and {deleteDialog.titles.length - 10} more</div>
              )}
            </div>

            <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex items-center gap-2.5">
              <input
                type="checkbox"
                id="permDeleteFiles"
                checked={deleteDialog.deleteFiles}
                onChange={(e) =>
                  setDeleteDialog({ ...deleteDialog, deleteFiles: e.target.checked })
                }
                className="rounded border-studio-700 text-rose-500 focus:ring-rose-500 bg-studio-900"
              />
              <label htmlFor="permDeleteFiles" className="text-rose-300 font-medium cursor-pointer">
                Also permanently delete physical video files from disk
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-studio-800">
              <Button
                variant="secondary"
                onClick={() => setDeleteDialog({ isOpen: false, ids: [], titles: [], deleteFiles: false })}
              >
                Cancel
              </Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={handleConfirmDelete}>
                Delete {deleteDialog.ids.length} Record{deleteDialog.ids.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: VIDEO INSPECTOR & DETAIL MODAL                  */}
      {/* ======================================================== */}
      {selectedAsset && (
        <Modal
          isOpen={Boolean(selectedAsset)}
          onClose={() => setSelectedAsset(null)}
          title={selectedAsset.title}
          subtitle={`Path: ${selectedAsset.filePath}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => handlePromptDelete([selectedAsset.id], [selectedAsset.title])}
                >
                  Delete
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={14} />}
                  onClick={() => {
                    handleOpenEditModal(selectedAsset);
                  }}
                >
                  Edit Details
                </Button>
              </div>

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
                  className="absolute p-2.5 rounded-full bg-brand-500 text-white shadow-elevated hover:scale-105 transition-transform"
                >
                  <Play size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <div>
                    <span className="text-studio-400 block">Duration</span>
                    <span className="font-mono text-studio-200">
                      {formatDuration(selectedAsset.duration)} ({selectedAsset.duration}s)
                    </span>
                  </div>
                  <div>
                    <span className="text-studio-400 block">Dimensions</span>
                    <span className="font-mono text-studio-200">
                      {selectedAsset.width} × {selectedAsset.height}
                    </span>
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
                  <span className="text-studio-400 block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAsset.tags.length > 0 ? (
                      selectedAsset.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-studio-800 text-studio-300 text-[10px]"
                        >
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-studio-500 text-[11px] italic">No tags</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-studio-400 block mb-1">Folder Status</label>
                  <div className="flex gap-2">
                    {(['Drafts', 'ReadyToPublish', 'Published'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={async () => {
                          if (window.api) {
                            await window.api.updateMediaAsset(selectedAsset.id, { folder: f });
                            setSelectedAsset({ ...selectedAsset, folder: f });
                            fetchAssets();
                          }
                        }}
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

      {/* ======================================================== */}
      {/* MODAL 6: BUILT-IN VIDEO PLAYER MODAL                     */}
      {/* ======================================================== */}
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
