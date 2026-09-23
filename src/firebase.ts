import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Lead, User as CrmUser, ChatMessage, ChatChannel, CabinetInfo, AgentWorkSession, SmtpConfig, EmailTemplate, InsurancePartnerApiConfig } from './types/crm';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId and experimentalForceLongPolling to avoid 10-second WebChannel stream buffering timeout behind cloud proxies & iframes
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const QUOTA_EXHAUSTED_KEY = 'crm_firestore_quota_exhausted';

export function isFirestoreQuotaExhausted(): boolean {
  try {
    const item = localStorage.getItem(QUOTA_EXHAUSTED_KEY);
    if (!item) return false;
    const { timestamp } = JSON.parse(item);
    // Quotas reset daily. Re-check after 45 minutes or allow manual retry.
    const retryInterval = 45 * 60 * 1000;
    if (Date.now() - timestamp < retryInterval) {
      return true;
    }
    localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
    return false;
  } catch {
    return false;
  }
}

export function setFirestoreQuotaExhausted(exhausted: boolean): void {
  try {
    if (exhausted) {
      localStorage.setItem(QUOTA_EXHAUSTED_KEY, JSON.stringify({ timestamp: Date.now() }));
    } else {
      localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
    }
  } catch {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  const isQuotaExhausted =
    errCode === 'resource-exhausted' ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Free daily write units per project');

  if (isQuotaExhausted) {
    setFirestoreQuotaExhausted(true);
    console.warn('Firestore: Quota journalier gratuit d\'écriture atteint. Bascule automatique en stockage local ultra-rapide (zéro perte).');
    return {
      error: 'Quota journalier d\'écriture Firebase atteint. Le CRM sauvegarde toutes vos modifications localement.',
      authInfo: { userId: auth.currentUser?.uid },
      operationType,
      path
    };
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Cloud Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase: client is currently offline.');
    }
    // Expected during initial boot if test document does not exist yet
    return false;
  }
}

// Google Sign-In helper
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Erreur lors de la connexion Google:', error);
    throw error;
  }
}

// Sign-Out helper
export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erreur lors de la déconnexion Firebase:', error);
  }
}

// Cloud sync helper for a single Lead
export async function syncLeadToFirestore(lead: Lead): Promise<void> {
  if (!lead || !lead.id || isFirestoreQuotaExhausted()) return;
  const path = `leads/${lead.id}`;
  try {
    // Firestore does not accept undefined values in documents, clean up any undefined
    const sanitized = JSON.parse(JSON.stringify(lead));
    await setDoc(doc(db, 'leads', lead.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete Lead from Firestore
export async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  if (!leadId || isFirestoreQuotaExhausted()) return;
  const path = `leads/${leadId}`;
  try {
    await deleteDoc(doc(db, 'leads', leadId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Cloud sync helper for a single User
export async function syncUserToFirestore(user: CrmUser): Promise<void> {
  if (!user || !user.id || isFirestoreQuotaExhausted()) return;
  const path = `users/${user.id}`;
  try {
    const sanitized = JSON.parse(JSON.stringify(user));
    await setDoc(doc(db, 'users', user.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Chat Message
export async function syncChatMessageToFirestore(message: ChatMessage): Promise<void> {
  if (!message || !message.id || isFirestoreQuotaExhausted()) return;
  const path = `chat_messages/${message.id}`;
  try {
    const sanitized = JSON.parse(JSON.stringify(message));
    await setDoc(doc(db, 'chat_messages', message.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Chat Channel
export async function syncChatChannelToFirestore(channel: ChatChannel): Promise<void> {
  if (!channel || !channel.id || isFirestoreQuotaExhausted()) return;
  const path = `chat_channels/${channel.id}`;
  try {
    const payload = {
      ...channel,
      updatedAtIso: channel.updatedAtIso || new Date().toISOString()
    };
    const sanitized = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'chat_channels', channel.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Cabinet Info (Logo, Nom du Cabinet, Statuts, ORIAS, Coordonnées)
export async function syncCabinetInfoToFirestore(info: CabinetInfo): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const path = 'cabinet_config/main';
  try {
    const payload = {
      ...info,
      updatedAt: new Date().toISOString()
    };
    const sanitized = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'cabinet_config', 'main'), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for SMTP Config
export async function syncSmtpConfigToFirestore(config: SmtpConfig): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const path = 'cabinet_config/smtp';
  try {
    const payload = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    const sanitized = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'cabinet_config', 'smtp'), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Email Templates
export async function syncEmailTemplatesToFirestore(templates: EmailTemplate[]): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const path = 'cabinet_config/email_templates';
  try {
    const payload = {
      templates,
      updatedAt: new Date().toISOString()
    };
    const sanitized = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'cabinet_config', 'email_templates'), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Insurance Partners
export async function syncPartnersToFirestore(partners: InsurancePartnerApiConfig[]): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const path = 'cabinet_config/partners';
  try {
    const payload = {
      partners,
      updatedAt: new Date().toISOString()
    };
    const sanitized = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'cabinet_config', 'partners'), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Teams
export async function syncTeamsToFirestore(teams: string[]): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const path = 'cabinet_config/teams';
  try {
    const payload = {
      teams,
      updatedAt: new Date().toISOString()
    };
    const sanitized = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'cabinet_config', 'teams'), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud sync helper for Agent Work Session (Suivi Login & Pauses)
export async function syncAgentSessionToFirestore(session: AgentWorkSession): Promise<void> {
  if (!session || !session.id || isFirestoreQuotaExhausted()) return;
  const path = `agent_sessions/${session.id}`;
  try {
    const sanitized = JSON.parse(JSON.stringify(session));
    await setDoc(doc(db, 'agent_sessions', session.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
