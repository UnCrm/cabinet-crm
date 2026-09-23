import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  Edit2, 
  Check, 
  X, 
  File, 
  Image as ImageIcon, 
  AlertCircle, 
  FolderArchive,
  Sparkles
} from 'lucide-react';
import { LeadDocument, LeadType } from '../types/crm';

interface LeadDocumentsTabProps {
  documents: LeadDocument[];
  onChangeDocuments: (docs: LeadDocument[]) => void;
  leadType?: LeadType;
  readOnly?: boolean;
}

const DOCUMENT_SUGGESTIONS_BY_TYPE: Record<string, string[]> = {
  AUTO: [
    'Permis de conduire recto-verso',
    'Carte grise (Certificat d\'immatriculation)',
    'Relevé d\'information (36 mois)',
    'Pièce d\'identité (CNI / Passeport)',
    'Justificatif de domicile (- 3 mois)',
    'RIB bancaire pour prélèvement',
    'Contrat d\'assurance signé',
    'Constat amiable de sinistre'
  ],
  HABITATION: [
    'Bail de location / Titre de propriété',
    'Pièce d\'identité (CNI / Passeport)',
    'Justificatif de domicile actuel',
    'RIB bancaire',
    'Attestation de résiliation précédente',
    'Facture d\'objets de valeur / Expertise',
    'Contrat MRH signé'
  ],
  VTC: [
    'Carte professionnelle VTC recto-verso',
    'Permis de conduire professionnel',
    'Carte grise du véhicule VTC',
    'Extrait Kbis (- 3 mois)',
    'Relevé d\'information d\'assurance',
    'Attestation RC Professionnelle',
    'Pièce d\'identité du gérant',
    'RIB société',
    'Contrat d\'adhésion plateforme (Uber/Bolt)'
  ]
};

export const LeadDocumentsTab: React.FC<LeadDocumentsTabProps> = ({
  documents,
  onChangeDocuments,
  leadType = 'AUTO',
  readOnly = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // État de la modal de nomination du document
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    dataUrl: string;
  } | null>(null);

  const [docCustomName, setDocCustomName] = useState('');
  const [docCategory, setDocCategory] = useState<LeadDocument['category']>('AUTRE');
  const [docNotes, setDocNotes] = useState('');
  const [nameError, setNameError] = useState('');

  // État pour renommer un document existant
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Aperçu / Visualisation
  const [previewDoc, setPreviewDoc] = useState<LeadDocument | null>(null);

  const quickSuggestions = DOCUMENT_SUGGESTIONS_BY_TYPE[leadType] || DOCUMENT_SUGGESTIONS_BY_TYPE.AUTO;

  const handleFileChosen = (file: File) => {
    // Vérification taille max (ex: 15Mo)
    if (file.size > 15 * 1024 * 1024) {
      alert("Le fichier dépasse la limite maximale recommandée de 15 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingFile({ file, dataUrl });

      // Suggestion automatique de nom propre basée sur le nom de fichier sans extension
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setDocCustomName(rawName.charAt(0).toUpperCase() + rawName.slice(1));
      setDocNotes('');
      setNameError('');

      // Auto-catégorisation
      const lower = file.name.toLowerCase();
      if (lower.includes('permis')) {
        setDocCategory('PERMIS');
      } else if (lower.includes('grise') || lower.includes('immat')) {
        setDocCategory('CARTE_GRISE');
      } else if (lower.includes('releve') || lower.includes('ri')) {
        setDocCategory('RELEVE_INFORMATION');
      } else if (lower.includes('cni') || lower.includes('identite') || lower.includes('passeport')) {
        setDocCategory('PIECE_IDENTITE');
      } else if (lower.includes('domicile') || lower.includes('facture') || lower.includes('edf')) {
        setDocCategory('JUSTIFICATIF_DOMICILE');
      } else if (lower.includes('kbis')) {
        setDocCategory('KBIS');
      } else if (lower.includes('rib')) {
        setDocCategory('RIB');
      } else if (lower.includes('contrat') || lower.includes('signe')) {
        setDocCategory('CONTRAT_SIGNE');
      } else {
        setDocCategory('AUTRE');
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmAddDocument = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!docCustomName.trim()) {
      setNameError('Veuillez obligatoirement nommer ce document.');
      return;
    }

    if (!pendingFile) return;

    const newDoc: LeadDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: docCustomName.trim(),
      fileName: pendingFile.file.name,
      fileType: pendingFile.file.type || 'application/octet-stream',
      fileSize: pendingFile.file.size,
      uploadedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      category: docCategory,
      notes: docNotes.trim() || undefined,
      dataUrl: pendingFile.dataUrl
    };

    onChangeDocuments([...documents, newDoc]);
    setPendingFile(null);
    setDocCustomName('');
    setDocNotes('');
    setNameError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document du dossier ?")) {
      onChangeDocuments(documents.filter(d => d.id !== id));
      if (previewDoc?.id === id) setPreviewDoc(null);
    }
  };

  const handleStartRename = (doc: LeadDocument) => {
    setEditingDocId(doc.id);
    setEditingName(doc.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editingName.trim()) return;
    onChangeDocuments(documents.map(d => d.id === id ? { ...d, name: editingName.trim() } : d));
    setEditingDocId(null);
    setEditingName('');
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Ko';
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getCategoryBadge = (cat?: LeadDocument['category']) => {
    switch (cat) {
      case 'PERMIS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Permis</span>;
      case 'CARTE_GRISE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Carte Grise</span>;
      case 'RELEVE_INFORMATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Relevé Info</span>;
      case 'PIECE_IDENTITE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Identité</span>;
      case 'JUSTIFICATIF_DOMICILE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">Domicile</span>;
      case 'KBIS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Kbis / Pro</span>;
      case 'RIB':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">RIB</span>;
      case 'CONTRAT_SIGNE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">Contrat Signé</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Autre pièce</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Documents relatifs au dossier
              <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            </h4>
            <p className="text-xs text-slate-600">
              Pièces justificatives requises (Permis, Carte Grise, RI, CNI, RIB, Kbis...). Chaque document uploadé doit être obligatoirement nommé.
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Ajouter un document</span>
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileChosen(e.target.files[0]);
          }
        }}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
      />

      {/* Drag and Drop Zone (if not in read-only mode) */}
      {!readOnly && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50/80 scale-[1.01]' 
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-blue-600">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800">
              Glissez-déposez vos fichiers ici, ou <span className="text-blue-600 underline">parcourez votre ordinateur</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Formats supportés : PDF, JPEG, PNG, DOCX (Max 15 Mo par document)
            </p>
          </div>
        </div>
      )}

      {/* MODAL / DIALOGUE DE NOMMAGE OBLIGATOIRE DU DOCUMENT */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-amber-300" />
                <h4 className="font-bold text-sm">Nommer le document à ajouter</h4>
              </div>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* File Info */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
                <div className="flex items-center space-x-2.5 truncate">
                  <div className="p-2 bg-white rounded-lg text-blue-600 shadow-2xs">
                    {pendingFile.file.type.includes('image') ? <ImageIcon className="w-4 h-4" /> : <File className="w-4 h-4" />}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 truncate" title={pendingFile.file.name}>{pendingFile.file.name}</p>
                    <span className="text-[11px] text-slate-500">{formatFileSize(pendingFile.file.size)}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded shrink-0">
                  Prêt à uploader
                </span>
              </div>

              {/* Champ Nom personnalisé (OBLIGATOIRE) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Nom du document * <span className="text-red-500 font-normal text-[11px]">(Obligatoire)</span></span>
                  <span className="text-[11px] text-slate-400 font-normal">Ex: Permis de conduire recto-verso</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={docCustomName}
                  onChange={(e) => {
                    setDocCustomName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="Ex : Permis de conduire recto/verso, Carte Grise..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 outline-none font-semibold ${
                    nameError 
                      ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30 text-red-900' 
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900'
                  }`}
                />
                {nameError && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {nameError}
                  </p>
                )}
              </div>

              {/* Presets rapides de nomination */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Suggestions rapides de noms :
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setDocCustomName(suggestion);
                        setNameError('');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 rounded-lg border border-slate-200 text-[11px] transition text-left cursor-pointer"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catégorie */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Catégorie de document</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as LeadDocument['category'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="PERMIS">Permis de conduire</option>
                  <option value="CARTE_GRISE">Carte grise (Certificat d'immatriculation)</option>
                  <option value="RELEVE_INFORMATION">Relevé d'information (3 ans / Sinistres)</option>
                  <option value="PIECE_IDENTITE">Pièce d'identité (CNI / Passeport / Titre séjour)</option>
                  <option value="JUSTIFICATIF_DOMICILE">Justificatif de domicile</option>
                  <option value="RIB">RIB (Relevé d'identité bancaire)</option>
                  <option value="KBIS">Extrait Kbis / Statuts société</option>
                  <option value="CONTRAT_SIGNE">Contrat d'assurance signé</option>
                  <option value="AUTRE">Autre pièce justificative</option>
                </select>
              </div>

              {/* Notes complémentaires */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Note ou observation (facultatif)</label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Ex : Document vérifié le 09/09, date validité 2028..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmAddDocument()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider et Enregistrer</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* LISTE DES DOCUMENTS DU DOSSIER */}
      {documents.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Aucun document n'a été ajouté à ce dossier</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Vous pouvez ajouter les justificatifs du prospect (permis, carte grise, relevé d'information, CNI...) pour constituer le dossier complet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc) => {
            const isEditingThis = editingDocId === doc.id;
            const isImage = doc.fileType?.includes('image');
            const isPdf = doc.fileType?.includes('pdf');

            return (
              <div
                key={doc.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-xs ${
                      isPdf ? 'bg-red-600' : isImage ? 'bg-blue-600' : 'bg-slate-700'
                    }`}>
                      {isPdf ? <FileText className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <File className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      {/* Name of document (editable) */}
                      {isEditingThis ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-xs font-bold px-2 py-1 rounded border border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(doc.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="Sauvegarder le nom"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDocId(null)}
                            className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                            title="Annuler"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <h5 className="text-xs font-extrabold text-slate-900 leading-tight">
                            {doc.name}
                          </h5>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleStartRename(doc)}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded"
                              title="Renommer ce document"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* File original name & size */}
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={doc.fileName}>
                        {doc.fileName} • <span className="font-semibold">{formatFileSize(doc.fileSize)}</span>
                      </p>

                      {/* Upload Date & Category */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {getCategoryBadge(doc.category)}
                        <span className="text-[10px] text-slate-400">
                          {doc.uploadedAt}
                        </span>
                      </div>

                      {doc.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1">
                          « {doc.notes} »
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {/* Visualiser / Ouvrir */}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Voir</span>
                    </button>

                    {/* Télécharger */}
                    {doc.dataUrl && (
                      <a
                        href={doc.dataUrl}
                        download={doc.fileName || `${doc.name}.pdf`}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>Télécharger</span>
                      </a>
                    )}
                  </div>

                  {/* Supprimer */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Supprimer ce document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE PREVISUALISATION DU DOCUMENT */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Top Bar */}
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{previewDoc.name}</h4>
                  <p className="text-[11px] text-slate-400">{previewDoc.fileName} • {formatFileSize(previewDoc.fileSize)} • {previewDoc.uploadedAt}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {previewDoc.dataUrl && (
                  <a
                    href={previewDoc.dataUrl}
                    download={previewDoc.fileName || `${previewDoc.name}.pdf`}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {previewDoc.dataUrl ? (
                previewDoc.fileType?.includes('image') ? (
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.name}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-300"
                  />
                ) : previewDoc.fileType?.includes('pdf') ? (
                  <iframe
                    src={previewDoc.dataUrl}
                    title={previewDoc.name}
                    className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white"
                  />
                ) : (
                  <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <File className="w-12 h-12 text-slate-400 mx-auto" />
                    <h5 className="font-bold text-sm text-slate-800">{previewDoc.name}</h5>
                    <p className="text-xs text-slate-500">
                      Ce type de fichier ({previewDoc.fileType}) ne peut pas être affiché directement dans le navigateur.
                    </p>
                    <a
                      href={previewDoc.dataUrl}
                      download={previewDoc.fileName || `${previewDoc.name}.pdf`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger le fichier pour le consulter</span>
                    </a>
                  </div>
                )
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Contenu non disponible pour prévisualisation directe</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
