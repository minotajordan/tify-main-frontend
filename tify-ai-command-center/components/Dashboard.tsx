import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useI18n } from '../i18n';
import { UserStats, Channel } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  onChangeView: (view: string) => void;
}

const CHART_DATA_PLACEHOLDER = [
  { name: 'Lun', sent: 400 },
  { name: 'Mar', sent: 300 },
  { name: 'Mie', sent: 550 },
  { name: 'Jue', sent: 450 },
  { name: 'Vie', sent: 600 },
  { name: 'Sab', sent: 200 },
  { name: 'Dom', sent: 150 },
];

const Dashboard: React.FC<DashboardProps> = ({ onChangeView }) => {
  const { t } = useI18n();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      let s: UserStats | null = null;
      let ch: Channel[] = [];
      try {
        const uid = api.getCurrentUserId();
        s = uid
          ? await api.getUserStats(uid)
          : ({
              subscribedChannelsCount: 0,
              messagesCount: 0,
              ownedChannelsCount: 0,
              pendingApprovalsCount: 0,
              recentActivity: [],
            } as any);
      } catch (err) {
        s = {
          subscribedChannelsCount: 0,
          messagesCount: 0,
          ownedChannelsCount: 0,
          pendingApprovalsCount: 0,
          recentActivity: [],
        } as any;
      }
      try {
        ch = await api.getChannels();
      } catch (err) {
        ch = [];
      }
      setStats(s);
      setChannels(ch);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Helper to sum members recursively
  const calculateTotalMembers = (channs: Channel[]): number => {
    if (!Array.isArray(channs)) return 0;
    return channs.reduce((acc, curr) => {
      const base = Number((curr as any).memberCount || 0);
      const subCount = Array.isArray(curr.subchannels)
        ? calculateTotalMembers(curr.subchannels)
        : 0;
      return acc + base + subCount;
    }, 0);
  };

  const totalMembers = calculateTotalMembers(channels);
  const verifiedChannels = channels.filter((c) =>
    ['VERIFIED', 'VERIFIED_CERTIFIED'].includes((c as any).verificationStatus)
  ).length;

  const StatCard = ({ title, value, icon: Icon, color, subtext, onClick }: any) => (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="flex items-center text-xs text-gray-400 group-hover:text-indigo-600 transition-colors">
        <span>{subtext}</span>
        <ArrowRight
          size={12}
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
          </div>
          <div className="h-7 w-40 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-6 w-20 bg-gray-200 rounded mt-2" />
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded" />
              </div>
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="h-5 w-48 bg-gray-200 rounded mb-6" />
            <div className="h-80 w-full bg-gray-100 rounded" />
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <AlertTriangle className="mr-2" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.overview')}</h2>
          <p className="text-gray-500">{t('dashboard.metrics')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-md border shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          {t('dashboard.systemOperational')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dashboard.totalReach')}
          value={totalMembers.toLocaleString()}
          icon={Users}
          color="bg-blue-500"
          subtext="Across all channels"
          onClick={() => onChangeView('channels')}
        />
        <StatCard
          title={t('dashboard.pendingApprovals')}
          value={stats?.pendingApprovalsCount || 0}
          icon={CheckCircle}
          color="bg-amber-500"
          subtext={t('dashboard.requiresAttention')}
          onClick={() => onChangeView('approvals')}
        />
        <StatCard
          title={t('dashboard.messagesSent')}
          value={stats?.messagesCount || 0}
          icon={Activity}
          color="bg-indigo-500"
          subtext={t('dashboard.lifetimeTotal')}
          onClick={() => onChangeView('messages')}
        />
        <StatCard
          title={t('dashboard.verifiedChannels')}
          value={verifiedChannels}
          icon={CheckCircle}
          color="bg-emerald-500"
          subtext={t('dashboard.trustSafety')}
          onClick={() => onChangeView('channels')}
        />
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t('dashboard.messageActivity')}
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={CHART_DATA_PLACEHOLDER}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="sent" name="Sent" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.recentActivity')}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((msg: any) => (
                <div key={msg.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2 font-medium">
                    New message in {msg.channel?.title || 'Channel'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">{t('dashboard.noRecentActivity')}</p>
            )}

            <button
              onClick={() => onChangeView('messages')}
              className="w-full py-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors border-t border-gray-100 mt-2"
            >
              {t('dashboard.viewAllMessages')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
