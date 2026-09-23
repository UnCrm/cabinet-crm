import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Car, 
  Home, 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  ArrowRight, 
  X, 
  ShieldAlert,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Lead, getUserDisplayName } from '../types/crm';
import { matchLeadSearch } from '../utils/search';

interface QuickSearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateTab: (tab: 'dashboard' | 'leads' | 'calendar' | 'chat' | 'activity-tracking' | 'settings') => void;
}

export const QuickSearchCommandPalette: React.FC<QuickSearchCommandPaletteProps> = ({
  isOpen,
  onClose,
  leads,
  onSelectLead,
  onNavigateTab
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredLeads = query.trim()
    ? leads.filter(l => matchLeadSearch(l, query)).slice(0, 8)
    : leads.slice(0, 5);

  const getProductIcon = (type: string) => {
    switch (type) {
      case 'AUTO': return <Car className="w-4 h-4 text-blue-500" />;
      case 'HABITATION': return <Home className="w-4 h-4 text-emerald-500" />;
      case 'VTC': return <Briefcase className="w-4 h-4 text-purple-500" />;
      default: return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-20 px-4 z-50 animate-in fade-in duration-100">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, téléphone (ex: 0612), immatriculation, email..."
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
            ESC pour fermer
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Navigations */}
        <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Accès Rapide :</span>
          <button
            onClick={() => { onNavigateTab('leads'); onClose(); }}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg border border-slate-200 shadow-2xs transition"
          >
            Liste des Leads
          </button>
          <button
            onClick={() => { onNavigateTab('calendar'); onClose(); }}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg border border-slate-200 shadow-2xs transition"
          >
            Rappels & Calendrier
          </button>
          <button
            onClick={() => { onNavigateTab('activity-tracking'); onClose(); }}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg border border-slate-200 shadow-2xs transition"
          >
            Suivi Présence
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              Aucun lead ne correspond à votre recherche "{query}".
            </div>
          ) : (
            filteredLeads.map((l) => (
              <div
                key={l.id}
                onClick={() => {
                  onSelectLead(l);
                  onClose();
                }}
                className="p-3 hover:bg-blue-50/70 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 rounded-xl transition">
                    {getProductIcon(l.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-950">
                        {l.prenom} {l.nom}
                      </span>
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                        {l.referenceDevis}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
                        {l.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {l.telephone}
                      </span>
                      {l.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {l.email}
                        </span>
                      )}
                      {l.autoDetails?.immatriculation && (
                        <span className="font-mono bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          {l.autoDetails.immatriculation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    Ouvrir <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
          Astuce : Utilisez <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-slate-800">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-slate-800">K</kbd> n'importe où pour ouvrir cette recherche instantanée.
        </div>
      </div>
    </div>
  );
};
