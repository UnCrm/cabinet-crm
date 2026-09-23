import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Sliders, 
  Check, 
  Save, 
  Send, 
  Key, 
  Server, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  ListFilter,
  Upload,
  Image as ImageIcon,
  PenTool,
  Users as UsersIcon,
  X,
  Plug,
  Car,
  Search,
  AlertTriangle,
  Cloud,
  CloudOff,
  Database,
  Smartphone,
  RefreshCw,
  Globe,
  Download,
  BellRing,
  Volume2,
  VolumeX,
  Vibrate,
  MessageSquare,
  CalendarClock,
  UserPlus,
  Play,
  Monitor,
  ExternalLink,
  PhoneCall,
  Share2
} from 'lucide-react';
import { CabinetInfo, SmtpConfig, EmailTemplate, StatusConfigItem, User, InsurancePartnerApiConfig } from '../types/crm';
import { UserManagementView } from './UserManagementView';
import { PartnerApiSettings } from './PartnerApiSettings';
import { TelephonySettings } from './TelephonySettings';
import { InstallAppModal } from './InstallAppModal';
import { downloadBackupJsonFile, restoreFullCrmBackup } from '../utils/storage';
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
  isInIframe,
  isStandaloneApp
} from '../utils/notifications';

const resizeLogoImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 480;
        const maxHeight = 240;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const dataUrl = canvas.toDataURL('image/webp', 0.88);
          resolve(dataUrl);
        } catch {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.onerror = () => reject(new Error('Image non reconnue'));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const resizeSignatureImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // High quality dimensions for sharp Retina rendering on phone and desktop: max width 650px
        const maxWidth = 650;
        const maxHeight = 320;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Enable smoothing for crisp fonts and graphics
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // ALWAYS export as image/png: universal email client support (Gmail, iOS, Outlook) + transparency support
        try {
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Image non reconnue'));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

interface SettingsPageProps {
  cabinetInfo: CabinetInfo;
  onSaveCabinetInfo: (info: CabinetInfo) => void;
  smtpConfig: SmtpConfig;
  onSaveSmtpConfig: (config: SmtpConfig) => void;
  emailTemplates: EmailTemplate[];
  onSaveEmailTemplates: (templates: EmailTemplate[]) => void;
  // Partner API Props
  partners: InsurancePartnerApiConfig[];
  onSavePartners: (partners: InsurancePartnerApiConfig[]) => void;
  // User Management Props
  users: User[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser?: (user: User) => void;
  teams?: string[];
  onSaveTeams?: (teams: string[]) => void;
  // Cloud Sync Props
  firebaseUser?: any;
  isCloudConnected?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime?: Date | null;
  syncError?: string | null;
  onConnectGoogle?: () => void;
  onDisconnectGoogle?: () => void;
  onForcePushAll?: () => void;
  totalLeadsCount?: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  cabinetInfo,
  onSaveCabinetInfo,
  smtpConfig,
  onSaveSmtpConfig,
  emailTemplates,
  onSaveEmailTemplates,
  partners,
  onSavePartners,
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onSwitchUser,
  teams = [],
  onSaveTeams,
  firebaseUser,
  isCloudConnected = false,
  syncStatus = 'idle',
  lastSyncTime,
  syncError,
  onConnectGoogle,
  onDisconnectGoogle,
  onForcePushAll,
  totalLeadsCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<'cabinet' | 'telephony' | 'smtp' | 'templates' | 'workflow' | 'users' | 'partners' | 'cloud' | 'notifications'>('cabinet');

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [notifSavedMsg, setNotifSavedMsg] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Cabinet Form State
  const [cabinetForm, setCabinetForm] = useState<CabinetInfo>(cabinetInfo);
  const [cabinetSavedMsg, setCabinetSavedMsg] = useState(false);

  // Workflow Config State
  const [statusesList, setStatusesList] = useState<StatusConfigItem[]>(
    cabinetInfo.customStatuses || [
      { id: 'NOUVEAU', label: 'Nouveau Lead' },
      { id: 'A_CONTACTER', label: 'À Contacter' },
      { id: 'DEVIS_ENVOYE', label: 'Devis Envoyé' },
      { id: 'RELANCE', label: 'Relance à faire' },
      { id: 'GAGNE', label: 'Souscrit / Gagné' },
      { id: 'PERDU', label: 'Perdu / Rejeté' }
    ]
  );

  const [nextActionsList, setNextActionsList] = useState<string[]>(
    cabinetInfo.customNextActions || [
      'Appel téléphonique',
      'Attente retour client',
      'Aucune action',
      'Relance devis',
      'Relance documents'
    ]
  );

  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newActionLabel, setNewActionLabel] = useState('');
  const [workflowSavedMsg, setWorkflowSavedMsg] = useState(false);

  useEffect(() => {
    setCabinetForm(cabinetInfo);
    if (cabinetInfo.customStatuses) {
      setStatusesList(cabinetInfo.customStatuses);
    }
    if (cabinetInfo.customNextActions) {
      setNextActionsList(cabinetInfo.customNextActions);
    }
  }, [cabinetInfo]);

  useEffect(() => {
    setSmtpForm(smtpConfig);
  }, [smtpConfig]);

  useEffect(() => {
    setTemplatesList(emailTemplates);
  }, [emailTemplates]);

  // SMTP Form State
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>(smtpConfig);
  const [smtpSavedMsg, setSmtpSavedMsg] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ isSuccess: boolean; message: string } | null>(null);

  // Email Templates State
  const [templatesList, setTemplatesList] = useState<EmailTemplate[]>(emailTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(emailTemplates[0]?.id || '');
  const [templatesSavedMsg, setTemplatesSavedMsg] = useState(false);

  const selectedTemplate = templatesList.find(t => t.id === selectedTemplateId) || templatesList[0];

  // SIV Configuration & Test State
  const [testingSiv, setTestingSiv] = useState(false);
  const [sivTestPlate, setSivTestPlate] = useState('FK-892-XZ');
  const [sivTestResult, setSivTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Sauvegarde CRM Locale & Restauration
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    downloadBackupJsonFile();
    setBackupSuccessMsg('Fichier de sauvegarde exporté avec succès ! Conservez ce fichier en lieu sûr.');
    setTimeout(() => setBackupSuccessMsg(null), 4000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || (!parsed.leads && !parsed.users)) {
          throw new Error('Format de fichier de sauvegarde invalide');
        }
        const ok = restoreFullCrmBackup(parsed);
        if (ok) {
          setBackupSuccessMsg('Sauvegarde restaurée avec succès ! Rechargement des données...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setBackupErrorMsg('Erreur lors de la réinjection des données de sauvegarde.');
        }
      } catch (err: any) {
        setBackupErrorMsg(err?.message || 'Erreur lors de la lecture du fichier JSON.');
        setTimeout(() => setBackupErrorMsg(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTestSiv = async () => {
    setTestingSiv(true);
    setSivTestResult(null);
    try {
      const res = await fetch('/api/test-siv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sivProvider: cabinetForm.sivProvider || 'AUTO_WAYS',
          sivApiToken: cabinetForm.sivApiToken || '',
          sivCustomEndpoint: cabinetForm.sivCustomEndpoint || '',
          testPlate: sivTestPlate
        })
      });
      const data = await res.json();
      setTestingSiv(false);
      if (data.success) {
        setSivTestResult({
          success: true,
          message: `Connexion SIV établie avec succès ! Véhicule détecté : ${data.vehicle?.marqueModele || data.vehicle?.marque || 'OK'}`,
          details: data.vehicle
        });
      } else {
        setSivTestResult({
          success: false,
          message: data.error || 'Erreur lors de l\'interrogation de l\'API SIV'
        });
      }
    } catch (err: any) {
      setTestingSiv(false);
      setSivTestResult({
        success: false,
        message: `Erreur de communication avec le serveur : ${err.message || 'Serveur indisponible'}`
      });
    }
  };

  const handleSaveCabinet = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCabinetInfo({
      ...cabinetForm,
      customStatuses: statusesList,
      customNextActions: nextActionsList
    });
    setCabinetSavedMsg(true);
    setTimeout(() => setCabinetSavedMsg(false), 2500);
  };

  const handleSaveWorkflow = () => {
    let finalStatuses = [...statusesList];
    if (newStatusLabel.trim()) {
      const newId = 'STATUT_' + Date.now();
      finalStatuses.push({ id: newId, label: newStatusLabel.trim() });
      setStatusesList(finalStatuses);
      setNewStatusLabel('');
    }

    let finalActions = [...nextActionsList];
    if (newActionLabel.trim() && !finalActions.includes(newActionLabel.trim())) {
      finalActions.push(newActionLabel.trim());
      setNextActionsList(finalActions);
      setNewActionLabel('');
    }

    const updatedCabinet = {
      ...cabinetForm,
      customStatuses: finalStatuses,
      customNextActions: finalActions
    };
    setCabinetForm(updatedCabinet);
    onSaveCabinetInfo(updatedCabinet);
    setWorkflowSavedMsg(true);
    setTimeout(() => setWorkflowSavedMsg(false), 3500);
  };

  const handleAddStatus = () => {
    const trimmed = newStatusLabel.trim();
    if (!trimmed) return;
    const newId = 'STATUT_' + Date.now();
    const updated = [...statusesList, { id: newId, label: trimmed }];
    setStatusesList(updated);
    setNewStatusLabel('');
    const updatedCabinet = {
      ...cabinetForm,
      customStatuses: updated,
      customNextActions: nextActionsList
    };
    setCabinetForm(updatedCabinet);
    onSaveCabinetInfo(updatedCabinet);
    setWorkflowSavedMsg(true);
    setTimeout(() => setWorkflowSavedMsg(false), 3500);
  };

  const handleRemoveStatus = (id: string) => {
    const updated = statusesList.filter(s => s.id !== id);
    setStatusesList(updated);
    const updatedCabinet = {
      ...cabinetForm,
      customStatuses: updated,
      customNextActions: nextActionsList
    };
    setCabinetForm(updatedCabinet);
    onSaveCabinetInfo(updatedCabinet);
  };

  const handleUpdateStatusLabel = (id: string, newLabel: string) => {
    const updated = statusesList.map(s => s.id === id ? { ...s, label: newLabel } : s);
    setStatusesList(updated);
    const updatedCabinet = {
      ...cabinetForm,
      customStatuses: updated,
      customNextActions: nextActionsList
    };
    setCabinetForm(updatedCabinet);
    onSaveCabinetInfo(updatedCabinet);
  };

  const handleAddNextAction = () => {
    const trimmed = newActionLabel.trim();
    if (!trimmed) return;
    if (nextActionsList.includes(trimmed)) return;
    const updated = [...nextActionsList, trimmed];
    setNextActionsList(updated);
    setNewActionLabel('');
    const updatedCabinet = {
      ...cabinetForm,
      customStatuses: statusesList,
      customNextActions: updated
    };
    setCabinetForm(updatedCabinet);
    onSaveCabinetInfo(updatedCabinet);
    setWorkflowSavedMsg(true);
    setTimeout(() => setWorkflowSavedMsg(false), 3500);
  };

  const handleRemoveNextAction = (action: string) => {
    const updated = nextActionsList.filter(a => a !== action);
    setNextActionsList(updated);
    const updatedCabinet = {
      ...cabinetForm,
      customStatuses: statusesList,
      customNextActions: updated
    };
    setCabinetForm(updatedCabinet);
    onSaveCabinetInfo(updatedCabinet);
  };

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    const isConfigured = Boolean(smtpForm.host?.trim() && smtpForm.username?.trim());
    const configToSave: SmtpConfig = {
      ...smtpForm,
      host: smtpForm.host?.trim() || '',
      username: smtpForm.username?.trim() || '',
      password: smtpForm.password?.trim() || '',
      senderEmail: (smtpForm.senderEmail?.trim() || smtpForm.username?.trim()) || '',
      senderName: (smtpForm.senderName?.trim() || cabinetForm.nomCabinet || cabinetForm.nomCourtierPrincipal || '').trim(),
      active: isConfigured ? (smtpForm.active ?? true) : Boolean(smtpForm.active)
    };
    setSmtpForm(configToSave);
    onSaveSmtpConfig(configToSave);
    setSmtpSavedMsg(true);
    setTimeout(() => setSmtpSavedMsg(false), 2500);
  };

  const handleTestSmtpConnection = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);

    const host = (smtpForm.host || '').trim().toLowerCase();
    if (host === 'mail.partenaireassurances.fr' || host === 'mail.horizon-courtage.fr') {
      setTestingSmtp(false);
      setSmtpTestResult({
        isSuccess: false,
        message: `L'adresse "${smtpForm.host}" est un domaine de démonstration fictif sans serveur mail actif. Veuillez renseigner le serveur SMTP de votre messagerie professionnelle (ex: ssl0.ovh.net, smtp.gmail.com, smtp.office365.com, smtp-relay.brevo.com). Utilisez les boutons de pré-remplissage rapide ci-dessous pour vous guider.`
      });
      return;
    }

    if (!smtpForm.password || smtpForm.password.includes('•••')) {
      setTestingSmtp(false);
      setSmtpTestResult({
        isSuccess: false,
        message: "Veuillez saisir votre véritable mot de passe SMTP ou mot de passe d'application dans le champ ci-dessous pour tester la connexion."
      });
      return;
    }

    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig: smtpForm }),
      });
      const data = await res.json();
      setTestingSmtp(false);

      if (data.success) {
        setSmtpTestResult({
          isSuccess: true,
          message: data.message || 'Connexion SMTP réussie ! Serveur actif et prêt pour l\'envoi réel des devis.'
        });
      } else {
        setSmtpTestResult({
          isSuccess: false,
          message: data.error || 'Impossible de se connecter au serveur SMTP'
        });
      }
    } catch (err: any) {
      setTestingSmtp(false);
      setSmtpTestResult({
        isSuccess: false,
        message: `Erreur réseau ou serveur : ${err.message || 'Impossible de joindre le serveur CRM'}`
      });
    }
  };

  const handleAddNewTemplate = () => {
    const newTmpl: EmailTemplate = {
      id: 'tmpl-' + Date.now(),
      name: 'Nouveau Modèle d\'email',
      subject: 'Votre devis d\'assurance N° {referenceDevis}',
      type: 'GENERAL',
      body: `Bonjour {civilite} {nom},\n\nSuite à notre échange, veuillez trouver ci-joint votre proposition d'assurance pour la formule {formule}.\n\nCotisation : {cotisation} € ({fractionnement}).\n\nCordialement,\n{nomCourtier}\n{nomCabinet}`,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    const updated = [...templatesList, newTmpl];
    setTemplatesList(updated);
    setSelectedTemplateId(newTmpl.id);
    onSaveEmailTemplates(updated);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templatesList.length <= 1) return;
    const updated = templatesList.filter(t => t.id !== id);
    setTemplatesList(updated);
    setSelectedTemplateId(updated[0]?.id || '');
    onSaveEmailTemplates(updated);
  };

  const handleUpdateCurrentTemplate = (key: keyof EmailTemplate, value: any) => {
    if (!selectedTemplate) return;
    setTemplatesList(prev => prev.map(t => t.id === selectedTemplate.id ? { ...t, [key]: value, updatedAt: new Date().toISOString().split('T')[0] } : t));
  };

  const handleSaveTemplates = () => {
    onSaveEmailTemplates(templatesList);
    setTemplatesSavedMsg(true);
    setTimeout(() => setTemplatesSavedMsg(false), 2500);
  };

  const insertVariableIntoTemplate = (variable: string) => {
    if (!selectedTemplate) return;
    handleUpdateCurrentTemplate('body', selectedTemplate.body + ' ' + variable);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paramètres du Cabinet & Outils CRM</h2>
          <p className="text-xs text-slate-500">Configurez votre identité de courtier, vos statuts & actions, serveurs mails SMTP et modèles de devis.</p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('cabinet')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cabinet' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Infos Cabinet</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'workflow' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Statuts & Actions</span>
          </button>

          <button
            onClick={() => setActiveTab('telephony')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'telephony' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <span>Téléphonie VoIP & SMS</span>
          </button>

          <button
            onClick={() => setActiveTab('smtp')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'smtp' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Config SMTP</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'templates' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Modèles d'Emails</span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'partners' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plug className="w-4 h-4" />
            <span>APIs & Tarificateurs Partenaires</span>
          </button>

          {currentUser.permissions.canManageUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'users' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              <span>Gestion Utilisateurs & Droits</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cloud'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Base Cloud & Terrain</span>
            {firebaseUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Notifications Chrome & PWA</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INFOS CABINET */}
      {activeTab === 'cabinet' && (
        <form onSubmit={handleSaveCabinet} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Informations Officielles du Cabinet de Courtage
            </h3>

            {cabinetSavedMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Enregistré et synchronisé sur le Cloud !
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Cabinet *</label>
              <input
                type="text"
                required
                value={cabinetForm.nomCabinet}
                onChange={(e) => setCabinetForm({ ...cabinetForm, nomCabinet: e.target.value })}
                onBlur={() => {
                  if (cabinetForm.nomCabinet.trim() && cabinetForm.nomCabinet !== cabinetInfo.nomCabinet) {
                    onSaveCabinetInfo({
                      ...cabinetForm,
                      customStatuses: statusesList,
                      customNextActions: nextActionsList,
                      updatedAt: new Date().toISOString()
                    });
                    setCabinetSavedMsg(true);
                    setTimeout(() => setCabinetSavedMsg(false), 2500);
                  }
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                N° Immatriculation ORIAS <span className="text-slate-400 font-normal">(Facultatif)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 12345678"
                value={cabinetForm.numeroOrias}
                onChange={(e) => setCabinetForm({ ...cabinetForm, numeroOrias: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                N° SIRET <span className="text-slate-400 font-normal">(Facultatif)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 123 456 789 00012"
                value={cabinetForm.siret}
                onChange={(e) => setCabinetForm({ ...cabinetForm, siret: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom Courtier Principal / Conseiller <span className="text-slate-400 font-normal">(Facultatif)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Tarik Cherkaoui"
                value={cabinetForm.nomCourtierPrincipal}
                onChange={(e) => setCabinetForm({ ...cabinetForm, nomCourtierPrincipal: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Contact</label>
              <input
                type="text"
                value={cabinetForm.telephone}
                onChange={(e) => setCabinetForm({ ...cabinetForm, telephone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Officiel</label>
              <input
                type="email"
                value={cabinetForm.emailContact}
                onChange={(e) => setCabinetForm({ ...cabinetForm, emailContact: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Adresse Voie & Complément</label>
              <input
                type="text"
                value={cabinetForm.adresse}
                onChange={(e) => setCabinetForm({ ...cabinetForm, adresse: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Code Postal & Ville</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={cabinetForm.codePostal}
                  onChange={(e) => setCabinetForm({ ...cabinetForm, codePostal: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
                <input
                  type="text"
                  value={cabinetForm.ville}
                  onChange={(e) => setCabinetForm({ ...cabinetForm, ville: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Mentions Légales & Pied de Devis</label>
              <textarea
                rows={3}
                value={cabinetForm.mentionsLegales}
                onChange={(e) => setCabinetForm({ ...cabinetForm, mentionsLegales: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 font-sans"
              ></textarea>
            </div>

            {/* Logo Section */}
            <div className="sm:col-span-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    Logo Officiel du Cabinet
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ce logo sera affiché en haut de votre CRM, sur les devis imprimables et dans les emails envoyés aux clients.
                  </p>
                </div>

                {cabinetForm.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...cabinetForm,
                        logoUrl: '',
                        customStatuses: statusesList,
                        customNextActions: nextActionsList,
                        updatedAt: new Date().toISOString()
                      };
                      setCabinetForm(updated);
                      onSaveCabinetInfo(updated);
                      setCabinetSavedMsg(true);
                      setTimeout(() => setCabinetSavedMsg(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer le logo</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Upload File Box */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Téléverser une image (PNG / JPG / WebP)</label>
                  <label className="flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white p-4 rounded-xl cursor-pointer transition text-center space-x-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-700">Parcourir / Choisir un fichier</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Veuillez sélectionner un fichier image inférieur à 5 Mo.');
                            return;
                          }
                          try {
                            const optimizedDataUrl = await resizeLogoImage(file);
                            const updated = {
                              ...cabinetForm,
                              logoUrl: optimizedDataUrl,
                              customStatuses: statusesList,
                              customNextActions: nextActionsList,
                              updatedAt: new Date().toISOString()
                            };
                            setCabinetForm(updated);
                            onSaveCabinetInfo(updated);
                            setCabinetSavedMsg(true);
                            setTimeout(() => setCabinetSavedMsg(false), 2500);
                          } catch (err) {
                            console.error('Erreur optimisation logo:', err);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const updated = {
                                ...cabinetForm,
                                logoUrl: reader.result as string,
                                customStatuses: statusesList,
                                customNextActions: nextActionsList,
                                updatedAt: new Date().toISOString()
                              };
                              setCabinetForm(updated);
                              onSaveCabinetInfo(updated);
                              setCabinetSavedMsg(true);
                              setTimeout(() => setCabinetSavedMsg(false), 2500);
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Direct URL Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ou indiquer l'URL directe d'une image</label>
                  <input
                    type="url"
                    value={cabinetForm.logoUrl || ''}
                    onChange={(e) => setCabinetForm({ ...cabinetForm, logoUrl: e.target.value })}
                    placeholder="https://exemple.com/logo-cabinet.png"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Logo Preview */}
              {cabinetForm.logoUrl && (
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Aperçu du logo :</span>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs inline-block">
                    <img
                      src={cabinetForm.logoUrl}
                      alt="Logo Cabinet"
                      className="h-12 max-w-[200px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Signature Visuelle / Image Section */}
            <div className="sm:col-span-3 p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <PenTool className="w-4 h-4 text-purple-600" />
                    Photo / Image de Signature d'Email (Bannière Graphique)
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Téléversez une image ou photo pour signer vos e-mails (format bannière, signature avec photo, coordonnées ou logo). Elle sera intégrée automatiquement à la fin de tous vos e-mails et s'adapte à 100% sur mobile et smartphones.
                  </p>
                </div>

                {cabinetForm.emailSignatureImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated: CabinetInfo = {
                        ...cabinetForm,
                        emailSignatureImageUrl: '',
                        customStatuses: statusesList,
                        customNextActions: nextActionsList,
                        updatedAt: new Date().toISOString()
                      };
                      setCabinetForm(updated);
                      onSaveCabinetInfo(updated);
                      setCabinetSavedMsg(true);
                      setTimeout(() => setCabinetSavedMsg(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer la signature</span>
                  </button>
                )}
              </div>

              {/* Mode de signature */}
              <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-800">
                  Mode d'affichage de la signature dans les e-mails :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      (!cabinetForm.emailSignatureMode || cabinetForm.emailSignatureMode === 'IMAGE')
                        ? 'border-purple-600 bg-purple-50/80 text-purple-900 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailSignatureMode"
                      value="IMAGE"
                      checked={!cabinetForm.emailSignatureMode || cabinetForm.emailSignatureMode === 'IMAGE'}
                      onChange={() => {
                        const updated: CabinetInfo = { ...cabinetForm, emailSignatureMode: 'IMAGE' };
                        setCabinetForm(updated);
                        onSaveCabinetInfo(updated);
                      }}
                      className="text-purple-600"
                    />
                    <span>Photo / Bannière seule (Recommandé)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      cabinetForm.emailSignatureMode === 'BOTH'
                        ? 'border-purple-600 bg-purple-50/80 text-purple-900 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailSignatureMode"
                      value="BOTH"
                      checked={cabinetForm.emailSignatureMode === 'BOTH'}
                      onChange={() => {
                        const updated: CabinetInfo = { ...cabinetForm, emailSignatureMode: 'BOTH' };
                        setCabinetForm(updated);
                        onSaveCabinetInfo(updated);
                      }}
                      className="text-purple-600"
                    />
                    <span>Photo + Mentions légales discrètes</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      cabinetForm.emailSignatureMode === 'TEXT'
                        ? 'border-purple-600 bg-purple-50/80 text-purple-900 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailSignatureMode"
                      value="TEXT"
                      checked={cabinetForm.emailSignatureMode === 'TEXT'}
                      onChange={() => {
                        const updated: CabinetInfo = { ...cabinetForm, emailSignatureMode: 'TEXT' };
                        setCabinetForm(updated);
                        onSaveCabinetInfo(updated);
                      }}
                      className="text-purple-600"
                    />
                    <span>Texte coordonnées générées seul</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Upload File Box */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Téléverser votre signature / photo (PNG, JPG, WebP)
                  </label>
                  <label className="flex items-center justify-center border-2 border-dashed border-purple-300 hover:border-purple-600 bg-white p-4 rounded-xl cursor-pointer transition text-center space-x-2">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-slate-800">Parcourir / Choisir un fichier</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 8 * 1024 * 1024) {
                            alert('Veuillez sélectionner un fichier image inférieur à 8 Mo.');
                            return;
                          }
                          try {
                            const optimizedDataUrl = await resizeSignatureImage(file);
                            const updated: CabinetInfo = {
                              ...cabinetForm,
                              emailSignatureImageUrl: optimizedDataUrl,
                              emailSignatureMode: cabinetForm.emailSignatureMode || 'IMAGE',
                              customStatuses: statusesList,
                              customNextActions: nextActionsList,
                              updatedAt: new Date().toISOString()
                            };
                            setCabinetForm(updated);
                            onSaveCabinetInfo(updated);
                            setCabinetSavedMsg(true);
                            setTimeout(() => setCabinetSavedMsg(false), 2500);
                          } catch (err) {
                            console.error('Erreur optimisation signature:', err);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const updated: CabinetInfo = {
                                ...cabinetForm,
                                emailSignatureImageUrl: reader.result as string,
                                emailSignatureMode: cabinetForm.emailSignatureMode || 'IMAGE',
                                customStatuses: statusesList,
                                customNextActions: nextActionsList,
                                updatedAt: new Date().toISOString()
                              };
                              setCabinetForm(updated);
                              onSaveCabinetInfo(updated);
                              setCabinetSavedMsg(true);
                              setTimeout(() => setCabinetSavedMsg(false), 2500);
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Direct URL Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ou indiquer l'URL directe d'une image en ligne
                  </label>
                  <input
                    type="url"
                    value={cabinetForm.emailSignatureImageUrl || ''}
                    onChange={(e) => {
                      const updated: CabinetInfo = { ...cabinetForm, emailSignatureImageUrl: e.target.value };
                      setCabinetForm(updated);
                      onSaveCabinetInfo(updated);
                    }}
                    placeholder="https://exemple.com/signature-courtier.png"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Signature Preview */}
              {cabinetForm.emailSignatureImageUrl && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">Aperçu de la signature téléversée :</span>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs inline-block max-w-full overflow-hidden">
                    <img
                      src={cabinetForm.emailSignatureImageUrl}
                      alt="Signature Email"
                      className="max-h-40 max-w-full object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Aperçu en direct du Pied de Page des Emails */}
            <div className="sm:col-span-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Aperçu Réception Mobile &amp; Desktop de vos e-mails
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Voici exactement comment vos clients visualisent la signature en bas de vos e-mails sur leur téléphone ou ordinateur.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200">
                  Actif sur tous les envois
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                {/* Mode Signature Image */}
                {cabinetForm.emailSignatureImageUrl && (!cabinetForm.emailSignatureMode || cabinetForm.emailSignatureMode === 'IMAGE') ? (
                  <div className="space-y-2">
                    <img
                      src={cabinetForm.emailSignatureImageUrl}
                      alt="Signature Email"
                      className="max-h-36 max-w-full object-contain rounded"
                    />
                    {(cabinetForm.numeroOrias || cabinetForm.mentionsLegales) && (
                      <div className="text-[10px] text-slate-400 pt-1">
                        {cabinetForm.numeroOrias && <span>ORIAS N° {cabinetForm.numeroOrias} • </span>}
                        {cabinetForm.nomCabinet && <span>{cabinetForm.nomCabinet} • </span>}
                        <span>Courtage en assurance sous le contrôle de l'ACPR.</span>
                      </div>
                    )}
                  </div>
                ) : cabinetForm.emailSignatureImageUrl && cabinetForm.emailSignatureMode === 'BOTH' ? (
                  <div className="space-y-3">
                    <img
                      src={cabinetForm.emailSignatureImageUrl}
                      alt="Signature Email"
                      className="max-h-36 max-w-full object-contain rounded"
                    />
                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
                      <div>
                        {cabinetForm.numeroOrias && <span className="font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2">ORIAS N° {cabinetForm.numeroOrias}</span>}
                        {cabinetForm.siret ? `SIRET : ${cabinetForm.siret} • ` : ''}
                        <span>{cabinetForm.nomCabinet || 'Le cabinet'} - Contrôle de l'ACPR (4 Place de Budapest, 75436 Paris).</span>
                      </div>
                      <div className="italic text-slate-400">
                        🔒 Avis de confidentialité : message strictement confidentiel protégé par le secret professionnel et le RGPD.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        {cabinetForm.logoUrl ? (
                          <img src={cabinetForm.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            🏛️
                          </div>
                        )}
                        <div>
                          {cabinetForm.nomCourtierPrincipal && (
                            <div className="font-bold text-slate-900 text-sm leading-tight">
                              {cabinetForm.nomCourtierPrincipal}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">
                            Conseiller Spécialisé • <strong className="text-blue-600">{cabinetForm.nomCabinet || 'Cabinet de Courtage'}</strong>
                          </div>
                        </div>
                      </div>

                      {cabinetForm.numeroOrias ? (
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs px-2.5 py-1 rounded-md font-bold font-mono">
                          ORIAS N° {cabinetForm.numeroOrias}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      {cabinetForm.telephone && (
                        <div>📞 <strong className="text-slate-700">Tél :</strong> {cabinetForm.telephone}</div>
                      )}
                      {cabinetForm.emailContact && (
                        <div>✉️ <strong className="text-slate-700">Email :</strong> {cabinetForm.emailContact}</div>
                      )}
                      {cabinetForm.adresse && (
                        <div className="sm:col-span-2">📍 <strong className="text-slate-700">Adresse :</strong> {cabinetForm.adresse}, {cabinetForm.codePostal} {cabinetForm.ville}</div>
                      )}
                      {cabinetForm.siteWeb && (
                        <div>🌐 <strong className="text-slate-700">Site :</strong> {cabinetForm.siteWeb}</div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
                      <div>
                        {cabinetForm.mentionsLegales || `${cabinetForm.nomCabinet || 'Le cabinet'} est un intermédiaire en assurance régi par le Code des Assurances et sous le contrôle de l'ACPR (4 Place de Budapest, 75436 Paris). ${cabinetForm.siret ? `SIRET : ${cabinetForm.siret}` : ''}`}
                      </div>
                      <div className="italic text-slate-400">
                        🔒 Avis de confidentialité : Ce message et ses pièces jointes sont protégés par le secret professionnel et le RGPD.
                      </div>
                      <div className="text-emerald-700">
                        🌱 Préservons l'environnement : n'imprimez ce message qu'en cas de stricte nécessité.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SIV API Configuration Section */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Service SIV Réel (Recherche Immatriculation Carte Grise)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Connectez votre clé d'API SIV officielle pour récupérer instantanément les caractéristiques techniques réelles des véhicules.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-bold">
                  SIV Certifié
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur d'accès SIV</label>
                  <select
                    value={cabinetForm.sivProvider || 'AUTO_WAYS'}
                    onChange={(e) => setCabinetForm({ ...cabinetForm, sivProvider: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="AUTO_WAYS">AutoWays API (api.autoways.fr)</option>
                    <option value="API_PLAQUE">ApiPlaqueImmatriculation (apiplaqueimmatriculation.com)</option>
                    <option value="CUSTOM">API SIV Personnalisée / Passerelle Privée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jeton / Clé API SIV (Token)</label>
                  <input
                    type="password"
                    value={cabinetForm.sivApiToken || ''}
                    onChange={(e) => setCabinetForm({ ...cabinetForm, sivApiToken: e.target.value })}
                    placeholder="Ex: autoways_live_sk_948192..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Connecteur certifié pour la récupération des caractéristiques techniques du véhicule.
                  </p>
                </div>
              </div>

              {cabinetForm.sivProvider === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Endpoint SIV Personnalisé</label>
                  <input
                    type="url"
                    value={cabinetForm.sivCustomEndpoint || ''}
                    onChange={(e) => setCabinetForm({ ...cabinetForm, sivCustomEndpoint: e.target.value })}
                    placeholder="https://api.monserveur-siv.fr/lookup"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono bg-white"
                  />
                </div>
              )}

              {/* SIV Live Test Tool */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    Tester la connexion à l'API SIV
                  </span>
                  <span className="text-[10px] text-slate-400">Plaque d'essai</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sivTestPlate}
                    onChange={(e) => setSivTestPlate(e.target.value.toUpperCase())}
                    placeholder="FK-892-XZ"
                    className="w-36 text-xs p-2 font-mono font-bold uppercase rounded-lg border border-slate-300 bg-slate-50 text-center"
                  />
                  <button
                    type="button"
                    disabled={testingSiv}
                    onClick={handleTestSiv}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    {testingSiv ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Vérification...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Tester l'API SIV</span>
                      </>
                    )}
                  </button>
                </div>

                {sivTestResult && (
                  <div className={`p-2.5 rounded-lg border text-xs ${
                    sivTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      {sivTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                      {sivTestResult.message}
                    </p>
                    {sivTestResult.details && (
                      <div className="mt-1 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-emerald-200">
                        <div><strong>Marque :</strong> {sivTestResult.details.marque}</div>
                        <div><strong>Modèle :</strong> {sivTestResult.details.modele}</div>
                        <div><strong>Énergie :</strong> {sivTestResult.details.energie}</div>
                        <div><strong>Puissance :</strong> {sivTestResult.details.puissanceFiscale} CV</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Synchronisation Cloud active (Firestore) • Se répercute automatiquement sur l'app bureau et Chrome</span>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer & Synchroniser sur le Cloud</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: STATUTS ET PROCHAINES ACTIONS */}
      {activeTab === 'workflow' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-blue-600" />
                Personnalisation des Statuts du Dossier & Choix des Prochaine Actions
              </h3>
              <p className="text-xs text-slate-500">
                Ajoutez, modifiez ou supprimez les statuts de qualification du CRM et les types de relances programmées. Les ajouts sont automatiquement synchronisés.
              </p>
            </div>

            {workflowSavedMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1.5 animate-pulse">
                <Check className="w-4 h-4 text-emerald-600" />
                Statuts et Actions synchronisés !
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Custom Dossier Statuses */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Statuts du Dossier (Pipeline & Kanban)</span>
                </h4>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {statusesList.length} statuts configurés
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {statusesList.map((st, idx) => (
                  <div key={st.id || idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={st.label}
                      onChange={(e) => handleUpdateStatusLabel(st.id, e.target.value)}
                      placeholder="Intitulé du statut"
                      className="flex-1 text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                    />
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold shrink-0">
                      Aperçu
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStatus(st.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer shrink-0"
                      title="Supprimer ce statut"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Status */}
              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStatus();
                    }
                  }}
                  placeholder="Nouveau statut (ex: Attente Pièces, Attente RIB)..."
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddStatus}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Right: Custom Next Action Choices */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Choix Prochaine Action Programmée
                </h4>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {nextActionsList.length} options disponibles
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {nextActionsList.map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
                    <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                      <span className="text-blue-500">📌</span>
                      <span>{action}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNextAction(action)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="Supprimer cette action"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Action */}
              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={newActionLabel}
                  onChange={(e) => setNewActionLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNextAction();
                    }
                  }}
                  placeholder="Nouvelle action (ex: Envoi RIB, Visite de risque)..."
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddNextAction}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Les nouveaux statuts et actions sont immédiatement disponibles dans tout le CRM (Kanban, Listes, Fiches).</span>
            </div>

            <div className="flex items-center gap-3">
              {workflowSavedMsg && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Statuts & Actions sauvegardés avec succès !
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveWorkflow}
                className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer ${
                  workflowSavedMsg ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {workflowSavedMsg ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>✓ Enregistré avec succès !</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder les Statuts & Actions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIG SMTP */}
      {activeTab === 'smtp' && (
        <form onSubmit={handleSaveSmtp} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              Paramétrage Serveur Mails & SMTP
            </h3>

            {smtpSavedMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Configuration SMTP sauvegardée !
              </span>
            )}
          </div>

          {/* Active Status & Scope Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <span>Serveur Messagerie Principal du Cabinet</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (smtpForm.active ?? true) ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {(smtpForm.active ?? true) ? '● Actif' : '○ Inactif'}
                  </span>
                </p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Ce serveur est utilisé par défaut par tous les collaborateurs et administrateurs du cabinet pour l'envoi de propositions commerciales, devis et rappels.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50/50 transition">
              <input
                type="checkbox"
                checked={smtpForm.active ?? true}
                onChange={(e) => setSmtpForm(prev => ({ ...prev, active: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                {(smtpForm.active ?? true) ? 'Serveur Activé' : 'Désactivé'}
              </span>
            </label>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">
              ⚡ Configuration rapide par fournisseur (remplissage automatique des serveurs & ports) :
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'OVHcloud', host: 'ssl0.ovh.net', port: 587, encryption: 'TLS' as const },
                { name: 'Google / Gmail', host: 'smtp.gmail.com', port: 587, encryption: 'TLS' as const },
                { name: 'Microsoft 365', host: 'smtp.office365.com', port: 587, encryption: 'TLS' as const },
                { name: 'Brevo (Sendinblue)', host: 'smtp-relay.brevo.com', port: 587, encryption: 'TLS' as const },
                { name: 'Ionos (1&1)', host: 'smtp.ionos.fr', port: 587, encryption: 'TLS' as const }
              ].map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSmtpForm(prev => ({
                      ...prev,
                      host: preset.host,
                      port: preset.port,
                      encryption: preset.encryption
                    }));
                    setSmtpTestResult(null);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition shadow-2xs"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Serveur SMTP (Host) *</label>
              <input
                type="text"
                required
                value={smtpForm.host}
                onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                placeholder="ssl0.ovh.net"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Port SMTP *</label>
              <input
                type="number"
                required
                value={smtpForm.port}
                onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                placeholder="587"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chiffrement Sécurité</label>
              <select
                value={smtpForm.encryption}
                onChange={(e) => setSmtpForm({ ...smtpForm, encryption: e.target.value as any })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
              >
                <option value="TLS">STARTTLS / TLS (Port 587)</option>
                <option value="SSL">SSL / TLS Direct (Port 465)</option>
                <option value="NONE">Aucun chiffrement (Port 25)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Identifiant / Email Utilisateur *</label>
              <input
                type="text"
                required
                value={smtpForm.username}
                onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                placeholder="devis@votredomaine.fr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mot de Passe SMTP ou Clé d'application *</label>
              <input
                type="password"
                value={smtpForm.password || ''}
                onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                placeholder="Mot de passe ou clé d'app (16 car.)"
              />
              <span className="text-[10px] text-amber-700 block mt-1">
                Gmail / Outlook : utilisez un <strong>Mot de passe d'application</strong> généré dans la sécurité de votre compte, et non votre mot de passe habituel.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nom d'expéditeur affiché</label>
              <input
                type="text"
                value={smtpForm.senderName}
                onChange={(e) => setSmtpForm({ ...smtpForm, senderName: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                placeholder="Horizon Courtage"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adresse Email Expéditeur (From)</label>
              <input
                type="email"
                value={smtpForm.senderEmail || smtpForm.username}
                onChange={(e) => setSmtpForm({ ...smtpForm, senderEmail: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                placeholder="contact@votrecabinet.fr"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Doit généralement correspondre à l'identifiant du compte SMTP.
              </span>
            </div>
          </div>

          {smtpTestResult && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 border ${
              smtpTestResult.isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {smtpTestResult.isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {smtpTestResult.isSuccess ? 'Connexion SMTP validée' : 'Résultat du test SMTP'}
                </p>
                <p className="font-normal leading-relaxed">{smtpTestResult.message}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestSmtpConnection}
              disabled={testingSmtp}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>{testingSmtp ? 'Test en cours...' : 'Tester la Connexion SMTP'}</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder les Accès SMTP</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: EMAIL TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Édition des Modèles d'Emails de Devis & Relances
            </h3>

            {templatesSavedMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Modèles mis à jour !
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Modèles ({templatesList.length}) :
                </span>
                <button
                  type="button"
                  onClick={handleAddNewTemplate}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nouveau</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {templatesList.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                      selectedTemplateId === tmpl.id
                        ? 'bg-blue-50 border-blue-400 font-bold text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 font-bold uppercase">
                        {tmpl.type}
                      </span>
                    </div>
                    <div className="truncate font-semibold">{tmpl.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Editor */}
            {selectedTemplate && (
              <div className="lg:col-span-3 space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Modèle</label>
                    <input
                      type="text"
                      value={selectedTemplate.name}
                      onChange={(e) => handleUpdateCurrentTemplate('name', e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie / Produit</label>
                    <select
                      value={selectedTemplate.type}
                      onChange={(e) => handleUpdateCurrentTemplate('type', e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="GENERAL">GÉNÉRAL</option>
                      <option value="AUTO">AUTO</option>
                      <option value="HABITATION">HABITATION</option>
                      <option value="VTC">VTC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sujet du Message</label>
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    onChange={(e) => handleUpdateCurrentTemplate('subject', e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                {/* Chips helper for variables */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Cliquer pour insérer une variable dynamique :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '{civilite}',
                      '{prenom}',
                      '{nom}',
                      '{referenceDevis}',
                      '{formule}',
                      '{cotisation}',
                      '{cotisationMois}',
                      '{fractionnement}',
                      '{immatriculation}',
                      '{marqueModele}',
                      '{options}',
                      '{telephoneCabinet}',
                      '{nomCabinet}'
                    ].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariableIntoTemplate(v)}
                        className="px-2 py-1 bg-slate-50 hover:bg-blue-50 border border-slate-300 hover:border-blue-500 text-slate-800 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Corps de l'Email</label>
                  <textarea
                    rows={11}
                    value={selectedTemplate.body}
                    onChange={(e) => handleUpdateCurrentTemplate('body', e.target.value)}
                    className="w-full text-xs font-mono p-4 rounded-xl border border-slate-300 bg-white leading-relaxed focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                {/* Information sur le Pied de Page Professionnel Automatique */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="font-bold text-slate-900">
                        Pied de page professionnel officiel du cabinet
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Inclus à chaque envoi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Vous n'avez pas besoin d'ajouter manuellement vos coordonnées dans chaque modèle : le CRM appose automatiquement à la fin de tous vos emails (devis, propositions tarifaires, relances) le pied de page professionnel officiel avec le nom du cabinet (<strong>{cabinetInfo.nomCabinet || 'Cabinet'}</strong>), le conseiller dédié, téléphone, courriel, adresse, N° ORIAS (<strong>{cabinetInfo.numeroOrias || 'En cours'}</strong>), mentions réglementaires ACPR, secret professionnel et RGPD.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                  {templatesList.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                      className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer le modèle</span>
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={handleSaveTemplates}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder les modifications</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: GESTION UTILISATEURS ET DROITS */}
      {activeTab === 'users' && (
        <UserManagementView
          users={users}
          currentUser={currentUser}
          onSaveUser={onSaveUser}
          onDeleteUser={onDeleteUser}
          onSwitchUser={onSwitchUser}
          teams={teams}
          onSaveTeams={onSaveTeams}
          cabinetInfo={cabinetInfo}
        />
      )}

      {/* TAB TELEPHONY: VOIP, CTI ET SMS MULTI-FOURNISSEURS */}
      {activeTab === 'telephony' && (
        <TelephonySettings
          cabinetInfo={cabinetInfo}
          onSaveCabinetInfo={onSaveCabinetInfo}
        />
      )}

      {/* TAB 6: TARIFICATEURS ET APIS PARTENAIRES */}
      {activeTab === 'partners' && (
        <PartnerApiSettings
          partners={partners}
          onSavePartners={onSavePartners}
        />
      )}

      {/* TAB 7: BASE CLOUD FIREBASE & SYNCHRONISATION TERRAIN */}
      {activeTab === 'cloud' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-600" />
                Base de Données Cloud Firebase & Synchronisation Terrain
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralisez vos leads, devis et utilisateurs en temps réel entre le bureau et les agents sur le terrain.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                firebaseUser
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${firebaseUser ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{firebaseUser ? 'Synchronisation Cloud Active' : 'Mode Local (Non synchronisé au Cloud)'}</span>
              </span>
            </div>
          </div>

          {/* Diagnostic & Auth Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Account Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Compte Administrateur Cloud</span>
                  <GoogleIcon />
                </div>
                {firebaseUser ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 break-all">{firebaseUser.email}</p>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Session Google authentifiée
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">Aucun compte Google connecté</p>
                    <p className="text-[11px] text-slate-400">Connectez Google pour activer la réplication cloud multi-appareils.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                {firebaseUser ? (
                  <button
                    type="button"
                    onClick={onDisconnectGoogle}
                    className="w-full py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Déconnecter le compte
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectGoogle}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Se connecter avec Google</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cloud Database Metrics */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Base Firestore Cloud</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500">Projet GCP :</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">gen-lang-client-0568526458</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500">Région :</span>
                    <span className="font-bold text-slate-800">europe-west1 (Belgique)</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500">Leads en base :</span>
                    <span className="font-bold text-blue-600 text-sm">{totalLeadsCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Utilisateurs actifs :</span>
                    <span className="font-bold text-slate-800">{users.length}</span>
                  </div>
                </div>
              </div>

              {lastSyncTime && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                  Dernier échange : {lastSyncTime.toLocaleTimeString('fr-FR')}
                </div>
              )}
            </div>

            {/* Manual Sync Trigger */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Synchronisation Forcée</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pousse immédiatement l'intégralité des leads, clients et utilisateurs enregistrés dans le navigateur vers la base Firestore Cloud.
                </p>
                {syncError && (
                  <p className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {syncError}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onForcePushAll}
                  disabled={syncStatus === 'syncing'}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>{syncStatus === 'syncing' ? 'Synchronisation en cours...' : 'Envoyer tout vers le Cloud'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sauvegarde Intégrale Locale & Sécurité des Données */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-800">Sauvegarde Intégrale du CRM (Fichier JSON sécurisé)</h4>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl">
                  Protégez vos données existantes (dossiers clients, équipe, statuts, historique des connexions et messages). Téléchargez une copie de secours complète à tout moment ou réinjectez-la pour restaurer l'état exact de votre CRM.
                </p>
                {backupSuccessMsg && (
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {backupSuccessMsg}
                  </p>
                )}
                {backupErrorMsg && (
                  <p className="text-xs font-semibold text-rose-700 bg-rose-100/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    {backupErrorMsg}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Exporter Sauvegarde (.json)</span>
                </button>

                <label className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-white" />
                  <span>Restaurer une Sauvegarde</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Déploiement & Sous-domaine personnalisé */}
          <div className="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  Déploiement sous votre propre Nom de Domaine ou Sous-Domaine
                </h4>
                <p className="text-xs text-slate-600">
                  Connectez votre CRM à votre sous-domaine professionnel (ex: <code>crm.votrecabinet.fr</code> ou <code>app.votrecabinet.com</code>).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[11px]">1</span>
                  <span>Option A : Déploiement Cloud Run (Recommandé)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Dans le menu supérieur de Google AI Studio, cliquez sur <strong>Deploy &gt; Cloud Run</strong>. Une fois déployé, vous pouvez ajouter votre domaine personnalisé dans la console Google Cloud Run (section <em>Intégrations &gt; Domaines personnalisés</em>) en ajoutant simplement un enregistrement <strong>CNAME</strong> chez votre registraire (OVH, Ionos, Hostinger, Cloudflare).
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px]">2</span>
                  <span>Option B : Hébergement Firebase Hosting</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Votre projet Firebase <code>gen-lang-client-0568526458</code> supporte nativement Firebase Hosting. Dans la console Firebase (Hosting &gt; Ajouter un domaine personnalisé), saisissez votre sous-domaine pour générer automatiquement les certificats SSL HTTPS gratuits et pointer vos DNS.
                </p>
              </div>
            </div>
          </div>

          {/* Guide for Field Testing */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Comment tester le CRM sur le terrain en conditions réelles ?</h4>
                <p className="text-xs text-slate-300">Guide pratique pour les commerciaux et téléprospecteurs mobiles.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">1</div>
                <h5 className="font-bold text-xs text-white">Accès Mobile & Tablette</h5>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Ouvrez l'URL de votre application sur le navigateur de votre smartphone (Safari sur iOS ou Chrome sur Android). Le CRM s'adapte automatiquement à l'écran tactile.
                </p>
              </div>

              <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">2</div>
                <h5 className="font-bold text-xs text-white">Saisie & Rappels en Direct</h5>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Créez un prospect lors d'un rendez-vous, modifiez son statut ("Souscrit", "Relance"), ajoutez des notes et programmez un rappel d'échéance.
                </p>
              </div>

              <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">3</div>
                <h5 className="font-bold text-xs text-white">Synchronisation Instantanée</h5>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Toutes les modifications effectuées sur le terrain apparaissent en temps réel sur les postes de travail du bureau sans nécessiter de rafraîchissement manuel.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: NOTIFICATIONS CHROME & APP INSTALLER (PWA) */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-2xl shadow-sm border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-400 shadow-md">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Centre de Notifications Chrome & Application Installée</h3>
                  {isStandaloneApp() ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      PWA Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                      Navigateur Chrome
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  Configurez vos alertes système natives, le volume, les carillons sonores et l'épinglage des rappels clients.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsTestingNotif(true);
                  testChatNotification();
                  setTimeout(() => setIsTestingNotif(false), 2000);
                }}
                disabled={isTestingNotif}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isTestingNotif ? 'Envoi du test...' : 'Tester une notification'}</span>
              </button>
            </div>
          </div>

          {/* Iframe Notice if preview mode */}
          {isInIframe() && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Prévisualisation iframe détectée</h4>
                  <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                    Pour des raisons de sécurité, Google Chrome bloque la demande de permissions de notification à l'intérieur d'un cadre iframe. Pour tester les notifications en conditions réelles, ouvrez le CRM dans un onglet autonome :
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
                  <span>Ouvrir dans Google Chrome</span>
                </a>
              </div>
            </div>
          )}

          {/* Grid of Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Autorisations & Statut Système */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Autorisation du Navigateur
                </h4>
                {notifPermission === 'granted' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autorisée
                  </span>
                ) : notifPermission === 'denied' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    Bloquée
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Non demandée
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {notifPermission === 'granted'
                  ? 'Vos alertes sont actives : vous recevrez les alertes de messages, les rappels et les nouveaux prospects directement sur Windows et Chrome.'
                  : notifPermission === 'denied'
                  ? 'Les notifications sont actuellement bloquées par Google Chrome pour ce site. Suivez les étapes ci-dessous pour les autoriser.'
                  : 'Autorisez le CRM à vous envoyer des alertes sonores et des bannières même si la fenêtre est réduite.'}
              </p>

              {notifPermission !== 'granted' && (
                <button
                  onClick={async () => {
                    const res = await requestNotificationPermission();
                    setNotifPermission(res);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Demander l'autorisation à Google Chrome</span>
                </button>
              )}

              {notifPermission === 'denied' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-bold">Débloquer dans Chrome :</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-rose-800">
                    <li>Cliquez sur l'icône 🔒 à gauche de l'adresse URL dans Chrome.</li>
                    <li>Activez l'option <strong>Notifications</strong>.</li>
                    <li>Actualisez la page (F5).</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Card 2: Sonnerie & Volume Audio */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  Carillon Audio & Synthétiseur
                </h4>
                {notifSavedMsg && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enregistré
                  </span>
                )}
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Activer le son des notifications</span>
                  <p className="text-[11px] text-slate-500">Joue un carillon mélodieux lors de nouveaux messages ou rappels</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.soundEnabled}
                    onChange={(e) => {
                      const updated = saveNotificationPreferences({ soundEnabled: e.target.checked });
                      setNotifPrefs(updated);
                      setNotifSavedMsg(true);
                      setTimeout(() => setNotifSavedMsg(false), 2000);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Volume Slider */}
              {notifPrefs.soundEnabled && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Volume :</span>
                    <span className="font-mono font-bold text-indigo-600">{Math.round(notifPrefs.soundVolume * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={notifPrefs.soundVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      const updated = saveNotificationPreferences({ soundVolume: vol });
                      setNotifPrefs(updated);
                    }}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>
              )}

              {/* Sound Presets */}
              {notifPrefs.soundEnabled && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Mélodie par défaut :</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'modern', label: 'Moderne (Slack)', desc: 'Arpège velouté', icon: '🎶' },
                      { id: 'urgent', label: 'Alerte Vive', desc: 'Double bip récurrent', icon: '🚨' },
                      { id: 'bell', label: 'Cloche Cristal', desc: 'Discret et doux', icon: '🔔' },
                      { id: 'success', label: 'Accord Majeur', desc: 'Triomphe & contrat', icon: '⭐' }
                    ].map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => {
                          const updated = saveNotificationPreferences({ soundPreset: preset.id as SoundPreset });
                          setNotifPrefs(updated);
                        }}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          notifPrefs.soundPreset === preset.id
                            ? 'bg-indigo-50 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{preset.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{preset.label}</p>
                            <p className="text-[10px] text-slate-500">{preset.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playNotificationChime(preset.id as SoundPreset, notifPrefs.soundVolume);
                          }}
                          className="p-1 rounded text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                          title="Écouter"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Comportement & Événements Déclencheurs */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Options Avancées d'Affichage & Filtres d'Événements
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Require Interaction */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block">Épinglage sur l'écran (requireInteraction)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Maintient la bannière de notification affichée dans Windows et Chrome jusqu'à ce que vous cliquiez dessus pour ne rater aucune relance.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.requireInteraction}
                    onChange={(e) => {
                      const updated = saveNotificationPreferences({ requireInteraction: e.target.checked });
                      setNotifPrefs(updated);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0 mt-1"
                  />
                </div>

                {/* Vibrate */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <Vibrate className="w-3.5 h-3.5 text-indigo-600" />
                      Vibration Haptique (Smartphones & Tablettes)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fait vibrer l'appareil lors de la réception d'un rappel ou d'un message en situation de mobilité.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.vibrateEnabled}
                    onChange={(e) => {
                      const updated = saveNotificationPreferences({ vibrateEnabled: e.target.checked });
                      setNotifPrefs(updated);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0 mt-1"
                  />
                </div>

                {/* Chat Messages */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      Alertes Messages du Chat Interne
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Affiche une notification avec le nom de l'expéditeur et le contenu du message en direct.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyChat}
                    onChange={(e) => {
                      const updated = saveNotificationPreferences({ notifyChat: e.target.checked });
                      setNotifPrefs(updated);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0 mt-1"
                  />
                </div>

                {/* Reminders */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                      Alertes Rappels & Relances Clients
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Alerte dès qu'une action planifiée arrive à échéance ou est en retard aujourd'hui.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyReminders}
                    onChange={(e) => {
                      const updated = saveNotificationPreferences({ notifyReminders: e.target.checked });
                      setNotifPrefs(updated);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0 mt-1"
                  />
                </div>

                {/* New Leads */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                      Alertes Nouveaux Leads
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Notification immédiate avec nom et produit dès qu'un prospect vous est assigné.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyNewLeads}
                    onChange={(e) => {
                      const updated = saveNotificationPreferences({ notifyNewLeads: e.target.checked });
                      setNotifPrefs(updated);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0 mt-1"
                  />
                </div>

              </div>
            </div>

            {/* Card 4: Installation de l'App Standalone PWA */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Pourquoi et comment installer le CRM comme Application de Bureau ?</h4>
                  <p className="text-xs text-slate-300">Profitez d'une expérience native sans barre d'adresse et d'un affichage plein écran.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">1</div>
                  <h5 className="font-bold text-white">Sur Google Chrome / Edge</h5>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Cliquez sur le bouton "Installer l'App" dans la barre supérieure ou sur l'icône d'ordinateur à droite de la barre d'adresse du navigateur.
                  </p>
                </div>

                <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">2</div>
                  <h5 className="font-bold text-white">Lancement & Raccourci Bureau</h5>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Une icône CRM s'ajoute à votre Bureau Windows et à votre barre des tâches. Le CRM se lance instantanément en fenêtre indépendante.
                  </p>
                </div>

                <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">3</div>
                  <h5 className="font-bold text-white">Sur iPhone & iPad (Safari)</h5>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Touchez le bouton Partager 📤 dans Safari, puis sélectionnez <strong>"Sur l'écran d'accueil"</strong> pour l'ajouter comme une application iOS.
                  </p>
                </div>
              </div>

              {/* Action Déploiement Administrateur */}
              {currentUser?.role === 'ADMIN' && (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Déploiement sur le parc informatique de l'équipe :
                    </span>
                    <span className="text-[11.5px] text-slate-300">
                      Envoyez directement le lien d'accès et les instructions aux postes de vos collaborateurs.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInstallModal(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Envoyer le lien d'installation aux collaborateurs</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal d'installation et partage PWA */}
      {showInstallModal && (
        <InstallAppModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          currentUser={currentUser}
          users={users}
          cabinetInfo={cabinetInfo}
          initialTab="SHARE"
        />
      )}
    </div>
  );
};

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

