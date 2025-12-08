export type MonitoringSnapshot = {
  timestamp: number;
  requestsPerSecond: number;
  recentRequests: Array<{
    method: string;
    endpoint: string;
    statusCode: number;
    responseTime: number;
    timestamp: number;
  }>;
  stats: {
    total: number;
    avgResponseTime: number;
    statusCodes: Record<string, number>;
  };
  topEndpoints: Array<{ endpoint: string; count: number }>;
  series: Array<{ second: number; count: number }>;
};

export type MonitoringConnection = {
  start: () => void;
  stop: () => void;
  onMessage: (fn: (data: MonitoringSnapshot) => void) => void;
  onOpen: (fn: () => void) => void;
  onError: (fn: (e: Event) => void) => void;
};

export function createMonitoringConnection(
  url = 'http://localhost:3334/stream'
): MonitoringConnection {
  let es: EventSource | null = null;
  let onMsg: ((d: MonitoringSnapshot) => void) | null = null;
  let onOpenCb: (() => void) | null = null;
  let onErrCb: ((e: Event) => void) | null = null;

  const start = () => {
    if (es) return;
    es = new EventSource(url);
    es.onopen = () => {
      if (onOpenCb) onOpenCb();
    };
    es.onerror = (e) => {
      if (onErrCb) onErrCb(e);
    };
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as MonitoringSnapshot;
        if (onMsg) onMsg(data);
      } catch {}
    };
  };

  const stop = () => {
    if (!es) return;
    es.close();
    es = null;
  };

  return {
    start,
    stop,
    onMessage: (fn) => {
      onMsg = fn;
    },
    onOpen: (fn) => {
      onOpenCb = fn;
    },
    onError: (fn) => {
      onErrCb = fn;
    },
  };
}

export async function resetMonitoring(baseUrl = 'http://localhost:3334') {
  await fetch(`${baseUrl}/reset`, { method: 'POST' });
}
