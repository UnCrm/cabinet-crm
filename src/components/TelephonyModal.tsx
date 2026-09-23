import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Radio,
  ExternalLink,
  Send,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { 
  Lead, 
  ActivityLogItem, 
  NoteItem, 
  User as UserType, 
  getUserDisplayName, 
  CabinetInfo, 
  TelephonyProviderConfig 
} from '../types/crm';

interface TelephonyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  currentUser?: UserType;
  cabinetInfo?: CabinetInfo;
  onUpdateLead: (updatedLead: Lead) => void;
}

export const TelephonyModal: React.FC<TelephonyModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  cabinetInfo,
  onUpdateLead
}) => {
  const [activeTab, setActiveTab] = useState<'VOICE' | 'SMS'>('VOICE');

  // Available telephony providers
  const allProviders: TelephonyProviderConfig[] = cabinetInfo?.telephonyProviders || [];
  const voiceProviders = allProviders.filter(p => p.supportsVoice && p.enabled);
  const smsProviders = allProviders.filter(p => p.supportsSms && p.enabled);

  // Selected voice provider - check if agent has dedicated preferred provider
  const userTelConfig = currentUser?.telephonyConfig;
  const preferredVoiceId = (userTelConfig?.useDedicatedLine && userTelConfig?.preferredProviderId)
    || cabinetInfo?.defaultVoiceProviderId;

  const initialVoiceProvider = voiceProviders.find(p => p.id === preferredVoiceId) 
    || voiceProviders[0] 
    || allProviders.find(p => p.supportsVoice) 
    || {
      id: 'default-tel',
      name: 'Softphone Système / Zoiper / MicroSIP',
      providerType: 'GENERIC_SIP_TEL' as const,
      enabled: true,
      callMode: userTelConfig?.callMode || 'SOFTPHONE_TEL_URL' as const,
      supportsVoice: true,
      supportsSms: false
    };

  const [selectedVoiceProvider, setSelectedVoiceProvider] = useState<TelephonyProviderConfig>(initialVoiceProvider);

  // Selected SMS provider
  const defaultSmsId = cabinetInfo?.defaultSmsProviderId;
  const initialSmsProvider = smsProviders.find(p => p.id === defaultSmsId)
    || smsProviders[0]
    || allProviders.find(p => p.supportsSms)
    || null;

  const [selectedSmsProvider, setSelectedSmsProvider] = useState<TelephonyProviderConfig | null>(initialSmsProvider);

  // Real Call States
  const [callStatus, setCallStatus] = useState<'IDLE' | 'CALLING' | 'IN_CALL' | 'ENDED'>('IDLE');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [callApiFeedback, setCallApiFeedback] = useState<string | null>(null);
  const [callApiError, setCallApiError] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Qualification and notes
  const [callOutcome, setCallOutcome] = useState<string>('ARGUMENTE');
  const [callNotes, setCallNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // SMS Tab States
  const [smsMessage, setSmsMessage] = useState<string>(
    `Bonjour ${lead.prenom} ${lead.nom}, suite à notre échange, votre conseiller du cabinet ${cabinetInfo?.nomCabinet || 'd\'assurance'} reste à votre disposition au ${cabinetInfo?.telephone || ''}.`
  );
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  const timerRef = useRef<any>(null);

  // Update selected provider when cabinetInfo changes
  useEffect(() => {
    if (voiceProviders.length > 0) {
      const match = voiceProviders.find(p => p.id === cabinetInfo?.defaultVoiceProviderId) || voiceProviders[0];
      setSelectedVoiceProvider(match);
    }
    if (smsProviders.length > 0) {
      const matchSms = smsProviders.find(p => p.id === cabinetInfo?.defaultSmsProviderId) || smsProviders[0];
      setSelectedSmsProvider(matchSms);
    }
  }, [cabinetInfo]);

  // Duration Timer Management
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Launch Real Call
  const handleLaunchCall = async () => {
    setCallApiFeedback(null);
    setCallApiError(null);
    setCallStatus('CALLING');

    // If softphone protocol
    if (!selectedVoiceProvider || selectedVoiceProvider.callMode === 'SOFTPHONE_TEL_URL' || selectedVoiceProvider.providerType === 'GENERIC_SIP_TEL') {
      window.location.href = `tel:${lead.telephone.replace(/\s+/g, '')}`;
      setCallStatus('IN_CALL');
      setIsTimerRunning(true);
      setCallApiFeedback(`Numérotation lancée dans votre application de téléphonie (Softphone / tel:${lead.telephone}).`);
      return;
    }

    // Direct API Call via backend
    try {
      const activeCallerId = (userTelConfig?.useDedicatedLine && userTelConfig?.callerId)
        || (userTelConfig?.useDedicatedLine && userTelConfig?.directNumber)
        || selectedVoiceProvider.callerId 
        || cabinetInfo?.telephone;

      const activeExtension = (userTelConfig?.useDedicatedLine && userTelConfig?.extension)
        || selectedVoiceProvider.extensionUser;

      const res = await fetch('/api/telephony/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedVoiceProvider,
          toNumber: lead.telephone,
          callerIdOverride: activeCallerId,
          agentExtension: activeExtension,
          agentOperatorUserId: userTelConfig?.useDedicatedLine ? userTelConfig?.operatorUserId : undefined,
          leadName: `${lead.prenom} ${lead.nom}`
        })
      });

      const data = await res.json();

      if (data.success) {
        if (data.mode === 'SOFTPHONE_TEL_URL') {
          window.location.href = data.telUrl || `tel:${lead.telephone}`;
        }
        setCallStatus('IN_CALL');
        setIsTimerRunning(true);
        setActiveCallId(data.callId || null);
        setCallApiFeedback(data.message || 'Appel connecté avec succès via votre opérateur.');
      } else {
        setCallStatus('IDLE');
        setCallApiError(data.error || 'Impossible d\'initier l\'appel.');
      }
    } catch (err: any) {
      setCallStatus('IDLE');
      setCallApiError(`Erreur de connexion avec le serveur : ${err.message}`);
    }
  };

  const handleEndCall = () => {
    setIsTimerRunning(false);
    setCallStatus('ENDED');
  };

  const handleResetTimer = () => {
    setCallSeconds(0);
  };

  const handleSaveCallLog = () => {
    setIsSaving(true);
    const timestamp = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const authorName = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';

    const outcomeLabels: Record<string, string> = {
      'ARGUMENTE': 'Appel argumenté / Intéressé',
      'DEVIS_DEMANDE': 'Demande de devis confirmée',
      'RAPPEL_DEMANDE': 'Demande de rappel ultérieur',
      'REPONDEUR': 'Messagerie vocale / Répondeur',
      'OCCUPE': 'Occupé / Ne répond pas',
      'FAUX_NUMERO': 'Faux numéro / Injoignable',
      'REFUS': 'Non intéressé / Refus'
    };

    const outcomeText = outcomeLabels[callOutcome] || callOutcome;
    const providerName = selectedVoiceProvider?.name || 'Téléphonie';

    const newActivity: ActivityLogItem = {
      id: 'call-' + Date.now(),
      type: 'CALL_LOGGED',
      title: `Appel sortant via ${providerName} (${formatDuration(callSeconds)})`,
      description: `Résultat : ${outcomeText}${activeCallId ? ` (Réf: ${activeCallId})` : ''}${callNotes.trim() ? `\nNotes : ${callNotes.trim()}` : ''}`,
      author: authorName,
      date: timestamp,
      metadata: {
        callDurationSeconds: callSeconds,
        callOutcome: outcomeText
      }
    };

    const newNote: NoteItem | null = callNotes.trim() ? {
      id: 'note-call-' + Date.now(),
      author: authorName,
      date: timestamp,
      content: `[Appel ${formatDuration(callSeconds)} - ${outcomeText} via ${providerName}] ${callNotes.trim()}`
    } : null;

    const updatedNotes = newNote ? [newNote, ...(lead.notes || [])] : (lead.notes || []);

    const updatedLead: Lead = {
      ...lead,
      notes: updatedNotes,
      historyLogs: [newActivity, ...(lead.historyLogs || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateLead(updatedLead);
    setIsSaving(false);
    onClose();
  };

  // Send real SMS
  const handleSendRealSms = async () => {
    if (!selectedSmsProvider) {
      setSmsResult({
        success: false,
        message: "Veuillez configurer et activer un fournisseur SMS (Twilio ou Brevo) dans les Paramètres > Téléphonie."
      });
      return;
    }

    if (!smsMessage.trim()) return;

    setIsSendingSms(true);
    setSmsResult(null);

    try {
      const res = await fetch('/api/telephony/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedSmsProvider,
          toNumber: lead.telephone,
          message: smsMessage.trim(),
          senderName: selectedSmsProvider.callerId || cabinetInfo?.nomCabinet || 'COURTAGE'
        })
      });

      const data = await res.json();
      setIsSendingSms(false);

      if (data.success) {
        setSmsResult({
          success: true,
          message: data.message || `SMS délivré avec succès au ${lead.telephone} !`
        });

        // Log SMS in Lead history
        const timestamp = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const authorName = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';

        const smsActivity: ActivityLogItem = {
          id: 'sms-' + Date.now(),
          type: 'STATUS_CHANGE',
          title: `SMS envoyé via ${selectedSmsProvider.name}`,
          description: `Message envoyé au ${lead.telephone} :\n"${smsMessage.trim()}"`,
          author: authorName,
          date: timestamp
        };

        const updatedLead: Lead = {
          ...lead,
          historyLogs: [smsActivity, ...(lead.historyLogs || [])],
          updatedAt: new Date().toISOString()
        };

        onUpdateLead(updatedLead);
      } else {
        setSmsResult({
          success: false,
          message: data.error || "Échec de l'envoi du SMS."
        });
      }
    } catch (err: any) {
      setIsSendingSms(false);
      setSmsResult({
        success: false,
        message: `Erreur réseau : ${err.message || 'Serveur indisponible'}`
      });
    }
  };

  const applyNotePreset = (presetText: string) => {
    setCallNotes(prev => prev ? `${prev} - ${presetText}` : presetText);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Header with Lead Profile & Tab Switcher */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {lead.civilite || ''} {lead.prenom} {lead.nom}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">
                    {lead.referenceDevis}
                  </span>
                </div>
                <p className="text-xs font-mono text-blue-300 font-bold mt-0.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  {lead.telephone}
                </p>
              </div>
            </div>

            {/* Tab switch: Voice or SMS */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('VOICE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'VOICE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Appel Voix</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SMS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'SMS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS Direct</span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: REAL VOICE CALL CONSOLE */}
        {activeTab === 'VOICE' && (
          <div className="p-6 space-y-5">
            {/* Agent Dedicated Line Indicator if configured */}
            {userTelConfig?.useDedicatedLine && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      Ligne dédiée de {currentUser?.prenom || 'l\'agent'} : {userTelConfig.directNumber || 'Numéro standard'}
                    </span>
                    <span className="text-[11px] text-emerald-800/80">
                      {userTelConfig.extension ? `Poste SIP interne #${userTelConfig.extension}` : 'Poste direct'} • Sortant : {userTelConfig.callerId || userTelConfig.directNumber || 'Standard'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                  Ligne Dédiée Active
                </span>
              </div>
            )}

            {/* Operator / Line Selector */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ligne d'appel sortant (CTI Multi-Fournisseurs)
                </label>
                <span className="text-[11px] text-blue-600 font-semibold">
                  {voiceProviders.length > 0 ? `${voiceProviders.length} ligne(s) configurée(s)` : 'Mode Softphone natif'}
                </span>
              </div>

              <select
                value={selectedVoiceProvider?.id || ''}
                onChange={(e) => {
                  const p = allProviders.find(prov => prov.id === e.target.value);
                  if (p) setSelectedVoiceProvider(p);
                }}
                disabled={callStatus === 'IN_CALL'}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60"
              >
                {voiceProviders.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.providerType}) {p.callerId ? `• Caller ID: ${p.callerId}` : ''}
                  </option>
                ))}
                {!voiceProviders.some(p => p.id === 'default-tel') && (
                  <option value="default-tel">
                    Softphone Système / Zoiper / MicroSIP / Teams (tel:)
                  </option>
                )}
              </select>

              {selectedVoiceProvider?.callerId && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Numéro présenté au prospect : <strong className="font-mono text-slate-700">{selectedVoiceProvider.callerId}</strong>
                </p>
              )}
            </div>

            {/* Active Call Status & Action Bar */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                {callStatus === 'IDLE' && (
                  <span className="text-xs text-slate-400 font-medium">Prêt à composer</span>
                )}
                {callStatus === 'CALLING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    Connexion de la ligne en cours...
                  </span>
                )}
                {callStatus === 'IN_CALL' && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    En communication
                  </span>
                )}
                {callStatus === 'ENDED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                    Appel raccroché
                  </span>
                )}
              </div>

              {/* Live Duration Display */}
              <div className="text-3xl font-mono font-bold text-white tracking-wider flex items-center justify-center gap-2">
                <span>{formatDuration(callSeconds)}</span>
                {callStatus === 'IN_CALL' && (
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title={isTimerRunning ? "Mettre en pause le chronomètre" : "Reprendre le chronomètre"}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
                  </button>
                )}
              </div>

              {/* Main Call / Hangup Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                {callStatus !== 'IN_CALL' ? (
                  <button
                    type="button"
                    onClick={handleLaunchCall}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Lancer l'appel réel</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Raccrocher</span>
                  </button>
                )}

                {/* Direct tel: fallback link */}
                <a
                  href={`tel:${lead.telephone.replace(/\s+/g, '')}`}
                  className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  title="Ouvrir dans l'application téléphone native de votre ordinateur"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Softphone local</span>
                </a>
              </div>

              {/* Feedback messages */}
              {callApiFeedback && (
                <p className="text-xs text-emerald-400 pt-1">{callApiFeedback}</p>
              )}
              {callApiError && (
                <p className="text-xs text-rose-400 pt-1">{callApiError}</p>
              )}
            </div>

            {/* Post-Call Qualification Form */}
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Qualification de l'appel (Dossier CRM)
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ARGUMENTE">Appel argumenté / Intéressé</option>
                  <option value="DEVIS_DEMANDE">Demande de devis confirmée</option>
                  <option value="RAPPEL_DEMANDE">Demande de rappel ultérieur</option>
                  <option value="REPONDEUR">Messagerie vocale / Répondeur</option>
                  <option value="OCCUPE">Occupé / Ne répond pas</option>
                  <option value="FAUX_NUMERO">Faux numéro / Injoignable</option>
                  <option value="REFUS">Non intéressé / Refus</option>
                </select>
              </div>

              {/* Quick Note Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Notes & Compte-rendu d'appel
                  </label>
                  <span className="text-[11px] text-slate-400">Modèles rapides :</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Message vocal laissé',
                    'Devis demandé pour ce soir',
                    'À rappeler demain à 10h',
                    'Tarif jugé trop cher',
                    'En attente résiliation loi Hamon'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyNotePreset(preset)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Notes détaillées sur l'échange téléphonique..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>

              {/* Actions footer */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  title="Remettre le minuteur à zéro"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser minuteur</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCallLog}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Enregistrer dans le dossier</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REAL SMS SENDER CONSOLE */}
        {activeTab === 'SMS' && (
          <div className="p-6 space-y-4">
            {/* Operator selection for SMS */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Passerelle d'envoi SMS
                </label>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  {smsProviders.length > 0 ? `${smsProviders.length} opérateur(s) SMS actif(s)` : 'À configurer'}
                </span>
              </div>

              {smsProviders.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Aucun fournisseur SMS configuré
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Rendez-vous dans <strong>Paramètres &gt; Téléphonie VoIP & SMS</strong> pour renseigner votre clé <strong>Brevo (Sendinblue)</strong> ou <strong>Twilio</strong>.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedSmsProvider?.id || ''}
                  onChange={(e) => {
                    const p = smsProviders.find(prov => prov.id === e.target.value);
                    if (p) setSelectedSmsProvider(p);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {smsProviders.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.providerType}) {p.callerId ? `• Émetteur: ${p.callerId}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quick SMS templates */}
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Modèles de SMS rapides :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSmsMessage(`Bonjour ${lead.prenom}, votre devis d'assurance ${lead.type} N° ${lead.referenceDevis} a bien été transmis par email. Votre conseiller reste à votre écoute au ${cabinetInfo?.telephone || ''}.`)}
                  className="p-2.5 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 transition"
                >
                  Confirmation envoi de devis
                </button>
                <button
                  type="button"
                  onClick={() => setSmsMessage(`Bonjour ${lead.prenom}, nous avons tenté de vous joindre concernant votre dossier d'assurance. Merci de nous recontacter au ${cabinetInfo?.telephone || ''}. Cordialement.`)}
                  className="p-2.5 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 transition"
                >
                  Tentative d'appel infructueuse
                </button>
              </div>
            </div>

            {/* Message input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Texte du SMS à transmettre à {lead.telephone}
              </label>
              <textarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Rédigez votre SMS..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>{smsMessage.length} caractères ({Math.ceil(smsMessage.length / 160)} SMS)</span>
                <span>Émetteur : {selectedSmsProvider?.callerId || cabinetInfo?.nomCabinet || 'COURTAGE'}</span>
              </div>
            </div>

            {/* Feedback message */}
            {smsResult && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                smsResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {smsResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{smsResult.message}</span>
              </div>
            )}

            {/* Actions footer */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSendRealSms}
                disabled={isSendingSms || !smsMessage.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingSms ? "Envoi en cours..." : "Envoyer le SMS réel"}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
