import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  User as UserIcon,
  Building2,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { 
  Lead, 
  User as UserType, 
  CabinetInfo, 
  ActivityLogItem, 
  NoteItem, 
  LeadStatus,
  getUserDisplayName 
} from '../types/crm';

interface QuickEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  currentUser?: UserType;
  cabinetInfo?: CabinetInfo;
  onUpdateLead?: (updatedLead: Lead) => void;
  onUpdateStatus?: (leadId: string, status: LeadStatus) => void;
}

interface EmailPreset {
  id: string;
  label: string;
  subject: string;
  body: string;
  badge: string;
}

export const QuickEmailModal: React.FC<QuickEmailModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  cabinetInfo,
  onUpdateLead,
  onUpdateStatus
}) => {
  if (!isOpen) return null;

  const senderDisplayName = currentUser ? getUserDisplayName(currentUser) : 'Conseiller Dédié';
  const effectiveSmtp = (currentUser?.smtpConfig?.useDedicatedSmtp && currentUser.smtpConfig.host)
    ? currentUser.smtpConfig
    : cabinetInfo?.smtpConfig;

  const presets: EmailPreset[] = [
    {
      id: 'RELANCE_DEVIS',
      label: 'Relance Devis',
      badge: 'Devis',
      subject: `Votre devis d'assurance ${lead.type} - Réf ${lead.referenceDevis} (${cabinetInfo?.nomCabinet || 'Cabinet'})`,
      body: `Bonjour ${lead.civilite || ''} ${lead.nom},\n\nSuite à notre récent échange concernant votre projet d'assurance ${lead.type}, je vous recontacte afin de faire le point sur vos besoins et vous confirmer que votre devis réf. ${lead.referenceDevis} est toujours valable.\n\nRestant à votre entière disposition pour toute précision ou pour finaliser votre dossier,\n\nBien cordialement,`
    },
    {
      id: 'CONFIRMATION_RDV',
      label: 'Confirmation RDV',
      badge: 'Rendez-vous',
      subject: `Confirmation de notre rendez-vous téléphonique - ${cabinetInfo?.nomCabinet || 'Cabinet d\'assurance'}`,
      body: `Bonjour ${lead.civilite || ''} ${lead.nom},\n\nJe vous confirme notre rendez-vous téléphonique afin d'étudier ensemble les meilleures garanties pour votre contrat d'assurance ${lead.type}.\n\nSi vous avez des pièces complémentaires ou des questions particulières, n'hésitez pas à me répondre directement à cet email.\n\nÀ très bientôt,`
    },
    {
      id: 'DEMANDE_PIECES',
      label: 'Demande de pièces',
      badge: 'Pièces',
      subject: `Pièces justificatives pour la souscription de votre contrat - Réf ${lead.referenceDevis}`,
      body: `Bonjour ${lead.civilite || ''} ${lead.nom},\n\nAfin de procéder à la finalisation et à l'émission de votre contrat d'assurance ${lead.type} (Réf. ${lead.referenceDevis}), pourriez-vous s'il vous plaît nous transmettre par retour d'email les documents suivants :\n\n- Copie de votre pièce d'identité (CNI ou Passeport)\n- Relevé d'Identité Bancaire (RIB) pour les prélèvements\n${lead.type === 'AUTO' || lead.type === 'VTC' ? '- Copie recto/verso de votre Permis de Conduire\n- Certificat d\'immatriculation (Carte Grise)\n- Relevé d\'information des 36 derniers mois\n' : ''}- Tout justificatif utile mentionné lors de notre entretien\n\nNous restons à votre disposition pour toute question,\n\nCordialement,`
    },
    {
      id: 'PRISE_CONTACT',
      label: 'Premier Contact',
      badge: 'Contact',
      subject: `Votre demande d'assurance ${lead.type} - Cabinet ${cabinetInfo?.nomCabinet || 'd\'assurance'}`,
      body: `Bonjour ${lead.civilite || ''} ${lead.nom},\n\nJ'ai bien reçu votre demande concernant une assurance ${lead.type}. En tant que votre conseiller dédié, je serais ravi d'échanger avec vous afin d'affiner vos garanties et de vous faire bénéficier de nos meilleures conditions tarifaires.\n\nQuel moment de la journée vous conviendrait le mieux pour un rapide échange par téléphone ?\n\nBien à vous,`
    },
    {
      id: 'LIBRE',
      label: 'Message libre',
      badge: 'Personnalisé',
      subject: `Votre dossier d'assurance ${lead.type} - Réf ${lead.referenceDevis}`,
      body: `Bonjour ${lead.civilite || ''} ${lead.nom},\n\n\n\nCordialement,`
    }
  ];

  const [selectedPresetId, setSelectedPresetId] = useState<string>('RELANCE_DEVIS');
  const [subject, setSubject] = useState<string>(presets[0].subject);
  const [body, setBody] = useState<string>(presets[0].body);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSelectPreset = (p: EmailPreset) => {
    setSelectedPresetId(p.id);
    setSubject(p.subject);
    setBody(p.body);
  };

  const handleSendSmtp = async () => {
    if (!lead.email || !lead.email.includes('@')) {
      setFeedback({
        type: 'error',
        message: "L'adresse email du prospect est invalide ou absente."
      });
      return;
    }

    if (!effectiveSmtp || !effectiveSmtp.host || !effectiveSmtp.username) {
      setFeedback({
        type: 'error',
        message: "Aucun serveur SMTP n'est configuré pour ce compte. Vous pouvez utiliser le bouton 'Ouvrir dans le client email' ou configurer le serveur SMTP dans la gestion des utilisateurs / paramètres."
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: effectiveSmtp,
          to: lead.email,
          subject: subject,
          body: body,
          cabinetInfo: cabinetInfo,
          advisorName: senderDisplayName,
          advisorEmail: effectiveSmtp.senderEmail || currentUser?.email,
          advisorPhone: currentUser?.telephonyConfig?.directNumber || cabinetInfo?.telephone,
          signatureImageUrl: cabinetInfo?.emailSignatureImageUrl,
          signatureMode: cabinetInfo?.emailSignatureMode,
          attachments: []
        })
      });

      const data = await res.json();

      if (!data.success) {
        setIsSending(false);
        setFeedback({
          type: 'error',
          message: data.error || "Échec de l'envoi de l'email via le serveur SMTP."
        });
        return;
      }

      // Record in lead history and notes
      const timestamp = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const newActivity: ActivityLogItem = {
        id: 'act-email-' + Date.now(),
        type: 'EMAIL_SENT',
        title: `Email direct envoyé : ${subject}`,
        description: `Envoyé à <${lead.email}> par ${senderDisplayName} via ${effectiveSmtp.host} (${effectiveSmtp.senderEmail || effectiveSmtp.username})\n\n${body}`,
        author: senderDisplayName,
        date: timestamp,
        metadata: {
          emailSubject: subject,
          emailRecipient: lead.email
        }
      };

      const newNote: NoteItem = {
        id: 'note-email-' + Date.now(),
        author: senderDisplayName,
        date: timestamp,
        content: `[Email envoyé à ${lead.email}] Sujet : ${subject}`
      };

      const updatedLead: Lead = {
        ...lead,
        notes: [newNote, ...(lead.notes || [])],
        historyLogs: [newActivity, ...(lead.historyLogs || [])],
        updatedAt: new Date().toISOString()
      };

      if (onUpdateLead) {
        onUpdateLead(updatedLead);
      }

      if (onUpdateStatus && lead.status === 'NOUVEAU') {
        onUpdateStatus(lead.id, 'CONTACTE');
      }

      setIsSending(false);
      setFeedback({
        type: 'success',
        message: `Email envoyé avec succès à ${lead.email} !`
      });

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setIsSending(false);
      setFeedback({
        type: 'error',
        message: `Erreur de communication avec le serveur : ${err.message || 'Serveur indisponible'}`
      });
    }
  };

  const handleLaunchMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    // Record activity
    const timestamp = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newActivity: ActivityLogItem = {
      id: 'act-email-' + Date.now(),
      type: 'EMAIL_SENT',
      title: `Email préparé (client de messagerie) : ${subject}`,
      description: `Ouverture de la messagerie par ${senderDisplayName} pour <${lead.email}>.`,
      author: senderDisplayName,
      date: timestamp
    };

    if (onUpdateLead) {
      onUpdateLead({
        ...lead,
        historyLogs: [newActivity, ...(lead.historyLogs || [])],
        updatedAt: new Date().toISOString()
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Envoyer un email direct à {lead.civilite || ''} {lead.prenom} {lead.nom}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-800/80 border border-blue-600 rounded text-blue-200">
                  {lead.referenceDevis}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-2">
                <span>Destinataire : <strong>{lead.email || 'Email manquant'}</strong></span>
                {lead.telephone && (
                  <span className="text-blue-300/80">• Tél: {lead.telephone}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {/* Sender Server Indicator */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">
                Expéditeur : <strong>{senderDisplayName}</strong> ({effectiveSmtp?.senderEmail || currentUser?.email || 'cabinet@crm.fr'})
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              effectiveSmtp?.host ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {effectiveSmtp?.host ? `SMTP Actif (${effectiveSmtp.host})` : 'Client Mailto'}
            </span>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Modèles d'email rapides</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {presets.map((p) => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Objet de l'email *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Votre devis d'assurance..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Message *
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal focus:ring-2 focus:ring-blue-500 outline-none resize-y leading-relaxed"
              placeholder="Rédigez votre message ici..."
            />
          </div>

          {/* Signature & Footer Preview Note */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Signature & Pied de page professionnel inclus automatiquement</span>
            </p>
            <p className="text-[11px] text-blue-800">
              Lors de l'envoi, le pied de page conforme du cabinet ({cabinetInfo?.nomCabinet || 'Cabinet'}) avec coordonnées, mentions légales et signature personnalisée sera automatiquement inséré au bas du mail.
            </p>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleLaunchMailto}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Ouvrir dans votre logiciel de messagerie Outlook, Mail ou Gmail"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ouvrir dans ma messagerie locale</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleSendSmtp}
              disabled={isSending || !lead.email}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer l'email direct</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
