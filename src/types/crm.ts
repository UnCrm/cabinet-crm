export type LeadType = 'AUTO' | 'HABITATION' | 'VTC';

export type LeadStatus =
  | 'NOUVEAU'
  | 'A_CONTACTER'
  | 'DEVIS_ENVOYE'
  | 'RELANCE'
  | 'PDG'
  | 'GAGNE'
  | 'PERDU'
  | string;

export type LeadQualification =
  | 'CHAUD'
  | 'TIEDE'
  | 'FROID'
  | 'HORS_CIBLE'
  | 'INJOIGNABLE';

export interface SinistreItem {
  id: string;
  nature: string; // Predefined motif or custom string
  date: string;
  tauxResponsabilite: '0%' | '50%' | '100%';
  montantIndemnise?: number;
}

export interface NoteItem {
  id: string;
  author: string;
  date: string;
  content: string;
}

export interface LeadDocument {
  id: string;
  name: string; // Nom personnalisé saisi par l'utilisateur (obligatoire)
  fileName: string; // Nom original du fichier (ex: scan_permis.pdf)
  fileType: string; // Ex: 'application/pdf', 'image/jpeg', 'image/png'
  fileSize: number; // En octets
  uploadedAt: string; // Date d'ajout
  uploadedBy?: string; // Utilisateur ayant ajouté le document
  category?: 'PERMIS' | 'CARTE_GRISE' | 'RELEVE_INFORMATION' | 'PIECE_IDENTITE' | 'JUSTIFICATIF_DOMICILE' | 'KBIS' | 'CONTRAT_SIGNE' | 'RIB' | 'AUTRE';
  notes?: string;
  dataUrl?: string; // Stockage base64 pour prévisualisation et téléchargement direct
}

export interface ActivityLogItem {
  id: string;
  type: 'STATUS_CHANGE' | 'NOTE_ADDED' | 'EMAIL_SENT' | 'QUOTE_GENERATED' | 'REMINDER_SET' | 'LEAD_CREATED' | 'LEAD_UPDATED' | 'CALL_LOGGED' | 'DDA_GENERATED' | 'SIGNATURE_REQUESTED' | 'SIGNATURE_COMPLETED';
  title: string;
  description: string;
  author: string;
  date: string;
  metadata?: {
    emailSubject?: string;
    emailRecipient?: string;
    oldStatus?: string;
    newStatus?: string;
    pdfName?: string;
    callDurationSeconds?: number;
    callOutcome?: string;
    signedDocumentId?: string;
    signatureOtp?: string;
    signatureMethod?: string;
  };
}

// Auto specific data
export interface AutoDetails {
  // Conducteur
  civilite?: 'Mr' | 'Mme';
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  codePostal: string;
  ville: string;
  dateNaissance: string;
  datePermis: string;
  situationFamiliale: string; // Célibataire, Marié(e), PACSÉ(e), Divorcé(e), Séparé(e), Veuf(ve), Concubinage
  profession: string; // Salarié, Fonctionnaire, Indépendant / TNS, Commerçant / Artisan, Profession Libérale, Chef d'entreprise, Retraité, Étudiant, Sans activité, Autre

  // Véhicule
  immatriculation: string;
  marqueModele?: string;
  version?: string; // Finition / moteur (ex: 1.5 dCi 115ch, TCe 90 Intens)
  energie?: 'Essence' | 'Diesel' | 'Électrique' | 'Hybride' | 'Hybride Rechargeable' | 'GPL' | 'Bioéthanol E85' | 'Autre';
  puissanceFiscale?: number; // CV fiscaux
  valeurEstimee?: number; // Valeur d'achat / vénale estimée en €
  dateMiseEnCirculation: string;
  dateAchat: string;
  typeUtilisation: 'Trajet privé' | 'Trajet travail' | 'Tournées / Commercial' | 'VTC / Taxi';
  kilometrageAnnuel?: '< 5 000 km' | '5 000–10 000' | '10 000–15 000' | '15 000–20 000' | '20 000–30 000' | '> 30 000' | 'Kilométrage illimité' | string;
  statutVehicule?: 'Neuf' | 'Occasion' | 'LOA' | 'LLD' | 'Crédit' | 'Comptant' | 'Autre';
  stationnementNuit?: 'Garage fermé' | 'Parking privé' | 'Parking collectif' | 'Voie publique' | 'Cour fermée' | 'Autre';
  proprietaireVehicule: 'Conducteur principal' | 'Propriétaire unique' | 'Co-propriétaire' | 'LOA (Location Option d\'Achat)' | 'LLD (Location Longue Durée)' | 'Société de leasing' | 'Autre';

  // Antécédents
  dejaAssure: boolean;
  nomDerniereCompagnie?: string;
  nombreMoisAssure36Mois?: number;
  bonusMalus: number; // 0.50 to 3.50
  aEuDesSinistres: boolean;
  sinistres: SinistreItem[];
  
  contratStatut: 'En cours' | 'Résilié' | 'Aucun';
  motifResiliation?: 'Non-paiement' | 'Fausse déclaration' | 'Sinistre' | 'A l\'échéance' | 'Vente véhicule' | 'Autre';
  
  // Distinguer Suspension & Annulation
  aEuSuspensionPermis?: boolean;
  suspensionDate?: string;
  suspensionMotif?: string;
  suspensionDureeMois?: number;

  aEuAnnulationPermis?: boolean;
  annulationDate?: string;
  annulationMotif?: string;

  // Retro-compatibility flag
  aEuSuspensionOuAnnulation?: boolean;

  // Proposition & Cotisations des 3 Formules (Comparatif & Devoir de Conseil)
  formuleSouhaitee: 'Tiers Simple' | 'Tiers Étendu (Vol/Incendie)' | 'Tous Risques';
  fractionnement: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel';
  cotisationMontant: number; // Montant correspondant à la formule retenue
  cotisationTiersSimple?: number; // Tarif Formule 1 (Tiers Simple)
  cotisationTiersEtendu?: number; // Tarif Formule 2 (Tiers Étendu)
  cotisationTousRisques?: number; // Tarif Formule 3 (Tous Risques)
  fraisDossier: number;
  optionsSupplementaires: string[];
}

// Habitation specific data
export interface HabitationDetails {
  // Souscripteur
  civilite?: 'Mr' | 'Mme';
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  codePostal: string;
  ville: string;
  dateNaissance: string;
  profession?: string;
  situationFamiliale?: string;

  // Logement
  typeLogement: 'Maison' | 'Appartement';
  statutOccupant: 'Propriétaire occupant' | 'Locataire' | 'PNO (Propriétaire Non Occupant)' | 'Copropriétaire';
  surfaceM2: number;
  nombrePieces: number;
  adresseBien: string;
  codePostalBien: string;
  villeBien: string;
  etage?: number;
  residencePrincipale: boolean;
  dependances: boolean;
  veranda: boolean;
  piscine: boolean;
  valeurMobilier: number;

  // Antécédents
  dejaAssure: boolean;
  nomDerniereCompagnie?: string;
  nombreMoisAssure?: number;
  aEuDesSinistres: boolean;
  sinistres: SinistreItem[];

  // Proposition & Cotisations des 3 Formules
  formuleSouhaitee: 'Formule Éco' | 'Formule Confort' | 'Formule Premium Tous Risques';
  fractionnement: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel';
  cotisationMontant: number; // Formule retenue
  cotisationFormuleEco?: number; // Formule 1 (Éco)
  cotisationFormuleConfort?: number; // Formule 2 (Confort)
  cotisationFormuleTousRisques?: number; // Formule 3 (Premium / Tous Risques)
  fraisDossier: number;
  optionsSupplementaires: string[];
}

// VTC specific data
export interface VtcDetails {
  // Chauffeur
  civilite?: 'Mr' | 'Mme';
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  codePostal: string;
  ville: string;
  dateNaissance: string;
  numeroCarteVtc: string;
  dateObtentionCarteVtc: string;
  datePermis: string;
  profession?: string;
  situationFamiliale?: string;

  // Société
  nomSociete: string;
  siret: string;
  formeJuridique: 'Auto-entrepreneur' | 'SASU' | 'EURL' | 'SARL' | 'SAS';
  chiffreAffairesEstime?: number;

  // Véhicule VTC
  immatriculation: string;
  marqueModele: string;
  version?: string; // Finition / moteur (ex: 2.5 Hybrid Lounge)
  anneeVehicule: string;
  nombrePlaces: number;
  typeMotorisation: 'Électrique' | 'Hybride' | 'Diesel' | 'Essence' | 'Hybride Rechargeable' | 'GPL' | 'Bioéthanol E85' | 'Autre';
  puissanceFiscale?: number;
  valeurEstimee?: number;
  statutVehicule?: 'Neuf' | 'Occasion' | 'LOA' | 'LLD' | 'Crédit' | 'Comptant' | 'Autre';
  stationnementNuit?: 'Garage fermé' | 'Parking privé' | 'Parking collectif' | 'Voie publique' | 'Autre';
  kilometrageAnnuel?: '< 20 000 km' | '20 000–40 000' | '40 000–60 000' | '> 60 000' | 'Kilométrage illimité' | string;
  typeUsage: 'VTC Exclusif' | 'VTC + Usage Personnel';
  proprietaireVehicule?: 'Conducteur principal' | 'Propriétaire unique' | 'Co-propriétaire' | 'LOA (Location Option d\'Achat)' | 'LLD (Location Longue Durée)' | 'Société de leasing' | 'Autre';

  // Antécédents & RC Pro
  dejaAssure: boolean;
  nomDerniereCompagnie?: string;
  nombreMoisAssure36Mois?: number;
  bonusMalus: number;
  aEuDesSinistres: boolean;
  sinistres: SinistreItem[];
  besoinRcProExploitation: boolean;

  contratStatut?: 'En cours' | 'Résilié' | 'Aucun';
  motifResiliation?: 'Non-paiement' | 'Fausse déclaration' | 'Sinistre' | 'A l\'échéance' | 'Vente véhicule' | 'Autre';

  // Distinguer Suspension & Annulation
  aEuSuspensionPermis?: boolean;
  suspensionDate?: string;
  suspensionMotif?: string;
  suspensionDureeMois?: number;

  aEuAnnulationPermis?: boolean;
  annulationDate?: string;
  annulationMotif?: string;

  // Proposition & Cotisations des 3 Formules VTC
  formuleSouhaitee: 'Tiers VTC + RC Pro' | 'Tiers Étendu VTC + RC Pro' | 'Tous Risques VTC + RC Pro';
  fractionnement: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel';
  cotisationMontant: number; // Montant retenu
  cotisationTiersSimple?: number; // Formule 1 (Tiers + RC Pro)
  cotisationTiersEtendu?: number; // Formule 2 (Tiers Étendu + RC Pro)
  cotisationTousRisques?: number; // Formule 3 (Tous Risques + RC Pro)
  fraisDossier: number;
  franchiseMontant: number;
  optionsSupplementaires: string[];
}

export interface Lead {
  id: string;
  referenceDevis: string;
  type: LeadType;
  status: LeadStatus;
  qualification?: LeadQualification;
  createdAt: string;
  updatedAt: string;
  assignedBroker: string;
  attribueA?: string;
  assignedTo?: string;
  equipe?: string;

  // Lead main contact summary
  civilite?: 'Mr' | 'Mme';
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  ville: string;
  codePostal: string;

  // Specific product data
  autoDetails?: AutoDetails;
  habitationDetails?: HabitationDetails;
  vtcDetails?: VtcDetails;

  // Next Action & Follow up
  prochaineActionIntitule?: string;
  prochaineActionDate?: string;
  prochaineActionHeure?: string;
  prochaineActionStatut?: 'A_FAIRE' | 'FAIT' | 'ANNULE';
  derniereActionCloturee?: {
    intitule: string;
    statut: 'FAIT' | 'ANNULE';
    dateCloture: string;
    auteur: string;
  };

  // DDA & Conformité Courtage (Devoir de Conseil Législation Française 2026)
  ddaData?: DdaRecord;
  devoirConseilData?: DevoirConseilData;

  // Signature Électronique
  signatureData?: ElectronicSignatureRecord;

  notes: NoteItem[];
  documents?: LeadDocument[];
  historyLogs?: ActivityLogItem[];
}

export interface DdaRecord {
  statut: 'NON_REMPLI' | 'VALIDE';
  besoinsIdentifies: string[];
  situationClient: string;
  recommandation: string;
  produitConseille: string;
  motifsConseil: string;
  dateValidation?: string;
  validePar?: string;
}

export interface DevoirConseilData {
  canal: 'Tél.' | 'Agence' | 'Visio' | 'Web' | 'E-mail';
  dateRecueil: string;
  version: string;
  conseillerNom?: string;
  referenceDossier?: string;
  
  // Custom or overridden values
  statutSouscripteur?: string;
  usageVehiculeDetail?: string;
  statutVehicule?: string;
  kilometrageAnnuelEstime?: string;
  stationnementNuit?: string;
  conducteursSecondaires?: Array<{
    nomPrenom: string;
    dateNaissance: string;
    permisDepuis: string;
    lien: string;
  }>;

  // Habitation specifique
  statutLogement?: string;
  typeBatiment?: string;
  occupationLogement?: string;
  capitalMobilierSouhaite?: string;
  capitalObjetsValeur?: string;
  capitalRc?: string;

  // VTC specifique
  statutExploitant?: string;
  activiteDeclaree?: string;
  plateformesUtilisees?: string;
  nombreVehiculesExploites?: string;
  nombreChauffeurs?: string;
  zonePrincipaleActivite?: string;
  joursActiviteSemaine?: string;
  horairesHabituels?: string;
  usageVtcVehicule?: string;

  // Garanties, Besoins, Priorités
  garantiesRecherchees: string[];
  prioritesExprimees: string[];
  assistanceSouhaitee?: string;
  niveauProtection?: string;
  budgetSouhaiteMois?: string;
  budgetSouhaiteAn?: string;
  franchiseMaxSouhaitee?: string;
  acceptationSurcout?: 'Oui' | 'Non' | 'À discuter';
  contraintesParticulieres?: string;
  syntheseBesoins: string;
  formuleChoisieIndex?: number;

  // Solutions étudiées / comparatif
  solutionsComparees: Array<{
    assureur: string;
    produitFormule: string;
    prime: string;
    franchise: string;
    observations: string;
  }>;

  // Contrat conseillé
  contratConseille: {
    assureur: string;
    produit: string;
    formule: string;
    cotisationMois: string;
    cotisationAn: string;
    frais: string;
    garantiesRetenues: string[];
    franchises: {
      brisDeGlace?: string;
      vol?: string;
      incendie?: string;
      dommages?: string;
      catastrophesNaturelles?: string;
      assistance?: string;
      autre?: string;
    };
  };

  // Justification
  justificationConseil: string;
  pointsSpecifiquesMotivants: string[];

  // Garanties non retenues
  garantiesNonRetenues: Array<{
    garantie: string;
    proposee: boolean;
    retenue: boolean;
    motif: string;
  }>;

  // Exclusions & Documents
  exclusionsExpliquees: string[];
  documentsRemis: string[];

  // Validation
  informationsSuffisantes: boolean;
  informationsManquantes?: string;
  consequencesConseil?: string;
  modificationBesoinAvantSouscription: boolean;
  modificationDetails?: string;

  // Traçabilité & Contrôle
  documentsDossierArchives: string[];
  controleurNom?: string;
  dateControle?: string;
  anomaliesControle?: string;

  // Dates et signatures
  dateValidation?: string;
  validePar?: string;
  clientSignatureDate?: string;
}

export interface ElectronicSignatureRecord {
  statut: 'NON_DEMANDE' | 'EN_ATTENTE_SMS' | 'EN_ATTENTE_EMAIL' | 'EN_ATTENTE_SMS_EMAIL' | 'SIGNE' | 'REFUSE';
  canal?: 'SMS' | 'EMAIL' | 'SMS_EMAIL';
  signatureLien?: string;
  documentTitre: string;
  codeOtp?: string;
  telephoneDestinataire: string;
  emailDestinataire: string;
  dateDemande?: string;
  dateSignature?: string;
  signataireNom: string;
  adresseIp?: string;
  certificatHash?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: 'TLS' | 'SSL' | 'NONE';
  senderEmail: string;
  senderName: string;
  active: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: LeadType | 'GENERAL';
  body: string;
  updatedAt: string;
}

export interface StatusConfigItem {
  id: string;
  label: string;
  color?: string;
}

// Chat Data Models
export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  size?: string;
  type: 'image' | 'file';
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  createdAtIso?: string;
  reactions?: Record<string, string[]>; // emoji -> userIds[]
  attachments?: ChatAttachment[];
  isSystemNotice?: boolean;
}

export interface ChatChannel {
  id: string;
  type: 'GROUP' | 'DIRECT';
  name: string;
  description?: string;
  equipe?: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  updatedAtIso?: string;
}

export type UserRole =
  | 'ADMIN'
  | 'DIRECTEUR_PRODUCTION'
  | 'RESPONSABLE_EQUIPE'
  | 'GESTIONNAIRE'
  | 'AGENT_COMMERCIAL'
  | 'MANAGER'  // Alias / Compatibilité
  | 'COURTIER'; // Alias / Compatibilité

export const isAdminRole = (role?: UserRole): boolean => {
  return role === 'ADMIN' || role === 'DIRECTEUR_PRODUCTION';
};

export const isResponsableRole = (role?: UserRole): boolean => {
  return role === 'RESPONSABLE_EQUIPE' || role === 'MANAGER';
};

export const isAgentRole = (role?: UserRole): boolean => {
  return role === 'AGENT_COMMERCIAL' || role === 'GESTIONNAIRE' || role === 'COURTIER' || !role;
};

/**
 * Détermine si un canal de messagerie est accessible et visible pour un utilisateur donné
 */
export const isChannelVisibleToUser = (channel?: ChatChannel | null, user?: User | null): boolean => {
  if (!channel || !user) return false;
  if (channel.type === 'GROUP') {
    // Les administrateurs et directeurs voient tous les groupes
    if (isAdminRole(user.role)) return true;
    // L'utilisateur est explicitement dans la liste des participants
    if (channel.participantIds && channel.participantIds.includes(user.id)) return true;
    // Canal rattaché à l'équipe de l'utilisateur
    if (user.equipe && channel.equipe && user.equipe.trim().toLowerCase() === channel.equipe.trim().toLowerCase()) return true;
    // Canal général de communication du cabinet accessible à tous
    if (channel.id === 'channel-general' || channel.name?.includes('Général') || channel.name?.includes('General')) return true;
    return false;
  } else {
    // Canal direct : l'utilisateur doit obligatoirement figurer dans les participants
    return Boolean(channel.participantIds && channel.participantIds.includes(user.id));
  }
};

export interface UserPermissions {
  canViewAllLeads: boolean;       // Voir tous les leads du cabinet ou uniquement ses propres/équipe leads
  canCreateLeads: boolean;        // Créer de nouveaux leads
  canEditLeads: boolean;          // Modifier les fiches leads
  canDeleteLeads: boolean;        // Supprimer des leads
  canChangeLeadStatus: boolean;   // Modifier le statut et la qualification
  canExportData: boolean;         // Exporter les fichiers Excel/CSV
  canManageUsers: boolean;        // Gérer les utilisateurs et attribuer les droits
  canEditSettings: boolean;       // Modifier les paramètres du cabinet et SMTP
  canAssignLeads: boolean;        // Assigner ou réaffecter les leads aux courtiers
}

export interface UserTelephonyConfig {
  enabled: boolean;
  directNumber?: string;         // Numéro de ligne directe SDA (ex: 01 89 23 45 67)
  extension?: string;            // Poste / Extension interne (ex: 101, 102, 204)
  callerId?: string;             // Numéro d'appelant sortant présenté au client
  callMode?: 'SOFTPHONE_TEL_URL' | 'DIRECT_API' | 'WEBRTC'; // Mode d'appel préférentiel
  preferredProviderId?: string;  // Identifiant du fournisseur VoIP du cabinet
  operatorUserId?: string;       // Identifiant de l'agent sur l'opérateur (Ringover ID, 3CX user, Aircall user)
  sipServer?: string;            // Serveur SIP / Domaine / PBX
  sipUsername?: string;          // Login / Ligne SIP
  sipPassword?: string;          // Mot de passe du compte SIP
  sipPort?: number;              // Port SIP (ex: 5060)
  recordCalls?: boolean;         // Enregistrement systématique des appels
  autoDialOnClick?: boolean;     // Clic d'appel rapide
  forwardToMobile?: string;      // Numéro de redirection d'appel si non répondu
  notes?: string;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  pseudo?: string;               // Pseudonyme commercial / d'affichage utilisé en chat interne et signature d'e-mails
  email: string;
  telephone: string;
  password?: string;
  role: UserRole;
  equipe?: string;
  status: 'ACTIF' | 'INACTIF';
  avatarUrl?: string;
  specialite?: string;
  permissions: UserPermissions;
  smtpConfig?: SmtpConfig;       // Serveur SMTP individuel pour travailler avec une adresse e-mail dédiée
  telephonyConfig?: UserTelephonyConfig; // Ligne téléphonique dédiée & VoIP de l'agent
  createdAt: string;
  lastLoginAt?: string;
}

export type AgentWorkStatus = 'ONLINE' | 'PAUSE_CAFE' | 'PAUSE_DEBRIEF' | 'PAUSE_FORMATION' | 'OFFLINE';

// Helper: only commercial agents and gestionnaires are tracked with work timers and breaks.
// Admins, Directeurs de production, Responsables d'équipe and Managers are supervisory roles and do not have work timers.
export const shouldTrackAgentPresence = (role?: UserRole): boolean => {
  return role === 'AGENT_COMMERCIAL' || role === 'GESTIONNAIRE' || role === 'COURTIER';
};

export interface AgentBreakRecord {
  id: string;
  type: 'PAUSE_CAFE' | 'PAUSE_DEBRIEF' | 'PAUSE_FORMATION';
  startedAt: string;     // ISO string
  endedAt?: string;      // ISO string
  durationSeconds: number;
}

export interface AgentWorkSession {
  id: string;
  userId: string;
  userPseudo: string;
  userFullName: string;
  userRole: UserRole;
  userEquipe?: string;
  loginAt: string;       // ISO string
  logoutAt?: string;      // ISO string if finished
  lastActiveAt: string;  // ISO string, updated on user activity
  status: AgentWorkStatus;
  workSeconds: number;   // Active logged work seconds (excluding pauses)
  breaks: AgentBreakRecord[];
  isAutoDisconnected?: boolean;
}

/**
 * Retourne le pseudonyme ou nom d'affichage d'un utilisateur.
 * Le pseudo est prioritaire conformément aux exigences métier (chat interne et signatures).
 */
export const getUserDisplayName = (user?: Partial<User> | null): string => {
  if (!user) return 'Conseiller';
  if (user.pseudo && user.pseudo.trim()) {
    return user.pseudo.trim();
  }
  const full = `${user.prenom || ''} ${user.nom || ''}`.trim();
  return full || 'Conseiller';
};

export const getDefaultPermissionsForRole = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'ADMIN':
      return {
        canViewAllLeads: true,
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: true,
        canChangeLeadStatus: true,
        canExportData: true,
        canManageUsers: true,
        canEditSettings: true,
        canAssignLeads: true
      };
    case 'DIRECTEUR_PRODUCTION':
      return {
        canViewAllLeads: true,
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: true,
        canChangeLeadStatus: true,
        canExportData: true,
        canManageUsers: true, // Peut gérer les utilisateurs SAUF création de compte ADMIN
        canEditSettings: true,
        canAssignLeads: true
      };
    case 'RESPONSABLE_EQUIPE':
    case 'MANAGER':
      return {
        canViewAllLeads: false, // Uniquement les leads rattachés à son équipe
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: false, // Ne peut pas supprimer des leads existants
        canChangeLeadStatus: true,
        canExportData: true,
        canManageUsers: false,
        canEditSettings: false, // Aucun droit sur la page paramètres
        canAssignLeads: true
      };
    case 'GESTIONNAIRE':
      return {
        canViewAllLeads: false, // Uniquement les leads rattachés à son équipe
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: false, // Ne peut pas supprimer des leads existants
        canChangeLeadStatus: true,
        canExportData: true,
        canManageUsers: false,
        canEditSettings: false, // Aucun droit sur la page paramètres
        canAssignLeads: false
      };
    case 'AGENT_COMMERCIAL':
    case 'COURTIER':
    default:
      return {
        canViewAllLeads: false, // Uniquement les leads qui lui sont directement rattachés
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: false, // Ne peut pas supprimer des leads existants
        canChangeLeadStatus: true,
        canExportData: false,
        canManageUsers: false,
        canEditSettings: false, // Aucun droit sur la page paramètres
        canAssignLeads: false
      };
  }
};

export interface InsurancePartnerApiConfig {
  id: string;
  code: 'ALLIANZ' | 'GENERALI' | 'APRIL' | 'MAXANCE' | 'NETVOX' | 'ZEPHIR' | 'AXA' | string;
  name: string;
  logoUrl: string;
  category: 'COMPAGNIE' | 'GROSSISTE';
  supportedProducts: LeadType[];
  apiEndpoint: string;
  apiKey: string;
  apiSecret?: string;
  codeOriasPartner?: string;
  codeIntermediaire?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  status: 'CONNECTE' | 'EN_MAINTENANCE' | 'DESACTIVE';
  commissionRate: number; // Percentage e.g. 15 for 15%
  autoQuotingEnabled: boolean;
  lastSyncAt?: string;
}

export interface PartnerTarifResult {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerLogo: string;
  category: 'COMPAGNIE' | 'GROSSISTE';
  formuleName: string;
  cotisationMensuelle: number;
  cotisationAnnuelle: number;
  franchise: number;
  fraisDossier: number;
  commissionMontantEstime: number;
  commissionTaux: number;
  matchScore: number; // 0 - 100%
  garantiesIncluses: string[];
  pointsForts: string[];
  isSouscriptibleEnLigne: boolean;
  quoteRefPartenaire: string;
  délaiEffetImmédiat: boolean;
}

export type TelephonyProviderType = 
  | 'RINGOVER' 
  | 'AIRCALL' 
  | 'TWILIO' 
  | 'OVH' 
  | 'THREE_CX' 
  | 'BREVO_SMS' 
  | 'GENERIC_SIP_TEL';

export interface TelephonyProviderConfig {
  id: string;
  name: string;
  providerType: TelephonyProviderType;
  enabled: boolean;
  isDefaultVoice?: boolean;
  isDefaultSms?: boolean;
  
  // Credentials / Configuration
  apiKey?: string;        // Ringover API key, Aircall API ID, Twilio Auth Token, OVH App Key, Brevo API Key
  apiSecret?: string;     // Twilio Secret, Aircall API Token, OVH App Secret
  accountSid?: string;    // Twilio Account SID, OVH Consumer Key
  apiEndpoint?: string;   // 3CX Webhook URL, OVH endpoint, or Custom SIP Proxy
  callerId?: string;      // Numéro d'appelant sortant / Sender ID (ex: 0189000000 ou "ASSURANCES")
  extensionUser?: string; // Poste / Extension du courtier (ex: 101, ou user ID Ringover/Aircall)
  
  // Modes & Capacités
  callMode: 'DIRECT_API' | 'SOFTPHONE_TEL_URL' | 'WEBRTC';
  supportsVoice: boolean;
  supportsSms: boolean;
  assignedEquipe?: string; // 'TOUTES' ou nom d'une équipe
  notes?: string;

  // Diagnostics & Status
  status?: 'CONNECTE' | 'NON_CONFIGURE' | 'ERREUR';
  statusMessage?: string;
  lastTestedAt?: string;
}

export interface CabinetInfo {
  nomCabinet: string;
  numeroOrias: string;
  siret: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  emailContact: string;
  nomCourtierPrincipal: string;
  logoUrl?: string;
  emailSignatureImageUrl?: string;
  emailSignatureMode?: 'IMAGE' | 'TEXT' | 'BOTH';
  mentionsLegales: string;
  siteWeb: string;

  // Paramètres personnalisés
  customStatuses?: StatusConfigItem[];
  customNextActions?: string[];

  // Passerelle API SIV (Carte Grise / Immatriculation)
  sivProvider?: 'AUTO_WAYS' | 'API_PLAQUE' | 'CUSTOM';
  sivApiToken?: string;
  sivCustomEndpoint?: string;

  // Téléphonie VoIP, CTI & SMS Multi-Opérateurs
  telephonyProviders?: TelephonyProviderConfig[];
  defaultVoiceProviderId?: string;
  defaultSmsProviderId?: string;

  updatedAt?: string;
}

/**
 * Marquer la prochaine action comme complétée / faite
 */
export function completeProchaineAction(lead: Lead, authorName: string = 'Conseiller'): Lead {
  const actionTitle = lead.prochaineActionIntitule || 'Rappel client';
  const nowStr = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const newLog: ActivityLogItem = {
    id: 'act-done-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    type: 'NOTE_ADDED',
    title: 'Action effectuée',
    description: `Action "${actionTitle}" cochée comme faite.`,
    author: authorName,
    date: nowStr
  };

  return {
    ...lead,
    prochaineActionIntitule: '',
    prochaineActionDate: '',
    prochaineActionHeure: '',
    prochaineActionStatut: 'FAIT',
    derniereActionCloturee: {
      intitule: actionTitle,
      statut: 'FAIT',
      dateCloture: nowStr,
      auteur: authorName
    },
    historyLogs: [newLog, ...(lead.historyLogs || [])],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Annuler la prochaine action
 */
export function cancelProchaineAction(lead: Lead, authorName: string = 'Conseiller', motif?: string): Lead {
  const actionTitle = lead.prochaineActionIntitule || 'Rappel client';
  const nowStr = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const newLog: ActivityLogItem = {
    id: 'act-cancel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    type: 'NOTE_ADDED',
    title: 'Action annulée',
    description: `Action "${actionTitle}" annulée${motif ? ` (${motif})` : ''}.`,
    author: authorName,
    date: nowStr
  };

  return {
    ...lead,
    prochaineActionIntitule: '',
    prochaineActionDate: '',
    prochaineActionHeure: '',
    prochaineActionStatut: 'ANNULE',
    derniereActionCloturee: {
      intitule: actionTitle,
      statut: 'ANNULE',
      dateCloture: nowStr,
      auteur: authorName
    },
    historyLogs: [newLog, ...(lead.historyLogs || [])],
    updatedAt: new Date().toISOString()
  };
}

