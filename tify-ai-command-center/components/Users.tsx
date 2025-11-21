// /Users/minotajordan/WebstormProjects/tify/tify-ai-command-center/components/Users.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { User, Message } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { Search, Loader2, RefreshCw, User as UserIcon, ShieldCheck, Mail, Phone, MessageSquare, CheckCircle, ChevronRight, ChevronDown, Bell, Copy, Key } from 'lucide-react';
import { useI18n } from '../i18n';

type SubscriptionItem = { id: string; channel: { id: string; title: string; icon?: string; logoUrl?: string } };
type ApproverItem = { id: string; channel: { id: string; title: string; icon?: string; parentId?: string } };

const UsersModule: React.FC = () => {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersLimit, setUsersLimit] = useState(10);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', username: '', fullName: '', phoneNumber: '', avatarUrl: '', isAdmin: false, password: '' });
  const [selected, setSelected] = useState<User | null>(null);
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [approvers, setApprovers] = useState<ApproverItem[]>([]);
  const [pending, setPending] = useState<Message[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [windowHours, setWindowHours] = useState<number>(24);

  useEffect(() => {
    if (selected) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tify_breadcrumbs', { detail: [ { label: t('nav.users'), view: 'users' }, { label: selected.fullName || selected.username || selected.id } ] }));
      }
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tify_breadcrumbs', { detail: [ { label: t('nav.users'), view: 'users' } ] }));
      }
    }
  }, [selected]);

  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true);
      try {
        const res: any = await api.getUsersPaged(1, usersLimit, query);
        setUsers(res.items || []);
        setUsersPage(1);
        setUsersPages(res.pagination?.pages || 1);
        setSelected((res.items || [])[0] || null);
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, [query, usersLimit]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const obs = new IntersectionObserver(async (entries) => {
      const first = entries[0];
      if (first.isIntersecting && !usersLoadingMore && usersPage < usersPages) {
        setUsersLoadingMore(true);
        try {
          const res: any = await api.getUsersPaged(usersPage + 1, usersLimit, query);
          setUsers(prev => [...prev, ...(res.items || [])]);
          setUsersPage(p => p + 1);
          setUsersPages(res.pagination?.pages || usersPages);
        } finally {
          setUsersLoadingMore(false);
        }
      }
    });
    obs.observe(el);
    return () => { obs.disconnect(); };
  }, [usersPage, usersPages, usersLoadingMore, query, usersLimit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const loadDetail = async (user: User | null, hours?: number) => {
    if (!user) return;
    setLoadingDetail(true);
    try {
      const fresh = await api.getUserProfile(user.id);
      setSelected(fresh);
      const [s, a, p] = await Promise.all([
        api.getUserSubscriptions(user.id),
        api.getUserApproverAssignments(user.id),
        api.getUserPendingApprovals(user.id, hours ?? windowHours)
      ]);
      setSubs(s);
      setApprovers(a);
      setPending(p);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selected?.id) loadDetail(selected);
  }, [selected?.id]);

  const onRefresh = async () => {
    await loadDetail(selected, windowHours);
  };

  const generateCode = async () => {
    if (!selected) return;
    await api.requestUserVerificationCode(selected.id);
    const fresh = await api.getUserProfile(selected.id);
    setSelected(fresh);
  };

  const copyCode = async () => {
    if (!selected?.verificationCode) return;
    try { await navigator.clipboard.writeText(selected.verificationCode); } catch {}
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-screen">
      <aside className="md:col-span-4 bg-white border border-gray-200 rounded-xl p-4 flex flex-col h-screen">
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <button onClick={() => setQuery('')} className="text-xs text-gray-500">{t('users.clear')}</button>
        </div>

        <div className="mb-4 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{t('users.createUser')}</div>
            <button onClick={()=>setShowCreateModal(true)} className="px-3 py-2 bg-indigo-600 text-white rounded text-xs">{t('users.create')}</button>
          </div>
        </div>

        {loadingUsers ? (
          <div className="animate-pulse space-y-2">
            {Array.from({length:8}).map((_,i)=> (
              <div key={i} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
                <div className="h-4 w-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left ${selected?.id === u.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <img src={u.avatarUrl || DEFAULT_AVATAR} alt={u.fullName} className="w-8 h-8 rounded-full border border-gray-200" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.fullName || u.username}</span>
                    {u.isAdmin && <ShieldCheck size={14} className="text-indigo-600" />}
                  </div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">Suscripciones</div>
                  <div className="text-xs font-semibold">{(u as any).subscribedChannelsCount ?? 0}</div>
                </div>
              </button>
            ))}
            <div ref={loadMoreRef} />
            {users.length === 0 && (
              <div className="text-center text-xs text-gray-500 py-6">{t('users.noResults')}</div>
            )}
          </div>
        )}
      </aside>

      <section className="md:col-span-8 bg-white border border-gray-200 rounded-xl p-4">
        {!selected ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            <UserIcon size={18} className="mr-2" />
            <span className="text-sm">{t('users.selectUser')}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-4">
                <img src={selected.avatarUrl || DEFAULT_AVATAR} alt={selected.fullName} className="w-12 h-12 rounded-full border border-gray-200" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{selected.fullName || selected.username}</h2>
                    {selected.isAdmin && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">Admin</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1"><Mail size={12} /> <span>{selected.email}</span></div>
                    {selected.phoneNumber && <div className="flex items-center gap-1"><Phone size={12} /> <span>{selected.phoneNumber}</span></div>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-600">{t('users.window')}</label>
                <input
                  type="number"
                  min={1}
                  value={windowHours}
                  onChange={e => setWindowHours(Number(e.target.value))}
                  className="w-16 px-2 py-1 border rounded text-xs"
                />
                <button onClick={onRefresh} title={t('users.refresh')} aria-label={t('users.refresh')} className="px-2 py-2 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 text-sm flex items-center gap-2">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 border rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-gray-500" />
                <div className="text-sm font-medium">{selected.phoneNumber || 'Sin número'}</div>
                {selected.isPhoneVerified ? (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{t('users.verified')}</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">{t('users.notVerified')}</span>
                )}
              </div>
              {!selected.isPhoneVerified && (
                <div className="flex items-center gap-3">
                  <Key size={14} className="text-gray-500" />
                  <div className="text-sm font-mono">{selected.verificationCode || '—'}</div>
                  {selected.verificationCodeExpiresAt && (
                    <div className="text-xs text-gray-400">{t('users.expires')} {new Date(selected.verificationCodeExpiresAt as any).toLocaleTimeString()}</div>
                  )}
                  <button onClick={copyCode} disabled={!selected.verificationCode} title={t('users.copy')} aria-label={t('users.copy')} className={`px-2 py-1 border rounded text-xs flex items-center gap-1 ${!selected.verificationCode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Copy size={14} />
                  </button>
                  <button onClick={generateCode} title={t('users.generateCode')} aria-label={t('users.generateCode')} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
                    <Key size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-gray-500">{t('users.subscriptions')}</div>
                <div className="text-2xl font-bold">{(selected as any).subscribedChannelsCount ?? 0}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-gray-500">{t('users.messages')}</div>
                <div className="text-2xl font-bold">{(selected as any).messagesCount ?? 0}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-gray-500">{t('users.ownedChannels')}</div>
                <div className="text-2xl font-bold">{(selected as any).ownedChannelsCount ?? 0}</div>
              </div>
            </div>

            {loadingDetail ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-2 p-4">
                    {Array.from({length:6}).map((_,i)=> (<div key={i} className="h-10 bg-gray-100 rounded" />))}
                  </div>
                </div>
                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-2 p-4">
                    {Array.from({length:6}).map((_,i)=> (<div key={i} className="h-10 bg-gray-100 rounded" />))}
                  </div>
                </div>
                <div className="lg:col-span-2 border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-2 p-4">
                    {Array.from({length:4}).map((_,i)=> (<div key={i} className="h-16 bg-gray-100 rounded" />))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-indigo-600" />
                      <span className="text-sm font-semibold">Suscripciones</span>
                    </div>
                    <div className="text-xs text-gray-500">{subs.length}</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {subs.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs text-gray-500">{t('users.noSubscriptions')}</div>
                    ) : subs.map(s => (
                      <div key={s.id} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                        <img src={s.channel.logoUrl || DEFAULT_AVATAR} alt={s.channel.title} className="w-8 h-8 rounded border border-gray-200" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{s.channel.title}</div>
                          <div className="text-xs text-gray-500">{s.channel.icon || 'icon'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm font-semibold">{t('users.assignments')}</span>
                    </div>
                    <div className="text-xs text-gray-500">{approvers.length}</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {approvers.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs text-gray-500">{t('users.noAssignments')}</div>
                    ) : approvers.map(a => (
                      <div key={a.id} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                        <ShieldCheck size={18} className="text-indigo-600" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{a.channel.title}</div>
                          <div className="text-xs text-gray-500">{a.channel.icon || 'icon'}{a.channel.parentId ? ' · Subcanal' : ' · Canal'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 border rounded-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-orange-600" />
                      <span className="text-sm font-semibold">{t('users.pendingApprovals')}</span>
                    </div>
                    <div className="text-xs text-gray-500">{pending.length}</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {pending.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs text-gray-500">{t('users.noPending')}</div>
                    ) : pending.map(m => (
                      <div key={m.id} className="px-4 py-3 border-b last:border-b-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ChevronRight size={14} className="text-gray-400" />
                            <div className="text-sm font-semibold">{m.channel?.title}</div>
                          </div>
                          <div className="text-xs text-gray-500">{new Date(m.createdAt as any).toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{m.content}</div>
                        <div className="text-xs text-gray-500 mt-1">{t('approval.by')}: {m.sender?.fullName || m.sender?.username}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    {showCreateModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white w-full max-w-lg rounded-xl shadow-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('users.createUser')}</h3>
              <p className="text-xs text-gray-500">Completa los datos para crear un usuario</p>
            </div>
            <button onClick={()=>setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full">×</button>
          </div>
          <div className="p-6 space-y-3">
            <input value={createForm.email} onChange={e=>setCreateForm({...createForm,email:e.target.value})} placeholder="Email" className="w-full px-3 py-2 border rounded text-sm" />
            <input value={createForm.username} onChange={e=>setCreateForm({...createForm,username:e.target.value})} placeholder="Usuario" className="w-full px-3 py-2 border rounded text-sm" />
            <input value={createForm.fullName} onChange={e=>setCreateForm({...createForm,fullName:e.target.value})} placeholder="Nombre completo" className="w-full px-3 py-2 border rounded text-sm" />
            <input value={createForm.phoneNumber} onChange={e=>setCreateForm({...createForm,phoneNumber:e.target.value})} placeholder="Teléfono" className="w-full px-3 py-2 border rounded text-sm" />
            <input value={createForm.avatarUrl} onChange={e=>setCreateForm({...createForm,avatarUrl:e.target.value})} placeholder="Avatar URL" className="w-full px-3 py-2 border rounded text-sm" />
            <input type="password" value={createForm.password} onChange={e=>setCreateForm({...createForm,password:e.target.value})} placeholder="Contraseña (opcional)" className="w-full px-3 py-2 border rounded text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={createForm.isAdmin} onChange={e=>setCreateForm({...createForm,isAdmin:e.target.checked})} /> Admin</label>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button onClick={()=>setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded">Cancelar</button>
              <button onClick={async ()=>{ await api.createUser(createForm as any); const res:any = await api.getUsersPaged(1, usersLimit, query); setUsers(res.items||[]); setUsersPage(1); setUsersPages(res.pagination?.pages||1); setSelected((res.items||[])[0]||null); setShowCreateModal(false); setCreateForm({ email: '', username: '', fullName: '', phoneNumber: '', avatarUrl: '', isAdmin: false, password: '' }); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Crear usuario</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default UsersModule;