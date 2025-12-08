import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

type Props = {
  series: Array<{ second: number; count: number }>;
};

export default function RequestsChart({ series }: Props) {
  const data = series.map((p) => ({
    time: new Date(p.second * 1000).toLocaleTimeString(),
    count: p.count,
  }));

  return (
    <div className="w-full h-64 bg-white rounded-lg shadow p-4">
      <div className="mb-2 text-sm text-gray-600">Peticiones por segundo (últimos 60s)</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" hide />
          <YAxis allowDecimals={false} width={30} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
