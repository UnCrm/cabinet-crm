import React, { useState } from 'react';
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Plus,
  Shield,
  Key,
  Globe,
  DollarSign,
  Activity,
  Layers,
  Terminal,
  X,
  ExternalLink,
  Power,
  Zap,
  Info
} from 'lucide-react';
import { InsurancePartnerApiConfig, LeadType } from '../types/crm';

interface PartnerApiSettingsProps {
  partners: InsurancePartnerApiConfig[];
  onSavePartners: (partners: InsurancePartnerApiConfig[]) => void;
}

export const PartnerApiSettings: React.FC<PartnerApiSettingsProps> = ({
  partners,
  onSavePartners
}) => {
  const [editingPartner, setEditingPartner] = useState<InsurancePartnerApiConfig | null>(null);
  const [testingPartnerId, setTestingPartnerId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number } | null>(null);
  const [showApiDocModal, setShowApiDocModal] = useState<InsurancePartnerApiConfig | null>(null);

  const handleToggleStatus = (id: string) => {
    const updated = partners.map((p) => {
      if (p.id === id) {
        const nextStatus = p.status === 'CONNECTE' ? 'DESACTIVE' : 'CONNECTE';
        return { ...p, status: nextStatus as any };
      }
      return p;
    });
    onSavePartners(updated);
  };

  const handleToggleAutoQuoting = (id: string) => {
    const updated = partners.map((p) => {
      if (p.id === id) {
        return { ...p, autoQuotingEnabled: !p.autoQuotingEnabled };
      }
      return p;
    });
    onSavePartners(updated);
  };

  const handleTestConnection = async (partner: InsurancePartnerApiConfig) => {
    setTestingPartnerId(partner.id);
    setTestResult(null);

    try {
      const response = await fetch('/api/partner-tarificateur/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner })
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          id: partner.id,
          success: true,
          message: data.message,
          latency: data.latencyMs
        });
        // Update lastSyncAt
        const updated = partners.map((p) =>
          p.id === partner.id
            ? { ...p, lastSyncAt: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }
            : p
        );
        onSavePartners(updated);
      } else {
        setTestResult({
          id: partner.id,
          success: false,
          message: data.error || 'Échec de connexion'
        });
      }
    } catch (err: any) {
      setTestResult({
        id: partner.id,
        success: false,
        message: err.message || 'Erreur réseau vers le Web Service.'
      });
    } finally {
      setTestingPartnerId(null);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    const exists = partners.some((p) => p.id === editingPartner.id);
    let updated: InsurancePartnerApiConfig[];
    if (exists) {
      updated = partners.map((p) => (p.id === editingPartner.id ? editingPartner : p));
    } else {
      updated = [...partners, editingPartner];
    }

    onSavePartners(updated);
    setEditingPartner(null);
  };

  const handleAddPartner = () => {
    const newP: InsurancePartnerApiConfig = {
      id: `partner-custom-${Date.now()}`,
      code: 'Nouveau',
      name: 'Nouveau Partenaire Assurance',
      logoUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=120&auto=format&fit=crop&q=80',
      category: 'COMPAGNIE',
      supportedProducts: ['AUTO'],
      apiEndpoint: 'https://api.partenaire.fr/v1/tarificateur',
      apiKey: 'key_live_sample',
      environment: 'SANDBOX',
      status: 'CONNECTE',
      commissionRate: 15.0,
      autoQuotingEnabled: true,
      codeIntermediaire: 'CRT-001'
    };
    setEditingPartner(newP);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Plug className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg">APIs & Tarificateurs Partenaires</h3>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              {partners.filter((p) => p.status === 'CONNECTE').length} / {partners.length} Connectés
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Connectez en direct les Web Services de vos Compagnies et Courtiers Grossistes (Allianz, April, Maxance, NetVox, Generali, AXA). Interrogez leurs moteurs de calcul en temps réel depuis le CRM et obtenez des cotisations immédiates.
          </p>
        </div>

        <button
          onClick={handleAddPartner}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Tarificateur API</span>
        </button>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((partner) => {
          const isConnected = partner.status === 'CONNECTE';
          const isMaintenance = partner.status === 'EN_MAINTENANCE';

          return (
            <div
              key={partner.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs ${
                isConnected
                  ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                  : 'border-slate-200 opacity-75 bg-slate-50/50'
              }`}
            >
              {/* Partner Card Top */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        {partner.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {partner.category === 'GROSSISTE' ? 'Courtier Grossiste' : 'Compagnie d\'Assurance'} • Code: {partner.codeIntermediaire || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isMaintenance
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-emerald-500 animate-pulse' : isMaintenance ? 'bg-amber-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    {isConnected ? 'Connecté' : isMaintenance ? 'Maintenance' : 'Inactif'}
                  </span>
                </div>

                {/* API Specs */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Globe className="w-3 h-3 text-slate-400" /> Environnement:
                    </span>
                    <span className="font-bold text-slate-800 bg-slate-200 px-1.5 py-0.2 rounded-md text-[10px]">
                      {partner.environment}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <DollarSign className="w-3 h-3 text-emerald-600" /> Com. Courtier:
                    </span>
                    <span className="font-bold text-emerald-700">{partner.commissionRate}%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Zap className="w-3 h-3 text-amber-500" /> Produits gérés:
                    </span>
                    <div className="flex items-center gap-1">
                      {partner.supportedProducts.map((prod) => (
                        <span key={prod} className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Endpoint preview */}
                <div className="text-[10px] text-slate-400 truncate bg-slate-900 text-slate-300 font-mono p-1.5 rounded-lg border border-slate-800">
                  {partner.apiEndpoint}
                </div>

                {/* Connection Test Message feedback */}
                {testResult && testResult.id === partner.id && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs leading-tight animate-in fade-in duration-150 ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">{testResult.success ? 'Succès Ping Web Service' : 'Erreur Connexion'}</p>
                        <p className="text-[11px] opacity-90 mt-0.5">{testResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Partner Card Actions Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStatus(partner.id)}
                    className={`p-1.5 rounded-lg border transition text-xs font-semibold cursor-pointer ${
                      isConnected
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                    }`}
                    title={isConnected ? 'Désactiver ce partner' : 'Activer ce partner'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleTestConnection(partner)}
                    disabled={testingPartnerId === partner.id}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    title="Tester le Web Service"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingPartnerId === partner.id ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowApiDocModal(partner)}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    title="Documentation Swagger API"
                  >
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                </div>

                <button
                  onClick={() => setEditingPartner(partner)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configurer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT PARTNER MODAL */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Configuration API : {editingPartner.name}</h3>
              </div>
              <button
                onClick={() => setEditingPartner(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom Compagnie / Grossiste</label>
                  <input
                    type="text"
                    required
                    value={editingPartner.name}
                    onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code Interne</label>
                  <input
                    type="text"
                    required
                    value={editingPartner.code}
                    onChange={(e) => setEditingPartner({ ...editingPartner, code: e.target.value as any })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie Partenaire</label>
                  <select
                    value={editingPartner.category}
                    onChange={(e) => setEditingPartner({ ...editingPartner, category: e.target.value as any })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="COMPAGNIE">Compagnie d'Assurance Directe</option>
                    <option value="GROSSISTE">Courtier Grossiste Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Environnement API</label>
                  <select
                    value={editingPartner.environment}
                    onChange={(e) => setEditingPartner({ ...editingPartner, environment: e.target.value as any })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="PRODUCTION">Production (Live)</option>
                    <option value="SANDBOX">Sandbox (Test / Recette)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Endpoint API WebService</label>
                <input
                  type="url"
                  required
                  value={editingPartner.apiEndpoint}
                  onChange={(e) => setEditingPartner({ ...editingPartner, apiEndpoint: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clé d'API (API Key / Client ID)</label>
                  <input
                    type="password"
                    value={editingPartner.apiKey}
                    onChange={(e) => setEditingPartner({ ...editingPartner, apiKey: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code Intermédiaire / Apporteur</label>
                  <input
                    type="text"
                    value={editingPartner.codeIntermediaire || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, codeIntermediaire: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Taux Commission Courtier (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={editingPartner.commissionRate}
                    onChange={(e) => setEditingPartner({ ...editingPartner, commissionRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Statut Intégration</label>
                  <select
                    value={editingPartner.status}
                    onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as any })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="CONNECTE">CONNECTÉ (Actif)</option>
                    <option value="EN_MAINTENANCE">EN MAINTENANCE</option>
                    <option value="DESACTIVE">DÉSACTIVÉ</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-900">Tarification Automatique Multi-Tarificateur</p>
                  <p className="text-[11px] text-slate-500">Autoriser ce partenaire à répondre aux requêtes en 1-clic.</p>
                </div>
                <input
                  type="checkbox"
                  checked={editingPartner.autoQuotingEnabled}
                  onChange={(e) => setEditingPartner({ ...editingPartner, autoQuotingEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="p-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 -mx-4 -mb-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Enregistrer les paramètres API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SWAGGER / API DOC PAYLOAD MODAL */}
      {showApiDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Spécification & Payload API : {showApiDocModal.name}</h3>
              </div>
              <button
                onClick={() => setShowApiDocModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="p-3 bg-indigo-950/60 rounded-xl border border-indigo-800/50 text-indigo-200 space-y-1">
                <p className="font-bold text-xs">POST {showApiDocModal.apiEndpoint}</p>
                <p className="text-[11px] opacity-80">Headers: Authorization: Bearer {showApiDocModal.apiKey.slice(0, 10)}... | Content-Type: application/json</p>
              </div>

              <div>
                <p className="text-slate-400 font-bold mb-1">Exemple de Payload JSON Envoyé au WebService :</p>
                <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400 overflow-x-auto text-[11px]">
{JSON.stringify(
  {
    codeIntermediaire: showApiDocModal.codeIntermediaire || 'CRT-001',
    leadReference: 'DEV-AUTO-2026-9901',
    produit: showApiDocModal.supportedProducts[0] || 'AUTO',
    assure: {
      civilite: 'Mr',
      nom: 'Dupont',
      prenom: 'Jean',
      dateNaissance: '1988-04-12',
      datePermis: '2008-05-20',
      bonusMalus: 0.80,
      sinistres36Mois: 0
    },
    vehicule: {
      immatriculation: 'AB-123-CD',
      usage: 'Trajet travail',
      formuleSouhaitee: 'Tous Risques'
    }
  },
  null,
  2
)}
                </pre>
              </div>

              <div>
                <p className="text-slate-400 font-bold mb-1">Exemple de Réponse WebService Reçue en Temps Réel :</p>
                <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-blue-300 overflow-x-auto text-[11px]">
{JSON.stringify(
  {
    status: 200,
    quoteRef: `${showApiDocModal.code}-2026-8819`,
    primeMensuelle: 62.50,
    primeAnnuelle: 750.00,
    franchise: 300,
    fraisDossier: 25,
    commissionAmount: 123.75,
    matchScore: 94,
    eligibleSouscriptionImmediate: true
  },
  null,
  2
)}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setShowApiDocModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
