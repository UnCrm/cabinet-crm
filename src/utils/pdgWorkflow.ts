import { Lead, User, CabinetInfo, SmtpConfig, getUserDisplayName } from '../types/crm';
import { sendWindowsDesktopNotification } from './notifications';

export interface PdgNotificationResult {
  success: boolean;
  recipients: string[];
  message: string;
  error?: string;
}

/**
 * Normalise le texte pour les comparaisons d'équipes
 */
const normalizeText = (text?: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Formatage de l'objet du mail strictement selon la demande utilisateur :
 * "demande de souscription + nom du client + numero devis"
 */
export const formatPdgEmailSubject = (lead: Lead): string => {
  const clientNom = `${lead.nom || ''} ${lead.prenom || ''}`.trim() || 'Client';
  const devisRef = lead.referenceDevis || lead.id || 'Sans numéro';
  return `Demande de souscription + ${clientNom} + ${devisRef}`;
};

/**
 * Construit le contenu HTML & Texte complet du dossier lead pour la gestionnaire
 */
export const formatPdgEmailContent = (
  lead: Lead,
  commercialUser?: User | null,
  cabinetInfo?: CabinetInfo
): { subject: string; html: string; text: string } => {
  const anyLead = lead as any;
  const anyCabinet = (cabinetInfo || {}) as any;
  const subject = formatPdgEmailSubject(lead);
  const clientNom = `${lead.civilite ? lead.civilite + ' ' : ''}${lead.nom || ''} ${lead.prenom || ''}`.trim() || 'Client';
  const devisRef = lead.referenceDevis || lead.id || 'N/A';
  const commercialNom = commercialUser ? getUserDisplayName(commercialUser) : (lead.assignedBroker || 'Agent Commercial');
  const commercialTel = commercialUser?.telephonyConfig?.directNumber || commercialUser?.telephone || cabinetInfo?.telephone || 'Non renseigné';
  const commercialEmail = commercialUser?.email || cabinetInfo?.emailContact || anyCabinet?.email || 'Non renseigné';
  const equipeName = lead.equipe || commercialUser?.equipe || 'Équipe Commerciale';
  const dateTransmission = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Cotisations et tarification
  const autoDet = lead.autoDetails as any;
  const habDet = lead.habitationDetails as any;
  const vtcDet = lead.vtcDetails as any;

  const cotisationMensuelle = autoDet?.cotisationMontant || habDet?.cotisationMontant || vtcDet?.cotisationMontant || anyLead.cotisationMensuelle || 0;
  const cotisationAnnuelle = anyLead.cotisationAnnuelle || (cotisationMensuelle ? cotisationMensuelle * 12 : 0);
  const fraisDossier = autoDet?.fraisDossier ?? habDet?.fraisDossier ?? vtcDet?.fraisDossier ?? anyLead.fraisDossier ?? 0;
  const franchise = autoDet?.franchiseGenerale ?? anyLead.franchiseMontant ?? 0;
  const formuleChoisie = autoDet?.formuleSouhaitee || habDet?.formuleSouhaitee || vtcDet?.formuleSouhaitee || anyLead.formuleSelectionnee || 'Formule Standard';

  // Section Risque spécifique
  let risqueDetailsHtml = '';
  let risqueDetailsText = '';

  if (lead.type === 'AUTO') {
    const immat = autoDet?.immatriculation || anyLead.vehiculeImmatriculation || 'En cours';
    const marque = autoDet?.marque || anyLead.vehiculeMarque || '';
    const modele = autoDet?.modele || anyLead.vehiculeModele || '';
    const dateMec = autoDet?.dateMiseEnCirculation || anyLead.vehiculeDateMiseEnCirculation || 'Non renseignée';
    const bonus = autoDet?.bonusMalus !== undefined ? autoDet.bonusMalus : (anyLead.vehiculeBonusMalus !== undefined ? anyLead.vehiculeBonusMalus : 'Non renseigné');
    const usage = autoDet?.usageVehicule || anyLead.vehiculeUsage || 'Privé / Trajet Travail';

    risqueDetailsHtml = `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          🚗 Détails du Risque Auto
        </h4>
        <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; width: 40%; font-weight: 600;">Véhicule :</td><td>${marque} ${modele}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Immatriculation :</td><td style="font-family: monospace; font-weight: bold; color: #1e40af;">${immat}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Date 1ère mise en circulation :</td><td>${dateMec}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Bonus / Malus :</td><td>${bonus}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Usage :</td><td>${usage}</td></tr>
        </table>
      </div>
    `;
    risqueDetailsText = `DÉTAILS RISQUE AUTO:
- Véhicule: ${marque} ${modele}
- Immatriculation: ${immat}
- Date 1ère mise en circulation: ${dateMec}
- Bonus/Malus: ${bonus}
- Usage: ${usage}
`;
  } else if (lead.type === 'HABITATION') {
    const logType = habDet?.typeLogement || anyLead.logementType || 'Appartement';
    const logStatut = habDet?.qualiteOccupant || anyLead.logementStatut || 'Locataire';
    const logPieces = habDet?.nombrePieces || anyLead.logementPieces || 'N/A';
    const logSurface = habDet?.surfaceM2 || anyLead.logementSurface || 'N/A';
    const logCapital = habDet?.capitalMobilier || anyLead.logementCapitalMobilier || 'N/A';

    risqueDetailsHtml = `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          🏡 Détails du Risque Habitation
        </h4>
        <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; width: 40%; font-weight: 600;">Type de logement :</td><td>${logType}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Qualité de l'occupant :</td><td>${logStatut}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Nombre de pièces :</td><td>${logPieces}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Surface habitable :</td><td>${logSurface} m²</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Capital mobilier estimé :</td><td>${logCapital} €</td></tr>
        </table>
      </div>
    `;
    risqueDetailsText = `DÉTAILS RISQUE HABITATION:
- Type de logement: ${logType}
- Qualité occupant: ${logStatut}
- Nombre de pièces: ${logPieces}
- Surface: ${logSurface} m²
- Capital mobilier: ${logCapital} €
`;
  } else if (lead.type === 'VTC') {
    const soc = vtcDet?.raisonSociale || anyLead.vtcSociete || anyLead.nomEntreprise || 'Non renseignée';
    const siret = vtcDet?.siret || anyLead.vtcSiret || 'Non renseigné';
    const cartePro = vtcDet?.numeroCartePro || anyLead.vtcCartePro || 'Non renseignée';
    const marque = vtcDet?.marque || anyLead.vehiculeMarque || '';
    const modele = vtcDet?.modele || anyLead.vehiculeModele || '';
    const immat = vtcDet?.immatriculation || anyLead.vehiculeImmatriculation || 'Immat inconnue';

    risqueDetailsHtml = `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          🚕 Détails Professionnels VTC
        </h4>
        <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; width: 40%; font-weight: 600;">Raison Sociale :</td><td>${soc}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">SIRET :</td><td style="font-family: monospace;">${siret}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Carte Pro VTC :</td><td>${cartePro}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Véhicule & Immat :</td><td>${marque} ${modele} (${immat})</td></tr>
        </table>
      </div>
    `;
    risqueDetailsText = `DÉTAILS RISQUE VTC:
- Raison Sociale: ${soc}
- SIRET: ${siret}
- Carte Pro VTC: ${cartePro}
- Véhicule: ${marque} ${modele} (${immat})
`;
  }

  // Documents justificatifs
  const docsList = lead.documents && lead.documents.length > 0
    ? lead.documents.map(d => `• ${(d as any).name || (d as any).nom || 'Document'} (${(d as any).status || (d as any).statut || 'Enregistré'})`).join('<br>')
    : 'Aucune pièce jointe enregistrée pour le moment';

  const docsListText = lead.documents && lead.documents.length > 0
    ? lead.documents.map(d => `- ${(d as any).name || (d as any).nom || 'Document'} (${(d as any).status || (d as any).statut || 'Enregistré'})`).join('\n')
    : 'Aucune pièce jointe enregistrée pour le moment';

  const adresseStr = anyLead.adresse || anyLead.adresseComplete || `${lead.codePostal || ''} ${lead.ville || ''}`.trim();
  const dateNais = autoDet?.dateNaissance || (lead as any).dateNaissance;
  const prof = autoDet?.profession || (lead as any).profession;
  const comp = autoDet?.compagnieAssuranceActuelle || (lead as any).compagnie;
  const dateEffet = autoDet?.dateEffetSouhaitee || (lead as any).dateEffetSouhaitee;
  const obs = lead.notes || (lead as any).commentaires;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <!-- En-tête bandeau PDG -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 24px; text-align: left;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">
          Demande de Souscription & Prise de Garantie
        </h2>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">
          Transmis le <strong>${dateTransmission}</strong> par le commercial <strong>${commercialNom}</strong> (${equipeName})
        </p>
      </div>

      <div style="padding: 24px;">
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #1e40af;">
            <strong>Action attendue du gestionnaire :</strong> Vérification des pièces justificatives, validation de la conformité DDA et émission du contrat auprès de la compagnie d'assurance.
          </p>
        </div>

        <!-- 1. Souscripteur / Client -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
            👤 Informations du Souscripteur
          </h4>
          <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; width: 40%; font-weight: 600;">Nom complet :</td><td style="font-size: 14px; font-weight: bold; color: #0f172a;">${clientNom}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Téléphone :</td><td><a href="tel:${lead.telephone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${lead.telephone || 'Non renseigné'}</a></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Email :</td><td><a href="mailto:${lead.email}" style="color: #2563eb; text-decoration: none;">${lead.email || 'Non renseigné'}</a></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Adresse :</td><td>${adresseStr || 'Non renseignée'}</td></tr>
            ${dateNais ? `<tr><td style="padding: 4px 0; font-weight: 600;">Date de naissance :</td><td>${dateNais}</td></tr>` : ''}
            ${prof ? `<tr><td style="padding: 4px 0; font-weight: 600;">Profession :</td><td>${prof}</td></tr>` : ''}
          </table>
        </div>

        <!-- 2. Informations du Contrat & Devis -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
            📄 Devis & Conditions Tarifaires
          </h4>
          <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; width: 40%; font-weight: 600;">Numéro de devis :</td><td style="font-family: monospace; font-weight: bold; color: #1e3a8a; font-size: 14px;">${devisRef}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Produit :</td><td><span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">${lead.type}</span></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Formule choisie :</td><td style="font-weight: bold; color: #047857;">${formuleChoisie}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Cotisation mensuelle :</td><td style="font-weight: bold; font-size: 15px; color: #0f172a;">${cotisationMensuelle ? cotisationMensuelle + ' € / mois' : 'Non précisé'}</td></tr>
            ${cotisationAnnuelle ? `<tr><td style="padding: 4px 0; font-weight: 600;">Cotisation annuelle :</td><td>${cotisationAnnuelle} € / an</td></tr>` : ''}
            <tr><td style="padding: 4px 0; font-weight: 600;">Frais de dossier :</td><td>${fraisDossier} €</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Franchise générale :</td><td>${franchise} €</td></tr>
            ${comp ? `<tr><td style="padding: 4px 0; font-weight: 600;">Compagnie partenaire :</td><td>${comp}</td></tr>` : ''}
            ${dateEffet ? `<tr><td style="padding: 4px 0; font-weight: 600;">Date d'effet demandée :</td><td style="font-weight: bold; color: #b45309;">${dateEffet}</td></tr>` : ''}
          </table>
        </div>

        <!-- 3. Détails techniques du Risque -->
        ${risqueDetailsHtml}

        <!-- 4. Documents & Devoir de Conseil -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
            📑 Pièces & Conformité Devoir de Conseil
          </h4>
          <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; width: 40%; font-weight: 600;">Devoir de Conseil (DDA) :</td>
              <td>${lead.devoirConseilData ? '<span style="color: #047857; font-weight: bold;">✔ Complété et validé</span>' : '<span style="color: #b45309;">À compléter / En attente</span>'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 600; vertical-align: top;">Documents du dossier :</td>
              <td>${docsList}</td>
            </tr>
          </table>
        </div>

        <!-- 5. Commercial Référent -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
            💼 Commercial en charge
          </h4>
          <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; width: 40%; font-weight: 600;">Agent Commercial :</td><td><strong>${commercialNom}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Équipe :</td><td>${equipeName}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Téléphone :</td><td>${commercialTel}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Email direct :</td><td>${commercialEmail}</td></tr>
          </table>
        </div>

        ${obs ? `
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #92400e; margin-top: 0; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">
            💬 Remarques & Observations du Commercial :
          </h4>
          <p style="margin: 0; font-size: 13px; color: #78350f; white-space: pre-wrap;">
            ${obs}
          </p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Ce message a été généré automatiquement par le CRM du cabinet <strong>${cabinetInfo?.nomCabinet || 'Assurance'}</strong> suite au passage du dossier en statut <strong>PDG (Prise de Garantie)</strong>.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
======================================================
DEMANDE DE PRISE DE GARANTIE (PDG) / SOUSCRIPTION
======================================================
Dossier N° : ${devisRef}
Client : ${clientNom}
Produit : ${lead.type}
Formule : ${formuleChoisie}
Cotisation : ${cotisationMensuelle ? cotisationMensuelle + ' € / mois' : 'N/A'}
Date transmission : ${dateTransmission}
Commercial référent : ${commercialNom} (${equipeName})
Téléphone commercial : ${commercialTel} | Email : ${commercialEmail}

COORDONNÉES SOUSCRIPTEUR:
- Téléphone : ${lead.telephone || 'N/A'}
- Email : ${lead.email || 'N/A'}
- Adresse : ${adresseStr || 'Non renseignée'}

${risqueDetailsText}
DOCUMENTS DU DOSSIER:
${docsListText}

${obs ? 'OBSERVATIONS COMMERCIAL:\n' + obs : ''}
======================================================
`;

  return { subject, html, text };
};

export interface NotifyGestionnairesOptions {
  lead: Lead;
  initiatorUser?: User | null;
  allUsers: User[];
  cabinetInfo?: CabinetInfo;
  smtpConfig?: SmtpConfig;
  onOpenLead?: (lead: Lead) => void;
}

/**
 * Envoie la notification en temps réel et l'email avec tous les détails du lead
 * à la gestionnaire de la même équipe lorsqu'un agent commercial passe le statut en PDG.
 */
export const notifyGestionnairesOnPdg = async ({
  lead,
  initiatorUser,
  allUsers,
  cabinetInfo,
  smtpConfig,
  onOpenLead
}: NotifyGestionnairesOptions): Promise<PdgNotificationResult> => {
  const leadTeamNorm = normalizeText(lead.equipe || initiatorUser?.equipe || '');

  // 1. Recherche des gestionnaires de la même équipe
  let targetGestionnaires = allUsers.filter((u) => {
    if (u.role !== 'GESTIONNAIRE') return false;
    if (!u.email || !u.email.includes('@')) return false;

    // Si une équipe est définie, vérifier la correspondance d'équipe
    if (leadTeamNorm && u.equipe) {
      return normalizeText(u.equipe) === leadTeamNorm;
    }
    return true;
  });

  // Si aucun gestionnaire avec la même équipe stricte n'est trouvé, rechercher tous les gestionnaires du cabinet
  if (targetGestionnaires.length === 0) {
    targetGestionnaires = allUsers.filter(
      (u) => u.role === 'GESTIONNAIRE' && u.email && u.email.includes('@')
    );
  }

  // Fallback si aucun compte gestionnaire n'a d'email : notifier les directeurs ou le cabinet
  const fallbackEmail = cabinetInfo?.emailContact || (cabinetInfo as any)?.email;
  const recipientEmails: string[] = targetGestionnaires.map((g) => g.email.trim().toLowerCase());

  if (recipientEmails.length === 0 && fallbackEmail && fallbackEmail.includes('@')) {
    recipientEmails.push(fallbackEmail.trim().toLowerCase());
  }

  const clientNom = `${lead.nom || ''} ${lead.prenom || ''}`.trim() || 'Client';
  const commercialNom = initiatorUser ? getUserDisplayName(initiatorUser) : (lead.assignedBroker || 'Commercial');
  const devisRef = lead.referenceDevis || lead.id || 'N/A';

  // 2. Déclenchement de la notification Windows Desktop & sonore
  try {
    sendWindowsDesktopNotification(
      `🛡️ Demande de Souscription (PDG) — ${clientNom}`,
      {
        body: `Devis N° ${devisRef} | Produit : ${lead.type}\nTransmis par : ${commercialNom}\nStatut : Prise de Garantie (PDG)`,
        tag: `pdg-${lead.id}`,
        requireInteraction: true,
        soundPreset: 'urgent',
        onClickUrl: `/?tab=leads&leadId=${lead.id}`,
        onClick: () => {
          if (onOpenLead) onOpenLead(lead);
        },
        data: {
          type: 'pdg_request',
          leadId: lead.id
        }
      }
    );
  } catch (notifErr) {
    console.warn('Erreur notification desktop PDG:', notifErr);
  }

  // 3. Déclenchement d'un événement personnalisé dans l'application pour afficher un bandeau toast visuel
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('crm-pdg-notification', {
      detail: {
        lead,
        initiatorUser,
        targetGestionnaires,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(customEvent);
  }

  // 4. Envoi de l'email via le serveur SMTP
  const effectiveSmtp = (initiatorUser?.smtpConfig?.host)
    ? initiatorUser.smtpConfig
    : (cabinetInfo as any)?.smtpConfig || smtpConfig;

  const emailContent = formatPdgEmailContent(lead, initiatorUser, cabinetInfo);

  if (recipientEmails.length === 0) {
    return {
      success: false,
      recipients: [],
      message: 'Aucun compte Gestionnaire avec adresse email valide trouvé pour recevoir la demande PDG.'
    };
  }

  if (!effectiveSmtp || !effectiveSmtp.host || !effectiveSmtp.username) {
    console.warn('Serveur SMTP non configuré. Notification in-app effectuée mais email non envoyé.');
    return {
      success: true,
      recipients: recipientEmails,
      message: `Notification transmise à l'écran. Note : Le serveur SMTP n'est pas encore configuré pour l'envoi d'email automatique aux gestionnaires (${recipientEmails.join(', ')}).`
    };
  }

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpConfig: effectiveSmtp,
        to: recipientEmails.join(', '),
        subject: emailContent.subject,
        body: emailContent.text,
        htmlBody: emailContent.html,
        cabinetInfo: cabinetInfo,
        advisorName: commercialNom,
        advisorEmail: effectiveSmtp.senderEmail || initiatorUser?.email,
        advisorPhone: initiatorUser?.telephonyConfig?.directNumber || cabinetInfo?.telephone,
        advisorTitle: initiatorUser?.role === 'AGENT_COMMERCIAL' ? 'Agent Commercial' : 'Conseiller Assurances',
        attachments: []
      })
    });

    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        recipients: recipientEmails,
        message: `Email de demande de souscription (PDG) envoyé avec succès à ${recipientEmails.join(', ')}.`
      };
    } else {
      return {
        success: false,
        recipients: recipientEmails,
        message: data.error || "Erreur lors de l'envoi du mail via le serveur SMTP.",
        error: data.rawError
      };
    }
  } catch (err: any) {
    console.error('Erreur API send-email pour PDG:', err);
    return {
      success: false,
      recipients: recipientEmails,
      message: "Erreur réseau lors de l'appel au serveur d'envoi d'email.",
      error: String(err?.message || err)
    };
  }
};
