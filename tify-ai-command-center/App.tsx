import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GitMerge, 
  CheckCircle, 
  Users, 
  Bot,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  RadioTower,
  FileText,
  Ticket,
  Globe
} from 'lucide-react';
import { DEFAULT_AVATAR, DEFAULT_ORG_NAME } from './constants';
import { useI18n } from './i18n';
import { api } from './services/api';
import { User } from './types';
import Dashboard from './components/Dashboard';
import ChannelManager from './components/ChannelManager';
import EventManager from './components/events/EventManager';
import MessageCenter from './components/MessageCenter';
import ApprovalQueue from './components/ApprovalQueue';
import AIChat from './components/AIChat';
import UsersModule from './components/Users.tsx';
import MonitoringDashboard from './components/monitoring/MonitoringDashboard';
import FormsManager from './components/FormsManager';
import PublicFormViewer from './components/forms/PublicFormViewer';
import PublicTicketPurchase from './components/events/PublicTicketPurchase';

type View = 'dashboard' | 'channels' | 'messages' | 'approvals' | 'users' | 'ai' | 'monitoring' | 'forms' | 'events';
type BreadcrumbItem = { label: string; view?: View };

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [authMode, setAuthMode] = useState<'checking'|'bootstrap'|'login'|'forgot'|'ready'>('checking');
  const [bootstrapForm, setBootstrapForm] = useState({ email: '', username: '', fullName: '', password: '', code: '' });
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [resetForm, setResetForm] = useState({ identifier: '', code: '', newPassword: '' });
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [publicEventId, setPublicEventId] = useState<string | null>(null);
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const formMatch = path.match(/^\/forms\/([a-zA-Z0-9-]+)$/);
      const eventMatch = path.match(/^\/events\/([a-zA-Z0-9-]+)\/public$/);
      
      if (formMatch) {
        setPublicSlug(formMatch[1]);
      } else if (eventMatch) {
        setPublicEventId(eventMatch[1]);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tify_token') : null;
      if (token) {
        try {
          const me = await api.authMe();
          setCurrentUser(me);
          setAuthMode('ready');
          return;
        } catch {}
      }
      const { hasUsers } = await api.authHasUsers();
      setAuthMode(hasUsers ? 'login' : 'bootstrap');
    };
    init();
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const items = (e.detail || []) as BreadcrumbItem[];
      setBreadcrumbs(items);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tify_breadcrumbs', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tify_breadcrumbs', handler);
      }
    };
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onChangeView={(view) => setCurrentView(view as View)} />;
      case 'channels': return <ChannelManager />;
      case 'messages': return <MessageCenter />;
      case 'approvals': return <ApprovalQueue />;
      case 'users': return <UsersModule />;
      case 'forms': return <FormsManager />;
      case 'events': return <EventManager />;
      case 'ai': return <AIChat onNavigateToForms={() => setCurrentView('forms')} />;
      case 'monitoring': return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-semibold text-gray-900 mb-4">{t('nav.monitoring')}</h3><div className="mt-2"><MonitoringDashboard /></div></div>;
      default: return <div className="p-8 text-center text-gray-500">{t('module.underConstruction')}</div>;
    }
  };

  const NavItem = ({ view, icon: Icon, label, count }: { view: View; icon: any; label: string; count?: number }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
        setBreadcrumbs([{ label },]);
      }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          currentView === view ? 'bg-white text-indigo-600' : 'bg-slate-700 text-slate-200'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  if (publicSlug) {
    return <PublicFormViewer slug={publicSlug} />;
  }

  if (publicEventId) {
    return <PublicTicketPurchase eventId={publicEventId} />;
  }

  if (authMode !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {authMode === 'bootstrap' ? (
            <>
              <h2 className="text-xl font-bold mb-4">{t('auth.createAdmin')}</h2>
              <div className="space-y-3">
                <input value={bootstrapForm.email} onChange={e=>setBootstrapForm({...bootstrapForm,email:e.target.value})} placeholder={t('auth.email')} className="w-full px-3 py-2 border rounded" />
                <input value={bootstrapForm.username} onChange={e=>setBootstrapForm({...bootstrapForm,username:e.target.value})} placeholder={t('auth.username')} className="w-full px-3 py-2 border rounded" />
                <input value={bootstrapForm.fullName} onChange={e=>setBootstrapForm({...bootstrapForm,fullName:e.target.value})} placeholder={t('auth.fullName')} className="w-full px-3 py-2 border rounded" />
                <input type="password" value={bootstrapForm.password} onChange={e=>setBootstrapForm({...bootstrapForm,password:e.target.value})} placeholder={t('auth.password')} className="w-full px-3 py-2 border rounded" />
                <input value={bootstrapForm.code} onChange={e=>setBootstrapForm({...bootstrapForm,code:e.target.value})} placeholder={t('auth.verificationCode')} className="w-full px-3 py-2 border rounded" />
                <button onClick={async ()=>{ const user=await api.authBootstrapAdmin(bootstrapForm as any); setCurrentUser(user); setAuthMode('ready'); }} className="w-full px-4 py-2 bg-indigo-600 text-white rounded">{t('auth.createAndEnter')}</button>
              </div>
            </>
          ) : (
            <>
              {authMode === 'login' && (
                <>
                  <h2 className="text-xl font-bold mb-4">{t('auth.login')}</h2>
                  <div className="space-y-3">
                    <input value={loginForm.identifier} onChange={e=>setLoginForm({...loginForm,identifier:e.target.value})} placeholder={t('auth.emailOrUsername')} className="w-full px-3 py-2 border rounded" />
                    <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder={t('auth.password')} className="w-full px-3 py-2 border rounded" />
                    <button onClick={async ()=>{ const user=await api.authLogin(loginForm); setCurrentUser(user); setAuthMode('ready'); }} className="w-full px-4 py-2 bg-indigo-600 text-white rounded">{t('auth.enter')}</button>
                    <button onClick={()=>setAuthMode('forgot')} className="w-full text-xs text-indigo-600 mt-2">{t('auth.forgotPassword')}</button>
                  </div>
                </>
              )}
              {authMode === 'forgot' && (
                <>
                  <h2 className="text-xl font-bold mb-4">{t('auth.resetPassword')}</h2>
                  <div className="space-y-3">
                    <input value={resetForm.identifier} onChange={e=>setResetForm({...resetForm,identifier:e.target.value})} placeholder={t('auth.emailOrUsername')} className="w-full px-3 py-2 border rounded" />
                    <div className="flex gap-2">
                      <button onClick={async ()=>{ await api.authRequestPasswordReset({ identifier: resetForm.identifier }); alert(t('auth.codeSent')); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded border">{t('auth.requestReset')}</button>
                    </div>
                    <input value={resetForm.code} onChange={e=>setResetForm({...resetForm,code:e.target.value})} placeholder={t('auth.code')} className="w-full px-3 py-2 border rounded" />
                    <input type="password" value={resetForm.newPassword} onChange={e=>setResetForm({...resetForm,newPassword:e.target.value})} placeholder={t('auth.newPassword')} className="w-full px-3 py-2 border rounded" />
                    <button onClick={async ()=>{ const user=await api.authResetPassword(resetForm as any); setCurrentUser(user); setAuthMode('ready'); }} className="w-full px-4 py-2 bg-indigo-600 text-white rounded">{t('auth.reset')}</button>
                    <button onClick={()=>setAuthMode('login')} className="w-full text-xs text-gray-500 mt-2">{t('auth.backToLogin')}</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xl">
              T
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Tify</h1>
              <p className="text-xs text-slate-400">Command Center</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view="dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <NavItem view="monitoring" icon={RadioTower} label={t('nav.monitoring')} />
          <NavItem view="channels" icon={GitMerge} label={t('nav.channels')} />
          <NavItem view="forms" icon={FileText} label={t('nav.forms')} />
          <NavItem view="events" icon={Ticket} label={t('nav.events')} />
          <NavItem view="approvals" icon={CheckCircle} label={t('nav.approvals')} count={currentUser?.pendingApprovalsCount} />
          <NavItem view="users" icon={Users} label={t('nav.users')} />
          
          <div className="pt-6 pb-2 px-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('nav.intelligence')}</p>
          </div>
          <NavItem view="ai" icon={Bot} label={t('nav.ai')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          {currentUser ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <img 
                src={currentUser.avatarUrl || DEFAULT_AVATAR} 
                alt={currentUser.fullName} 
                className="w-8 h-8 rounded-full border border-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{DEFAULT_ORG_NAME}</p>
              </div>
              <LogOut size={16} className="text-slate-500 hover:text-white cursor-pointer" onClick={()=>{ localStorage.removeItem('tify_token'); setCurrentUser(null); setAuthMode('login'); }} />
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center">{t('status.connecting')}</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md">
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center text-sm text-gray-500">
              <span className="font-medium text-gray-900"></span>
              {([ { label: currentView } , ...breadcrumbs ] as BreadcrumbItem[]).map((bc, idx) => (
                <span key={idx} className="flex items-center">
                  <span className="mx-2 text-gray-300">/</span>
                  {bc.view ? (
                    <button
                      className="capitalize hover:underline"
                      onClick={() => setCurrentView(bc.view!)}
                    >
                      {bc.label}
                    </button>
                  ) : (
                    <span className="capitalize">{bc.label}</span>
                  )}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-500" />
              <select value={lang} onChange={e=>setLang(e.target.value as any)} className="px-2 py-1 border rounded text-sm">
                <option value="es">ES</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder={t('common.searchPlaceholder')} 
                className="pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none w-64 transition-all"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-0 md:p-0">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
