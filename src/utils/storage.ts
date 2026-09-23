import { Lead, SmtpConfig, EmailTemplate, CabinetInfo, User, ChatChannel, ChatMessage, InsurancePartnerApiConfig, AgentWorkSession } from '../types/crm';
import { initialLeads, initialSmtpConfig, initialEmailTemplates, initialCabinetInfo, initialUsers } from '../data/mockData';
import { initialChatChannels, initialChatMessages } from '../data/mockChatData';
import { initialInsurancePartners } from '../data/mockPartnersData';

const LEADS_KEY = 'crm_insurance_leads_v1';
const SMTP_KEY = 'crm_insurance_smtp_v1';
const TEMPLATES_KEY = 'crm_insurance_templates_v1';
const CABINET_KEY = 'crm_insurance_cabinet_v1';
const USERS_KEY = 'crm_insurance_users_v1';
const CURRENT_USER_KEY = 'crm_insurance_current_user_v1';
const CHANNELS_KEY = 'crm_insurance_chat_channels_v1';
const MESSAGES_KEY = 'crm_insurance_chat_messages_v1';
const PARTNERS_KEY = 'crm_insurance_partners_v1';
const TEAMS_KEY = 'crm_insurance_teams_v1';
const SESSIONS_KEY = 'crm_insurance_agent_sessions_v1';
const ACTIVE_SESSION_KEY = 'crm_insurance_active_session_v1';
const REMEMBERED_CREDENTIALS_KEY = 'crm_insurance_remembered_credentials_v1';

export interface RememberedCredentials {
  email: string;
  rememberEmail: boolean;
}

export const loadRememberedCredentials = (): RememberedCredentials | null => {
  try {
    const raw = localStorage.getItem(REMEMBERED_CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Security: never return password even if stored in an older version
    return {
      email: typeof parsed.email === 'string' ? parsed.email : '',
      rememberEmail: Boolean(parsed.rememberEmail ?? parsed.rememberMe)
    };
  } catch (err) {
    console.error('Error loading remembered credentials', err);
    return null;
  }
};

export const saveRememberedCredentials = (creds: { email: string; rememberEmail?: boolean; rememberMe?: boolean } | null): void => {
  try {
    const shouldRemember = creds ? Boolean(creds.rememberEmail ?? creds.rememberMe) : false;
    if (!creds || !shouldRemember || !creds.email) {
      localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY);
    } else {
      // Strictly store ONLY the email address for security. No passwords!
      localStorage.setItem(
        REMEMBERED_CREDENTIALS_KEY,
        JSON.stringify({
          email: creds.email.trim(),
          rememberEmail: true
        })
      );
    }
  } catch (err) {
    console.error('Error saving remembered credentials', err);
  }
};

export const initialTeams: string[] = [
  'Direction Générale',
  'Direction Production',
  'Équipe Auto & Habitation',
  'Équipe VTC & Pro',
  'Équipe Santé & Prévoyance',
  'Équipe Risques Spéciaux',
  'Équipe Entreprises & Flottes'
];

export const loadTeams = (): string[] => {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (!raw) {
      saveTeams(initialTeams);
      return initialTeams;
    }
    const teams = JSON.parse(raw);
    return Array.isArray(teams) && teams.length > 0 ? teams : initialTeams;
  } catch (err) {
    console.error('Error loading teams', err);
    return initialTeams;
  }
};

export const saveTeams = (teams: string[]): void => {
  try {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  } catch (err) {
    console.error('Error saving teams', err);
  }
};


export const SIMULATION_USER_IDS = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'];

export const isSimulationUser = (u: any): boolean => {
  if (!u) return true;
  if (typeof u.id === 'string' && SIMULATION_USER_IDS.includes(u.id)) return true;
  if (typeof u.email === 'string' && u.email.toLowerCase().includes('@horizon-courtage.fr')) return true;
  return false;
};

export const isSimulationLead = (l: any): boolean => {
  if (!l) return true;
  if (typeof l.id === 'string' && (l.id.startsWith('lead-00') || ['lead-001', 'lead-002', 'lead-003', 'lead-004', 'lead-005'].includes(l.id))) return true;
  if (l.assignedBroker === 'Pierre-Antoine Dupuis') return true;
  if (l.email === 'samy.benali@gmail.com' || l.email === 'david.leroy@outlook.fr' || l.email === 'contact@elite-vtc-paris.fr') return true;
  return false;
};

export const isSimulationMessage = (m: any): boolean => {
  if (!m) return true;
  if (typeof m.id === 'string' && m.id.startsWith('msg-') && parseInt(m.id.replace('msg-', ''), 10) <= 25) return true;
  if (typeof m.senderId === 'string' && SIMULATION_USER_IDS.includes(m.senderId)) return true;
  if (['Sophie M.', 'Marc D.', 'Pierre Dupuis', 'JM Durand', 'Thomas B.', 'Julie M.'].includes(m.senderName)) return true;
  return false;
};

export const isSimulationChannel = (c: any): boolean => {
  if (!c) return true;
  if (['channel-group-auto-habitation', 'channel-group-vtc-pro', 'direct-user-3-user-4', 'direct-user-1-user-3', 'direct-user-1-user-4'].includes(c.id)) return true;
  if (Array.isArray(c.participantIds) && c.participantIds.some((p: string) => SIMULATION_USER_IDS.includes(p)) && !c.participantIds.includes('user-admin-tarik')) {
    return true;
  }
  return false;
};

export const loadUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      saveUsers(initialUsers);
      return initialUsers;
    }
    const parsed: User[] = JSON.parse(raw);
    let modified = false;

    // Filter out all simulation accounts
    const realUsers = parsed.filter((u) => !isSimulationUser(u));
    if (realUsers.length !== parsed.length) {
      modified = true;
    }

    const hydrated = realUsers.map((u) => {
      const matchInitial = initialUsers.find((init) => init.id === u.id);
      let userUpdated = false;
      const userClone = { ...u };

      if (!userClone.pseudo || !userClone.pseudo.trim()) {
        userClone.pseudo = matchInitial?.pseudo || `${userClone.prenom} ${userClone.nom ? userClone.nom.charAt(0) + '.' : ''}`.trim();
        userUpdated = true;
      }

      if (!userClone.smtpConfig && matchInitial?.smtpConfig) {
        userClone.smtpConfig = matchInitial.smtpConfig;
        userUpdated = true;
      } else if (!userClone.smtpConfig) {
        userClone.smtpConfig = {
          host: '',
          port: 587,
          username: userClone.email || '',
          password: '',
          encryption: 'TLS',
          senderEmail: userClone.email || '',
          senderName: userClone.pseudo || `${userClone.prenom} ${userClone.nom}`.trim(),
          active: false
        };
        userUpdated = true;
      }

      // Sanitize phantom dedicated SMTP configurations:
      // If a user has host 'smtp.gmail.com' with empty password or no password at all,
      // deactivate it so it doesn't hijack email sending instead of the configured Cabinet SMTP.
      if (userClone.smtpConfig) {
        if (!userClone.smtpConfig.password?.trim() || (userClone.smtpConfig.host === 'smtp.gmail.com' && !userClone.smtpConfig.password?.trim())) {
          if (userClone.smtpConfig.active || userClone.smtpConfig.host === 'smtp.gmail.com') {
            userClone.smtpConfig.active = false;
            userClone.smtpConfig.host = '';
            userUpdated = true;
          }
        }
        if (userClone.id === 'user-admin-tarik' && (!userClone.smtpConfig.password?.trim() || userClone.smtpConfig.host === 'smtp.gmail.com')) {
          userClone.smtpConfig.active = false;
          userClone.smtpConfig.host = '';
          userUpdated = true;
        }
      }

      if (userUpdated) modified = true;
      return userClone;
    });

    // Ensure essential admin Tarik Cherkaoui is present
    initialUsers.forEach((initUser) => {
      const alreadyHas = hydrated.some((u) => u.email?.toLowerCase() === initUser.email?.toLowerCase() || u.id === initUser.id);
      if (!alreadyHas) {
        hydrated.unshift(initUser);
        modified = true;
      }
    });

    if (modified) {
      saveUsers(hydrated);
    }
    return hydrated;
  } catch (err) {
    console.error('Error loading users', err);
    return initialUsers;
  }
};

export const saveUsers = (users: User[]): void => {
  try {
    // Never persist simulation users
    const sanitized = users.filter((u) => !isSimulationUser(u));
    localStorage.setItem(USERS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Error saving users', err);
  }
};

export const loadCurrentUser = (): User => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    const users = loadUsers();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!isSimulationUser(parsed)) {
        const matched = users.find((u) => u.id === parsed.id);
        if (matched) return matched;
      }
    }
    const defaultAdmin = users.find((u) => u.role === 'ADMIN') || users[0] || initialUsers[0];
    saveCurrentUser(defaultAdmin);
    return defaultAdmin;
  } catch (err) {
    return initialUsers[0];
  }
};

export const saveCurrentUser = (user: User): void => {
  try {
    if (isSimulationUser(user)) {
      const fallback = initialUsers[0];
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(fallback));
      return;
    }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Error saving current user', err);
  }
};

export const loadLeads = (): Lead[] => {
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    let loaded: Lead[];
    if (!raw) {
      return [];
    } else {
      loaded = JSON.parse(raw);
    }
    let modified = false;
    const uniqueMap = new Map<string, Lead>();
    loaded.forEach((l) => {
      if (l && l.id && !isSimulationLead(l)) {
        // Normaliser les leads mensuels avec des montants annuels résiduels
        if (l.autoDetails && l.autoDetails.fractionnement === 'Mensuel' && l.autoDetails.cotisationMontant > 300) {
          l.autoDetails.cotisationMontant = Math.round((l.autoDetails.cotisationMontant / 12) * 100) / 100;
          modified = true;
        }
        if (l.habitationDetails && l.habitationDetails.fractionnement === 'Mensuel' && l.habitationDetails.cotisationMontant > 300) {
          l.habitationDetails.cotisationMontant = Math.round((l.habitationDetails.cotisationMontant / 12) * 100) / 100;
          modified = true;
        }
        if (l.vtcDetails && l.vtcDetails.fractionnement === 'Mensuel' && l.vtcDetails.cotisationMontant > 300) {
          l.vtcDetails.cotisationMontant = Math.round((l.vtcDetails.cotisationMontant / 12) * 100) / 100;
          modified = true;
        }
        uniqueMap.set(l.id, l);
      } else if (isSimulationLead(l)) {
        modified = true;
      }
    });
    const uniqueLeads = Array.from(uniqueMap.values());
    if (uniqueLeads.length !== loaded.length || modified) {
      saveLeads(uniqueLeads);
    }
    return uniqueLeads;
  } catch (err) {
    console.error('Error loading leads from storage', err);
    return [];
  }
};

export const saveLeads = (leads: Lead[]): void => {
  try {
    const uniqueMap = new Map<string, Lead>();
    leads.forEach((l) => {
      if (l && l.id && !isSimulationLead(l)) {
        uniqueMap.set(l.id, l);
      }
    });
    const uniqueLeads = Array.from(uniqueMap.values());
    localStorage.setItem(LEADS_KEY, JSON.stringify(uniqueLeads));
  } catch (err) {
    console.error('Error saving leads to storage', err);
  }
};

export const loadSmtpConfig = (): SmtpConfig => {
  try {
    const raw = localStorage.getItem(SMTP_KEY);
    if (!raw) {
      saveSmtpConfig(initialSmtpConfig);
      return initialSmtpConfig;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.host === 'mail.partenaireassurances.fr') {
      const sanitized = { ...parsed, host: 'ssl0.ovh.net' };
      saveSmtpConfig(sanitized);
      return sanitized;
    }
    if (parsed && parsed.host?.trim() && parsed.username?.trim()) {
      if (parsed.active === undefined) {
        parsed.active = true;
      }
    }
    return parsed;
  } catch (err) {
    return initialSmtpConfig;
  }
};

export const saveSmtpConfig = (config: SmtpConfig): void => {
  try {
    const toSave: SmtpConfig = {
      ...config,
      active: config.host?.trim() && config.username?.trim() ? (config.active ?? true) : Boolean(config.active)
    };
    localStorage.setItem(SMTP_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('Error saving SMTP config', err);
  }
};

export const loadEmailTemplates = (): EmailTemplate[] => {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      saveEmailTemplates(initialEmailTemplates);
      return initialEmailTemplates;
    }
    const parsed: EmailTemplate[] = JSON.parse(raw);
    let changed = false;
    const sanitized = parsed.map(t => {
      let b = t.body;
      if (b.includes('{cotisation} € / an ({cotisationMois} € / mois)')) {
        b = b.replace(/{cotisation} € \/ an \({cotisationMois} € \/ mois\)/g, '{cotisation} € / mois');
        changed = true;
      }
      if (b.includes('Cotisation annuelle : {cotisation} €')) {
        b = b.replace(/Cotisation annuelle : {cotisation} €/g, 'Cotisation : {cotisation} € ({fractionnement})');
        changed = true;
      }
      if (b.includes('Cotisation : {cotisation} € / an')) {
        b = b.replace(/Cotisation : {cotisation} € \/ an/g, 'Cotisation : {cotisation} € / mois');
        changed = true;
      }
      return { ...t, body: b };
    });
    if (changed) {
      saveEmailTemplates(sanitized);
    }
    return sanitized;
  } catch (err) {
    return initialEmailTemplates;
  }
};

export const saveEmailTemplates = (templates: EmailTemplate[]): void => {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving email templates', err);
  }
};

export const loadCabinetInfo = (): CabinetInfo => {
  try {
    const raw = localStorage.getItem(CABINET_KEY);
    if (!raw) {
      saveCabinetInfo(initialCabinetInfo);
      return initialCabinetInfo;
    }
    const parsed: CabinetInfo = JSON.parse(raw);
    if (parsed.nomCabinet === 'Assurances Horizon Courtage' || parsed.nomCourtierPrincipal === 'Pierre-Antoine Dupuis') {
      saveCabinetInfo(initialCabinetInfo);
      return initialCabinetInfo;
    }
    // Ensure telephonyProviders are populated
    if (!parsed.telephonyProviders || parsed.telephonyProviders.length === 0) {
      parsed.telephonyProviders = initialCabinetInfo.telephonyProviders;
      parsed.defaultVoiceProviderId = parsed.defaultVoiceProviderId || initialCabinetInfo.defaultVoiceProviderId;
      parsed.defaultSmsProviderId = parsed.defaultSmsProviderId || initialCabinetInfo.defaultSmsProviderId;
      saveCabinetInfo(parsed);
    }
    return parsed;
  } catch (err) {
    return initialCabinetInfo;
  }
};

export const saveCabinetInfo = (info: CabinetInfo): void => {
  try {
    localStorage.setItem(CABINET_KEY, JSON.stringify(info));
  } catch (err) {
    console.error('Error saving cabinet info', err);
  }
};

export const loadChatChannels = (): ChatChannel[] => {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (!raw) {
      saveChatChannels(initialChatChannels);
      return initialChatChannels;
    }
    const parsed: ChatChannel[] = JSON.parse(raw);
    const sanitized = parsed.filter((c) => !isSimulationChannel(c));
    if (sanitized.length === 0) {
      saveChatChannels(initialChatChannels);
      return initialChatChannels;
    }
    if (sanitized.length !== parsed.length) {
      saveChatChannels(sanitized);
    }
    return sanitized;
  } catch (err) {
    console.error('Error loading chat channels', err);
    return initialChatChannels;
  }
};

export const saveChatChannels = (channels: ChatChannel[]): void => {
  try {
    const sanitized = channels.filter((c) => !isSimulationChannel(c));
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Error saving chat channels', err);
  }
};

export const loadChatMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) {
      saveChatMessages([]);
      return [];
    }
    const parsed: ChatMessage[] = JSON.parse(raw);
    const sanitized = parsed.filter((m) => !isSimulationMessage(m));
    if (sanitized.length !== parsed.length) {
      saveChatMessages(sanitized);
    }
    return sanitized;
  } catch (err) {
    console.error('Error loading chat messages', err);
    return [];
  }
};

export const saveChatMessages = (messages: ChatMessage[]): void => {
  try {
    const sanitized = messages.filter((m) => !isSimulationMessage(m));
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Error saving chat messages', err);
  }
};

export const loadInsurancePartners = (): InsurancePartnerApiConfig[] => {
  try {
    const raw = localStorage.getItem(PARTNERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: InsurancePartnerApiConfig[] = JSON.parse(raw);
    // Filter out any leftover initial mock partners (e.g. partner-allianz, etc)
    const realPartners = parsed.filter(p => !p.id.startsWith('partner-'));
    if (realPartners.length !== parsed.length) {
      saveInsurancePartners(realPartners);
    }
    return realPartners;
  } catch (err) {
    console.error('Error loading insurance partners', err);
    return [];
  }
};

export const saveInsurancePartners = (partners: InsurancePartnerApiConfig[]): void => {
  try {
    localStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
  } catch (err) {
    console.error('Error saving insurance partners', err);
  }
};

export const generateQuoteReference = (productType?: string): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  const prefix = productType ? `DEV-${productType}` : 'DEV';
  return `${prefix}-${year}-${randomNum}`;
};

export const loadAgentSessions = (): AgentWorkSession[] => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: AgentWorkSession[] = JSON.parse(raw);
    const sanitized = parsed.filter((s) => !SIMULATION_USER_IDS.includes(s.userId));
    if (sanitized.length !== parsed.length) {
      saveAgentSessions(sanitized);
    }
    return sanitized;
  } catch (err) {
    console.error('Error loading agent sessions', err);
    return [];
  }
};

export const saveAgentSessions = (sessions: AgentWorkSession[]): void => {
  try {
    const sanitized = sessions.filter((s) => !SIMULATION_USER_IDS.includes(s.userId));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Error saving agent sessions', err);
  }
};

export const loadActiveSession = (): AgentWorkSession | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed: AgentWorkSession = JSON.parse(raw);
    if (SIMULATION_USER_IDS.includes(parsed.userId)) {
      saveActiveSession(null);
      return null;
    }
    return parsed;
  } catch (err) {
    return null;
  }
};

export const saveActiveSession = (session: AgentWorkSession | null): void => {
  try {
    if (!session) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } else {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Error saving active session', err);
  }
};

/**
 * Structure d'une sauvegarde complète du CRM pour sécurisation et export/import
 */
export interface FullCrmBackup {
  version: string;
  timestamp: string;
  leads: Lead[];
  users: User[];
  cabinetInfo: CabinetInfo;
  smtpConfig: SmtpConfig;
  emailTemplates: EmailTemplate[];
  partners: InsurancePartnerApiConfig[];
  teams: string[];
  agentSessions: AgentWorkSession[];
  chatMessages: ChatMessage[];
}

export const createFullCrmBackup = (): FullCrmBackup => {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    leads: loadLeads(),
    users: loadUsers(),
    cabinetInfo: loadCabinetInfo(),
    smtpConfig: loadSmtpConfig(),
    emailTemplates: loadEmailTemplates(),
    partners: loadInsurancePartners(),
    teams: loadTeams(),
    agentSessions: loadAgentSessions(),
    chatMessages: loadChatMessages()
  };
};

export const restoreFullCrmBackup = (backup: FullCrmBackup): boolean => {
  try {
    if (Array.isArray(backup.leads)) saveLeads(backup.leads);
    if (Array.isArray(backup.users) && backup.users.length > 0) saveUsers(backup.users);
    if (backup.cabinetInfo) saveCabinetInfo(backup.cabinetInfo);
    if (backup.smtpConfig) saveSmtpConfig(backup.smtpConfig);
    if (Array.isArray(backup.emailTemplates)) saveEmailTemplates(backup.emailTemplates);
    if (Array.isArray(backup.partners)) saveInsurancePartners(backup.partners);
    if (Array.isArray(backup.teams)) saveTeams(backup.teams);
    if (Array.isArray(backup.agentSessions)) saveAgentSessions(backup.agentSessions);
    if (Array.isArray(backup.chatMessages)) saveChatMessages(backup.chatMessages);
    return true;
  } catch (err) {
    console.error('Erreur lors de la restauration de la sauvegarde CRM:', err);
    return false;
  }
};

export const downloadBackupJsonFile = (): void => {
  try {
    const backup = createFullCrmBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde-crm-insurelead-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Erreur lors du téléchargement de la sauvegarde:', err);
  }
};

