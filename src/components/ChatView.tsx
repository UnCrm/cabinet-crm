import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Paperclip,
  Search,
  Plus,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Smile,
  X,
  FileText,
  Image as ImageIcon,
  CheckCheck,
  Info,
  Lock,
  Sparkles,
  ChevronRight,
  User as UserIcon,
  Phone,
  Mail,
  AlertCircle,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Check,
  ExternalLink,
  Sliders
} from 'lucide-react';
import {
  User,
  ChatChannel,
  ChatMessage,
  UserRole,
  isAdminRole,
  isResponsableRole,
  isAgentRole,
  isChannelVisibleToUser
} from '../types/crm';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isChatSoundEnabled,
  setChatSoundEnabled,
  isChatDesktopNotifEnabled,
  setChatDesktopNotifEnabled,
  testChatNotification,
  isInIframe
} from '../utils/notifications';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface ChatViewProps {
  currentUser: User;
  users: User[];
  channels: ChatChannel[];
  messages: ChatMessage[];
  onSendMessage: (channelId: string, content: string, attachments?: any[]) => void;
  onCreateDirectChannel: (otherUser: User) => string;
  onToggleReaction: (messageId: string, emoji: string) => void;
  selectedChannelId?: string;
  onSelectChannel?: (channelId: string) => void;
  unreadCountByChannel?: Record<string, number>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  users,
  channels,
  messages,
  onSendMessage,
  onCreateDirectChannel,
  onToggleReaction,
  selectedChannelId,
  onSelectChannel,
  unreadCountByChannel = {}
}) => {
  const [activeChannelId, setActiveChannelId] = useState<string>(selectedChannelId || '');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [showChannelInfoPanel, setShowChannelInfoPanel] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<{ id: string; name: string; url: string; size: string; type: 'image' | 'file' }[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notification and Sound Controls State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isChatSoundEnabled());
  const [desktopNotifEnabled, setDesktopNotifEnabled] = useState<boolean>(() => isChatDesktopNotifEnabled());
  const [isTestingFeedback, setIsTestingFeedback] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  // Sync external channel selection
  useEffect(() => {
    if (selectedChannelId && selectedChannelId !== activeChannelId) {
      setActiveChannelId(selectedChannelId);
    }
  }, [selectedChannelId]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
  };

  const handleToggleDesktopNotif = () => {
    const next = !desktopNotifEnabled;
    setDesktopNotifEnabled(next);
    setChatDesktopNotifEnabled(next);
  };

  const handleEnableDesktopNotifications = async () => {
    if (isInIframe()) {
      setShowIframeModal(true);
      return;
    }
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const handleTestChatNotification = () => {
    setIsTestingFeedback(true);
    testChatNotification(() => {
      // Focus chat channel callback
    });
    setTimeout(() => {
      setIsTestingFeedback(false);
    }, 2500);
  };

  // Filter channels based on user role, team and participant permissions
  const visibleChannels = channels.filter((channel) => isChannelVisibleToUser(channel, currentUser));

  // Set default active channel if none selected
  useEffect(() => {
    if (!activeChannelId && visibleChannels.length > 0) {
      setActiveChannelId(visibleChannels[0].id);
    } else if (activeChannelId && !visibleChannels.some((c) => c.id === activeChannelId)) {
      if (visibleChannels.length > 0) {
        setActiveChannelId(visibleChannels[0].id);
      }
    }
  }, [visibleChannels, activeChannelId]);

  // Scroll to bottom on new messages or active channel change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  const activeChannel = visibleChannels.find((c) => c.id === activeChannelId);

  // Get messages for current channel
  const currentMessages = messages.filter((m) => m.channelId === activeChannelId);

  // Filter messages by search keyword if specified
  const filteredCurrentMessages = messageSearch.trim()
    ? currentMessages.filter((m) =>
        m.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
        m.senderName.toLowerCase().includes(messageSearch.toLowerCase())
      )
    : currentMessages;

  // Filter contacts available for starting a new direct chat based on role rules
  const getEligibleDirectContacts = () => {
    return users.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (u.status !== 'ACTIF') return false;

      // RULE 1: AGENTS CANNOT CHAT WITH OTHER AGENTS
      if (isAgentRole(currentUser.role)) {
        // Can chat with Responsables or Admins ONLY
        return isResponsableRole(u.role) || isAdminRole(u.role);
      }

      // RULE 2: RESPONSABLES CAN CHAT WITH AGENTS AND ADMINS
      if (isResponsableRole(currentUser.role)) {
        return isAgentRole(u.role) || isAdminRole(u.role);
      }

      // RULE 3: ADMINS CAN CHAT WITH EVERYONE
      if (isAdminRole(currentUser.role)) {
        return true;
      }

      return true;
    });
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && selectedAttachments.length === 0) || !activeChannelId) return;

    onSendMessage(activeChannelId, inputText.trim(), selectedAttachments);
    setInputText('');
    setSelectedAttachments([]);
    setEmojiPickerOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImg = file.type.startsWith('image/');
    const fakeUrl = URL.createObjectURL(file);

    const newAtt = {
      id: `att-${Date.now()}`,
      name: file.name,
      url: fakeUrl,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: (isImg ? 'image' : 'file') as 'image' | 'file'
    };

    setSelectedAttachments((prev) => [...prev, newAtt]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getRoleBadge = (role?: UserRole) => {
    if (isAdminRole(role)) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
          <ShieldCheck className="w-3 h-3 text-purple-600" /> Direction
        </span>
      );
    }
    if (isResponsableRole(role)) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
          <UserCheck className="w-3 h-3 text-blue-600" /> Responsable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
        <Briefcase className="w-3 h-3 text-emerald-600" /> Agent Commercial
      </span>
    );
  };

  const getChannelDisplayTitle = (channel: ChatChannel) => {
    if (channel.type === 'GROUP') {
      return channel.name;
    }
    // Direct Channel
    const otherId = channel.participantIds.find((id) => id !== currentUser.id);
    const otherUser = users.find((u) => u.id === otherId);
    if (otherUser) {
      return otherUser.pseudo || `${otherUser.prenom} ${otherUser.nom}`;
    }
    return channel.name;
  };

  const getChannelDisplaySubtitle = (channel: ChatChannel) => {
    if (channel.type === 'GROUP') {
      return channel.equipe ? `Équipe : ${channel.equipe}` : 'Canal Général';
    }
    const otherId = channel.participantIds.find((id) => id !== currentUser.id);
    const otherUser = users.find((u) => u.id === otherId);
    if (otherUser) {
      return `${otherUser.role} • ${otherUser.equipe || 'Cabinet'}`;
    }
    return 'Chat Direct';
  };

  const getChannelAvatar = (channel: ChatChannel) => {
    if (channel.type === 'GROUP') {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
          <Users className="w-5 h-5" />
        </div>
      );
    }
    const otherId = channel.participantIds.find((id) => id !== currentUser.id);
    const otherUser = users.find((u) => u.id === otherId);
    if (otherUser) {
      return (
        <div className="relative shrink-0">
          <img
            src={
              otherUser.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.prenom + ' ' + otherUser.nom)}&background=0284c7&color=fff`
            }
            alt={otherUser.prenom}
            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
        <UserIcon className="w-5 h-5" />
      </div>
    );
  };

  // Channel participants users
  const activeParticipants = activeChannel
    ? users.filter((u) => activeChannel.participantIds.includes(u.id))
    : [];

  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[580px] bg-white rounded-2xl shadow-xl border border-slate-200 flex overflow-hidden">
      {/* LEFT SIDEBAR: Channels & Conversations */}
      <div className="w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Messagerie Interne</h2>
                <p className="text-[10px] text-slate-500">Chats Agents & Responsables</p>
              </div>
            </div>

            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Démarrer une nouvelle discussion"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>

          {/* Search channel */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une discussion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Notifications & Sound Controls Card */}
        <div className="p-3 bg-slate-900 text-white border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-bold tracking-wide uppercase text-slate-300">
                Alertes & Sons
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {notifPermission === 'granted' ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  <span>Bureau Actif</span>
                </span>
              ) : (
                <button
                  onClick={handleEnableDesktopNotifications}
                  className="px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-full transition flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Autoriser les notifications de bureau Windows/Navigateur"
                >
                  <Bell className="w-2.5 h-2.5" />
                  <span>Autoriser</span>
                </button>
              )}

              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                title="Personnaliser les sonneries, le volume et les notifications Chrome / PWA"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {/* Son Toggle */}
            <button
              onClick={handleToggleSound}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                soundEnabled
                  ? 'bg-slate-800 text-emerald-300 border-emerald-500/40 hover:bg-slate-700'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Sonnerie activée (chime mélodieux)' : 'Sonnerie coupée'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Sonnerie ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">Sonnerie OFF</span>
                </>
              )}
            </button>

            {/* Popups Bureau Toggle */}
            <button
              onClick={notifPermission === 'granted' ? handleToggleDesktopNotif : handleEnableDesktopNotifications}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                desktopNotifEnabled && notifPermission === 'granted'
                  ? 'bg-slate-800 text-blue-300 border-blue-500/40 hover:bg-slate-700'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
              title={
                notifPermission !== 'granted'
                  ? 'Cliquez pour autoriser les popups de bureau'
                  : desktopNotifEnabled
                  ? 'Popups de bureau activés'
                  : 'Popups de bureau désactivés'
              }
            >
              {desktopNotifEnabled && notifPermission === 'granted' ? (
                <>
                  <Bell className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">Bureau ON</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">Bureau OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Test Button */}
          <button
            onClick={handleTestChatNotification}
            disabled={isTestingFeedback}
            className="w-full py-1.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isTestingFeedback ? (
              <>
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
                <span>Test en cours (Sonnerie + Popup)...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-blue-200" />
                <span>Tester la sonnerie & la notification bureau</span>
              </>
            )}
          </button>
        </div>

        {/* Role Rules Info Banner */}
        <div className="p-2.5 bg-blue-50/80 border-b border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            {isAgentRole(currentUser.role) ? (
              <span>
                <strong>Accès Agent :</strong> Vous pouvez échanger avec vos Responsables, la Direction ou via le groupe d'équipe.
              </span>
            ) : isResponsableRole(currentUser.role) ? (
              <span>
                <strong>Accès Responsable :</strong> Vous échangez avec les agents de votre équipe, la Direction et en groupe.
              </span>
            ) : (
              <span>
                <strong>Accès Direction :</strong> Vous avez un accès direct à l'ensemble des agents et responsables.
              </span>
            )}
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Group Channels Section */}
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Groupes d'Équipe</span>
            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full text-[9px]">
              {visibleChannels.filter((c) => c.type === 'GROUP').length}
            </span>
          </div>

          {visibleChannels
            .filter((c) => c.type === 'GROUP')
            .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((channel) => {
              const isActive = channel.id === activeChannelId;
              const unread = unreadCountByChannel[channel.id] || 0;
              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    setActiveChannelId(channel.id);
                    onSelectChannel?.(channel.id);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-medium'
                      : 'hover:bg-slate-200/60 text-slate-700'
                  }`}
                >
                  {getChannelAvatar(channel)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {channel.name}
                      </span>
                      {unread > 0 && !isActive && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-xs animate-pulse">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {channel.lastMessage || channel.description || 'Discussions de groupe'}
                    </p>
                  </div>
                </button>
              );
            })}

          {/* Direct Messages Section */}
          <div className="px-3 py-1.5 mt-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Messages Directs</span>
            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full text-[9px]">
              {visibleChannels.filter((c) => c.type === 'DIRECT').length}
            </span>
          </div>

          {visibleChannels
            .filter((c) => c.type === 'DIRECT')
            .filter((c) =>
              getChannelDisplayTitle(c).toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((channel) => {
              const isActive = channel.id === activeChannelId;
              const title = getChannelDisplayTitle(channel);
              const subtitle = getChannelDisplaySubtitle(channel);
              const unread = unreadCountByChannel[channel.id] || 0;

              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    setActiveChannelId(channel.id);
                    onSelectChannel?.(channel.id);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-medium'
                      : 'hover:bg-slate-200/60 text-slate-700'
                  }`}
                >
                  {getChannelAvatar(channel)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                      </span>
                      {unread > 0 && !isActive && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-xs animate-pulse">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {channel.lastMessage || subtitle}
                    </p>
                  </div>
                </button>
              );
            })}

          {visibleChannels.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">
              Aucune discussion disponible.
            </div>
          )}
        </div>
      </div>

      {/* CENTER & RIGHT AREA: Chat Header, Messages & Input */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeChannel ? (
          <>
            {/* Active Channel Header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                {getChannelAvatar(activeChannel)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {getChannelDisplayTitle(activeChannel)}
                    </h3>
                    {activeChannel.type === 'GROUP' ? (
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Groupe Équipe
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {getChannelDisplaySubtitle(activeChannel)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search within messages */}
                <div className="relative hidden md:block">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Chercher dans ce chat..."
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    className="text-xs pl-8 pr-2 py-1 bg-slate-100 border border-slate-200 rounded-lg w-40 focus:w-56 focus:bg-white focus:outline-none transition-all"
                  />
                  {messageSearch && (
                    <button
                      onClick={() => setMessageSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowChannelInfoPanel(!showChannelInfoPanel)}
                  className={`p-2 rounded-xl border transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    showChannelInfoPanel
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="Détails du chat"
                >
                  <Info className="w-4 h-4" />
                  <span className="hidden sm:inline">Infos</span>
                </button>
              </div>
            </div>

            {/* Main Chat Layout: Messages + Info Drawer */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {/* Messages Area */}
              <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 bg-slate-50/30">
                {filteredCurrentMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">Début de la discussion</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Échangez directement avec votre interlocuteur dans un cadre professionnel sécurisé.
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredCurrentMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar */}
                        <img
                          src={
                            msg.senderAvatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=0284c7&color=fff`
                          }
                          alt={msg.senderName}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5 shadow-xs"
                        />

                        {/* Message Bubble Content */}
                        <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                          {/* Sender name & Role */}
                          <div className={`flex items-center gap-2 text-[11px] text-slate-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="font-bold text-slate-800">
                              {(() => {
                                const senderUser = users.find((u) => u.id === msg.senderId);
                                return senderUser?.pseudo || msg.senderName;
                              })()}
                            </span>
                            {getRoleBadge(msg.senderRole)}
                            <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                          </div>

                          {/* Text Bubble */}
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs text-left ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>

                            {/* Attachments inside bubble */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/40 space-y-1.5">
                                {msg.attachments.map((att) => (
                                  <div
                                    key={att.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                                      isMe ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {att.type === 'image' ? (
                                      <ImageIcon className="w-4 h-4 shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 shrink-0" />
                                    )}
                                    <span className="font-medium truncate flex-1">{att.name}</span>
                                    {att.size && <span className="text-[10px] opacity-75">{att.size}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Message Reactions */}
                          <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {['👍', '❤️', '🔥'].map((emoji) => {
                              const reactionUsers = msg.reactions?.[emoji] || [];
                              const count = reactionUsers.length;
                              const hasReacted = reactionUsers.includes(currentUser.id);

                              return (
                                <button
                                  key={emoji}
                                  onClick={() => onToggleReaction(msg.id, emoji)}
                                  className={`text-[11px] px-1.5 py-0.5 rounded-full border transition flex items-center gap-0.5 cursor-pointer ${
                                    hasReacted
                                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {count > 0 && <span>{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* RIGHT DRAWER: Channel Info & Members */}
              {showChannelInfoPanel && (
                <div className="w-72 border-l border-slate-200 bg-white p-4 overflow-y-auto space-y-5 animate-in slide-in-from-right-2 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Détails de la discussion
                    </h4>
                    <button
                      onClick={() => setShowChannelInfoPanel(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center space-y-2">
                    {getChannelAvatar(activeChannel)}
                    <h5 className="font-bold text-slate-900 text-sm">
                      {getChannelDisplayTitle(activeChannel)}
                    </h5>
                    <p className="text-xs text-slate-500">{getChannelDisplaySubtitle(activeChannel)}</p>
                  </div>

                  {/* Channel Description */}
                  {activeChannel.description && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800 text-[11px]">Règles & Objectif :</p>
                      <p>{activeChannel.description}</p>
                    </div>
                  )}

                  {/* Participants List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Membres du chat</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                        {activeParticipants.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {activeParticipants.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={
                                u.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(u.prenom + ' ' + u.nom)}&background=0284c7&color=fff`
                              }
                              alt={u.prenom}
                              className="w-7 h-7 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {u.pseudo || `${u.prenom} ${u.nom}`}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{u.specialite || u.role}</p>
                            </div>
                          </div>
                          {getRoleBadge(u.role)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Templates & Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white space-y-2">
              {/* Selected Attachments Preview */}
              {selectedAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {selectedAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-xl text-xs flex items-center gap-2"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-medium max-w-[150px] truncate">{att.name}</span>
                      <button
                        onClick={() =>
                          setSelectedAttachments((prev) => prev.filter((a) => a.id !== att.id))
                        }
                        className="hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                <span className="text-slate-400 font-bold shrink-0">Raccourcis :</span>
                {[
                  "📌 Point sur un dossier lead",
                  "💡 Question tarifaire",
                  "✍️ Accord remise exceptionnelle",
                  "✅ Devis souscrit"
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setInputText((prev) => (prev ? `${prev} ${chip}` : chip))}
                    className="bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full shrink-0 transition cursor-pointer font-medium"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Joindre un fichier"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder="Rédiger votre message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && selectedAttachments.length === 0}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md transition font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Envoyer</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Sélectionnez une discussion</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Choisissez un groupe d'équipe ou démarrez une conversation directe.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: START NEW DIRECT CHAT */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Nouvelle Discussion Directe</h3>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Role Guidance Banner */}
            <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {isAgentRole(currentUser.role) ? (
                  <span>
                    Conformément aux règles de communication interne, les agents échangent uniquement avec leur <strong>Responsable d'équipe</strong> et la <strong>Direction</strong>.
                  </span>
                ) : (
                  <span>
                    Sélectionnez un membre de l'équipe pour ouvrir un canal de discussion privé direct.
                  </span>
                )}
              </div>
            </div>

            {/* Contacts List */}
            <div className="p-3 max-h-80 overflow-y-auto space-y-2">
              {getEligibleDirectContacts().map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    const newChanId = onCreateDirectChannel(contact);
                    setActiveChannelId(newChanId);
                    setIsNewChatModalOpen(false);
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        contact.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.prenom + ' ' + contact.nom)}&background=0284c7&color=fff`
                      }
                      alt={contact.prenom}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <p className="font-bold text-xs text-slate-900 group-hover:text-blue-700">
                        {contact.pseudo || `${contact.prenom} ${contact.nom}`}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {contact.specialite || contact.equipe || contact.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getRoleBadge(contact.role)}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </div>
              ))}

              {getEligibleDirectContacts().length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Aucun contact disponible pour lancer un chat direct.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IFRAME NOTIFICATION WARNING */}
      {showIframeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Bell className="w-6 h-6" />
                <h3 className="font-bold text-base">Activation des Notifications de Bureau</h3>
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
                  <strong>Sécurité Navigateur (Chrome / Edge) :</strong> Les autorisations de notifications popups Windows ne peuvent pas être demandées directement à l'intérieur d'un cadre de prévisualisation (iframe).
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Pour recevoir les messages du chat sous forme de <strong>popups Windows avec sonnerie</strong> en direct :
              </p>

              <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>Ouvrez le CRM dans un <strong>nouvel onglet indépendant</strong> (bouton ci-dessous).</li>
                <li>Dans la messagerie, cliquez sur <strong>Autoriser Bureau</strong>.</li>
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

      {/* Modal Paramètres Avancés Notifications Chrome & PWA */}
      <NotificationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setNotifPermission(getNotificationPermission());
          setSoundEnabled(isChatSoundEnabled());
          setDesktopNotifEnabled(isChatDesktopNotifEnabled());
        }}
      />
    </div>
  );
};
