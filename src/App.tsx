import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { LeadsList } from './components/LeadsList';
import { UserManagementView } from './components/UserManagementView';
import { SettingsPage } from './components/SettingsPage';
import { LeadModal } from './components/LeadModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { LeadDetailsView } from './components/LeadDetailsView';
import { ChatView } from './components/ChatView';
import { LoginView } from './components/LoginView';
import { CalendarRemindersView } from './components/CalendarRemindersView';
import { AgentWorkTracker } from './components/AgentWorkTracker';
import { AgentWorkDashboard } from './components/AgentWorkDashboard';
import { QuickSearchCommandPalette } from './components/QuickSearchCommandPalette';

import { 
  Lead, 
  LeadStatus, 
  LeadType, 
  CabinetInfo, 
  SmtpConfig, 
  EmailTemplate, 
  User, 
  ChatChannel, 
  ChatMessage, 
  InsurancePartnerApiConfig,
  AgentWorkSession,
  getUserDisplayName,
  shouldTrackAgentPresence,
  isAdminRole,
  completeProchaineAction,
  cancelProchaineAction
} from './types/crm';
import { 
  loadLeads, 
  saveLeads, 
  loadCabinetInfo, 
  saveCabinetInfo, 
  loadSmtpConfig, 
  saveSmtpConfig, 
  loadEmailTemplates, 
  saveEmailTemplates,
  loadUsers,
  saveUsers,
  loadCurrentUser,
  saveCurrentUser,
  loadChatChannels,
  saveChatChannels,
  loadChatMessages,
  saveChatMessages,
  loadInsurancePartners,
  saveInsurancePartners,
  loadTeams,
  saveTeams,
  loadAgentSessions,
  saveAgentSessions,
  loadActiveSession,
  saveActiveSession
} from './utils/storage';
import { 
  checkAndNotifyReminders,
  sendChatDesktopNotification,
  playChatNotificationSound
} from './utils/notifications';
import { getAccessibleLeads, getAccessibleReminders, canUserDeleteLead } from './utils/permissions';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { 
  syncLeadToFirestore, 
  deleteLeadFromFirestore, 
  syncUserToFirestore, 
  syncChatMessageToFirestore, 
  syncChatChannelToFirestore,
  syncCabinetInfoToFirestore,
  syncSmtpConfigToFirestore,
  syncEmailTemplatesToFirestore,
  syncPartnersToFirestore,
  syncTeamsToFirestore,
  syncAgentSessionToFirestore
} from './firebase';

const AUTH_KEY = 'crm_insurance_authenticated_v1';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored === 'true';
  });

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'leads' | 'calendar' | 'users' | 'settings' | 'chat' | 'activity-tracking'>('dashboard');
  const [productFilter, setProductFilter] = useState<LeadType | 'ALL'>('ALL');

  // Persistence State
  const [leads, setLeads] = useState<Lead[]>(() => {
    const loaded = loadLeads();
    const map = new Map<string, Lead>();
    loaded.forEach(l => { if (l?.id) map.set(l.id, l); });
    return Array.from(map.values());
  });
  const [users, setUsers] = useState<User[]>(loadUsers());
  const [currentUser, setCurrentUser] = useState<User>(loadCurrentUser());
  const [cabinetInfo, setCabinetInfo] = useState<CabinetInfo>(loadCabinetInfo());
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(loadSmtpConfig());
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(loadEmailTemplates());
  const [partners, setPartners] = useState<InsurancePartnerApiConfig[]>(loadInsurancePartners());
  const [teams, setTeams] = useState<string[]>(loadTeams());
  const [agentSessions, setAgentSessions] = useState<AgentWorkSession[]>(() => loadAgentSessions());
  const [activeSession, setActiveSession] = useState<AgentWorkSession | null>(() => loadActiveSession());

  const handleSaveTeams = (newTeams: string[]) => {
    setTeams(newTeams);
    saveTeams(newTeams);
    syncTeamsToFirestore(newTeams);
  };

  // Login / Logout Handlers with Work Session Initialization
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    saveCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_KEY, 'true');

    // Start a new work session on login ONLY for Commercials & Gestionnaires
    if (shouldTrackAgentPresence(user.role)) {
      const nowIso = new Date().toISOString();
      const newSession: AgentWorkSession = {
        id: `sess-${user.id}-${Date.now()}`,
        userId: user.id,
        userPseudo: getUserDisplayName(user),
        userFullName: `${user.prenom} ${user.nom}`.trim(),
        userRole: user.role,
        userEquipe: user.equipe,
        loginAt: nowIso,
        lastActiveAt: nowIso,
        status: 'ONLINE',
        workSeconds: 0,
        breaks: []
      };

      setActiveSession(newSession);
      saveActiveSession(newSession);
      syncAgentSessionToFirestore(newSession);

      // Also append to session history
      setAgentSessions(prev => {
        const updated = [newSession, ...prev.filter(s => s.id !== newSession.id)];
        saveAgentSessions(updated);
        return updated;
      });
    } else {
      setActiveSession(null);
      saveActiveSession(null);
    }
  };

  const handleLogout = () => {
    // If there is an active session, close it cleanly
    if (activeSession) {
      const nowIso = new Date().toISOString();
      const closedSession: AgentWorkSession = {
        ...activeSession,
        status: 'OFFLINE',
        logoutAt: nowIso,
        lastActiveAt: nowIso
      };
      syncAgentSessionToFirestore(closedSession);
      saveActiveSession(null);
      setAgentSessions(prev => {
        const updated = prev.map(s => s.id === closedSession.id ? closedSession : s);
        saveAgentSessions(updated);
        return updated;
      });
    }
    setActiveSession(null);
    setIsAuthenticated(false);
    localStorage.setItem(AUTH_KEY, 'false');
  };

  // Auto logout triggered after 15 min of inactivity
  const handleAutoLogout = () => {
    if (activeSession) {
      const nowIso = new Date().toISOString();
      const closedSession: AgentWorkSession = {
        ...activeSession,
        status: 'OFFLINE',
        logoutAt: nowIso,
        lastActiveAt: nowIso,
        isAutoDisconnected: true
      };
      syncAgentSessionToFirestore(closedSession);
      saveActiveSession(null);
      setAgentSessions(prev => {
        const updated = prev.map(s => s.id === closedSession.id ? closedSession : s);
        saveAgentSessions(updated);
        return updated;
      });
    }
    setActiveSession(null);
    setIsAuthenticated(false);
    localStorage.setItem(AUTH_KEY, 'false');
  };

  const handleUpdateActiveSession = (session: AgentWorkSession) => {
    setActiveSession(session);
    saveActiveSession(session);
    setAgentSessions(prev => {
      const exists = prev.some(s => s.id === session.id);
      const updated = exists
        ? prev.map(s => s.id === session.id ? session : s)
        : [session, ...prev];
      saveAgentSessions(updated);
      return updated;
    });
  };

  // Chat State
  const [channels, setChannels] = useState<ChatChannel[]>(loadChatChannels());
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatMessages());
  const [selectedChatChannelId, setSelectedChatChannelId] = useState<string>('');

  // Track known message IDs to avoid notifying duplicate or initial messages
  const knownMessageIdsRef = useRef<Set<string>>(new Set(loadChatMessages().map(m => m.id)));
  const hasInitialMessagesRef = useRef<boolean>(false);

  // Per-channel read timestamps
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`crm_chat_read_${currentUser?.id || 'guest'}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Re-sync timestamps whenever currentUser or channels change
  useEffect(() => {
    if (!currentUser) return;
    try {
      const key = `crm_chat_read_${currentUser.id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        setLastReadTimestamps(JSON.parse(raw));
      } else {
        // First time login for this user: mark all existing channels as read up to current timestamp
        const initialTimestamps: Record<string, number> = {};
        const now = Date.now();
        channels.forEach(ch => {
          initialTimestamps[ch.id] = now;
        });
        localStorage.setItem(key, JSON.stringify(initialTimestamps));
        setLastReadTimestamps(initialTimestamps);
      }
    } catch {}
  }, [currentUser?.id, channels]);

  const markChannelAsRead = useCallback((chanId: string) => {
    if (!chanId || !currentUser) return;
    const now = Date.now();
    setLastReadTimestamps(prev => {
      const next = { ...prev, [chanId]: now };
      try {
        localStorage.setItem(`crm_chat_read_${currentUser.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [currentUser]);

  const markAllChannelsAsRead = useCallback(() => {
    if (!currentUser) return;
    const now = Date.now();
    const next: Record<string, number> = {};
    channels.forEach(ch => {
      next[ch.id] = now;
    });
    try {
      localStorage.setItem(`crm_chat_read_${currentUser.id}`, JSON.stringify(next));
    } catch {}
    setLastReadTimestamps(next);
  }, [currentUser, channels]);

  // When viewing chat and a channel is selected, mark as read
  useEffect(() => {
    if (currentTab === 'chat' && selectedChatChannelId) {
      markChannelAsRead(selectedChatChannelId);
    }
  }, [currentTab, selectedChatChannelId, markChannelAsRead]);

  // Helper to trigger desktop notification + audio chime for incoming messages from others
  const notifyIncomingMessages = useCallback((newMessagesList: ChatMessage[]) => {
    if (!currentUser) return;

    if (!hasInitialMessagesRef.current) {
      newMessagesList.forEach(m => knownMessageIdsRef.current.add(m.id));
      hasInitialMessagesRef.current = true;
      return;
    }

    const freshMessages = newMessagesList.filter(m => !knownMessageIdsRef.current.has(m.id));
    freshMessages.forEach(m => knownMessageIdsRef.current.add(m.id));

    const fromOthers = freshMessages.filter(m => m.senderId !== currentUser.id);
    if (fromOthers.length === 0) return;

    // Pick the most recent message
    fromOthers.sort((a, b) => {
      const tA = a.createdAtIso ? new Date(a.createdAtIso).getTime() : 0;
      const tB = b.createdAtIso ? new Date(b.createdAtIso).getTime() : 0;
      return tA - tB;
    });

    const latest = fromOthers[fromOthers.length - 1];
    const targetChannel = channels.find(c => c.id === latest.channelId);

    // Verify channel permission
    const hasAccess = targetChannel && (
      targetChannel.type === 'GROUP'
        ? (isAdminRole(currentUser.role) || targetChannel.participantIds.includes(currentUser.id) || (currentUser.equipe && targetChannel.equipe === currentUser.equipe))
        : targetChannel.participantIds.includes(currentUser.id)
    );

    if (hasAccess) {
      const isActivelyViewing =
        currentTab === 'chat' &&
        selectedChatChannelId === latest.channelId &&
        typeof document !== 'undefined' &&
        !document.hidden;

      if (!isActivelyViewing) {
        // Full desktop notification with sound chime
        sendChatDesktopNotification({
          messageId: latest.id,
          senderName: latest.senderName,
          senderAvatar: latest.senderAvatar,
          content: latest.content,
          channelId: latest.channelId,
          channelName: targetChannel?.name,
          channelType: targetChannel?.type,
          attachmentsCount: latest.attachments?.length
        }, () => {
          // When clicked by user on Windows desktop popup
          setCurrentTab('chat');
          setSelectedChatChannelId(latest.channelId);
          markChannelAsRead(latest.channelId);
        });
      } else {
        // Just play subtle message sound chime
        playChatNotificationSound(0.25);
        markChannelAsRead(latest.channelId);
      }
    }
  }, [currentUser, channels, currentTab, selectedChatChannelId, markChannelAsRead]);

  // Firebase Cloud Synchronization
  const {
    firebaseUser,
    isCloudConnected,
    syncStatus,
    lastSyncTime,
    syncError,
    connectGoogle,
    disconnectGoogle,
    forcePushAll
  } = useFirebaseSync({
    initialLeads: leads,
    initialUsers: users,
    initialChannels: channels,
    currentCabinetInfo: cabinetInfo,
    onLeadsRemoteUpdate: (remoteLeads) => {
      setLeads(remoteLeads);
    },
    onUsersRemoteUpdate: (remoteUsers) => {
      setUsers(remoteUsers);
    },
    onMessagesRemoteUpdate: (remoteMessages) => {
      setMessages(remoteMessages);
      saveChatMessages(remoteMessages);
      notifyIncomingMessages(remoteMessages);
    },
    onChannelsRemoteUpdate: (remoteChannels) => {
      setChannels(remoteChannels);
    },
    onSessionsRemoteUpdate: (remoteSessions) => {
      setAgentSessions(remoteSessions);
    },
    onCabinetInfoRemoteUpdate: (remoteCabinet) => {
      setCabinetInfo(remoteCabinet);
    },
    onSmtpRemoteUpdate: (remoteSmtp) => {
      setSmtpConfig(remoteSmtp);
    },
    onTemplatesRemoteUpdate: (remoteTemplates) => {
      setEmailTemplates(remoteTemplates);
    },
    onPartnersRemoteUpdate: (remotePartners) => {
      setPartners(remotePartners);
    },
    onTeamsRemoteUpdate: (remoteTeams) => {
      setTeams(remoteTeams);
    }
  });

  // Calculate unread chat messages counts per channel
  const unreadCountByChannel = useMemo(() => {
    if (!currentUser) return {};
    const counts: Record<string, number> = {};

    messages.forEach(msg => {
      if (msg.senderId === currentUser.id) return;
      if (currentTab === 'chat' && selectedChatChannelId === msg.channelId) return;

      const lastRead = lastReadTimestamps[msg.channelId] || 0;
      const msgTime = msg.createdAtIso
        ? new Date(msg.createdAtIso).getTime()
        : (msg.timestamp ? new Date(msg.timestamp).getTime() : 0);

      // Strict unread check: only count messages created after the lastRead timestamp
      if (lastRead > 0 && msgTime > lastRead) {
        counts[msg.channelId] = (counts[msg.channelId] || 0) + 1;
      }
    });

    return counts;
  }, [messages, currentUser, currentTab, selectedChatChannelId, lastReadTimestamps]);

  const totalUnreadChatCount = useMemo(() => {
    return Object.values(unreadCountByChannel).reduce((sum: number, c: number) => sum + c, 0);
  }, [unreadCountByChannel]);

  // Modal States
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [selectedLeadDetails, setSelectedLeadDetails] = useState<Lead | null>(null);

  // Load leads on mount and check background reminders
  useEffect(() => {
    const savedFontSize = localStorage.getItem('crm_font_size') || 'minimized';
    document.documentElement.setAttribute('data-font-size', savedFontSize);

    const loaded = loadLeads();
    setLeads(loaded);
    checkAndNotifyReminders(loaded, currentUser);

    // If authenticated and no activeSession exists in memory or local storage, initialize one ONLY for Commercials & Gestionnaires
    if (isAuthenticated && currentUser && shouldTrackAgentPresence(currentUser.role)) {
      const existing = loadActiveSession();
      if (!existing || existing.userId !== currentUser.id) {
        const nowIso = new Date().toISOString();
        const autoSess: AgentWorkSession = {
          id: `sess-${currentUser.id}-${Date.now()}`,
          userId: currentUser.id,
          userPseudo: getUserDisplayName(currentUser),
          userFullName: `${currentUser.prenom} ${currentUser.nom}`.trim(),
          userRole: currentUser.role,
          userEquipe: currentUser.equipe,
          loginAt: nowIso,
          lastActiveAt: nowIso,
          status: 'ONLINE',
          workSeconds: 0,
          breaks: []
        };
        setActiveSession(autoSess);
        saveActiveSession(autoSess);
        syncAgentSessionToFirestore(autoSess);
      }
    } else if (isAuthenticated && currentUser && !shouldTrackAgentPresence(currentUser.role)) {
      // Clear any leftover session for admin/responsables
      setActiveSession(null);
      saveActiveSession(null);
    }

    // Periodically check for due/overdue reminders in background every 30s
    const interval = setInterval(() => {
      checkAndNotifyReminders(loadLeads(), currentUser);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Also check whenever leads state updates
  useEffect(() => {
    if (leads.length > 0) {
      checkAndNotifyReminders(leads, currentUser);
    }
  }, [leads, currentUser]);

  // Global Ctrl+K / Cmd+K shortcut to toggle Quick Search Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Chat Handlers
  const handleSendMessage = (channelId: string, content: string, attachments?: any[]) => {
    const formattedTime = new Date().toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');

    const nowIso = new Date().toISOString();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      channelId,
      senderId: currentUser.id,
      senderName: currentUser.pseudo?.trim() || `${currentUser.prenom} ${currentUser.nom}`.trim(),
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatarUrl,
      content,
      timestamp: formattedTime,
      createdAtIso: nowIso,
      attachments
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    saveChatMessages(updatedMessages);
    knownMessageIdsRef.current.add(newMsg.id);
    markChannelAsRead(channelId);
    syncChatMessageToFirestore(newMsg);

    // Update last message in channel and sync channel to Firestore
    const updatedChannels = channels.map((chan) => {
      if (chan.id === channelId) {
        const updatedChan: ChatChannel = {
          ...chan,
          lastMessage: content || (attachments && attachments.length > 0 ? 'Fichier joint' : 'Message'),
          lastMessageTime: formattedTime,
          updatedAtIso: nowIso
        };
        syncChatChannelToFirestore(updatedChan);
        return updatedChan;
      }
      return chan;
    });

    setChannels(updatedChannels);
    saveChatChannels(updatedChannels);
  };

  const handleCreateDirectChannel = (otherUser: User): string => {
    // Check if direct channel already exists
    const existing = channels.find(
      (c) =>
        c.type === 'DIRECT' &&
        c.participantIds.includes(currentUser.id) &&
        c.participantIds.includes(otherUser.id)
    );

    if (existing) {
      setSelectedChatChannelId(existing.id);
      markChannelAsRead(existing.id);
      return existing.id;
    }

    const myPseudo = currentUser.pseudo?.trim() || currentUser.prenom;
    const theirPseudo = otherUser.pseudo?.trim() || otherUser.prenom;

    // Use deterministic sorted participant IDs
    const sortedIds = [currentUser.id, otherUser.id].sort();
    const channelId = `direct-${sortedIds[0]}-${sortedIds[1]}`;

    const existingById = channels.find((c) => c.id === channelId);
    if (existingById) {
      setSelectedChatChannelId(existingById.id);
      markChannelAsRead(existingById.id);
      return existingById.id;
    }

    const nowIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newChan: ChatChannel = {
      id: channelId,
      type: 'DIRECT',
      name: `Échange ${myPseudo} & ${theirPseudo}`,
      participantIds: [currentUser.id, otherUser.id],
      lastMessage: 'Nouvelle discussion démarrée',
      lastMessageTime: formattedTime,
      updatedAtIso: nowIso
    };

    const updatedChannels = [newChan, ...channels.filter(c => c.id !== newChan.id)];
    setChannels(updatedChannels);
    saveChatChannels(updatedChannels);
    syncChatChannelToFirestore(newChan);
    setSelectedChatChannelId(newChan.id);
    markChannelAsRead(newChan.id);
    return newChan.id;
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const updatedMessages = messages.map((msg) => {
      if (msg.id === messageId) {
        const reactions = { ...(msg.reactions || {}) };
        const currentUsersForEmoji = reactions[emoji] || [];

        if (currentUsersForEmoji.includes(currentUser.id)) {
          reactions[emoji] = currentUsersForEmoji.filter((id) => id !== currentUser.id);
        } else {
          reactions[emoji] = [...currentUsersForEmoji, currentUser.id];
        }

        const updated = { ...msg, reactions };
        syncChatMessageToFirestore(updated);
        return updated;
      }
      return msg;
    });

    setMessages(updatedMessages);
    saveChatMessages(updatedMessages);
  };

  // User Management Persistence Handlers
  const handleSaveUser = (userToSave: User) => {
    const exists = users.some((u) => u.id === userToSave.id);
    let updatedUsers: User[];
    if (exists) {
      updatedUsers = users.map((u) => (u.id === userToSave.id ? userToSave : u));
    } else {
      updatedUsers = [userToSave, ...users];
    }
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    syncUserToFirestore(userToSave);

    // If active user was updated, keep currentUser in sync
    if (currentUser.id === userToSave.id) {
      setCurrentUser(userToSave);
      saveCurrentUser(userToSave);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    saveCurrentUser(user);
  };

  // Save Leads helper
  const updateLeadsList = (updated: Lead[]) => {
    const uniqueMap = new Map<string, Lead>();
    updated.forEach((l) => {
      if (l && l.id) uniqueMap.set(l.id, l);
    });
    const unique = Array.from(uniqueMap.values());
    setLeads(unique);
    saveLeads(unique);
  };

  // Handlers
  const handleSaveLead = (newOrUpdatedLead: Lead) => {
    const exists = leads.some((l) => l.id === newOrUpdatedLead.id);
    let updatedList: Lead[];

    if (exists) {
      updatedList = leads.map((l) => (l.id === newOrUpdatedLead.id ? newOrUpdatedLead : l));
    } else {
      updatedList = [newOrUpdatedLead, ...leads];
    }

    updateLeadsList(updatedList);
    syncLeadToFirestore(newOrUpdatedLead);

    // If currently inspecting this lead, update it
    if (selectedLeadDetails && selectedLeadDetails.id === newOrUpdatedLead.id) {
      setSelectedLeadDetails(newOrUpdatedLead);
    }
  };

  const handleDeleteLead = (leadId: string) => {
    // Check permission strictly
    if (!canUserDeleteLead(currentUser)) {
      console.warn(`Tentative de suppression de lead refusée : l'utilisateur ${currentUser.pseudo || currentUser.prenom} n'a pas le droit canDeleteLeads.`);
      return;
    }

    const updatedList = leads.filter((l) => l.id !== leadId);
    updateLeadsList(updatedList);
    deleteLeadFromFirestore(leadId);
    if (selectedLeadDetails?.id === leadId) {
      setSelectedLeadDetails(null);
    }
  };

  const handleUpdateStatus = (leadId: string, status: LeadStatus) => {
    const updatedList = leads.map((l) =>
      l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l
    );
    updateLeadsList(updatedList);

    const targetLead = updatedList.find((l) => l.id === leadId);
    if (targetLead) {
      syncLeadToFirestore(targetLead);
    }

    if (selectedLeadDetails?.id === leadId) {
      setSelectedLeadDetails((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const handleImportSuccess = (importedLeads: Lead[]) => {
    const existingIds = new Set(leads.map((l) => l.id));
    const processedImported = importedLeads.map((lead, idx) => {
      if (!lead.id || existingIds.has(lead.id)) {
        return {
          ...lead,
          id: `lead-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`
        };
      }
      return lead;
    });
    const merged = [...processedImported, ...leads];
    updateLeadsList(merged);
    processedImported.forEach((lead) => {
      syncLeadToFirestore(lead);
    });
    setCurrentTab('leads');
  };

  const handleNavigateToLeads = (filter?: LeadType | 'ALL') => {
    if (filter) setProductFilter(filter);
    setCurrentTab('leads');
  };

  const handleOpenNewLeadModal = () => {
    if (!currentUser.permissions.canCreateLeads) {
      alert("Action non autorisée : Vous n'avez pas les droits nécessaires pour créer un lead.");
      return;
    }
    setEditingLead(null);
    setIsLeadModalOpen(true);
  };

  const handleOpenEditLeadModal = (lead: Lead) => {
    setEditingLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleCompleteReminder = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;
    const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
    const updatedLead = completeProchaineAction(target, author);
    const updatedList = leads.map((l) => (l.id === leadId ? updatedLead : l));
    updateLeadsList(updatedList);
    if (selectedLeadDetails?.id === leadId) {
      setSelectedLeadDetails(updatedLead);
    }
  };

  const handleCancelReminder = (leadId: string, motif?: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;
    const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
    const updatedLead = cancelProchaineAction(target, author, motif);
    const updatedList = leads.map((l) => (l.id === leadId ? updatedLead : l));
    updateLeadsList(updatedList);
    if (selectedLeadDetails?.id === leadId) {
      setSelectedLeadDetails(updatedLead);
    }
  };

  const pendingActionsCount = getAccessibleReminders(leads, currentUser).length;

  if (!isAuthenticated) {
    return (
      <LoginView
        users={users}
        cabinetInfo={cabinetInfo}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewLeadModal={handleOpenNewLeadModal}
        onOpenImportModal={() => {
          if (currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTEUR_PRODUCTION') {
            setIsImportModalOpen(true);
          }
        }}
        cabinetInfo={cabinetInfo}
        pendingActionsCount={pendingActionsCount}
        unreadChatCount={totalUnreadChatCount}
        leads={leads}
        onSelectLead={(lead) => setSelectedLeadDetails(lead)}
        onCompleteReminder={handleCompleteReminder}
        onCancelReminder={handleCancelReminder}
        users={users}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSaveUser={handleSaveUser}
        firebaseUser={firebaseUser}
        isCloudConnected={isCloudConnected}
        syncStatus={syncStatus}
        onConnectGoogle={connectGoogle}
        onDisconnectGoogle={disconnectGoogle}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        trackerSlot={
          <AgentWorkTracker
            currentUser={currentUser}
            activeSession={activeSession}
            onUpdateSession={handleUpdateActiveSession}
            onAutoLogout={handleAutoLogout}
            onManualLogout={handleLogout}
          />
        }
      />

      {/* Main View Area */}
      <main className={`flex-1 w-full py-6 ${currentTab === 'activity-tracking' ? 'px-2 sm:px-4' : 'px-4 sm:px-6 lg:px-8'}`}>
        {currentTab === 'dashboard' && (
          <Dashboard
            leads={leads}
            currentUser={currentUser}
            users={users}
            onOpenNewLeadModal={handleOpenNewLeadModal}
            onSelectLead={(lead) => setSelectedLeadDetails(lead)}
            onNavigateToLeads={handleNavigateToLeads}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
            onCompleteReminder={handleCompleteReminder}
            onCancelReminder={handleCancelReminder}
            onUpdateLead={handleSaveLead}
          />
        )}

        {currentTab === 'leads' && (
          <LeadsList
            leads={leads}
            onOpenNewLeadModal={handleOpenNewLeadModal}
            onOpenImportModal={() => {
              if (currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTEUR_PRODUCTION') {
                setIsImportModalOpen(true);
              }
            }}
            onSelectLead={(lead) => setSelectedLeadDetails(lead)}
            onUpdateStatus={handleUpdateStatus}
            onUpdateLead={handleSaveLead}
            initialProductFilter={productFilter}
            currentUser={currentUser}
            cabinetInfo={cabinetInfo}
            users={users}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarRemindersView
            leads={leads}
            currentUser={currentUser}
            users={users}
            cabinetInfo={cabinetInfo}
            onSelectLead={(lead) => setSelectedLeadDetails(lead)}
            onUpdateLead={handleSaveLead}
            onCompleteReminder={handleCompleteReminder}
            onCancelReminder={handleCancelReminder}
            onOpenNewLeadModal={handleOpenNewLeadModal}
          />
        )}

        {currentTab === 'chat' && (
          <ChatView
            currentUser={currentUser}
            users={users}
            channels={channels}
            messages={messages}
            onSendMessage={handleSendMessage}
            onCreateDirectChannel={handleCreateDirectChannel}
            onToggleReaction={handleToggleReaction}
            selectedChannelId={selectedChatChannelId}
            onSelectChannel={(chanId) => {
              setSelectedChatChannelId(chanId);
              if (chanId) markChannelAsRead(chanId);
            }}
            onMarkAllAsRead={markAllChannelsAsRead}
            unreadCountByChannel={unreadCountByChannel}
          />
        )}

        {currentTab === 'activity-tracking' && (
          <AgentWorkDashboard
            currentUser={currentUser}
            users={users}
            sessions={agentSessions}
          />
        )}

        {(currentTab === 'settings' || currentTab === 'users') && (
          currentUser.role === 'ADMIN' ? (
            <SettingsPage
              cabinetInfo={cabinetInfo}
              onSaveCabinetInfo={(info) => {
                setCabinetInfo(info);
                saveCabinetInfo(info);
                syncCabinetInfoToFirestore(info);
              }}
              smtpConfig={smtpConfig}
              onSaveSmtpConfig={(cfg) => {
                setSmtpConfig(cfg);
                saveSmtpConfig(cfg);
                syncSmtpConfigToFirestore(cfg);
              }}
              emailTemplates={emailTemplates}
              onSaveEmailTemplates={(tmpls) => {
                setEmailTemplates(tmpls);
                saveEmailTemplates(tmpls);
                syncEmailTemplatesToFirestore(tmpls);
              }}
              partners={partners}
              onSavePartners={(newP) => {
                setPartners(newP);
                saveInsurancePartners(newP);
                syncPartnersToFirestore(newP);
              }}
              users={users}
              currentUser={currentUser}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onSwitchUser={handleSwitchUser}
              teams={teams}
              onSaveTeams={handleSaveTeams}
              firebaseUser={firebaseUser}
              isCloudConnected={isCloudConnected}
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              syncError={syncError}
              onConnectGoogle={connectGoogle}
              onDisconnectGoogle={disconnectGoogle}
              onForcePushAll={() => forcePushAll(leads, users)}
              totalLeadsCount={leads.length}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Accès Réservé aux Administrateurs</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vous n'avez pas les privilèges nécessaires pour accéder à la configuration du cabinet et à la gestion des utilisateurs. Seuls les Administrateurs ont cet accès.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Retour au Tableau de bord
              </button>
            </div>
          )
        )}
      </main>

      {/* Modals & Drawers */}
      <LeadModal
        key={editingLead ? editingLead.id : `new-lead-${isLeadModalOpen}`}
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSaveLead={handleSaveLead}
        existingLead={editingLead}
        cabinetInfo={cabinetInfo}
        users={users}
        currentUser={currentUser}
        allLeads={leads}
        onSelectExistingLead={(dupLead) => {
          setIsLeadModalOpen(false);
          setSelectedLeadDetails(dupLead);
        }}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen && (currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTEUR_PRODUCTION')}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <LeadDetailsView
        key={selectedLeadDetails ? selectedLeadDetails.id : 'lead-details-closed'}
        lead={selectedLeadDetails}
        onClose={() => setSelectedLeadDetails(null)}
        onEditLead={(lead) => {
          setSelectedLeadDetails(null);
          handleOpenEditLeadModal(lead);
        }}
        onDeleteLead={handleDeleteLead}
        onUpdateStatus={handleUpdateStatus}
        emailTemplates={emailTemplates}
        cabinetInfo={cabinetInfo}
        smtpConfig={smtpConfig}
        onUpdateLead={handleSaveLead}
        users={users}
        currentUser={currentUser}
        partners={partners}
        onSaveEmailTemplates={(tmpls) => {
          setEmailTemplates(tmpls);
          saveEmailTemplates(tmpls);
        }}
      />

      {/* Global Quick Search (Ctrl+K) Command Palette */}
      <QuickSearchCommandPalette
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        leads={leads}
        onSelectLead={(lead) => setSelectedLeadDetails(lead)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />
    </div>
  );
}
