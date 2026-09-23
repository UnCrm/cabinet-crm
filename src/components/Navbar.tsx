import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  ShieldCheck, 
  Bell,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  Phone,
  UserCheck,
  ChevronDown,
  MessageSquare,
  Monitor,
  ExternalLink,
  AlertCircle,
  Check,
  Lock,
  Key,
  LogOut,
  Calendar,
  Type,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';
import { CabinetInfo, Lead, User, getUserDisplayName } from '../types/crm';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isInIframe,
  isStandaloneApp,
  isChatSoundEnabled,
  setChatSoundEnabled,
  testChatNotification
} from '../utils/notifications';
import { getAccessibleReminders } from '../utils/permissions';
import { AvatarCreatorModal } from './AvatarCreatorModal';
import { PWAInstallButton } from './PWAInstallButton';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface NavbarProps {
  currentTab: 'dashboard' | 'leads' | 'calendar' | 'settings' | 'users' | 'chat' | 'activity-tracking';
  setCurrentTab: (tab: 'dashboard' | 'leads' | 'calendar' | 'settings' | 'users' | 'chat' | 'activity-tracking') => void;
  onOpenNewLeadModal: () => void;
  onOpenImportModal: () => void;
  cabinetInfo: CabinetInfo;
  pendingActionsCount: number;
  unreadChatCount?: number;
  leads?: Lead[];
  onSelectLead?: (lead: Lead) => void;
  onCompleteReminder?: (leadId: string) => void;
  onCancelReminder?: (leadId: string) => void;
  users?: User[];
  currentUser?: User;
  onLogout?: () => void;
  onSaveUser?: (user: User) => void;
  firebaseUser?: any;
  isCloudConnected?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onConnectGoogle?: () => void;
  onDisconnectGoogle?: () => void;
  trackerSlot?: React.ReactNode;
  onOpenQuickSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewLeadModal,
  onOpenImportModal,
  cabinetInfo,
  pendingActionsCount,
  unreadChatCount = 0,
  leads = [],
  onSelectLead,
  onCompleteReminder,
  onCancelReminder,
  users = [],
  currentUser,
  onLogout,
  onSaveUser,
  firebaseUser,
  isCloudConnected = false,
  syncStatus = 'idle',
  onConnectGoogle,
  onDisconnectGoogle,
  trackerSlot,
  onOpenQuickSearch
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isChatSoundEnabled());
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [showNotifSettingsModal, setShowNotifSettingsModal] = useState(false);

  const [fontSize, setFontSize] = useState<'compact' | 'minimized' | 'standard'>(() => {
    return (localStorage.getItem('crm_font_size') as any) || 'minimized';
  });

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    const saved = (localStorage.getItem('crm_font_size') as any) || 'minimized';
    document.documentElement.setAttribute('data-font-size', saved);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
  };

  const handleTestChatAndSound = () => {
    setIsTestingNotif(true);
    testChatNotification(() => {
      setCurrentTab('chat');
    });
    setTimeout(() => setIsTestingNotif(false), 2500);
  };

  const handleSetFontSize = (size: 'compact' | 'minimized' | 'standard') => {
    setFontSize(size);
    localStorage.setItem('crm_font_size', size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const handleEnableWindowsNotifications = async () => {
    // If inside an iframe, browsers block Notification.requestPermission()
    if (isInIframe()) {
      setShowIframeModal(true);
      return;
    }

    const res = await requestNotificationPermission();
    setNotifPermission(res);
    if (res === 'denied') {
      alert("⚠️ Les notifications sont bloquées dans votre navigateur.\n\nPour les autoriser :\n1. Cliquez sur le cadenas 🔒 à gauche de l'adresse URL en haut.\n2. Autorisez les Notifications.\n3. Rechargez la page.");
    }
  };

  // Format DD/MM/YYYY en chiffres uniquement à côté du logo (ex: 14/09/2026)
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthNumStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = now.getFullYear();
  const currentDateFormatted = `${dayStr}/${monthNumStr}/${yearStr}`;

  const todayStr = new Date().toISOString().split('T')[0];

  // Scheduled Reminders list (strictly accessible to currentUser)
  const scheduledReminders = useMemo(() => {
    return getAccessibleReminders(leads, currentUser).sort((a, b) =>
      (a.prochaineActionDate || '').localeCompare(b.prochaineActionDate || '')
    );
  }, [leads, currentUser]);

  const overdueCount = scheduledReminders.filter(l => (l.prochaineActionDate || '') < todayStr).length;

  const getRoleColorClass = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'MANAGER': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'GESTIONNAIRE': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'COURTIER':
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Header */}
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Cabinet Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
          {cabinetInfo.logoUrl ? (
            <div className="h-10 max-w-[140px] px-2 py-1 bg-white rounded-xl flex items-center justify-center shadow-md">
              <img
                src={cabinetInfo.logoUrl}
                alt={cabinetInfo.nomCabinet}
                className="max-h-8 max-w-[120px] object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 border-2 border-sky-400/60 shrink-0">
              <span className="text-[11px] tracking-tight font-black">CRM<span className="text-emerald-400 text-xs">+</span></span>
            </div>
          )}

          <div>
            <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
              {cabinetInfo.nomCabinet || 'Cabinet Assurance'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-semibold tracking-wide">
              {currentDateFormatted}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tableau de bord</span>
          </button>

          <button
            onClick={() => setCurrentTab('leads')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
              currentTab === 'leads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leads</span>
            {pendingActionsCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingActionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('calendar')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
              currentTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendrier & Rappels</span>
            {scheduledReminders.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                overdueCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
              }`}>
                {scheduledReminders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('chat')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
              currentTab === 'chat'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messagerie</span>
            {unreadChatCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Suivi des Agents (Pour Admin, Directeur et Responsables d'équipe) */}
          {(currentUser?.role === 'ADMIN' ||
            currentUser?.role === 'DIRECTEUR_PRODUCTION' ||
            currentUser?.role === 'RESPONSABLE_EQUIPE' ||
            currentUser?.role === 'MANAGER') && (
            <button
              onClick={() => setCurrentTab('activity-tracking')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'activity-tracking'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Suivi Présence</span>
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setCurrentTab('settings')}
              className={`p-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'settings' || currentTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Paramètres du Cabinet"
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </nav>

        {/* Action, Notifications & User Switcher */}
        <div className="flex items-center space-x-2">

          {/* Tracker Slot (Status En ligne / Pauses / Compteur) */}
          {trackerSlot}

          {/* User Profile Switcher */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center gap-2 transition cursor-pointer"
                title="Mon Profil / Compte actif"
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName(currentUser))}&background=0284c7&color=fff`
                  }
                  alt={getUserDisplayName(currentUser)}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-600 shrink-0"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold leading-none text-slate-100">{getUserDisplayName(currentUser)}</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                    {currentUser.role === 'AGENT_COMMERCIAL' ? 'Agent Commercial' : currentUser.role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Profile Card Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-slate-900 text-white space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Compte Connecté</p>
                    <div className="flex items-center gap-3">
                      <div
                        className="relative group cursor-pointer shrink-0"
                        onClick={() => {
                          setIsAvatarModalOpen(true);
                          setShowUserMenu(false);
                        }}
                        title="Cliquer pour modifier votre avatar / photo"
                      >
                        <img
                          src={
                            currentUser.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName(currentUser))}&background=0284c7&color=fff`
                          }
                          alt={getUserDisplayName(currentUser)}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700 transition group-hover:opacity-85"
                        />
                        <div className="absolute inset-0 bg-indigo-900/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                          <Sparkles className="w-4 h-4 text-indigo-200" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{getUserDisplayName(currentUser)}</p>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border mt-0.5 ${getRoleColorClass(currentUser.role)}`}>
                          {currentUser.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton direct de personnalisation d'avatar */}
                  <div className="p-2.5 bg-indigo-50/70 border-b border-indigo-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAvatarModalOpen(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full py-2 px-3 bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white transition" />
                      <span>Personnaliser mon avatar / photo</span>
                    </button>
                  </div>

                  <div className="p-3 space-y-2 text-xs text-slate-600 border-b border-slate-100">
                    <div className="flex justify-between items-center py-1">
                      <span className="font-semibold text-slate-500">Équipe :</span>
                      <span className="font-bold text-slate-800">{currentUser.equipe || 'Équipe Générale'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="font-semibold text-slate-500">Email :</span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]" title={currentUser.email}>{currentUser.email}</span>
                    </div>
                    {currentUser.specialite && (
                      <div className="flex justify-between items-center py-1">
                        <span className="font-semibold text-slate-500">Spécialité :</span>
                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{currentUser.specialite}</span>
                      </div>
                    )}
                  </div>

                  {currentUser.role === 'ADMIN' && (
                    <div className="p-2 space-y-1 bg-slate-50 border-b border-slate-100">
                      <button
                        onClick={() => {
                          setCurrentTab('settings');
                          setShowUserMenu(false);
                        }}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-indigo-100" />
                        <span>Gestion Utilisateurs & Droits</span>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentTab('settings');
                          setShowUserMenu(false);
                        }}
                        className="w-full py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-600" />
                        <span>Paramètres du Cabinet</span>
                      </button>
                    </div>
                  )}

                  {/* Déconnexion */}
                  <div className="p-2 bg-rose-50/50 rounded-b-2xl">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout?.();
                      }}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-rose-200/80"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>Se Déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bouton d'Installation & Déploiement PWA (Réservé au compte Administrateur) */}
          {currentUser?.role === 'ADMIN' && (
            <PWAInstallButton
              currentUser={currentUser}
              users={users}
              cabinetInfo={cabinetInfo}
            />
          )}

          {/* Contrôle Taille de Police / Densité */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFontSizeMenu(!showFontSizeMenu);
                setShowNotifications(false);
                setShowUserMenu(false);
              }}
              className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                showFontSizeMenu
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={`Taille de police actuelle : ${fontSize === 'compact' ? 'Très compacte' : fontSize === 'minimized' ? 'Minimisée' : 'Standard'} (Cliquer pour ajuster)`}
              aria-label="Taille de police"
            >
              <Type className="w-4 h-4 text-blue-400" />
            </button>

            {showFontSizeMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taille des polices</p>
                  <p className="text-[11px] text-slate-500 font-medium">Réduction appliquée au CRM</p>
                </div>

                <button
                  onClick={() => { handleSetFontSize('compact'); setShowFontSizeMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    fontSize === 'compact' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="block font-bold">Très compacte</span>
                    <span className="text-[10px] text-slate-400 font-normal">Ultra dense (12.5px)</span>
                  </div>
                  {fontSize === 'compact' && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>

                <button
                  onClick={() => { handleSetFontSize('minimized'); setShowFontSizeMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer mt-1 ${
                    fontSize === 'minimized' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="block font-bold">Minimisée ★</span>
                    <span className="text-[10px] text-slate-400 font-normal">Recommandée (13.5px)</span>
                  </div>
                  {fontSize === 'minimized' && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>

                <button
                  onClick={() => { handleSetFontSize('standard'); setShowFontSizeMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer mt-1 ${
                    fontSize === 'standard' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="block font-bold">Standard</span>
                    <span className="text-[10px] text-slate-400 font-normal">Taille normale (15px)</span>
                  </div>
                  {fontSize === 'standard' && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              </div>
            )}
          </div>

          {/* System Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition relative cursor-pointer flex items-center justify-center"
              title="Notifications des rappels et relances"
            >
              <Bell className="w-5 h-5 text-amber-400" />
              {scheduledReminders.length > 0 && (
                <span className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow ${
                  overdueCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
                }`}>
                  {scheduledReminders.length}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-xs">Rappels & Relances Programmés</h3>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Windows Desktop Popup & Sound Controls Banner */}
                <div className="p-3 bg-indigo-900/10 border-b border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                          Notifications Bureau & Alertes
                        </p>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {notifPermission === 'granted'
                            ? 'Popups actifs (Rappels & Messages chat)'
                            : 'Alerte popup quand vous êtes sur une autre page'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {notifPermission === 'granted' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Actif</span>
                        </span>
                      ) : (
                        <button
                          onClick={handleEnableWindowsNotifications}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Bell className="w-3 h-3 text-emerald-100" />
                          <span>Activer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sound Toggle & Test Row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-indigo-100/60">
                    <button
                      onClick={handleToggleSound}
                      className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        soundEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Activer ou couper le son des alertes et messages"
                    >
                      {soundEnabled ? (
                        <>
                          <Volume2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Sonnerie Active</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Sonnerie Coupée</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleTestChatAndSound}
                      disabled={isTestingNotif}
                      className="flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Tester immédiatement la sonnerie et la notification bureau"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>{isTestingNotif ? 'Envoi...' : 'Tester le son'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        setShowNotifSettingsModal(true);
                      }}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition flex items-center justify-center cursor-pointer border border-slate-200"
                      title="Ouvrir les paramètres avancés des notifications Chrome & App installée"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-2 max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {scheduledReminders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                      <p className="font-bold text-slate-800">Aucun rappel en attente</p>
                      <p className="text-[11px] text-slate-400">Toutes vos actions programmées sont à jour !</p>
                    </div>
                  ) : (
                    scheduledReminders.map((lead, idx) => {
                      const isOverdue = (lead.prochaineActionDate || '') < todayStr;
                      const isToday = (lead.prochaineActionDate || '') === todayStr;

                      return (
                        <div key={`reminder-${lead.id}-${idx}`} className="p-3 hover:bg-slate-50 transition rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isOverdue ? 'bg-red-100 text-red-800 border border-red-200' :
                              isToday ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {isOverdue ? '🚨 EN RETARD' : isToday ? '📅 AUJOURD\'HUI' : '🔮 À VENIR'}
                            </span>

                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              {lead.prochaineActionDate} {lead.prochaineActionHeure && `à ${lead.prochaineActionHeure}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-xs text-slate-900">{lead.prenom} {lead.nom}</p>
                              <p className="text-[11px] text-amber-900 font-semibold flex items-center gap-1">
                                📌 {lead.prochaineActionIntitule || 'Rappel'}
                              </p>
                            </div>

                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {lead.type}
                            </span>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {lead.telephone}
                            </span>

                            <div className="flex items-center space-x-1">
                              {onCompleteReminder && (
                                <button
                                  onClick={() => {
                                    onCompleteReminder(lead.id);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200 transition cursor-pointer"
                                  title="Marquer comme traité (Fait)"
                                >
                                  ✓ Fait
                                </button>
                              )}

                              {onCancelReminder && (
                                <button
                                  onClick={() => {
                                    onCancelReminder(lead.id);
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200 transition cursor-pointer"
                                  title="Annuler cette action"
                                >
                                  ✕ Annuler
                                </button>
                              )}

                              {onSelectLead && (
                                <button
                                  onClick={() => {
                                    onSelectLead(lead);
                                    setShowNotifications(false);
                                  }}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-md transition flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>Fiche</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {scheduledReminders.length > 0 && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setCurrentTab('calendar');
                        setShowNotifications(false);
                      }}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ouvrir le Calendrier & Rappels complet</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Submenu Bar */}
      <div className="flex lg:hidden border-t border-slate-800 px-2 py-1.5 justify-around bg-slate-950/80">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium ${
            currentTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentTab('leads')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium relative ${
            currentTab === 'leads' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Leads</span>
          {pendingActionsCount > 0 && (
            <span className="absolute top-0 right-2 bg-amber-500 text-slate-950 text-[10px] font-bold px-1 rounded-full">
              {pendingActionsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setCurrentTab('calendar')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium relative ${
            currentTab === 'calendar' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Rappels</span>
          {scheduledReminders.length > 0 && (
            <span className="absolute top-0 right-2 bg-amber-500 text-slate-950 text-[10px] font-bold px-1 rounded-full">
              {scheduledReminders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium relative ${
            currentTab === 'chat' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>Chat</span>
          {unreadChatCount > 0 && (
            <span className="absolute top-0 right-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
              {unreadChatCount}
            </span>
          )}
        </button>
        {(currentUser?.role === 'ADMIN' ||
          currentUser?.role === 'DIRECTEUR_PRODUCTION' ||
          currentUser?.role === 'RESPONSABLE_EQUIPE' ||
          currentUser?.role === 'MANAGER') && (
          <button
            onClick={() => setCurrentTab('activity-tracking')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium ${
              currentTab === 'activity-tracking' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5 text-amber-400" />
            <span>Présence</span>
          </button>
        )}
        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium ${
            currentTab === 'settings' || currentTab === 'users' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Paramètres</span>
        </button>
      </div>

      {/* Iframe / New Tab Guidance Modal */}
      {showIframeModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Monitor className="w-6 h-6" />
                <h3 className="font-bold text-base">Activation des Notifications Windows</h3>
              </div>
              <button
                onClick={() => setShowIframeModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-3 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  <strong>Sécurité Navigateur (Chrome / Edge) :</strong> Les autorisations de notifications popups ne peuvent pas être demandées directement à l'intérieur d'un cadre de prévisualisation (iframe).
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Pour recevoir les rappels clients sous forme de <strong>popups Windows</strong> en arrière-plan :
              </p>

              <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>Ouvrez le CRM dans un <strong>nouvel onglet indépendant</strong> (bouton ci-dessous).</li>
                <li>Dans ce nouvel onglet, cliquez sur l'icône de cloche 🔔 puis sur <strong>Activer</strong>.</li>
                <li>Acceptez la demande d'autorisation de votre navigateur.</li>
              </ol>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                onClick={() => setShowIframeModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>

              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowIframeModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ouvrir le CRM dans un nouvel onglet Chrome</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Studio Avatar & Photo de Profil */}
      {currentUser && (
        <AvatarCreatorModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          currentAvatarUrl={currentUser.avatarUrl}
          user={currentUser}
          onSaveAvatar={(newAvatarUrl) => {
            if (onSaveUser) {
              onSaveUser({
                ...currentUser,
                avatarUrl: newAvatarUrl
              });
            }
          }}
        />
      )}

      {/* Modal Paramètres Avancés Notifications Chrome & PWA */}
      <NotificationSettingsModal
        isOpen={showNotifSettingsModal}
        onClose={() => {
          setShowNotifSettingsModal(false);
          setNotifPermission(getNotificationPermission());
          setSoundEnabled(isChatSoundEnabled());
        }}
        onOpenChat={() => setCurrentTab('chat')}
      />
    </div>
  );
};
