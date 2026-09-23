import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileSpreadsheet, 
  FileText,
  LayoutList, 
  Kanban, 
  Car, 
  Home, 
  Briefcase, 
  Clock, 
  PhoneCall, 
  MoreVertical,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  Calendar,
  Mail,
  Phone,
  X,
  Check,
  AlertTriangle,
  Paperclip,
  Send,
  UserCheck
} from 'lucide-react';
import { Lead, LeadQualification, LeadStatus, LeadType, User, CabinetInfo, getUserDisplayName, completeProchaineAction, cancelProchaineAction } from '../types/crm';
import { exportLeadsToExcel } from '../utils/excel';
import { matchLeadSearch } from '../utils/search';
import { computeAllDuplicatesInList } from '../utils/duplicates';
import { getAccessibleLeads } from '../utils/permissions';
import { TelephonyModal } from './TelephonyModal';
import { QuickEmailModal } from './QuickEmailModal';
import { DevoirConseilModal } from './DevoirConseilModal';

interface LeadsListProps {
  leads: Lead[];
  onOpenNewLeadModal: () => void;
  onOpenImportModal: () => void;
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onUpdateLead?: (lead: Lead) => void;
  initialProductFilter?: LeadType | 'ALL';
  currentUser?: User;
  cabinetInfo?: CabinetInfo;
  users?: User[];
}

const formatLeadDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const formatLeadTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const getFractionnementSuffix = (fractionnement?: string) => {
  switch (fractionnement) {
    case 'Mensuel':
      return '/ mois';
    case 'Trimestriel':
      return '/ trimestre';
    case 'Semestriel':
      return '/ semestre';
    case 'Annuel':
      return '/ an';
    default:
      return '/ mois';
  }
};

export const LeadsList: React.FC<LeadsListProps> = ({
  leads,
  onOpenNewLeadModal,
  onOpenImportModal,
  onSelectLead,
  onUpdateStatus,
  onUpdateLead,
  initialProductFilter = 'ALL',
  currentUser,
  cabinetInfo,
  users
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState<LeadType | 'ALL'>(initialProductFilter);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);

  // Quick Action Direct Call, Direct Email, and Devoir de Conseil States
  const [telephonyLead, setTelephonyLead] = useState<Lead | null>(null);
  const [quickEmailLead, setQuickEmailLead] = useState<Lead | null>(null);
  const [devoirConseilLead, setDevoirConseilLead] = useState<Lead | null>(null);

  // Helper to format assigned agent name prioritizing pseudo
  const getAgentName = React.useCallback((lead: Lead): string => {
    const raw = (lead.attribueA || lead.assignedBroker || '').trim();
    if (!raw) return 'Non assigné';
    if (currentUser) {
      if (
        (currentUser.pseudo && raw.toLowerCase() === currentUser.pseudo.toLowerCase()) ||
        (`${currentUser.prenom} ${currentUser.nom}`.toLowerCase() === raw.toLowerCase()) ||
        currentUser.id === lead.assignedTo
      ) {
        return getUserDisplayName(currentUser);
      }
    }
    const matched = users?.find(
      u => (u.pseudo && u.pseudo.toLowerCase() === raw.toLowerCase()) ||
           (`${u.prenom} ${u.nom}`.toLowerCase() === raw.toLowerCase()) ||
           getUserDisplayName(u).toLowerCase() === raw.toLowerCase() ||
           u.id === lead.assignedTo
    );
    if (matched) return getUserDisplayName(matched);
    return raw;
  }, [currentUser, users]);

  // Leads strictement accessibles selon le rôle et les attributions du compte connecté
  const accessibleLeads = React.useMemo(() => {
    return getAccessibleLeads(leads, currentUser, users);
  }, [leads, currentUser, users]);

  // Détection groupée des doublons dans les leads accessibles
  const duplicatesMap = React.useMemo(() => computeAllDuplicatesInList(accessibleLeads), [accessibleLeads]);

  const statusesOptions = React.useMemo(() => {
    const list = cabinetInfo?.customStatuses && cabinetInfo.customStatuses.length > 0
      ? [...cabinetInfo.customStatuses]
      : [
          { id: 'NOUVEAU', label: 'Nouveau Lead' },
          { id: 'A_CONTACTER', label: 'À Contacter' },
          { id: 'DEVIS_ENVOYE', label: 'Devis Envoyé' },
          { id: 'RELANCE', label: 'Relance à faire' },
          { id: 'PDG', label: 'PDG (Prise De Garantie)' },
          { id: 'GAGNE', label: 'Souscrit / Gagné' },
          { id: 'PERDU', label: 'Perdu / Rejeté' }
        ];

    if (!list.some((s) => s.id === 'PDG')) {
      const gagneIdx = list.findIndex((s) => s.id === 'GAGNE');
      if (gagneIdx !== -1) {
        list.splice(gagneIdx, 0, { id: 'PDG', label: 'PDG (Prise De Garantie)' });
      } else {
        list.push({ id: 'PDG', label: 'PDG (Prise De Garantie)' });
      }
    }
    return list;
  }, [cabinetInfo?.customStatuses]);

  // Filtered Leads based on accessible leads & active UI filters
  const filteredLeads = accessibleLeads.filter((lead) => {
    // Filtre doublons uniquement si activé
    if (showOnlyDuplicates && !duplicatesMap.has(lead.id)) {
      return false;
    }

    // Product match
    if (productFilter !== 'ALL' && lead.type !== productFilter) return false;

    // Status match
    if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;

    // Search term match - Recherche universelle sans contrainte (téléphone sans espace, immatriculation sans tiret, accents, etc.)
    if (searchTerm.trim()) {
      return matchLeadSearch(lead, searchTerm);
    }

    return true;
  });

  const getStatusBadgeClass = (status: LeadStatus) => {
    switch (status) {
      case 'NOUVEAU':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'A_CONTACTER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DEVIS_ENVOYE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RELANCE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'PDG':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
      case 'GAGNE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PERDU':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    const custom = statusesOptions.find(s => s.id === status);
    if (custom) return custom.label;
    switch (status) {
      case 'NOUVEAU': return 'Nouveau Lead';
      case 'A_CONTACTER': return 'À Contacter';
      case 'DEVIS_ENVOYE': return 'Devis Envoyé';
      case 'RELANCE': return 'Relance à faire';
      case 'PDG': return 'PDG (Prise De Garantie)';
      case 'GAGNE': return 'Souscrit / Gagné';
      case 'PERDU': return 'Perdu / Rejeté';
      default: return status;
    }
  };

  const kanbanColumns: LeadStatus[] = statusesOptions.map(s => s.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Recherche sans contrainte (téléphone sans espace, plaque sans tiret, nom, ville, réf...)"
              className="w-full text-xs pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons & View Switcher */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center space-x-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vue Tableau"
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">Tableau</span>
              </button>

              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vue Pipeline Kanban"
              >
                <Kanban className="w-4 h-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            {/* Export Excel */}
            {(!currentUser || currentUser.permissions.canExportData) && (
              <button
                onClick={() => exportLeadsToExcel(filteredLeads)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                title="Exporter les leads filtrés en Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export XLSX</span>
              </button>
            )}

            {/* Import Excel - Seuls ADMIN et DIRECTEUR_PRODUCTION ont le droit d'importer */}
            {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'DIRECTEUR_PRODUCTION') && (
              <button
                onClick={onOpenImportModal}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer"
                title="Importer des leads via fichier Excel ou CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {/* New Lead */}
            {(!currentUser || currentUser.permissions.canCreateLeads) && (
              <button
                onClick={onOpenNewLeadModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Lead</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          {/* Product Type Filter */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Branche :</span>
            {(['ALL', 'AUTO', 'HABITATION', 'VTC'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setProductFilter(type)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  productFilter === type
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {type === 'AUTO' && <Car className="w-3.5 h-3.5 text-blue-400" />}
                {type === 'HABITATION' && <Home className="w-3.5 h-3.5 text-emerald-400" />}
                {type === 'VTC' && <Briefcase className="w-3.5 h-3.5 text-amber-400" />}
                <span>{type === 'ALL' ? 'Tous les produits' : type}</span>
              </button>
            ))}
          </div>

          {/* Status & Duplicates Filters */}
          <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
            {duplicatesMap.size > 0 && (
              <button
                type="button"
                onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  showOnlyDuplicates
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="Filtrer uniquement les dossiers identifiés comme doublons"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Doublons ({duplicatesMap.size})</span>
              </button>
            )}

            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Statut :</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs font-bold bg-slate-100 text-slate-800 p-1.5 rounded-xl border border-slate-200 focus:outline-none"
              >
                <option value="ALL">Tous les statuts</option>
                {statusesOptions.map(st => (
                  <option key={st.id} value={st.id}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* RESULT COUNTER */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium px-1">
        <div className="flex items-center gap-2">
          <span>
            Affichage de <strong>{filteredLeads.length}</strong> dossier(s) sur{' '}
            <strong>{accessibleLeads.length}</strong>{' '}
            {currentUser?.permissions?.canViewAllLeads ? 'au total dans le cabinet' : 'dossier(s) attribué(s) à votre compte'}
          </span>
          {currentUser && !currentUser.permissions?.canViewAllLeads && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              🔒 Vos dossiers uniquement
            </span>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: TABLE VIEW & RESPONSIVE MOBILE CARDS */}
      {viewMode === 'table' && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Date d'Ajout</th>
                  <th className="p-4">Prospect</th>
                  <th className="p-4">Coordonnées</th>
                  <th className="p-4">Cotisation / Formule</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Agent Assigné</th>
                  <th className="p-4">Prochaine Action</th>
                  <th className="p-4 text-center whitespace-nowrap w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      Aucun lead d'assurance ne correspond à vos critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => {
                    let cotis = 0;
                    let fractionnement = 'Mensuel';
                    let formula = 'Formule non définie';
                    let immatOrDetail = '';

                    if (lead.type === 'AUTO' && lead.autoDetails) {
                      cotis = lead.autoDetails.cotisationMontant;
                      fractionnement = lead.autoDetails.fractionnement || 'Mensuel';
                      formula = lead.autoDetails.formuleSouhaitee;
                      immatOrDetail = lead.autoDetails.immatriculation;
                    } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
                      cotis = lead.habitationDetails.cotisationMontant;
                      fractionnement = lead.habitationDetails.fractionnement || 'Mensuel';
                      formula = lead.habitationDetails.formuleSouhaitee;
                      immatOrDetail = `${lead.habitationDetails.surfaceM2}m² - ${lead.habitationDetails.typeLogement}`;
                    } else if (lead.type === 'VTC' && lead.vtcDetails) {
                      cotis = lead.vtcDetails.cotisationMontant;
                      fractionnement = lead.vtcDetails.fractionnement || 'Mensuel';
                      formula = lead.vtcDetails.formuleSouhaitee;
                      immatOrDetail = lead.vtcDetails.immatriculation;
                    }

                    if (fractionnement === 'Mensuel' && cotis > 300) {
                      cotis = Math.round((cotis / 12) * 100) / 100;
                    }

                    const agentName = getAgentName(lead);

                    return (
                      <tr 
                        key={`lead-row-${lead.id}-${idx}`}
                        onClick={() => onSelectLead(lead)}
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        {/* 1. Date d'ajout du lead */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatLeadDate(lead.createdAt)}</span>
                          </div>
                          {formatLeadTime(lead.createdAt) && (
                            <div className="text-[10px] text-slate-400 font-mono pl-5 mt-0.5">
                              à {formatLeadTime(lead.createdAt)}
                            </div>
                          )}
                        </td>

                        {/* 2. Prospect */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition text-xs">
                            {lead.civilite ? `${lead.civilite} ` : ''}{lead.nom ? lead.nom.toUpperCase() : ''} {lead.prenom}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              lead.type === 'AUTO' ? 'bg-blue-100 text-blue-800' :
                              lead.type === 'HABITATION' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {lead.type}
                            </span>
                            {immatOrDetail && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                • {immatOrDetail}
                              </span>
                            )}
                            {duplicatesMap.has(lead.id) && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300"
                                title={`Doublon potentiel détecté:\n${duplicatesMap.get(lead.id)?.map(r => `• ${r.label} (${r.matchedValue})`).join('\n')}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                <span>Doublon</span>
                              </span>
                            )}
                            {lead.documents && lead.documents.length > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                title={`${lead.documents.length} document(s) joint(s)`}
                              >
                                <Paperclip className="w-2.5 h-2.5" />
                                <span>{lead.documents.length}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Coordonnées (email et tel) */}
                        <td className="p-4">
                          <div className="font-mono font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{lead.telephone || '-'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 max-w-[200px] truncate" title={lead.email}>
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.email || '-'}</span>
                          </div>
                        </td>

                        {/* 4. Cotisation / Formule */}
                        <td className="p-4">
                          <div className="font-bold text-emerald-800 text-xs">
                            {cotis > 0 ? `${cotis.toLocaleString('fr-FR')} € ${getFractionnementSuffix(fractionnement)}` : '-'}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-1" title={formula}>
                            {formula}
                          </div>
                        </td>

                        {/* 5. Statut */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as LeadStatus;
                              if (onUpdateLead) {
                                onUpdateLead({
                                  ...lead,
                                  status: newStatus,
                                  updatedAt: new Date().toISOString()
                                });
                              } else {
                                onUpdateStatus(lead.id, newStatus);
                              }
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer outline-none transition shadow-2xs ${getStatusBadgeClass(lead.status)}`}
                          >
                            {statusesOptions.map(st => (
                              <option key={st.id} value={st.id}>{st.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* 6. Agent Assigné */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-200">
                              {agentName !== 'Non assigné' ? (agentName[0] || 'A').toUpperCase() : '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {agentName}
                              </div>
                              {lead.equipe && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {lead.equipe}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 7. Prochaine Action */}
                        <td className="p-4 max-w-[240px]">
                          {lead.prochaineActionIntitule || lead.prochaineActionDate ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="font-medium text-slate-800 text-xs truncate" title={lead.prochaineActionIntitule || 'Rappel client'}>
                                  📌 {lead.prochaineActionIntitule || 'Rappel client'}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
                                      onUpdateLead(completeProchaineAction(lead, author));
                                    }}
                                    className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 transition cursor-pointer shadow-2xs"
                                    title="Cocher que c'est fait"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
                                      onUpdateLead(cancelProchaineAction(lead, author));
                                    }}
                                    className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md border border-rose-200 transition cursor-pointer shadow-2xs"
                                    title="Annuler l'action"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {lead.prochaineActionDate && (
                                <div className="text-[10px] font-mono text-amber-800 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{lead.prochaineActionDate} {lead.prochaineActionHeure && `à ${lead.prochaineActionHeure}`}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Aucune action</span>
                          )}
                        </td>

                        {/* 8. Contact & Actions Rapides : Icône Téléphone et Icône Email directs (sans texte) */}
                        <td className="p-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Icône Appel Direct */}
                            {lead.telephone ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTelephonyLead(lead);
                                }}
                                title={`Appeler ${lead.civilite || ''} ${lead.prenom} ${lead.nom} (${lead.telephone})`}
                                className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 flex items-center justify-center transition shadow-2xs cursor-pointer group/tel"
                              >
                                <PhoneCall className="w-4 h-4 group-hover/tel:scale-110 transition-transform" />
                              </button>
                            ) : (
                              <span
                                title="Aucun numéro de téléphone"
                                className="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 border border-slate-200 flex items-center justify-center cursor-not-allowed"
                              >
                                <PhoneCall className="w-4 h-4" />
                              </span>
                            )}

                            {/* Icône Email Direct */}
                            {lead.email ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickEmailLead(lead);
                                }}
                                title={`Envoyer un email à ${lead.email}`}
                                className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 flex items-center justify-center transition shadow-2xs cursor-pointer group/mail"
                              >
                                <Mail className="w-4 h-4 group-hover/mail:scale-110 transition-transform" />
                              </button>
                            ) : (
                              <span
                                title="Aucune adresse email"
                                className="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 border border-slate-200 flex items-center justify-center cursor-not-allowed"
                              >
                                <Mail className="w-4 h-4" />
                              </span>
                            )}

                            {/* Icône Devoir de Conseil Direct */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDevoirConseilLead(lead);
                              }}
                              title={`Générer ou imprimer le Devoir de Conseil officiel (${lead.nom} ${lead.prenom})`}
                              className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 flex items-center justify-center transition shadow-2xs cursor-pointer group/dc"
                            >
                              <FileText className="w-4 h-4 group-hover/dc:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List (smartphones & small screens) */}
        <div className="block md:hidden space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Aucun lead d'assurance ne correspond à vos critères de recherche.
            </div>
          ) : (
            filteredLeads.map((lead, idx) => {
              let cotis = 0;
              let fractionnement = 'Mensuel';
              let formula = 'Formule non définie';
              let immatOrDetail = '';

              if (lead.type === 'AUTO' && lead.autoDetails) {
                cotis = lead.autoDetails.cotisationMontant;
                fractionnement = lead.autoDetails.fractionnement || 'Mensuel';
                formula = lead.autoDetails.formuleSouhaitee;
                immatOrDetail = lead.autoDetails.immatriculation;
              } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
                cotis = lead.habitationDetails.cotisationMontant;
                fractionnement = lead.habitationDetails.fractionnement || 'Mensuel';
                formula = lead.habitationDetails.formuleSouhaitee;
                immatOrDetail = `${lead.habitationDetails.surfaceM2}m² - ${lead.habitationDetails.typeLogement}`;
              } else if (lead.type === 'VTC' && lead.vtcDetails) {
                cotis = lead.vtcDetails.cotisationMontant;
                fractionnement = lead.vtcDetails.fractionnement || 'Mensuel';
                formula = lead.vtcDetails.formuleSouhaitee;
                immatOrDetail = lead.vtcDetails.immatriculation;
              }

              if (fractionnement === 'Mensuel' && cotis > 300) {
                cotis = Math.round((cotis / 12) * 100) / 100;
              }

              const agentName = getAgentName(lead);

              return (
                <div
                  key={`mobile-lead-${lead.id}-${idx}`}
                  onClick={() => onSelectLead(lead)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:scale-[0.99] transition cursor-pointer space-y-3"
                >
                  {/* Top row: Name + Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {lead.civilite ? `${lead.civilite} ` : ''}{lead.nom ? lead.nom.toUpperCase() : ''} {lead.prenom}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          lead.type === 'AUTO' ? 'bg-blue-100 text-blue-800' :
                          lead.type === 'HABITATION' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {lead.type}
                        </span>
                        {immatOrDetail && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            • {immatOrDetail}
                          </span>
                        )}
                        {duplicatesMap.has(lead.id) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                            <span>Doublon</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as LeadStatus;
                          if (onUpdateLead) {
                            onUpdateLead({
                              ...lead,
                              status: newStatus,
                              updatedAt: new Date().toISOString()
                            });
                          } else {
                            onUpdateStatus(lead.id, newStatus);
                          }
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer outline-none shadow-2xs ${getStatusBadgeClass(lead.status)}`}
                      >
                        {statusesOptions.map(st => (
                          <option key={st.id} value={st.id}>{st.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Middle row: Price & details */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Cotisation</span>
                      <span className="font-bold text-emerald-700">
                        {cotis > 0 ? `${cotis.toLocaleString('fr-FR')} € ${getFractionnementSuffix(fractionnement)}` : '-'}
                      </span>
                    </div>
                    <div className="text-right max-w-[60%]">
                      <span className="text-[10px] text-slate-400 block font-semibold">Formule / Détail</span>
                      <span className="font-medium text-slate-700 truncate block">{formula}</span>
                    </div>
                  </div>

                  {/* Prochaine action & Agent */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[120px]">{agentName}</span>
                    </div>
                    {lead.prochaineActionType && (
                      <div className="flex items-center gap-1 text-amber-700 font-semibold">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{lead.prochaineActionType} ({formatLeadDate(lead.prochaineActionDate)})</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom quick actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {lead.telephone && (
                        <button
                          type="button"
                          onClick={() => setTelephonyLead(lead)}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 transition"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Appeler</span>
                        </button>
                      )}
                      {lead.email && (
                        <button
                          type="button"
                          onClick={() => setQuickEmailLead(lead)}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
                    >
                      Ouvrir
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    )}

      {/* VIEW MODE 2: KANBAN PIPELINE VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-6">
          {kanbanColumns.map((colStatus) => {
            const colLeads = filteredLeads.filter((l) => l.status === colStatus);

            return (
              <div 
                key={colStatus} 
                className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200/80 flex flex-col min-w-[220px] space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    {getStatusLabel(colStatus)}
                  </span>
                  <span className="bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                    {colLeads.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                  {colLeads.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-slate-400 italic">
                      Aucun lead
                    </div>
                  ) : (
                    colLeads.map((lead, idx) => {
                      let cotis = 0;
                      let fractionnement = 'Mensuel';
                      let formula = '';
                      if (lead.type === 'AUTO' && lead.autoDetails) {
                        cotis = lead.autoDetails.cotisationMontant;
                        fractionnement = lead.autoDetails.fractionnement || 'Mensuel';
                        formula = lead.autoDetails.formuleSouhaitee;
                      } else if (lead.type === 'HABITATION' && lead.habitationDetails) {
                        cotis = lead.habitationDetails.cotisationMontant;
                        fractionnement = lead.habitationDetails.fractionnement || 'Mensuel';
                        formula = lead.habitationDetails.formuleSouhaitee;
                      } else if (lead.type === 'VTC' && lead.vtcDetails) {
                        cotis = lead.vtcDetails.cotisationMontant;
                        fractionnement = lead.vtcDetails.fractionnement || 'Mensuel';
                        formula = lead.vtcDetails.formuleSouhaitee;
                      }

                      if (fractionnement === 'Mensuel' && cotis > 300) {
                        cotis = Math.round((cotis / 12) * 100) / 100;
                      }

                      const agentName = getAgentName(lead);

                      return (
                        <div
                          key={`lead-kanban-${lead.id}-${idx}`}
                          onClick={() => onSelectLead(lead)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-2.5 group"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                lead.type === 'AUTO' ? 'bg-blue-100 text-blue-800' :
                                lead.type === 'HABITATION' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {lead.type}
                              </span>
                              {duplicatesMap.has(lead.id) && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300"
                                  title={`Doublon potentiel détecté:\n${duplicatesMap.get(lead.id)?.map(r => `• ${r.label} (${r.matchedValue})`).join('\n')}`}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Doublon</span>
                                </span>
                              )}
                              {lead.documents && lead.documents.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                  title={`${lead.documents.length} document(s) joint(s)`}
                                >
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span>{lead.documents.length}</span>
                                </span>
                              )}
                            </div>
                            <span className="font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatLeadDate(lead.createdAt)}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition">
                              {lead.civilite ? `${lead.civilite} ` : ''}{lead.nom ? lead.nom.toUpperCase() : ''} {lead.prenom}
                            </h4>
                          </div>

                          {/* Coordonnées */}
                          <div className="text-[11px] space-y-0.5 text-slate-600 border-t border-slate-100 pt-1.5">
                            <div className="flex items-center gap-1 font-mono font-medium text-slate-800">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{lead.telephone || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate" title={lead.email}>
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{lead.email || '-'}</span>
                            </div>
                          </div>

                          {/* Cotisation / Formule */}
                          {(cotis > 0 || formula) && (
                            <div className="pt-1.5 border-t border-slate-100">
                              {cotis > 0 && (
                                <div className="text-xs font-bold text-emerald-700">
                                  {cotis.toLocaleString('fr-FR')} € {getFractionnementSuffix(fractionnement)}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 truncate" title={formula}>
                                {formula}
                              </div>
                            </div>
                          )}

                          {/* Agent Assigné */}
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[9px] shrink-0 border border-indigo-200">
                              {agentName !== 'Non assigné' ? (agentName[0] || 'A').toUpperCase() : '?'}
                            </div>
                            <span className="text-[11px] font-medium text-slate-700 truncate">
                              {agentName}
                            </span>
                          </div>

                          {/* Statut Selector in Kanban */}
                          <div className="pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as LeadStatus;
                                if (onUpdateLead) {
                                  onUpdateLead({ ...lead, status: newStatus, updatedAt: new Date().toISOString() });
                                } else {
                                  onUpdateStatus(lead.id, newStatus);
                                }
                              }}
                              className={`w-full text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer outline-none ${getStatusBadgeClass(lead.status)}`}
                            >
                              {statusesOptions.map(st => (
                                <option key={st.id} value={st.id}>{st.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Prochaine Action */}
                          {(lead.prochaineActionIntitule || lead.prochaineActionDate) && (
                            <div className="text-[10px] text-slate-700 bg-amber-50 p-2 rounded-lg border border-amber-200 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-semibold line-clamp-1 text-slate-900">📌 {lead.prochaineActionIntitule || 'Rappel client'}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
                                      onUpdateLead(completeProchaineAction(lead, author));
                                    }}
                                    className="p-1 bg-white hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-300 transition cursor-pointer"
                                    title="Cocher que c'est fait"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const author = currentUser ? getUserDisplayName(currentUser) : 'Conseiller';
                                      onUpdateLead(cancelProchaineAction(lead, author));
                                    }}
                                    className="p-1 bg-white hover:bg-rose-100 text-rose-700 rounded border border-rose-300 transition cursor-pointer"
                                    title="Annuler l'action"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {lead.prochaineActionDate && (
                                <p className="text-[9px] font-mono text-amber-800 font-bold">
                                  {lead.prochaineActionDate} {lead.prochaineActionHeure && `à ${lead.prochaineActionHeure}`}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Quick Direct Actions in Kanban (Icons only) */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lead.telephone) setTelephonyLead(lead);
                              }}
                              disabled={!lead.telephone}
                              title={lead.telephone ? `Appeler ${lead.telephone}` : 'Pas de numéro'}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white disabled:opacity-30 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-600 disabled:cursor-not-allowed border border-emerald-200 rounded-lg transition cursor-pointer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lead.email) setQuickEmailLead(lead);
                              }}
                              disabled={!lead.email}
                              title={lead.email ? `Email à ${lead.email}` : 'Pas d\'email'}
                              className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-blue-50 disabled:hover:text-blue-600 disabled:cursor-not-allowed border border-blue-200 rounded-lg transition cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Telephony Modal (Direct Call Console without entering lead) */}
      {telephonyLead && (
        <TelephonyModal
          isOpen={!!telephonyLead}
          onClose={() => setTelephonyLead(null)}
          lead={telephonyLead}
          currentUser={currentUser}
          cabinetInfo={cabinetInfo}
          onUpdateLead={(updated) => {
            if (onUpdateLead) onUpdateLead(updated);
            setTelephonyLead(updated);
          }}
        />
      )}

      {/* Quick Email Modal (Direct Email Sending without entering lead) */}
      {quickEmailLead && (
        <QuickEmailModal
          isOpen={!!quickEmailLead}
          onClose={() => setQuickEmailLead(null)}
          lead={quickEmailLead}
          currentUser={currentUser}
          cabinetInfo={cabinetInfo}
          onUpdateLead={onUpdateLead}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {/* Official Devoir de Conseil (DDA 2026) Direct Modal */}
      {devoirConseilLead && cabinetInfo && (
        <DevoirConseilModal
          isOpen={!!devoirConseilLead}
          onClose={() => setDevoirConseilLead(null)}
          lead={devoirConseilLead}
          cabinetInfo={cabinetInfo}
          currentUser={currentUser}
          onUpdateLead={(updated) => {
            if (onUpdateLead) onUpdateLead(updated);
            setDevoirConseilLead(updated);
          }}
        />
      )}
    </div>
  );
};
