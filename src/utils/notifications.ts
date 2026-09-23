import { isLeadAccessibleByUser } from './permissions';

// Helper utility for Browser (Google Chrome, Edge) & Installed PWA Standalone Notifications

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const isInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Preferences Interface
export type SoundPreset = 'modern' | 'urgent' | 'bell' | 'success';

export interface NotificationPreferences {
  desktopEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0.0 - 1.0
  soundPreset: SoundPreset;
  requireInteraction: boolean; // Keep notification pinned on Windows/Chrome until user dismisses
  vibrateEnabled: boolean;
  notifyChat: boolean;
  notifyReminders: boolean;
  notifyNewLeads: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  desktopEnabled: true,
  soundEnabled: true,
  soundVolume: 0.75,
  soundPreset: 'modern',
  requireInteraction: true,
  vibrateEnabled: true,
  notifyChat: true,
  notifyReminders: true,
  notifyNewLeads: true
};

export const getNotificationPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem('crm_notification_preferences');
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const saveNotificationPreferences = (prefs: Partial<NotificationPreferences>): NotificationPreferences => {
  const current = getNotificationPreferences();
  const updated = { ...current, ...prefs };
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_notification_preferences', JSON.stringify(updated));
    // Backward compatibility keys
    localStorage.setItem('crm_chat_sound_enabled', updated.soundEnabled ? 'true' : 'false');
    localStorage.setItem('crm_chat_desktop_notif_enabled', updated.desktopEnabled ? 'true' : 'false');
  }
  return updated;
};

// Backward compatible sound toggles
export const isChatSoundEnabled = (): boolean => getNotificationPreferences().soundEnabled;
export const setChatSoundEnabled = (enabled: boolean): void => {
  saveNotificationPreferences({ soundEnabled: enabled });
};

export const isChatDesktopNotifEnabled = (): boolean => getNotificationPreferences().desktopEnabled;
export const setChatDesktopNotifEnabled = (enabled: boolean): void => {
  saveNotificationPreferences({ desktopEnabled: enabled });
};

// Single AudioContext cache to avoid browser limits
let sharedAudioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
};

// High-Fidelity Audio Synth & Presets
export const playNotificationChime = (preset?: SoundPreset, customVolume?: number) => {
  if (typeof window === 'undefined') return;
  const prefs = getNotificationPreferences();
  if (!prefs.soundEnabled) return;

  const volume = customVolume !== undefined ? customVolume : prefs.soundVolume;
  if (volume <= 0) return;

  const soundType = preset || prefs.soundPreset || 'modern';

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundType === 'modern') {
      // Warm Modern 3-Tone Melodic Chime (Slack / Telegram inspired): E5 -> A5 -> D6
      const notes = [
        { freq: 659.25, start: 0, duration: 0.14, vol: volume * 0.85 },
        { freq: 880.00, start: 0.08, duration: 0.16, vol: volume * 0.95 },
        { freq: 1174.66, start: 0.16, duration: 0.38, vol: volume * 1.05 }
      ];

      notes.forEach(({ freq, start, duration, vol }) => {
        const startTime = now + start;
        const stopTime = startTime + duration;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const oscHarmonic = ctx.createOscillator();
        const gainHarmonic = ctx.createGain();
        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

        gainHarmonic.gain.setValueAtTime(0.001, startTime);
        gainHarmonic.gain.linearRampToValueAtTime(vol * 0.18, startTime + 0.015);
        gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, stopTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        oscHarmonic.connect(gainHarmonic);
        gainHarmonic.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(stopTime);
        oscHarmonic.start(startTime);
        oscHarmonic.stop(stopTime);
      });
    } else if (soundType === 'urgent') {
      // Rapid two-tone alert (D5 -> A5 with repeat) for overdue actions
      const notes = [
        { freq: 587.33, start: 0, duration: 0.12, vol: volume },
        { freq: 880.00, start: 0.10, duration: 0.25, vol: volume * 1.1 },
        { freq: 587.33, start: 0.28, duration: 0.12, vol: volume * 0.9 },
        { freq: 880.00, start: 0.38, duration: 0.32, vol: volume * 1.15 }
      ];

      notes.forEach(({ freq, start, duration, vol }) => {
        const startTime = now + start;
        const stopTime = startTime + duration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(stopTime);
      });
    } else if (soundType === 'bell') {
      // Crystal clear single bell chime (pure 523.25Hz C5 with gentle decay)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume * 1.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (soundType === 'success') {
      // Ascending major chord (C5 -> E5 -> G5 -> C6)
      const notes = [
        { freq: 523.25, start: 0, duration: 0.12, vol: volume * 0.8 },
        { freq: 659.25, start: 0.08, duration: 0.14, vol: volume * 0.9 },
        { freq: 783.99, start: 0.16, duration: 0.18, vol: volume * 1.0 },
        { freq: 1046.50, start: 0.24, duration: 0.45, vol: volume * 1.1 }
      ];

      notes.forEach(({ freq, start, duration, vol }) => {
        const startTime = now + start;
        const stopTime = startTime + duration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(stopTime);
      });
    }
  } catch (e) {
    console.warn('Could not play audio notification chime:', e);
  }
};

// Backward-compatible audio functions
export const playNotificationSound = () => playNotificationChime('urgent');
export const playChatNotificationSound = (vol?: number) => playNotificationChime('modern', vol);

// Haptic Vibrate helper for Chrome Mobile / Android
export const triggerHapticVibrate = (pattern: number[] = [150, 75, 150]) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      const prefs = getNotificationPreferences();
      if (prefs.vibrateEnabled) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    alert("Les notifications de bureau ne sont pas supportées par votre navigateur.");
    return 'denied';
  }

  try {
    let perm: NotificationPermission = Notification.permission;

    if (Notification.requestPermission.length === 0) {
      perm = await Notification.requestPermission();
    } else {
      perm = await new Promise((resolve) => {
        Notification.requestPermission(resolve);
      });
    }

    if (perm === 'granted') {
      playNotificationChime('success');
      triggerHapticVibrate([200, 100, 200]);

      // Trigger test welcome notification via Service Worker if available
      sendWindowsDesktopNotification('🔔 Notifications Chrome & PWA Activées', {
        body: 'Vous recevrez désormais les messages du chat, les alertes de nouveaux leads et les rappels sous forme de notifications système.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'welcome-notification',
        requireInteraction: false
      });
    }
    return perm;
  } catch (err) {
    console.error('Erreur lors de la demande de permission de notification:', err);
    return Notification.permission || 'denied';
  }
};

export interface DesktopNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface DesktopNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  onClickUrl?: string;
  onClick?: () => void;
  actions?: DesktopNotificationAction[];
  requireInteraction?: boolean;
  vibrate?: number[];
  renotify?: boolean;
  soundPreset?: SoundPreset;
}

/**
 * Universal Native Notification Dispatcher
 * Optimized for Google Chrome, Edge, and Installed Standalone PWA
 * Prefers ServiceWorkerRegistration.showNotification() when available
 */
export const sendWindowsDesktopNotification = async (
  title: string,
  options: DesktopNotificationOptions = {}
): Promise<Notification | boolean | null> => {
  if (!isNotificationSupported()) return null;

  const prefs = getNotificationPreferences();
  if (!prefs.desktopEnabled) return null;

  if (Notification.permission !== 'granted') {
    return null;
  }

  // Play sound chime
  playNotificationChime(options.soundPreset);

  // Trigger haptic vibration on mobile
  if (options.vibrate || prefs.vibrateEnabled) {
    triggerHapticVibrate(options.vibrate || [150, 75, 150]);
  }

  const tag = options.tag || `crm-notif-${Date.now()}`;
  const icon = options.icon || '/pwa-192x192.png';
  const badge = options.badge || '/pwa-192x192.png';
  const requireInteraction = options.requireInteraction !== undefined
    ? options.requireInteraction
    : prefs.requireInteraction;

  // 1. Try Service Worker showNotification (Best for Chrome & Installed PWA)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        const swOptions: any = {
          body: options.body || '',
          icon,
          badge,
          tag,
          requireInteraction,
          renotify: options.renotify ?? true,
          vibrate: options.vibrate || [150, 75, 150],
          data: {
            ...options.data,
            url: options.onClickUrl || '/',
            timestamp: Date.now()
          }
        };

        if (options.actions && options.actions.length > 0) {
          swOptions.actions = options.actions;
        }

        await registration.showNotification(title, swOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification fallback to new Notification:', swErr);
    }
  }

  // 2. Fallback to standard Window Notification
  try {
    const notifOptions: NotificationOptions = {
      body: options.body || '',
      icon,
      badge,
      tag,
      data: options.data,
      requireInteraction,
      silent: false
    };

    const notification = new Notification(title, notifOptions);

    notification.onclick = (event) => {
      event.preventDefault();
      if (typeof window !== 'undefined') {
        window.focus();
      }
      if (options.onClick) {
        try {
          options.onClick();
        } catch (e) {
          console.error('Error executing notification onClick handler', e);
        }
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error('Erreur lors de l\'envoi de la notification système:', err);
    return null;
  }
};

// Setup Service Worker click message listener on client
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CRM_NOTIFICATION_CLICK') {
      const customEvent = new CustomEvent('crm-notification-click', {
        detail: event.data
      });
      window.dispatchEvent(customEvent);
    }
  });
}

// Payload for incoming chat notifications
export interface ChatNotificationPayload {
  messageId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  channelId: string;
  channelName?: string;
  channelType?: 'GROUP' | 'DIRECT';
  attachmentsCount?: number;
}

export const sendChatDesktopNotification = (
  payload: ChatNotificationPayload,
  onOpenChat?: () => void
): void => {
  const prefs = getNotificationPreferences();
  if (!prefs.notifyChat) return;

  const isDirect = payload.channelType === 'DIRECT';
  const title = isDirect
    ? `💬 ${payload.senderName}`
    : `💬 ${payload.senderName} (${payload.channelName || 'Groupe'})`;

  let body = payload.content ? payload.content.trim() : '';
  if (!body && payload.attachmentsCount && payload.attachmentsCount > 0) {
    body = `📎 ${payload.attachmentsCount} pièce(s) jointe(s)`;
  } else if (payload.attachmentsCount && payload.attachmentsCount > 0) {
    body = `${body} 📎`;
  }

  if (body.length > 120) {
    body = body.slice(0, 117) + '...';
  }

  const icon =
    payload.senderAvatar && payload.senderAvatar.startsWith('http')
      ? payload.senderAvatar
      : '/pwa-192x192.png';

  sendWindowsDesktopNotification(title, {
    body: body || 'Nouveau message reçu',
    icon,
    badge: '/pwa-192x192.png',
    tag: `crm-chat-${payload.channelId}`,
    onClickUrl: `/?tab=chat&channelId=${payload.channelId}`,
    onClick: onOpenChat,
    soundPreset: 'modern',
    data: {
      type: 'chat',
      channelId: payload.channelId,
      url: `/?tab=chat&channelId=${payload.channelId}`
    },
    actions: [
      { action: 'open_chat', title: '💬 Ouvrir la discussion' }
    ]
  });
};

// Reminder notification tracker to avoid duplicate alerts in the same session
const notifiedReminderKeys = new Set<string>();

export const checkAndNotifyReminders = (leads: any[], currentUser?: any, onOpenLead?: (lead: any) => void) => {
  const prefs = getNotificationPreferences();
  if (!prefs.notifyReminders) return;

  const todayStr = new Date().toISOString().split('T')[0];

  leads.forEach((lead) => {
    if (!lead.prochaineActionDate) return;
    if (lead.status === 'GAGNE' || lead.status === 'PERDU') return;
    if (currentUser && !isLeadAccessibleByUser(lead, currentUser)) return;

    const actionDate = lead.prochaineActionDate;
    const actionHeure = lead.prochaineActionHeure || '';
    const key = `${lead.id}-${actionDate}-${actionHeure}-${lead.prochaineActionIntitule || ''}`;

    if (notifiedReminderKeys.has(key)) {
      return;
    }

    const isToday = actionDate === todayStr;
    const isOverdue = actionDate < todayStr;

    if (isToday || isOverdue) {
      notifiedReminderKeys.add(key);

      const title = isOverdue
        ? `🚨 Rappel Client En Retard : ${lead.prenom} ${lead.nom}`
        : `📅 Rappel Client Aujourd'hui : ${lead.prenom} ${lead.nom}`;

      const actionText = lead.prochaineActionIntitule
        ? `Action : ${lead.prochaineActionIntitule}`
        : 'Rappel téléphonique prévu';

      const contactInfo = lead.telephone ? `📞 ${lead.telephone}` : `✉️ ${lead.email}`;

      sendWindowsDesktopNotification(title, {
        body: `${actionText}\nProduit : ${lead.type} | ${contactInfo}\nHeure : ${actionHeure || 'Aujourd\'hui'}`,
        tag: `reminder-${lead.id}`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        soundPreset: isOverdue ? 'urgent' : 'modern',
        requireInteraction: isOverdue, // Urgent overdue reminders stay on screen!
        onClickUrl: `/?tab=leads&leadId=${lead.id}`,
        onClick: () => {
          if (onOpenLead) onOpenLead(lead);
        },
        data: {
          type: 'lead',
          leadId: lead.id,
          url: `/?tab=leads&leadId=${lead.id}`
        },
        actions: [
          { action: 'open_lead', title: '📋 Voir le prospect' }
        ]
      });
    }
  });
};

// Notification for newly assigned or imported lead
export const sendNewLeadAssignedNotification = (lead: any, onOpenLead?: () => void) => {
  const prefs = getNotificationPreferences();
  if (!prefs.notifyNewLeads) return;

  const title = `⚡ Nouveau Lead Assigné : ${lead.prenom || ''} ${lead.nom || 'Prospect'}`;
  const contact = lead.telephone || lead.email || '';
  const body = `Produit : ${lead.type || 'Assurance'} | Budget/Prime : ${lead.primeProposee ? lead.primeProposee + ' €' : 'En attente'}\n${contact}`;

  sendWindowsDesktopNotification(title, {
    body,
    tag: `new-lead-${lead.id}`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    soundPreset: 'bell',
    requireInteraction: true,
    onClickUrl: `/?tab=leads&leadId=${lead.id}`,
    onClick: onOpenLead,
    data: {
      type: 'lead',
      leadId: lead.id,
      url: `/?tab=leads&leadId=${lead.id}`
    },
    actions: [
      { action: 'open_lead', title: '📋 Traiter le lead' }
    ]
  });
};

// Full instant test helper
export const testChatNotification = (onOpenChat?: () => void) => {
  const isPwa = isStandaloneApp();
  const envLabel = isPwa ? 'Application PWA Installée' : 'Google Chrome';

  sendWindowsDesktopNotification(`💬 Notification Test (${envLabel})`, {
    body: '🔔 Son haute fidélité, vibration et notification système fonctionnent parfaitement sur votre appareil !',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `crm-test-${Date.now()}`,
    soundPreset: 'modern',
    onClick: onOpenChat,
    onClickUrl: '/?tab=chat',
    data: {
      type: 'test',
      url: '/?tab=chat'
    },
    actions: [
      { action: 'open_chat', title: '💬 Ouvrir le CRM' }
    ]
  });
};
