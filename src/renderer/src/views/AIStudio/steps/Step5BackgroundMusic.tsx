import React, { useEffect, useState } from 'react';
import { MusicSettings, StoryProject } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useAppStore } from '../../../stores/useAppStore';
import {
  Music,
  Play,
  Pause,
  Upload,
  Search,
  Volume2,
  Check,
  ShieldCheck,
  Repeat,
  Radio,
  Sliders,
} from 'lucide-react';

interface Step5BackgroundMusicProps {
  project: StoryProject;
  onRefreshProject: () => Promise<void>;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
}

export const Step5BackgroundMusic: React.FC<Step5BackgroundMusicProps> = ({
  project,
  onRefreshProject,
  onUpdateProject,
}) => {
  const { addToast } = useAppStore();

  const [libraryTracks, setLibraryTracks] = useState<any[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const defaultMusicSettings: MusicSettings = {
    trackId: 'mus_cinematic',
    trackTitle: 'Cinematic Horizon',
    mood: 'cinematic',
    volume: 30,
    trimStart: 0,
    trimEnd: project.targetDuration || 60,
    fadeIn: true,
    fadeOut: true,
    loop: true,
    ducking: true,
  };

  const currentSettings: MusicSettings = {
    ...defaultMusicSettings,
    ...(project.musicSettings || {}),
  };

  useEffect(() => {
    const fetchLib = async () => {
      if (window.api) {
        const lib = await window.api.getBuiltinAudioLibrary();
        setLibraryTracks(lib.music);
      }
    };
    fetchLib();

    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, []);

  const handleUpdateSettings = async (updates: Partial<MusicSettings>) => {
    const updated = { ...currentSettings, ...updates };
    await onUpdateProject({ musicSettings: updated });
  };

  const handleSelectTrack = async (track: any) => {
    await handleUpdateSettings({
      trackId: track.id,
      trackTitle: track.title,
      mood: track.mood,
      audioPath: track.path,
    });
    addToast({ type: 'success', title: 'Music Track Selected', message: track.title });
  };

  const handleTogglePlay = (track: any) => {
    if (playingTrackId === track.id) {
      audioEl?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioEl) audioEl.pause();
      const newAudio = new Audio(`file://${track.path.replace(/\\/g, '/')}`);
      newAudio.volume = (currentSettings.volume ?? 30) / 100;
      newAudio.play().catch(() => {});
      newAudio.onended = () => setPlayingTrackId(null);
      setAudioEl(newAudio);
      setPlayingTrackId(track.id);
    }
  };

  const handleImportLocalAudio = async () => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['mp3', 'wav', 'aac', 'ogg']);
    if (file) {
      const fileName = file.split(/[\\/]/).pop() || 'Custom Music Track';
      await handleUpdateSettings({
        trackId: 'local_' + Date.now(),
        trackTitle: fileName,
        audioPath: file,
        mood: 'custom',
      });
      addToast({ type: 'success', title: 'Custom Music Imported', message: fileName });
    }
  };

  const moods = ['all', 'cinematic', 'suspense', 'emotional', 'happy', 'peaceful'];

  const filteredTracks = libraryTracks.filter((t) => {
    const matchesMood = selectedMood === 'all' || t.mood.toLowerCase() === selectedMood.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.genre.toLowerCase().includes(search.toLowerCase());
    return matchesMood && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Music size={18} className="text-brand-400" />
            Step 5: Background Music & Audio Ducking
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Add royalty-free music beds with automatic voice ducking, loop handling, and volume balancing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload size={13} />}
            onClick={handleImportLocalAudio}
          >
            Import Music Track
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Music Library Browser */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Royalty-Free Music Library"
            subtitle="Pre-cleared licensed soundtracks for YouTube, TikTok & Reels"
          >
            {/* Filters & Search */}
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-studio-500" />
                  <input
                    type="text"
                    placeholder="Search tracks by mood or title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-studio-200 placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Mood Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {moods.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMood(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      selectedMood === m
                        ? 'bg-brand-500 text-white shadow-subtle'
                        : 'bg-studio-950 text-studio-400 hover:text-studio-200 border border-studio-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Tracks List */}
            <div className="space-y-2">
              {filteredTracks.map((track) => {
                const isSelected = currentSettings.trackId === track.id;
                const isThisPlaying = playingTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500 shadow-subtle'
                        : 'bg-studio-950/70 border-studio-800 hover:border-studio-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePlay(track);
                        }}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          isThisPlaying
                            ? 'bg-brand-500 text-white animate-pulse'
                            : 'bg-studio-800 text-studio-300 hover:bg-studio-700'
                        }`}
                        title={isThisPlaying ? 'Pause Preview' : 'Play Preview'}
                      >
                        {isThisPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                      </button>

                      <div>
                        <h4
                          className={`text-xs font-bold ${
                            isSelected ? 'text-brand-300' : 'text-studio-200'
                          }`}
                        >
                          {track.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-studio-500">
                          <span className="capitalize text-brand-400 font-medium">{track.mood}</span>
                          <span>•</span>
                          <span>{track.genre}</span>
                          <span>•</span>
                          <span>{track.duration}s</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                          <Check size={12} />
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTrack(track);
                          }}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Audio Mixing & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Track Controls & Mixing" subtitle="Volume balance & audio ducking">
            <div className="space-y-4 text-xs">
              {/* Selected Track Banner */}
              <div className="p-3 rounded-xl bg-studio-950 border border-studio-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-studio-500 block uppercase font-mono">
                    Active Track
                  </span>
                  <span className="font-bold text-brand-300 text-xs">
                    {currentSettings.trackTitle}
                  </span>
                </div>
                <Badge variant="primary" size="sm">
                  {currentSettings.mood.toUpperCase()}
                </Badge>
              </div>

              {/* Volume Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-studio-300 font-medium">Background Music Volume:</span>
                  <span className="text-brand-400 font-bold">{currentSettings.volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={currentSettings.volume}
                  onChange={(e) => handleUpdateSettings({ volume: parseInt(e.target.value, 10) })}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-studio-500 mt-1">
                  <span>Subtle (15%)</span>
                  <span>Balanced (30%)</span>
                  <span>Dominant (80%)</span>
                </div>
              </div>

              {/* Toggles: Ducking, Loop, Fades */}
              <div className="p-3 bg-studio-950/70 border border-studio-800 rounded-xl space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-studio-200 block">
                      Audio Ducking Under Voice
                    </span>
                    <span className="text-[10px] text-studio-400">
                      Automatically lowers music volume when narration speaks
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.ducking}
                    onChange={(e) => handleUpdateSettings({ ducking: e.target.checked })}
                    className="rounded border-studio-700 text-brand-500 focus:ring-brand-500 bg-studio-900"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-studio-800/60">
                  <div>
                    <span className="text-xs font-semibold text-studio-200 block">
                      Auto-Loop Music Track
                    </span>
                    <span className="text-[10px] text-studio-400">
                      Seamlessly loops track to match target story duration
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.loop}
                    onChange={(e) => handleUpdateSettings({ loop: e.target.checked })}
                    className="rounded border-studio-700 text-brand-500 focus:ring-brand-500 bg-studio-900"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-studio-800/60">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-studio-300">
                    <input
                      type="checkbox"
                      checked={currentSettings.fadeIn}
                      onChange={(e) => handleUpdateSettings({ fadeIn: e.target.checked })}
                      className="rounded border-studio-700 text-brand-500 bg-studio-900"
                    />
                    <span>Fade-in intro</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-studio-300">
                    <input
                      type="checkbox"
                      checked={currentSettings.fadeOut}
                      onChange={(e) => handleUpdateSettings({ fadeOut: e.target.checked })}
                      className="rounded border-studio-700 text-brand-500 bg-studio-900"
                    />
                    <span>Fade-out ending</span>
                  </label>
                </div>
              </div>

              {/* Rights & Licensing Assurance */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-300">
                <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-bold block">100% Monetization Safe</span>
                  <span>
                    All library tracks are pre-cleared for YouTube Shorts, TikTok, and Meta Reels monetization with zero copyright strikes.
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
