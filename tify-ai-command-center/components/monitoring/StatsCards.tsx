import React, { useMemo } from 'react';

type Props = {
  stats: { total: number; avgResponseTime: number; statusCodes: Record<string, number> };
  topEndpoints: Array<{ endpoint: string; count: number }>;
};

export default function StatsCards({ stats, topEndpoints }: Props) {
  const dist = useMemo(() => {
    const d = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } as Record<string, number>;
    for (const [code, count] of Object.entries(stats.statusCodes || {})) {
      const n = parseInt(code, 10);
      if (n >= 200 && n < 300) d['2xx'] += count;
      else if (n >= 300 && n < 400) d['3xx'] += count;
      else if (n >= 400 && n < 500) d['4xx'] += count;
      else if (n >= 500) d['5xx'] += count;
    }
    return d;
  }, [stats.statusCodes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-xs text-gray-500">Total de peticiones</div>
        <div className="text-2xl font-semibold">{stats.total}</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-xs text-gray-500">Promedio de respuesta</div>
        <div className="text-2xl font-semibold">{stats.avgResponseTime} ms</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-xs text-gray-500">Códigos HTTP</div>
        <div className="flex gap-3 mt-1 text-sm">
          <span className="text-green-600">2xx: {dist['2xx']}</span>
          <span className="text-blue-600">3xx: {dist['3xx']}</span>
          <span className="text-yellow-600">4xx: {dist['4xx']}</span>
          <span className="text-red-600">5xx: {dist['5xx']}</span>
        </div>
      </div>

      <div className="md:col-span-3 bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 mb-2">Endpoints más consultados</div>
        <ul className="space-y-1">
          {topEndpoints.map((e, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{e.endpoint}</span>
              <span className="font-mono">{e.count}</span>
            </li>
          ))}
          {topEndpoints.length === 0 && <li className="text-gray-500">Sin datos</li>}
        </ul>
      </div>
    </div>
  );
}
