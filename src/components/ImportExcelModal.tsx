import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle,
  Car,
  Home,
  Briefcase
} from 'lucide-react';
import { Lead } from '../types/crm';
import { parseExcelFile, downloadImportTemplateExcel } from '../utils/excel';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedLeads: Lead[]) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Partial<Lead>[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const results = await parseExcelFile(file);
      setParsedPreview(results);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de la lecture du fichier Excel/CSV. Vérifiez le format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportSuccess(parsedPreview as Lead[]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Importation de Leads via Excel / CSV</h3>
              <p className="text-xs text-slate-400">Intégrez rapidement vos fichiers prospects Auto, Habitation et VTC</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Download Template Banner */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Vous n'avez pas le modèle ?</h4>
              <p className="text-xs text-emerald-800">
                Téléchargez notre fichier modèle pré-formaté avec des exemples pour Auto, Habitation et VTC.
              </p>
            </div>

            <button
              onClick={downloadImportTemplateExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow flex items-center gap-2 shrink-0 transition"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le Modèle Excel</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center transition bg-slate-50 relative group">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {selectedFileName ? selectedFileName : 'Glissez-déposez votre fichier Excel / CSV ici'}
                </p>
                <p className="text-xs text-slate-500">Formats supportés : .xlsx, .xls, .csv</p>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4 text-xs font-bold text-slate-600 animate-pulse">
              Analyse et parsing du fichier Excel en cours...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Aperçu des prospects détectés ({parsedPreview.length})
                </h4>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Prêt à être importé
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Nom & Prénom</th>
                      <th className="p-2.5">Téléphone</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Ville</th>
                      <th className="p-2.5">Réf Devis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.type === 'AUTO' ? 'bg-blue-100 text-blue-800' :
                            item.type === 'HABITATION' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{item.prenom} {item.nom}</td>
                        <td className="p-2.5 text-slate-600 font-mono">{item.telephone}</td>
                        <td className="p-2.5 text-slate-600">{item.email}</td>
                        <td className="p-2.5 text-slate-600">{item.ville}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{item.referenceDevis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
          >
            Annuler
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={parsedPreview.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-700/30 transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider l'importation de ({parsedPreview.length}) leads</span>
          </button>
        </div>
      </div>
    </div>
  );
};
