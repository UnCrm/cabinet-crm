import React, { useState, useMemo } from 'react';
import {
  Monitor,
  Download,
  Send,
  Mail,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  ExternalLink,
  X,
  Smartphone,
  Laptop,
  MessageCircle,
  AlertCircle,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import { User, CabinetInfo, SmtpConfig, getUserDisplayName } from '../types/crm';
import { loadSmtpConfig } from '../utils/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { buildCompleteEmailText } from '../utils/emailFooter';

export interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  users?: User[];
  cabinetInfo?: CabinetInfo;
  initialTargetUser?: User;
  initialTab?: 'SHARE' | 'INSTALL';
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = [],
  cabinetInfo,
  initialTargetUser,
  initialTab = 'SHARE'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'SHARE' | 'INSTALL'>(initialTab);

  // Selected collaborator or custom email
  const [selectedUserId, setSelectedUserId] = useState<string>(initialTargetUser?.id || '');
  const [customEmail, setCustomEmail] = useState<string>(initialTargetUser?.email || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullMsg, setCopiedFullMsg] = useState(false);

  // Email sending state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  // Get active install URL
  const appInstallUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin && !origin.includes('localhost') && origin.startsWith('http')) {
        return origin;
      }
      return window.location.href.split('?')[0].split('#')[0];
    }
    return 'https://ais-pre-q3wiozwiych5k2g36zt75q-417401120291.europe-west3.run.app';
  }, []);

  // Selected recipient
  const recipientUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || initialTargetUser || null;
  }, [users, selectedUserId, initialTargetUser]);

  const targetEmail = recipientUser ? recipientUser.email : customEmail;
  const recipientDisplayName = recipientUser
    ? getUserDisplayName(recipientUser)
    : customEmail ? customEmail.split('@')[0] : 'Collaborateur';

  // Effective SMTP config
  const effectiveSmtp: SmtpConfig = useMemo(() => {
    const cabinetSmtp = loadSmtpConfig();
    if (cabinetSmtp?.host?.trim() && cabinetSmtp?.username?.trim()) {
      return cabinetSmtp;
    }
    if (cabinetInfo?.smtpConfig?.host?.trim() && cabinetInfo?.smtpConfig?.username?.trim()) {
      return cabinetInfo.smtpConfig;
    }
    if (currentUser?.smtpConfig?.host?.trim() && currentUser?.smtpConfig?.username?.trim() && currentUser?.smtpConfig?.password?.trim()) {
      return currentUser.smtpConfig;
    }
    return cabinetSmtp;
  }, [currentUser, cabinetInfo]);

  // Invitation text
  const invitationSubject = `Installation de l'application ${cabinetInfo?.nomCabinet || 'CRM Courtage'} sur votre ordinateur`;

  const invitationBody = useMemo(() => {
    const cabinetName = cabinetInfo?.nomCabinet || 'Notre Cabinet de Courtage';
    const adminName = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "L'administrateur";

    return `Bonjour ${recipientDisplayName},

Votre administrateur ${adminName} vous invite à installer l'application de travail ${cabinetName} sur votre ordinateur (PC Windows ou Mac).

🚀 Pour installer l'application sur votre poste en 1 minute :

1. Cliquez sur ce lien d'installation (ouvrez-le dans Google Chrome ou Microsoft Edge) :
${appInstallUrl}

2. Connectez-vous avec votre adresse email professionnelle.

3. Pour ajouter l'icône sur votre Bureau :
• Dans Google Chrome / Microsoft Edge, cliquez sur le petit bouton « Installer l'application » qui apparaît tout à droite dans la barre d'adresse URL.
• (Ou cliquez sur le menu 3 points ⋮ en haut à droite > « Enregistrer et partager » > « Installer l'application »).

4. L'application démarre alors dans sa propre fenêtre indépendante sur votre Bureau Windows ou Mac, avec vos notifications et alertes en direct !

Cordialement,
${adminName}
${cabinetName}`;
  }, [recipientDisplayName, cabinetInfo, currentUser, appInstallUrl]);

  const invitationHtml = useMemo(() => {
    const cabinetName = cabinetInfo?.nomCabinet || 'Notre Cabinet de Courtage';
    const adminName = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "L'administrateur";

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Installation de votre Application de Travail</h1>
          <p style="margin: 0; font-size: 14px; color: #93c5fd;">${cabinetName}</p>
        </div>

        <div style="padding: 28px 24px; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0;">Bonjour <strong>${recipientDisplayName}</strong>,</p>
          <p>Votre administrateur <strong>${adminName}</strong> vous invite à installer l'application <strong>${cabinetName}</strong> directement sur votre ordinateur de travail (PC Windows ou Mac).</p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${appInstallUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.35);">
              👉 Accéder au CRM & Installer l'App
            </a>
            <p style="margin-top: 8px; font-size: 11px; color: #64748b; font-family: monospace;">${appInstallUrl}</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a; font-weight: bold;">
              💻 Étapes d'installation sur votre ordinateur :
            </h3>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Ouvrez le lien ci-dessus avec <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.</li>
              <li style="margin-bottom: 8px;">Connectez-vous à votre compte conseiller.</li>
              <li style="margin-bottom: 8px;">Cliquez sur l'icône <strong>« Installer l'application »</strong> située à droite dans la barre d'adresse de votre navigateur (ou via le menu à 3 points ⋮ &gt; <em>« Enregistrer et partager »</em> &gt; <em>« Installer »</em>).</li>
              <li>L'icône s'ajoute à votre Bureau et l'application s'ouvre en plein écran sans barre de navigation.</li>
            </ol>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            Besoin d'aide ? Rapprochez-vous de votre administrateur ou de votre support informatique interne.
          </p>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Message automatique envoyé depuis le panneau d'administration ${cabinetName}.
        </div>
      </div>
    `;
  }, [recipientDisplayName, cabinetInfo, currentUser, appInstallUrl]);

  // Actions
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appInstallUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(invitationBody);
      setCopiedFullMsg(true);
      setTimeout(() => setCopiedFullMsg(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSendViaMailto = () => {
    const emailWithFooter = buildCompleteEmailText(invitationBody, cabinetInfo || {}, {
      advisorName: currentUser ? getUserDisplayName(currentUser) : undefined,
      advisorEmail: currentUser?.email
    });
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail || '')}?subject=${encodeURIComponent(invitationSubject)}&body=${encodeURIComponent(emailWithFooter)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSendViaWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(invitationBody)}`;
    window.open(waUrl, '_blank');
  };

  const handleSendDirectEmail = async () => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setSendErrorMsg('Veuillez spécifier une adresse email destinataire valide.');
      return;
    }

    setIsSendingEmail(true);
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: effectiveSmtp,
          to: targetEmail,
          subject: invitationSubject,
          body: invitationBody,
          htmlBody: invitationHtml,
          cabinetInfo: cabinetInfo,
          advisorName: currentUser ? getUserDisplayName(currentUser) : undefined,
          advisorEmail: currentUser?.email
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'envoi de l'email via SMTP.");
      }

      setSendSuccessMsg(`Lien d'installation envoyé avec succès à ${targetEmail} !`);
    } catch (err: any) {
      console.error('Erreur envoi install link:', err);
      setSendErrorMsg(
        err.message ||
        "Impossible d'envoyer par SMTP direct. Vérifiez vos paramètres SMTP ou utilisez le bouton 'Ouvrir dans ma messagerie'."
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-4">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-2xl">
              <Monitor className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Installation & Déploiement sur Ordinateur
                </h2>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-[10px] font-bold rounded-full border border-blue-400/20">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Installez l'application sur votre poste ou transmettez le lien à vos collaborateurs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('SHARE')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'SHARE'
                ? 'bg-white text-blue-600 border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Envoyer le lien aux collaborateurs</span>
          </button>

          <button
            onClick={() => setActiveTab('INSTALL')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'INSTALL'
                ? 'bg-white text-blue-600 border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Installer sur cet ordinateur</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {activeTab === 'SHARE' && (
            <div className="space-y-5">
              {/* Feedback Alert Banners */}
              {sendSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-950">Email envoyé !</p>
                    <p className="text-emerald-800 mt-0.5">{sendSuccessMsg}</p>
                  </div>
                </div>
              )}

              {sendErrorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-950">Avis d'envoi SMTP</p>
                    <p className="text-rose-800 mt-0.5 leading-relaxed">{sendErrorMsg}</p>
                    <p className="mt-1.5 text-rose-700 font-semibold">
                      👉 Vous pouvez utiliser le bouton <strong>"Ouvrir dans ma messagerie"</strong> ci-dessous pour l'envoyer sans configuration SMTP.
                    </p>
                  </div>
                </div>
              )}

              {/* URL Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Lien direct d'accès et d'installation sur ordinateur :
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copier le lien</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-blue-700 break-all select-all">
                  {appInstallUrl}
                </div>
                <p className="text-[11px] text-slate-500">
                  Vos collaborateurs ouvrent ce lien dans Google Chrome ou Microsoft Edge pour installer l'application sur leur Bureau.
                </p>
              </div>

              {/* Recipient Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Destinataire de l'invitation d'installation :
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Choisir parmi vos collaborateurs :
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => {
                        const uid = e.target.value;
                        setSelectedUserId(uid);
                        const found = users.find((u) => u.id === uid);
                        if (found) {
                          setCustomEmail(found.email);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- Sélectionner un utilisateur --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {getUserDisplayName(u)} ({u.role}) - {u.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Ou saisir une adresse e-mail :
                    </label>
                    <input
                      type="email"
                      placeholder="nom.collaborateur@cabinet.fr"
                      value={customEmail}
                      onChange={(e) => {
                        setCustomEmail(e.target.value);
                        setSelectedUserId('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Aperçu du message transmis avec le guide d'installation :
                  </span>
                  <button
                    onClick={handleCopyFullMessage}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedFullMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Message copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le texte complet</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans leading-relaxed">
                  {invitationBody}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendViaWhatsApp}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                    title="Partager le lien et les instructions sur WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={handleSendViaMailto}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer"
                    title="Ouvrir dans votre logiciel de messagerie local (Outlook, Apple Mail, Thunderbird)"
                  >
                    <Mail className="w-4 h-4 text-slate-600" />
                    <span>Ouvrir dans ma messagerie</span>
                  </button>
                </div>

                <button
                  onClick={handleSendDirectEmail}
                  disabled={isSendingEmail || !targetEmail}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                  title="Envoie directement l'invitation par e-mail avec les instructions d'installation"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Envoyer l'invitation par E-mail</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'INSTALL' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <Laptop className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-extrabold text-blue-950 text-sm">
                    Installer sur ce poste de travail (PC ou Mac)
                  </h4>
                  <p className="text-blue-900 leading-relaxed">
                    L'installation crée une application indépendante avec son icône sur votre Bureau Windows ou dans le Launchpad Mac, sans les barres d'outils du navigateur.
                  </p>
                </div>
              </div>

              {/* Native Prompt Available */}
              {isInstallable && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-bold text-emerald-950">Navigateur compatible détecté !</p>
                    <p className="text-emerald-800">Vous pouvez installer l'application immédiatement en 1 clic.</p>
                  </div>
                  <button
                    onClick={install}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Installer sur ce PC</span>
                  </button>
                </div>
              )}

              {/* Instructions Chrome / Edge */}
              <div className="space-y-3 text-xs text-slate-700">
                <h5 className="font-bold text-slate-900 text-xs">
                  Procédure dans Google Chrome ou Microsoft Edge :
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-700 font-bold">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">1</span>
                      <span>Barre d'adresse</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Cliquez sur l'icône <strong>« Installer l'application »</strong> qui apparaît à l'extrémité droite de votre barre d'adresse URL.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[11px]">2</span>
                      <span>Ou via le Menu ⋮</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Cliquez sur les <strong>3 petits points ⋮</strong> en haut à droite &gt; <em>« Enregistrer et partager »</em> &gt; <em>« Installer InsureLead CRM »</em>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-blue-900 block">Ouvrir dans un onglet dédié pour installer :</span>
                    <span className="text-[11px] text-blue-700">Idéal si vous visualisez actuellement l'app dans un conteneur.</span>
                  </div>
                  <a
                    href={appInstallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span>Ouvrir en plein écran</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
