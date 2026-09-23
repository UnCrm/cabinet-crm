import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  doc,
  writeBatch
} from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  logoutFirebase,
  testConnection,
  handleFirestoreError,
  OperationType,
  isFirestoreQuotaExhausted,
  syncCabinetInfoToFirestore
} from '../firebase';
import {
  Lead,
  User as CrmUser,
  ChatMessage,
  ChatChannel,
  AgentWorkSession,
  CabinetInfo,
  SmtpConfig,
  EmailTemplate,
  InsurancePartnerApiConfig
} from '../types/crm';
import {
  saveLeads,
  saveUsers,
  saveChatMessages,
  saveChatChannels,
  saveAgentSessions,
  saveCabinetInfo,
  saveSmtpConfig,
  saveEmailTemplates,
  saveInsurancePartners,
  saveTeams,
  isSimulationLead,
  isSimulationUser,
  isSimulationMessage,
  isSimulationChannel,
  SIMULATION_USER_IDS
} from '../utils/storage';

interface UseFirebaseSyncProps {
  initialLeads: Lead[];
  initialUsers: CrmUser[];
  initialChannels?: ChatChannel[];
  currentCabinetInfo?: CabinetInfo;
  onLeadsRemoteUpdate: (leads: Lead[]) => void;
  onUsersRemoteUpdate: (users: CrmUser[]) => void;
  onMessagesRemoteUpdate: (messages: ChatMessage[]) => void;
  onChannelsRemoteUpdate?: (channels: ChatChannel[]) => void;
  onSessionsRemoteUpdate?: (sessions: AgentWorkSession[]) => void;
  onCabinetInfoRemoteUpdate?: (info: CabinetInfo) => void;
  onSmtpRemoteUpdate?: (smtp: SmtpConfig) => void;
  onTemplatesRemoteUpdate?: (templates: EmailTemplate[]) => void;
  onPartnersRemoteUpdate?: (partners: InsurancePartnerApiConfig[]) => void;
  onTeamsRemoteUpdate?: (teams: string[]) => void;
}

export function useFirebaseSync({
  initialLeads,
  initialUsers,
  initialChannels = [],
  currentCabinetInfo,
  onLeadsRemoteUpdate,
  onUsersRemoteUpdate,
  onMessagesRemoteUpdate,
  onChannelsRemoteUpdate,
  onSessionsRemoteUpdate,
  onCabinetInfoRemoteUpdate,
  onSmtpRemoteUpdate,
  onTemplatesRemoteUpdate,
  onPartnersRemoteUpdate,
  onTeamsRemoteUpdate
}: UseFirebaseSyncProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const currentCabinetRef = useRef<CabinetInfo | undefined>(currentCabinetInfo);
  useEffect(() => {
    currentCabinetRef.current = currentCabinetInfo;
  }, [currentCabinetInfo]);

  // Test connection and listen to Auth on mount
  useEffect(() => {
    testConnection().then((connected) => {
      setIsCloudConnected(connected);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore real-time collections automatically from startup
  useEffect(() => {
    setSyncStatus('syncing');
    setIsCloudConnected(true);

    // 1. Leads Listener
    const leadsCollection = collection(db, 'leads');
    const unsubLeads = onSnapshot(
      leadsCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteLeads: Lead[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Lead;
            if (!isSimulationLead(data)) {
              remoteLeads.push(data);
            }
          });
          // Sort by createdAt descending
          remoteLeads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onLeadsRemoteUpdate(remoteLeads);
          saveLeads(remoteLeads);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        } else {
          onLeadsRemoteUpdate([]);
          saveLeads([]);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'leads');
        setSyncStatus('error');
        setSyncError(error.message);
      }
    );

    // 2. Users Listener
    const usersCollection = collection(db, 'users');
    const unsubUsers = onSnapshot(
      usersCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers: CrmUser[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CrmUser;
            if (!isSimulationUser(data)) {
              remoteUsers.push(data);
            }
          });

          // Ensure initialUsers (like admin Tarik Cherkaoui) are preserved in local state
          const map = new Map<string, CrmUser>();
          remoteUsers.forEach((u) => {
            if (u && u.email) map.set(u.email.toLowerCase().trim(), u);
          });

          initialUsers.forEach((initUser) => {
            if (initUser && initUser.email && !map.has(initUser.email.toLowerCase().trim())) {
              map.set(initUser.email.toLowerCase().trim(), initUser);
            }
          });

          const mergedUsers = Array.from(map.values()).filter((u) => !isSimulationUser(u));
          onUsersRemoteUpdate(mergedUsers);
          saveUsers(mergedUsers);
        } else {
          onUsersRemoteUpdate(initialUsers);
          saveUsers(initialUsers);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    // 3. Chat Messages Listener
    const parseMsgTime = (msg: ChatMessage): number => {
      if (msg.createdAtIso) {
        const t = new Date(msg.createdAtIso).getTime();
        if (!isNaN(t)) return t;
      }
      if (msg.timestamp) {
        const t = new Date(msg.timestamp).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    const chatCollection = collection(db, 'chat_messages');
    const unsubChat = onSnapshot(
      chatCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteMessages: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as ChatMessage;
            if (!isSimulationMessage(data)) {
              remoteMessages.push(data);
            }
          });
          remoteMessages.sort((a, b) => parseMsgTime(a) - parseMsgTime(b));
          onMessagesRemoteUpdate(remoteMessages);
          saveChatMessages(remoteMessages);
        } else {
          onMessagesRemoteUpdate([]);
          saveChatMessages([]);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chat_messages');
      }
    );

    // 3b. Chat Channels Listener (Salons & Conversations Directes)
    const channelsCollection = collection(db, 'chat_channels');
    const unsubChannels = onSnapshot(
      channelsCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteChannels: ChatChannel[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as ChatChannel;
            if (!isSimulationChannel(data)) {
              remoteChannels.push(data);
            }
          });
          if (remoteChannels.length > 0) {
            onChannelsRemoteUpdate?.(remoteChannels);
            saveChatChannels(remoteChannels);
          } else if (initialChannels.length > 0) {
            onChannelsRemoteUpdate?.(initialChannels);
            saveChatChannels(initialChannels);
          }
        } else if (initialChannels.length > 0) {
          onChannelsRemoteUpdate?.(initialChannels);
          saveChatChannels(initialChannels);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chat_channels');
      }
    );

    // 4. Agent Sessions Listener (Suivi Présence, Pauses & Heures)
    const sessionsCollection = collection(db, 'agent_sessions');
    const unsubSessions = onSnapshot(
      sessionsCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteSessions: AgentWorkSession[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AgentWorkSession;
            if (!SIMULATION_USER_IDS.includes(data.userId)) {
              remoteSessions.push(data);
            }
          });
          remoteSessions.sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
          onSessionsRemoteUpdate?.(remoteSessions);
          saveAgentSessions(remoteSessions);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'agent_sessions');
      }
    );

    // 5. Cabinet Info Listener (Nom du cabinet, Logo, Coordonnées, Statuts & Mentions)
    const cabinetDocRef = doc(db, 'cabinet_config', 'main');
    const unsubCabinet = onSnapshot(
      cabinetDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteCabinet = docSnap.data() as CabinetInfo;
          const localInfo = currentCabinetRef.current;
          const remoteUpdatedAt = remoteCabinet.updatedAt ? new Date(remoteCabinet.updatedAt).getTime() : 0;
          const localUpdatedAt = localInfo?.updatedAt ? new Date(localInfo.updatedAt).getTime() : 0;

          const isRemoteCustomized = Boolean(
            remoteCabinet.nomCabinet &&
            remoteCabinet.nomCabinet !== 'Assurances Horizon Courtage' &&
            remoteCabinet.nomCabinet.trim() !== ''
          );

          if (isRemoteCustomized || remoteUpdatedAt >= localUpdatedAt) {
            // Remote has customized info or is newer: update local state & cache
            onCabinetInfoRemoteUpdate?.(remoteCabinet);
            saveCabinetInfo(remoteCabinet);
          } else if (localInfo) {
            // Keep local custom information without triggering recursive Firestore writes
            onCabinetInfoRemoteUpdate?.(localInfo);
          } else {
            onCabinetInfoRemoteUpdate?.(remoteCabinet);
            saveCabinetInfo(remoteCabinet);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'cabinet_config/main');
      }
    );

    // 6. SMTP Config Listener
    const smtpDocRef = doc(db, 'cabinet_config', 'smtp');
    const unsubSmtp = onSnapshot(
      smtpDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteSmtp = docSnap.data() as SmtpConfig;
          onSmtpRemoteUpdate?.(remoteSmtp);
          saveSmtpConfig(remoteSmtp);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'cabinet_config/smtp');
      }
    );

    // 7. Email Templates Listener
    const templatesDocRef = doc(db, 'cabinet_config', 'email_templates');
    const unsubTemplates = onSnapshot(
      templatesDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const list = docSnap.data()?.templates as EmailTemplate[];
          if (Array.isArray(list) && list.length > 0) {
            onTemplatesRemoteUpdate?.(list);
            saveEmailTemplates(list);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'cabinet_config/email_templates');
      }
    );

    // 8. Insurance Partners Listener
    const partnersDocRef = doc(db, 'cabinet_config', 'partners');
    const unsubPartners = onSnapshot(
      partnersDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const list = docSnap.data()?.partners as InsurancePartnerApiConfig[];
          if (Array.isArray(list) && list.length > 0) {
            onPartnersRemoteUpdate?.(list);
            saveInsurancePartners(list);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'cabinet_config/partners');
      }
    );

    // 9. Teams Listener
    const teamsDocRef = doc(db, 'cabinet_config', 'teams');
    const unsubTeams = onSnapshot(
      teamsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const list = docSnap.data()?.teams as string[];
          if (Array.isArray(list) && list.length > 0) {
            onTeamsRemoteUpdate?.(list);
            saveTeams(list);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'cabinet_config/teams');
      }
    );

    return () => {
      unsubLeads();
      unsubUsers();
      unsubChat();
      unsubChannels();
      unsubSessions();
      unsubCabinet();
      unsubSmtp();
      unsubTemplates();
      unsubPartners();
      unsubTeams();
    };
  }, []);

  // Connect via Google Auth
  const handleConnectGoogle = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      setSyncError(null);
      await signInWithGoogle();
      setSyncStatus('synced');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Erreur de connexion');
    }
  }, []);

  // Disconnect
  const handleDisconnectGoogle = useCallback(async () => {
    await logoutFirebase();
    setFirebaseUser(null);
    setSyncStatus('idle');
  }, []);

  // Force Full Sync
  const handleForcePushAll = useCallback(async (currentLeads: Lead[], currentUsers: CrmUser[]) => {
    if (isFirestoreQuotaExhausted()) {
      setSyncStatus('error');
      setSyncError("Le quota gratuit d'écriture Firestore est temporairement dépassé pour aujourd'hui. Vos données restent 100% enregistrées en toute sécurité sur votre machine.");
      return;
    }
    if (!firebaseUser) {
      await handleConnectGoogle();
    }
    setSyncStatus('syncing');
    try {
      const batch = writeBatch(db);
      currentLeads.forEach((lead) => {
        const sanitized = JSON.parse(JSON.stringify(lead));
        batch.set(doc(db, 'leads', lead.id), sanitized, { merge: true });
      });
      currentUsers.forEach((u) => {
        const sanitized = JSON.parse(JSON.stringify(u));
        batch.set(doc(db, 'users', u.id), sanitized, { merge: true });
      });
      await batch.commit();

      if (currentCabinetRef.current) {
        await syncCabinetInfoToFirestore(currentCabinetRef.current);
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Erreur lors de la synchronisation');
      handleFirestoreError(err, OperationType.WRITE, 'leads_batch');
    }
  }, [firebaseUser, handleConnectGoogle]);

  return {
    firebaseUser,
    isCloudConnected,
    syncStatus,
    lastSyncTime,
    syncError,
    connectGoogle: handleConnectGoogle,
    disconnectGoogle: handleDisconnectGoogle,
    forcePushAll: handleForcePushAll
  };
}
