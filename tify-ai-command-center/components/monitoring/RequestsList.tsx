import React from 'react';

type RequestItem = {
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
};

type Props = {
  requests: RequestItem[];
  methodFilter: string;
  setMethodFilter: (m: any) => void;
  codeFilter: string;
  setCodeFilter: (c: any) => void;
};

const methods: Array<{ label: string; value: string }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
];

const codes: Array<{ label: string; value: string }> = [
  { label: 'Todos', value: 'ALL' },
  { label: '2xx', value: '2xx' },
  { label: '3xx', value: '3xx' },
  { label: '4xx', value: '4xx' },
  { label: '5xx', value: '5xx' },
];

export default function RequestsList({ requests, methodFilter, setMethodFilter, codeFilter, setCodeFilter }: Props) {
  return (
    <div className="w-full bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">Peticiones recientes</div>
        <div className="flex gap-2">
          <select className="px-2 py-1 border rounded" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="px-2 py-1 border rounded" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)}>
            {codes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-auto max-h-80">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-2">Hora</th>
              <th className="py-1 pr-2">Método</th>
              <th className="py-1 pr-2">Endpoint</th>
              <th className="py-1 pr-2">Código</th>
              <th className="py-1 pr-2">Tiempo (ms)</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-1 pr-2 text-gray-700">{new Date(r.timestamp).toLocaleTimeString()}</td>
                <td className="py-1 pr-2 font-mono">{r.method}</td>
                <td className="py-1 pr-2 text-gray-700">{r.endpoint}</td>
                <td className="py-1 pr-2">{r.statusCode}</td>
                <td className="py-1 pr-2">{r.responseTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}