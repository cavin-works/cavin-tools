import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  ProcessInfo,
  PortInfo,
  ViewType,
} from '../types';

interface ProcessManagerState {
  // 状态
  viewType: ViewType;
  processes: ProcessInfo[];
  searchResults: ProcessInfo[];
  portResults: PortInfo[];
  isLoading: boolean;
  error: string | null;

  // 操作
  setViewType: (view: ViewType) => void;
  setProcesses: (processes: ProcessInfo[]) => void;
  setSearchResults: (results: ProcessInfo[]) => void;
  setPortResults: (results: PortInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API 调用
  getProcesses: () => Promise<void>;
  searchProcesses: (name: string) => Promise<void>;
  killProcess: (pid: number) => Promise<void>;
  queryPort: (port: number) => Promise<void>;
  killPort: (port: number) => Promise<void>;
  queryPortsByPid: (pid: number) => Promise<PortInfo[]>;

  // 清除
  clear: () => void;
}

export const useProcessManagerStore = create<ProcessManagerState>((set, get) => ({
  // 初始状态
  viewType: 'all',
  processes: [],
  searchResults: [],
  portResults: [],
  isLoading: false,
  error: null,

  // 设置视图类型
  setViewType: (view) => set({ viewType: view }),

  // 设置进程列表
  setProcesses: (processes) => set({ processes }),

  // 设置搜索结果
  setSearchResults: (results) => set({ searchResults: results }),

  // 设置端口查询结果
  setPortResults: (results) => set({ portResults: results }),

  // 设置加载状态
  setLoading: (loading) => set({ isLoading: loading }),

  // 设置错误
  setError: (error) => set({ error }),

  // 获取所有进程
  getProcesses: async () => {
    const { setLoading, setError, setProcesses } = get();
    setLoading(true);
    setError(null);

    try {
      const processes = await invoke<ProcessInfo[]>('get_processes');
      setProcesses(processes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`获取进程列表失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  },

  // 搜索进程
  searchProcesses: async (name) => {
    const { setLoading, setError, setSearchResults, setViewType } = get();
    setLoading(true);
    setError(null);

    try {
      const results = await invoke<ProcessInfo[]>('search_processes', { name });
      setSearchResults(results);
      setViewType('search');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`搜索进程失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  },

  // 杀死进程
  killProcess: async (pid) => {
    const { setLoading, setError, getProcesses, viewType } = get();
    setLoading(true);
    setError(null);

    try {
      await invoke('kill_process_command', { pid });

      // 刷新进程列表
      if (viewType === 'all') {
        await getProcesses();
      } else if (viewType === 'search') {
        // 重新搜索以更新结果
        // 这里需要记录当前搜索词,暂时跳过
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`终止进程失败: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  },

  // 查询端口
  queryPort: async (port) => {
    const { setLoading, setError, setPortResults, setViewType } = get();
    setLoading(true);
    setError(null);

    try {
      const results = await invoke<PortInfo[]>('query_port_command', { port });
      setPortResults(results);
      setViewType('port');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`查询端口失败: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  },

  // 杀死占用端口的进程
  killPort: async (port) => {
    const { setLoading, setError, queryPort } = get();
    setLoading(true);
    setError(null);

    try {
      await invoke('kill_port_command', { port });

      // 重新查询端口以确认已释放
      await queryPort(port);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`释放端口失败: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  },

  // 根据PID查询进程占用的端口
  queryPortsByPid: async (pid: number) => {
    const { setError } = get();
    setError(null);

    try {
      const ports = await invoke<PortInfo[]>('query_ports_by_pid_command', { pid });
      return ports;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`查询端口失败: ${errorMessage}`);
      throw err;
    }
  },

  // 清除状态
  clear: () => set({
    processes: [],
    searchResults: [],
    portResults: [],
    isLoading: false,
    error: null,
  }),
}));

// 监听进程被杀死事件
if (typeof window !== 'undefined') {
  listen('process-killed', (event) => {
    console.log('进程被杀死:', event.payload);
    // 可以在这里添加额外的逻辑,比如显示通知
  });

  listen('port-released', (event) => {
    console.log('端口被释放:', event.payload);
    // 可以在这里添加额外的逻辑,比如显示通知
  });
}
