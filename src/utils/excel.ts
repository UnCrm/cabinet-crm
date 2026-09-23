import * as XLSX from 'xlsx';
import { Lead, LeadType, LeadStatus, LeadQualification } from '../types/crm';
import { generateQuoteReference } from './storage';

export const exportLeadsToExcel = (leads: Lead[], filename = 'export_leads_assurance.xlsx') => {
  const exportData = leads.map((lead) => {
    let details = '';
    let immat = '';
    let marqueModele = '';
    let formule = '';
    let cotisation = 0;

    if (lead.type === 'AUTO' && lead.autoDetails) {
      immat = lead.autoDetails.immatriculation;
      marqueModele = lead.autoDetails.marqueModele || '';
      formule = lead.autoDetails.formuleSouhaitee;
      cotisation = lead.autoDetails.cotisationMontant;
      details = `Auto - Bonus: ${lead.autoDetails.bonusMalus} - Frac: ${lead.autoDetails.fractionnement}`;
    } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
      immat = 'N/A';
      formule = lead.habitationDetails.formuleSouhaitee;
      cotisation = lead.habitationDetails.cotisationMontant;
      details = `Logement ${lead.habitationDetails.typeLogement} ${lead.habitationDetails.surfaceM2}m² - ${lead.habitationDetails.statutOccupant}`;
    } else if (lead.type === 'VTC' && lead.vtcDetails) {
      immat = lead.vtcDetails.immatriculation;
      marqueModele = lead.vtcDetails.marqueModele;
      formule = lead.vtcDetails.formuleSouhaitee;
      cotisation = lead.vtcDetails.cotisationMontant;
      details = `VTC - Société: ${lead.vtcDetails.nomSociete} - Carte VTC: ${lead.vtcDetails.numeroCarteVtc}`;
    }

    return {
      'Réf Devis': lead.referenceDevis,
      'Type Produit': lead.type,
      'Statut': lead.status,
      'Qualification': lead.qualification,
      'Nom': lead.nom,
      'Prénom': lead.prenom,
      'Téléphone': lead.telephone,
      'Email': lead.email,
      'Ville': lead.ville,
      'Code Postal': lead.codePostal,
      'Immatriculation': immat,
      'Marque / Modèle': marqueModele,
      'Formule': formule,
      'Cotisation An (€)': cotisation,
      'Prochaine Action': lead.prochaineActionIntitule || '',
      'Date Prochaine Action': lead.prochaineActionDate ? `${lead.prochaineActionDate} ${lead.prochaineActionHeure || ''}` : '',
      'Courtier Attribué': lead.assignedBroker,
      'Détails Synthèse': details,
      'Date Création': new Date(lead.createdAt).toLocaleDateString('fr-FR')
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Assurance');
  
  // Save file
  XLSX.writeFile(workbook, filename);
};

export const downloadImportTemplateExcel = () => {
  const templateData = [
    {
      'Type (AUTO / HABITATION / VTC)': 'AUTO',
      'Nom': 'Dupont',
      'Prénom': 'Jean',
      'Téléphone': '0611223344',
      'Email': 'jean.dupont@example.com',
      'Adresse': '10 Rue de la Paix',
      'Code Postal': '75002',
      'Ville': 'Paris',
      'Date Naissance (AAAA-MM-JJ)': '1990-04-12',
      'Date Permis (AAAA-MM-JJ)': '2010-09-15',
      'Immatriculation (si Auto/VTC)': 'AB-123-CD',
      'Marque Modele': 'Peugeot 208',
      'Bonus Malus (0.50 a 3.50)': '0.50',
      'Formule Souhaitee': 'Tous Risques',
      'Cotisation Restante (€)': '650',
      'Note / Remarque': 'Souhaite être rappelé l\'après-midi'
    },
    {
      'Type (AUTO / HABITATION / VTC)': 'HABITATION',
      'Nom': 'Martin',
      'Prénom': 'Sophie',
      'Téléphone': '0788990011',
      'Email': 'sophie.martin@example.com',
      'Adresse': '25 Rue Nationale',
      'Code Postal': '59000',
      'Ville': 'Lille',
      'Date Naissance (AAAA-MM-JJ)': '1985-07-22',
      'Date Permis (AAAA-MM-JJ)': '',
      'Immatriculation (si Auto/VTC)': '',
      'Marque Modele': '',
      'Bonus Malus (0.50 a 3.50)': '',
      'Formule Souhaitee': 'Formule Confort',
      'Cotisation Restante (€)': '280',
      'Note / Remarque': 'Appartement T3 75m² locataire'
    },
    {
      'Type (AUTO / HABITATION / VTC)': 'VTC',
      'Nom': 'Traore',
      'Prénom': 'Mamadou',
      'Téléphone': '0655667788',
      'Email': 'm.traore@vtc.fr',
      'Adresse': '8 Avenue Foch',
      'Code Postal': '93000',
      'Ville': 'Bobigny',
      'Date Naissance (AAAA-MM-JJ)': '1988-11-05',
      'Date Permis (AAAA-MM-JJ)': '2008-01-20',
      'Immatriculation (si Auto/VTC)': 'FF-999-ZZ',
      'Marque Modele': 'Mercedes Classe C',
      'Bonus Malus (0.50 a 3.50)': '0.50',
      'Formule Souhaitee': 'Tous Risques VTC + RC Pro',
      'Cotisation Restante (€)': '1950',
      'Note / Remarque': 'Société SASU - Carte VTC OK'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modele_Import_Leads');
  XLSX.writeFile(workbook, 'Modele_Import_Leads_Cabinet.xlsx');
};

export const parseExcelFile = (file: File): Promise<Partial<Lead>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedLeads: Partial<Lead>[] = json.map((row) => {
          const rawType = (row['Type (AUTO / HABITATION / VTC)'] || row['Type'] || 'AUTO').toUpperCase().trim();
          let type: LeadType = 'AUTO';
          if (rawType.includes('HAB') || rawType.includes('MAISON')) type = 'HABITATION';
          if (rawType.includes('VTC') || rawType.includes('TAXI')) type = 'VTC';

          const nom = row['Nom'] || row['NOM'] || 'Inconnu';
          const prenom = row['Prénom'] || row['Prenom'] || '';
          const telephone = row['Téléphone'] || row['Telephone'] || row['Tel'] || '';
          const email = row['Email'] || row['E-mail'] || '';
          const adresse = row['Adresse'] || '';
          const codePostal = String(row['Code Postal'] || row['CP'] || '');
          const ville = row['Ville'] || '';
          const dateNaissance = row['Date Naissance (AAAA-MM-JJ)'] || row['Date Naissance'] || '1990-01-01';
          const datePermis = row['Date Permis (AAAA-MM-JJ)'] || row['Date Permis'] || '2010-01-01';
          const immatriculation = row['Immatriculation (si Auto/VTC)'] || row['Immatriculation'] || row['Immat'] || 'AA-000-XX';
          const marqueModele = row['Marque Modele'] || row['Marque'] || 'Véhicule renseigné';
          const bonusMalus = parseFloat(row['Bonus Malus (0.50 a 3.50)'] || row['Bonus Malus'] || '0.50');
          const formule = row['Formule Souhaitee'] || row['Formule'] || (type === 'AUTO' ? 'Tous Risques' : type === 'HABITATION' ? 'Formule Confort' : 'Tous Risques VTC + RC Pro');
          const cotisation = parseFloat(row['Cotisation Restante (€)'] || row['Cotisation'] || '600');
          const noteText = row['Note / Remarque'] || row['Note'] || 'Lead importé par fichier Excel/CSV';

          const newLead: Partial<Lead> = {
            id: 'lead-imp-' + Math.random().toString(36).substring(2, 9),
            referenceDevis: generateQuoteReference(),
            type,
            status: 'NOUVEAU' as LeadStatus,
            qualification: 'CHAUD' as LeadQualification,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedBroker: 'Courtier Principal',
            nom,
            prenom,
            telephone,
            email,
            ville,
            codePostal,
            prochaineActionIntitule: 'Qualifier le nouveau lead importé',
            prochaineActionDate: new Date().toISOString().split('T')[0],
            prochaineActionHeure: '14:00',
            notes: [
              {
                id: 'note-imp-1',
                author: 'Système (Import Excel)',
                date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                content: noteText
              }
            ]
          };

          if (type === 'AUTO') {
            newLead.autoDetails = {
              nom,
              prenom,
              telephone,
              email,
              adresse,
              codePostal,
              ville,
              dateNaissance,
              datePermis,
              situationFamiliale: 'Marié',
              profession: 'Employé',
              immatriculation,
              dateMiseEnCirculation: '2020-01-01',
              dateAchat: '2021-01-01',
              typeUtilisation: 'Trajet privé',
              proprietaireVehicule: 'Conducteur principal',
              marqueModele,
              dejaAssure: true,
              nomDerniereCompagnie: 'Compagnie Précédente',
              nombreMoisAssure36Mois: 36,
              bonusMalus,
              aEuDesSinistres: false,
              sinistres: [],
              contratStatut: 'Résilié',
              aEuSuspensionOuAnnulation: false,
              formuleSouhaitee: formule as any,
              fractionnement: 'Mensuel',
              cotisationMontant: cotisation,
              fraisDossier: 30,
              optionsSupplementaires: ['Assistance 0km', 'Protection Juridique']
            };
          } else if (type === 'HABITATION') {
            newLead.habitationDetails = {
              nom,
              prenom,
              telephone,
              email,
              adresse,
              codePostal,
              ville,
              dateNaissance,
              typeLogement: 'Appartement',
              statutOccupant: 'Locataire',
              surfaceM2: 65,
              nombrePieces: 3,
              adresseBien: adresse || 'Adresse renseignée',
              codePostalBien: codePostal || '75000',
              villeBien: ville || 'Paris',
              residencePrincipale: true,
              dependances: false,
              veranda: false,
              piscine: false,
              valeurMobilier: 20000,
              dejaAssure: true,
              nomDerniereCompagnie: 'GMF',
              nombreMoisAssure: 24,
              aEuDesSinistres: false,
              sinistres: [],
              formuleSouhaitee: formule as any,
              fractionnement: 'Annuel',
              cotisationMontant: cotisation,
              fraisDossier: 20,
              optionsSupplementaires: ['Protection Juridique', 'Vol & Vandalisme']
            };
          } else if (type === 'VTC') {
            newLead.vtcDetails = {
              nom,
              prenom,
              telephone,
              email,
              adresse,
              codePostal,
              ville,
              dateNaissance,
              numeroCarteVtc: 'VTC-75-2022-00998',
              dateObtentionCarteVtc: '2022-01-01',
              datePermis,
              nomSociete: `${nom.toUpperCase()} TRANSPORT`,
              siret: '900 123 456 00010',
              formeJuridique: 'SASU',
              immatriculation,
              marqueModele,
              anneeVehicule: '2022',
              nombrePlaces: 5,
              typeMotorisation: 'Hybride',
              typeUsage: 'VTC Exclusif',
              dejaAssure: true,
              nomDerniereCompagnie: 'Allianz',
              bonusMalus,
              aEuDesSinistres: false,
              sinistres: [],
              besoinRcProExploitation: true,
              formuleSouhaitee: formule as any,
              fractionnement: 'Mensuel',
              cotisationMontant: cotisation,
              fraisDossier: 50,
              franchiseMontant: 500,
              optionsSupplementaires: ['Véhicule de remplacement VTC', 'Perte d\'exploitation']
            };
          }

          return newLead;
        });

        resolve(parsedLeads);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
