import { create } from 'zustand';
import { DashboardStats, StudioSettings, SystemHealth } from '../../../shared/types';

export type NavigationSection =
  | 'dashboard'
  | 'ai-studio'
  | 'characters'
  | 'story-projects'
  | 'video-library'
  | 'publish-center'
  | 'calendar'
  | 'phone-control'
  | 'analytics'
  | 'automation-queue'
  | 'logs'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warn' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

interface AppState {
  currentSection: NavigationSection;
  setCurrentSection: (section: NavigationSection) => void;

  health: SystemHealth | null;
  stats: DashboardStats | null;
  settings: StudioSettings | null;

  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  fetchSystemHealth: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (partial: Partial<StudioSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentSection: 'dashboard',
  setCurrentSection: (section) => set({ currentSection: section }),

  health: null,
  stats: null,
  settings: null,

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  fetchSystemHealth: async () => {
    try {
      if (window.api) {
        const health = await window.api.getSystemHealth();
        set({ health });
      }
    } catch (err: any) {
      console.error('Failed to fetch system health', err);
    }
  },

  fetchDashboardStats: async () => {
    try {
      if (window.api) {
        const stats = await window.api.getDashboardStats();
        set({ stats });
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats', err);
    }
  },

  fetchSettings: async () => {
    try {
      if (window.api) {
        const settings = await window.api.getSettings();
        set({ settings });
      }
    } catch (err: any) {
      console.error('Failed to fetch settings', err);
    }
  },

  updateSettings: async (partial) => {
    try {
      if (window.api) {
        const updated = await window.api.updateSettings(partial);
        set({ settings: updated });
        get().addToast({
          type: 'success',
          title: 'Settings Saved',
          message: 'Application configuration updated.',
        });
      }
    } catch (err: any) {
      get().addToast({
        type: 'error',
        title: 'Error Saving Settings',
        message: err.message,
      });
    }
  },
}));
