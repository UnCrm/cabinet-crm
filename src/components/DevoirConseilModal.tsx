import React, { useState } from 'react';
import {
  Printer,
  Download,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  Edit3,
  Eye,
  ExternalLink,
  X,
  FileText,
  BadgeCheck,
  Building2,
  Car,
  Home,
  Briefcase,
  AlertCircle,
  Sliders,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import {
  Lead,
  CabinetInfo,
  User as UserType,
  DevoirConseilData,
  ActivityLogItem,
  LeadDocument,
  getUserDisplayName,
  SmtpConfig
} from '../types/crm';

interface DevoirConseilModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  cabinetInfo: CabinetInfo;
  currentUser?: UserType;
  smtpConfig?: SmtpConfig;
  onUpdateLead: (updatedLead: Lead) => void;
}

export const DevoirConseilModal: React.FC<DevoirConseilModalProps> = ({
  isOpen,
  onClose,
  lead,
  cabinetInfo,
  currentUser,
  onUpdateLead
}) => {
  if (!isOpen) return null;

  const conseillerName = currentUser ? getUserDisplayName(currentUser) : (lead.assignedBroker || 'Conseiller Référent');
  const todayStr = new Date().toLocaleDateString('fr-FR');

  // View mode: 'PREVIEW' (official multi-page print layout) or 'EDIT' (interactive form to adjust data)
  const [viewMode, setViewMode] = useState<'PREVIEW' | 'EDIT'>('PREVIEW');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize data with existing lead.devoirConseilData or smart auto-fill from lead
  const initialData = (): DevoirConseilData => {
    if (lead.devoirConseilData) {
      return lead.devoirConseilData;
    }

    const auto = lead.autoDetails;
    const vtc = lead.vtcDetails;
    const hab = lead.habitationDetails;

    const isAuto = lead.type === 'AUTO';
    const isVtc = lead.type === 'VTC';
    const isHabitation = lead.type === 'HABITATION';

    const formuleRetenue = isAuto
      ? (auto?.formuleSouhaitee || 'Tous Risques')
      : isHabitation
      ? (hab?.formuleSouhaitee || 'Formule Confort')
      : (vtc?.formuleSouhaitee || 'Tous Risques VTC + RC Pro');

    const cotisationMensuelle = isAuto
      ? (auto?.cotisationMontant || 89)
      : isHabitation
      ? (hab?.cotisationMontant || 34)
      : (vtc?.cotisationMontant || 185);

    const refDossier = lead.referenceDevis || `DEV-${lead.type}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const autoBesoins = [
      'Garantie conducteur renforcée (jusqu\'à 1 000 000 €)',
      'Assistance 0 km avec véhicule de prêt (7 jours mini)',
      'Protection juridique automobile étendue',
      'Couverture bris de glace sans franchise',
      'Dommages tous accidents / vandalisme'
    ];

    const vtcBesoins = [
      'RC Circulation illimitée (transport onéreux de personnes)',
      'RC Professionnelle Exploitation VTC conforme loi Grandguillaume',
      'Assistance 0 km avec véhicule relais homologué VTC',
      'Garantie du conducteur professionnel jusqu\'à 1M€',
      'Protection Juridique VTC et défense recours'
    ];

    const habBesoins = [
      'Indemnisation en valeur à neuf intégrale',
      'Dégâts des eaux & gel sans franchise',
      'Vol, vandalisme et détériorations immobilières',
      'Responsabilité civile vie privée famille',
      'Dépannage d\'urgence plomberie / serrurerie 24h/24'
    ];

    const garantiesRecherchees = isAuto ? autoBesoins : isHabitation ? habBesoins : vtcBesoins;

    const priorites = isAuto
      ? ['Niveau de couverture', 'Assistance réactive', 'Budget maîtrisé', 'Franchise modérée']
      : isHabitation
      ? ['Protection maximale', 'Protection du mobilier', 'Franchise réduite', 'Assistance']
      : ['Continuité d\'activité', 'Protection du conducteur', 'Assistance rapide', 'Véhicule de remplacement', 'RC professionnelle'];

    // Build smart 3-formula comparison based on actual lead data
    let computedSolutionsComparees = [
      {
        assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
        produitFormule: formuleRetenue || (isAuto ? 'Tous Risques' : isHabitation ? 'Formule Confort' : 'Tous Risques VTC + RC Pro'),
        prime: cotisationMensuelle ? `${cotisationMensuelle} € / mois` : '89 € / mois',
        franchise: '300 €',
        observations: 'Offre retenue la plus équilibrée, garanties optimales et conformes aux exigences du souscripteur.'
      },
      {
        assureur: 'Comparatif Solution 2',
        produitFormule: isAuto ? 'Tiers Étendu' : isHabitation ? 'Formule Confort' : 'Tiers Étendu VTC + RC Pro',
        prime: cotisationMensuelle ? `${Math.round(cotisationMensuelle * 0.85)} € / mois` : '75 € / mois',
        franchise: '400 €',
        observations: 'Formule intermédiaire avec vol, incendie et bris de glace.'
      },
      {
        assureur: 'Comparatif Solution 3',
        produitFormule: isAuto ? 'Tiers Simple' : isHabitation ? 'Formule Éco' : 'Tiers VTC + RC Pro',
        prime: cotisationMensuelle ? `${Math.round(cotisationMensuelle * 0.7)} € / mois` : '62 € / mois',
        franchise: '500 €',
        observations: 'Protection minimale responsabilité civile, aucune prise en charge des dommages propres au bien.'
      }
    ];

    if (isAuto && auto) {
      const frac = auto.fractionnement || 'mois';
      computedSolutionsComparees = [
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 1 : Tiers Simple',
          prime: auto.cotisationTiersSimple ? `${auto.cotisationTiersSimple} € / ${frac}` : (auto.formuleSouhaitee === 'Tiers Simple' ? `${auto.cotisationMontant} € / ${frac}` : 'Non chiffré'),
          franchise: '450 €',
          observations: 'Responsabilité Civile légale + Défense / Recours. Aucune couverture des dommages subis par le véhicule.'
        },
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 2 : Tiers Étendu (Vol / Incendie / BDG)',
          prime: auto.cotisationTiersEtendu ? `${auto.cotisationTiersEtendu} € / ${frac}` : (auto.formuleSouhaitee === 'Tiers Étendu' ? `${auto.cotisationMontant} € / ${frac}` : 'Non chiffré'),
          franchise: '350 €',
          observations: 'Tiers + Bris de glace sans franchise, Vol, Incendie, Forces de la nature et Catastrophes naturelles.'
        },
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 3 : Tous Risques Optimale',
          prime: auto.cotisationTousRisques ? `${auto.cotisationTousRisques} € / ${frac}` : (auto.formuleSouhaitee === 'Tous Risques' ? `${auto.cotisationMontant} € / ${frac}` : `${cotisationMensuelle} € / ${frac}`),
          franchise: '300 €',
          observations: 'Couverture intégrale Dommages Tous Accidents + Vandalisme + Assistance Zéro km. Solution la plus protectrice.'
        }
      ];
    } else if (isVtc && vtc) {
      const frac = vtc.fractionnement || 'mois';
      computedSolutionsComparees = [
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 1 : Tiers VTC + RC Pro',
          prime: vtc.cotisationTiersSimple ? `${vtc.cotisationTiersSimple} € / ${frac}` : (vtc.formuleSouhaitee === 'Tiers VTC + RC Pro' ? `${vtc.cotisationMontant} € / ${frac}` : 'Non chiffré'),
          franchise: '500 €',
          observations: 'RC Circulation VTC illimitée + RC Professionnelle Exploitation obligatoire + Protection Juridique.'
        },
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 2 : Tiers Étendu VTC + RC Pro',
          prime: vtc.cotisationTiersEtendu ? `${vtc.cotisationTiersEtendu} € / ${frac}` : (vtc.formuleSouhaitee === 'Tiers Étendu VTC + RC Pro' ? `${vtc.cotisationMontant} € / ${frac}` : 'Non chiffré'),
          franchise: '400 €',
          observations: 'Formule Tiers VTC + Bris de glace + Vol + Incendie + Événements climatiques majeurs.'
        },
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 3 : Tous Risques VTC + RC Pro',
          prime: vtc.cotisationTousRisques ? `${vtc.cotisationTousRisques} € / ${frac}` : (vtc.formuleSouhaitee === 'Tous Risques VTC + RC Pro' ? `${vtc.cotisationMontant} € / ${frac}` : `${cotisationMensuelle} € / ${frac}`),
          franchise: '350 €',
          observations: 'Dommages Tous Accidents VTC + Vandalisme + Véhicule relais homologué VTC + RC Pro intégrale.'
        }
      ];
    } else if (isHabitation && hab) {
      const frac = hab.fractionnement || 'mois';
      computedSolutionsComparees = [
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 1 : Formule Éco',
          prime: hab.cotisationFormuleEco ? `${hab.cotisationFormuleEco} € / ${frac}` : (hab.formuleSouhaitee === 'Formule Éco' ? `${hab.cotisationMontant} € / ${frac}` : 'Non chiffré'),
          franchise: '300 €',
          observations: 'Incendie, Dégâts des eaux et Responsabilité Civile Vie Privée essentielle.'
        },
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 2 : Formule Confort',
          prime: hab.cotisationFormuleConfort ? `${hab.cotisationFormuleConfort} € / ${frac}` : (hab.formuleSouhaitee === 'Formule Confort' ? `${hab.cotisationMontant} € / ${frac}` : `${cotisationMensuelle} € / ${frac}`),
          franchise: '200 €',
          observations: 'Formule Éco + Vol & Vandalisme + Bris de glace étendu + Dommages électriques.'
        },
        {
          assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
          produitFormule: 'Formule 3 : Tous Risques / Premium',
          prime: hab.cotisationFormuleTousRisques ? `${hab.cotisationFormuleTousRisques} € / ${frac}` : (hab.formuleSouhaitee === 'Formule Premium Tous Risques' ? `${hab.cotisationMontant} € / ${frac}` : 'Non chiffré'),
          franchise: '150 €',
          observations: 'Rééquipement à neuf intégral sans vétusté + Protection juridique + Tous risques mobiliers.'
        }
      ];
    }

    // Determine initial recommended formula index based on lead's desired formula
    let initialFormuleIndex = 2; // Default to Formule 3 (Tous Risques / Plus complète)
    if (isAuto && auto) {
      if (auto.formuleSouhaitee === 'Tiers Simple') initialFormuleIndex = 0;
      else if (auto.formuleSouhaitee === 'Tiers Étendu') initialFormuleIndex = 1;
      else initialFormuleIndex = 2;
    } else if (isHabitation && hab) {
      if (hab.formuleSouhaitee === 'Formule Éco') initialFormuleIndex = 0;
      else if (hab.formuleSouhaitee === 'Formule Confort') initialFormuleIndex = 1;
      else initialFormuleIndex = 2;
    } else if (isVtc && vtc) {
      if (vtc.formuleSouhaitee === 'Tiers VTC + RC Pro') initialFormuleIndex = 0;
      else if (vtc.formuleSouhaitee === 'Tiers Étendu VTC + RC Pro') initialFormuleIndex = 1;
      else initialFormuleIndex = 2;
    }

    const selectedInitialSolution = computedSolutionsComparees[initialFormuleIndex] || computedSolutionsComparees[0];
    const initialFormuleName = selectedInitialSolution
      ? selectedInitialSolution.produitFormule.replace(/^Formule \d+\s*:\s*/, '').trim()
      : formuleRetenue;
    const initialCotisationMois = (selectedInitialSolution && selectedInitialSolution.prime && selectedInitialSolution.prime !== 'Non chiffré')
      ? (selectedInitialSolution.prime.includes('TTC') ? selectedInitialSolution.prime : `${selectedInitialSolution.prime} TTC`)
      : `${cotisationMensuelle} € TTC / mois`;

    return {
      canal: 'Tél.',
      dateRecueil: todayStr,
      conseillerNom: conseillerName,
      referenceDossier: refDossier,
      version: '2026-v2',

      statutSouscripteur: isVtc ? 'Micro-entrepreneur' : 'Particulier',
      usageVehiculeDetail: isAuto ? (auto?.typeUtilisation || 'Trajet privé / domicile-travail') : isVtc ? 'Transport de personnes à titre onéreux' : undefined,
      statutVehicule: isAuto ? (auto?.statutVehicule || (auto?.proprietaireVehicule?.includes('LOA') ? 'LOA' : 'Occasion')) : isVtc ? (vtc?.statutVehicule || 'LOA') : undefined,
      kilometrageAnnuelEstime: isAuto ? (auto?.kilometrageAnnuel || '15 000–20 000') : isVtc ? (vtc?.kilometrageAnnuel || 'Kilométrage illimité') : undefined,
      stationnementNuit: isAuto ? (auto?.stationnementNuit || 'Parking privé') : isVtc ? (vtc?.stationnementNuit || 'Garage fermé') : 'Parking privé',
      conducteursSecondaires: [],

      // Habitation
      statutLogement: isHabitation ? (hab?.qualiteSouscripteur || 'Locataire') : undefined,
      capitalMobilierSouhaite: isHabitation ? (hab?.capitalMobilier ? `${hab.capitalMobilier.toLocaleString('fr-FR')} €` : '35 000 €') : undefined,
      capitalObjetsValeur: isHabitation ? '5 000 €' : undefined,
      capitalRc: 'Illimité (dommages corporels) / 10 000 000 € (matériels)',

      // VTC
      statutExploitant: isVtc ? (vtc?.statutJuridique || 'Micro-entrepreneur') : undefined,
      zonePrincipaleActivite: isVtc ? (vtc?.zoneActivite || 'Île-de-France et aéroports') : undefined,
      plateformesUtilisees: isVtc ? (vtc?.plateformesUtilisees || 'Uber, Bolt, Freenow, Clientèle privée') : undefined,

      garantiesRecherchees,
      budgetSouhaiteMois: `${cotisationMensuelle} € / mois`,
      budgetSouhaiteAn: `${cotisationMensuelle * 12} € / an`,
      franchiseMaxSouhaitee: '300 € à 500 €',
      prioritesExprimees: priorites,

      syntheseBesoins: isAuto
        ? `Le client recherche une protection automobile fiable couvrant l'ensemble des risques de circulation, le vol, les dommages matériels et corporels, avec assistance zéro kilomètre et véhicule de remplacement garanti.`
        : isHabitation
        ? `Le souscripteur souhaite assurer son logement principal (${hab?.typeLogement || 'logement'} de ${hab?.surfaceM2 || 65} m² et ${hab?.nombrePieces || 3} pièces) avec indemnisation en rééquipement à neuf, couverture bris de glace, dégâts des eaux et vol, ainsi qu'une responsabilité civile vie privée complète.`
        : `L'exploitant VTC requiert une solution conforme à la réglementation transport de personnes : RC circulation illimitée, RC Professionnelle Exploitation obligatoire, garantie du conducteur renforcée et assistance zéro kilomètre avec véhicule relais homologué VTC.`,

      formuleChoisieIndex: initialFormuleIndex,
      solutionsComparees: computedSolutionsComparees,

      contratConseille: {
        assureur: cabinetInfo.nomCabinet || 'Cabinet Conseil',
        produit: lead.type === 'AUTO' ? 'Contrat Automobile DDA 2026' : lead.type === 'HABITATION' ? 'Contrat Habitation Multirisque' : 'Contrat VTC Pro Intégral',
        formule: initialFormuleName,
        cotisationMois: initialCotisationMois,
        cotisationAn: `${cotisationMensuelle * 12} € TTC / an`,
        frais: lead.fraisDossierMontant ? `${lead.fraisDossierMontant} € TTC` : 'Inclus',
        garantiesRetenues: garantiesRecherchees,
        franchises: {
          brisDeGlace: '0 € (Sans franchise)',
          vol: '350 €',
          incendie: '350 €',
          dommages: selectedInitialSolution?.franchise || '350 €',
          catastrophesNaturelles: '380 € (Légale)'
        }
      },

      justificationConseil: isAuto
        ? `La formule « ${formuleRetenue} » proposée par notre cabinet constitue la solution la plus adaptée aux exigences formulées : elle assure une prise en charge complète des dommages au véhicule, intègre une garantie conducteur indispensable plafonnée à 1 000 000 €, et prévoit l'assistance panne 0 km avec véhicule de remplacement.`
        : isHabitation
        ? `La formule retenue correspond précisément au statut d'occupant et aux biens à protéger : les capitaux mobiliers déclarés sont intégralement couverts en rééquipement à neuf, avec une franchise modérée et l'inclusion de la responsabilité civile chef de famille.`
        : `La formule « ${formuleRetenue} » est la seule garantissant la continuité d'activité professionnelle VTC sans rupture : elle répond strictement aux obligations légales de l'article L.3120-4 du Code des transports, inclut la RC Pro Exploitation et le prêt d'un véhicule homologué VTC en cas d'immobilisation.`,

      pointsSpecifiquesMotivants: isAuto
        ? ['Rapport garanties / cotisation optimal', 'Assistance 0 km avec prêt de véhicule', 'Garantie conducteur élevée', 'Franchise bris de glace offerte']
        : isHabitation
        ? ['Rééquipement à neuf intégral', 'Assistance urgence serrurerie 24h/24', 'Franchise dégâts des eaux modérée', 'Plafond mobilier adapté']
        : ['Continuité d\'activité', 'RC professionnelle', 'Véhicule de remplacement', 'Assistance rapide', 'Budget'],

      garantiesNonRetenues: isAuto
        ? [
            {
              garantie: 'Option Valeur à Neuf (36 mois)',
              proposee: true,
              retenue: false,
              motif: 'Non souhaitée par le client par arbitrage budgétaire.'
            },
            {
              garantie: 'Contenu et effets personnels transportés',
              proposee: true,
              retenue: false,
              motif: 'Couverture jugée non indispensable par le souscripteur.'
            },
            {
              garantie: 'Protection Juridique Automobile Étendue aux litiges permis',
              proposee: true,
              retenue: false,
              motif: 'Défense-recours standard incluse jugée suffisante.'
            }
          ]
        : isHabitation
        ? [
            {
              garantie: 'Objets précieux & bijoux > 15 000 €',
              proposee: true,
              retenue: false,
              motif: 'Non applicable au profil et aux capitaux mobiliers du client.'
            },
            {
              garantie: 'Piscine, spa et aménagements extérieurs',
              proposee: true,
              retenue: false,
              motif: 'Logement ne comportant pas d\'aménagements extérieurs spécifiques.'
            },
            {
              garantie: 'Protection Juridique Étendue aux conflits de voisinage',
              proposee: true,
              retenue: false,
              motif: 'Protection juridique de base incluse jugée suffisante.'
            }
          ]
        : [
            {
              garantie: 'Perte de chiffre d\'affaires / arrêt d\'activité VTC',
              proposee: true,
              retenue: false,
              motif: 'Non souhaitée par arbitrage budgétaire de l\'exploitant.'
            },
            {
              garantie: 'Véhicule de remplacement Berline Luxe catégorie E',
              proposee: true,
              retenue: false,
              motif: 'Véhicule relais standard de catégorie équivalente retenu.'
            },
            {
              garantie: 'Bris de glace étendu aux toits panoramiques & caméras ADAS',
              proposee: true,
              retenue: false,
              motif: 'Prise en charge bris de glace standard jugée suffisante.'
            }
          ],

      exclusionsExpliquees: [
        'Faits intentionnels ou dolosifs de l\'assuré ou conduite sous l\'empire d\'un état alcoolique / stupéfiants.',
        'Sinistres survenus lorsque le contrôle technique n\'est pas valide ou défaut de permis en vigueur.',
        'Usages non déclarés aux conditions particulières (ex: transport onéreux non déclaré pour contrat auto classique).',
        'Dommages résultant de l\'usure normale, défaut d\'entretien manifeste ou vices de construction.'
      ],

      documentsRemis: [
        'Document d\'information sur le produit d\'assurance (IPID)',
        'Conditions Générales de la formule souscrite',
        'Conditions Particulières et projet de contrat',
        'Devis formel détaillé',
        'Fiche de devoir de conseil & recueil des besoins'
      ],

      informationsSuffisantes: true,
      modificationBesoinAvantSouscription: false,

      documentsDossierArchives: [
        'Fiche de devoir de conseil',
        'Questionnaire client',
        'Devis',
        'Relevé d\'information',
        'Pièces justificatives',
        'IPID',
        'Conditions générales'
      ],

      controleurNom: 'Direction de la Conformité & Contrôle Interne',
      dateControle: todayStr,
      anomaliesControle: 'Aucune anomalie constatée. Dossier conforme DDA / ACPR.',

      dateValidation: todayStr,
      validePar: conseillerName
    };
  };

  const [formData, setFormData] = useState<DevoirConseilData>(initialData());

  // Generate pure isolated HTML for printing & downloading without any CRM elements
  const generateCleanDocumentHTML = (): string => {
    const isAuto = lead.type === 'AUTO';
    const isVtc = lead.type === 'VTC';
    const isHab = lead.type === 'HABITATION';

    const souscripteurNomComplet = `${lead.civilite ? lead.civilite + ' ' : ''}${lead.nom} ${lead.prenom}`.trim();
    const souscripteurAdresse = lead.adresse || lead.autoDetails?.adresse || lead.habitationDetails?.adresse || lead.vtcDetails?.adresse || 'Adresse conforme dossier client';
    const souscripteurCpVille = `${lead.codePostal || lead.autoDetails?.codePostal || lead.habitationDetails?.codePostal || lead.vtcDetails?.codePostal || ''} ${lead.ville || lead.autoDetails?.ville || lead.habitationDetails?.ville || lead.vtcDetails?.ville || ''}`.trim() || 'France';

    const checkMark = (checked: boolean, label: string) => `
      <span style="display:inline-flex; align-items:center; margin-right:12px; margin-bottom:4px; font-size:11px; color:#1e293b;">
        <span style="display:inline-block; width:13px; height:13px; border:1px solid #475569; border-radius:2px; text-align:center; line-height:12px; font-size:9px; font-weight:bold; margin-right:5px; background:${checked ? '#122e4d' : '#ffffff'}; color:${checked ? '#ffffff' : 'transparent'};">
          ${checked ? '✓' : ''}
        </span>
        <span>${label}</span>
      </span>
    `;

    const fieldBlock = (label: string, value: string | number | undefined | null) => `
      <div style="margin-bottom:6px;">
        <div style="font-size:9px; text-transform:uppercase; font-weight:bold; color:#64748b; letter-spacing:0.5px; margin-bottom:2px;">${label}</div>
        <div style="font-size:11px; font-weight:600; color:#0f172a; border-bottom:1px dotted #94a3b8; padding-bottom:2px; min-height:16px;">
          ${value !== undefined && value !== null && value !== '' ? value : '—'}
        </div>
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devoir de Conseil — Assurance ${isAuto ? 'Automobile' : isHab ? 'Habitation' : 'VTC'} — ${lead.nom} ${lead.prenom}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto 15mm auto;
      background: #ffffff;
      padding: 0;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child {
      page-break-after: avoid;
      break-after: avoid;
      margin-bottom: 0;
    }
    .page-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid #122e4d;
    }
    .page-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #122e4d;
      padding-bottom: 5px;
      margin-bottom: 10px;
      font-size: 9.5px;
    }
    .header-box {
      border: 1px solid #94a3b8;
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 12px;
    }
    .header-box td {
      border: 1px solid #94a3b8;
      padding: 6px 10px;
      font-size: 10px;
    }
    .section-title {
      background-color: #122e4d !important;
      color: #ffffff !important;
      padding: 4px 10px;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      margin-top: 10px;
    }
    .section-body {
      border: 1px solid #cbd5e1;
      border-top: none;
      padding: 8px 12px;
      background: #ffffff;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      margin-bottom: 10px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 10px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 10.5px;
    }
    table.data-table th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      color: #475569;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
    }
    .page-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748b;
      margin-top: 14px;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .page {
        margin: 0;
        padding: 0;
        width: 100%;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- ========================================== -->
  <!-- PAGE 1 : RECUEIL BESOINS & RISQUE          -->
  <!-- ========================================== -->
  <div class="page">
    
    <!-- EN-TÊTE PAGE 1 : LOGO CABINET À GAUCHE / INFOS SOUSCRIPTEUR À DROITE -->
    <div class="page-header-top">
      <!-- À GAUCHE : LOGO & COORDONNÉES DU CABINET -->
      <div style="flex:1; min-width:0; padding-right:16px;">
        ${cabinetInfo.logoUrl ? `
          <div style="margin-bottom:8px;">
            <img src="${cabinetInfo.logoUrl}" alt="${cabinetInfo.nomCabinet}" style="max-height:80px; max-width:270px; height:auto; width:auto; object-fit:contain; display:block;" />
          </div>
        ` : `
          <div style="display:inline-flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="width:44px; height:44px; border-radius:6px; background:#122e4d; color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px;">
              ${(cabinetInfo.nomCabinet || 'AC').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style="font-size:15px; font-weight:800; color:#122e4d; line-height:1.15;">${cabinetInfo.nomCabinet || 'Cabinet de Courtage'}</div>
              <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Courtage en Assurances</div>
            </div>
          </div>
        `}
        <div style="font-size:10px; color:#334155; line-height:1.4;">
          <div style="font-weight:700; color:#0f172a; font-size:11.5px;">${cabinetInfo.nomCabinet}</div>
          <div>${cabinetInfo.adresse ? cabinetInfo.adresse + ' — ' : ''}${cabinetInfo.codePostal || ''} ${cabinetInfo.ville || ''}</div>
          ${(cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim()) || cabinetInfo.siret ? `
            <div style="color:#475569; font-size:9.5px; margin-top:1px;">
              ${cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? `<span>ORIAS N° <strong>${cabinetInfo.numeroOrias.trim()}</strong></span>` : ''}
              ${cabinetInfo.siret ? `${cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? ' • ' : ''}<span>SIRET : ${cabinetInfo.siret}</span>` : ''}
            </div>
          ` : ''}
          <div style="color:#475569; font-size:9.5px;">
            ${cabinetInfo.telephone ? `Tél : <strong>${cabinetInfo.telephone}</strong>` : ''}
            ${cabinetInfo.emailContact ? `${cabinetInfo.telephone ? ' • ' : ''}Courriel : ${cabinetInfo.emailContact}` : ''}
          </div>
        </div>
      </div>

      <!-- À DROITE : INFOS DU SOUSCRIPTEUR -->
      <div style="width:290px; flex-shrink:0; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:9px 12px; border-left:4px solid #122e4d;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <span style="font-size:8.5px; text-transform:uppercase; font-weight:800; color:#64748b; letter-spacing:0.5px;">SOUSCRIPTEUR / ASSURÉ</span>
          <span style="font-family:monospace; color:#1e293b; font-size:9px; font-weight:700; background:#e2e8f0; padding:1px 4px; border-radius:3px;">Réf. ${formData.referenceDossier}</span>
        </div>
        <div style="font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.25; margin-bottom:2px;">
          ${souscripteurNomComplet}
          ${isVtc && lead.vtcDetails?.nomSociete ? `<div style="font-size:10px; font-weight:600; color:#475569;">${lead.vtcDetails.nomSociete}</div>` : ''}
        </div>
        <div style="font-size:10.5px; color:#334155; line-height:1.35;">
          <div style="color:#1e293b;">${souscripteurAdresse}</div>
          <div style="font-weight:700; color:#0f172a;">${souscripteurCpVille}</div>
          <div style="margin-top:3px; font-size:9.5px; color:#64748b; border-top:1px dotted #cbd5e1; padding-top:3px; display:flex; flex-direction:column; gap:1px;">
            ${lead.telephone ? `<div>Tél : <strong style="color:#0f172a;">${lead.telephone}</strong></div>` : ''}
            ${lead.email ? `<div>Email : <strong style="color:#0f172a;">${lead.email}</strong></div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- TITRE OFFICIEL DU DOCUMENT -->
    <div style="text-align:center; margin-bottom:8px;">
      <h1 style="font-size:14px; font-weight:900; text-transform:uppercase; margin:0 0 2px 0; color:#0f172a; letter-spacing:0.5px;">
        DEVOIR DE CONSEIL — ASSURANCE ${isAuto ? 'AUTOMOBILE' : isHab ? 'HABITATION' : 'VTC'}
      </h1>
      <div style="font-size:9.5px; font-style:italic; color:#475569;">
        Fiche professionnelle de recueil des besoins, exigences et justification du conseil • Conforme directive DDA (Art. L.521-4 Code des assurances)
      </div>
    </div>

    <!-- BANDEAU MÉTADONNÉES ENTRETIEN -->
    <table class="header-box" style="margin-bottom:8px;">
      <tr>
        <td style="width:25%;">
          <strong style="color:#64748b; text-transform:uppercase; font-size:8.5px; display:block;">Date de l'entretien</strong>
          <span style="font-weight:bold; font-size:10.5px;">${formData.dateRecueil}</span>
        </td>
        <td style="width:25%;">
          <strong style="color:#64748b; text-transform:uppercase; font-size:8.5px; display:block;">Conseiller Référent</strong>
          <span style="font-weight:bold; font-size:10.5px;">${formData.conseillerNom}</span>
        </td>
        <td style="width:25%;">
          <strong style="color:#64748b; text-transform:uppercase; font-size:8.5px; display:block; margin-bottom:1px;">Canal de distribution</strong>
          <div style="font-size:9.5px;">
            ${checkMark(formData.canal === 'Tél.', 'Tél.')}
            ${checkMark(formData.canal === 'Agence', 'Agence')}
            ${checkMark(formData.canal === 'Visio', 'Visio')}
            ${checkMark(formData.canal === 'Web', 'Web')}
          </div>
        </td>
        <td style="width:25%;">
          <strong style="color:#64748b; text-transform:uppercase; font-size:8.5px; display:block;">Cadre Réglementaire</strong>
          <span style="font-weight:bold; font-size:10.5px; color:#122e4d;">DDA-FR-2026</span>
        </td>
      </tr>
    </table>

    <!-- 1. SITUATION DU SOUSCRIPTEUR -->
    <div class="section-title">1. Situation du souscripteur ${isVtc ? '/ Exploitant VTC' : isHab ? '/ Occupant' : ''}</div>
    <div class="section-body">
      <div class="grid-3">
        ${fieldBlock('Date de naissance', lead.autoDetails?.dateNaissance || lead.habitationDetails?.dateNaissance || lead.vtcDetails?.dateNaissance || '01/01/1985')}
        ${fieldBlock('Profession / Activité', lead.autoDetails?.profession || lead.habitationDetails?.profession || (isVtc ? 'Chauffeur VTC Indépendant' : 'Salarié'))}
        ${fieldBlock('Situation familiale', lead.autoDetails?.situationFamiliale || lead.habitationDetails?.situationFamiliale || 'Célibataire / Non précisé')}
      </div>
      <div style="border-top:1px solid #e2e8f0; padding-top:4px; margin-top:4px;">
        <span style="font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase; margin-right:8px;">Statut juridique :</span>
        ${checkMark(lead.type !== 'VTC', 'Particulier')}
        ${checkMark(lead.type === 'VTC', 'Professionnel Indépendant / Micro-entreprise')}
        ${checkMark(false, 'Société commerciale (SASU / SARL / SAS)')}
      </div>
    </div>

    <!-- 2. CARACTERISTIQUES DU RISQUE -->
    ${isAuto ? `
      <div class="section-title">2. Caractéristiques du véhicule à assurer</div>
      <div class="section-body">
        <div class="grid-4">
          ${fieldBlock('Immatriculation', lead.autoDetails?.immatriculation || 'AA-123-BB')}
          ${fieldBlock('Marque / Modèle', lead.autoDetails?.marqueModele || 'Renault Clio V')}
          ${fieldBlock('Version / Finition', lead.autoDetails?.version || 'Finition standard')}
          ${fieldBlock('1ère mise en circulation', lead.autoDetails?.dateMiseEnCirculation || '15/06/2021')}
        </div>
        <div class="grid-4">
          ${fieldBlock('Puissance fiscale', lead.autoDetails?.puissanceFiscale ? `${lead.autoDetails.puissanceFiscale} CV` : '5 CV')}
          ${fieldBlock('Énergie / Motorisation', lead.autoDetails?.energie || 'Essence')}
          ${fieldBlock('Valeur estimée / Achat', lead.autoDetails?.valeurEstimee ? `${lead.autoDetails.valeurEstimee.toLocaleString('fr-FR')} €` : '14 500 €')}
          ${fieldBlock('Propriétaire (Carte grise)', lead.autoDetails?.proprietaireVehicule || 'Conducteur principal')}
        </div>
        <div style="border-top:1px solid #e2e8f0; padding-top:6px; margin-top:4px;">
          <span style="font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase; margin-right:8px;">Statut d'acquisition :</span>
          ${checkMark(lead.autoDetails?.statutVehicule === 'Neuf', 'Neuf')}
          ${checkMark(!lead.autoDetails?.statutVehicule || lead.autoDetails?.statutVehicule === 'Occasion', 'Occasion')}
          ${checkMark(lead.autoDetails?.statutVehicule === 'LOA' || lead.autoDetails?.proprietaireVehicule?.includes('LOA') || false, 'LOA')}
          ${checkMark(lead.autoDetails?.statutVehicule === 'LLD' || lead.autoDetails?.proprietaireVehicule?.includes('LLD') || false, 'LLD')}
          ${checkMark(lead.autoDetails?.statutVehicule === 'Crédit', 'Achat à crédit')}
          ${checkMark(lead.autoDetails?.statutVehicule === 'Comptant', 'Achat comptant')}
        </div>
      </div>
    ` : ''}

    ${isVtc ? `
      <div class="section-title">2. Caractéristiques de l'activité VTC & du véhicule professionnel</div>
      <div class="section-body">
        <div class="grid-3">
          ${fieldBlock('N° SIREN / SIRET', lead.vtcDetails?.siret || '892 123 456 00012')}
          ${fieldBlock('N° Carte VTC Professionnelle', lead.vtcDetails?.numeroCarteVtc || 'VTC-75-2023-098')}
          ${fieldBlock('Zone principale d\'activité', formData.zonePrincipaleActivite)}
        </div>
        <div class="grid-4">
          ${fieldBlock('Immatriculation VTC', lead.vtcDetails?.immatriculation || 'FK-890-WX')}
          ${fieldBlock('Marque & Modèle', lead.vtcDetails?.marqueModele || 'Toyota Camry Hybride')}
          ${fieldBlock('Version / Finition', lead.vtcDetails?.version || 'Finition Business Pro')}
          ${fieldBlock('1ère mise en circulation', lead.vtcDetails?.anneeVehicule || '2023')}
        </div>
        <div class="grid-4">
          ${fieldBlock('Puissance fiscale', lead.vtcDetails?.puissanceFiscale ? `${lead.vtcDetails.puissanceFiscale} CV` : '7 CV')}
          ${fieldBlock('Énergie / Motorisation', lead.vtcDetails?.typeMotorisation || 'Hybride')}
          ${fieldBlock('Valeur vénale / Achat', lead.vtcDetails?.valeurEstimee ? `${lead.vtcDetails.valeurEstimee.toLocaleString('fr-FR')} €` : '38 000 €')}
          ${fieldBlock('Propriétaire / Financement', lead.vtcDetails?.proprietaireVehicule || 'LOA')}
        </div>
        <div style="border-top:1px solid #e2e8f0; padding-top:6px; margin-top:4px;">
          <span style="font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase; margin-right:8px;">Plateformes & Usage :</span>
          ${checkMark(true, 'Transport à titre onéreux (VTC)')}
          ${checkMark(true, 'Usage personnel en complément')}
          ${checkMark(lead.vtcDetails?.kilometrageAnnuel === 'Kilométrage illimité' || true, 'Kilométrage illimité')}
        </div>
      </div>
    ` : ''}

    ${isHab ? `
      <div class="section-title">2. Caractéristiques du logement à assurer</div>
      <div class="section-body">
        <div class="grid-3">
          ${fieldBlock('Type de bien', lead.habitationDetails?.typeLogement || 'Appartement')}
          ${fieldBlock('Surface habitable', `${lead.habitationDetails?.surfaceM2 || 65} m²`)}
          ${fieldBlock('Nombre de pièces principales', `${lead.habitationDetails?.nombrePieces || 3} pièces`)}
        </div>
        <div class="grid-3">
          ${fieldBlock('Étage / Niveaux', lead.habitationDetails?.etage ? `Étage ${lead.habitationDetails.etage}` : '2ème étage')}
          ${fieldBlock('Statut d\'occupation', lead.habitationDetails?.qualiteSouscripteur || 'Locataire')}
          ${fieldBlock('Capital mobilier estimé', formData.capitalMobilierSouhaite)}
        </div>
      </div>
    ` : ''}

    <!-- 3. USAGE ET CONDUCTEUR / ANTÉCÉDENTS -->
    ${isAuto ? `
      <div class="grid-2">
        <div>
          <div class="section-title">3. Utilisation déclarée du véhicule</div>
          <div class="section-body">
            <div>
              ${checkMark(lead.autoDetails?.typeUtilisation === 'Trajet privé', 'Privé / Loisirs')}
              ${checkMark(lead.autoDetails?.typeUtilisation?.includes('travail') || true, 'Trajet domicile-travail')}
              ${checkMark(lead.autoDetails?.typeUtilisation?.includes('Commercial') || false, 'Déplacements professionnels')}
            </div>
            <div style="border-top:1px solid #e2e8f0; padding-top:4px; margin-top:4px;">
              <strong style="font-size:9.5px; color:#64748b; text-transform:uppercase; display:block;">Kilométrage annuel estimé</strong>
              ${checkMark(lead.autoDetails?.kilometrageAnnuel === '< 10 000', '< 10 000 km')}
              ${checkMark(!lead.autoDetails?.kilometrageAnnuel || lead.autoDetails?.kilometrageAnnuel === '15 000–20 000' || lead.autoDetails?.kilometrageAnnuel === '10 000–15 000', '10 000–20 000 km')}
              ${checkMark(lead.autoDetails?.kilometrageAnnuel === '> 20 000', '> 20 000 km')}
              ${checkMark(lead.autoDetails?.kilometrageAnnuel === 'Kilométrage illimité', 'Kilométrage illimité')}
            </div>
            <div style="border-top:1px solid #e2e8f0; padding-top:4px; margin-top:4px;">
              <strong style="font-size:9.5px; color:#64748b; text-transform:uppercase; display:block;">Stationnement habituel de nuit</strong>
              <span style="font-weight:600; font-size:10.5px;">${lead.autoDetails?.stationnementNuit || 'Parking privé / Garage fermé'}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="section-title">4. Conducteur principal & Antécédents</div>
          <div class="section-body">
            ${fieldBlock('Conducteur principal', `${lead.prenom} ${lead.nom}`)}
            ${fieldBlock('Date d\'obtention du permis', lead.autoDetails?.datePermis || '12/04/2010')}
            <div class="grid-2">
              ${fieldBlock('Coefficient CRM (Bonus)', lead.autoDetails?.bonusMalus ? `${lead.autoDetails.bonusMalus}` : '0.50 (50% bonus)')}
              ${fieldBlock('Sinistres (36 mois)', lead.autoDetails?.aEuDesSinistres ? `${lead.autoDetails.sinistres?.length || 1} déclaré(s)` : '0 (Aucun sinistre)')}
            </div>
            ${fieldBlock('Dernier assureur connu', lead.autoDetails?.nomDerniereCompagnie || 'Assureur Direct France')}
          </div>
        </div>
      </div>
    ` : ''}

    <div class="page-footer">
      <span>Devoir de conseil — Assurance ${isAuto ? 'automobile' : isHab ? 'habitation' : 'VTC'} | Réf. ${formData.referenceDossier}</span>
      <strong>Page 1 / 3</strong>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- PAGE 2 : BESOINS & COMPARATIF 3 FORMULES   -->
  <!-- ========================================== -->
  <div class="page">
    <!-- EN-TÊTE DE PAGE 2 : LOGO CABINET À GAUCHE / INFOS SOUSCRIPTEUR À DROITE -->
    <div class="page-running-header">
      <div style="display:flex; align-items:center; gap:8px;">
        ${cabinetInfo.logoUrl ? `
          <img src="${cabinetInfo.logoUrl}" alt="${cabinetInfo.nomCabinet}" style="height:22px; max-width:90px; object-fit:contain;" />
        ` : `
          <span style="display:inline-block; padding:2px 5px; background:#122e4d; color:#ffffff; font-weight:bold; font-size:8.5px; border-radius:3px;">
            ${(cabinetInfo.nomCabinet || 'AC').slice(0, 2).toUpperCase()}
          </span>
        `}
        <div>
          <span style="font-weight:800; font-size:10px; color:#122e4d;">${cabinetInfo.nomCabinet}</span>
          ${cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? `<span style="font-size:8.5px; color:#64748b; margin-left:5px;">ORIAS N° ${cabinetInfo.numeroOrias.trim()}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right; font-size:9.5px; color:#334155;">
        <div>Souscripteur : <strong style="color:#0f172a;">${souscripteurNomComplet}</strong> • Réf. <span style="font-family:monospace; font-weight:bold;">${formData.referenceDossier}</span></div>
        <div style="font-size:8.5px; color:#64748b;">${souscripteurAdresse}, ${souscripteurCpVille}</div>
      </div>
    </div>

    <div class="section-title">5. Recueil des exigences, besoins et budget du souscripteur</div>
    <div class="section-body">
      <div class="grid-3">
        ${fieldBlock('Budget mensuel souhaité', formData.budgetSouhaiteMois)}
        ${fieldBlock('Budget annuel maximum', formData.budgetSouhaiteAn)}
        ${fieldBlock('Franchise maximale tolérée', formData.franchiseMaxSouhaitee)}
      </div>
      <div style="margin-top:6px;">
        <strong style="font-size:9.5px; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Garanties & Priorités indispensables exprimées par le client :</strong>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${formData.garantiesRecherchees.map(g => checkMark(true, g)).join('')}
        </div>
      </div>
    </div>

    <div class="section-title">6. Synthèse des exigences et besoins formulés lors de l'entretien</div>
    <div class="section-body" style="font-style:italic; font-size:11px; color:#1e293b; background:#f8fafc; border-left:3px solid #122e4d; padding:8px 12px;">
      « ${formData.syntheseBesoins} »
    </div>

    <!-- 7. ÉTUDE COMPARATIVE DES 3 SOLUTIONS -->
    <div class="section-title">7. Étude comparative des solutions étudiées & Devoir de Conseil</div>
    <div class="section-body">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:26%;">Formule Chiffrée</th>
            <th style="width:22%;">Cotisation TTC</th>
            <th style="width:17%;">Franchise</th>
            <th style="width:35%;">Observations & Adéquation aux besoins</th>
          </tr>
        </thead>
        <tbody>
          ${formData.solutionsComparees.map((sol, idx) => {
            const isRetenue = (formData.formuleChoisieIndex !== undefined ? idx === formData.formuleChoisieIndex : (sol.produitFormule.includes('★') || sol.produitFormule.toLowerCase().includes(formData.contratConseille.formule.toLowerCase())));
            const cleanTitle = sol.produitFormule.replace('★ (Retenue)', '').trim();
            return `
            <tr style="background:${isRetenue ? '#eff6ff' : '#ffffff'};">
              <td style="padding:6px 8px;">
                <strong style="color:${isRetenue ? '#1d4ed8' : '#0f172a'};">${isRetenue ? '★ ' : ''}${cleanTitle}</strong>
                ${isRetenue ? '<div style="color:#15803d; font-size:9px; font-weight:bold; margin-top:2px;">✔ FORMULE CHOISIE ET CONSEILLÉE</div>' : ''}
              </td>
              <td style="font-weight:bold; font-family:monospace; font-size:11.5px; padding:6px 8px;">${sol.prime}</td>
              <td style="padding:6px 8px; font-weight:${isRetenue ? 'bold' : 'normal'}; color:${isRetenue ? '#1d4ed8' : '#334155'};">${sol.franchise}</td>
              <td style="font-size:10px; color:#475569; padding:6px 8px;">${sol.observations}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>

    <!-- 8. CONTRAT CONSEILLÉ DÉTAILLÉ -->
    <div class="section-title">8. Caractéristiques détaillées du contrat conseillé</div>
    <div class="section-body">
      <div class="grid-4">
        ${fieldBlock('Cabinet / Assureur', formData.contratConseille.assureur)}
        ${fieldBlock('Produit sélectionné', formData.contratConseille.produit)}
        ${fieldBlock('Formule Préconisée', formData.contratConseille.formule)}
        ${fieldBlock('Cotisation TTC', `${formData.contratConseille.cotisationMois} (${formData.contratConseille.cotisationAn})`)}
      </div>
      <div style="border-top:1px solid #e2e8f0; padding-top:6px; margin-top:6px;">
        <strong style="font-size:9.5px; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Niveau des franchises contractuelles applicables :</strong>
        <div style="display:flex; flex-wrap:wrap; gap:12px; font-size:10.5px;">
          <div>Bris de glace : <strong>${formData.contratConseille.franchises.brisDeGlace || '0 € (Sans franchise)'}</strong></div>
          <div>Vol : <strong>${formData.contratConseille.franchises.vol || '350 €'}</strong></div>
          <div>Incendie : <strong>${formData.contratConseille.franchises.incendie || '350 €'}</strong></div>
          <div>Dommages : <strong>${formData.contratConseille.franchises.dommages || '350 €'}</strong></div>
          <div>Catastrophes naturelles : <strong>${formData.contratConseille.franchises.catastrophesNaturelles || '380 € (Légale)'}</strong></div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Devoir de conseil — Assurance ${isAuto ? 'automobile' : isHab ? 'habitation' : 'VTC'} | Réf. ${formData.referenceDossier}</span>
      <strong>Page 2 / 3</strong>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- PAGE 3 : JUSTIFICATION, DDA & SIGNATURES   -->
  <!-- ========================================== -->
  <div class="page">
    <!-- EN-TÊTE DE PAGE 3 : LOGO CABINET À GAUCHE / INFOS SOUSCRIPTEUR À DROITE -->
    <div class="page-running-header">
      <div style="display:flex; align-items:center; gap:8px;">
        ${cabinetInfo.logoUrl ? `
          <img src="${cabinetInfo.logoUrl}" alt="${cabinetInfo.nomCabinet}" style="height:22px; max-width:90px; object-fit:contain;" />
        ` : `
          <span style="display:inline-block; padding:2px 5px; background:#122e4d; color:#ffffff; font-weight:bold; font-size:8.5px; border-radius:3px;">
            ${(cabinetInfo.nomCabinet || 'AC').slice(0, 2).toUpperCase()}
          </span>
        `}
        <div>
          <span style="font-weight:800; font-size:10px; color:#122e4d;">${cabinetInfo.nomCabinet}</span>
          ${cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? `<span style="font-size:8.5px; color:#64748b; margin-left:5px;">ORIAS N° ${cabinetInfo.numeroOrias.trim()}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right; font-size:9.5px; color:#334155;">
        <div>Souscripteur : <strong style="color:#0f172a;">${souscripteurNomComplet}</strong> • Réf. <span style="font-family:monospace; font-weight:bold;">${formData.referenceDossier}</span></div>
        <div style="font-size:8.5px; color:#64748b;">${souscripteurAdresse}, ${souscripteurCpVille}</div>
      </div>
    </div>

    <div class="section-title">9. Analyse et justification personnalisée du conseil</div>
    <div class="section-body">
      <div style="font-size:11px; line-height:1.45; color:#1e293b; background:#f8fafc; padding:8px 10px; border-radius:3px; margin-bottom:6px;">
        ${formData.justificationConseil}
      </div>
      <div>
        <strong style="font-size:9.5px; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Points techniques majeurs justifiant cette proposition :</strong>
        <div>
          ${formData.pointsSpecifiquesMotivants.map(pt => checkMark(true, pt)).join('')}
        </div>
      </div>
    </div>

    <!-- 10. GARANTIES NON RETENUES -->
    <div class="section-title">10. Garanties proposées et non retenues (Arbitrage client)</div>
    <div class="section-body">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:35%;">Garantie / Option examinée</th>
            <th style="width:15%; text-align:center;">Proposée</th>
            <th style="width:15%; text-align:center;">Retenue</th>
            <th style="width:35%;">Motif de non-rétention par le souscripteur</th>
          </tr>
        </thead>
        <tbody>
          ${formData.garantiesNonRetenues.map(gnr => `
            <tr>
              <td><strong>${gnr.garantie}</strong></td>
              <td style="text-align:center;">${gnr.proposee ? 'Oui' : 'Non'}</td>
              <td style="text-align:center; color:#b91c1c; font-weight:bold;">${gnr.retenue ? 'Oui' : 'Non'}</td>
              <td style="font-style:italic; font-size:10px; color:#64748b;">${gnr.motif}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- 11. EXCLUSIONS & DOCUMENTS REMIS -->
    <div class="section-title">11. Principales exclusions légales & Documents précontractuels remis</div>
    <div class="section-body">
      <div style="font-size:10.5px; color:#475569; margin-bottom:4px;">
        Le souscripteur atteste avoir été dûment informé des exclusions légales et contractuelles usuelles :
      </div>
      <ul style="margin:2px 0 6px 18px; padding:0; font-size:10px; color:#334155;">
        ${formData.exclusionsExpliquees.map(ex => `<li>${ex}</li>`).join('')}
      </ul>
      <div style="border-top:1px solid #e2e8f0; padding-top:4px; margin-top:4px;">
        <strong style="font-size:9.5px; color:#64748b; text-transform:uppercase; display:block; margin-bottom:3px;">Documents remis au souscripteur avant engagement :</strong>
        <div>
          ${formData.documentsRemis.map(doc => checkMark(true, doc)).join('')}
        </div>
      </div>
    </div>

    <!-- 12. DOUBLE CADRE DE VALIDATION & SIGNATURE -->
    <div class="section-title">12. Attestation de remise et validations des parties (Directive DDA)</div>
    <div class="section-body" style="padding:10px 12px;">
      <div class="grid-2">
        <!-- Cadre Client -->
        <div style="border:1px solid #94a3b8; border-radius:4px; padding:8px 10px; background:#f8fafc;">
          <strong style="font-size:10.5px; text-transform:uppercase; color:#0f172a; display:block; border-bottom:1px solid #cbd5e1; padding-bottom:3px; margin-bottom:4px;">
            Pour le Souscripteur (Assuré)
          </strong>
          <div style="font-size:9.5px; color:#475569; margin-bottom:6px; line-height:1.3;">
            Je certifie l'exactitude des informations transmises et reconnais avoir reçu la présente fiche de conseil et le document IPID avant toute souscription.
          </div>
          <div style="font-size:10px; margin-bottom:3px;">Nom : <strong>${lead.nom} ${lead.prenom}</strong></div>
          <div style="font-size:10px; margin-bottom:6px;">Date : <strong>${formData.dateRecueil}</strong></div>
          <div style="font-size:9.5px; color:#64748b; margin-bottom:2px;">Signature précédée de « Lu et approuvé » :</div>
          <div style="height:60px; border:1px dashed #94a3b8; background:#ffffff; border-radius:3px; display:flex; align-items:center; justify-content:center; text-align:center; padding:4px;">
            ${lead.signatureData?.statut === 'SIGNE' ? `
              <div>
                <div style="font-family:serif; font-style:italic; color:#1e3a8a; font-size:12px;">« Lu et approuvé »</div>
                <div style="font-size:9px; font-weight:bold; color:#15803d; margin-top:2px;">
                  Signé numériquement le ${lead.signatureData.dateSignature}
                </div>
              </div>
            ` : `
              <span style="font-size:9.5px; color:#94a3b8; font-style:italic;">Signature manuscrite ou électronique</span>
            `}
          </div>
        </div>

        <!-- Cadre Conseiller / Cabinet -->
        <div style="border:1px solid #94a3b8; border-radius:4px; padding:8px 10px; background:#f8fafc;">
          <strong style="font-size:10.5px; text-transform:uppercase; color:#0f172a; display:block; border-bottom:1px solid #cbd5e1; padding-bottom:3px; margin-bottom:4px;">
            Pour le Cabinet de Courtage
          </strong>
          <div style="font-size:9.5px; color:#475569; margin-bottom:6px; line-height:1.3;">
            Le conseiller atteste avoir analysé les besoins du client de façon loyale, impartiale et formulé un conseil conforme aux exigences de l'art. L.521-4 du Code des assurances.
          </div>
          <div style="font-size:10px; margin-bottom:3px;">Conseiller : <strong>${formData.conseillerNom}</strong></div>
          <div style="font-size:10px; margin-bottom:6px;">Date : <strong>${formData.dateRecueil}</strong></div>
          <div style="font-size:9.5px; color:#64748b; margin-bottom:2px;">Visa et cachet professionnel :</div>
          <div style="height:60px; border:1px dashed #94a3b8; background:#ffffff; border-radius:3px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:4px;">
            <strong style="font-size:11px; color:#122e4d;">${cabinetInfo.nomCabinet}</strong>
            <span style="font-size:8.5px; color:#64748b; font-family:monospace;">${cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? `ORIAS N° ${cabinetInfo.numeroOrias.trim()} • ` : ''}Visa DDA</span>
            <span style="font-size:8.5px; color:#15803d; font-weight:bold; margin-top:1px;">Certifié conforme le ${formData.dateRecueil}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Traçabilité légale & Note conformité -->
    <div style="border:1px solid #e2e8f0; background:#f8fafc; border-radius:3px; padding:6px 10px; font-size:9px; color:#64748b; margin-top:8px; line-height:1.35;">
      <strong>ARCHIVAGE & CONFORMITÉ ACPR 2026 :</strong> Document d'information précontractuelle obligatoire conservé sous archivage horodaté dans la GED du cabinet (Ref. ${formData.referenceDossier}). Conformité DDA et vérification interne validée.
    </div>

    <div class="page-footer">
      <span>Devoir de conseil — Assurance ${isAuto ? 'automobile' : isHab ? 'habitation' : 'VTC'} | Réf. ${formData.referenceDossier}</span>
      <strong>Page 3 / 3 — Fin du document</strong>
    </div>
  </div>

</body>
</html>`;
  };

  // Pure isolated printing via iframe - ZERO trace of CRM
  const handlePrint = () => {
    try {
      const cleanHtml = generateCleanDocumentHTML();

      // Create an isolated hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(cleanHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print trigger failed:', e);
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }, 500);
    } catch (err) {
      console.error('Error during isolated print:', err);
      window.print();
    }
  };

  // Open clean document in a new tab for fullscreen view or PDF download
  const handleOpenCleanTab = () => {
    const cleanHtml = generateCleanDocumentHTML();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(cleanHtml);
      newWindow.document.close();
    }
  };

  // Download standalone HTML file
  const handleDownloadHTML = () => {
    const cleanHtml = generateCleanDocumentHTML();
    const blob = new Blob([cleanHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Devoir_de_Conseil_${lead.type}_${lead.nom}_${lead.prenom}_${formData.referenceDossier}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToLead = () => {
    const timestamp = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const authorName = currentUser ? getUserDisplayName(currentUser) : 'Courtier';

    // 1. Create activity log
    const newActivity: ActivityLogItem = {
      id: 'dc-' + Date.now(),
      type: 'DDA_GENERATED',
      title: `Devoir de conseil (${lead.type}) conforme DDA 2026 généré`,
      description: `Fiche de recueil des besoins, exigences et justification du conseil générée et archivée. Référence : ${formData.referenceDossier}.`,
      author: authorName,
      date: timestamp
    };

    // 2. Attach document entry to lead.documents
    const docTitle = `Devoir_de_Conseil_${lead.type}_${lead.referenceDevis || '2026'}.pdf`;
    const newDoc: LeadDocument = {
      id: 'doc-dc-' + Date.now(),
      name: `Devoir de conseil DDA 2026 - Assurance ${lead.type === 'AUTO' ? 'Automobile' : lead.type === 'HABITATION' ? 'Habitation' : 'VTC'}`,
      fileName: docTitle,
      fileType: 'application/pdf',
      fileSize: 85400,
      uploadedAt: timestamp,
      uploadedBy: authorName,
      category: 'AUTRE',
      notes: `Fiche officielle de conseil précontractuel générée conformément à l'article L.521-4 du Code des assurances.`
    };

    const updatedLead: Lead = {
      ...lead,
      devoirConseilData: formData,
      ddaData: {
        statut: 'VALIDE',
        besoinsIdentifies: formData.garantiesRecherchees,
        situationClient: formData.syntheseBesoins,
        recommandation: `${formData.contratConseille.formule} (${formData.contratConseille.assureur})`,
        produitConseille: lead.type,
        motifsConseil: formData.justificationConseil,
        dateValidation: timestamp,
        validePar: authorName
      },
      documents: [newDoc, ...(lead.documents || []).filter(d => !d.name.includes('Devoir de conseil'))],
      historyLogs: [newActivity, ...(lead.historyLogs || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateLead(updatedLead);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Helper variables for souscripteur identity & address
  const souscripteurNomComplet = `${lead.civilite ? lead.civilite + ' ' : ''}${lead.nom} ${lead.prenom}`.trim();
  const souscripteurAdresse = lead.adresse || lead.autoDetails?.adresse || lead.habitationDetails?.adresse || lead.vtcDetails?.adresse || 'Adresse conforme dossier client';
  const souscripteurCpVille = `${lead.codePostal || lead.autoDetails?.codePostal || lead.habitationDetails?.codePostal || lead.vtcDetails?.codePostal || ''} ${lead.ville || lead.autoDetails?.ville || lead.habitationDetails?.ville || lead.vtcDetails?.ville || ''}`.trim() || 'France';

  // Helper to determine which formula is chosen/recommended
  const isSolutionRetenue = (sol: { produitFormule: string }, idx: number) => {
    if (formData.formuleChoisieIndex !== undefined) {
      return idx === formData.formuleChoisieIndex;
    }
    if (formData.contratConseille?.formule) {
      const formClean = formData.contratConseille.formule.toLowerCase().trim();
      const solClean = sol.produitFormule.toLowerCase().trim();
      if (formClean && (solClean.includes(formClean) || formClean.includes(solClean))) return true;
    }
    return idx === 2;
  };

  // Helper checkbox renderer for in-modal preview
  const renderCheck = (checked: boolean, label: string) => (
    <span className="inline-flex items-center gap-1.5 mr-3 mb-1 text-[11px] text-slate-800">
      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border border-slate-500 font-mono text-[9px] font-bold ${checked ? 'bg-[#122e4d] text-white border-[#122e4d]' : 'bg-white text-transparent'}`}>
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </span>
  );

  // Field box for in-modal preview
  const renderField = (label: string, value: string | number | undefined | null, widthClass = '') => (
    <div className={`space-y-0.5 ${widthClass}`}>
      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</div>
      <div className="text-[11px] font-semibold text-slate-900 border-b border-dotted border-slate-400 pb-0.5 min-h-[18px]">
        {value !== undefined && value !== null && value !== '' ? value : '—'}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Top Header Controls (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Devoir de Conseil — Assurance {lead.type === 'AUTO' ? 'Automobile' : lead.type === 'HABITATION' ? 'Habitation' : 'VTC'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Modèle Conforme DDA (3 Pages A4)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fiche professionnelle de recueil des besoins et justification du conseil • Réf. {formData.referenceDossier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold mr-1">
              <button
                type="button"
                onClick={() => setViewMode('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'PREVIEW' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu Document</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('EDIT')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'EDIT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Éditer réponses</span>
              </button>
            </div>

            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-400 animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Enregistré !</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveToLead}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Enregistrer et archiver ce devoir de conseil dans le dossier client"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Archiver</span>
            </button>

            {/* Direct Clean Print / PDF button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Imprimer ou enregistrer en PDF propre sans aucune trace du CRM"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>

            {/* Standalone clean tab */}
            <button
              type="button"
              onClick={handleOpenCleanTab}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Ouvrir le document dans un nouvel onglet"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Download HTML */}
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Télécharger le fichier HTML autonome"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200">
          
          {/* ======================================================== */}
          {/* MODE EDIT : Formulaire interactif pour ajuster les réponses */}
          {/* ======================================================== */}
          {viewMode === 'EDIT' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 max-w-4xl mx-auto shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Personnalisation des données du Devoir de Conseil</span>
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  Les modifications seront reportées fidèlement sur le document PDF officiel.
                </span>
              </div>

              {/* Canal & Réf */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Canal de souscription</label>
                  <select
                    value={formData.canal}
                    onChange={(e) => setFormData({ ...formData, canal: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="Tél.">Téléphone (à distance)</option>
                    <option value="Agence">En Agence</option>
                    <option value="Visio">Visioconférence</option>
                    <option value="Web">Web / Espace client</option>
                    <option value="E-mail">Courriel électronique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date du recueil</label>
                  <input
                    type="text"
                    value={formData.dateRecueil}
                    onChange={(e) => setFormData({ ...formData, dateRecueil: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Conseiller référent</label>
                  <input
                    type="text"
                    value={formData.conseillerNom}
                    onChange={(e) => setFormData({ ...formData, conseillerNom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Réf. Dossier</label>
                  <input
                    type="text"
                    value={formData.referenceDossier}
                    onChange={(e) => setFormData({ ...formData, referenceDossier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Synthèse des Besoins */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Synthèse des exigences et besoins du client (rédigée par le conseiller)
                </label>
                <textarea
                  rows={3}
                  value={formData.syntheseBesoins}
                  onChange={(e) => setFormData({ ...formData, syntheseBesoins: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Justification du conseil */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Analyse et Justification du Conseil (Pourquoi ce contrat est-il cohérent ?)
                </label>
                <textarea
                  rows={4}
                  value={formData.justificationConseil}
                  onChange={(e) => setFormData({ ...formData, justificationConseil: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sélection interactive de la formule recommandée & Retenue */}
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h5 className="font-extrabold text-xs text-blue-950 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Formule Choisie & Recommandée (Sélection active)</span>
                  </h5>
                  <span className="text-[11px] text-blue-700 font-semibold">
                    Cliquez sur une formule pour la définir comme formule recommandée
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {formData.solutionsComparees.map((sol, idx) => {
                    const isSelected = isSolutionRetenue(sol, idx);
                    const cleanName = sol.produitFormule.replace(/^Formule \d+\s*:\s*/, '').replace('★ (Retenue)', '').trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            formuleChoisieIndex: idx,
                            contratConseille: {
                              ...formData.contratConseille,
                              formule: cleanName,
                              cotisationMois: sol.prime !== 'Non chiffré' ? (sol.prime.includes('TTC') ? sol.prime : `${sol.prime} TTC`) : formData.contratConseille.cotisationMois,
                              franchises: {
                                ...formData.contratConseille.franchises,
                                dommages: sol.franchise || formData.contratConseille.franchises.dommages
                              }
                            }
                          });
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              Option {idx + 1}
                            </span>
                            {isSelected && (
                              <span className="bg-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                ★ RECOMMANDÉE
                              </span>
                            )}
                          </div>
                          <div className="font-extrabold text-xs mb-1">
                            {cleanName}
                          </div>
                        </div>
                        <div className={`pt-2 border-t mt-2 flex items-center justify-between ${isSelected ? 'border-white/20' : 'border-slate-100'}`}>
                          <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {sol.prime}
                          </span>
                          <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            Franchise : {sol.franchise}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Assureur / Cabinet</label>
                    <input
                      type="text"
                      value={formData.contratConseille.assureur}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: { ...formData.contratConseille, assureur: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Libellé formule retenue</label>
                    <input
                      type="text"
                      value={formData.contratConseille.formule}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: { ...formData.contratConseille, formule: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cotisation retenue TTC</label>
                    <input
                      type="text"
                      value={formData.contratConseille.cotisationMois}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: { ...formData.contratConseille, cotisationMois: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Frais éventuels</label>
                    <input
                      type="text"
                      value={formData.contratConseille.frais}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: { ...formData.contratConseille, frais: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Modification des franchises du contrat conseillé */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Franchises Contractuelles du Contrat Conseillé</span>
                  </h5>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Ajustez librement les montants des franchises appliquées
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Bris de glace</label>
                    <input
                      type="text"
                      value={formData.contratConseille.franchises.brisDeGlace || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: {
                          ...formData.contratConseille,
                          franchises: { ...formData.contratConseille.franchises, brisDeGlace: e.target.value }
                        }
                      })}
                      placeholder="0 € (Sans franchise)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Vol</label>
                    <input
                      type="text"
                      value={formData.contratConseille.franchises.vol || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: {
                          ...formData.contratConseille,
                          franchises: { ...formData.contratConseille.franchises, vol: e.target.value }
                        }
                      })}
                      placeholder="350 €"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Incendie</label>
                    <input
                      type="text"
                      value={formData.contratConseille.franchises.incendie || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: {
                          ...formData.contratConseille,
                          franchises: { ...formData.contratConseille.franchises, incendie: e.target.value }
                        }
                      })}
                      placeholder="350 €"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Dommages matériels</label>
                    <input
                      type="text"
                      value={formData.contratConseille.franchises.dommages || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: {
                          ...formData.contratConseille,
                          franchises: { ...formData.contratConseille.franchises, dommages: e.target.value }
                        }
                      })}
                      placeholder="350 €"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Cat. Naturelles</label>
                    <input
                      type="text"
                      value={formData.contratConseille.franchises.catastrophesNaturelles || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        contratConseille: {
                          ...formData.contratConseille,
                          franchises: { ...formData.contratConseille.franchises, catastrophesNaturelles: e.target.value }
                        }
                      })}
                      placeholder="380 € (Légale)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Modification des 3 formules comparatives (Tarifs & Franchises de chaque formule) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Détail des 3 Formules Comparatives (Tableau DDA)
                  </h5>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Ajustez les cotisations, franchises et observations de chaque solution
                  </span>
                </div>

                <div className="space-y-2.5">
                  {formData.solutionsComparees.map((sol, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Formule {idx + 1}</label>
                        <input
                          type="text"
                          value={sol.produitFormule}
                          onChange={(e) => {
                            const newSols = [...formData.solutionsComparees];
                            newSols[idx] = { ...newSols[idx], produitFormule: e.target.value };
                            setFormData({ ...formData, solutionsComparees: newSols });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cotisation TTC</label>
                        <input
                          type="text"
                          value={sol.prime}
                          onChange={(e) => {
                            const newSols = [...formData.solutionsComparees];
                            newSols[idx] = { ...newSols[idx], prime: e.target.value };
                            setFormData({ ...formData, solutionsComparees: newSols });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">Franchise</label>
                        <input
                          type="text"
                          value={sol.franchise}
                          onChange={(e) => {
                            const newSols = [...formData.solutionsComparees];
                            newSols[idx] = { ...newSols[idx], franchise: e.target.value };
                            setFormData({ ...formData, solutionsComparees: newSols });
                          }}
                          className="w-full px-2.5 py-1.5 bg-blue-50/70 border border-blue-300 rounded-lg text-xs font-bold text-blue-900"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Observations</label>
                        <input
                          type="text"
                          value={sol.observations}
                          onChange={(e) => {
                            const newSols = [...formData.solutionsComparees];
                            newSols[idx] = { ...newSols[idx], observations: e.target.value };
                            setFormData({ ...formData, solutionsComparees: newSols });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10. Modification des Garanties Proposées et Non Retenues (Arbitrage client) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      <span>10. Garanties Proposées et Non Retenues (Arbitrage Client — DDA)</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Renseignez les options ou garanties écartées par le client et les motifs de son choix (traçabilité DDA).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newGnr = [
                          ...(formData.garantiesNonRetenues || []),
                          {
                            garantie: 'Nouvelle garantie ou option',
                            proposee: true,
                            retenue: false,
                            motif: 'Non souhaitée par le client par arbitrage budgétaire.'
                          }
                        ];
                        setFormData({ ...formData, garantiesNonRetenues: newGnr });
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une garantie</span>
                    </button>
                  </div>
                </div>

                {/* Suggestions rapides selon le type de contrat */}
                <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200/80">
                  <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Suggestions rapides à ajouter en 1 clic :</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.type === 'AUTO'
                      ? [
                          'Option Valeur à Neuf (36 ou 48 mois)',
                          'Garantie Conducteur 1 000 000 €',
                          'Contenu et Effets Personnels dans le véhicule',
                          'Véhicule de Remplacement Confort (catégorie équivalente)',
                          'Protection Juridique Automobile Étendue'
                        ]
                      : lead.type === 'HABITATION'
                      ? [
                          'Rééquipement à Neuf Objets Précieux > 15 000 €',
                          'Piscine, Spa et Dépendances Extérieures',
                          'Dommages Électriques étendus aux appareils électroménagers',
                          'Protection Juridique Vie Privée Étendue',
                          'Dépannage serrurerie et plomberie d\'urgence 24h/24'
                        ]
                      : [
                          'Perte de Chiffre d\'Affaires / Arrêt d\'activité VTC',
                          'Véhicule Relais VTC Premium Luxe Catégorie E',
                          'Bris de Glace étendu aux optiques LED & toit vitré',
                          'Protection Juridique VTC Litiges Plateformes et Agréments'
                        ]
                    ).map((suggestion, sIdx) => {
                      const alreadyExists = formData.garantiesNonRetenues?.some(
                        g => g.garantie.toLowerCase() === suggestion.toLowerCase()
                      );
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          disabled={alreadyExists}
                          onClick={() => {
                            const newGnr = [
                              ...(formData.garantiesNonRetenues || []),
                              {
                                garantie: suggestion,
                                proposee: true,
                                retenue: false,
                                motif: 'Non souhaitée par le client par arbitrage budgétaire.'
                              }
                            ];
                            setFormData({ ...formData, garantiesNonRetenues: newGnr });
                          }}
                          className={`text-[10px] px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                            alreadyExists
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200'
                          }`}
                        >
                          + {suggestion}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Liste des garanties éditables */}
                <div className="space-y-3">
                  {(!formData.garantiesNonRetenues || formData.garantiesNonRetenues.length === 0) ? (
                    <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                      Aucune garantie non retenue n'est actuellement saisie. Cliquez sur "Ajouter une garantie" ou une suggestion pour en ajouter.
                    </div>
                  ) : (
                    formData.garantiesNonRetenues.map((gnr, idx) => {
                      const motifSuggestions = [
                        'Non souhaitée par le client par arbitrage budgétaire.',
                        'Couverture jugée non indispensable par le souscripteur.',
                        'Doublon avec une autre assurance déjà détenue par le client.',
                        'Non applicable au profil ou à la configuration du risque.',
                        'Couverture de base incluse au contrat jugée suffisante.'
                      ];

                      return (
                        <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                Option #{idx + 1}
                              </span>
                              <span className="text-xs font-extrabold text-slate-800">
                                {gnr.garantie || 'Garantie à spécifier'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newGnr = formData.garantiesNonRetenues.filter((_, i) => i !== idx);
                                setFormData({ ...formData, garantiesNonRetenues: newGnr });
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                              title="Supprimer cette ligne"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                            {/* Nom de la garantie */}
                            <div className="sm:col-span-6">
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                Intitulé de la Garantie / Option
                              </label>
                              <input
                                type="text"
                                value={gnr.garantie}
                                onChange={(e) => {
                                  const newGnr = [...formData.garantiesNonRetenues];
                                  newGnr[idx] = { ...newGnr[idx], garantie: e.target.value };
                                  setFormData({ ...formData, garantiesNonRetenues: newGnr });
                                }}
                                placeholder="Ex: Option Valeur à Neuf 36 mois"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500"
                              />
                            </div>

                            {/* Statut Proposée ? */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                Proposée au client ?
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGnr = [...formData.garantiesNonRetenues];
                                    newGnr[idx] = { ...newGnr[idx], proposee: true };
                                    setFormData({ ...formData, garantiesNonRetenues: newGnr });
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                    gnr.proposee
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Oui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGnr = [...formData.garantiesNonRetenues];
                                    newGnr[idx] = { ...newGnr[idx], proposee: false };
                                    setFormData({ ...formData, garantiesNonRetenues: newGnr });
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                    !gnr.proposee
                                      ? 'bg-slate-700 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Non
                                </button>
                              </div>
                            </div>

                            {/* Statut Retenue ? */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                Retenue par le client ?
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGnr = [...formData.garantiesNonRetenues];
                                    newGnr[idx] = { ...newGnr[idx], retenue: false };
                                    setFormData({ ...formData, garantiesNonRetenues: newGnr });
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                    !gnr.retenue
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Non (Écartée)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGnr = [...formData.garantiesNonRetenues];
                                    newGnr[idx] = { ...newGnr[idx], retenue: true };
                                    setFormData({ ...formData, garantiesNonRetenues: newGnr });
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                    gnr.retenue
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Oui
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Motif de non-rétention */}
                          <div className="pt-1">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Motif de refus / d'arbitrage par le souscripteur
                            </label>
                            <input
                              type="text"
                              value={gnr.motif}
                              onChange={(e) => {
                                const newGnr = [...formData.garantiesNonRetenues];
                                newGnr[idx] = { ...newGnr[idx], motif: e.target.value };
                                setFormData({ ...formData, garantiesNonRetenues: newGnr });
                              }}
                              placeholder="Ex: Non souhaitée par le client par arbitrage budgétaire."
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                            />
                            {/* Suggestions 1-clic de motifs */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] text-slate-400 font-semibold">Motifs rapides :</span>
                              {motifSuggestions.map((mSug, mIdx) => (
                                <button
                                  key={mIdx}
                                  type="button"
                                  onClick={() => {
                                    const newGnr = [...formData.garantiesNonRetenues];
                                    newGnr[idx] = { ...newGnr[idx], motif: mSug };
                                    setFormData({ ...formData, garantiesNonRetenues: newGnr });
                                  }}
                                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition cursor-pointer"
                                >
                                  {mSug.replace(' par le souscripteur', '').replace(' par le client', '')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bouton retour aperçu */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('PREVIEW')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir le document officiel (PDF)</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE PREVIEW : Structure en 3 Pages A4 distinctes       */}
          {/* ======================================================== */}
          {viewMode === 'PREVIEW' && (
            <div id="printable-devoir-conseil" className="max-w-4xl mx-auto space-y-8 font-sans text-slate-900">

              {/* ------------------------------------------------------------------------- */}
              {/* PAGE 1 A4 : EN-TÊTE, SOUSCRIPTEUR, RISQUE & ANTÉCÉDENTS                   */}
              {/* ------------------------------------------------------------------------- */}
              <div className="print-page bg-white p-8 rounded-sm shadow-md border border-slate-300 space-y-4">
                
                {/* EN-TÊTE PAGE 1 : LOGO CABINET À GAUCHE / INFOS SOUSCRIPTEUR À DROITE */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-3 border-b-2 border-[#122e4d]">
                  {/* À GAUCHE : LOGO & COORDONNÉES DU CABINET */}
                  <div className="flex-1 min-w-0">
                    {cabinetInfo.logoUrl ? (
                      <div className="mb-2">
                        <img
                          src={cabinetInfo.logoUrl}
                          alt={cabinetInfo.nomCabinet}
                          className="h-16 sm:h-20 max-w-[270px] object-contain block"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-11 h-11 rounded-lg bg-[#122e4d] text-white flex items-center justify-center font-black text-base">
                          {(cabinetInfo.nomCabinet || 'AC').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-base text-[#122e4d] leading-tight">
                            {cabinetInfo.nomCabinet || 'Cabinet de Courtage'}
                          </div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Courtage en Assurances
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <div className="font-bold text-slate-900 text-xs">{cabinetInfo.nomCabinet}</div>
                      <div className="text-[11px] text-slate-600">
                        {cabinetInfo.adresse ? cabinetInfo.adresse + ' — ' : ''}{cabinetInfo.codePostal || ''} {cabinetInfo.ville || ''}
                      </div>
                      {((cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim()) || cabinetInfo.siret) && (
                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2 mt-0.5">
                          {cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() && (
                            <span>ORIAS N° <strong className="text-slate-800">{cabinetInfo.numeroOrias.trim()}</strong></span>
                          )}
                          {cabinetInfo.siret && <span>• SIRET : {cabinetInfo.siret}</span>}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                        {cabinetInfo.telephone && <span>Tél : <strong className="text-slate-800">{cabinetInfo.telephone}</strong></span>}
                        {cabinetInfo.emailContact && <span>• Courriel : {cabinetInfo.emailContact}</span>}
                      </div>
                    </div>
                  </div>

                  {/* À DROITE : INFOS DU SOUSCRIPTEUR */}
                  <div className="w-full sm:w-72 bg-slate-50 border border-slate-300 rounded-lg p-3 border-l-4 border-l-[#122e4d] shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">
                        SOUSCRIPTEUR / ASSURÉ
                      </span>
                      <span className="font-mono text-[9px] font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">
                        Réf. {formData.referenceDossier}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 leading-snug">
                      {souscripteurNomComplet}
                      {lead.type === 'VTC' && lead.vtcDetails?.nomSociete && (
                        <div className="text-xs font-semibold text-slate-600">{lead.vtcDetails.nomSociete}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-700 mt-1 space-y-0.5">
                      <div>{souscripteurAdresse}</div>
                      <div className="font-bold text-slate-900">{souscripteurCpVille}</div>
                      <div className="pt-1 mt-1 border-t border-dotted border-slate-300 text-[10px] text-slate-500 space-y-0.5">
                        {lead.telephone && (
                          <div>Tél : <strong className="text-slate-800">{lead.telephone}</strong></div>
                        )}
                        {lead.email && (
                          <div>Email : <strong className="text-slate-800">{lead.email}</strong></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Titre officiel */}
                <div className="text-center pb-1">
                  <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    DEVOIR DE CONSEIL — ASSURANCE {lead.type === 'AUTO' ? 'AUTOMOBILE' : lead.type === 'HABITATION' ? 'HABITATION' : 'VTC'}
                  </h1>
                  <p className="text-[11px] text-slate-600 italic">
                    Fiche professionnelle de recueil des besoins, exigences et justification du conseil • Conforme directive DDA (Art. L.521-4 Code des assurances)
                  </p>
                </div>

                {/* Table Header Matrix */}
                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 font-medium w-1/4">
                        <span className="font-bold text-[9px] text-slate-500 block uppercase">Date de l'entretien</span>
                        <span className="font-bold">{formData.dateRecueil}</span>
                      </td>
                      <td className="border border-slate-400 p-2 font-medium w-1/4">
                        <span className="font-bold text-[9px] text-slate-500 block uppercase">Conseiller référent</span>
                        <span className="font-bold text-slate-900">{formData.conseillerNom}</span>
                      </td>
                      <td className="border border-slate-400 p-2 font-medium w-1/4">
                        <span className="font-bold text-[9px] text-slate-500 block uppercase mb-1">Canal de distribution</span>
                        <div className="flex flex-wrap gap-x-2 text-[10px]">
                          {renderCheck(formData.canal === 'Tél.', 'Tél.')}
                          {renderCheck(formData.canal === 'Agence', 'Agence')}
                          {renderCheck(formData.canal === 'Visio', 'Visio')}
                          {renderCheck(formData.canal === 'Web', 'Web')}
                        </div>
                      </td>
                      <td className="border border-slate-400 p-2 font-medium w-1/4">
                        <span className="font-bold text-[9px] text-slate-500 block uppercase">Cadre réglementaire</span>
                        <span className="font-bold text-[#122e4d]">DDA-FR-2026</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 1. Situation du souscripteur */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    1. SITUATION DU SOUSCRIPTEUR {lead.type === 'VTC' ? '/ EXPLOITANT VTC' : lead.type === 'HABITATION' ? '/ OCCUPANT' : ''}
                  </div>
                  <div className="border border-t-0 border-slate-300 p-3 space-y-2.5 bg-white rounded-b">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {renderField('Date de naissance', lead.autoDetails?.dateNaissance || lead.habitationDetails?.dateNaissance || lead.vtcDetails?.dateNaissance || '01/01/1985')}
                      {renderField('Profession / Activité', lead.autoDetails?.profession || lead.habitationDetails?.profession || (lead.type === 'VTC' ? 'Chauffeur VTC Indépendant' : 'Salarié'))}
                      {renderField('Situation familiale', lead.autoDetails?.situationFamiliale || lead.habitationDetails?.situationFamiliale || 'Célibataire / Non précisé')}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-[9px] text-slate-500 uppercase mr-1">Statut juridique :</span>
                      {renderCheck(lead.type !== 'VTC', 'Particulier')}
                      {renderCheck(lead.type === 'VTC', 'Professionnel Indépendant / Micro-entreprise')}
                      {renderCheck(false, 'Société commerciale (SASU / SARL / SAS)')}
                    </div>
                  </div>
                </div>

                {/* 2. Caractéristiques du risque */}
                {lead.type === 'AUTO' && (
                  <div>
                    <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                      2. CARACTÉRISTIQUES DU VÉHICULE À ASSURER
                    </div>
                    <div className="border border-t-0 border-slate-300 p-3 space-y-2.5 bg-white rounded-b">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {renderField('Immatriculation', lead.autoDetails?.immatriculation || 'AA-123-BB')}
                        {renderField('Marque / Modèle', lead.autoDetails?.marqueModele || 'Renault Clio V')}
                        {renderField('Version / Finition', lead.autoDetails?.version || 'Finition standard')}
                        {renderField('1ère mise en circulation', lead.autoDetails?.dateMiseEnCirculation || '15/06/2021')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {renderField('Puissance fiscale', lead.autoDetails?.puissanceFiscale ? `${lead.autoDetails.puissanceFiscale} CV` : '5 CV')}
                        {renderField('Énergie / Motorisation', lead.autoDetails?.energie || 'Essence')}
                        {renderField('Valeur estimée / Achat', lead.autoDetails?.valeurEstimee ? `${lead.autoDetails.valeurEstimee.toLocaleString('fr-FR')} €` : '14 500 €')}
                        {renderField('Propriétaire (Carte grise)', lead.autoDetails?.proprietaireVehicule || 'Conducteur principal')}
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-bold text-[9px] text-slate-500 uppercase block mr-1">Statut du véhicule :</span>
                        {renderCheck(lead.autoDetails?.statutVehicule === 'Neuf', 'Neuf')}
                        {renderCheck(!lead.autoDetails?.statutVehicule || lead.autoDetails?.statutVehicule === 'Occasion', 'Occasion')}
                        {renderCheck(lead.autoDetails?.statutVehicule === 'LOA' || lead.autoDetails?.proprietaireVehicule?.includes('LOA') || false, 'LOA')}
                        {renderCheck(lead.autoDetails?.statutVehicule === 'LLD' || lead.autoDetails?.proprietaireVehicule?.includes('LLD') || false, 'LLD')}
                        {renderCheck(lead.autoDetails?.statutVehicule === 'Crédit', 'Achat à crédit')}
                        {renderCheck(lead.autoDetails?.statutVehicule === 'Comptant', 'Achat comptant')}
                      </div>
                    </div>
                  </div>
                )}

                {lead.type === 'VTC' && (
                  <div>
                    <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                      2. CARACTÉRISTIQUES DE L'ACTIVITÉ VTC & DU VÉHICULE
                    </div>
                    <div className="border border-t-0 border-slate-300 p-3 space-y-2.5 bg-white rounded-b">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {renderField('N° SIREN / SIRET', lead.vtcDetails?.siret || '892 123 456 00012')}
                        {renderField('N° Carte VTC Professionnelle', lead.vtcDetails?.numeroCarteVtc || 'VTC-75-2023-098')}
                        {renderField('Zone d\'activité', formData.zonePrincipaleActivite)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {renderField('Immatriculation VTC', lead.vtcDetails?.immatriculation || 'FK-890-WX')}
                        {renderField('Marque & Modèle', lead.vtcDetails?.marqueModele || 'Toyota Camry Hybride')}
                        {renderField('Version / Finition', lead.vtcDetails?.version || 'Finition Business Pro')}
                        {renderField('1ère mise en circulation', lead.vtcDetails?.anneeVehicule || '2023')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {renderField('Puissance fiscale', lead.vtcDetails?.puissanceFiscale ? `${lead.vtcDetails.puissanceFiscale} CV` : '7 CV')}
                        {renderField('Motorisation / Énergie', lead.vtcDetails?.typeMotorisation || 'Hybride')}
                        {renderField('Valeur vénale / Achat', lead.vtcDetails?.valeurEstimee ? `${lead.vtcDetails.valeurEstimee.toLocaleString('fr-FR')} €` : '38 000 €')}
                        {renderField('Propriétaire / Financement', lead.vtcDetails?.proprietaireVehicule || 'LOA')}
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-xs flex flex-wrap gap-x-3 gap-y-1">
                        <span className="font-bold text-[9px] text-slate-500 uppercase mr-1">Plateformes & Usage :</span>
                        {renderCheck(true, 'Transport onéreux (VTC)')}
                        {renderCheck(true, 'Usage personnel en complément')}
                        {renderCheck(lead.vtcDetails?.kilometrageAnnuel === 'Kilométrage illimité' || true, 'Kilométrage illimité')}
                      </div>
                    </div>
                  </div>
                )}

                {lead.type === 'HABITATION' && (
                  <div>
                    <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                      2. CARACTÉRISTIQUES DU LOGEMENT À ASSURER
                    </div>
                    <div className="border border-t-0 border-slate-300 p-3 space-y-2.5 bg-white rounded-b">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {renderField('Type de logement', lead.habitationDetails?.typeLogement || 'Appartement')}
                        {renderField('Surface habitable', `${lead.habitationDetails?.surfaceM2 || 65} m²`)}
                        {renderField('Nombre de pièces principales', `${lead.habitationDetails?.nombrePieces || 3} pièces`)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {renderField('Étage', lead.habitationDetails?.etage ? `Étage ${lead.habitationDetails.etage}` : '2ème étage')}
                        {renderField('Statut d\'occupation', lead.habitationDetails?.qualiteSouscripteur || 'Locataire')}
                        {renderField('Capital mobilier estimé', formData.capitalMobilierSouhaite)}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Conducteur & Antécédents */}
                {lead.type === 'AUTO' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                        3. UTILISATION DU VÉHICULE
                      </div>
                      <div className="border border-t-0 border-slate-300 p-3 space-y-2 bg-white rounded-b text-xs">
                        {renderCheck(lead.autoDetails?.typeUtilisation === 'Trajet privé', 'Privé / Loisirs')}
                        {renderCheck(lead.autoDetails?.typeUtilisation?.includes('travail') || true, 'Domicile-travail')}
                        {renderCheck(lead.autoDetails?.typeUtilisation?.includes('Commercial') || false, 'Déplacements pro')}
                        <div className="pt-2 border-t border-slate-200">
                          <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Kilométrage annuel</span>
                          {renderCheck(lead.autoDetails?.kilometrageAnnuel === '< 10 000', '< 10 000 km')}
                          {renderCheck(!lead.autoDetails?.kilometrageAnnuel || lead.autoDetails?.kilometrageAnnuel === '15 000–20 000' || lead.autoDetails?.kilometrageAnnuel === '10 000–15 000', '10 000 à 20 000 km')}
                          {renderCheck(lead.autoDetails?.kilometrageAnnuel === '> 20 000', '> 20 000 km')}
                          {renderCheck(lead.autoDetails?.kilometrageAnnuel === 'Kilométrage illimité', 'Kilométrage illimité')}
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Stationnement habituel de nuit</span>
                          <span className="font-semibold text-slate-800">{lead.autoDetails?.stationnementNuit || 'Parking privé / Garage fermé'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                        4. CONDUCTEUR PRINCIPAL & ANTÉCÉDENTS
                      </div>
                      <div className="border border-t-0 border-slate-300 p-3 space-y-2 bg-white rounded-b">
                        {renderField('Conducteur principal', `${lead.prenom} ${lead.nom}`)}
                        {renderField('Permis de conduire depuis', lead.autoDetails?.datePermis || '12/04/2010')}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                          {renderField('Coefficient CRM (Bonus)', lead.autoDetails?.bonusMalus ? `${lead.autoDetails.bonusMalus}` : '0.50 (50% bonus)')}
                          {renderField('Sinistres (36 mois)', lead.autoDetails?.aEuDesSinistres ? `${lead.autoDetails.sinistres?.length || 1} déclaré(s)` : '0 (Aucun)')}
                        </div>
                        {renderField('Dernier assureur connu', lead.autoDetails?.nomDerniereCompagnie || 'Assureur Direct France')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Page 1 */}
                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Devoir de conseil — Assurance {lead.type === 'AUTO' ? 'automobile' : lead.type === 'HABITATION' ? 'habitation' : 'VTC'} | Réf. {formData.referenceDossier}</span>
                  <span className="font-bold font-mono">Page 1 / 3</span>
                </div>
              </div>

              {/* ------------------------------------------------------------------------- */}
              {/* PAGE 2 A4 : BESOINS, SYNTHÈSE & ÉTUDE COMPARATIVE DES 3 FORMULES          */}
              {/* ------------------------------------------------------------------------- */}
              <div className="print-page bg-white p-8 rounded-sm shadow-md border border-slate-300 space-y-4">
                
                {/* En-tête courant Page 2 */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#122e4d] text-xs">
                  <div className="flex items-center gap-2">
                    {cabinetInfo.logoUrl ? (
                      <img
                        src={cabinetInfo.logoUrl}
                        alt={cabinetInfo.nomCabinet}
                        className="h-6 max-w-[110px] object-contain"
                      />
                    ) : (
                      <span className="px-1.5 py-0.5 bg-[#122e4d] text-white font-black text-[9px] rounded">
                        {(cabinetInfo.nomCabinet || 'AC').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <span className="font-extrabold text-[#122e4d] text-xs">{cabinetInfo.nomCabinet}</span>
                      {cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? (
                        <span className="text-[10px] text-slate-500 ml-2">ORIAS N° {cabinetInfo.numeroOrias.trim()}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-600">
                    <div>Souscripteur : <strong className="text-slate-900">{souscripteurNomComplet}</strong> • Réf. <span className="font-mono font-bold">{formData.referenceDossier}</span></div>
                    <div className="text-[9px] text-slate-500">{souscripteurAdresse}, {souscripteurCpVille}</div>
                  </div>
                </div>

                {/* 5. Recueil des exigences & budget */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    5. RECUEIL DES EXIGENCES, BESOINS ET BUDGET DU SOUSCRIPTEUR
                  </div>
                  <div className="border border-t-0 border-slate-300 p-3.5 space-y-3 bg-white rounded-b">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {renderField('Budget souhaité / mois', formData.budgetSouhaiteMois)}
                      {renderField('Budget souhaité / an', formData.budgetSouhaiteAn)}
                      {renderField('Franchise maximale tolérée', formData.franchiseMaxSouhaitee)}
                    </div>
                    <div className="text-xs pt-1">
                      <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Garanties & Priorités indispensables exprimées par le client :</span>
                      <div className="flex flex-wrap gap-2">
                        {formData.garantiesRecherchees.map((g, i) => (
                          <span key={i} className="inline-block">{renderCheck(true, g)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Synthèse des exigences */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    6. SYNTHÈSE DES EXIGENCES ET BESOINS FORMULÉS
                  </div>
                  <div className="border border-t-0 border-slate-300 p-3.5 bg-slate-50 rounded-b text-xs leading-relaxed text-slate-800 italic border-l-4 border-l-[#122e4d]">
                    « {formData.syntheseBesoins} »
                  </div>
                </div>

                {/* 7. ÉTUDE COMPARATIVE DES 3 SOLUTIONS */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    7. ÉTUDE COMPARATIVE DES 3 SOLUTIONS & DEVOIR DE CONSEIL
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs rounded-b">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold text-left">
                      <tr>
                        <th className="border border-slate-300 p-2.5 w-1/4">Formule Chiffrée</th>
                        <th className="border border-slate-300 p-2.5 w-1/4">Cotisation TTC</th>
                        <th className="border border-slate-300 p-2.5 w-1/6">Franchise</th>
                        <th className="border border-slate-300 p-2.5 w-1/3">Observations & Adéquation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {formData.solutionsComparees.map((sol, idx) => {
                        const isRetenue = isSolutionRetenue(sol, idx);
                        const cleanTitle = sol.produitFormule.replace('★ (Retenue)', '').trim();
                        return (
                          <tr key={idx} className={isRetenue ? 'bg-blue-50/70 font-semibold' : ''}>
                            <td className="border border-slate-300 p-2.5 font-bold text-slate-900">
                              <span className={isRetenue ? 'text-blue-900 font-extrabold' : ''}>
                                {isRetenue && <span className="text-amber-500 mr-1 font-bold">★</span>}
                                {cleanTitle}
                              </span>
                              {isRetenue && (
                                <div className="text-[9px] font-extrabold text-emerald-700 mt-0.5">
                                  ✔ FORMULE CHOISIE ET CONSEILLÉE
                                </div>
                              )}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-mono text-sm font-bold text-slate-900">{sol.prime}</td>
                            <td className={`border border-slate-300 p-2.5 ${isRetenue ? 'font-bold text-blue-900' : ''}`}>{sol.franchise}</td>
                            <td className="border border-slate-300 p-2.5 text-[11px] text-slate-600">{sol.observations}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 8. CONTRAT CONSEILLÉ DÉTAILLÉ */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    8. CARACTÉRISTIQUES DÉTAILLÉES DU CONTRAT CONSEILLÉ
                  </div>
                  <div className="border border-t-0 border-slate-300 p-3.5 space-y-3 bg-white rounded-b">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {renderField('Assureur / Cabinet', formData.contratConseille.assureur)}
                      {renderField('Produit sélectionné', formData.contratConseille.produit)}
                      {renderField('Formule Préconisée', formData.contratConseille.formule)}
                      {renderField('Cotisation TTC', `${formData.contratConseille.cotisationMois} (${formData.contratConseille.cotisationAn})`)}
                    </div>
                    <div className="pt-2 border-t border-slate-200 text-xs">
                      <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Franchises Principales Applicables</span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                        <div>Bris de glace : <strong>{formData.contratConseille.franchises.brisDeGlace || '0 €'}</strong></div>
                        <div>Vol : <strong>{formData.contratConseille.franchises.vol || '350 €'}</strong></div>
                        <div>Incendie : <strong>{formData.contratConseille.franchises.incendie || '350 €'}</strong></div>
                        <div>Dommages : <strong>{formData.contratConseille.franchises.dommages || '350 €'}</strong></div>
                        <div>Cat. Naturelles : <strong>{formData.contratConseille.franchises.catastrophesNaturelles || '380 € (Légale)'}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Page 2 */}
                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Devoir de conseil — Assurance {lead.type === 'AUTO' ? 'automobile' : lead.type === 'HABITATION' ? 'habitation' : 'VTC'} | Réf. {formData.referenceDossier}</span>
                  <span className="font-bold font-mono">Page 2 / 3</span>
                </div>
              </div>

              {/* ------------------------------------------------------------------------- */}
              {/* PAGE 3 A4 : JUSTIFICATION, DDA, EXCLUSIONS & DOUBLE VALIDATION / SIGNATURE */}
              {/* ------------------------------------------------------------------------- */}
              <div className="print-page bg-white p-8 rounded-sm shadow-md border border-slate-300 space-y-4">
                
                {/* En-tête courant Page 3 */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#122e4d] text-xs">
                  <div className="flex items-center gap-2">
                    {cabinetInfo.logoUrl ? (
                      <img
                        src={cabinetInfo.logoUrl}
                        alt={cabinetInfo.nomCabinet}
                        className="h-6 max-w-[110px] object-contain"
                      />
                    ) : (
                      <span className="px-1.5 py-0.5 bg-[#122e4d] text-white font-black text-[9px] rounded">
                        {(cabinetInfo.nomCabinet || 'AC').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <span className="font-extrabold text-[#122e4d] text-xs">{cabinetInfo.nomCabinet}</span>
                      {cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? (
                        <span className="text-[10px] text-slate-500 ml-2">ORIAS N° {cabinetInfo.numeroOrias.trim()}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-600">
                    <div>Souscripteur : <strong className="text-slate-900">{souscripteurNomComplet}</strong> • Réf. <span className="font-mono font-bold">{formData.referenceDossier}</span></div>
                    <div className="text-[9px] text-slate-500">{souscripteurAdresse}, {souscripteurCpVille}</div>
                  </div>
                </div>

                {/* 9. Analyse & justification */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    9. ANALYSE ET JUSTIFICATION DU CONSEIL
                  </div>
                  <div className="border border-t-0 border-slate-300 p-3.5 space-y-2 bg-white rounded-b text-xs">
                    <p className="font-bold text-slate-900">Pourquoi le contrat proposé est-il cohérent avec les besoins et exigences du client ?</p>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded leading-relaxed text-slate-800">
                      {formData.justificationConseil}
                    </div>
                    <div className="pt-1">
                      <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Points techniques majeurs justifiant cette proposition :</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {formData.pointsSpecifiquesMotivants.map((pt, i) => (
                          <span key={i}>{renderCheck(true, pt)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 10. Garanties non retenues */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t flex items-center justify-between">
                    <span>10. GARANTIES PROPOSÉES ET NON RETENUES (ARBITRAGE CLIENT)</span>
                    <button
                      type="button"
                      onClick={() => setViewMode('EDIT')}
                      className="inline-flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/30 text-white font-semibold px-2 py-0.5 rounded transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs rounded-b">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold text-left">
                      <tr>
                        <th className="border border-slate-300 p-2 w-1/3">Garantie / Option examinée</th>
                        <th className="border border-slate-300 p-2 text-center w-20">Proposée ?</th>
                        <th className="border border-slate-300 p-2 text-center w-20">Retenue ?</th>
                        <th className="border border-slate-300 p-2">Motif du refus / non-rétention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {formData.garantiesNonRetenues.map((gnr, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-2 font-medium text-slate-900">{gnr.garantie}</td>
                          <td className="border border-slate-300 p-2 text-center">{gnr.proposee ? 'Oui' : 'Non'}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-rose-700">{gnr.retenue ? 'Oui' : 'Non'}</td>
                          <td className="border border-slate-300 p-2 text-slate-600 italic text-[11px]">{gnr.motif}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 11. Exclusions & documents remis */}
                <div>
                  <div className="bg-[#122e4d] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide rounded-t">
                    11. PRINCIPALES EXCLUSIONS ET DOCUMENTS REMIS
                  </div>
                  <div className="border border-t-0 border-slate-300 p-3 space-y-2 bg-white rounded-b text-xs">
                    <p className="font-bold text-[11px] text-slate-900">
                      Le conseiller a attiré l'attention du souscripteur sur les principales exclusions de garanties :
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5 text-[10px] text-slate-700">
                      {formData.exclusionsExpliquees.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Documents obligatoires remis ou consultables :</span>
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {formData.documentsRemis.map((doc, i) => (
                          <span key={i}>{renderCheck(true, doc)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 12. Double Validation & Signature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Validation Client */}
                  <div className="border border-slate-400 rounded p-3 space-y-2 bg-slate-50/50">
                    <div className="font-bold text-xs text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-1">
                      POUR LE SOUSCRIPTEUR (ASSURÉ)
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Je certifie avoir communiqué des informations sincères pour l'analyse de mes besoins. Je reconnais avoir reçu et pris connaissance des informations relatives au produit conseillé, des garanties, franchises, exclusions et documents IPID avant toute souscription.
                    </p>
                    <div className="pt-1 space-y-1 text-xs">
                      <div>Nom : <strong>{lead.nom} {lead.prenom}</strong></div>
                      <div>Date : <strong>{formData.dateRecueil}</strong></div>
                      <div className="pt-1">
                        <span className="text-[9px] font-bold text-slate-600 block mb-1">
                          Signature du client (précédée de « Lu et approuvé ») :
                        </span>
                        <div className="h-16 border border-dashed border-slate-400 bg-white rounded flex items-center justify-center p-2 text-center text-xs font-serif italic text-blue-900">
                          {lead.signatureData?.statut === 'SIGNE' ? (
                            <div>
                              <div>« Lu et approuvé »</div>
                              <div className="font-sans font-bold text-emerald-700 text-[10px] mt-0.5">
                                Signé numériquement le {lead.signatureData.dateSignature}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-sans text-[10px]">
                              Signature manuscrite ou électronique
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Validation Conseiller */}
                  <div className="border border-slate-400 rounded p-3 space-y-2 bg-slate-50/50">
                    <div className="font-bold text-xs text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-1">
                      POUR LE CABINET DE COURTAGE
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Le conseiller certifie avoir recueilli l'ensemble des exigences et besoins du client conformément à la directive DDA (Directive sur la Distribution d'Assurances) et formulé un conseil loyal, impartial et adapté à sa situation.
                    </p>
                    <div className="pt-1 space-y-1 text-xs">
                      <div>Conseiller : <strong>{formData.conseillerNom}</strong></div>
                      <div>Date : <strong>{formData.dateRecueil}</strong></div>
                      <div className="pt-1">
                        <span className="text-[9px] font-bold text-slate-600 block mb-1">
                          Signature et visa professionnel du cabinet :
                        </span>
                        <div className="h-16 border border-dashed border-slate-400 bg-white rounded flex flex-col items-center justify-center p-2 text-center">
                          <span className="font-bold text-blue-950 text-xs">{cabinetInfo.nomCabinet}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            Visa Conformité DDA{cabinetInfo.numeroOrias && cabinetInfo.numeroOrias.trim() ? ` • ORIAS ${cabinetInfo.numeroOrias.trim()}` : ''}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold mt-0.5">Certifié conforme le {formData.dateRecueil}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Note légale traçabilité */}
                <div className="p-2.5 bg-slate-50 rounded border border-slate-300 text-[9.5px] text-slate-600 leading-normal">
                  <strong>NOTE DE CONFORMITÉ 2026 :</strong> Ce document constitue le support officiel de recueil des exigences et de formalisation du devoir de conseil requis par les articles L.521-4 et suivants du Code des assurances (transposition de la Directive sur la Distribution d'Assurances - DDA). Archivé électroniquement sous la référence {formData.referenceDossier}.
                </div>

                {/* Final Footer Page 3 */}
                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Devoir de conseil — Assurance {lead.type === 'AUTO' ? 'automobile' : lead.type === 'HABITATION' ? 'habitation' : 'VTC'} | Réf. {formData.referenceDossier}</span>
                  <span className="font-bold font-mono">Page 3 / 3 — Fin du document</span>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
