import { Lead, CabinetInfo, SinistreItem } from '../types/crm';

export function getLeadCivility(lead: Lead): string {
  if (lead.civilite) return lead.civilite;
  if (lead.autoDetails?.civilite) return lead.autoDetails.civilite;
  if (lead.habitationDetails?.civilite) return lead.habitationDetails.civilite;
  if (lead.vtcDetails?.civilite) return lead.vtcDetails.civilite;
  return 'M. / Mme';
}

export function getQuotePricing(lead: Lead) {
  let formula = 'Formule Standard';
  let fractionnement = 'Annuel';
  let cotisation = 0;
  let fraisDossier = 0;
  let options: string[] = [];

  if (lead.type === 'AUTO' && lead.autoDetails) {
    formula = lead.autoDetails.formuleSouhaitee || 'Tous Risques';
    fractionnement = lead.autoDetails.fractionnement || 'Mensuel';
    cotisation = lead.autoDetails.cotisationMontant || 0;
    fraisDossier = lead.autoDetails.fraisDossier || 0;
    options = lead.autoDetails.optionsSupplementaires || [];
  } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
    formula = lead.habitationDetails.formuleSouhaitee || 'Formule Confort';
    fractionnement = lead.habitationDetails.fractionnement || 'Mensuel';
    cotisation = lead.habitationDetails.cotisationMontant || 0;
    fraisDossier = lead.habitationDetails.fraisDossier || 0;
    options = lead.habitationDetails.optionsSupplementaires || [];
  } else if (lead.type === 'VTC' && lead.vtcDetails) {
    formula = lead.vtcDetails.formuleSouhaitee || 'Tous Risques VTC + RC Pro';
    fractionnement = lead.vtcDetails.fractionnement || 'Mensuel';
    cotisation = lead.vtcDetails.cotisationMontant || 0;
    fraisDossier = lead.vtcDetails.fraisDossier || 0;
    options = lead.vtcDetails.optionsSupplementaires || [];
  }

  const isMensuel = fractionnement.toLowerCase().includes('mensuel');
  const isTrimestriel = fractionnement.toLowerCase().includes('trimestriel');
  const isSemestriel = fractionnement.toLowerCase().includes('semestriel');

  // Si le fractionnement est mensuel et que la valeur historique était en annuel (> 300)
  if (isMensuel && cotisation > 300) {
    cotisation = Math.round((cotisation / 12) * 100) / 100;
  }

  // Calculate annual equivalent if fractionnement is given
  let cotisationAnnee = cotisation;
  if (isMensuel) cotisationAnnee = Math.round(cotisation * 12 * 100) / 100;
  else if (isTrimestriel) cotisationAnnee = Math.round(cotisation * 4 * 100) / 100;
  else if (isSemestriel) cotisationAnnee = Math.round(cotisation * 2 * 100) / 100;

  return { formula, fractionnement, cotisation, cotisationAnnee, fraisDossier, options, isMensuel };
}

export interface GuaranteeItem {
  name: string;
  included: boolean | string; // true ('Inclus'), false ('Non inclus'), or custom string ('En option', 'Franchise 150€')
  detail: string;
}

export function getGuaranteesList(lead: Lead): GuaranteeItem[] {
  const { formula } = getQuotePricing(lead);

  if (lead.type === 'AUTO') {
    const isTousRisques = formula.toLowerCase().includes('tous risques');
    const isEtendu = formula.toLowerCase().includes('étendu') || formula.toLowerCase().includes('etendu') || isTousRisques;

    return [
      { name: 'Responsabilité Civile Obligatoire (RC)', included: 'Inclus (Illimité)', detail: 'Dommages corporels illimités / Matériels jusqu\'à 100M€' },
      { name: 'Défense Recours Suite à Accident', included: 'Inclus', detail: 'Prise en charge des frais de défense juridique et litiges' },
      { name: 'Assistance Panne / Accident 0 km 24/7', included: 'Inclus', detail: 'Remplacement véhicule ou remorquage dès le domicile' },
      { name: 'Garantie Personnelle du Conducteur', included: 'Inclus (500 000 €)', detail: 'Couverture des préjudices corporels du conducteur' },
      { name: 'Brise de Glace & Optiques de phare', included: isEtendu ? 'Inclus (0€ franchise)' : 'Non inclus', detail: 'Pare-brise, vitres latérales, lunette arrière, feux' },
      { name: 'Vol, Incendie, Explosion & Tempête', included: isEtendu ? 'Inclus' : 'Non inclus', detail: 'Indemnisation selon valeur à dire d\'expert ou majorée' },
      { name: 'Catastrophes Naturelles & Technologiques', included: isEtendu ? 'Inclus (Franchise légale)' : 'Non inclus', detail: 'Arrêtés ministériels et événements climatiques majeurs' },
      { name: 'Dommages Tous Accidents / Vandalisme', included: isTousRisques ? 'Inclus' : 'Non inclus', detail: 'Couverture globale même en cas d\'accident responsable' },
      { name: 'Effets Personnels & Contenu du Véhicule', included: isTousRisques ? 'Inclus (1 500 €)' : 'En option', detail: 'Objets personnels transportés et bagages' },
      { name: 'Véhicule de Remplacement Relais', included: isTousRisques ? 'Inclus (7 jours)' : 'En option', detail: 'Prêt de véhicule pendant les réparations' },
    ];
  } else if (lead.type === 'VTC') {
    const isTousRisques = formula.toLowerCase().includes('tous risques');
    return [
      { name: 'RC Pro Exploitation VTC (Obligatoire)', included: 'Inclus (3 000 000 €)', detail: 'Couverture activité professionnelle transport de personnes' },
      { name: 'RC Circulation Véhicule Professionnel VTC', included: 'Inclus (Illimité)', detail: 'Responsabilité civile dommages aux clients et tiers' },
      { name: 'Défense Recours Pro & Protection Juridique', included: 'Inclus', detail: 'Assistance juridique litiges clients, plateformes & commission VTC' },
      { name: 'Assistance 0 km Pro VTC 24/7', included: 'Inclus', detail: 'Remorquage prioritaire + solution de mobilité professionnelle' },
      { name: 'Brise de Glace & Optiques', included: 'Inclus (0€ franchise)', detail: 'Remplacement rapide pour maintien de l\'activité' },
      { name: 'Vol, Incendie & Attentats', included: 'Inclus', detail: 'Garantie vol du véhicule et du matériel pro à bord' },
      { name: 'Dommages Tous Accidents VTC', included: isTousRisques ? 'Inclus' : 'Non inclus', detail: 'Prise en charge des réparations véhicule en toutes circonstances' },
      { name: 'Véhicule Relais Homologué VTC', included: isTousRisques ? 'Inclus (15 jours)' : 'En option', detail: 'Véhicule de remplacement conforme à la réglementation VTC' },
    ];
  } else if (lead.type === 'HABITATION') {
    const isPremium = formula.toLowerCase().includes('premium') || formula.toLowerCase().includes('tous risques') || formula.toLowerCase().includes('confort');
    return [
      { name: 'Responsabilité Civile Vie Privée & Occupant', included: 'Inclus', detail: 'Dommages causés aux tiers et au propriétaire' },
      { name: 'Incendie, Explosion, Foudre & Fumées', included: 'Inclus', detail: 'Couverture du bâtiment et du capital mobilier' },
      { name: 'Dégâts des Eaux & Gel des Conduites', included: 'Inclus', detail: 'Infiltration, fuites, rupture de canalisation' },
      { name: 'Catastrophes Naturelles & Événements Climatiques', included: 'Inclus', detail: 'Inondations, tempêtes, grêle, sécheresse' },
      { name: 'Vol, Vandalisme & Détériorations', included: isPremium ? 'Inclus' : 'Non inclus', detail: 'Vol avec effraction du mobilier et bijoux' },
      { name: 'Brise de Glace & Vitrages', included: isPremium ? 'Inclus' : 'Non inclus', detail: 'Fenêtres, baies vitrées, miroirs fixes, plaques cuisson' },
      { name: 'Protection Juridique Habitation', included: isPremium ? 'Inclus' : 'En option', detail: 'Prise en charge des litiges de voisinage et travaux' },
      { name: 'Assistance Urgence Dépannage 24/7', included: 'Inclus', detail: 'Serrurerie, plomberie d\'urgence, relogement temporaire' },
    ];
  }

  return [
    { name: 'Responsabilité Civile', included: 'Inclus', detail: 'Garantie légale obligatoire' },
    { name: 'Défense & Recours', included: 'Inclus', detail: 'Assistance juridique litiges' },
    { name: 'Assistance 24h/24 & 7j/7', included: 'Inclus', detail: 'Dépannage et remorquage d\'urgence' },
  ];
}

/**
 * Generates a complete, professional structured Text document for email quote attachment
 */
export function generateProfessionalQuoteText(lead: Lead, cabinetInfo: CabinetInfo, advisorName?: string): string {
  const civility = getLeadCivility(lead);
  const { formula, fractionnement, cotisation, cotisationAnnee, fraisDossier, options, isMensuel } = getQuotePricing(lead);
  const guarantees = getGuaranteesList(lead);

  const dateNow = new Date().toLocaleDateString('fr-FR');
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');

  let riskInfoText = '';

  if (lead.type === 'AUTO' && lead.autoDetails) {
    const a = lead.autoDetails;
    const sinistresList = a.sinistres && a.sinistres.length > 0
      ? a.sinistres.map(s => `    - ${s.date} : ${s.nature} (Responsabilité : ${s.tauxResponsabilite}${s.montantIndemnise ? ` | Indemnisé : ${s.montantIndemnise}€` : ''})`).join('\n')
      : '    Aucun sinistre déclaré sur les 36 derniers mois';

    let suspensionText = 'Non';
    if (a.aEuSuspensionPermis) {
      suspensionText = `Oui (Motif: ${a.suspensionMotif || 'Non précisé'}, Durée: ${a.suspensionDureeMois || 0} mois, Date: ${a.suspensionDate || 'Inconnue'})`;
    }
    let annulationText = 'Non';
    if (a.aEuAnnulationPermis) {
      annulationText = `Oui (Motif: ${a.annulationMotif || 'Non précisé'}, Date: ${a.annulationDate || 'Inconnue'})`;
    }

    riskInfoText = `
--------------------------------------------------------------------------------
2. INFORMATIONS DU CONDUCTEUR & ANTÉCÉDENTS D'ASSURANCE
--------------------------------------------------------------------------------
Conducteur Principal : ${civility} ${a.prenom} ${a.nom}
Date de Naissance   : ${a.dateNaissance || 'Non renseignée'}
Permis de Conduire  : Obtenu le ${a.datePermis || 'Non renseignée'}
Situation Familiale : ${a.situationFamiliale || 'Non renseignée'} | Profession : ${a.profession || 'Non renseignée'}
Adresse du Risque   : ${a.adresse || lead.ville} (${a.codePostal || lead.codePostal})

ANTÉCÉDENTS D'ASSURANCE (36 DERNIERS MOIS) :
- Coefficient Bonus/Malus (CRM) : ${a.bonusMalus ?? 0.50}
- Durée d'Assurance Continue    : ${a.nombreMoisAssure36Mois ?? 36} mois
- Dernière Compagnie            : ${a.nomDerniereCompagnie || 'Non précisée'}
- Statut Contrat Précédent      : ${a.contratStatut || 'Inconnu'}${a.motifResiliation ? ` (Motif : ${a.motifResiliation})` : ''}
- Suspension de Permis          : ${suspensionText}
- Annulation de Permis          : ${annulationText}
- Relevé de Sinistralité :
${sinistresList}

--------------------------------------------------------------------------------
3. CARACTÉRISTIQUES DU VÉHICULE ASSURÉ
--------------------------------------------------------------------------------
Marque & Modèle     : ${a.marqueModele || 'Non précisé'}
Immatriculation     : ${a.immatriculation || 'En cours d\'immatriculation'}
1ère Mise en Circul. : ${a.dateMiseEnCirculation || 'Non renseignée'}
Date d'Achat        : ${a.dateAchat || 'Non renseignée'}
Usage Déclaré       : ${a.typeUtilisation || 'Trajet privé / travail'}
Propriétaire        : ${a.proprietaireVehicule || 'Conducteur principal'}
`;
  } else if (lead.type === 'VTC' && lead.vtcDetails) {
    const v = lead.vtcDetails;
    const sinistresList = v.sinistres && v.sinistres.length > 0
      ? v.sinistres.map(s => `    - ${s.date} : ${s.nature} (Resp : ${s.tauxResponsabilite})`).join('\n')
      : '    Aucun sinistre déclaré sur les 36 derniers mois';

    riskInfoText = `
--------------------------------------------------------------------------------
2. INFORMATIONS CHAUFFEUR & ENTREPRISE VTC
--------------------------------------------------------------------------------
Chauffeur / Gérant  : ${civility} ${v.prenom} ${v.nom}
Raison Sociale      : ${v.nomSociete || 'Entreprise Individuelle'} (${v.formeJuridique || 'VTC'})
N° SIRET            : ${v.siret || 'En cours d\'immatriculation'}
Carte Pro VTC N°    : ${v.numeroCarteVtc || 'En cours'} (Délivrée le : ${v.dateObtentionCarteVtc || 'Non précisée'})
Permis de Conduire  : Obtenu le ${v.datePermis || 'Non renseignée'}
Bonus / Malus CRM   : ${v.bonusMalus ?? 0.50}
Relevé Sinistres    :
${sinistresList}

--------------------------------------------------------------------------------
3. CARACTÉRISTIQUES DU VÉHICULE VTC
--------------------------------------------------------------------------------
Véhicule            : ${v.marqueModele || 'Non précisé'} (${v.anneeVehicule || ''})
Immatriculation     : ${v.immatriculation || 'Non renseignée'}
Motorisation        : ${v.typeMotorisation || 'Diesel / Hybride'}
Usage               : ${v.typeUsage || 'VTC Exclusif'} | Places : ${v.nombrePlaces || 5}
RC Pro Exploitation : ${v.besoinRcProExploitation ? 'INCLUSE DANS LA PROPOSITION' : 'Non souscrite'}
`;
  } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
    const h = lead.habitationDetails;
    riskInfoText = `
--------------------------------------------------------------------------------
2. CARACTÉRISTIQUES DU LOGEMENT ASSURÉ
--------------------------------------------------------------------------------
Souscripteur        : ${civility} ${h.prenom} ${h.nom}
Type de Logement    : ${h.typeLogement || 'Appartement'} (${h.statutOccupant || 'Occupant'})
Adresse du Bien     : ${h.adresseBien || lead.ville} (${h.codePostalBien || lead.codePostal} ${h.villeBien || lead.ville})
Surface Habitables  : ${h.surfaceM2 || 0} m² | Nombre de Pièces Principales : ${h.nombrePieces || 0}
Résidence           : ${h.residencePrincipale ? 'Principale' : 'Secondaire'} | Étage : ${h.etage ?? 0}
Équipements         : ${h.dependances ? 'Dépendances | ' : ''}${h.veranda ? 'Véranda | ' : ''}${h.piscine ? 'Piscine' : 'Aucun équipement spécial'}
Capital Mobilier    : ${h.valeurMobilier || 0} €
`;
  } else {
    riskInfoText = `
--------------------------------------------------------------------------------
2. IDENTIFICATION DU RISQUE PROPOSÉ
--------------------------------------------------------------------------------
Projet d'assurance  : ${lead.type}
Prospect            : ${civility} ${lead.prenom} ${lead.nom}
Ville & Code Postal : ${lead.ville} (${lead.codePostal})
`;
  }

  // Guarantees table formatted as plain text
  const guaranteesText = guarantees.map(g => {
    const inc = typeof g.included === 'string' ? g.included : (g.included ? '[X] Inclus' : '[ ] Non inclus');
    return `  * ${g.name.padEnd(42, '.')} ${inc}\n    -> ${g.detail}`;
  }).join('\n');

  const optionsText = options.length > 0
    ? options.map(o => `  - ${o}`).join('\n')
    : '  Aucune option complémentaire sélectionnée';

  return `================================================================================
                     ${cabinetInfo.nomCabinet.toUpperCase()}
               PROPOSITION COMMERCIALE & DEVIS D'ASSURANCE
================================================================================
RÉFÉRENCE DEVIS : ${lead.referenceDevis}
DATE D'ÉMISSION  : ${dateNow}
DURÉE VALIDITÉ   : 30 Jours (soit jusqu'au ${validUntil})

--------------------------------------------------------------------------------
1. COORDONNÉES ET ORGANISME ÉMETTEUR
--------------------------------------------------------------------------------
CABINET EMETTEUR :
  Nom Cabinet         : ${cabinetInfo.nomCabinet}
  Adresse             : ${cabinetInfo.adresse} - ${cabinetInfo.codePostal} ${cabinetInfo.ville}
  N° ORIAS            : ${cabinetInfo.numeroOrias}
  Téléphone / Email   : ${cabinetInfo.telephone} | ${cabinetInfo.emailContact || cabinetInfo.nomCourtierPrincipal}
  Courtier Référent   : ${advisorName || lead.assignedBroker || cabinetInfo.nomCourtierPrincipal || 'Votre Conseiller'}

SOUSCRIPTEUR PROSPECT :
  Civilité & Identité : ${civility} ${lead.prenom} ${lead.nom}
  Téléphone / Email   : ${lead.telephone} | ${lead.email}
  Adresse principale  : ${lead.codePostal} ${lead.ville}
${riskInfoText}
--------------------------------------------------------------------------------
4. PROPOSITION TARIFAIRE ET COTISATION
--------------------------------------------------------------------------------
Formule Souscrite         : ${formula}
Option de Règlement       : ${fractionnement}
${isMensuel 
  ? `Cotisation Mensuelle       : ${cotisation.toFixed(2)} € TTC / mois`
  : `Cotisation (${fractionnement})  : ${cotisation.toFixed(2)} € TTC\nCotisation Annuelle Equivalent : ${cotisationAnnee.toFixed(2)} € TTC`
}
Frais de Dossier Courtage : ${fraisDossier.toFixed(2)} € (Réglables à la souscription)
--------------------------------------------------------------------------------
PREMIER RÈGLEMENT À LA SOUSCRIPTION : ${(cotisation + fraisDossier).toFixed(2)} € TTC
--------------------------------------------------------------------------------

OPTIONS & EXTENSIONS CHOISIES :
${optionsText}

--------------------------------------------------------------------------------
5. TABLEAU DÉTAILLÉ DES GARANTIES ET COUVERTURES
--------------------------------------------------------------------------------
${guaranteesText}

--------------------------------------------------------------------------------
6. PIÈCES ET JUSTIFICATIFS À FOURNIR POUR VALIDATION DU CONTRAT
--------------------------------------------------------------------------------
  1. Copie Recto/Verso du Permis de Conduire (et Carte VTC si applicable)
  2. Copie du Certificat d'Immatriculation (Carte Grise du Véhicule)
  3. Relevé d'Information Intégral sur 36 mois délivré par votre précédent assureur
  4. Relevé d'Identité Bancaire (RIB) pour le prélèvement des cotisations
  5. Carte d'Identité ou Passeport en cours de validité

--------------------------------------------------------------------------------
7. FICHE DU DEVOIR DE CONSEIL ET D'INFORMATION (Art. L. 521-4 du Code des Assurances - Directive DDA)
--------------------------------------------------------------------------------
Conformément à la Directive sur la Distribution d'Assurances (DDA) et à l'article L. 521-4 du Code des assurances, le présent document formalise le conseil personnalisé délivré au souscripteur :

A. EXIGENCES ET BESOINS EXPRIMÉS PAR LE PROSPECT :
  - Type de contrat recherché : Assurance ${lead.type} (${formula})
  - Risque identifié : ${lead.type === 'AUTO' ? 'Véhicule terrestre à moteur usage privé/trajet travail' : lead.type === 'VTC' ? 'Véhicule professionnel VTC & Responsabilité Civile Professionnelle d\'exploitation' : 'Protection logement et capital mobilier'}
  - Niveau de couverture demandé : ${formula} avec option de règlement ${fractionnement.toLowerCase()}.

B. MOTIVATION DU CONSEIL ET CONFORMITÉ DE L'OFFRE :
  Le produit et la formule proposés correspondent précisément aux exigences et besoins exprimés par ${civility} ${lead.prenom} ${lead.nom}. L'analyse comparative réalisée par le cabinet prend en compte les antécédents déclarés, la sinistralité, le budget souhaité et l'étendue des garanties indispensables (notamment la garantie du conducteur, l'assistance 0km et la RC Pro le cas échéant).

C. TRANSPARENCE ET STATUT DE L'INTERMÉDIAIRE :
  ${cabinetInfo.nomCabinet} agit en qualité de courtier d'assurance indépendant (Catégorie b, Art. L. 511-1 I du Code des assurances), sans obligation contractuelle de travailler exclusivement avec une ou plusieurs compagnies. Rémunération assurée par commissions versées par les compagnies partenaires et/ou frais de courtage indiqués ci-dessus.

--------------------------------------------------------------------------------
8. CONDITIONS GÉNÉRALES ET DISPOSITIONS LÉGALES (Droit Français)
--------------------------------------------------------------------------------
1. DROIT DE RÉTRACTATION / RENONCIATION (Art. L. 112-9 du Code des Assurances & Art. L. 221-18 du Code de la Consommation) :
   En cas de souscription à distance ou suite à un démarchage, le souscripteur dispose d'un droit de renonciation de 14 jours calendaires révolus à compter de la date de conclusion du contrat, sans avoir à justifier de motifs ni à payer de pénalités.

2. OBLIGATIONS DE DÉCLARATION DU RISQUE (Art. L. 113-2 du Code des Assurances) :
   Le souscripteur est tenu de répondre exactement aux questions posées par l'assureur. Toute réticence ou fausse déclaration intentionnelle entraîne la nullité du contrat (Art. L. 113-8). Une fausse déclaration non intentionnelle est sanctionnée par l'application de la règle proportionnelle de prime ou de sinistre (Art. L. 113-9).

3. RÉSILIATION DU CONTRAT (Loi Hamon & Loi Châtel) :
   Conformément aux dispositions légales, le contrat est souscrit pour une durée de 12 mois avec reconduction tacite. Après 1 an de souscription, le contrat peut être résilié à tout moment sans frais ni pénalité (Loi Hamon).

4. PROTECTION DES DONNÉES PERSONNELLES (RGPD & Loi Informatique et Libertés) :
   Les données collectées sont nécessaires à l'établissement du devis et à la gestion du contrat. Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité auprès du délégué à la protection des données du cabinet ${cabinetInfo.nomCabinet} (${cabinetInfo.emailContact || cabinetInfo.telephone}).

5. RECLAMATIONS ET MÉDIATION DE L'ASSURANCE :
   En cas de réclamation, s'adresser en priorité à votre courtier. Si le différend persiste : La Médiation de l'Assurance, TSA 50110, 75441 Paris Cedex 09 (www.mediation-assurance.org).

6. AUTORITÉ DE CONTRÔLE :
   Cabinet soumis au contrôle de l'ACPR (Autorité de Contrôle Prudentiel et de Résolution) - 4 Place de Budapest, 75436 Paris Cedex 09.

--------------------------------------------------------------------------------
9. MENTIONS LÉGALES ET ENGAGEMENT
--------------------------------------------------------------------------------
${cabinetInfo.mentionsLegales || `Cabinet d'intermédiation en assurance immatriculé à l'ORIAS sous le N° ${cabinetInfo.numeroOrias}. Activité régie par le Code des Assurances et sous le contrôle de l'ACPR (4 Place de Budapest, 75436 Paris).`}

Le présent devis d'assurance est établi sur la base exacte des déclarations faites par le prospect souscripteur. Il ne constitue pas une note de couverture définitive. La prise d'effet des garanties reste subordonnée à la signature du contrat définitif et à la validation de l'ensemble des pièces justificatives.

--------------------------------------------------------------------------------
CADRE DE SOUSCRIPTION - BON POUR ACCORD
--------------------------------------------------------------------------------
Je soussigné(e) ${civility} ${lead.prenom} ${lead.nom}, confirme l'exactitude des informations ci-dessus, reconnaît avoir reçu la fiche de devoir de conseil ainsi que les conditions générales, et accepte la proposition d'assurance N° ${lead.referenceDevis} au tarif de ${cotisation.toFixed(2)} € / ${isMensuel ? 'mois' : fractionnement.toLowerCase()}.

Fait à : .............................., Le : ....................

Signature du Souscripteur (précédée de la mention "Lu et approuvé - Bon pour accord") :



================================================================================
                ${cabinetInfo.nomCabinet} - Tel: ${cabinetInfo.telephone}
================================================================================
`;
}
