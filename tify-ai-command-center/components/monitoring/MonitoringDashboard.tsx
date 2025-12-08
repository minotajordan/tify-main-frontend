import React, { useEffect, useState } from 'react';
import RequestsChart from './RequestsChart';
import RequestsList from './RequestsList';
import StatsCards from './StatsCards';
import { useMonitoring } from '../../hooks/useMonitoring';

export default function MonitoringDashboard() {
  const {
    connected,
    paused,
    series,
    requestsPerSecond,
    recentRequests,
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
  } = useMonitoring('http://localhost:3334');

  const [threshold, setThreshold] = useState(1000);
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    const last = recentRequests[0];
    if (last && last.responseTime > threshold) {
      setAlert(
        `Alerta: respuesta alta (${last.responseTime} ms) en ${last.method} ${last.endpoint}`
      );
      const t = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(t);
    }
  }, [recentRequests, threshold]);

  return (
    <div className="p-4 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm text-gray-600">{connected ? 'Conectado' : 'Desconectado'}</span>
          <span className="ml-4 text-sm">RPS: {requestsPerSecond}</span>
        </div>
        <div className="flex items-center gap-2">
          {paused ? (
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={resume}>
              Reanudar
            </button>
          ) : (
            <button className="px-3 py-1 bg-gray-700 text-white rounded" onClick={pause}>
              Pausar
            </button>
          )}
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={clear}>
            Limpiar
          </button>
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={exportCSV}>
            Exportar CSV
          </button>
        </div>
      </div>

      {alert && <div className="p-2 bg-yellow-100 text-yellow-800 rounded">{alert}</div>}

      <RequestsChart series={series} />

      <StatsCards stats={stats} topEndpoints={topEndpoints} />

      <RequestsList
        requests={recentRequests}
        methodFilter={methodFilter}
        setMethodFilter={setMethodFilter}
        codeFilter={codeFilter}
        setCodeFilter={setCodeFilter}
      />

      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 mb-2">
          Umbral de alerta por tiempo de respuesta (ms)
        </div>
        <input
          type="number"
          className="px-2 py-1 border rounded"
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value || '0', 10))}
        />
      </div>
    </div>
  );
}
