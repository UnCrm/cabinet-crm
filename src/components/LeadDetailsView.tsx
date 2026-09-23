import React, { useState } from 'react';
import { 
  X, 
  Car, 
  Home, 
  Briefcase, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  Send, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Euro,
  UserCheck,
  MessageSquare,
  Sparkles,
  History,
  Plus,
  ShieldAlert,
  FileCheck,
  Paperclip,
  Upload,
  ExternalLink,
  FileUp,
  AlertCircle,
  Download,
  FolderArchive,
  Lock,
  Server,
  Check,
  XCircle,
  Building2
} from 'lucide-react';
import { Lead, LeadStatus, EmailTemplate, CabinetInfo, ActivityLogItem, NoteItem, LeadType, SmtpConfig, User as UserType, InsurancePartnerApiConfig, getUserDisplayName, completeProchaineAction, cancelProchaineAction } from '../types/crm';
import { generateProfessionalQuoteText, getGuaranteesList, getQuotePricing, getLeadCivility as civilityHelper } from '../utils/quoteGenerator';
import { buildCompleteEmailText, generateProfessionalEmailFooterHtml } from '../utils/emailFooter';
import { LeadDocumentsTab } from './LeadDocumentsTab';
import { TelephonyModal } from './TelephonyModal';
import { DdaSignatureModal } from './DdaSignatureModal';
import { DevoirConseilModal } from './DevoirConseilModal';
import { isLeadAccessibleByUser, canUserDeleteLead } from '../utils/permissions';

interface EmailAttachmentItem {
  id: string;
  name: string;
  size: number;
}

interface LeadDetailsViewProps {
  lead: Lead | null;
  onClose: () => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  emailTemplates: EmailTemplate[];
  cabinetInfo: CabinetInfo;
  smtpConfig: SmtpConfig;
  onUpdateLead?: (lead: Lead) => void;
  onSaveEmailTemplates?: (tmpls: EmailTemplate[]) => void;
  users?: UserType[];
  currentUser?: UserType;
  partners?: InsurancePartnerApiConfig[];
}

export const LeadDetailsView: React.FC<LeadDetailsViewProps> = ({
  lead,
  onClose,
  onEditLead,
  onDeleteLead,
  onUpdateStatus,
  emailTemplates,
  cabinetInfo,
  smtpConfig,
  onUpdateLead,
  onSaveEmailTemplates,
  users = [],
  currentUser,
  partners = []
}) => {
  if (!lead) return null;

  // Filter selectable users based on permissions and team
  const selectableUsers = React.useMemo(() => {
    if (!users || users.length === 0) return [];
    const active = users.filter(u => u.status === 'ACTIF');
    if (!currentUser) return active;

    if (currentUser.role === 'ADMIN' || currentUser.role === 'DIRECTEUR_PRODUCTION') {
      return active;
    }

    if (currentUser.role === 'RESPONSABLE_EQUIPE' || currentUser.role === 'MANAGER') {
      const userTeam = (currentUser.equipe || '').toLowerCase();
      return active.filter(u =>
        u.id === currentUser.id ||
        (u.equipe && userTeam && u.equipe.toLowerCase() === userTeam)
      );
    }

    if (currentUser.permissions?.canAssignLeads) {
      if (currentUser.equipe) {
        const userTeam = currentUser.equipe.toLowerCase();
        return active.filter(u => u.equipe && u.equipe.toLowerCase() === userTeam);
      }
      return active;
    }

    return active.filter(u => u.id === currentUser.id);
  }, [users, currentUser]);

  const canReassignLead = Boolean(
    currentUser && (
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'DIRECTEUR_PRODUCTION' ||
      currentUser.role === 'RESPONSABLE_EQUIPE' ||
      currentUser.role === 'MANAGER' ||
      currentUser.permissions?.canAssignLeads
    )
  );

  const handleReassignAgent = (newAgentName: string) => {
    if (!newAgentName || !lead || !onUpdateLead) return;
    const matchedUser = users?.find(u => getUserDisplayName(u) === newAgentName || `${u.prenom} ${u.nom}` === newAgentName || u.pseudo === newAgentName);
    const newEquipe = matchedUser?.equipe || lead.equipe || currentUser?.equipe || '';

    const timestamp = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const actingUserName = currentUser ? getUserDisplayName(currentUser) : 'Système';

    const newActivity: ActivityLogItem = {
      id: 'act-reassign-' + Date.now(),
      type: 'LEAD_UPDATED',
      title: `Réattribution du lead`,
      description: `Lead réattribué à ${newAgentName}${newEquipe ? ` (Équipe : ${newEquipe})` : ''} par ${actingUserName}.`,
      author: actingUserName,
      date: timestamp
    };

    const updatedLead: Lead = {
      ...lead,
      assignedBroker: newAgentName,
      attribueA: newAgentName,
      assignedTo: matchedUser?.id || lead.assignedTo,
      equipe: newEquipe,
      historyLogs: [newActivity, ...(lead.historyLogs || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateLead(updatedLead);
  };

  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'documents' | 'history' | 'dda_signature'>('details');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTelephonyModal, setShowTelephonyModal] = useState(false);
  const [showDeleteLeadModal, setShowDeleteLeadModal] = useState(false);
  const [showDevoirConseilModal, setShowDevoirConseilModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    emailTemplates.find(t => t.type === lead.type)?.id || emailTemplates[0]?.id || ''
  );

  // Email subject and body state for custom editing
  const [customEmailSubject, setCustomEmailSubject] = useState<string>('');
  const [customEmailBody, setCustomEmailBody] = useState<string>('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState(false);
  const [emailSendMethod, setEmailSendMethod] = useState<'MAILTO' | 'DIRECT'>('DIRECT');
  const [selectedSmtpChoice, setSelectedSmtpChoice] = useState<'AUTO' | 'CABINET' | 'USER'>('AUTO');

  // Compute effective SMTP config and resolution metadata
  const { effectiveSmtpConfig, smtpSourceInfo, availableSmtpOptions } = React.useMemo(() => {
    // 1. Check validity of Cabinet SMTP
    const hasValidCabinetSmtp = Boolean(
      smtpConfig?.host?.trim() &&
      smtpConfig?.username?.trim()
    );

    // 2. Check validity of Dedicated User SMTP (must have host, username AND password)
    const userSmtp = currentUser?.smtpConfig;
    const hasValidUserSmtp = Boolean(
      userSmtp?.active &&
      userSmtp?.host?.trim() &&
      userSmtp?.username?.trim() &&
      userSmtp?.password?.trim() &&
      !(userSmtp.host.trim() === 'smtp.gmail.com' && !userSmtp.password?.trim())
    );

    // Available options for UI switcher
    const options = {
      hasCabinet: hasValidCabinetSmtp,
      hasUser: hasValidUserSmtp,
      cabinetHost: smtpConfig?.host || '',
      userHost: userSmtp?.host || ''
    };

    // User explicitly chose Cabinet SMTP
    if (selectedSmtpChoice === 'CABINET' && hasValidCabinetSmtp) {
      return {
        effectiveSmtpConfig: {
          ...smtpConfig,
          active: true,
          senderName: smtpConfig.senderName || cabinetInfo.nomCabinet || cabinetInfo.nomCourtierPrincipal
        },
        smtpSourceInfo: {
          label: 'SMTP Principal Cabinet',
          sourceName: cabinetInfo.nomCabinet || 'Cabinet',
          type: 'CABINET' as const
        },
        availableSmtpOptions: options
      };
    }

    // User explicitly chose Dedicated User SMTP
    if (selectedSmtpChoice === 'USER' && hasValidUserSmtp && userSmtp) {
      return {
        effectiveSmtpConfig: {
          ...userSmtp,
          senderName: userSmtp.senderName || getUserDisplayName(currentUser),
          senderEmail: userSmtp.senderEmail || currentUser?.email
        },
        smtpSourceInfo: {
          label: 'SMTP Dédié Utilisateur',
          sourceName: getUserDisplayName(currentUser),
          type: 'USER' as const
        },
        availableSmtpOptions: options
      };
    }

    // AUTO RESOLUTION:
    // Rule A: If current user is ADMIN, ALWAYS prioritize the Cabinet SMTP configured in Settings
    if (currentUser?.role === 'ADMIN' && hasValidCabinetSmtp) {
      return {
        effectiveSmtpConfig: {
          ...smtpConfig,
          active: true,
          senderName: smtpConfig.senderName || cabinetInfo.nomCabinet || cabinetInfo.nomCourtierPrincipal
        },
        smtpSourceInfo: {
          label: 'SMTP Principal Cabinet',
          sourceName: cabinetInfo.nomCabinet || 'Cabinet',
          type: 'CABINET' as const
        },
        availableSmtpOptions: options
      };
    }

    // Rule B: Current user dedicated SMTP (if valid, authenticated with password)
    if (hasValidUserSmtp && userSmtp) {
      return {
        effectiveSmtpConfig: {
          ...userSmtp,
          senderName: userSmtp.senderName || getUserDisplayName(currentUser),
          senderEmail: userSmtp.senderEmail || currentUser?.email
        },
        smtpSourceInfo: {
          label: 'SMTP Dédié Utilisateur',
          sourceName: getUserDisplayName(currentUser),
          type: 'USER' as const
        },
        availableSmtpOptions: options
      };
    }

    // Rule C: Global Cabinet SMTP
    if (hasValidCabinetSmtp) {
      return {
        effectiveSmtpConfig: {
          ...smtpConfig,
          active: true,
          senderName: (currentUser ? getUserDisplayName(currentUser) : '') || smtpConfig.senderName || cabinetInfo.nomCourtierPrincipal
        },
        smtpSourceInfo: {
          label: 'SMTP Principal Cabinet',
          sourceName: cabinetInfo.nomCourtierPrincipal || 'Cabinet',
          type: 'CABINET' as const
        },
        availableSmtpOptions: options
      };
    }

    // Rule D: Fallback to assigned broker's SMTP if valid
    const assignedUser = users.find(u => u.id === lead.assignedTo || `${u.prenom} ${u.nom}` === lead.assignedBroker || u.pseudo === lead.assignedBroker || getUserDisplayName(u) === lead.assignedBroker);
    if (assignedUser?.smtpConfig?.active && assignedUser.smtpConfig?.host?.trim() && assignedUser.smtpConfig?.password?.trim()) {
      return {
        effectiveSmtpConfig: {
          ...assignedUser.smtpConfig,
          senderName: assignedUser.smtpConfig.senderName || getUserDisplayName(assignedUser),
          senderEmail: assignedUser.smtpConfig.senderEmail || assignedUser.email
        },
        smtpSourceInfo: {
          label: `SMTP Agent Assigné (${getUserDisplayName(assignedUser)})`,
          sourceName: getUserDisplayName(assignedUser),
          type: 'ASSIGNED' as const
        },
        availableSmtpOptions: options
      };
    }

    // Rule E: Default fallback
    const fallbackConfig = (smtpConfig?.host ? smtpConfig : (currentUser?.smtpConfig?.host ? currentUser.smtpConfig : smtpConfig)) || smtpConfig;
    return {
      effectiveSmtpConfig: {
        ...fallbackConfig,
        senderName: (currentUser ? getUserDisplayName(currentUser) : '') || fallbackConfig.senderName || cabinetInfo.nomCourtierPrincipal
      },
      smtpSourceInfo: {
        label: 'SMTP Non Configuré',
        sourceName: 'Aucun serveur configuré',
        type: 'NONE' as const
      },
      availableSmtpOptions: options
    };
  }, [selectedSmtpChoice, currentUser, lead.assignedTo, lead.assignedBroker, users, smtpConfig, cabinetInfo]);

  // Determine user display identifier (pseudo prioritized for signatures and logs)
  const senderDisplayName = React.useMemo(() => {
    if (currentUser) return getUserDisplayName(currentUser);
    const assignedUser = users.find(u => u.id === lead.assignedTo || `${u.prenom} ${u.nom}` === lead.assignedBroker || u.pseudo === lead.assignedBroker || getUserDisplayName(u) === lead.assignedBroker);
    if (assignedUser) return getUserDisplayName(assignedUser);
    return lead.assignedBroker || cabinetInfo.nomCourtierPrincipal || 'Votre Conseiller Dédié';
  }, [currentUser, users, lead.assignedTo, lead.assignedBroker, cabinetInfo]);

  // Format the assigned agent display name (pseudo prioritized)
  const assignedAgentDisplayName = React.useMemo(() => {
    const raw = (lead.attribueA || lead.assignedBroker || '').trim();
    if (!raw) return 'Non attribué';
    if (currentUser) {
      if (
        (currentUser.pseudo && raw.toLowerCase() === currentUser.pseudo.toLowerCase()) ||
        (`${currentUser.prenom} ${currentUser.nom}`.toLowerCase() === raw.toLowerCase()) ||
        (currentUser.id === lead.assignedTo)
      ) {
        return getUserDisplayName(currentUser);
      }
    }
    const matched = users?.find(
      u => (u.pseudo && u.pseudo.toLowerCase() === raw.toLowerCase()) ||
           (`${u.prenom} ${u.nom}`.toLowerCase() === raw.toLowerCase()) ||
           getUserDisplayName(u).toLowerCase() === raw.toLowerCase() ||
           u.id === lead.assignedTo
    );
    if (matched) return getUserDisplayName(matched);
    return raw;
  }, [lead.attribueA, lead.assignedBroker, lead.assignedTo, currentUser, users]);

  // Lead deletion authorization check based on currentUser permissions
  const canDeleteLead = React.useMemo(() => {
    return canUserDeleteLead(currentUser);
  }, [currentUser]);

  // Direct SMTP status state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [smtpErrorMsg, setSmtpErrorMsg] = useState<string | null>(null);

  // Pièces jointes (Attachments) state
  const [attachments, setAttachments] = useState<EmailAttachmentItem[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [showEmailFooterPreview, setShowEmailFooterPreview] = useState(false);

  // Inline Template Creator state
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplSubject, setNewTmplSubject] = useState('');
  const [newTmplBody, setNewTmplBody] = useState('');
  const [newTmplType, setNewTmplType] = useState<LeadType | 'GENERAL'>(lead.type || 'GENERAL');

  // Quick Note & Relance Schedule state
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickActionTitle, setQuickActionTitle] = useState(lead.prochaineActionIntitule || 'Relance devis');
  const [quickActionDate, setQuickActionDate] = useState(lead.prochaineActionDate || new Date().toISOString().split('T')[0]);
  const [quickActionHeure, setQuickActionHeure] = useState(lead.prochaineActionHeure || '15:00');
  const [noteSavedMsg, setNoteSavedMsg] = useState(false);

  // Statuses list from cabinetInfo or default
  const statusesOptions = React.useMemo(() => {
    const list = cabinetInfo?.customStatuses && cabinetInfo.customStatuses.length > 0
      ? [...cabinetInfo.customStatuses]
      : [
          { id: 'NOUVEAU', label: 'Nouveau Lead' },
          { id: 'A_CONTACTER', label: 'À Contacter' },
          { id: 'DEVIS_ENVOYE', label: 'Devis Envoyé' },
          { id: 'RELANCE', label: 'Relance à faire' },
          { id: 'PDG', label: 'PDG (Prise De Garantie)' },
          { id: 'GAGNE', label: 'Souscrit / Gagné' },
          { id: 'PERDU', label: 'Perdu / Rejeté' }
        ];

    if (!list.some((s) => s.id === 'PDG')) {
      const gagneIdx = list.findIndex((s) => s.id === 'GAGNE');
      if (gagneIdx !== -1) {
        list.splice(gagneIdx, 0, { id: 'PDG', label: 'PDG (Prise De Garantie)' });
      } else {
        list.push({ id: 'PDG', label: 'PDG (Prise De Garantie)' });
      }
    }
    return list;
  }, [cabinetInfo?.customStatuses]);

  const getStatusLabel = (status: LeadStatus) => {
    const custom = statusesOptions.find(s => s.id === status);
    if (custom) return custom.label;
    switch (status) {
      case 'NOUVEAU': return 'Nouveau Lead';
      case 'A_CONTACTER': return 'À Contacter';
      case 'DEVIS_ENVOYE': return 'Devis Envoyé';
      case 'RELANCE': return 'Relance à faire';
      case 'PDG': return 'PDG (Prise De Garantie)';
      case 'GAGNE': return 'Souscrit / Gagné';
      case 'PERDU': return 'Perdu / Rejeté';
      default: return status.replace('_', ' ');
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'NOUVEAU':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'A_CONTACTER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DEVIS_ENVOYE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RELANCE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'PDG':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
      case 'GAGNE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PERDU':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  // Helper to get formula and cotisation
  let formulaName = 'Non définie';
  let rawCotisation = 0;
  let fractionnement = 'Mensuel';
  let fraisDossier = 0;
  let optionsList: string[] = [];

  if (lead.type === 'AUTO' && lead.autoDetails) {
    formulaName = lead.autoDetails.formuleSouhaitee || 'Non définie';
    rawCotisation = lead.autoDetails.cotisationMontant || 0;
    fractionnement = lead.autoDetails.fractionnement || 'Mensuel';
    fraisDossier = lead.autoDetails.fraisDossier || 0;
    optionsList = lead.autoDetails.optionsSupplementaires || [];
  } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
    formulaName = lead.habitationDetails.formuleSouhaitee || 'Non définie';
    rawCotisation = lead.habitationDetails.cotisationMontant || 0;
    fractionnement = lead.habitationDetails.fractionnement || 'Mensuel';
    fraisDossier = lead.habitationDetails.fraisDossier || 0;
    optionsList = lead.habitationDetails.optionsSupplementaires || [];
  } else if (lead.type === 'VTC' && lead.vtcDetails) {
    formulaName = lead.vtcDetails.formuleSouhaitee || 'Non définie';
    rawCotisation = lead.vtcDetails.cotisationMontant || 0;
    fractionnement = lead.vtcDetails.fractionnement || 'Mensuel';
    fraisDossier = lead.vtcDetails.fraisDossier || 0;
    optionsList = lead.vtcDetails.optionsSupplementaires || [];
  }

  const isMensuel = fractionnement.toLowerCase().includes('mensuel');
  const isTrimestriel = fractionnement.toLowerCase().includes('trimestriel');
  const isSemestriel = fractionnement.toLowerCase().includes('semestriel');
  const isAnnuel = fractionnement.toLowerCase().includes('annuel');

  // Calcul du montant affiché selon le fractionnement choisi
  let cotisationAffichee = rawCotisation;
  let cotisationTitre = 'Cotisation Mensuelle';
  let cotisationSousTitre = 'par mois TTC';

  if (isMensuel) {
    cotisationTitre = 'Cotisation Mensuelle';
    cotisationSousTitre = 'par mois TTC';
    // Si la valeur stockée était une ancienne valeur annuelle (> 300 pour auto/hab/vtc mensuel)
    if (rawCotisation > 300) {
      cotisationAffichee = Math.round((rawCotisation / 12) * 100) / 100;
    } else {
      cotisationAffichee = rawCotisation;
    }
  } else if (isTrimestriel) {
    cotisationTitre = 'Cotisation Trimestrielle';
    cotisationSousTitre = 'par trimestre TTC';
    cotisationAffichee = rawCotisation;
  } else if (isSemestriel) {
    cotisationTitre = 'Cotisation Semestrielle';
    cotisationSousTitre = 'par semestre TTC';
    cotisationAffichee = rawCotisation;
  } else {
    cotisationTitre = 'Cotisation Annuelle';
    cotisationSousTitre = 'par an TTC';
    cotisationAffichee = rawCotisation;
  }

  const cotisationMois = isMensuel
    ? cotisationAffichee
    : Math.round((cotisationAffichee / 12) * 100) / 100;
  const cotisationAn = isMensuel
    ? Math.round(cotisationAffichee * 12 * 100) / 100
    : cotisationAffichee;

  const getLeadCivility = (targetLead?: Lead): string => {
    const l = targetLead || lead;
    const civ = l.civilite || l.autoDetails?.civilite || l.habitationDetails?.civilite || l.vtcDetails?.civilite || '';
    if (civ === 'Mr') return 'Monsieur';
    if (civ === 'Mme') return 'Madame';
    return 'M./Mme';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileList: File[] = Array.from(e.target.files);
    const newItems: EmailAttachmentItem[] = fileList.map((f: File) => ({
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: f.name,
      size: f.size
    }));
    setAttachments(prev => [...prev, ...newItems]);
    setAttachmentFiles(prev => [...prev, ...fileList]);
  };

  const handleRemoveAttachment = (id: string, index: number) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Initialize custom email content whenever template changes or email modal opens
  const populateEmailContent = (templateId: string) => {
    const tmpl = emailTemplates.find(t => t.id === templateId) || emailTemplates[0];
    if (!tmpl) return;

    const civilityStr = getLeadCivility();

    let subject = tmpl.subject;
    subject = subject.replace(/{civilite}/g, civilityStr);
    subject = subject.replace(/{prenom}/g, lead.prenom);
    subject = subject.replace(/{nom}/g, lead.nom);
    subject = subject.replace(/{referenceDevis}/g, lead.referenceDevis);
    subject = subject.replace(/{nomCabinet}/g, cabinetInfo.nomCabinet);

    let body = tmpl.body;

    const formattedCotis = cotisationAffichee.toLocaleString('fr-FR', {
      minimumFractionDigits: cotisationAffichee % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });

    if (isMensuel) {
      // Pour un lead en fractionnement mensuel, remplacer rigoureusement toute mention annuelle par le mensuel
      body = body.replace(/Cotisation annuelle\s*:\s*{cotisation}\s*€/gi, `Cotisation : ${formattedCotis} € / mois`);
      body = body.replace(/Cotisation\s*:\s*{cotisation}\s*€\s*\/\s*an\s*\(\s*{cotisationMois}\s*€\s*\/\s*mois\s*\)/gi, `Cotisation : ${formattedCotis} € / mois`);
      body = body.replace(/{cotisation}\s*€\s*\/\s*an\s*\(\s*{cotisationMois}\s*€\s*\/\s*mois\s*\)/gi, `${formattedCotis} € / mois`);
      body = body.replace(/Cotisation\s*:\s*{cotisation}\s*€\s*\/\s*an/gi, `Cotisation : ${formattedCotis} € / mois`);
      body = body.replace(/Cotisation\s*:\s*{cotisation}\s*€\/an/gi, `Cotisation : ${formattedCotis} € / mois`);
      body = body.replace(/{cotisation}\s*€\s*\/\s*an/gi, `${formattedCotis} € / mois`);
      body = body.replace(/{cotisation}\s*€\/an/gi, `${formattedCotis} € / mois`);
      body = body.replace(/{cotisationMois}/g, formattedCotis);
      body = body.replace(/{cotisation}/g, formattedCotis);
    } else if (isTrimestriel) {
      body = body.replace(/Cotisation annuelle\s*:\s*{cotisation}\s*€/gi, `Cotisation : ${formattedCotis} € / trimestre`);
      body = body.replace(/{cotisation}\s*€\s*\/\s*an/gi, `${formattedCotis} € / trimestre`);
      body = body.replace(/{cotisation}/g, formattedCotis);
      body = body.replace(/{cotisationMois}/g, Math.round(cotisationAffichee / 3).toString());
    } else if (isSemestriel) {
      body = body.replace(/Cotisation annuelle\s*:\s*{cotisation}\s*€/gi, `Cotisation : ${formattedCotis} € / semestre`);
      body = body.replace(/{cotisation}\s*€\s*\/\s*an/gi, `${formattedCotis} € / semestre`);
      body = body.replace(/{cotisation}/g, formattedCotis);
      body = body.replace(/{cotisationMois}/g, Math.round(cotisationAffichee / 6).toString());
    } else {
      // Annuel
      body = body.replace(/{cotisation}/g, formattedCotis);
      body = body.replace(/{cotisationMois}/g, Math.round(cotisationAffichee / 12).toString());
    }

    body = body.replace(/{civilite}/g, civilityStr);
    body = body.replace(/{prenom}/g, lead.prenom);
    body = body.replace(/{nom}/g, lead.nom);
    body = body.replace(/{referenceDevis}/g, lead.referenceDevis);
    body = body.replace(/{formule}/g, formulaName);
    body = body.replace(/{fractionnement}/g, fractionnement);
    body = body.replace(/{fraisDossier}/g, fraisDossier.toString());
    body = body.replace(/{telephoneCabinet}/g, cabinetInfo.telephone);
    body = body.replace(/{nomCourtier}/g, senderDisplayName);
    body = body.replace(/{pseudo}/g, senderDisplayName);
    subject = subject.replace(/{nomCourtier}/g, senderDisplayName);
    subject = subject.replace(/{pseudo}/g, senderDisplayName);
    body = body.replace(/{nomCabinet}/g, cabinetInfo.nomCabinet);
    body = body.replace(/{numeroOrias}/g, cabinetInfo.numeroOrias);

    let immat = 'N/A';
    let marqueModele = 'Véhicule';
    if (lead.type === 'AUTO' && lead.autoDetails) {
      immat = lead.autoDetails.immatriculation;
      marqueModele = lead.autoDetails.marqueModele || 'Véhicule';
    } else if (lead.type === 'VTC' && lead.vtcDetails) {
      immat = lead.vtcDetails.immatriculation;
      marqueModele = lead.vtcDetails.marqueModele || 'Véhicule VTC';
    }
    body = body.replace(/{immatriculation}/g, immat);
    body = body.replace(/{marqueModele}/g, marqueModele);

    const formattedOpts = optionsList.map(o => ` • ${o}`).join('\n');
    body = body.replace(/{options}/g, formattedOpts || ' • Aucune option spécifique');

    setCustomEmailSubject(subject);
    setCustomEmailBody(body);
  };

  const handleOpenEmailModal = () => {
    populateEmailContent(selectedTemplateId);
    setAttachments([]);
    setAttachmentFiles([]);
    setShowNewTemplateForm(false);
    setSmtpErrorMsg(null);
    setIsSendingEmail(false);
    setShowEmailModal(true);
  };

  const handleSaveInlineTemplate = () => {
    if (!newTmplName.trim() || !newTmplSubject.trim()) return;
    const created: EmailTemplate = {
      id: 'tmpl-' + Date.now(),
      name: newTmplName.trim(),
      subject: newTmplSubject.trim(),
      type: newTmplType,
      body: newTmplBody || `Bonjour {civilite} {nom},\n\nVoici votre devis d'assurance {referenceDevis}.\n\nCordialement,\n{nomCourtier}\n{nomCabinet}`,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    const updatedList = [...emailTemplates, created];
    if (onSaveEmailTemplates) {
      onSaveEmailTemplates(updatedList);
    }
    setSelectedTemplateId(created.id);
    populateEmailContent(created.id);
    setShowNewTemplateForm(false);
    setNewTmplName('');
    setNewTmplSubject('');
    setNewTmplBody('');
  };

  const handlePrintQuote = () => {
    const printableElement = document.getElementById('printable-quote');
    if (!printableElement) {
      window.print();
      return;
    }

    try {
      const printWin = window.open('', '_blank', 'width=1000,height=900');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html lang="fr">
            <head>
              <meta charset="UTF-8">
              <title>Devis Assurances N° ${lead.referenceDevis} - ${lead.nom}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, sans-serif; background: #ffffff; color: #0f172a; }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div class="max-w-4xl mx-auto space-y-6">
                ${printableElement.innerHTML}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Print window error:', err);
      window.print();
    }
  };

  const handleDownloadQuoteHTML = () => {
    const printableElement = document.getElementById('printable-quote');
    if (!printableElement) return;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Devis Assurances N° ${lead.referenceDevis} - ${cabinetInfo.nomCabinet}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a; }
            .devis-card { max-width: 56rem; margin: 0 auto; background: #ffffff; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
            @media print {
              body { background: white; padding: 0; }
              .devis-card { border: none; shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="devis-card space-y-6">
            ${printableElement.innerHTML}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Devis_${lead.referenceDevis}_${lead.nom.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadQuoteTxt = () => {
    const txtContent = generateProfessionalQuoteText(lead, cabinetInfo, senderDisplayName);
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Devis_${lead.referenceDevis}_${lead.nom.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendEmailAction = async (method: 'MAILTO' | 'DIRECT') => {
    setSmtpErrorMsg(null);

    const timestamp = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const attachedNames: string[] = [];
    attachments.forEach(a => attachedNames.push(a.name));

    const attSummary = attachedNames.length > 0
      ? `\n📎 Pièces jointes (${attachedNames.length}) : ${attachedNames.join(', ')}`
      : '';

    if (method === 'MAILTO') {
      onUpdateStatus(lead.id, 'DEVIS_ENVOYE');
      const methodTitle = `Ouverture Client Mail : ${customEmailSubject}`;

      const newActivity: ActivityLogItem = {
        id: 'act-' + Date.now(),
        type: 'EMAIL_SENT',
        title: methodTitle,
        description: customEmailBody + attSummary,
        author: cabinetInfo.nomCourtierPrincipal || 'Courtier',
        date: timestamp,
        metadata: {
          emailSubject: customEmailSubject,
          emailRecipient: lead.email,
          pdfName: attachedNames.join(', ')
        }
      };

      const newNote: NoteItem = {
        id: 'note-' + Date.now(),
        author: cabinetInfo.nomCourtierPrincipal || 'Courtier',
        date: timestamp,
        content: `[Ouverture Mailto le ${timestamp}] Sujet : ${customEmailSubject}${attSummary}`
      };

      const updatedLead: Lead = {
        ...lead,
        status: 'DEVIS_ENVOYE',
        notes: [newNote, ...(lead.notes || [])],
        historyLogs: [newActivity, ...(lead.historyLogs || [])],
        updatedAt: new Date().toISOString()
      };

      if (onUpdateLead) {
        onUpdateLead(updatedLead);
      }

      // Append professional cabinet footer to text body for mailto
      const emailBodyWithFooter = buildCompleteEmailText(customEmailBody, cabinetInfo, {
        advisorName: senderDisplayName,
        advisorEmail: effectiveSmtpConfig.senderEmail || currentUser?.email,
        advisorPhone: cabinetInfo.telephone
      });

      const mailtoUrl = `mailto:${lead.email}?subject=${encodeURIComponent(customEmailSubject)}&body=${encodeURIComponent(emailBodyWithFooter)}`;
      window.location.href = mailtoUrl;

      setEmailSendMethod('MAILTO');
      setEmailSuccessMsg(true);

      setTimeout(() => {
        setEmailSuccessMsg(false);
        setShowEmailModal(false);
      }, 2800);

      return;
    }

    // DIRECT SMTP METHOD
    if (!effectiveSmtpConfig || !effectiveSmtpConfig.host || !effectiveSmtpConfig.username) {
      setSmtpErrorMsg("⚠️ Aucun serveur SMTP n'est configuré pour l'envoi d'emails ! Veuillez configurer votre serveur SMTP dans la gestion des utilisateurs ou dans les Paramètres du cabinet.");
      return;
    }

    setIsSendingEmail(true);

    try {
      const attachmentsToSend: { filename: string; content: string; contentType?: string }[] = [];

      // Include user uploaded files
      for (const file of attachmentFiles) {
        const b64 = await fileToBase64(file);
        attachmentsToSend.push({
          filename: file.name,
          content: b64,
          contentType: file.type || 'application/octet-stream'
        });
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          smtpConfig: effectiveSmtpConfig,
          to: lead.email,
          subject: customEmailSubject,
          body: customEmailBody,
          cabinetInfo: cabinetInfo,
          advisorName: senderDisplayName,
          advisorEmail: effectiveSmtpConfig.senderEmail || currentUser?.email,
          advisorPhone: cabinetInfo.telephone,
          signatureImageUrl: cabinetInfo.emailSignatureImageUrl,
          signatureMode: cabinetInfo.emailSignatureMode,
          attachments: attachmentsToSend
        })
      });

      const data = await response.json();

      if (!data.success) {
        setIsSendingEmail(false);
        setSmtpErrorMsg(`❌ Échec d'envoi SMTP : ${data.error || 'Erreur inconnue lors de l\'envoi'}`);
        return;
      }

      // Successful Direct SMTP dispatch
      setIsSendingEmail(false);
      onUpdateStatus(lead.id, 'DEVIS_ENVOYE');

      const newActivity: ActivityLogItem = {
        id: 'act-' + Date.now(),
        type: 'EMAIL_SENT',
        title: `Email direct SMTP envoyé : ${customEmailSubject}`,
        description: `Envoyé via ${effectiveSmtpConfig.host} (${effectiveSmtpConfig.senderEmail || effectiveSmtpConfig.username}) à <${lead.email}>\n\n${customEmailBody}${attSummary}`,
        author: senderDisplayName,
        date: timestamp,
        metadata: {
          emailSubject: customEmailSubject,
          emailRecipient: lead.email,
          pdfName: attachedNames.join(', ')
        }
      };

      const newNote: NoteItem = {
        id: 'note-' + Date.now(),
        author: senderDisplayName,
        date: timestamp,
        content: `[Email SMTP Envoyé le ${timestamp} par ${senderDisplayName}] Destinataire : ${lead.email} | Sujet : ${customEmailSubject}${attSummary}`
      };

      const updatedLead: Lead = {
        ...lead,
        status: 'DEVIS_ENVOYE',
        notes: [newNote, ...(lead.notes || [])],
        historyLogs: [newActivity, ...(lead.historyLogs || [])],
        updatedAt: new Date().toISOString()
      };

      if (onUpdateLead) {
        onUpdateLead(updatedLead);
      }

      setEmailSendMethod('DIRECT');
      setEmailSuccessMsg(true);

      setTimeout(() => {
        setEmailSuccessMsg(false);
        setShowEmailModal(false);
      }, 3500);

    } catch (err: any) {
      setIsSendingEmail(false);
      setSmtpErrorMsg(`❌ Erreur réseau lors de la communication avec le serveur SMTP : ${err.message || String(err)}`);
    }
  };

  const handleAddQuickNoteAndRelance = () => {
    if (!quickNoteText.trim() && !quickActionTitle) return;

    const timestamp = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const newActivities: ActivityLogItem[] = [];

    if (quickNoteText.trim()) {
      newActivities.push({
        id: 'act-note-' + Date.now(),
        type: 'NOTE_ADDED',
        title: 'Note ajoutée au dossier',
        description: quickNoteText.trim(),
        author: cabinetInfo.nomCourtierPrincipal || 'Courtier',
        date: timestamp
      });
    }

    if (quickActionDate) {
      newActivities.push({
        id: 'act-rem-' + Date.now(),
        type: 'REMINDER_SET',
        title: `Rappel programmé : ${quickActionTitle}`,
        description: `Rappel fixé au ${quickActionDate} à ${quickActionHeure}`,
        author: cabinetInfo.nomCourtierPrincipal || 'Courtier',
        date: timestamp
      });
    }

    const createdNoteItem: NoteItem | null = quickNoteText.trim()
      ? {
          id: 'note-' + Date.now(),
          author: cabinetInfo.nomCourtierPrincipal || 'Courtier',
          date: timestamp,
          content: quickNoteText.trim()
        }
      : null;

    const updatedNotes = createdNoteItem
      ? [createdNoteItem, ...(lead.notes || [])]
      : lead.notes;

    const updatedLead: Lead = {
      ...lead,
      notes: updatedNotes,
      prochaineActionIntitule: quickActionTitle,
      prochaineActionDate: quickActionDate,
      prochaineActionHeure: quickActionHeure,
      prochaineActionStatut: 'A_FAIRE',
      historyLogs: [...newActivities, ...(lead.historyLogs || [])],
      updatedAt: new Date().toISOString()
    };

    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }

    setQuickNoteText('');
    setNoteSavedMsg(true);
    setTimeout(() => setNoteSavedMsg(false), 2500);
  };

  // Cocher que l'action est faite
  const handleMarkActionDone = () => {
    if (!lead || !onUpdateLead) return;
    const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
    const updated = completeProchaineAction(lead, author);
    onUpdateLead(updated);
    setNoteSavedMsg(true);
    setTimeout(() => setNoteSavedMsg(false), 2500);
  };

  // Annuler l'action à faire
  const handleCancelAction = () => {
    if (!lead || !onUpdateLead) return;
    const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
    const updated = cancelProchaineAction(lead, author);
    onUpdateLead(updated);
    setNoteSavedMsg(true);
    setTimeout(() => setNoteSavedMsg(false), 2500);
  };

  // Compile history logs including initial creation if empty
  const historyList: ActivityLogItem[] = lead.historyLogs && lead.historyLogs.length > 0
    ? lead.historyLogs
    : [
        {
          id: 'init-1',
          type: 'LEAD_CREATED',
          title: 'Lead créé dans le CRM',
          description: `Prospect ${lead.prenom} ${lead.nom} enregistré en formule ${formulaName}.`,
          author: lead.assignedBroker || 'Système CRM',
          date: new Date(lead.createdAt).toLocaleDateString('fr-FR') + ' à ' + new Date(lead.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
      ];

  // Sécurité renforcée : interdire l'affichage si le compte connecté n'est pas autorisé
  if (lead && currentUser && !isLeadAccessibleByUser(lead, currentUser)) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-rose-200 p-6 text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Accès Dossier Non Autorisé</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ce dossier ({lead.prenom} {lead.nom}) est attribué à{' '}
            <strong className="text-slate-900">{assignedAgentDisplayName}</strong>.
            Votre profil <strong>{currentUser.role === 'AGENT_COMMERCIAL' ? 'Agent Commercial' : currentUser.role}</strong> ne vous autorise à consulter que les fiches et rappels qui vous sont directement assignés.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
          >
            Fermer le dossier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl 2xl:max-w-7xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        
        {/* Top Sticky Bar */}
        <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl ${
              lead.type === 'AUTO' ? 'bg-blue-600' :
              lead.type === 'HABITATION' ? 'bg-emerald-600' :
              'bg-amber-600'
            } text-white shadow-lg`}>
              {lead.type === 'AUTO' && <Car className="w-6 h-6" />}
              {lead.type === 'HABITATION' && <Home className="w-6 h-6" />}
              {lead.type === 'VTC' && <Briefcase className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold">
                  {lead.prenom} {lead.nom}
                </h3>
                <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {lead.referenceDevis}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>{lead.ville} ({lead.codePostal})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDevoirConseilModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition cursor-pointer"
              title="Générer ou imprimer le Devoir de Conseil officiel (DDA 2026)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Devoir de Conseil</span>
            </button>

            <button
              onClick={() => setShowTelephonyModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition cursor-pointer"
              title="Lancer un appel téléphonique (Click-to-Call)"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Appeler</span>
            </button>

            <button
              onClick={() => onEditLead(lead)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Éditer</span>
            </button>

            <button
              onClick={handleOpenEmailModal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Envoyer un email</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Status Quick Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Statut Actuel :</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(lead.status)}`}>
              {getStatusLabel(lead.status)}
            </span>
          </div>

          <div className="flex items-center space-x-1 flex-wrap gap-y-1">
            <span className="font-bold text-slate-600 text-[10px] uppercase mr-1">Changer Statut :</span>
            {statusesOptions.map((st) => (
              <button
                key={st.id}
                onClick={() => onUpdateStatus(lead.id, st.id)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                  lead.status === st.id
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={st.label}
              >
                {st.label.length > 14 ? `${st.label.substring(0, 12)}...` : st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Attribution & Team Quick Bar */}
        <div className="bg-indigo-900 text-indigo-100 px-6 py-2.5 border-b border-indigo-950 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 font-bold text-white bg-indigo-800/80 px-2.5 py-1 rounded-md border border-indigo-700/60">
              <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>Agent Attribué :</span>
            </div>
            <span className="font-extrabold text-white text-sm">
              {assignedAgentDisplayName}
            </span>
            {lead.equipe && (
              <span className="text-[11px] font-semibold text-indigo-200 bg-indigo-800/50 px-2 py-0.5 rounded border border-indigo-700/40">
                Équipe : {lead.equipe}
              </span>
            )}
          </div>

          {canReassignLead && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-indigo-200 text-[11px] uppercase tracking-wider">
                {currentUser?.role === 'RESPONSABLE_EQUIPE' ? 'Réassigner (mon équipe) :' : 'Réassigner :' }
              </span>
              <select
                value={lead.attribueA || lead.assignedBroker || ''}
                onChange={(e) => handleReassignAgent(e.target.value)}
                className="px-3 py-1 bg-white text-slate-900 font-bold text-xs rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer shadow-sm"
              >
                <option value="">-- Sélectionner Agent --</option>
                {selectableUsers.map((u) => (
                  <option key={u.id} value={getUserDisplayName(u)}>
                    {getUserDisplayName(u)} ({u.role === 'AGENT_COMMERCIAL' ? 'Agent' : u.role === 'RESPONSABLE_EQUIPE' ? 'Resp. Équipe' : u.role}) {u.equipe ? `— ${u.equipe}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Navigation Tabs (Dossier & Devis / Documents / Historique) */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 pt-2.5 flex space-x-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveDetailTab('details')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeDetailTab === 'details'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Dossier & Devis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('documents')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeDetailTab === 'documents'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <FolderArchive className="w-4 h-4 text-amber-600" />
            <span>Documents du dossier</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              (lead.documents?.length || 0) > 0 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-slate-200 text-slate-600'
            }`}>
              {lead.documents?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeDetailTab === 'history'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <History className="w-4 h-4 text-purple-600" />
            <span>Historique & Échanges</span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-extrabold">
              {historyList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('dda_signature')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeDetailTab === 'dda_signature'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Conformité DDA & Signature</span>
            {lead.signatureData?.statut === 'SIGNE' ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-extrabold">
                Signé ✓
              </span>
            ) : lead.ddaData?.statut === 'VALIDE' ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-extrabold">
                DDA Validé
              </span>
            ) : null}
          </button>
        </div>

        {/* TAB 1: DOSSIER & DEVIS */}
        {activeDetailTab === 'details' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Key Proposition Summary Banner */}
          <div className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Formule Retenue</span>
                <p className="text-base font-extrabold text-blue-950 mt-0.5">{formulaName}</p>
                <span className="text-xs text-slate-500 font-medium">Fractionnement {fractionnement}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{cotisationTitre}</span>
                <p className="text-2xl font-black text-emerald-800 mt-0.5">
                  {cotisationAffichee.toLocaleString('fr-FR', { minimumFractionDigits: cotisationAffichee % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} €
                </p>
                <span className="text-xs font-semibold text-emerald-700">{cotisationSousTitre}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Frais de Dossier</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{fraisDossier} € TTC</p>
                <span className="text-xs text-slate-500">Inclus à la souscription</span>
              </div>
            </div>

            {/* Comparatif 3 Formules si renseigné */}
            {((lead.type === 'AUTO' && (lead.autoDetails?.cotisationTiersSimple || lead.autoDetails?.cotisationTiersEtendu || lead.autoDetails?.cotisationTousRisques)) ||
              (lead.type === 'VTC' && (lead.vtcDetails?.cotisationTiersSimple || lead.vtcDetails?.cotisationTiersEtendu || lead.vtcDetails?.cotisationTousRisques)) ||
              (lead.type === 'HABITATION' && (lead.habitationDetails?.cotisationFormuleEco || lead.habitationDetails?.cotisationFormuleConfort || lead.habitationDetails?.cotisationFormuleTousRisques))) && (
              <div className="pt-3 border-t border-blue-200/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Étude Comparative des 3 Formules ({fractionnement}) :
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Devoir de conseil
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {lead.type === 'AUTO' && (
                    <>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tiers Simple') ? 'bg-blue-100/70 border-blue-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">1. Tiers Simple</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.autoDetails?.cotisationTiersSimple ? `${lead.autoDetails.cotisationTiersSimple} €` : '—'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tiers Étendu') ? 'bg-blue-100/70 border-blue-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">2. Tiers Étendu</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.autoDetails?.cotisationTiersEtendu ? `${lead.autoDetails.cotisationTiersEtendu} €` : '—'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tous Risques') ? 'bg-blue-100/70 border-blue-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">3. Tous Risques</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.autoDetails?.cotisationTousRisques ? `${lead.autoDetails.cotisationTousRisques} €` : '—'}
                        </div>
                      </div>
                    </>
                  )}
                  {lead.type === 'VTC' && (
                    <>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tiers VTC') ? 'bg-amber-100/80 border-amber-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">1. Tiers VTC + RC Pro</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.vtcDetails?.cotisationTiersSimple ? `${lead.vtcDetails.cotisationTiersSimple} €` : '—'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tiers Étendu') ? 'bg-amber-100/80 border-amber-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">2. Tiers Étendu VTC + RC Pro</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.vtcDetails?.cotisationTiersEtendu ? `${lead.vtcDetails.cotisationTiersEtendu} €` : '—'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tous Risques') ? 'bg-amber-100/80 border-amber-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">3. Tous Risques VTC + RC Pro</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.vtcDetails?.cotisationTousRisques ? `${lead.vtcDetails.cotisationTousRisques} €` : '—'}
                        </div>
                      </div>
                    </>
                  )}
                  {lead.type === 'HABITATION' && (
                    <>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Éco') ? 'bg-emerald-100/70 border-emerald-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">1. Formule Éco</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.habitationDetails?.cotisationFormuleEco ? `${lead.habitationDetails.cotisationFormuleEco} €` : '—'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Confort') ? 'bg-emerald-100/70 border-emerald-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">2. Formule Confort</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.habitationDetails?.cotisationFormuleConfort ? `${lead.habitationDetails.cotisationFormuleConfort} €` : '—'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-xs ${formulaName.includes('Tous Risques') ? 'bg-emerald-100/70 border-emerald-400 font-bold' : 'bg-white/80 border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">3. Tous Risques</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {lead.habitationDetails?.cotisationFormuleTousRisques ? `${lead.habitationDetails.cotisationFormuleTousRisques} €` : '—'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details Section by Product */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left Box: Client Contact & Specific Specs */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Coordonnées Prospect
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <a href={`tel:${lead.telephone}`} className="font-mono font-bold text-blue-700 hover:underline">
                      {lead.telephone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <a href={`mailto:${lead.email}`} className="font-semibold text-slate-800 hover:underline">
                      {lead.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{lead.ville} ({lead.codePostal})</span>
                  </div>
                </div>
              </div>

              {/* Product Details (AUTO) */}
              {lead.type === 'AUTO' && lead.autoDetails && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-600" />
                    Détails Véhicule & Conducteur
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Civilité & Profil:</span>
                      <p className="font-bold text-slate-900">{lead.autoDetails.civilite || 'M.'} {lead.prenom} {lead.nom}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Immatriculation:</span>
                      <p className="font-mono font-bold text-slate-900">{lead.autoDetails.immatriculation}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Modèle Véhicule:</span>
                      <p className="font-semibold text-slate-900">{lead.autoDetails.marqueModele || 'N/A'}</p>
                    </div>
                    {lead.autoDetails.version && (
                      <div>
                        <span className="text-slate-400">Version / Finition:</span>
                        <p className="font-medium text-slate-800">{lead.autoDetails.version}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Énergie & Puissance:</span>
                      <p className="text-slate-800 font-semibold">
                        {lead.autoDetails.energie || 'Essence'} {lead.autoDetails.puissanceFiscale ? `• ${lead.autoDetails.puissanceFiscale} CV` : ''}
                      </p>
                    </div>
                    {lead.autoDetails.valeurEstimee && (
                      <div>
                        <span className="text-slate-400">Valeur Achat/Estimée:</span>
                        <p className="text-emerald-800 font-bold">{lead.autoDetails.valeurEstimee.toLocaleString('fr-FR')} €</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Kilométrage Annuel:</span>
                      <p className={`font-bold ${lead.autoDetails.kilometrageAnnuel === 'Kilométrage illimité' ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {lead.autoDetails.kilometrageAnnuel === 'Kilométrage illimité' ? '⚡ Kilométrage illimité' : (lead.autoDetails.kilometrageAnnuel || '15 000–20 000')}
                      </p>
                    </div>
                    {lead.autoDetails.stationnementNuit && (
                      <div>
                        <span className="text-slate-400">Stationnement Nuit:</span>
                        <p className="text-slate-800 font-medium">{lead.autoDetails.stationnementNuit}</p>
                      </div>
                    )}
                    {lead.autoDetails.statutVehicule && (
                      <div>
                        <span className="text-slate-400">Statut Acquisition:</span>
                        <p className="text-slate-800 font-medium">{lead.autoDetails.statutVehicule}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Propriétaire (Carte Grise):</span>
                      <p className="font-semibold text-slate-800">{lead.autoDetails.proprietaireVehicule || 'Conducteur principal'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Situation / Profession:</span>
                      <p className="text-slate-800">{lead.autoDetails.situationFamiliale || 'Célibataire'} • {lead.autoDetails.profession || 'Salarié'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Date Naissance / Permis:</span>
                      <p className="text-slate-800">{lead.autoDetails.dateNaissance} (Permis {lead.autoDetails.datePermis})</p>
                    </div>
                    <div>
                      <span className="text-slate-400">CRM Bonus/Malus:</span>
                      <p className="font-bold text-blue-700">{lead.autoDetails.bonusMalus}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Utilisation:</span>
                      <p className="text-slate-800">{lead.autoDetails.typeUtilisation}</p>
                    </div>

                    {lead.autoDetails.aEuSuspensionPermis && (
                      <div className="col-span-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                        ⚠️ <strong>Suspension Permis:</strong> Motif {lead.autoDetails.suspensionMotif || 'Non précisé'} ({lead.autoDetails.suspensionDureeMois || 3} mois) le {lead.autoDetails.suspensionDate || 'N/A'}
                      </div>
                    )}

                    {lead.autoDetails.aEuAnnulationPermis && (
                      <div className="col-span-2 p-2 bg-red-50 rounded-lg border border-red-200 text-red-900">
                        🛑 <strong>Annulation Permis:</strong> Motif {lead.autoDetails.annulationMotif || 'Non précisé'} le {lead.autoDetails.annulationDate || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Product Details (HABITATION) */}
              {lead.type === 'HABITATION' && lead.habitationDetails && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Home className="w-4 h-4 text-emerald-600" />
                    Détails du Logement Assuré
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Type Logement:</span>
                      <p className="font-bold text-slate-900">{lead.habitationDetails.typeLogement}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Occupant:</span>
                      <p className="font-semibold text-slate-900">{lead.habitationDetails.statutOccupant}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Surface / Pièces:</span>
                      <p className="text-slate-800">{lead.habitationDetails.surfaceM2} m² ({lead.habitationDetails.nombrePieces} pièces)</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Mobilier Déclaré:</span>
                      <p className="font-bold text-emerald-800">{lead.habitationDetails.valeurMobilier.toLocaleString()} €</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Details (VTC) */}
              {lead.type === 'VTC' && lead.vtcDetails && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    Détails Activité VTC & Véhicule
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Carte Pro VTC:</span>
                      <p className="font-mono font-bold text-amber-900">{lead.vtcDetails.numeroCarteVtc}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Société / SIRET:</span>
                      <p className="font-semibold text-slate-900">{lead.vtcDetails.nomSociete}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Immatriculation:</span>
                      <p className="font-mono font-bold text-slate-900">{lead.vtcDetails.immatriculation}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Véhicule VTC:</span>
                      <p className="text-slate-800 font-semibold">{lead.vtcDetails.marqueModele}</p>
                    </div>
                    {lead.vtcDetails.version && (
                      <div>
                        <span className="text-slate-400">Version / Finition:</span>
                        <p className="text-slate-800 font-medium">{lead.vtcDetails.version}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Motorisation & Énergie:</span>
                      <p className="text-slate-800 font-semibold">
                        {lead.vtcDetails.typeMotorisation || 'Électrique'} {lead.vtcDetails.puissanceFiscale ? `• ${lead.vtcDetails.puissanceFiscale} CV` : ''}
                      </p>
                    </div>
                    {lead.vtcDetails.valeurEstimee && (
                      <div>
                        <span className="text-slate-400">Valeur Vénale / Achat:</span>
                        <p className="text-emerald-800 font-bold">{lead.vtcDetails.valeurEstimee.toLocaleString('fr-FR')} €</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Kilométrage Annuel:</span>
                      <p className={`font-bold ${lead.vtcDetails.kilometrageAnnuel === 'Kilométrage illimité' ? 'text-amber-800' : 'text-slate-800'}`}>
                        {lead.vtcDetails.kilometrageAnnuel === 'Kilométrage illimité' ? '⚡ Kilométrage illimité' : (lead.vtcDetails.kilometrageAnnuel || 'Kilométrage illimité')}
                      </p>
                    </div>
                    {lead.vtcDetails.stationnementNuit && (
                      <div>
                        <span className="text-slate-400">Stationnement Nuit:</span>
                        <p className="text-slate-800 font-medium">{lead.vtcDetails.stationnementNuit}</p>
                      </div>
                    )}
                    {lead.vtcDetails.statutVehicule && (
                      <div>
                        <span className="text-slate-400">Statut Acquisition:</span>
                        <p className="text-slate-800 font-medium">{lead.vtcDetails.statutVehicule}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Propriétaire VTC:</span>
                      <p className="font-semibold text-slate-800">{lead.vtcDetails.proprietaireVehicule || 'LOA'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Options, Prochaine Action & Notes Timeline */}
            <div className="space-y-4">
              {/* Prochaine Action & Relances Programmées */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Rappel Automatique & Relance Programmée
                  </span>
                  {noteSavedMsg && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded animate-pulse">
                      ✓ Enregistré !
                    </span>
                  )}
                </div>

                {lead.prochaineActionIntitule || lead.prochaineActionDate ? (
                  <div className="bg-white p-3 rounded-xl border-2 border-amber-300 shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-black uppercase tracking-wider">
                            À FAIRE
                          </span>
                          {lead.prochaineActionDate && lead.prochaineActionDate < new Date().toISOString().split('T')[0] && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded text-[9px] font-black">
                              EN RETARD
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1 mt-1">
                          <span>📌</span>
                          <span>{lead.prochaineActionIntitule || 'Rappel client'}</span>
                        </p>
                        {lead.prochaineActionDate && (
                          <p className="text-[11px] font-mono text-amber-950 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{lead.prochaineActionDate} {lead.prochaineActionHeure && `à ${lead.prochaineActionHeure}`}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Cocher fait ou Annuler */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleMarkActionDone}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Cocher que cette action est faite"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>C'est fait</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelAction}
                        className="py-1.5 px-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        title="Annuler cette action"
                      >
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        <span>Annuler</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lead.derniereActionCloturee ? (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          {lead.derniereActionCloturee.statut === 'FAIT' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-emerald-800">Action précédente terminée</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-slate-600">Action précédente annulée</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium pl-5">
                          « {lead.derniereActionCloturee.intitule} »
                        </p>
                        <p className="text-[10px] text-slate-400 pl-5">
                          {lead.derniereActionCloturee.dateCloture} • {lead.derniereActionCloturee.auteur}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60 text-center">
                        <p className="text-[11px] text-slate-400 italic">Aucune action en attente.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Reschedule & Note Form */}
                <div className="pt-2 border-t border-amber-200/60 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700">Programmer une relance rapide :</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'Devis envoyé', title: 'Relance devis envoyé' },
                      { label: 'Relance docs', title: 'Relance pièces justificatives' },
                      { label: 'Clôture contrat', title: 'Relance signature contrat' }
                    ].map(sug => (
                      <button
                        key={sug.label}
                        type="button"
                        onClick={() => setQuickActionTitle(sug.title)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition cursor-pointer ${
                          quickActionTitle === sug.title ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={quickActionTitle}
                    onChange={(e) => setQuickActionTitle(e.target.value)}
                    placeholder="Intitulé de la relance..."
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />

                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '+1j (Demain)', days: 1 },
                      { label: '+2j', days: 2 },
                      { label: '+3j', days: 3 },
                      { label: '+7j', days: 7 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + p.days);
                          setQuickActionDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-1.5 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="date"
                      value={quickActionDate}
                      onChange={(e) => setQuickActionDate(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium outline-none"
                    />
                    <input
                      type="time"
                      value={quickActionHeure}
                      onChange={(e) => setQuickActionHeure(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium outline-none"
                    />
                  </div>

                  <input
                    type="text"
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    placeholder="Ajouter une note de suivi (optionnel)..."
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />

                  <button
                    type="button"
                    onClick={handleAddQuickNoteAndRelance}
                    disabled={!quickActionDate || !quickActionTitle.trim()}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Valider & Programmer la relance</span>
                  </button>
                </div>
              </div>

              {/* Options incluses */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Options Incluses dans la proposition
                </h4>

                {optionsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune option supplémentaire.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {optionsList.map((opt, i) => (
                      <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg shadow-2xs">
                        ✓ {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Historique des Notes */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  Historique des Notes ({lead.notes?.length || 0})
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {(!lead.notes || lead.notes.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">Aucune note enregistrée.</p>
                  ) : (
                    lead.notes.map((n, idx) => {
                      const isObj = typeof n === 'object' && n !== null;
                      const noteKey = isObj && (n as NoteItem).id ? (n as NoteItem).id : `note-idx-${idx}`;
                      const author = isObj && (n as NoteItem).author ? (n as NoteItem).author : (cabinetInfo.nomCourtierPrincipal || 'Courtier');
                      const date = isObj && (n as NoteItem).date ? (n as NoteItem).date : '';
                      const content = isObj && (n as NoteItem).content ? (n as NoteItem).content : String(n);

                      return (
                        <div key={noteKey} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>{author}</span>
                            {date && <span>{date}</span>}
                          </div>
                          <p className="text-slate-800 font-medium">{content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Aperçu rapide Documents */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                    Documents du Dossier ({lead.documents?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('documents')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Gérer
                  </button>
                </div>

                {(!lead.documents || lead.documents.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">Aucun document joint pour le moment.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {lead.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.fileName}</span>
                        </div>
                        {doc.dataUrl && (
                          <a
                            href={doc.dataUrl}
                            download={doc.fileName}
                            className="p-1 text-blue-600 hover:text-blue-800 rounded transition shrink-0"
                            title="Télécharger"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTS DU DOSSIER */}
      {activeDetailTab === 'documents' && (
        <div className="flex-1 overflow-y-auto p-6">
          <LeadDocumentsTab
            documents={lead.documents || []}
            onChangeDocuments={(newDocs) => onUpdateLead({ ...lead, documents: newDocs })}
            leadType={lead.type}
          />
        </div>
      )}

      {/* TAB 3: HISTORIQUE ET ÉCHANGES */}
      {activeDetailTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <History className="w-4 h-4 text-purple-600" />
              Journal des Événements & Historique de Vie du Lead
            </h4>

            <div className="space-y-3">
              {historyList.map((item) => (
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-bold text-slate-900">{item.description}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.date ? new Date(item.date).toLocaleString('fr-FR') : ''}
                      </span>
                    </div>
                    {item.author && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        Par : <strong>{item.author}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFORMITÉ DDA & SIGNATURE ÉLECTRONIQUE */}
      {activeDetailTab === 'dda_signature' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <DdaSignatureModal
            lead={lead}
            cabinetInfo={cabinetInfo}
            currentUser={currentUser}
            smtpConfig={effectiveSmtpConfig}
            onOpenFullDevoirConseil={() => setShowDevoirConseilModal(true)}
            onUpdateLead={(updated) => {
              if (onUpdateLead) onUpdateLead(updated);
            }}
          />
        </div>
      )}

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          {canDeleteLead ? (
            <button
              type="button"
              onClick={() => setShowDeleteLeadModal(true)}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer le Lead</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 text-slate-500 rounded-xl text-xs font-medium border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Suppression désactivée (droit non attribué)</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* EMAIL MODAL DIALOG */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Envoi de la Proposition Commerciale par Email
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-slate-800">
              {emailSuccessMsg ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h4 className="font-bold text-emerald-950 text-lg">
                    {emailSendMethod === 'MAILTO' ? 'Client de messagerie ouvert avec succès !' : 'Email Envoyé avec Succès via SMTP !'}
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {emailSendMethod === 'MAILTO' ? (
                      <>
                        Le modèle a été préparé et transmis à votre application de messagerie (Outlook, Thunderbird, Mail, etc.) pour envoi direct à <strong className="font-bold text-slate-800">{lead.email}</strong>.
                      </>
                    ) : (
                      <>
                        L'email a été transmis directement à <strong className="font-bold text-slate-800">{lead.email}</strong> via le serveur SMTP (<strong className="font-mono text-slate-800">{effectiveSmtpConfig.host || 'configuré'}</strong>).
                      </>
                    )}
                  </p>
                  <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-800">
                    Statut mis à jour : "Devis Envoyé"
                  </div>
                </div>
              ) : (
                <>
                  {/* Template Selector / Inline Creator */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Sélectionner un Modèle d'Email</label>
                      <button
                        type="button"
                        onClick={() => setShowNewTemplateForm(!showNewTemplateForm)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showNewTemplateForm ? 'Masquer la création' : 'Nouveau Modèle'}</span>
                      </button>
                    </div>

                    {!showNewTemplateForm ? (
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => {
                          setSelectedTemplateId(e.target.value);
                          populateEmailContent(e.target.value);
                        }}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold text-blue-900 bg-white"
                      >
                        {emailTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            [{t.type}] {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="text-xs font-bold text-blue-900">Créer un nouveau modèle d'email</span>
                          <span className="text-[10px] text-slate-500">Variables : &#123;civilite&#125;, &#123;nom&#125;, &#123;prenom&#125;, &#123;referenceDevis&#125;</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nom du modèle"
                            value={newTmplName}
                            onChange={(e) => setNewTmplName(e.target.value)}
                            className="col-span-2 text-xs p-2 rounded-lg border border-slate-300 font-bold"
                          />
                          <select
                            value={newTmplType}
                            onChange={(e) => setNewTmplType(e.target.value as any)}
                            className="text-xs p-2 rounded-lg border border-slate-300 font-bold"
                          >
                            <option value="GENERAL">GENERAL</option>
                            <option value="AUTO">AUTO</option>
                            <option value="HABITATION">HABITATION</option>
                            <option value="VTC">VTC</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Objet de l'email"
                          value={newTmplSubject}
                          onChange={(e) => setNewTmplSubject(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
                        />
                        <textarea
                          rows={3}
                          placeholder="Corps du message..."
                          value={newTmplBody}
                          onChange={(e) => setNewTmplBody(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 leading-relaxed font-mono"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewTemplateForm(false)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveInlineTemplate}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs"
                          >
                            Enregistrer ce modèle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destinataire info */}
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block text-[10px] uppercase">Destinataire :</span>
                      <p className="font-bold text-slate-900 text-xs">
                        {getLeadCivility()} {lead.prenom} {lead.nom} &lt;{lead.email}&gt;
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                      Civilité : {getLeadCivility()}
                    </span>
                  </div>

                  {/* Objet */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Objet de l'email :</label>
                    <input
                      type="text"
                      value={customEmailSubject}
                      onChange={(e) => setCustomEmailSubject(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Corps du message (Éditable) :</label>
                    <textarea
                      rows={5}
                      value={customEmailBody}
                      onChange={(e) => setCustomEmailBody(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 font-sans leading-relaxed bg-white focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  {/* Pied de page officiel du cabinet avec coordonnées */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800">
                          Pied de page professionnel du cabinet
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                          Inclus automatiquement
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmailFooterPreview(!showEmailFooterPreview)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        {showEmailFooterPreview ? 'Masquer le pied de page ▲' : 'Aperçu du pied de page ▼'}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Vos coordonnées officielles ({cabinetInfo.nomCabinet || 'Cabinet'}, tél, courriel, adresse) ainsi que le N° ORIAS et les mentions réglementaires ACPR &amp; RGPD sont apposés automatiquement à l'envoi de chaque email.
                    </p>

                    {showEmailFooterPreview && (
                      <div className="pt-2 border-t border-slate-200 bg-white p-3.5 rounded-lg border border-slate-200 text-[11px] space-y-2 shadow-2xs">
                        {cabinetInfo.emailSignatureImageUrl && (!cabinetInfo.emailSignatureMode || cabinetInfo.emailSignatureMode === 'IMAGE') ? (
                          <div className="space-y-1.5">
                            <img
                              src={cabinetInfo.emailSignatureImageUrl}
                              alt="Signature Email"
                              className="max-h-28 max-w-full object-contain rounded"
                            />
                            {cabinetInfo.numeroOrias && (
                              <div className="text-[10px] text-slate-400">
                                ORIAS N° {cabinetInfo.numeroOrias} • Courtage en assurance sous contrôle ACPR
                              </div>
                            )}
                          </div>
                        ) : cabinetInfo.emailSignatureImageUrl && cabinetInfo.emailSignatureMode === 'BOTH' ? (
                          <div className="space-y-2">
                            <img
                              src={cabinetInfo.emailSignatureImageUrl}
                              alt="Signature Email"
                              className="max-h-24 max-w-full object-contain rounded"
                            />
                            <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                              {cabinetInfo.numeroOrias && <span className="font-bold text-blue-800 mr-2">ORIAS N° {cabinetInfo.numeroOrias}</span>}
                              <span>{cabinetInfo.nomCabinet || 'Cabinet'} • ACPR &amp; RGPD</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-slate-900 text-xs">
                                {senderDisplayName} • <span className="text-blue-600">{cabinetInfo.nomCabinet || 'Cabinet de Courtage'}</span>
                              </div>
                              {cabinetInfo.numeroOrias && (
                                <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] px-2 py-0.5 rounded font-bold">
                                  ORIAS N° {cabinetInfo.numeroOrias}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-600">
                              {cabinetInfo.telephone && (
                                <div>📞 <strong>Tél :</strong> {cabinetInfo.telephone}</div>
                              )}
                              <div>✉️ <strong>Courriel :</strong> {effectiveSmtpConfig.senderEmail || cabinetInfo.emailContact || 'contact@cabinet.fr'}</div>
                              {cabinetInfo.adresse && (
                                <div className="sm:col-span-2">📍 <strong>Adresse :</strong> {cabinetInfo.adresse} {cabinetInfo.codePostal} {cabinetInfo.ville}</div>
                              )}
                              {cabinetInfo.siteWeb && (
                                <div>🌐 <strong>Site web :</strong> {cabinetInfo.siteWeb}</div>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
                              <div>
                                Courtage en assurance sous le contrôle de l'ACPR (4 Place de Budapest, 75436 Paris).
                                {cabinetInfo.siret ? ` • SIRET : ${cabinetInfo.siret}` : ''}
                              </div>
                              <div className="italic text-slate-400">
                                🔒 Avis de confidentialité : message protégé par le secret professionnel et le RGPD.
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pièces Jointes (Attachments) Section */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        <span>Pièces jointes au message</span>
                      </label>
                      <label className="cursor-pointer px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 text-[11px] font-bold rounded-lg shadow-2xs flex items-center gap-1 transition">
                        <Upload className="w-3 h-3" />
                        <span>Joindre un fichier...</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileAttachmentChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* User Uploaded Attachments List */}
                    {attachments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {attachments.map((att, idx) => (
                          <div key={att.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                              <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">({formatFileSize(att.size)})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id, idx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error Banner */}
                  {smtpErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-900 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">{smtpErrorMsg}</p>
                        <p className="text-[11px] text-rose-700">
                          Vérifiez votre serveur SMTP, le port (ex: 465 SSL, 587 TLS), l'identifiant et le mot de passe dans <strong>Paramètres &gt; Config SMTP</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Informational Guidance on Email Delivery */}
                  <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2 text-[11px] text-blue-950">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold">
                          Expéditeur : {effectiveSmtpConfig.senderName || senderDisplayName} {effectiveSmtpConfig.senderEmail ? `<${effectiveSmtpConfig.senderEmail}>` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          smtpSourceInfo.type === 'CABINET'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : smtpSourceInfo.type === 'USER'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : smtpSourceInfo.type === 'ASSIGNED'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {smtpSourceInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Switcher if multiple servers are available */}
                    {availableSmtpOptions.hasCabinet && availableSmtpOptions.hasUser && (
                      <div className="flex items-center gap-2 pt-1 border-t border-blue-200/60">
                        <span className="text-[10px] font-semibold text-slate-500">Choisir le serveur :</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSmtpChoice('CABINET')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                              smtpSourceInfo.type === 'CABINET'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <Building2 className="w-3 h-3" />
                            <span>SMTP Cabinet ({availableSmtpOptions.cabinetHost})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedSmtpChoice('USER')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                              smtpSourceInfo.type === 'USER'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>SMTP Dédié ({availableSmtpOptions.userHost})</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-slate-600 leading-relaxed text-[11px] pt-1 border-t border-blue-200/60">
                      Serveur sortant : <strong className="font-mono text-slate-800 font-bold">{effectiveSmtpConfig.host || 'Non configuré'}</strong> (Port {effectiveSmtpConfig.port || 587}, {effectiveSmtpConfig.encryption || 'TLS'})
                      • Identifiant : <strong className="font-mono text-slate-800">{effectiveSmtpConfig.username || 'Non renseigné'}</strong>
                      • Envoi direct à <strong className="text-blue-900 font-bold">{lead.email}</strong>.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                disabled={isSendingEmail}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition disabled:opacity-50"
              >
                Annuler
              </button>

              {!emailSuccessMsg && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleSendEmailAction('MAILTO')}
                    disabled={isSendingEmail}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                    title="Ouvre votre logiciel de messagerie (Outlook, Thunderbird, Apple Mail, Webmail) avec le texte et l'objet pré-remplis"
                  >
                    <Mail className="w-4 h-4 text-slate-600" />
                    <span>Ouvrir dans ma messagerie</span>
                  </button>

                  <button
                    onClick={() => handleSendEmailAction('DIRECT')}
                    disabled={isSendingEmail}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                    title={effectiveSmtpConfig.host ? `Envoie directement l'email via le serveur SMTP (${effectiveSmtpConfig.host})` : "Nécessite la configuration d'un serveur SMTP dans les paramètres"}
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Envoi SMTP en cours...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Envoyer par SMTP direct</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE LEAD MODAL */}
      {showDeleteLeadModal && canDeleteLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Supprimer le Lead ?</h3>
                <p className="text-xs text-slate-500">Cette action est définitive et irréversible.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Voulez-vous supprimer le lead de <strong className="text-slate-900">{lead.prenom} {lead.nom}</strong> ({lead.type}) ? Toutes les données et l'historique associés seront supprimés.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteLeadModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canDeleteLead) {
                    setShowDeleteLeadModal(false);
                    return;
                  }
                  onDeleteLead(lead.id);
                  setShowDeleteLeadModal(false);
                  onClose();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer le Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-to-Call Telephony Modal */}
      {showTelephonyModal && (
        <TelephonyModal
          isOpen={showTelephonyModal}
          onClose={() => setShowTelephonyModal(false)}
          lead={lead}
          currentUser={currentUser}
          cabinetInfo={cabinetInfo}
          onUpdateLead={(updated) => {
            if (onUpdateLead) onUpdateLead(updated);
          }}
        />
      )}

      {/* Official Devoir de Conseil (DDA 2026) Modal */}
      {showDevoirConseilModal && (
        <DevoirConseilModal
          isOpen={showDevoirConseilModal}
          onClose={() => setShowDevoirConseilModal(false)}
          lead={lead}
          cabinetInfo={cabinetInfo}
          currentUser={currentUser}
          smtpConfig={effectiveSmtpConfig}
          onUpdateLead={(updated) => {
            if (onUpdateLead) onUpdateLead(updated);
          }}
        />
      )}
    </div>
  );
};
