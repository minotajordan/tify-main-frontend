import React, { useState, useEffect, useRef } from 'react';
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
  Globe,
  QrCode,
  Settings,
  ChevronUp,
  CreditCard,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { DEFAULT_AVATAR, DEFAULT_ORG_NAME } from './constants';
import { useI18n } from './i18n';
import { api, API_BASE } from './services/api';
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
import ShortLinkManager from './components/ShortLinkManager';
import PublicFormViewer from './components/forms/PublicFormViewer';
import PublicTicketPurchase from './components/events/PublicTicketPurchase';
import GuestRSVP from './components/events/GuestRSVP';
import PublicShortener from './components/PublicShortener';

const ShortLinkRedirect: React.FC<{ code: string }> = ({ code }) => {
  useEffect(() => {
    // Redirect to backend root endpoint
    const backendRoot =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3333'
        : API_BASE.replace('/api', '');
    window.location.href = `${backendRoot}/${code}`;
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Redirecting...</h2>
        <p className="text-gray-500">{code}</p>
      </div>
    </div>
  );
};

type View =
  | 'dashboard'
  | 'channels'
  | 'messages'
  | 'approvals'
  | 'users'
  | 'ai'
  | 'monitoring'
  | 'forms'
  | 'events'
  | 'shortlinks'
  | 'settings';
type BreadcrumbItem = { label: string; view?: View };

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [authMode, setAuthMode] = useState<'checking' | 'bootstrap' | 'login' | 'forgot' | 'ready'>(
    'checking'
  );
  const [bootstrapForm, setBootstrapForm] = useState({
    email: '',
    username: '',
    fullName: '',
    password: '',
    code: '',
  });
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [resetForm, setResetForm] = useState({ identifier: '', code: '', newPassword: '' });
  const [publicSlug, setPublicSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/forms\/([a-zA-Z0-9-]+)$/);
      return match ? match[1] : null;
    }
    return null;
  });
  const [publicEventId, setPublicEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/events\/([a-zA-Z0-9-]+)\/public$/);
      return match ? match[1] : null;
    }
    return null;
  });
  const [publicRSVPEventId, setPublicRSVPEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/events\/([a-zA-Z0-9-]+)\/rsvp$/);
      return match ? match[1] : null;
    }
    return null;
  });
  const [redirectCode, setRedirectCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/(L[a-zA-Z0-9]+)$/);
      return match ? match[1] : null;
    }
    return null;
  });
  const [isPublicShortener, setIsPublicShortener] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!window.location.pathname.match(/^\/short\/?$/i);
    }
    return false;
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      case 'dashboard':
        return <Dashboard onChangeView={(view) => setCurrentView(view as View)} />;
      case 'channels':
        return <ChannelManager currentUser={currentUser} />;
      case 'messages':
        return <MessageCenter />;
      case 'users':
        return <UsersModule currentUser={currentUser} />;
      case 'forms':
        return <FormsManager />;
      case 'events':
        return <EventManager />;
      case 'shortlinks':
        return <ShortLinkManager />;
      case 'ai':
        return <AIChat onNavigateToForms={() => setCurrentView('forms')} />;
      case 'settings':
        return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('nav.monitoring')}</h3>
            <div className="mt-2">
              <MonitoringDashboard />
            </div>
          </div>
        );
      default:
        return <div className="p-8 text-center text-gray-500">{t('module.underConstruction')}</div>;
    }
  };

  const NavItem = ({
    view,
    icon: Icon,
    label,
    count,
  }: {
    view: View;
    icon: any;
    label: string;
    count?: number;
  }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
        setBreadcrumbs([{ label }]);
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
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            currentView === view ? 'bg-white text-indigo-600' : 'bg-slate-700 text-slate-200'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  if (redirectCode) {
    return <ShortLinkRedirect code={redirectCode} />;
  }

  if (publicSlug) {
    return <PublicFormViewer slug={publicSlug} />;
  }

  if (publicEventId) {
    return <PublicTicketPurchase eventId={publicEventId} />;
  }

  if (publicRSVPEventId) {
    return <GuestRSVP eventId={publicRSVPEventId} />;
  }

  if (isPublicShortener) {
    return <PublicShortener />;
  }

  if (authMode !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {authMode === 'bootstrap' ? (
            <>
              <h2 className="text-xl font-bold mb-4 text-center">{t('auth.createAdmin')}</h2>
              <div className="space-y-3">
                <input
                  value={bootstrapForm.email}
                  onChange={(e) => setBootstrapForm({ ...bootstrapForm, email: e.target.value })}
                  placeholder={t('auth.email')}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  value={bootstrapForm.username}
                  onChange={(e) => setBootstrapForm({ ...bootstrapForm, username: e.target.value })}
                  placeholder={t('auth.username')}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  value={bootstrapForm.fullName}
                  onChange={(e) => setBootstrapForm({ ...bootstrapForm, fullName: e.target.value })}
                  placeholder={t('auth.fullName')}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="password"
                  value={bootstrapForm.password}
                  onChange={(e) => setBootstrapForm({ ...bootstrapForm, password: e.target.value })}
                  placeholder={t('auth.password')}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  value={bootstrapForm.code}
                  onChange={(e) => setBootstrapForm({ ...bootstrapForm, code: e.target.value })}
                  placeholder={t('auth.verificationCode')}
                  className="w-full px-3 py-2 border rounded"
                />
                <button
                  onClick={async () => {
                    const user = await api.authBootstrapAdmin(bootstrapForm as any);
                    setCurrentUser(user);
                    setAuthMode('ready');
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  {t('auth.createAndEnter')}
                </button>
              </div>
            </>
          ) : (
            <>
              {authMode === 'login' && (
                <>
                  <h2 className="text-xl font-bold mb-4">{t('auth.login')}</h2>
                  <div className="space-y-3">
                    <input
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                      placeholder={t('auth.emailOrUsername')}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder={t('auth.password')}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <button
                      onClick={async () => {
                        const user = await api.authLogin(loginForm);
                        setCurrentUser(user);
                        setAuthMode('ready');
                      }}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                      {t('auth.enter')}
                    </button>
                    <button
                      onClick={() => setAuthMode('forgot')}
                      className="w-full text-xs text-indigo-600 mt-2"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                </>
              )}
              {authMode === 'forgot' && (
                <>
                  <h2 className="text-xl font-bold mb-4">{t('auth.resetPassword')}</h2>
                  <div className="space-y-3">
                    <input
                      value={resetForm.identifier}
                      onChange={(e) => setResetForm({ ...resetForm, identifier: e.target.value })}
                      placeholder={t('auth.emailOrUsername')}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await api.authRequestPasswordReset({ identifier: resetForm.identifier });
                          alert(t('auth.codeSent'));
                        }}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded border"
                      >
                        {t('auth.requestReset')}
                      </button>
                    </div>
                    <input
                      value={resetForm.code}
                      onChange={(e) => setResetForm({ ...resetForm, code: e.target.value })}
                      placeholder={t('auth.code')}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <input
                      type="password"
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                      placeholder={t('auth.newPassword')}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <button
                      onClick={async () => {
                        const user = await api.authResetPassword(resetForm as any);
                        setCurrentUser(user);
                        setAuthMode('ready');
                      }}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                      {t('auth.reset')}
                    </button>
                    <button
                      onClick={() => setAuthMode('login')}
                      className="w-full text-xs text-gray-500 mt-2"
                    >
                      {t('auth.backToLogin')}
                    </button>
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
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
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
          <NavItem view="channels" icon={GitMerge} label={t('nav.channels')} />
          <NavItem view="forms" icon={FileText} label={t('nav.forms')} />
          <NavItem view="events" icon={Ticket} label={t('nav.events')} />
          {currentUser?.isAdmin && (
            <NavItem view="users" icon={Users} label={t('nav.users')} />
          )}
          <NavItem view="shortlinks" icon={QrCode} label={t('nav.shortlinks')} />
          

          <div className="pt-6 pb-2 px-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('nav.intelligence')}
            </p>
          </div>
          <NavItem view="ai" icon={Bot} label={t('nav.ai')} />
        </nav>

        <div className="p-4 border-t border-slate-800 relative" ref={userMenuRef}>
          {currentUser ? (
            <>
              {/* User Menu Popup */}
              {isUserMenuOpen && (
                <>
                  {/* Mobile Modal Overlay */}
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div 
                      className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-4">
                          <img 
                            src={currentUser.avatarUrl || DEFAULT_AVATAR} 
                            alt={currentUser.fullName}
                            className="w-12 h-12 rounded-full border-2 border-white shadow-sm" 
                          />
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{currentUser.fullName}</h3>
                            <p className="text-sm text-gray-500">{DEFAULT_ORG_NAME}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsUserMenuOpen(false)} 
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-3 space-y-1">
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors font-medium text-left">
                          <UserIcon size={20} />
                          <span>Mi Perfil</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView('settings');
                            setIsUserMenuOpen(false);
                            setBreadcrumbs([{ label: 'Configuración' }]);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors font-medium text-left"
                        >
                          <Settings size={20} />
                          <span>Configuración</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors font-medium text-left">
                          <CreditCard size={20} />
                          <span>Precios</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors font-medium text-left">
                          <Shield size={20} />
                          <span>Política de Privacidad</span>
                        </button>
                        <div className="h-px bg-gray-100 my-2" />
                        <button 
                          onClick={() => {
                            localStorage.removeItem('tify_token');
                            setCurrentUser(null);
                            setAuthMode('login');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-left"
                        >
                          <LogOut size={20} />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Popover */}
                  <div className="hidden lg:block absolute bottom-full left-0 w-[240px] mb-3 ml-2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-2 fade-in zoom-in-95 duration-200 origin-bottom-left">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Mi Cuenta</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-left">
                        <UserIcon size={16} />
                        <span>Mi Perfil</span>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentView('settings');
                          setIsUserMenuOpen(false);
                          setBreadcrumbs([{ label: 'Configuración' }]);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-left"
                      >
                        <Settings size={16} />
                        <span>Configuración</span>
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-left">
                        <CreditCard size={16} />
                        <span>Precios</span>
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-left">
                        <Shield size={16} />
                        <span>Política de Privacidad</span>
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button 
                        onClick={() => {
                          localStorage.removeItem('tify_token');
                          setCurrentUser(null);
                          setAuthMode('login');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-left"
                      >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Trigger Button */}
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-200 group relative ${
                  isUserMenuOpen 
                    ? 'bg-slate-800 border-indigo-500/50 shadow-lg' 
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl || DEFAULT_AVATAR}
                    alt={currentUser.fullName}
                    className="w-9 h-9 rounded-full border-2 border-slate-700 group-hover:border-indigo-500 transition-colors object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
                  <p className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors">{DEFAULT_ORG_NAME}</p>
                </div>
                <div className={`text-slate-500 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180 text-indigo-400' : 'group-hover:text-white'}`}>
                  <ChevronUp size={18} />
                </div>
              </button>
            </>
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
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center text-sm text-gray-500">
              <span className="font-medium text-gray-900"></span>
              {([{ label: currentView }, ...breadcrumbs] as BreadcrumbItem[]).map((bc, idx) => (
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
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
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
          <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
