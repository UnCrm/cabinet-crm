import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, X, User as UserIcon, Mail, Phone } from 'lucide-react';
import { Lead, User, getUserDisplayName } from '../types/crm';

interface PdgNotificationBannerProps {
  currentUser?: User | null;
  onOpenLead: (lead: Lead) => void;
}

interface PdgAlertData {
  lead: Lead;
  initiatorUser?: User | null;
  targetGestionnaires: User[];
  timestamp: number;
}

export const PdgNotificationBanner: React.FC<PdgNotificationBannerProps> = ({
  currentUser,
  onOpenLead
}) => {
  const [activeAlert, setActiveAlert] = useState<PdgAlertData | null>(null);

  useEffect(() => {
    const handlePdgEvent = (event: any) => {
      const detail: PdgAlertData = event.detail;
      if (!detail || !detail.lead) return;

      // Déterminer si l'utilisateur courant doit voir l'alerte
      // Les gestionnaires, les admins, les directeurs ou l'initiateur
      const isGestionnaire = currentUser?.role === 'GESTIONNAIRE';
      const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTEUR_PRODUCTION';
      const isInitiator = currentUser?.id === detail.initiatorUser?.id;

      // Si c'est un gestionnaire, vérifier l'équipe
      if (isGestionnaire) {
        const userTeam = (currentUser?.equipe || '').trim().toLowerCase();
        const leadTeam = (detail.lead.equipe || detail.initiatorUser?.equipe || '').trim().toLowerCase();
        if (userTeam && leadTeam && userTeam !== leadTeam) {
          // Équipes distinctes, ne pas afficher
          return;
        }
      }

      if (isGestionnaire || isAdmin || isInitiator) {
        setActiveAlert(detail);
      }
    };

    window.addEventListener('crm-pdg-notification', handlePdgEvent);
    return () => window.removeEventListener('crm-pdg-notification', handlePdgEvent);
  }, [currentUser]);

  if (!activeAlert) return null;

  const { lead, initiatorUser } = activeAlert;
  const clientNom = `${lead.nom || ''} ${lead.prenom || ''}`.trim() || 'Client';
  const commercialNom = initiatorUser ? getUserDisplayName(initiatorUser) : (lead.assignedBroker || 'Commercial');

  return (
    <aside
      aria-label="Alerte Prise de Garantie"
      className="fixed top-20 right-4 z-50 max-w-md w-full bg-slate-900 border-2 border-indigo-500 text-white rounded-2xl shadow-2xl p-4 animate-bounce-short transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Demande de Prise de Garantie (PDG)</span>
            </div>
            <h4 className="font-bold text-sm text-white mt-1">
              {clientNom} — {lead.type}
            </h4>
          </div>
        </div>
        <button
          onClick={() => setActiveAlert(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          aria-label="Fermer l'alerte"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 bg-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 space-y-1 border border-slate-700/50">
        <div className="flex justify-between">
          <span className="text-slate-400">Devis N° :</span>
          <span className="font-mono font-bold text-amber-400">{lead.referenceDevis || lead.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Commercial référent :</span>
          <span className="font-semibold text-slate-200">{commercialNom}</span>
        </div>
        {lead.equipe && (
          <div className="flex justify-between">
            <span className="text-slate-400">Équipe :</span>
            <span className="text-blue-300 font-medium">{lead.equipe}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setActiveAlert(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          Ignorer
        </button>
        <button
          type="button"
          onClick={() => {
            onOpenLead(lead);
            setActiveAlert(null);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <span>Consulter le dossier</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
