import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  Monitor, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Sliders, 
  MessageSquare, 
  CalendarClock, 
  UserPlus, 
  Vibrate, 
  Play
} from 'lucide-react';
import { 
  getNotificationPreferences, 
  saveNotificationPreferences, 
  NotificationPreferences, 
  SoundPreset, 
  playNotificationChime, 
  triggerHapticVibrate,
  testChatNotification, 
  requestNotificationPermission, 
  getNotificationPermission, 
  isNotificationSupported, 
  isInIframe, 
  isStandaloneApp 
} from '../utils/notifications';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLead?: (leadId: string) => void;
  onOpenChat?: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenChat
}) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const [permission, setPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [isTesting, setIsTesting] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  const inIframe = isInIframe();
  const isPwa = isStandaloneApp();
  const isSupported = isNotificationSupported();

  useEffect(() => {
    if (isOpen) {
      setPrefs(getNotificationPreferences());
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (patch: Partial<NotificationPreferences>) => {
    const updated = saveNotificationPreferences(patch);
    setPrefs(updated);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleRequestPermission = async () => {
    if (inIframe) {
      window.open(window.location.href, '_blank');
      return;
    }
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleTestSound = (preset: SoundPreset) => {
    playNotificationChime(preset, prefs.soundVolume);
    triggerHapticVibrate([100, 50, 100]);
  };

  const handleFullTest = () => {
    setIsTesting(true);
    testChatNotification(() => {
      if (onOpenChat) onOpenChat();
      onClose();
    });
    setTimeout(() => setIsTesting(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-400 shadow-md">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Notifications Chrome & App PWA</h3>
                {isPwa ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    App Installée
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                    Google Chrome
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 font-medium">Alertes bureau natives, sonneries et rappels en temps réel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 divide-y divide-slate-100 text-slate-900">

          {/* Section 1: Permission & Runtime Status Banner */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Statut du Système</span>
              {savedBadge && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Préférences enregistrées
                </span>
              )}
            </div>

            {/* In Iframe Notice */}
            {inIframe && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Prévisualisation intégrée détectée</h4>
                    <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                      Les navigateurs (Chrome / Edge) bloquent l'autorisation des notifications popups à l'intérieur d'un cadre iframe. Pour activer les alertes système réelles :
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ouvrir en plein écran dans Chrome</span>
                  </a>
                </div>
              </div>
            )}

            {/* Permission Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  permission === 'granted' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : permission === 'denied' 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">Autorisation Navigateur :</span>
                    {permission === 'granted' ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Autorisée (Actif)
                      </span>
                    ) : permission === 'denied' ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Bloquée par le navigateur
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        En attente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {permission === 'granted'
                      ? 'Les popups système s\'afficheront même si Chrome est réduit ou en arrière-plan.'
                      : permission === 'denied'
                      ? 'Cliquez sur l\'icône cadenas 🔒 ou Réglages du site à gauche de l\'URL pour débloquer.'
                      : 'Cliquez sur le bouton ci-contre pour autoriser les alertes.'}
                  </p>
                </div>
              </div>

              {permission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 shrink-0"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Demander l'autorisation</span>
                </button>
              )}
            </div>

            {/* Instructions if denied */}
            {permission === 'denied' && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Comment réactiver les notifications dans Chrome :
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-rose-800 ml-1">
                  <li>Cliquez sur l'icône de réglages / cadenas <strong>🔒</strong> à gauche de l'adresse URL dans Chrome.</li>
                  <li>Basculez l'option <strong>Notifications</strong> sur <strong>Autoriser</strong>.</li>
                  <li>Actualisez ensuite la page (F5 ou Ctrl+R).</li>
                </ol>
              </div>
            )}
          </div>

          {/* Section 2: Audio Engine & Sound Customization */}
          <div className="pt-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sonnerie & Volume Audio</span>

            {/* Sound Toggle & Volume Slider */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {prefs.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-900">Activer les alertes sonores</span>
                    <p className="text-[11px] text-slate-500">Joue un carillon mélodieux lors de nouveaux messages ou rappels</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.soundEnabled}
                    onChange={(e) => handleUpdate({ soundEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Volume Slider */}
              {prefs.soundEnabled && (
                <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Niveau du volume</span>
                    <span className="font-mono font-bold text-indigo-600">{Math.round(prefs.soundVolume * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={prefs.soundVolume}
                    onChange={(e) => handleUpdate({ soundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Sound Presets */}
            {prefs.soundEnabled && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Mélodie par défaut :</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'modern', label: 'Moderne', desc: 'Arpège velouté (Slack)', icon: '🎶' },
                    { id: 'urgent', label: 'Alerte Vive', desc: 'Double bip récurrent', icon: '🚨' },
                    { id: 'bell', label: 'Cloche Cristal', desc: 'Discret et doux', icon: '🔔' },
                    { id: 'success', label: 'Accord Majeur', desc: 'Triomphe & contrat', icon: '⭐' }
                  ].map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleUpdate({ soundPreset: preset.id as SoundPreset })}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between text-left ${
                        prefs.soundPreset === preset.id
                          ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-base">{preset.icon}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestSound(preset.id as SoundPreset);
                            }}
                            className="p-1 rounded-md text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                            title="Écouter"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-1">{preset.label}</p>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{preset.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Native Chrome & PWA Behaviors */}
          <div className="pt-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Comportement Windows / Chrome & App Installée</span>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
              
              {/* Require Interaction */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="pr-4">
                  <span className="font-bold text-slate-900 block">Garder la notification affichée jusqu'au clic</span>
                  <p className="text-[11px] text-slate-500">
                    Active l'attribut Chrome <code>requireInteraction</code> pour empêcher la disparition automatique et ne rater aucun prospect.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.requireInteraction}
                  onChange={(e) => handleUpdate({ requireInteraction: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Vibration API */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="pr-4">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Vibrate className="w-3.5 h-3.5 text-indigo-600" />
                    Vibration haptique (Mobiles & Tablettes)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Fait vibrer l'appareil lors de la réception d'alertes en mobilité terrain.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.vibrateEnabled}
                  onChange={(e) => handleUpdate({ vibrateEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Chat Notifications */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="pr-4">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    Nouveaux messages chat & salons
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Alerte lorsqu'un collègue vous écrit en direct ou dans vos canaux d'équipe.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyChat}
                  onChange={(e) => handleUpdate({ notifyChat: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Reminders Notifications */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="pr-4">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                    Rappels & relances programmés du jour
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Avertit des rendez-vous et appels clients imminents ou en retard.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyReminders}
                  onChange={(e) => handleUpdate({ notifyReminders: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* New Leads */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="pr-4">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    Nouveaux leads attribués
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Notification immédiate dès qu'un prospect vous est assigné.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyNewLeads}
                  onChange={(e) => handleUpdate({ notifyNewLeads: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleFullTest}
            disabled={isTesting}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isTesting ? 'Envoi du test...' : 'Envoyer une notification test'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
