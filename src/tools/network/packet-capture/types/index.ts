export interface CapturedRequest {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  host: string;
  path: string;
  scheme: string;
  request_headers: Record<string, string>;
  request_body: number[] | null;
  request_body_text: string | null;
  response: CapturedResponse | null;
  duration_ms: number | null;
}

export interface CapturedResponse {
  status_code: number;
  status_text: string;
  headers: Record<string, string>;
  body: number[] | null;
  body_text: string | null;
  content_type: string | null;
  content_length: number | null;
}

export interface FilterCriteria {
  url_pattern?: string;
  methods?: string[];
  status_codes?: number[];
  content_type?: string;
  search_text?: string;
}

export interface ProxyStatus {
  running: boolean;
  port: number;
  request_count: number;
  ca_installed: boolean;
}

export interface CaInfo {
  exists: boolean;
  path: string;
  pem: string | null;
}

export interface ApplicationInfo {
  name: string;
  exe_path: string;
  pids: number[];
  icon: string | null;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  exe_path: string | null;
  cmd: string[];
}

export interface WinDivertInfo {
  installed: boolean;
  version?: string;
  path: string;
}

export interface WinDivertDownloadProgress {
  current: number;
  total: number;
  percentage: number;
}
