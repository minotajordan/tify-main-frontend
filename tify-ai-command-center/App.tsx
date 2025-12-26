import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  GitMerge,
  Users,
  Bot,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  FileText,
  Ticket,
  Globe,
  QrCode,
  Settings,
  CreditCard,
  Shield,
  User as UserIcon,
  Palette,
} from 'lucide-react';
import { DEFAULT_AVATAR, DEFAULT_ORG_NAME } from './constants';
import { useI18n } from './i18n';
import { api, API_BASE } from './services/api';
import { User } from './types';
import Dashboard from './components/Dashboard';
import ChannelManager from './components/ChannelManager';
import EventManager from './components/events/EventManager';
import MessageCenter from './components/MessageCenter';
import AIChat from './components/AIChat';
import UsersModule from './components/Users.tsx';
import MonitoringDashboard from './components/monitoring/MonitoringDashboard';
import FormsManager from './components/FormsManager';
import ShortLinkManager from './components/ShortLinkManager';
import PublicFormViewer from './components/forms/PublicFormViewer';
import PublicTicketPurchase from './components/events/PublicTicketPurchase';
import GuestRSVP from './components/events/GuestRSVP';
import PublicShortener from './components/PublicShortener';
import StyleDemo from './components/StyleDemo';
import PublicMessageViewer from './components/PublicMessageViewer';

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
  | 'settings'
  | 'style-demo';
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
  const [publicMessageId, setPublicMessageId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/public\/msg\/([a-zA-Z0-9-]+)$/);
      return match ? match[1] : null;
    }
    return null;
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
      case 'style-demo':
        return <StyleDemo />;
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
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        currentView === view
          ? 'bg-sky-100 text-sky-700'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={18} className={currentView === view ? 'text-sky-600' : 'text-gray-400 group-hover:text-gray-500'} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
            currentView === view ? 'bg-sky-200 text-sky-800' : 'bg-gray-100 text-gray-600'
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

  if (publicMessageId) {
    return <PublicMessageViewer messageId={publicMessageId} />;
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
    <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden font-sans text-gray-900">
      {/* Mobile Navigation Menu (Overlay) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 absolute top-16 left-0 right-0 z-20 shadow-lg animate-in slide-in-from-top-2 p-4">
          <div className="flex flex-col space-y-2">
            <NavItem view="channels" icon={GitMerge} label={t('nav.channels')} />
            <NavItem view="forms" icon={FileText} label={t('nav.forms')} />
            <NavItem view="events" icon={Ticket} label={t('nav.events')} />
            <NavItem view="shortlinks" icon={QrCode} label={t('nav.shortlinks')} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-4 lg:p-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Header & Nav */}
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  T
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">Tify</span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
                {[
                  { id: 'channels', label: t('nav.channels') },
                  { id: 'forms', label: t('nav.forms') },
                  { id: 'events', label: t('nav.events') },
                  { id: 'shortlinks', label: t('nav.shortlinks') },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentView(tab.id as View)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      currentView === tab.id
                        ? 'bg-sky-100 text-sky-700'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
               {/* Search */}
               <div className="relative hidden md:flex items-center group">
                 <div className="p-2 bg-white border border-gray-200 text-gray-400 group-hover:text-sky-500 group-hover:border-sky-200 rounded-xl transition-all cursor-pointer z-10">
                   <Search size={16} />
                 </div>
                 <input
                   type="text"
                   placeholder={t('common.searchPlaceholder')}
                   className="absolute right-0 top-0 h-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm w-10 opacity-0 group-hover:w-64 group-hover:opacity-100 group-focus-within:w-64 group-focus-within:opacity-100 focus:ring-2 focus:ring-sky-100 transition-all duration-300 ease-in-out outline-none"
                 />
               </div>

               {/* Notification */}
               <button className="p-2 bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-xl relative transition-colors">
                 <Bell size={20} />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
               </button>

               {/* Language & User */}
               <div className="flex items-center gap-3" ref={userMenuRef}>
                 {/* Language Selector */}
                 <div className="relative group">
                   <button className="p-2 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl flex items-center gap-1 transition-colors">
                     <Globe size={18} />
                     <span className="text-xs font-medium uppercase">{lang}</span>
                   </button>
                   <select
                     value={lang}
                     onChange={(e) => setLang(e.target.value as any)}
                     className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                   >
                     <option value="es">ES</option>
                     <option value="en">EN</option>
                     <option value="pt">PT</option>
                   </select>
                 </div>

                 {/* User Avatar */}
                 <div className="relative">
                   <button
                     onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                     className="flex items-center gap-2 focus:outline-none"
                   >
                     <img
                       src={currentUser?.avatarUrl || DEFAULT_AVATAR}
                       alt="User"
                       className={`w-10 h-10 rounded-full border-2 transition-all object-cover ${isUserMenuOpen ? 'border-sky-400 shadow-md ring-2 ring-sky-100' : 'border-white shadow-sm hover:border-gray-200'}`}
                     />
                   </button>

                   {/* User Dropdown */}
                   {isUserMenuOpen && (
                     <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                       <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                         <p className="font-bold text-gray-900 truncate">{currentUser?.fullName}</p>
                         <p className="text-xs text-gray-500 truncate">{currentUser?.email || DEFAULT_ORG_NAME}</p>
                       </div>
                       <div className="p-2 space-y-1">
                         <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-left">
                           <UserIcon size={16} />
                           <span>Mi Perfil</span>
                         </button>
                         {currentUser?.isAdmin && (
                           <button
                             onClick={() => {
                               setCurrentView('users');
                               setIsUserMenuOpen(false);
                             }}
                             className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-left"
                           >
                             <Users size={16} />
                             <span>{t('nav.users')}</span>
                           </button>
                         )}
                         <button
                           onClick={() => {
                             setCurrentView('ai');
                             setIsUserMenuOpen(false);
                           }}
                           className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-left"
                         >
                           <Bot size={16} />
                           <span>{t('nav.ai')}</span>
                         </button>
                         <div className="h-px bg-gray-100 my-1"></div>
                         <button
                           onClick={() => {
                             setCurrentView('settings');
                             setIsUserMenuOpen(false);
                           }}
                           className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-left"
                         >
                           <Settings size={16} />
                           <span>Configuración</span>
                         </button>
                         <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-left">
                            <CreditCard size={16} />
                            <span>Precios</span>
                         </button>
                         <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-left">
                            <Shield size={16} />
                            <span>Privacidad</span>
                         </button>
                         <div className="h-px bg-gray-100 my-1"></div>
                         <button
                           onClick={() => {
                             localStorage.removeItem('tify_token');
                             setCurrentUser(null);
                             setAuthMode('login');
                             setIsUserMenuOpen(false);
                           }}
                           className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                         >
                           <LogOut size={16} />
                           <span>Cerrar Sesión</span>
                         </button>
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               {/* Mobile Menu Button */}
               <button
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 className="lg:hidden p-2 bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
               >
                 {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
               </button>
            </div>
          </header>

          {/* Mobile Navigation Modal */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center lg:hidden">
              {/* Backdrop with Blur */}
              <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              
              {/* Modal Content */}
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Menú</h3>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <NavItem view="channels" icon={GitMerge} label={t('nav.channels')} />
                  <NavItem view="forms" icon={FileText} label={t('nav.forms')} />
                  <NavItem view="events" icon={Ticket} label={t('nav.events')} />
                  <NavItem view="shortlinks" icon={QrCode} label={t('nav.shortlinks')} />
                </div>
              </div>
            </div>
          )}


          <div className="flex-1">
            {renderContent()}
          </div>

          {/* Footer */}
          <footer className="mt-12 py-6 border-t border-gray-100">
            <div className="flex justify-center gap-8 text-sm text-gray-400">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="hover:text-sky-600 transition-colors flex items-center gap-2"
              >
                <LayoutDashboard size={16} />
                {t('nav.dashboard')}
              </button>
              <button 
                onClick={() => setCurrentView('ai')}
                className="hover:text-sky-600 transition-colors flex items-center gap-2"
              >
                <Bot size={16} />
                {t('nav.ai')}
              </button>
              <button 
                onClick={() => setCurrentView('style-demo')}
                className="hover:text-sky-600 transition-colors flex items-center gap-2"
              >
                <Palette size={16} />
                Style Demo
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
