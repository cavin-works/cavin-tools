import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { CapturedRequest, FilterCriteria, ProxyStatus, CaInfo, ApplicationInfo, WinDivertInfo, WinDivertDownloadProgress } from '../types';

interface CaptureState {
  requests: CapturedRequest[];
  selectedRequest: CapturedRequest | null;
  filter: FilterCriteria;
  proxyStatus: ProxyStatus;
  caInfo: CaInfo | null;
  isLoading: boolean;
  error: string | null;
  applications: ApplicationInfo[];
  selectedApps: ApplicationInfo[];
  appSearchQuery: string;
  windivertInfo: WinDivertInfo | null;
  isDownloadingWinDivert: boolean;
  winDivertDownloadProgress: WinDivertDownloadProgress | null;

  init: () => Promise<void>;
  startCapture: (port?: number) => Promise<void>;
  stopCapture: () => Promise<void>;
  clearRequests: () => Promise<void>;
  setSelectedRequest: (request: CapturedRequest | null) => void;
  setFilter: (filter: FilterCriteria) => void;
  getFilteredRequests: () => CapturedRequest[];
  loadApplications: () => Promise<void>;
  searchApplications: (query: string) => Promise<void>;
  selectApp: (app: ApplicationInfo) => void;
  unselectApp: (app: ApplicationInfo) => void;
  clearSelectedApps: () => void;
  getWinDivertInfo: () => Promise<WinDivertInfo>;
  downloadWinDivert: () => Promise<void>;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  requests: [],
  selectedRequest: null,
  filter: {},
  proxyStatus: { running: false, port: 9527, request_count: 0, ca_installed: false },
  caInfo: null,
  isLoading: false,
  error: null,
  applications: [],
  selectedApps: [],
  appSearchQuery: '',
  windivertInfo: null,
  isDownloadingWinDivert: false,
  winDivertDownloadProgress: null,

  init: async () => {
    try {
      set({ isLoading: true, error: null });
      const caInfo = await invoke<CaInfo>('init_network_capture');
      set({ caInfo });
      const windivertInfo = await invoke<WinDivertInfo>('get_windivert_info');
      set({ windivertInfo });

      await listen<CapturedRequest>('captured-request', (event) => {
        set((state) => ({
          requests: [event.payload, ...state.requests].slice(0, 5000),
          proxyStatus: { ...state.proxyStatus, request_count: state.requests.length + 1 },
        }));
      });

      await listen<WinDivertDownloadProgress>('windivert-download-progress', (event) => {
        set({ winDivertDownloadProgress: event.payload });
      });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },

  startCapture: async (port = 9527) => {
    try {
      set({ isLoading: true, error: null });
      const status = await invoke<ProxyStatus>('start_network_capture', { port });
      set({ proxyStatus: status });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },

  stopCapture: async () => {
    try {
      set({ isLoading: true, error: null });
      await invoke('stop_network_capture');
      set({ proxyStatus: { ...get().proxyStatus, running: false } });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },

  clearRequests: async () => {
    try {
      await invoke('clear_captured_requests');
      set({ requests: [], selectedRequest: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  setSelectedRequest: (request) => set({ selectedRequest: request }),

  setFilter: (filter) => set({ filter }),

  getFilteredRequests: () => {
    const { requests, filter } = get();
    return requests.filter((req) => {
      if (filter.url_pattern && !req.url.toLowerCase().includes(filter.url_pattern.toLowerCase())) {
        return false;
      }
      if (filter.methods?.length && !filter.methods.includes(req.method)) {
        return false;
      }
      if (filter.status_codes?.length && req.response) {
        if (!filter.status_codes.includes(req.response.status_code)) {
          return false;
        }
      }
      if (filter.search_text) {
        const search = filter.search_text.toLowerCase();
        const inUrl = req.url.toLowerCase().includes(search);
        const inReqBody = req.request_body_text?.toLowerCase().includes(search);
        const inResBody = req.response?.body_text?.toLowerCase().includes(search);
        if (!inUrl && !inReqBody && !inResBody) {
          return false;
        }
      }
      return true;
    });
  },

  loadApplications: async () => {
    try {
      const apps = await invoke<ApplicationInfo[]>('get_running_applications');
      set({ applications: apps });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  searchApplications: async (query: string) => {
    set({ appSearchQuery: query });
    try {
      if (query.trim()) {
        const apps = await invoke<ApplicationInfo[]>('search_applications', { query });
        set({ applications: apps });
      } else {
        const apps = await invoke<ApplicationInfo[]>('get_running_applications');
        set({ applications: apps });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  selectApp: (app: ApplicationInfo) => {
    const { selectedApps } = get();
    if (!selectedApps.find(a => a.exe_path === app.exe_path)) {
      set({ selectedApps: [...selectedApps, app] });
    }
  },

  unselectApp: (app: ApplicationInfo) => {
    const { selectedApps } = get();
    set({ selectedApps: selectedApps.filter(a => a.exe_path !== app.exe_path) });
  },

  clearSelectedApps: () => {
    set({ selectedApps: [] });
  },

  getWinDivertInfo: async () => {
    try {
      set({ isLoading: true, error: null });
      const info = await invoke<WinDivertInfo>('get_windivert_info');
      set({ windivertInfo: info });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },

  downloadWinDivert: async () => {
    try {
      set({ isDownloadingWinDivert: true, error: null });
      const info = await invoke<WinDivertInfo>('download_windivert_command');
      set({ windivertInfo: info });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isDownloadingWinDivert: false });
    }
  },
}));
