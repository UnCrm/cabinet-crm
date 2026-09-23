import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  RefreshCw,
  Check,
  Image as ImageIcon,
  User,
  Palette,
  Trash2,
  Smile,
  Type
} from 'lucide-react';
import { User as UserType, getUserDisplayName } from '../types/crm';

interface AvatarCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  user: UserType;
  onSaveAvatar: (avatarUrl: string) => void;
}

type TabMode = 'ILLUSTRATED' | 'PHOTO' | 'INITIALS';

interface StyleOption {
  id: string;
  name: string;
  description: string;
  previewSeed: string;
}

const ILLUSTRATED_STYLES: StyleOption[] = [
  { id: 'lorelei', name: 'Illustrations Modernes', description: 'Visages expressifs et soignés', previewSeed: 'Felix' },
  { id: 'notionists', name: 'Style Notion', description: 'Design épuré et minimaliste', previewSeed: 'Aneka' },
  { id: 'avataaars', name: 'Style Cartoon', description: 'Personnages colorés et dynamiques', previewSeed: 'Milo' },
  { id: 'micah', name: 'Design Contemporain', description: 'Géométrie et couleurs actuelles', previewSeed: 'Caleb' },
  { id: 'personas', name: 'Profils Professionnels', description: 'Avatars sobres d\'entreprise', previewSeed: 'Sophia' },
  { id: 'bottts', name: 'Avatars Tech', description: 'Mascottes robotiques modernes', previewSeed: 'TechBot' },
  { id: 'adventurer', name: 'Aventurier', description: 'Style illustré créatif', previewSeed: 'Leo' },
  { id: 'thumbs', name: 'Smileys Stylisés', description: 'Avatars pop et sympathiques', previewSeed: 'Alex' }
];

const BG_COLORS = [
  { label: 'Bleu CRM', hex: '0284c7' },
  { label: 'Bleu Doux', hex: 'd1d4f9' },
  { label: 'Ciel', hex: 'b6e3f4' },
  { label: 'Lavande', hex: 'c0aede' },
  { label: 'Pêche', hex: 'ffdfbf' },
  { label: 'Rose Poudré', hex: 'ffd5dc' },
  { label: 'Émeraude', hex: '059669' },
  { label: 'Violet', hex: '7c3aed' },
  { label: 'Ardoise', hex: '1e293b' },
  { label: 'Gris Clair', hex: 'f1f5f9' }
];

const QUICK_PRESETS = [
  { style: 'lorelei', seed: 'Ambre', bg: 'b6e3f4', label: 'Ambre' },
  { style: 'lorelei', seed: 'Tarik', bg: 'c0aede', label: 'Tarik' },
  { style: 'notionists', seed: 'Jean', bg: 'f1f5f9', label: 'Jean' },
  { style: 'notionists', seed: 'Sophie', bg: 'd1d4f9', label: 'Sophie' },
  { style: 'avataaars', seed: 'Alexandre', bg: 'ffdfbf', label: 'Alexandre' },
  { style: 'avataaars', seed: 'Sarah', bg: 'ffd5dc', label: 'Sarah' },
  { style: 'micah', seed: 'Maxime', bg: '0284c7', label: 'Maxime' },
  { style: 'micah', seed: 'Camille', bg: 'c0aede', label: 'Camille' },
  { style: 'personas', seed: 'Thomas', bg: '1e293b', label: 'Thomas' },
  { style: 'personas', seed: 'Clara', bg: '059669', label: 'Clara' },
  { style: 'bottts', seed: 'CyberAgent', bg: '7c3aed', label: 'CyberAgent' },
  { style: 'adventurer', seed: 'Lucas', bg: 'ffdfbf', label: 'Lucas' }
];

const INITIALS_PALETTES = [
  { bg: '0284c7', color: 'ffffff', name: 'Océan' },
  { bg: '0f172a', color: 'ffffff', name: 'Nuit Noire' },
  { bg: '4f46e5', color: 'ffffff', name: 'Indigo' },
  { bg: '059669', color: 'ffffff', name: 'Forêt' },
  { bg: 'dc2626', color: 'ffffff', name: 'Rubis' },
  { bg: 'd97706', color: 'ffffff', name: 'Ambre' },
  { bg: '7c3aed', color: 'ffffff', name: 'Violet' },
  { bg: 'e11d48', color: 'ffffff', name: 'Cerise' }
];

export const AvatarCreatorModal: React.FC<AvatarCreatorModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  user,
  onSaveAvatar
}) => {
  if (!isOpen) return null;

  const displayName = getUserDisplayName(user);
  const defaultSeed = user.pseudo || user.prenom || 'Conseiller';

  const [activeTab, setActiveTab] = useState<TabMode>(() => {
    if (currentAvatarUrl?.startsWith('data:image')) return 'PHOTO';
    if (currentAvatarUrl?.includes('dicebear.com')) return 'ILLUSTRATED';
    return 'ILLUSTRATED';
  });

  // Selected avatar state
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(
    currentAvatarUrl || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(defaultSeed)}&backgroundColor=b6e3f4`
  );

  // Illustrated generator state
  const [selectedStyle, setSelectedStyle] = useState<string>('lorelei');
  const [seed, setSeed] = useState<string>(defaultSeed);
  const [selectedBgHex, setSelectedBgHex] = useState<string>('b6e3f4');

  // Photo state
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initials state
  const [initialsPalette, setInitialsPalette] = useState(INITIALS_PALETTES[0]);

  // Update illustrated avatar
  const updateIllustratedAvatar = (style: string, newSeed: string, bg: string) => {
    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(newSeed.trim() || 'Agent')}&backgroundColor=${bg}`;
    setSelectedAvatarUrl(url);
  };

  const handleStyleChange = (styleId: string) => {
    setSelectedStyle(styleId);
    updateIllustratedAvatar(styleId, seed, selectedBgHex);
  };

  const handleSeedChange = (newSeed: string) => {
    setSeed(newSeed);
    updateIllustratedAvatar(selectedStyle, newSeed, selectedBgHex);
  };

  const handleBgColorChange = (bgHex: string) => {
    setSelectedBgHex(bgHex);
    updateIllustratedAvatar(selectedStyle, seed, bgHex);
  };

  const handleRandomize = () => {
    const randomAdjectives = ['Super', 'Expert', 'Pro', 'Cap', 'Zen', 'Alpha', 'Star', 'Swift', 'Flash', 'Apex'];
    const randomSeed = `${randomAdjectives[Math.floor(Math.random() * randomAdjectives.length)]}-${Math.floor(Math.random() * 9999)}`;
    const randomBg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)].hex;
    setSeed(randomSeed);
    setSelectedBgHex(randomBg);
    updateIllustratedAvatar(selectedStyle, randomSeed, randomBg);
  };

  const handleSelectPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setSelectedStyle(preset.style);
    setSeed(preset.seed);
    setSelectedBgHex(preset.bg);
    updateIllustratedAvatar(preset.style, preset.seed, preset.bg);
  };

  // Process uploaded image file with canvas resize & compression
  const handleFileUpload = (file: File) => {
    setPhotoError(null);

    if (!file.type.startsWith('image/')) {
      setPhotoError('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP).');
      return;
    }

    // Limit original file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Le fichier dépasse la taille maximale autorisée (10 Mo).');
      return;
    }

    setIsProcessingPhoto(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        try {
          // Draw to canvas and scale to max 400x400 to keep localStorage optimal
          const maxDim = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
            setSelectedAvatarUrl(compressedBase64);
          } else {
            setSelectedAvatarUrl(event.target?.result as string);
          }
        } catch {
          setSelectedAvatarUrl(event.target?.result as string);
        } finally {
          setIsProcessingPhoto(false);
        }
      };
      img.onerror = () => {
        setPhotoError("Impossible de lire l'image sélectionnée.");
        setIsProcessingPhoto(false);
      };
      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setPhotoError("Erreur lors de l'importation de l'image.");
      setIsProcessingPhoto(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customPhotoUrl.trim()) return;
    setSelectedAvatarUrl(customPhotoUrl.trim());
    setCustomPhotoUrl('');
  };

  const handleSelectInitialsPalette = (palette: typeof INITIALS_PALETTES[0]) => {
    setInitialsPalette(palette);
    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${palette.bg}&color=${palette.color}&bold=true&size=256`;
    setSelectedAvatarUrl(url);
  };

  const handleSave = () => {
    onSaveAvatar(selectedAvatarUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/90 text-white flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-snug">
                Personnaliser mon Avatar & Photo de Profil
              </h2>
              <p className="text-xs text-slate-400">
                Pour <strong className="text-slate-200">{displayName}</strong> ({user.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Hero */}
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 py-5 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-5 justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={selectedAvatarUrl}
                  alt={displayName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white ring-2 ring-indigo-500/30"
                />
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <User className="w-3 h-3" />
                  <span>Aperçu en direct de votre profil</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{displayName}</h3>
                <p className="text-xs text-slate-500">
                  Cet avatar apparaîtra dans la barre de navigation, le chat et vos dossiers.
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRandomize}
                className="flex-1 sm:flex-none px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title="Générer un nouvel avatar au hasard"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Générer au hasard</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-b border-slate-200/80 -mb-5 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('ILLUSTRATED')}
              className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'ILLUSTRATED'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span>Avatar Illustré & Stylisé</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-semibold hidden md:inline">
                Sans photo
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PHOTO')}
              className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'PHOTO'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Importer une Photo</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-semibold hidden md:inline">
                Fichier réel
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INITIALS')}
              className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'INITIALS'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Initiales & Dégradé</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: ILLUSTRATED AVATAR */}
          {activeTab === 'ILLUSTRATED' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Quick Preset Avatars */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ⚡ Choix Rapide parmi notre sélection :
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {QUICK_PRESETS.map((preset, idx) => {
                    const presetUrl = `https://api.dicebear.com/7.x/${preset.style}/svg?seed=${encodeURIComponent(preset.seed)}&backgroundColor=${preset.bg}`;
                    const isSelected = selectedAvatarUrl === presetUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`group relative p-1.5 rounded-xl border-2 transition flex flex-col items-center gap-1 cursor-pointer bg-slate-50 hover:bg-white ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-300 bg-white shadow-sm'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        title={`Choisir le modèle ${preset.label}`}
                      >
                        <img
                          src={presetUrl}
                          alt={preset.label}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="text-[10px] font-semibold text-slate-600 truncate max-w-full">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  🎨 Choisir une collection graphique :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ILLUSTRATED_STYLES.map((st) => {
                    const isStyleActive = selectedStyle === st.id;
                    const sampleUrl = `https://api.dicebear.com/7.x/${st.id}/svg?seed=${encodeURIComponent(st.previewSeed)}&backgroundColor=${selectedBgHex}`;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleStyleChange(st.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                          isStyleActive
                            ? 'bg-indigo-50/80 border-indigo-600 ring-1 ring-indigo-500 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <img
                          src={sampleUrl}
                          alt={st.name}
                          className="w-8 h-8 rounded-lg object-cover bg-white shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{st.name}</p>
                          <p className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">{st.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seed / Variation name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Identifiant / Graine du personnage</span>
                    <button
                      type="button"
                      onClick={() => handleSeedChange(displayName)}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Utiliser mon nom
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => handleSeedChange(e.target.value)}
                      placeholder="Ex: Alexandre, Julie, Pro..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Chaque mot donne un visage et des accessoires uniques !
                  </p>
                </div>

                {/* Background color palette */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    <span>Couleur de fond de l'avatar</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {BG_COLORS.map((bg) => {
                      const isColorActive = selectedBgHex === bg.hex;
                      return (
                        <button
                          key={bg.hex}
                          type="button"
                          onClick={() => handleBgColorChange(bg.hex)}
                          className={`w-7 h-7 rounded-full transition flex items-center justify-center cursor-pointer border ${
                            isColorActive
                              ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110 shadow-xs border-indigo-700'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: `#${bg.hex}` }}
                          title={bg.label}
                        >
                          {isColorActive && (
                            <Check className={`w-3.5 h-3.5 ${bg.hex === 'f1f5f9' || bg.hex === 'd1d4f9' || bg.hex === 'b6e3f4' || bg.hex === 'ffdfbf' || bg.hex === 'ffd5dc' ? 'text-slate-800' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD PHOTO */}
          {activeTab === 'PHOTO' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-8 text-center cursor-pointer transition space-y-3 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 bg-white text-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-md group-hover:scale-110 transition border border-indigo-100">
                  <Upload className="w-7 h-7" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Cliquez pour choisir une photo ou glissez-déposez le fichier ici
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formats acceptés : PNG, JPG, JPEG, WebP (redimensionnement automatique optimal)
                  </p>
                </div>

                {isProcessingPhoto && (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-white px-3 py-1 rounded-full shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Traitement et optimisation de l'image...</span>
                  </div>
                )}
              </div>

              {photoError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  ⚠️ {photoError}
                </div>
              )}

              {/* Or URL input */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ou renseigner l'URL directe d'une photo web :
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... ou https://monsite.com/photo.jpg"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customPhotoUrl.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Valider l'URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INITIALS & PALETTES */}
          {activeTab === 'INITIALS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <p className="text-xs text-slate-600 mb-4">
                  Un style simple et moderne affichant vos initiales ou votre pseudo avec un arrière-plan coloré élégant :
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {INITIALS_PALETTES.map((pal) => {
                    const sampleUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${pal.bg}&color=${pal.color}&bold=true&size=128`;
                    const isCurrent = selectedAvatarUrl === sampleUrl;
                    return (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => handleSelectInitialsPalette(pal)}
                        className={`p-3 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                          isCurrent
                            ? 'border-indigo-600 ring-2 ring-indigo-300 bg-indigo-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={sampleUrl}
                          alt={pal.name}
                          className="w-10 h-10 rounded-xl object-cover shadow-2xs shrink-0"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">{pal.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">#{pal.bg}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              const resetUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff`;
              setSelectedAvatarUrl(resetUrl);
            }}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Réinitialiser par défaut</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer cet avatar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
