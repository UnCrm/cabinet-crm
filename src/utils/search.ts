import { Lead } from '../types/crm';

/**
 * Supprime les accents et met en minuscules pour une comparaison insensible à la casse et aux diacritiques
 */
export function normalizeText(str?: string | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Garde uniquement les chiffres pour la comparaison téléphonique
 */
export function extractDigits(str?: string | null): string {
  if (!str) return '';
  return str.replace(/\D/g, '');
}

/**
 * Génère les variantes d'un numéro de téléphone (avec / sans préfixe international +33 / 0033 / 0...)
 */
export function getPhoneVariants(phone?: string | null): string[] {
  const digits = extractDigits(phone);
  if (!digits) return [];
  const variants = new Set<string>();
  variants.add(digits);

  // Ex: 33612345678 -> 0612345678
  if (digits.startsWith('33') && digits.length >= 10) {
    variants.add('0' + digits.slice(2));
  }
  // Ex: 0033612345678 -> 0612345678
  if (digits.startsWith('0033') && digits.length >= 12) {
    variants.add('0' + digits.slice(4));
  }
  // Ex: 0612345678 -> 33612345678
  if (digits.startsWith('0') && digits.length === 10) {
    variants.add('33' + digits.slice(1));
  }

  return Array.from(variants);
}

/**
 * Garde uniquement les caractères alphanumériques en majuscules (idéal pour immatriculation, référence devis, SIRET)
 */
export function extractAlphaNum(str?: string | null): string {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Vérifie si un lead correspond à une requête de recherche sans contrainte :
 * - Téléphone sans espace ni séparateur (ex: 0612345678 trouve "06 12 34 56 78")
 * - Immatriculation sans tiret ni espace (ex: FK892XZ trouve "FK-892-XZ")
 * - Recherche insensible aux accents (ex: helene trouve "Hélène")
 * - Insensible aux majuscules/minuscules
 * - Référence devis sans tiret (ex: DEV2024 trouve "DEV-2024-001")
 * - Recherche multi-mots (ex: "dupont 06" ou "clio martin")
 */
export function matchLeadSearch(lead: Lead, query: string): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim();
  const normalizedQuery = normalizeText(rawQuery);
  const queryDigits = extractDigits(rawQuery);
  const queryAlphaNum = extractAlphaNum(rawQuery);

  // 1. Variantes téléphones du lead
  const leadPhoneVariants = [
    ...getPhoneVariants(lead.telephone),
    ...getPhoneVariants(lead.autoDetails?.telephone)
  ];

  // 2. Plaques d'immatriculation du lead (Auto & VTC)
  const leadImmatriculations = [
    lead.autoDetails?.immatriculation,
    lead.vtcDetails?.immatriculation
  ].filter(Boolean) as string[];

  const leadImmatAlphaNums = leadImmatriculations.map(extractAlphaNum);

  // 3. Références devis et SIRET
  const leadRefAlphaNum = extractAlphaNum(lead.referenceDevis);
  const leadSiretAlphaNum = extractAlphaNum(lead.vtcDetails?.siret);

  // 4. Test direct téléphone (si la recherche contient au moins 2 chiffres)
  if (queryDigits.length >= 2) {
    const queryPhoneVariants = getPhoneVariants(rawQuery);
    const phoneMatch = leadPhoneVariants.some(leadPhone => {
      // Substring direct sur les chiffres
      if (leadPhone.includes(queryDigits)) return true;
      // Match croisé des variantes (ex: +33 vs 0...)
      return queryPhoneVariants.some(qVar => leadPhone.includes(qVar) || qVar.includes(leadPhone));
    });
    if (phoneMatch) return true;
  }

  // 5. Test direct immatriculation (sans tiret ni espace, ex: "FK892XZ" ou "892xz")
  if (queryAlphaNum.length >= 2) {
    const immatMatch = leadImmatAlphaNums.some(immat => immat.includes(queryAlphaNum));
    if (immatMatch) return true;

    // Test sur la référence devis sans tiret
    if (leadRefAlphaNum && leadRefAlphaNum.includes(queryAlphaNum)) return true;

    // Test sur le SIRET
    if (leadSiretAlphaNum && leadSiretAlphaNum.includes(queryAlphaNum)) return true;
  }

  // 6. Index textuel complet du lead
  const textFields = [
    lead.nom,
    lead.prenom,
    `${lead.prenom} ${lead.nom}`,
    `${lead.nom} ${lead.prenom}`,
    lead.email,
    lead.telephone,
    lead.ville,
    lead.codePostal,
    lead.referenceDevis,
    lead.type,
    lead.status,
    lead.attribueA,
    lead.equipe,
    lead.autoDetails?.marqueModele,
    lead.autoDetails?.immatriculation,
    lead.autoDetails?.nom,
    lead.autoDetails?.prenom,
    lead.autoDetails?.ville,
    lead.vtcDetails?.marqueModele,
    lead.vtcDetails?.immatriculation,
    lead.vtcDetails?.nomSociete,
    lead.habitationDetails?.adresse,
    lead.habitationDetails?.ville,
    lead.habitationDetails?.codePostal
  ];

  const fullNormalizedLeadText = textFields
    .filter(Boolean)
    .map(t => normalizeText(String(t)))
    .join(' ');

  // Test complet normalisé
  if (fullNormalizedLeadText.includes(normalizedQuery)) {
    return true;
  }

  // 7. Recherche multi-mots (ex: "dupont 06" ou "clio paris" ou "fk892 martin")
  const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every(token => {
      const tokenDigits = extractDigits(token);
      const tokenAlphaNum = extractAlphaNum(token);

      // Match téléphone pour ce token
      if (tokenDigits.length >= 2 && leadPhoneVariants.some(p => p.includes(tokenDigits))) {
        return true;
      }
      // Match immatriculation pour ce token
      if (tokenAlphaNum.length >= 2 && leadImmatAlphaNums.some(i => i.includes(tokenAlphaNum))) {
        return true;
      }
      // Match sur le texte complet normalisé
      return fullNormalizedLeadText.includes(token);
    });

    if (allTokensMatch) return true;
  }

  return false;
}
