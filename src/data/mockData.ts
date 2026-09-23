import { Lead, SmtpConfig, EmailTemplate, CabinetInfo, User, getDefaultPermissionsForRole } from '../types/crm';

export const initialUsers: User[] = [
  {
    id: 'user-admin-tarik',
    nom: 'Cherkaoui',
    prenom: 'Tarik',
    pseudo: 'Tarik Cherkaoui',
    email: 'cherkaoui.tarik17@gmail.com',
    telephone: '',
    password: 'Horizon2026!',
    role: 'ADMIN',
    equipe: 'Direction Générale',
    status: 'ACTIF',
    specialite: 'Direction Générale & Administration',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    permissions: getDefaultPermissionsForRole('ADMIN'),
    smtpConfig: {
      host: '',
      port: 587,
      username: '',
      password: '',
      encryption: 'TLS',
      senderEmail: 'cherkaoui.tarik17@gmail.com',
      senderName: 'Tarik Cherkaoui',
      active: false
    },
    createdAt: '2024-01-01',
    lastLoginAt: '2026-09-14 10:00'
  }
];

export const initialCabinetInfo: CabinetInfo = {
  nomCabinet: 'Cabinet de Courtage',
  numeroOrias: '',
  siret: '',
  adresse: '',
  codePostal: '',
  ville: '',
  telephone: '',
  emailContact: 'cherkaoui.tarik17@gmail.com',
  nomCourtierPrincipal: 'Tarik Cherkaoui',
  logoUrl: '',
  mentionsLegales: '',
  siteWeb: '',
  customStatuses: [
    { id: 'NOUVEAU', label: 'Nouveau Lead', color: 'blue' },
    { id: 'A_CONTACTER', label: 'À Contacter', color: 'amber' },
    { id: 'DEVIS_ENVOYE', label: 'Devis Envoyé', color: 'purple' },
    { id: 'RELANCE', label: 'Relance à faire', color: 'orange' },
    { id: 'PDG', label: 'PDG (Prise De Garantie)', color: 'indigo' },
    { id: 'GAGNE', label: 'Souscrit / Gagné', color: 'emerald' },
    { id: 'PERDU', label: 'Perdu / Rejeté', color: 'rose' }
  ],
  customNextActions: [
    'Appel téléphonique',
    'Attente retour client',
    'Aucune action',
    'Relance devis',
    'Relance documents'
  ],
  telephonyProviders: [
    {
      id: 'tel-native',
      name: 'Softphone Système / MicroSIP / Zoiper / Mobile',
      providerType: 'GENERIC_SIP_TEL',
      enabled: true,
      isDefaultVoice: true,
      isDefaultSms: false,
      callMode: 'SOFTPHONE_TEL_URL',
      supportsVoice: true,
      supportsSms: false,
      status: 'CONNECTE',
      statusMessage: 'Prêt via protocole natif tel: (Zoiper, Teams, MicroSIP, Appels Windows/Mac/Mobile)'
    },
    {
      id: 'tel-ringover',
      name: 'Ringover CTI Cabinet',
      providerType: 'RINGOVER',
      enabled: false,
      isDefaultVoice: false,
      isDefaultSms: false,
      callMode: 'DIRECT_API',
      supportsVoice: true,
      supportsSms: true,
      callerId: '',
      status: 'NON_CONFIGURE',
      statusMessage: 'Renseignez votre clé API Ringover pour activer le click-to-call et SMS direct'
    },
    {
      id: 'tel-aircall',
      name: 'Aircall Cloud VoIP',
      providerType: 'AIRCALL',
      enabled: false,
      isDefaultVoice: false,
      isDefaultSms: false,
      callMode: 'DIRECT_API',
      supportsVoice: true,
      supportsSms: false,
      status: 'NON_CONFIGURE',
      statusMessage: 'Renseignez votre API ID et Token Aircall'
    },
    {
      id: 'tel-twilio',
      name: 'Twilio Voice & SMS Pro',
      providerType: 'TWILIO',
      enabled: false,
      isDefaultVoice: false,
      isDefaultSms: true,
      callMode: 'DIRECT_API',
      supportsVoice: true,
      supportsSms: true,
      callerId: '',
      status: 'NON_CONFIGURE',
      statusMessage: 'Renseignez votre Account SID et Auth Token Twilio'
    },
    {
      id: 'tel-ovh',
      name: 'OVH Télécom (SIP & SMS)',
      providerType: 'OVH',
      enabled: false,
      isDefaultVoice: false,
      isDefaultSms: false,
      callMode: 'DIRECT_API',
      supportsVoice: true,
      supportsSms: true,
      status: 'NON_CONFIGURE',
      statusMessage: 'Ligne VoIP SIP ou passerelle SMS OVH Télécom'
    },
    {
      id: 'tel-3cx',
      name: '3CX Phone System (PABX / Webhook)',
      providerType: 'THREE_CX',
      enabled: false,
      isDefaultVoice: false,
      isDefaultSms: false,
      callMode: 'DIRECT_API',
      supportsVoice: true,
      supportsSms: false,
      status: 'NON_CONFIGURE',
      statusMessage: 'Serveur 3CX ou URL Webhook MakeCall'
    },
    {
      id: 'tel-brevo',
      name: 'Brevo (SMS Transactionnels & OTP)',
      providerType: 'BREVO_SMS',
      enabled: false,
      isDefaultVoice: false,
      isDefaultSms: false,
      callMode: 'DIRECT_API',
      supportsVoice: false,
      supportsSms: true,
      status: 'NON_CONFIGURE',
      statusMessage: 'Envoi direct des SMS OTP et relances via clé API Brevo (Sendinblue)'
    }
  ],
  defaultVoiceProviderId: 'tel-native',
  defaultSmsProviderId: 'tel-twilio'
};

export const initialSmtpConfig: SmtpConfig = {
  host: '',
  port: 587,
  username: '',
  password: '',
  encryption: 'TLS',
  senderEmail: 'cherkaoui.tarik17@gmail.com',
  senderName: 'Tarik Cherkaoui',
  active: false
};

export const initialEmailTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-auto-devis',
    name: 'Proposition Tarifaire Auto',
    subject: 'Votre devis assurance Auto N° {referenceDevis} - {nomCabinet}',
    type: 'AUTO',
    body: `Bonjour {prenom} {nom},

Suite à votre demande, nous avons le plaisir de vous transmettre notre meilleure offre pour votre véhicule {marqueModele} (Immatriculation : {immatriculation}).

Résumé de votre offre Auto :
- Formule choisie : {formule}
- Fractionnement : {fractionnement}
- Cotisation : {cotisation} € / mois
- Frais de dossier : {fraisDossier} €

Options incluses :
{options}

Vous trouverez ci-joint le détail de la proposition de contrat.

Pour valider votre souscription ou poser une question, vous pouvez contacter votre conseiller dédié au {telephoneCabinet} ou répondre directement à cet email.

Bien cordialement,
{nomCourtier}
{nomCabinet} - ORIAS : {numeroOrias}`,
    updatedAt: '2026-07-20'
  },
  {
    id: 'tmpl-hab-devis',
    name: 'Proposition Tarifaire Habitation',
    subject: 'Votre étude assurance Habitation N° {referenceDevis} - {nomCabinet}',
    type: 'HABITATION',
    body: `Bonjour {prenom} {nom},

Nous avons étudié votre besoin en assurance Habitation pour votre logement situé à {ville} ({surface} m² - {nombrePieces} pièces).

Votre tarif privilégié :
- Formule : {formule}
- Fractionnement : {fractionnement}
- Cotisation : {cotisation} € ({fractionnement})
- Frais de dossier : {fraisDossier} €

Garanties phares :
{options}

Pour toute question ou modification, n'hésitez pas à nous appeler au {telephoneCabinet}.

Cordialement,
{nomCourtier} - {nomCabinet}`,
    updatedAt: '2026-07-18'
  },
  {
    id: 'tmpl-vtc-devis',
    name: 'Proposition Tarifaire VTC & RC Pro',
    subject: 'Devis VTC + RC Pro Exploitation N° {referenceDevis}',
    type: 'VTC',
    body: `Bonjour {prenom} {nom},

Voici votre offre sur-mesure pour votre activité VTC avec le véhicule {marqueModele} (Immat : {immatriculation}).

Offre VTC Globale :
- Pack sélectionné : {formule}
- Inclus : Responsabilité Civile Circulation + RC Pro Exploitation VTC
- Fractionnement : {fractionnement}
- Cotisation : {cotisation} € / mois
- Franchise : {franchise} €

Options supplémentaires :
{options}

Nous restons à votre entière disposition pour vous accompagner dans la mise en place immédiate de votre attestation de circulation VTC.

Excellente journée,
{nomCourtier}
{nomCabinet}`,
    updatedAt: '2026-07-22'
  },
  {
    id: 'tmpl-relance-devis',
    name: 'Relance Devis en attente',
    subject: 'Avez-vous pu consulter votre offre d\'assurance N° {referenceDevis} ?',
    type: 'GENERAL',
    body: `Bonjour {prenom} {nom},

Je reviens vers vous concernant la proposition d'assurance que nous vous avons envoyée récemment pour le dossier {referenceDevis}.

Avez-vous eu l'occasion d'en prendre connaissance ? Avez-vous besoin d'ajuster certaines garanties ou d'ajouter une option ?

Je suis joignable au {telephoneCabinet} pour faire le point ensemble.

Bien cordialement,
{nomCourtier}`,
    updatedAt: '2026-07-15'
  }
];

export const initialLeads: Lead[] = [];

