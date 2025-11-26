// /Users/minotajordan/WebstormProjects/tify/tify-ai-command-center/components/Users.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, API_BASE } from '../services/api';
import { User, Message } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { Search, Loader2, RefreshCw, User as UserIcon, ShieldCheck, Mail, Phone, MessageSquare, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, Bell, Copy, Key, UserCheck, SlidersHorizontal, Ban, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';

type SubscriptionItem = { id: string; channel: { id: string; title: string; icon?: string; logoUrl?: string } };
type ApproverItem = { id: string; channel: { id: string; title: string; icon?: string; parentId?: string } };

const UsersModule: React.FC = () => {
  const { t } = useI18n();
  const formatAgo = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso as any);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff/60000);
    const h = Math.floor(m/60);
    const days = Math.floor(h/24);
    const months = Math.floor(days/30);
    const years = Math.floor(days/365);
    if (years > 0) return `hace ${years} año${years>1?'s':''}`;
    if (months > 0) return `hace ${months} mes${months>1?'es':''}`;
    if (days > 0) return `hace ${days} día${days>1?'s':''}`;
    if (h > 0) return `hace ${h} hora${h>1?'s':''}`;
    if (m > 0) return `hace ${m} minuto${m>1?'s':''}`;
    return 'hace segundos';
  };
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
  const [me, setMe] = useState<User | null>(null);
  const [subsModalOpen, setSubsModalOpen] = useState(false);
  const [confirmSubId, setConfirmSubId] = useState<string|null>(null);
  const [detailTab, setDetailTab] = useState<'overview'|'subscriptions'|'assignments'|'pending'|'audit'|'requests'>('subscriptions');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [windowRange, setWindowRange] = useState<'1h'|'24h'|'7d'|'1m'|'all'>('24h');
  const [activity, setActivity] = useState<{ sentInRange: number; deliveriesInRange: number; read: number; unread: number } | null>(null);
  const [topChannels, setTopChannels] = useState<Array<{ channel: { id: string; title: string; icon?: string; logoUrl?: string }, count: number }>>([]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(1);
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [colWidths, setColWidths] = useState<{ endpoint: number; status: number; type: number; payload: number; response: number; fecha: number }>({ endpoint: 320, status: 80, type: 90, payload: 300, response: 300, fecha: 140 });
  const setWidth = (key: keyof typeof colWidths, value: number) => setColWidths(prev => ({ ...prev, [key]: Math.max(80, Math.min(1000, value)) }));
  const [dragKey, setDragKey] = useState<keyof typeof colWidths | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartWidth, setDragStartWidth] = useState<number>(0);
  const startDrag = (key: keyof typeof colWidths, e: React.MouseEvent) => { setDragKey(key); setDragStartX(e.clientX); setDragStartWidth(colWidths[key]); };
  const autofit = (key: keyof typeof colWidths) => {
    const rows = requestLog || [];
    const getText = (row: any) => {
      if (key === 'endpoint') return String(row.endpoint || '');
      if (key === 'status') return String(row.status || 0);
      if (key === 'payload') { try { const obj = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload; return JSON.stringify(obj || null); } catch { return typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload || null); } }
      if (key === 'response') { try { const obj = typeof row.response === 'string' ? JSON.parse(row.response) : row.response; return JSON.stringify(obj || null); } catch { return typeof row.response === 'string' ? row.response : JSON.stringify(row.response || null); } }
      if (key === 'fecha') return String(new Date(row.date).toLocaleString());
      return '';
    };
    let maxLen = 16;
    for (const r of rows) { const txt = getText(r); maxLen = Math.max(maxLen, (txt || '').length); }
    const px = Math.min(1000, Math.max(80, Math.round(maxLen * 7.2))); // aprox monospace
    setWidth(key, px);
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!dragKey) return; const dx = e.clientX - dragStartX; setWidth(dragKey, dragStartWidth + dx); };
    const onUp = () => { setDragKey(null); };
    if (dragKey) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragKey, dragStartX, dragStartWidth]);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => { const h = setInterval(()=>setNowTick(Date.now()), 1000); return ()=>clearInterval(h); }, []);
  useEffect(() => {
    const key = selected?.id ? `tify_user_requests_colwidths_${selected.id}` : 'tify_user_requests_colwidths_default';
    try { const saved = localStorage.getItem(key); if (saved) { const obj = JSON.parse(saved); if (obj && typeof obj === 'object') setColWidths(prev => ({ ...prev, ...obj })); } } catch {}
  }, [selected?.id]);
  useEffect(() => {
    const key = selected?.id ? `tify_user_requests_colwidths_${selected.id}` : 'tify_user_requests_colwidths_default';
    try { localStorage.setItem(key, JSON.stringify(colWidths)); } catch {}
  }, [colWidths, selected?.id]);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonModalTitle, setJsonModalTitle] = useState('');
  const [jsonModalValue, setJsonModalValue] = useState<any>(null);
  const [jsonSearch, setJsonSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));
  const formatElapsed = (ts: number): string => {
    const diff = Math.max(0, Math.floor((nowTick - ts) / 1000));
    const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60); const s = diff % 60;
    if (h > 0) return `hace ${h}h ${m}m ${s}s`;
    if (m > 0) return `hace ${m}m ${s}s`;
    return `hace ${s}s`;
  };
  const extractMethod = (endpoint: string): string => {
    const m = String(endpoint||'').split(' ')[0];
    return m || 'REQ';
  };

  const renderJsonColored = (value: any): any => {
    const t = typeof value;
    if (value === null) return (<span className="text-orange-600">null</span>);
    if (t === 'string') return (<span className="text-green-700">"{value}"</span>);
    if (t === 'number') return (<span className="text-purple-700">{String(value)}</span>);
    if (t === 'boolean') return (<span className="text-orange-700">{String(value)}</span>);
    if (Array.isArray(value)) {
      return (<span className="text-gray-800">[ {value.map((v, i) => (<span key={i}>{renderJsonColored(v)}{i < value.length-1 ? ', ' : ''}</span>))} ]</span>);
    }
    if (t === 'object') {
      const entries = Object.entries(value || {});
      return (
        <span className="text-gray-800">{'{'} {entries.map(([k,v], idx) => (
          <span key={k}>
            <span className="text-blue-700">"{k}"</span>
            <span>: </span>
            {renderJsonColored(v)}
            {idx < entries.length-1 ? <span>, </span> : null}
          </span>
        ))} {'}'}
        </span>
      );
    }
    return (<span className="text-gray-700">{String(value)}</span>);
  };

  const colorizeJsonString = (s: string): any => {
    const parts: any[] = [];
    const regex = /"(\\.|[^"\\])*"|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?|[{}\[\],:]/g;
    let lastIndex = 0; let m;
    while ((m = regex.exec(s)) !== null) {
      if (m.index > lastIndex) parts.push(<span key={lastIndex} className="text-gray-800">{s.slice(lastIndex, m.index)}</span>);
      const token = m[0];
      let cls = 'text-gray-800';
      if (token === 'true' || token === 'false') cls = 'text-orange-700';
      else if (token === 'null') cls = 'text-orange-600';
      else if (/^"/.test(token)) cls = 'text-green-700';
      else if (/^-?\d/.test(token)) cls = 'text-purple-700';
      else if (/[{}\[\],:]/.test(token)) cls = 'text-gray-500';
      parts.push(<span key={m.index} className={cls}>{token}</span>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < s.length) parts.push(<span key={lastIndex} className="text-gray-800">{s.slice(lastIndex)}</span>);
    return <>{parts}</>;
  };
  const renderJsonPreview = (value: any): any => {
    let txt = '';
    try { const obj = typeof value === 'string' ? JSON.parse(value) : value; txt = JSON.stringify(obj || null); }
    catch { txt = typeof value === 'string' ? value : JSON.stringify(value || null); }
    if (txt.length > 300) txt = txt.slice(0, 300) + '…';
    return (<span className="font-mono text-[11px]">{colorizeJsonString(txt)}</span>);
  };


  const [requestLog, setRequestLog] = useState<Array<{ id: string; endpoint: string; status: number; payloadSnippet?: string; responseSnippet?: string; date: number }>>([]);
  useEffect(() => {
    if (!selected?.id) return;
    const es = new EventSource(`${API_BASE}/streams/user-requests/${selected.id}`);
    es.onmessage = (ev) => {
      try { const evt = JSON.parse(ev.data); setRequestLog(prev => [evt, ...prev].slice(0, 500)); } catch {}
    };
    es.onerror = () => { /* silently ignore */ };
    return () => { try { es.close(); } catch {} };
  }, [selected?.id]);
  
  useEffect(() => {
    const hours = windowRange === '1h' ? 1 : windowRange === '24h' ? 24 : windowRange === '7d' ? 7*24 : windowRange === '1m' ? 30*24 : 24*365;
    setWindowHours(hours);
  }, [windowRange]);
  useEffect(() => {
    const map: Array<'1h'|'24h'|'7d'|'1m'|'all'> = ['1h','24h','7d','1m','all'];
    setWindowRange(map[rangeIndex]);
  }, [rangeIndex]);

  useEffect(() => {
    api.authMe().then(setMe).catch(() => setMe(null));
  }, []);

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
        setSelected(null);
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
      const [s, a, p, act, tops] = await Promise.all([
        api.getUserSubscriptions(user.id),
        api.getUserApproverAssignments(user.id),
        api.getUserPendingApprovals(user.id, hours ?? windowHours),
        api.getUserActivity(user.id, windowRange),
        api.getUserTopChannels(user.id, windowRange)
      ]);
      setSubs(s);
      setApprovers(a);
      setPending(p);
      setActivity(act);
      setTopChannels((tops as any).items || tops);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selected?.id) {
      setDetailTab('subscriptions');
      loadDetail(selected);
    }
  }, [selected?.id]);
  useEffect(() => {
    if (selected?.id) loadDetail(selected);
  }, [windowRange]);

  const onRefresh = async () => {
    await loadDetail(selected, windowHours);
    if (detailTab === 'audit' && selected?.id) await loadAuditLogs(selected.id);
  };

  const loadAuditLogs = async (id: string) => {
    setAuditLoading(true);
    try {
      const res:any = await api.getUserAuditLogs(id, 1, 50);
      setAuditLogs(res.items||[]);
    } finally {
      setAuditLoading(false);
    }
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
      {!selected && (
      <aside className={`md:col-span-12 bg-white border border-gray-200 rounded-xl p-4 flex flex-col h-screen transition-all duration-300`}>
        {leftCollapsed ? (
          <div className="flex items-center justify-center mb-3">
            <button onClick={()=>setLeftCollapsed(false)} className="px-2 py-1 border rounded flex items-center gap-1 text-xs" title="Mostrar usuarios" aria-label="Mostrar usuarios"><ChevronRight size={14} /></button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Usuarios</div>
          <button onClick={()=>setLeftCollapsed(true)} className="px-2 py-1 border rounded flex items-center gap-1 text-xs" title="Ocultar usuarios" aria-label="Ocultar usuarios"><ChevronLeft size={14} /></button>
            </div>
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
                onClick={() => { setSelected(u); setLeftCollapsed(true); }}
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
        </>)}
      </aside>
      )}

      {selected && (
      <section className={`md:col-span-12 bg-white border border-gray-200 rounded-xl p-4 transition-all duration-300`}>
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
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold truncate max-w-[32rem]">{selected.fullName || selected.username}</h2>
                    {selected.isAdmin && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded whitespace-nowrap">Admin</span>}
                    <span className="text-xs text-gray-400 whitespace-nowrap">· {formatAgo(selected.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Mail size={12} />
                    <span className="truncate max-w-[32rem]">{selected.email}</span>
                  </div>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs">
                <button onClick={()=>{ setSelected(null); setLeftCollapsed(false); }} className="px-2 py-1 border rounded flex items-center gap-1" aria-label="Volver"><ChevronLeft size={14} /><span>Volver</span></button>
                <span className="px-2 py-0.5 border rounded">{windowRange==='all' ? 'Hist' : (windowRange==='7d' ? '7d' : windowRange)}</span>
                <SlidersHorizontal size={14} className="text-gray-500" />
                <input type="range" min={0} max={4} value={rangeIndex} onChange={e=>setRangeIndex(Number(e.target.value))} className="w-32" />
                
                <button onClick={onRefresh} className="px-2 py-1 border rounded flex items-center gap-1" title="Actualizar" aria-label="Actualizar"><RefreshCw size={14} /><span>Actualizar</span></button>
              </div>
            </div>

            <div className="px-4 py-2 border-b bg-white sticky top-0 z-10 flex items-center gap-3 overflow-x-auto whitespace-nowrap">
              <div className="flex items-center gap-2 text-xs">
                <button onClick={()=>setDetailTab('subscriptions')} className={`px-2 py-1 rounded flex items-center gap-1 ${detailTab==='subscriptions'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`} title="Suscripciones" aria-label="Suscripciones"><MessageSquare size={14} /><span>Suscripciones</span></button>
                <button onClick={()=>setDetailTab('assignments')} className={`px-2 py-1 rounded flex items-center gap-1 ${detailTab==='assignments'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`} title="Asignaciones" aria-label="Asignaciones"><ShieldCheck size={14} /><span>Asignaciones</span></button>
                <button onClick={()=>setDetailTab('pending')} className={`px-2 py-1 rounded flex items-center gap-1 ${detailTab==='pending'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`} title="Pendientes" aria-label="Pendientes"><Bell size={14} /><span>Pendientes</span></button>
                <button onClick={()=>setDetailTab('requests')} className={`px-2 py-1 rounded flex items-center gap-1 ${detailTab==='requests'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`} title="Actividad de peticiones" aria-label="Actividad de peticiones"><ChevronDown size={14} /><span>Actividad</span></button>
                {me?.isAdmin && (
                  <button onClick={()=>{ setDetailTab('audit'); if (selected?.id) loadAuditLogs(selected.id); }} className={`px-2 py-1 rounded flex items-center gap-1 ${detailTab==='audit'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`} title="Auditoría" aria-label="Auditoría"><ShieldCheck size={14} /><span>Auditoría</span></button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {me?.isAdmin && (
                  <>
                    <div className="relative group">
                      <button onClick={()=>setConfirmDisable(true)} className="p-2 border rounded hover:bg-gray-50" aria-label={selected?.isDisabled ? 'Habilitar usuario' : 'Deshabilitar usuario'}>
                        {selected?.isDisabled ? <UserCheck size={14} /> : <Ban size={14} />}
                      </button>
                      {!confirmDisable && (
                        <div className="absolute -top-12 right-0 z-40 hidden group-hover:block transition">
                          <div className="rounded-2xl bg-white border border-gray-200 shadow-lg px-3 py-2 text-xs text-gray-700">
                            {selected?.isDisabled ? 'Habilitar usuario' : 'Deshabilitar usuario'}
                          </div>
                        </div>
                      )}
                      {confirmDisable && (
                        <div className="absolute -top-2 right-0 z-50">
                          <div className="rounded-2xl bg-white border border-yellow-200 shadow-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button onClick={async ()=>{ if (!selected) return; if (selected.isDisabled) { await api.enableUser(selected.id); } else { await api.disableUser(selected.id); } setConfirmDisable(false); const fresh = await api.getUserProfile(selected.id); setSelected(fresh); }} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Confirmar</button>
                              <button onClick={()=>setConfirmDisable(false)} className="px-2 py-1 border rounded text-xs">Cancelar</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative group">
                      <button onClick={()=>setConfirmDelete(true)} className="p-2 border rounded hover:bg-gray-50" aria-label="Eliminar usuario">
                        <Trash2 size={14} />
                      </button>
                      {!confirmDelete && (
                        <div className="absolute -top-12 right-0 z-40 hidden group-hover:block transition">
                          <div className="rounded-2xl bg-white border border-gray-200 shadow-lg px-3 py-2 text-xs text-gray-700">
                            Eliminar usuario
                          </div>
                        </div>
                      )}
                      {confirmDelete && (
                        <div className="absolute -top-2 right-0 z-50">
                          <div className="rounded-2xl bg-white border border-yellow-200 shadow-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button onClick={async ()=>{ if (!selected) return; await api.deleteUser(selected.id); const res:any = await api.getUsersPaged(1, usersLimit, query); setUsers(res.items||[]); setUsersPage(1); setUsersPages(res.pagination?.pages||1); setSelected((res.items||[])[0]||null); setConfirmDelete(false); }} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Confirmar</button>
                              <button onClick={()=>setConfirmDelete(false)} className="px-2 py-1 border rounded text-xs">Cancelar</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
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
              <div className="flex items-center gap-3">
                <Key size={14} className="text-gray-500" />
                <div className="text-sm font-mono">{selected.verificationCode || '—'}</div>
                {selected.verificationCodeExpiresAt && (
                  <div className="text-xs text-gray-400">{t('users.expires')} {new Date(selected.verificationCodeExpiresAt as any).toLocaleTimeString()}</div>
                )}
                <button onClick={copyCode} disabled={!selected?.verificationCode} className={`px-2 py-1 border rounded flex items-center gap-1 text-xs ${!selected?.verificationCode?'opacity-50 cursor-not-allowed':''}`} title="Copiar código" aria-label="Copiar código"><Copy size={14} /><span>Copiar</span></button>
                <button onClick={generateCode} className="px-2 py-1 bg-indigo-600 text-white rounded flex items-center gap-1 text-xs" title="Generar código" aria-label="Generar código"><Key size={14} /><span>Generar</span></button>
              </div>
            </div>

          {loadingDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-pulse">
              <div className="p-3 border rounded-lg"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-7 w-16 bg-gray-200 rounded mt-2" /></div>
              <div className="p-3 border rounded-lg"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-7 w-16 bg-gray-200 rounded mt-2" /></div>
              <div className="p-3 border rounded-lg"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-7 w-16 bg-gray-200 rounded mt-2" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-gray-500">{t('users.subscriptions')}</div>
                <button onClick={async ()=>{ if (!selected) return; const s = await api.getUserSubscriptions(selected.id); setSubs(s); setSubsModalOpen(true); }} className="text-2xl font-bold underline decoration-dotted hover:text-indigo-600" title="Ver y gestionar suscripciones" aria-label="Ver y gestionar suscripciones">{(selected as any).subscribedChannelsCount ?? 0}</button>
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
          )}

          {loadingDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 animate-pulse">
              <div className="p-3 border rounded-lg">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {Array.from({length:4}).map((_,i)=> (<div key={i} className="h-6 bg-gray-200 rounded" />))}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="h-3 w-40 bg-gray-200 rounded" />
                <div className="mt-2 space-y-2">
                  {Array.from({length:3}).map((_,i)=> (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-20 bg-gray-200 rounded mt-1" />
                      </div>
                      <div className="h-4 w-10 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-gray-500">Actividad ({windowRange})</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-gray-500">Enviados</div>
                    <div className="text-xl font-semibold">{activity?.sentInRange ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Entregas</div>
                    <div className="text-xl font-semibold">{activity?.deliveriesInRange ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Leídos</div>
                    <div className="text-xl font-semibold">{activity?.read ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">No leídos</div>
                    <div className="text-xl font-semibold">{activity?.unread ?? '—'}</div>
                  </div>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-gray-500">Top canales ({windowRange})</div>
                <div className="mt-2 space-y-2">
                  {(topChannels||[]).length === 0 ? (
                    <div className="text-xs text-gray-500">Sin actividad</div>
                  ) : (topChannels||[]).map(it => (
                    <div key={it.channel.id} className="flex items-center gap-3">
                      <img src={it.channel.logoUrl || DEFAULT_AVATAR} alt={it.channel.title} className="w-6 h-6 rounded border border-gray-200" />
                      <div className="flex-1">
                        <div className="text-sm">{it.channel.title}</div>
                        <div className="text-[11px] text-gray-500">{it.channel.icon || 'icon'}</div>
                      </div>
                      <div className="text-sm font-semibold">{it.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
              <div className="flex-1 overflow-y-auto p-4">
                {detailTab === 'subscriptions' && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-indigo-600" />
                        <span className="text-sm font-semibold">Suscripciones</span>
                      </div>
                      <div className="text-xs text-gray-500">Activas: {subs.length} · Contador: {(selected as any).subscribedChannelsCount ?? 0}</div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {subs.length === 0 ? (
                        <div className="px-4 py-10 text-center text-xs text-gray-500">{t('users.noSubscriptions')}</div>
                      ) : subs.map(s => (
                        <div key={s.id} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                          <img src={s.channel.logoUrl || DEFAULT_AVATAR} alt={s.channel.title} className="w-8 h-8 rounded border border-gray-200" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{s.channel.title}</div>
                            <div className="text-xs text-gray-500">{s.channel.icon || 'icon'}</div>
                          <div className="text-[11px] text-gray-500">Sub ID: {s.id} · Channel ID: {s.channel.id} · Suscrito: {new Date((s as any).subscribedAt).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === 'assignments' && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-sm font-semibold">{t('users.assignments')}</span>
                      </div>
                      <div className="text-xs text-gray-500">{approvers.length}</div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
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
                )}

                {detailTab === 'pending' && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-orange-600" />
                        <span className="text-sm font-semibold">{t('users.pendingApprovals')}</span>
                      </div>
                      <div className="text-xs text-gray-500">{pending.length}</div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
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
                )}

                {detailTab === 'audit' && me?.isAdmin && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-indigo-600" />
                        <span className="text-sm font-semibold">Auditoría</span>
                      </div>
                      <div className="text-xs text-gray-500">{auditLogs.length}</div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {auditLoading ? (
                        <div className="p-4 space-y-2">
                          {Array.from({length:6}).map((_,i)=> (
                            <div key={i} className="h-10 bg-gray-100 rounded" />
                          ))}
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <div className="px-4 py-10 text-center text-xs text-gray-500">Sin registros</div>
                      ) : auditLogs.map((l:any) => (
                        <div key={l.id} className="px-4 py-3 border-b last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{l.action}</div>
                            <div className="text-xs text-gray-500" title={new Date(l.createdAt as any).toLocaleString()}>{formatAgo(l.createdAt)}</div>
                          </div>
                          <div className="text-[11px] text-gray-500">Actor: {l.actorId} · Target: {l.targetUserId || l.targetChannelId || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === 'requests' && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <ChevronDown size={16} className="text-indigo-600" />
                        <span className="text-sm font-semibold">Actividad de peticiones</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={()=>setRequestsModalOpen(true)} className="px-2 py-1 border rounded text-xs hover:bg-indigo-50" aria-label="Ampliar tabla">Ampliar</button>
                        <div className="text-xs text-gray-500">{requestLog.length}</div>
                      </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="min-w-full text-xs table-fixed">
                        <thead>
                          <tr className="text-left text-gray-600 sticky top-0 bg-white/90 backdrop-blur border-b shadow-sm">
                            <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.endpoint }}>Endpoint<div className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-100" onMouseDown={(e)=>startDrag('endpoint', e)} onDoubleClick={()=>autofit('endpoint')} /></th>
                            <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.status }}>Status<div className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-100" onMouseDown={(e)=>startDrag('status', e)} onDoubleClick={()=>autofit('status')} /></th>
                            <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.type }}>Type<div className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-100" onMouseDown={(e)=>startDrag('type', e)} onDoubleClick={()=>autofit('type')} /></th>
                            <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.payload }}>Payload<div className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-100" onMouseDown={(e)=>startDrag('payload', e)} onDoubleClick={()=>autofit('payload')} /></th>
                            <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.response }}>Response<div className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-100" onMouseDown={(e)=>startDrag('response', e)} onDoubleClick={()=>autofit('response')} /></th>
                            <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.fecha }}>Fecha<div className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-100" onMouseDown={(e)=>startDrag('fecha', e)} onDoubleClick={()=>autofit('fecha')} /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {requestLog.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-indigo-50/40 even:bg-gray-50">
                              <td className="py-2 px-3 font-mono text-[11px] break-all" style={{ width: colWidths.endpoint }}>{row.endpoint}</td>
                              <td className="py-2 px-3" style={{ width: colWidths.status }}>
                                <span className={`${row.status>=500?'bg-red-100 text-red-700':row.status>=400?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'} px-2 py-1 rounded`}>{row.status || 0}</span>
                              </td>
                              <td className="py-2 px-3" style={{ width: colWidths.type }}>
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">{extractMethod(row.endpoint)}</span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] break-all max-h-20 overflow-hidden cursor-pointer" style={{ width: colWidths.payload }} onClick={async ()=>{
                                setJsonModalTitle('Payload');
                                try { const full = await fetch(`${API_BASE}/streams/user-requests/${selected!.id}/events/${row.id}`).then(r=>r.json()); setJsonModalValue(full.payload); } catch { setJsonModalValue(row.payloadSnippet||''); }
                                setJsonModalOpen(true);
                              }}>
                                {renderJsonPreview(row.payloadSnippet||'')}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] break-all max-h-20 overflow-hidden cursor-pointer" style={{ width: colWidths.response }} onClick={async ()=>{
                                setJsonModalTitle('Response');
                                try { const full = await fetch(`${API_BASE}/streams/user-requests/${selected!.id}/events/${row.id}`).then(r=>r.json()); setJsonModalValue(full.response); } catch { setJsonModalValue(row.responseSnippet||''); }
                                setJsonModalOpen(true);
                              }}>
                                {renderJsonPreview(row.responseSnippet||'')}
                              </td>
                              <td className="py-2 px-3 text-gray-500" style={{ width: colWidths.fecha }} title={new Date(row.date).toLocaleString()}>{formatElapsed(row.date)}</td>
                            </tr>
                          ))}
                          {requestLog.length === 0 && (
                            <tr>
                              <td className="py-3 px-3 text-gray-500" colSpan={5}>Sin actividad</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
      )}
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

    {requestsModalOpen && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white w-full h-full rounded-none shadow-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Actividad de peticiones</h3>
              <span className="text-xs text-gray-500">{requestLog.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ setColWidths({ endpoint: 320, status: 80, type: 90, payload: 300, response: 300, fecha: 140 }); }} className="px-3 py-2 border border-gray-300 rounded text-xs">Restablecer columnas</button>
              <button onClick={()=>setRequestsModalOpen(false)} className="px-3 py-2 border border-gray-300 rounded text-xs">Cerrar</button>
            </div>
          </div>
          <div className="p-3 border-b flex items-center justify-between text-[12px] text-gray-600">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded">Real-time</span>
              <span>{requestLog.length} eventos</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ setColWidths({ endpoint: 425, status: 80, type: 90, payload: 300, response: 300, fecha: 140 }); }} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Ancho recomendado</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <table className="min-w-full text-xs table-fixed">
              <thead>
                <tr className="text-left text-gray-600 sticky top-0 bg-white/90 backdrop-blur border-b shadow-sm">
                  <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.endpoint }}>Endpoint<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize" onMouseDown={(e)=>startDrag('endpoint', e)} /></th>
                  <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.status }}>Status<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize" onMouseDown={(e)=>startDrag('status', e)} /></th>
                  <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.type }}>Type<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize" onMouseDown={(e)=>startDrag('type', e)} /></th>
                  <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.payload }}>Payload<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize" onMouseDown={(e)=>startDrag('payload', e)} /></th>
                  <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.response }}>Response<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize" onMouseDown={(e)=>startDrag('response', e)} /></th>
                  <th className="py-2 px-3 border-b relative select-none" style={{ width: colWidths.fecha }}>Fecha<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize" onMouseDown={(e)=>startDrag('fecha', e)} /></th>
                </tr>
              </thead>
              <tbody>
                {requestLog.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-indigo-50/40 even:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-[11px] break-all" style={{ width: colWidths.endpoint }}>{row.endpoint}</td>
                    <td className="py-2 px-3" style={{ width: colWidths.status }}><span className={`${row.status>=500?'bg-red-100 text-red-700':row.status>=400?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'} px-2 py-1 rounded`}>{row.status || 0}</span></td>
                    <td className="py-2 px-3" style={{ width: colWidths.type }}><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">{String(row.endpoint||'').split(' ')[0]}</span></td>
                    <td className="py-2 px-3 font-mono text-[11px] break-all max-h-20 overflow-hidden cursor-pointer" style={{ width: colWidths.payload }} onClick={async ()=>{ setJsonModalTitle('Payload'); try { const full = await fetch(`${API_BASE}/streams/user-requests/${selected!.id}/events/${row.id}`).then(r=>r.json()); setJsonModalValue(full.payload); } catch { setJsonModalValue(row.payloadSnippet||''); } setJsonModalOpen(true); }}>{renderJsonPreview(row.payloadSnippet||'')}</td>
                    <td className="py-2 px-3 font-mono text-[11px] break-all max-h-20 overflow-hidden cursor-pointer" style={{ width: colWidths.response }} onClick={async ()=>{ setJsonModalTitle('Response'); try { const full = await fetch(`${API_BASE}/streams/user-requests/${selected!.id}/events/${row.id}`).then(r=>r.json()); setJsonModalValue(full.response); } catch { setJsonModalValue(row.responseSnippet||''); } setJsonModalOpen(true); }}>{renderJsonPreview(row.responseSnippet||'')}</td>
                    <td className="py-2 px-3 text-gray-500" style={{ width: colWidths.fecha }} title={new Date(row.date).toLocaleString()}>{formatElapsed(row.date)}</td>
                  </tr>
                ))}
                {requestLog.length === 0 && (
                  <tr>
                    <td className="py-3 px-3 text-gray-500" colSpan={5}>Sin actividad</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
    {jsonModalOpen && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white w-full h-full rounded-none shadow-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{jsonModalTitle}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ try { navigator.clipboard.writeText(JSON.stringify(jsonModalValue, null, 2)); } catch {} }} className="px-3 py-2 border border-gray-300 rounded text-xs">Copiar</button>
              <button onClick={()=>setJsonModalOpen(false)} className="px-3 py-2 border border-gray-300 rounded text-xs">Cerrar</button>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <input type="text" placeholder="Buscar en JSON" className="px-2 py-1 border rounded text-xs w-64" onChange={(e)=>setJsonSearch(e.target.value)} />
            <div className="flex items-center gap-2 text-xs">
              <button onClick={()=>{ const next = new Set(expanded); next.add('root'); setExpanded(next); }} className="px-2 py-1 border rounded">Desplegar</button>
              <button onClick={()=>setExpanded(new Set())} className="px-2 py-1 border rounded">Plegar</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {(() => { let obj: any = null; try { obj = typeof jsonModalValue === 'string' ? JSON.parse(jsonModalValue) : jsonModalValue; } catch { obj = jsonModalValue; }
              const JsonNode = ({ value, path = 'root' }: { value: any; path?: string }) => {
                const t = typeof value;
                const isObj = t === 'object' && value !== null && !Array.isArray(value);
                const isArr = Array.isArray(value);
                const open = expanded.has(path);
                const toggle = () => { const next = new Set(expanded); if (next.has(path)) next.delete(path); else next.add(path); setExpanded(next); };
                const mark = (s: string) => {
                  if (!jsonSearch) return (<span>{s}</span>);
                  const idx = s.toLowerCase().indexOf(jsonSearch.toLowerCase());
                  if (idx < 0) return (<span>{s}</span>);
                  return (<span>{s.slice(0, idx)}<mark className="bg-yellow-200 text-gray-900">{s.slice(idx, idx+jsonSearch.length)}</mark>{s.slice(idx+jsonSearch.length)}</span>);
                };
                if (value === null) return (<span className="text-orange-600">null</span>);
                if (t === 'string') return (<span className="text-green-700">"{mark(value)}"</span>);
                if (t === 'number') return (<span className="text-purple-700">{String(value)}</span>);
                if (t === 'boolean') return (<span className="text-orange-700">{String(value)}</span>);
                if (isArr) {
                  return (
                    <div>
                      <button onClick={toggle} className="inline-flex items-center gap-1 text-xs px-1 py-[1px] rounded hover:bg-gray-100 text-gray-600">{open?'▾':'▸'} Array({value.length})</button>
                      {open && value.map((v:any,i:number)=>(<div key={i} className="pl-4"><span className="text-gray-400">{i}:</span> <JsonNode value={v} path={`${path}[${i}]`} /></div>))}
                    </div>
                  );
                }
                if (isObj) {
                  const entries = Object.entries(value);
                  return (
                    <div>
                      <button onClick={toggle} className="inline-flex items-center gap-1 text-xs px-1 py-[1px] rounded hover:bg-gray-100 text-gray-600">{open?'▾':'▸'} Object</button>
                      {open && entries.map(([k,v]) => (
                        <div key={k} className="pl-4">
                          <span className="text-blue-700">"{mark(k)}"</span><span>: </span>
                          <JsonNode value={v} path={`${path}.${k}`} />
                        </div>
                      ))}
                    </div>
                  );
                }
                return (<span className="text-gray-700">{String(value)}</span>);
              };
              return (<div className="text-xs leading-5 font-mono"><JsonNode value={obj} /></div>);
            })()}
          </div>
        </div>
      </div>
    )}
    {subsModalOpen && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Gestionar suscripciones</h3>
            <button onClick={()=>setSubsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full">×</button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {subs.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-gray-500">Sin suscripciones activas</div>
            ) : subs.map(s => (
              <div key={s.id} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                <img src={s.channel.logoUrl || DEFAULT_AVATAR} alt={s.channel.title} className="w-8 h-8 rounded border border-gray-200" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.channel.title}</div>
                  <div className="text-xs text-gray-500">{s.channel.icon || 'icon'}</div>
                  <div className="text-[11px] text-gray-500">Suscrito {formatAgo((s as any).subscribedAt)}</div>
                </div>
                {me?.isAdmin && (
                  <div className="relative group">
                    <button onClick={()=>setConfirmSubId(s.id)} className="p-2 border border-gray-300 rounded hover:bg-gray-50" aria-label="Eliminar suscripción">
                      <Trash2 size={14} />
                    </button>
                    {confirmSubId === s.id ? (
                      <div className="absolute -top-2 right-0 z-50">
                        <div className="rounded-2xl bg-white border border-yellow-200 shadow-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={async ()=>{ if (!selected) return; await api.removeSubscription(selected.id, s.channel.id); setConfirmSubId(null); await loadDetail(selected); }} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Confirmar</button>
                            <button onClick={()=>setConfirmSubId(null)} className="px-2 py-1 border border-gray-300 rounded text-xs">Cancelar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute -top-12 right-0 z-40 hidden group-hover:block transition">
                        <div className="rounded-2xl bg-white border border-gray-200 shadow-lg px-3 py-2 text-xs text-gray-700">
                          Eliminar suscripción
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 flex items-center justify-end gap-2">
            <button onClick={()=>setSubsModalOpen(false)} className="px-3 py-2 border border-gray-300 rounded text-xs">Cerrar</button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};


export default UsersModule;