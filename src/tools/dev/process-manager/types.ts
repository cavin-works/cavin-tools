/**
 * 进程信息
 */
export interface ProcessInfo {
  /** 进程ID */
  pid: number;
  /** 进程名称 */
  name: string;
  /** 进程路径(如果可用) */
  path?: string;
  /** CPU使用率(百分比,如果可用) */
  cpu_usage?: number;
  /** 内存使用(MB,如果可用) */
  memory_usage?: number;
  /** 是否为系统进程 */
  is_system: boolean;
}

/**
 * 端口占用信息
 */
export interface PortInfo {
  /** 端口号 */
  port: number;
  /** 协议类型(TCP/UDP) */
  protocol: string;
  /** 本地地址 */
  local_address: string;
  /** 远程地址(如果存在) */
  remote_address?: string;
  /** 进程ID */
  pid: number;
  /** 进程名称 */
  process_name: string;
  /** 连接状态 */
  state: string;
}

/**
 * 杀进程操作结果
 */
export interface KillResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 进程ID */
  pid: number;
}

/**
 * 视图类型
 */
export type ViewType = 'all' | 'search' | 'port';

/**
 * 操作状态
 */
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';
