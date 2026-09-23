import { Lead, User } from '../types/crm';

/**
 * Normalise une chaîne de texte pour comparaison sans accents et en minuscules
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
 * Vérifie si un mot complet est présent dans une chaîne cible
 */
const containsWord = (target: string, word: string): boolean => {
  if (!target || !word) return false;
  const normTarget = normalizeText(target);
  const normWord = normalizeText(word);
  if (!normTarget || !normWord) return false;

  // Regex de mot complet
  const escaped = normWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return regex.test(normTarget);
};

/**
 * Vérifie si un lead est explicitement attribué à un utilisateur donné
 */
export const isLeadAssignedToUser = (lead?: Lead | null, user?: User | null): boolean => {
  if (!lead || !user) return false;

  // 1. Vérification par ID direct si disponible
  const leadObj = lead as any;
  if (leadObj.assignedToId && leadObj.assignedToId === user.id) {
    return true;
  }

  // 2. Nom de l'agent attribué
  const assignedStr = (lead.attribueA || lead.assignedBroker || '').trim();
  const normAssigned = normalizeText(assignedStr);
  if (
    !normAssigned ||
    normAssigned === 'non attribue' ||
    normAssigned === 'non assigne' ||
    normAssigned === 'non attribuee'
  ) {
    return false;
  }

  // Coordonnées utilisateur normalisées
  const userNom = normalizeText(user.nom);
  const userPrenom = normalizeText(user.prenom);
  const userPseudo = normalizeText(user.pseudo);
  const userEmail = normalizeText(user.email);
  const fullName = normalizeText(`${user.prenom} ${user.nom}`);
  const reverseFullName = normalizeText(`${user.nom} ${user.prenom}`);

  // Correspondance par pseudo direct ou mot complet
  if (userPseudo && (normAssigned === userPseudo || normAssigned.includes(userPseudo) || containsWord(normAssigned, userPseudo))) {
    return true;
  }

  // Correspondance exacte sur e-mail
  if (userEmail && normAssigned === userEmail) {
    return true;
  }

  // Correspondance exacte sur nom complet
  if (fullName && (normAssigned === fullName || normAssigned.includes(fullName))) {
    return true;
  }
  if (reverseFullName && (normAssigned === reverseFullName || normAssigned.includes(reverseFullName))) {
    return true;
  }

  // Si l'utilisateur a un prénom ET un nom valides (au moins 2 lettres chacun)
  // Il faut que les DEUX soient présents en tant que mots distincts dans l'attribution
  if (userNom.length >= 2 && userPrenom.length >= 2) {
    if (containsWord(normAssigned, userNom) && containsWord(normAssigned, userPrenom)) {
      return true;
    }
  }

  return false;
};

/**
 * Détermine si un utilisateur a le droit de visualiser et manipuler un lead donné
 */
export const isLeadAccessibleByUser = (
  lead?: Lead | null,
  user?: User | null,
  allUsers?: User[]
): boolean => {
  if (!lead) return false;
  if (!user) return true; // Si aucune session utilisateur n'est définie

  // 1. Administrateurs et Directeurs de Production : Accès global illimité
  if (
    user.role === 'ADMIN' ||
    user.role === 'DIRECTEUR_PRODUCTION' ||
    user.permissions?.canViewAllLeads === true
  ) {
    return true;
  }

  // 2. Lead directement attribué à l'utilisateur
  if (isLeadAssignedToUser(lead, user)) {
    return true;
  }

  const userTeam = normalizeText(user.equipe);
  let leadTeam = normalizeText(lead.equipe);

  // Si l'équipe n'est pas renseignée explicitement sur le lead, déduire l'équipe de l'agent commercial assigné
  if (!leadTeam && allUsers && allUsers.length > 0) {
    const assignedUser = allUsers.find((u) => isLeadAssignedToUser(lead, u));
    if (assignedUser?.equipe) {
      leadTeam = normalizeText(assignedUser.equipe);
    }
  }

  // 3. Responsables d'équipe et Managers : Accès aux leads de leur équipe respective
  if (user.role === 'RESPONSABLE_EQUIPE' || user.role === 'MANAGER') {
    if (userTeam && leadTeam && userTeam === leadTeam) {
      return true;
    }
  }

  // 4. Gestionnaires :
  // - Si le statut du lead est PDG (Prise De Garantie) : IMMÉDIATEMENT VISIBLE au gestionnaire du même groupe équipe
  // - Accès également aux dossiers attribués ou aux leads rattachés à la même équipe
  if (user.role === 'GESTIONNAIRE') {
    const isPdg = lead.status?.toUpperCase() === 'PDG';
    if (isPdg) {
      // Si même équipe, le lead est visible
      if (userTeam && leadTeam) {
        if (userTeam === leadTeam) return true;
      } else {
        // Si l'un des deux n'a pas d'équipe restreinte, visible par défaut pour le gestionnaire
        return true;
      }
    }

    // Accès standard gestionnaire pour les leads de son équipe
    if (userTeam && leadTeam && userTeam === leadTeam) {
      return true;
    }
  }

  // 5. Par défaut pour les Agents Commerciaux et Courtiers (canViewAllLeads: false) :
  // STRICTEMENT restreint aux leads qui leur sont directement attribués
  return false;
};

/**
 * Filtre une liste de leads pour ne conserver que ceux accessibles à l'utilisateur
 */
export const getAccessibleLeads = (
  leads: Lead[],
  user?: User | null,
  allUsers?: User[]
): Lead[] => {
  if (!leads || leads.length === 0) return [];
  if (!user) return leads;
  if (
    user.role === 'ADMIN' ||
    user.role === 'DIRECTEUR_PRODUCTION' ||
    user.permissions?.canViewAllLeads === true
  ) {
    return leads;
  }
  return leads.filter((l) => isLeadAccessibleByUser(l, user, allUsers));
};

/**
 * Filtre les rappels actifs et accessibles pour un utilisateur
 */
export const getAccessibleReminders = (
  leads: Lead[],
  user?: User | null,
  allUsers?: User[]
): Lead[] => {
  const accessible = getAccessibleLeads(leads, user, allUsers);
  return accessible.filter(
    (l) => l.prochaineActionDate && l.status !== 'GAGNE' && l.status !== 'PERDU'
  );
};

/**
 * Vérifie si un utilisateur a l'autorisation de supprimer un lead.
 * Règle de gestion : si la case "Supprimer des leads" (canDeleteLeads) n'est pas expressément cochée
 * sur le compte de l'utilisateur, toute suppression de lead est STRICTEMENT interdite
 * et aucun bouton de suppression ne doit être affiché.
 */
export const canUserDeleteLead = (user?: User | null): boolean => {
  if (!user || !user.permissions) return false;
  return Boolean(user.permissions.canDeleteLeads);
};

