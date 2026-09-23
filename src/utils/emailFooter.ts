import { CabinetInfo } from '../types/crm';

export interface EmailFooterOptions {
  advisorName?: string;
  advisorEmail?: string;
  advisorPhone?: string;
  advisorTitle?: string;
  subject?: string;
  signatureImageUrl?: string;
  signatureMode?: 'IMAGE' | 'TEXT' | 'BOTH';
}

/**
 * Nettoie une chaîne de texte pour éviter les injections HTML
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convertit un texte brut avec sauts de ligne en paragraphes HTML propres et fluides sur mobile
 */
function formatPlainTextToHtml(text: string): string {
  if (!text) return '';
  // Découper par doubles sauts de ligne pour les paragraphes
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      // Remplacer les sauts simples par des <br>
      const withBreaks = escapeHtml(trimmed).replace(/\n/g, '<br />');
      return `<p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.55; color: #1e293b;">${withBreaks}</p>`;
    })
    .join('');
}

/**
 * Génère le pied de page professionnel au format HTML responsive (adapté aux téléphones et ordinateurs)
 */
export function generateProfessionalEmailFooterHtml(
  cabinetInfo: Partial<CabinetInfo> = {},
  options: EmailFooterOptions = {}
): string {
  const signatureImg = (options.signatureImageUrl || cabinetInfo.emailSignatureImageUrl || '').trim();
  const signatureMode = options.signatureMode || cabinetInfo.emailSignatureMode || (signatureImg ? 'IMAGE' : 'TEXT');

  const nomCabinet = (cabinetInfo.nomCabinet || '').trim();
  const nomCourtier = (options.advisorName || cabinetInfo.nomCourtierPrincipal || '').trim();
  const advisorTitle = (options.advisorTitle || 'Conseiller Assurances').trim();
  const telephone = (options.advisorPhone || cabinetInfo.telephone || '').trim();
  const email = (options.advisorEmail || cabinetInfo.emailContact || '').trim();
  const numeroOrias = (cabinetInfo.numeroOrias || '').trim();
  const siret = (cabinetInfo.siret || '').trim();
  const adresse = (cabinetInfo.adresse || '').trim();
  const cp = (cabinetInfo.codePostal || '').trim();
  const ville = (cabinetInfo.ville || '').trim();
  const siteWeb = (cabinetInfo.siteWeb || '').trim();
  const logoUrl = cabinetInfo.logoUrl?.trim();
  const mentionsLegales = (cabinetInfo.mentionsLegales || '').trim();

  const adresseComplete = [adresse, [cp, ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const cleanWebDisplay = siteWeb.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const webLink = siteWeb ? (siteWeb.startsWith('http') ? siteWeb : `https://${siteWeb}`) : '';

  // CAS 1 : L'utilisateur a téléversé une photo / image de signature et a choisi le mode IMAGE ou par défaut
  if (signatureImg && (signatureMode === 'IMAGE')) {
    return `
<!-- DEBUT SIGNATURE EMAIL IMAGE -->
<div class="cabinet-email-footer" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
  <div style="max-width: 100%; text-align: left;">
    <img src="${signatureImg}" class="cabinet-signature-img" alt="${escapeHtml(nomCourtier || nomCabinet || 'Signature')}" style="display: block; max-width: 100%; width: auto; max-height: 240px; height: auto; border: 0; outline: none; border-radius: 4px;" />
  </div>
  ${mentionsLegales || numeroOrias ? `
    <div style="margin-top: 10px; font-size: 10px; color: #94a3b8; line-height: 1.4;">
      ${numeroOrias ? `ORIAS N° ${escapeHtml(numeroOrias)} • ` : ''}
      ${nomCabinet ? `${escapeHtml(nomCabinet)} • ` : ''}
      Courtage en assurances sous le contrôle de l'ACPR.
    </div>
  ` : ''}
</div>
<!-- FIN SIGNATURE EMAIL IMAGE -->
`.trim();
  }

  // CAS 2 : Mode BOTH (Image de signature téléversée + mentions et coordonnées)
  const imageBlock = signatureImg ? `
    <div style="margin-bottom: 16px;">
      <img src="${signatureImg}" class="cabinet-signature-img" alt="${escapeHtml(nomCourtier || nomCabinet || 'Signature')}" style="display: block; max-width: 100%; width: auto; max-height: 220px; height: auto; border: 0; outline: none; border-radius: 4px;" />
    </div>
  ` : '';

  // CAS 3 : Mode TEXT ou BOTH (Pied de page fluide, optimisé mobile)
  return `
<!-- DEBUT PIED DE PAGE PROFESSIONNEL -->
<div class="cabinet-email-footer" style="margin-top: 28px; padding-top: 18px; border-top: 2px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  ${imageBlock}

  ${!signatureImg ? `
    <!-- EN-TETE / CONSEILLER -->
    <div style="margin-bottom: 14px;">
      ${logoUrl ? `
        <div style="margin-bottom: 10px;">
          <img src="${logoUrl}" class="cabinet-logo-img" alt="${escapeHtml(nomCabinet)}" style="max-height: 44px; max-width: 180px; width: auto; height: auto; display: block; object-fit: contain;" />
        </div>
      ` : ''}
      ${nomCourtier ? `
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.3;">
          ${escapeHtml(nomCourtier)}
        </div>
      ` : ''}
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
        ${escapeHtml(advisorTitle)}${nomCabinet ? ` • <strong style="color: #2563eb;">${escapeHtml(nomCabinet)}</strong>` : ''}
      </div>
    </div>

    <!-- COORDONNEES DIRECTES CLÉS -->
    ${(telephone || email || adresseComplete || webLink) ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; line-height: 1.6; color: #334155;">
        ${telephone ? `
          <div style="margin: 2px 0;">
            📞 <strong>Tél :</strong> <a href="tel:${telephone.replace(/\s+/g, '')}" style="color: #0f172a; font-weight: 600; text-decoration: none;">${escapeHtml(telephone)}</a>
          </div>
        ` : ''}
        ${email ? `
          <div style="margin: 2px 0;">
            ✉️ <strong>Email :</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${escapeHtml(email)}</a>
          </div>
        ` : ''}
        ${adresseComplete ? `
          <div style="margin: 2px 0;">
            📍 <strong>Adresse :</strong> ${escapeHtml(adresseComplete)}
          </div>
        ` : ''}
        ${webLink ? `
          <div style="margin: 2px 0;">
            🌐 <strong>Site web :</strong> <a href="${webLink}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none;">${escapeHtml(cleanWebDisplay)}</a>
          </div>
        ` : ''}
      </div>
    ` : ''}
  ` : ''}

  <!-- MENTIONS LEGALES & REGLEMENTAIRES -->
  <div style="font-size: 10px; line-height: 1.45; color: #64748b; margin-top: 8px;">
    ${numeroOrias ? `
      <div style="margin-bottom: 4px;">
        <span style="display: inline-block; background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
          ORIAS N° ${escapeHtml(numeroOrias)}
        </span>
        <span style="color: #94a3b8; font-size: 9.5px; margin-left: 4px;">(www.orias.fr)</span>
        ${siret ? `<span style="margin-left: 8px; color: #64748b;">SIRET : ${escapeHtml(siret)}</span>` : ''}
      </div>
    ` : (siret ? `<div style="margin-bottom: 4px; color: #64748b;">SIRET : ${escapeHtml(siret)}</div>` : '')}

    <div style="margin-bottom: 6px;">
      ${mentionsLegales ? escapeHtml(mentionsLegales) : `
        ${nomCabinet ? `<strong>${escapeHtml(nomCabinet)}</strong> - ` : ''}Cabinet de courtage d'assurance régi par le Code des Assurances et sous le contrôle de l'ACPR (4 Place de Budapest, 75436 Paris).
      `}
    </div>

    <div style="font-size: 9px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 6px; font-style: italic;">
      🔒 <strong>Confidentialité :</strong> Ce message et ses éventuelles pièces jointes sont protégés par le secret professionnel et le RGPD. Si vous l'avez reçu par erreur, merci de le supprimer et d'en avertir l'expéditeur.
    </div>
    <div style="font-size: 9px; color: #15803d; margin-top: 3px;">
      🌱 N'imprimez cet email qu'en cas de nécessité.
    </div>
  </div>
</div>
<!-- FIN PIED DE PAGE PROFESSIONNEL -->
`.trim();
}

/**
 * Génère le pied de page professionnel au format texte brut (pour mailto ou clients texte)
 */
export function generateProfessionalEmailFooterText(
  cabinetInfo: Partial<CabinetInfo> = {},
  options: EmailFooterOptions = {}
): string {
  const nomCabinet = (cabinetInfo.nomCabinet || '').trim();
  const nomCourtier = (options.advisorName || cabinetInfo.nomCourtierPrincipal || '').trim();
  const advisorTitle = (options.advisorTitle || 'Conseiller Assurances').trim();
  const telephone = (options.advisorPhone || cabinetInfo.telephone || '').trim();
  const email = (options.advisorEmail || cabinetInfo.emailContact || '').trim();
  const numeroOrias = (cabinetInfo.numeroOrias || '').trim();
  const siret = (cabinetInfo.siret || '').trim();
  const adresse = (cabinetInfo.adresse || '').trim();
  const cp = (cabinetInfo.codePostal || '').trim();
  const ville = (cabinetInfo.ville || '').trim();
  const siteWeb = (cabinetInfo.siteWeb || '').trim();

  const adresseComplete = [adresse, [cp, ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  const lines: string[] = ['', '--'];
  if (nomCourtier) lines.push(nomCourtier);
  if (nomCabinet) lines.push(`${advisorTitle} | ${nomCabinet}`);
  if (telephone) lines.push(`📞 Tél : ${telephone}`);
  if (email) lines.push(`✉️ Email : ${email}`);
  if (adresseComplete) lines.push(`📍 Adresse : ${adresseComplete}`);
  if (siteWeb) lines.push(`🌐 Site : ${siteWeb}`);

  if (numeroOrias || siret) {
    lines.push('--------------------------------------------------');
    if (numeroOrias) lines.push(`Immatriculation ORIAS N° ${numeroOrias} (www.orias.fr)`);
    if (siret) lines.push(`SIRET : ${siret}`);
  }

  lines.push(`Courtage d'assurance sous le contrôle de l'ACPR.`);
  lines.push(`🔒 Message confidentiel protégé par le secret professionnel et le RGPD.`);

  return lines.join('\n');
}

/**
 * Assemble un e-mail complet HTML parfaitement adapté aux téléphones mobiles et ordinateurs
 */
export function buildCompleteEmailHtml(
  contentBodyOrHtml: string,
  cabinetInfo: Partial<CabinetInfo> = {},
  options: EmailFooterOptions = {}
): string {
  const isHtml = /<[a-z][\s\S]*>/i.test(contentBodyOrHtml);
  const formattedContent = isHtml
    ? contentBodyOrHtml
    : formatPlainTextToHtml(contentBodyOrHtml);

  // Vérifier si le pied de page est déjà présent pour éviter tout doublon
  if (
    contentBodyOrHtml.includes('cabinet-email-footer') ||
    contentBodyOrHtml.includes('DEBUT PIED DE PAGE') ||
    contentBodyOrHtml.includes('DEBUT SIGNATURE EMAIL IMAGE')
  ) {
    return contentBodyOrHtml;
  }

  const footerHtml = generateProfessionalEmailFooterHtml(cabinetInfo, options);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(options.subject || 'Message de votre courtier')}</title>
  <style type="text/css">
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 12px 14px !important;
      }
      .email-content {
        font-size: 15px !important;
        line-height: 1.5 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; padding: 18px 16px 28px 16px;" class="email-container">
    <div class="email-content">
      ${formattedContent}
    </div>
    ${footerHtml}
  </div>
</body>
</html>
`.trim();
}

/**
 * Assemble un e-mail complet en texte brut (corps + pied de page professionnel)
 */
export function buildCompleteEmailText(
  bodyText: string,
  cabinetInfo: Partial<CabinetInfo> = {},
  options: EmailFooterOptions = {}
): string {
  if (bodyText.includes('ORIAS N°') || bodyText.includes('🔒 Message confidentiel')) {
    return bodyText;
  }
  const footerText = generateProfessionalEmailFooterText(cabinetInfo, options);
  return `${bodyText.trimEnd()}\n\n${footerText}`;
}
