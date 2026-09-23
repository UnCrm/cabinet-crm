import { Lead } from '../types/crm';
import { extractDigits, extractAlphaNum, getPhoneVariants, normalizeText } from './search';

export interface DuplicateReason {
  type: 'PHONE' | 'EMAIL' | 'IMMATRICULATION' | 'NAME';
  label: string;
  field: string;
  matchedValue: string;
}

export interface DuplicateMatch {
  lead: Lead;
  reasons: DuplicateReason[];
}

export interface CandidateLeadCheck {
  id?: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  immatriculation?: string;
}

/**
 * Détecte si un prospect (en cours de création ou d'édition) possède des doublons dans la liste des leads.
 */
export function detectLeadDuplicates(
  candidate: CandidateLeadCheck,
  allLeads: Lead[],
  ignoreLeadId?: string
): DuplicateMatch[] {
  if (!allLeads || allLeads.length === 0) return [];

  const results: DuplicateMatch[] = [];

  const candPhoneDigits = extractDigits(candidate.telephone);
  const candPhoneVariants = getPhoneVariants(candidate.telephone);
  const candEmail = (candidate.email || '').trim().toLowerCase();
  const candImmat = extractAlphaNum(candidate.immatriculation);
  const candNom = normalizeText(candidate.nom);
  const candPrenom = normalizeText(candidate.prenom);

  for (const existing of allLeads) {
    // Ne pas comparer avec soi-même
    if (ignoreLeadId && existing.id === ignoreLeadId) continue;
    if (candidate.id && existing.id === candidate.id) continue;

    const reasons: DuplicateReason[] = [];

    // 1. Détection par Téléphone
    if (candPhoneDigits.length >= 8) {
      const existPhoneVariants = [
        ...getPhoneVariants(existing.telephone),
        ...getPhoneVariants(existing.autoDetails?.telephone)
      ];

      const hasPhoneMatch = existPhoneVariants.some(pVar => 
        candPhoneVariants.includes(pVar) || 
        (pVar.length >= 8 && candPhoneDigits.includes(pVar)) ||
        (candPhoneDigits.length >= 8 && pVar.includes(candPhoneDigits))
      );

      if (hasPhoneMatch) {
        reasons.push({
          type: 'PHONE',
          label: 'Même numéro de téléphone',
          field: 'telephone',
          matchedValue: existing.telephone || existing.autoDetails?.telephone || ''
        });
      }
    }

    // 2. Détection par E-mail
    if (candEmail && candEmail.length >= 5 && candEmail.includes('@')) {
      const existEmail = (existing.email || existing.autoDetails?.email || '').trim().toLowerCase();
      if (existEmail && existEmail === candEmail) {
        reasons.push({
          type: 'EMAIL',
          label: 'Même adresse e-mail',
          field: 'email',
          matchedValue: existEmail
        });
      }
    }

    // 3. Détection par Plaque d'immatriculation (Auto ou VTC)
    if (candImmat && candImmat.length >= 4) {
      const existImmats = [
        existing.autoDetails?.immatriculation,
        existing.vtcDetails?.immatriculation
      ]
        .filter(Boolean)
        .map(extractAlphaNum);

      const hasImmatMatch = existImmats.some(i => i === candImmat || (i.length >= 6 && i.includes(candImmat)));
      if (hasImmatMatch) {
        const rawImmat = existing.autoDetails?.immatriculation || existing.vtcDetails?.immatriculation || '';
        reasons.push({
          type: 'IMMATRICULATION',
          label: 'Même plaque d\'immatriculation',
          field: 'immatriculation',
          matchedValue: rawImmat
        });
      }
    }

    // 4. Détection par Nom + Prénom (si non vide et si nom + prénom identiques)
    if (candNom && candPrenom && candNom.length >= 2 && candPrenom.length >= 2) {
      const existNom = normalizeText(existing.nom);
      const existPrenom = normalizeText(existing.prenom);

      if (existNom === candNom && existPrenom === candPrenom) {
        // Renforcement de la certitude si même ville ou code postal
        const sameCity = normalizeText(existing.ville) && normalizeText(candidate.nom) /* helper */;
        reasons.push({
          type: 'NAME',
          label: 'Même Nom et Prénom',
          field: 'nom_prenom',
          matchedValue: `${existing.prenom} ${existing.nom} (${existing.ville || 'Sans ville'})`
        });
      }
    }

    if (reasons.length > 0) {
      results.push({
        lead: existing,
        reasons
      });
    }
  }

  return results;
}

/**
 * Calcule tous les doublons de la base pour affichage groupé dans LeadsList
 */
export function computeAllDuplicatesInList(allLeads: Lead[]): Map<string, DuplicateReason[]> {
  const duplicateMap = new Map<string, DuplicateReason[]>();

  for (let i = 0; i < allLeads.length; i++) {
    const leadA = allLeads[i];
    for (let j = i + 1; j < allLeads.length; j++) {
      const leadB = allLeads[j];

      const phoneDigitsA = extractDigits(leadA.telephone);
      const phoneDigitsB = extractDigits(leadB.telephone);
      const emailA = (leadA.email || '').trim().toLowerCase();
      const emailB = (leadB.email || '').trim().toLowerCase();
      const immatA = extractAlphaNum(leadA.autoDetails?.immatriculation || leadA.vtcDetails?.immatriculation);
      const immatB = extractAlphaNum(leadB.autoDetails?.immatriculation || leadB.vtcDetails?.immatriculation);
      const nomA = normalizeText(leadA.nom);
      const prenomA = normalizeText(leadA.prenom);
      const nomB = normalizeText(leadB.nom);
      const prenomB = normalizeText(leadB.prenom);

      const reasons: DuplicateReason[] = [];

      if (phoneDigitsA && phoneDigitsA.length >= 8 && phoneDigitsA === phoneDigitsB) {
        reasons.push({ type: 'PHONE', label: 'Même téléphone', field: 'telephone', matchedValue: leadB.telephone });
      } else if (emailA && emailA.includes('@') && emailA === emailB) {
        reasons.push({ type: 'EMAIL', label: 'Même e-mail', field: 'email', matchedValue: emailB });
      } else if (immatA && immatA.length >= 5 && immatA === immatB) {
        reasons.push({ type: 'IMMATRICULATION', label: 'Même immatriculation', field: 'immatriculation', matchedValue: immatB });
      } else if (nomA && prenomA && nomA === nomB && prenomA === prenomB) {
        reasons.push({ type: 'NAME', label: 'Même nom et prénom', field: 'nom_prenom', matchedValue: `${leadB.prenom} ${leadB.nom}` });
      }

      if (reasons.length > 0) {
        const existingA = duplicateMap.get(leadA.id) || [];
        duplicateMap.set(leadA.id, [...existingA, ...reasons]);

        const existingB = duplicateMap.get(leadB.id) || [];
        duplicateMap.set(leadB.id, [...existingB, ...reasons]);
      }
    }
  }

  return duplicateMap;
}
