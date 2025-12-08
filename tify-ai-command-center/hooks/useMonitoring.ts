import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createMonitoringConnection,
  resetMonitoring,
  MonitoringSnapshot,
} from '../services/monitoringService';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export function useMonitoring(baseUrl = 'http://localhost:3334') {
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [series, setSeries] = useState<Array<{ second: number; count: number }>>([]);
  const [requestsPerSecond, setRps] = useState(0);
  const [recentRequests, setRecent] = useState<MonitoringSnapshot['recentRequests']>([]);
  const [stats, setStats] = useState<MonitoringSnapshot['stats']>({
    total: 0,
    avgResponseTime: 0,
    statusCodes: {},
  });
  const [topEndpoints, setTop] = useState<MonitoringSnapshot['topEndpoints']>([]);

  const [methodFilter, setMethodFilter] = useState<Method | 'ALL'>('ALL');
  const [codeFilter, setCodeFilter] = useState<'ALL' | '2xx' | '3xx' | '4xx' | '5xx'>('ALL');

  const connRef = useRef(createMonitoringConnection(`${baseUrl}/stream`));

  useEffect(() => {
    const conn = connRef.current;
    conn.onOpen(() => setConnected(true));
    conn.onError(() => setConnected(false));
    conn.onMessage((snap) => {
      if (paused) return;
      setSeries(snap.series);
      setRps(snap.requestsPerSecond);
      setRecent(snap.recentRequests);
      setStats(snap.stats);
      setTop(snap.topEndpoints);
    });
    conn.start();
    return () => conn.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const filteredRequests = useMemo(() => {
    return recentRequests.filter((r) => {
      const methodOk = methodFilter === 'ALL' ? true : r.method === methodFilter;
      const code = r.statusCode;
      const codeOk =
        codeFilter === 'ALL'
          ? true
          : codeFilter === '2xx'
            ? code >= 200 && code < 300
            : codeFilter === '3xx'
              ? code >= 300 && code < 400
              : codeFilter === '4xx'
                ? code >= 400 && code < 500
                : code >= 500;
      return methodOk && codeOk;
    });
  }, [recentRequests, methodFilter, codeFilter]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);
  const clear = async () => {
    setSeries([]);
    setRps(0);
    setRecent([]);
    setStats({ total: 0, avgResponseTime: 0, statusCodes: {} });
    setTop([]);
    try {
      await resetMonitoring(baseUrl);
    } catch {}
  };

  const exportCSV = () => {
    const rows = [['timestamp', 'method', 'endpoint', 'statusCode', 'responseTime']];
    for (const r of recentRequests) {
      rows.push([
        String(r.timestamp),
        r.method,
        r.endpoint,
        String(r.statusCode),
        String(r.responseTime),
      ]);
    }
    const csv = rows
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    connected,
    paused,
    series,
    requestsPerSecond,
    recentRequests: filteredRequests,
    stats,
    topEndpoints,
    methodFilter,
    setMethodFilter,
    codeFilter,
    setCodeFilter,
    pause,
    resume,
    clear,
    exportCSV,
  };
}
