import React, { useState } from 'react';
import { 
  PhoneCall, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  Trash2, 
  Radio, 
  Key, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  HelpCircle,
  Hash,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { CabinetInfo, TelephonyProviderConfig, TelephonyProviderType } from '../types/crm';

interface TelephonySettingsProps {
  cabinetInfo: CabinetInfo;
  onSaveCabinetInfo: (info: CabinetInfo) => void;
}

const PROVIDER_METADATA: Record<TelephonyProviderType, {
  name: string;
  category: 'VOIP' | 'SMS' | 'HYBRIDE';
  color: string;
  badgeBg: string;
  description: string;
  docUrl: string;
  defaultSupportsVoice: boolean;
  defaultSupportsSms: boolean;
}> = {
  RINGOVER: {
    name: 'Ringover',
    category: 'HYBRIDE',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'CTI Cloud leader français. Click-to-call direct par double appel et envoi de SMS professionnels.',
    docUrl: 'https://developer.ringover.com/',
    defaultSupportsVoice: true,
    defaultSupportsSms: true
  },
  AIRCALL: {
    name: 'Aircall',
    category: 'VOIP',
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Téléphonie VoIP d’entreprise. Intégration CTI et remontée automatique de fiches leads.',
    docUrl: 'https://developer.aircall.io/',
    defaultSupportsVoice: true,
    defaultSupportsSms: false
  },
  TWILIO: {
    name: 'Twilio Voice & SMS',
    category: 'HYBRIDE',
    color: 'text-red-600',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    description: 'Standard mondial des communications. Appels sortants/entrants et SMS OTP certifiés.',
    docUrl: 'https://www.twilio.com/docs',
    defaultSupportsVoice: true,
    defaultSupportsSms: true
  },
  OVH: {
    name: 'OVH Télécom',
    category: 'HYBRIDE',
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Lignes SIP fixes françaises, Trunk SIP et passerelle d’envoi de SMS France & DOM-TOM.',
    docUrl: 'https://api.ovh.com/',
    defaultSupportsVoice: true,
    defaultSupportsSms: true
  },
  THREE_CX: {
    name: '3CX Phone System',
    category: 'VOIP',
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'PABX VoIP d’entreprise. Déclenchement d’appels par Webhook MakeCall / CTI.',
    docUrl: 'https://www.3cx.com/',
    defaultSupportsVoice: true,
    defaultSupportsSms: false
  },
  BREVO_SMS: {
    name: 'Brevo (Sendinblue)',
    category: 'SMS',
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Plateforme française d’envoi de SMS transactionnels, codes de validation OTP et notifications.',
    docUrl: 'https://developers.brevo.com/',
    defaultSupportsVoice: false,
    defaultSupportsSms: true
  },
  GENERIC_SIP_TEL: {
    name: 'Softphone Système / Zoiper / MicroSIP',
    category: 'VOIP',
    color: 'text-slate-600',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Protocole natif tel: sans API externe. Déclenche immédiatement Zoiper, Teams, MicroSIP ou smartphone.',
    docUrl: 'https://www.zoiper.com/',
    defaultSupportsVoice: true,
    defaultSupportsSms: false
  }
};

export const TelephonySettings: React.FC<TelephonySettingsProps> = ({
  cabinetInfo,
  onSaveCabinetInfo
}) => {
  const providers: TelephonyProviderConfig[] = cabinetInfo.telephonyProviders || [];

  const [editingProvider, setEditingProvider] = useState<TelephonyProviderConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; isSuccess: boolean; message: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Trigger real backend API test
  const handleTestConnection = async (provider: TelephonyProviderConfig) => {
    setTestingId(provider.id);
    setTestResult(null);

    try {
      const res = await fetch('/api/telephony/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      setTestingId(null);

      if (data.success) {
        setTestResult({
          id: provider.id,
          isSuccess: true,
          message: data.message || 'Connexion opérationnelle et authentifiée !'
        });

        // Update provider status in local state
        const updatedList = providers.map(p => {
          if (p.id === provider.id) {
            return {
              ...p,
              status: 'CONNECTE' as const,
              statusMessage: data.message,
              lastTestedAt: new Date().toISOString()
            };
          }
          return p;
        });
        onSaveCabinetInfo({ ...cabinetInfo, telephonyProviders: updatedList });
      } else {
        setTestResult({
          id: provider.id,
          isSuccess: false,
          message: data.error || 'Erreur lors du test de connexion.'
        });

        const updatedList = providers.map(p => {
          if (p.id === provider.id) {
            return {
              ...p,
              status: 'ERREUR' as const,
              statusMessage: data.error,
              lastTestedAt: new Date().toISOString()
            };
          }
          return p;
        });
        onSaveCabinetInfo({ ...cabinetInfo, telephonyProviders: updatedList });
      }
    } catch (err: any) {
      setTestingId(null);
      setTestResult({
        id: provider.id,
        isSuccess: false,
        message: `Erreur réseau : ${err.message || 'Impossible de joindre le serveur'}`
      });
    }
  };

  // Toggle active / inactive
  const handleToggleActive = (providerId: string) => {
    const updated = providers.map(p => {
      if (p.id === providerId) {
        return { ...p, enabled: !p.enabled };
      }
      return p;
    });
    onSaveCabinetInfo({ ...cabinetInfo, telephonyProviders: updated });
  };

  // Set default voice provider
  const handleSetDefaultVoice = (providerId: string) => {
    const updated = providers.map(p => ({
      ...p,
      isDefaultVoice: p.id === providerId
    }));
    onSaveCabinetInfo({
      ...cabinetInfo,
      telephonyProviders: updated,
      defaultVoiceProviderId: providerId
    });
    showSaveNotification("Opérateur d'appels par défaut mis à jour !");
  };

  // Set default SMS provider
  const handleSetDefaultSms = (providerId: string) => {
    const updated = providers.map(p => ({
      ...p,
      isDefaultSms: p.id === providerId
    }));
    onSaveCabinetInfo({
      ...cabinetInfo,
      telephonyProviders: updated,
      defaultSmsProviderId: providerId
    });
    showSaveNotification("Fournisseur SMS par défaut mis à jour !");
  };

  // Delete provider
  const handleDeleteProvider = (providerId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet opérateur de la liste ?")) return;
    const updated = providers.filter(p => p.id !== providerId);
    onSaveCabinetInfo({ ...cabinetInfo, telephonyProviders: updated });
    showSaveNotification("Fournisseur supprimé de la configuration.");
  };

  // Save edited or new provider
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;

    let updatedList: TelephonyProviderConfig[];
    const exists = providers.some(p => p.id === editingProvider.id);

    if (exists) {
      updatedList = providers.map(p => p.id === editingProvider.id ? editingProvider : p);
    } else {
      updatedList = [...providers, editingProvider];
    }

    onSaveCabinetInfo({
      ...cabinetInfo,
      telephonyProviders: updatedList
    });

    setEditingProvider(null);
    showSaveNotification(`Configuration de "${editingProvider.name}" enregistrée avec succès.`);
  };

  const showSaveNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Open modal to add a new provider preset
  const handleOpenAddModal = (type: TelephonyProviderType = 'TWILIO') => {
    const meta = PROVIDER_METADATA[type];
    const newProv: TelephonyProviderConfig = {
      id: 'tel-' + Date.now(),
      name: `Ligne ${meta.name}`,
      providerType: type,
      enabled: true,
      isDefaultVoice: false,
      isDefaultSms: false,
      callMode: type === 'GENERIC_SIP_TEL' ? 'SOFTPHONE_TEL_URL' : 'DIRECT_API',
      supportsVoice: meta.defaultSupportsVoice,
      supportsSms: meta.defaultSupportsSms,
      status: 'NON_CONFIGURE',
      callerId: cabinetInfo.telephone || ''
    };
    setEditingProvider(newProv);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Téléphonie VoIP, CTI & SMS Multi-Opérateurs
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Connectez plusieurs fournisseurs simultanément (Ringover, Aircall, Twilio, OVH Télécom, 3CX, Brevo SMS). 
              Passez vos appels réels en Click-to-Call et transmettez vos SMS et codes OTP en production.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal('RINGOVER')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Opérateur</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Preset Quick Add Bar */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
          Ajout rapide d'un opérateur supporté :
        </span>
        <div className="flex flex-wrap gap-2">
          {(['RINGOVER', 'TWILIO', 'AIRCALL', 'OVH', 'THREE_CX', 'BREVO_SMS', 'GENERIC_SIP_TEL'] as TelephonyProviderType[]).map(type => {
            const meta = PROVIDER_METADATA[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleOpenAddModal(type)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Providers List */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <PhoneCall className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Aucun opérateur de téléphonie configuré</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cliquez sur un des boutons ci-dessus pour ajouter votre premier compte de téléphonie ou passerelle SMS.
            </p>
          </div>
        ) : (
          providers.map(provider => {
            const meta = PROVIDER_METADATA[provider.providerType] || PROVIDER_METADATA.GENERIC_SIP_TEL;
            const isTesting = testingId === provider.id;
            const thisTestResult = testResult?.id === provider.id ? testResult : null;

            return (
              <div 
                key={provider.id}
                className={`bg-white rounded-2xl border transition shadow-xs ${
                  provider.enabled ? 'border-slate-200' : 'border-slate-200/60 opacity-75'
                }`}
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${meta.badgeBg}`}>
                      <Radio className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{provider.name}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${meta.badgeBg}`}>
                          {meta.name}
                        </span>

                        {provider.isDefaultVoice && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <PhoneCall className="w-3 h-3" />
                            Voix par défaut
                          </span>
                        )}

                        {provider.isDefaultSms && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            SMS par défaut
                          </span>
                        )}

                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                          provider.status === 'CONNECTE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : provider.status === 'ERREUR'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {provider.status === 'CONNECTE' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Actif & Connecté</span>
                            </>
                          ) : provider.status === 'ERREUR' ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Erreur API</span>
                            </>
                          ) : (
                            <>
                              <Settings2 className="w-3 h-3 text-amber-600" />
                              <span>À configurer</span>
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {provider.statusMessage || meta.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                        {provider.callerId && (
                          <span className="flex items-center gap-1 text-slate-600 font-mono">
                            <Smartphone className="w-3 h-3 text-slate-400" />
                            Affichage : {provider.callerId}
                          </span>
                        )}
                        {provider.supportsVoice && (
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            • Appels CTI / Click-to-Call
                          </span>
                        )}
                        {provider.supportsSms && (
                          <span className="text-indigo-600 font-semibold flex items-center gap-1">
                            • Envoi SMS & OTP
                          </span>
                        )}
                        {provider.lastTestedAt && (
                          <span>
                            Dernier test : {new Date(provider.lastTestedAt).toLocaleDateString('fr-FR')} {new Date(provider.lastTestedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-center">
                    {/* Test button */}
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTestConnection(provider)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      title="Tester l'authentification API en direct"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-600' : ''}`} />
                      <span>{isTesting ? 'Test en cours...' : 'Tester API'}</span>
                    </button>

                    {/* Set default voice */}
                    {provider.supportsVoice && !provider.isDefaultVoice && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultVoice(provider.id)}
                        className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-xl transition cursor-pointer"
                        title="Définir comme opérateur par défaut pour les appels sortants"
                      >
                        Par défaut (Voix)
                      </button>
                    )}

                    {/* Set default SMS */}
                    {provider.supportsSms && !provider.isDefaultSms && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultSms(provider.id)}
                        className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50 text-xs font-bold rounded-xl transition cursor-pointer"
                        title="Définir comme passerelle par défaut pour l'envoi de SMS"
                      >
                        Par défaut (SMS)
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => setEditingProvider(provider)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      title="Modifier les clés API et paramètres"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>

                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(provider.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        provider.enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {provider.enabled ? 'Actif' : 'Désactivé'}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Supprimer cet opérateur"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Test result bar */}
                {thisTestResult && (
                  <div className={`mx-5 mb-4 p-3 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 ${
                    thisTestResult.isSuccess
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {thisTestResult.isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{thisTestResult.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTestResult(null)}
                      className="text-slate-400 hover:text-slate-700 text-[11px]"
                    >
                      Fermer
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CONFIGURATION OPÉRATEUR */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configurer l'Opérateur Télécom
                  </h3>
                  <p className="text-xs text-slate-500">
                    Renseignez vos identifiants réels pour activer les appels et SMS directs.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingProvider(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nom de la ligne / Libellé
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProvider.name}
                    onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                    placeholder="ex: Ligne Principale Ringover"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Type de Fournisseur
                  </label>
                  <select
                    value={editingProvider.providerType}
                    onChange={(e) => {
                      const type = e.target.value as TelephonyProviderType;
                      const meta = PROVIDER_METADATA[type];
                      setEditingProvider({
                        ...editingProvider,
                        providerType: type,
                        supportsVoice: meta.defaultSupportsVoice,
                        supportsSms: meta.defaultSupportsSms
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RINGOVER">Ringover (CTI & SMS France)</option>
                    <option value="AIRCALL">Aircall (VoIP d'Entreprise)</option>
                    <option value="TWILIO">Twilio (Voice & SMS API)</option>
                    <option value="OVH">OVH Télécom (Lignes SIP & SMS)</option>
                    <option value="THREE_CX">3CX (PABX Webhook MakeCall)</option>
                    <option value="BREVO_SMS">Brevo / Sendinblue (SMS Transactionnels)</option>
                    <option value="GENERIC_SIP_TEL">Softphone Natif / Zoiper (Protocole tel:)</option>
                  </select>
                </div>
              </div>

              {/* TWILIO SPECIFIC FIELDS */}
              {editingProvider.providerType === 'TWILIO' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Identifiants de l'API Twilio
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account SID
                    </label>
                    <input
                      type="text"
                      value={editingProvider.accountSid || ''}
                      onChange={(e) => setEditingProvider({ ...editingProvider, accountSid: e.target.value })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Auth Token
                    </label>
                    <input
                      type="password"
                      value={editingProvider.apiKey || editingProvider.apiSecret || ''}
                      onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value, apiSecret: e.target.value })}
                      placeholder="Votre token secret Twilio"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              {/* RINGOVER SPECIFIC FIELDS */}
              {editingProvider.providerType === 'RINGOVER' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Clé d'API Ringover (Public API)
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clé API (Authorization Token)
                    </label>
                    <input
                      type="password"
                      value={editingProvider.apiKey || ''}
                      onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                      placeholder="Collez votre clé API générée dans le Dashboard Ringover"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* AIRCALL SPECIFIC FIELDS */}
              {editingProvider.providerType === 'AIRCALL' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Identifiants API Aircall
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        API ID
                      </label>
                      <input
                        type="text"
                        value={editingProvider.apiKey || ''}
                        onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                        placeholder="API ID Aircall"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        API Token
                      </label>
                      <input
                        type="password"
                        value={editingProvider.apiSecret || ''}
                        onChange={(e) => setEditingProvider({ ...editingProvider, apiSecret: e.target.value })}
                        placeholder="Token secret Aircall"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* BREVO SPECIFIC FIELDS */}
              {editingProvider.providerType === 'BREVO_SMS' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Clé API Brevo v3 (Transactional SMS)
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clé API v3 (xkeysib-...)
                    </label>
                    <input
                      type="password"
                      value={editingProvider.apiKey || ''}
                      onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                      placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* 3CX / WEBHOOK FIELDS */}
              {editingProvider.providerType === 'THREE_CX' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Adresse Serveur 3CX ou Webhook MakeCall
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      URL Webhook / Endpoint CTI
                    </label>
                    <input
                      type="url"
                      value={editingProvider.apiEndpoint || ''}
                      onChange={(e) => setEditingProvider({ ...editingProvider, apiEndpoint: e.target.value })}
                      placeholder="https://votre-3cx.fr:5001/api/makecall"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* COMMON FIELDS: CALLER ID & EXTENSION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Numéro Sortant / Caller ID
                  </label>
                  <input
                    type="text"
                    value={editingProvider.callerId || ''}
                    onChange={(e) => setEditingProvider({ ...editingProvider, callerId: e.target.value })}
                    placeholder="+33 1 23 45 67 89 ou ASSURANCES"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Numéro qui s'affiche sur le téléphone du client</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Poste / Extension Courtier
                  </label>
                  <input
                    type="text"
                    value={editingProvider.extensionUser || ''}
                    onChange={(e) => setEditingProvider({ ...editingProvider, extensionUser: e.target.value })}
                    placeholder="ex: 101 ou contact@cabinet.fr"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Pour le rappel automatique vers votre casque</span>
                </div>
              </div>

              {/* CAPABILITIES CHECKBOXES */}
              <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingProvider.supportsVoice}
                    onChange={(e) => setEditingProvider({ ...editingProvider, supportsVoice: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Supporte les Appels Voix (Click-to-Call)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingProvider.supportsSms}
                    onChange={(e) => setEditingProvider({ ...editingProvider, supportsSms: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Supporte l'envoi de SMS (OTP & Relances)</span>
                </label>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer la Ligne</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
