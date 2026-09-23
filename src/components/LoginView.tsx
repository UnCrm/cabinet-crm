import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, CheckSquare } from 'lucide-react';
import { User, CabinetInfo } from '../types/crm';
import { loadRememberedCredentials, saveRememberedCredentials, loadUsers, saveUsers } from '../utils/storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import crmBgImage from '../assets/images/crm_login_background_1789004121123.jpg';

interface LoginViewProps {
  users: User[];
  cabinetInfo?: CabinetInfo;
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, cabinetInfo, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Pre-fill remembered email on mount if previously saved by the user
  useEffect(() => {
    const saved = loadRememberedCredentials();
    if (saved && saved.email) {
      setEmail(saved.email);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Gather all local users from storage + props
      let currentUsersList = [...users];
      const localUsers = loadUsers();
      if (Array.isArray(localUsers) && localUsers.length > 0) {
        const map = new Map<string, User>();
        currentUsersList.forEach(u => map.set(u.email.toLowerCase().trim(), u));
        localUsers.forEach(u => map.set(u.email.toLowerCase().trim(), u));
        currentUsersList = Array.from(map.values());
      }

      // 2. Flexible matching (by exact email or username prefix or pseudo)
      let matchedUser = currentUsersList.find(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uPseudo = (u.pseudo || '').trim().toLowerCase();
        const emailPrefix = uEmail.split('@')[0];
        return uEmail === cleanEmail || emailPrefix === cleanEmail || (uPseudo && uPseudo === cleanEmail);
      });

      // 3. If not found locally, query Firestore 'users' directly in case it was created on another device / session
      if (!matchedUser) {
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          if (!snapshot.empty) {
            const remoteUsers: User[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as User;
              if (data && data.email) {
                remoteUsers.push(data);
              }
            });
            
            matchedUser = remoteUsers.find(u => {
              const uEmail = (u.email || '').trim().toLowerCase();
              const uPseudo = (u.pseudo || '').trim().toLowerCase();
              const emailPrefix = uEmail.split('@')[0];
              return uEmail === cleanEmail || emailPrefix === cleanEmail || (uPseudo && uPseudo === cleanEmail);
            });

            if (matchedUser) {
              // Update local cache so it persists offline
              const updatedList = [...currentUsersList.filter(u => u.id !== matchedUser!.id), matchedUser];
              saveUsers(updatedList);
            }
          }
        } catch (cloudErr) {
          console.warn('Erreur vérification cloud Firestore lors du login:', cloudErr);
        }
      }

      if (!matchedUser) {
        setError('Identifiant ou mot de passe incorrect.');
        setIsLoading(false);
        return;
      }

      if (matchedUser.status === 'INACTIF') {
        setError('Ce compte est actuellement désactivé. Veuillez contacter un administrateur du cabinet.');
        setIsLoading(false);
        return;
      }

      const expectedPassword = matchedUser.password || 'Horizon2026!';
      if (password !== expectedPassword) {
        setError('Identifiant ou mot de passe incorrect.');
        setIsLoading(false);
        return;
      }

      // Persist or clear remembered email (strictly email only, never password)
      if (rememberMe) {
        saveRememberedCredentials({
          email: matchedUser.email,
          rememberEmail: true
        });
      } else {
        saveRememberedCredentials(null);
      }

      // Success
      setIsLoading(false);
      onLogin(matchedUser);
    } catch (err: any) {
      console.error('Erreur lors de la tentative de connexion:', err);
      setError('Une erreur est survenue lors de la vérification de vos identifiants.');
      setIsLoading(false);
    }
  };

  const hasLogo = Boolean(cabinetInfo?.logoUrl && cabinetInfo.logoUrl.trim() !== '' && !logoLoadError);

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background CRM Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={crmBgImage}
          alt="CRM Courtage Arrière-plan"
          className="w-full h-full object-cover object-center scale-105 transition duration-700"
          referrerPolicy="no-referrer"
        />
        {/* Dark Modern Overlay with subtle blur for readable contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950/92 backdrop-blur-[3px]" />
      </div>

      {/* Decorative Glow Elements */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        {/* Brand Logo - Uploaded on Infos Cabinet */}
        {hasLogo ? (
          <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 p-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-2xl shadow-black/40 mb-4 border border-white/50 ring-4 ring-white/20 hover:scale-105 transition duration-300 overflow-hidden mx-auto">
            <img
              src={cabinetInfo?.logoUrl}
              alt={cabinetInfo?.nomCabinet || 'Logo Cabinet'}
              className="w-full h-full object-contain rounded-full"
              referrerPolicy="no-referrer"
              onError={() => setLogoLoadError(true)}
            />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-full shadow-xl shadow-indigo-500/30 mb-4 border border-indigo-400/30 ring-4 ring-indigo-500/20 mx-auto">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          {cabinetInfo?.nomCabinet || 'HORIZON ASSURANCES'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto drop-shadow-xs">
          {cabinetInfo?.slogan || 'Plateforme sécurisée de Gestion de Portefeuille & Lead CRM'}
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white/95 backdrop-blur-md py-7 px-6 shadow-2xl shadow-black/40 rounded-3xl sm:px-9 border border-white/60">
          <form className="space-y-4" onSubmit={handleSubmit} method="POST" action="#">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 font-semibold leading-relaxed">
                  {error}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="crm-email-input">
                Adresse E-mail Professionnelle
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="crm-email-input"
                  name="username"
                  autoComplete="username email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@horizon-courtage.fr"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="crm-password-input">
                  Mot de passe
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Protégé SSL 256-bit</span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="crm-password-input"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Option Mémoriser mon adresse e-mail */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${rememberMe ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                  {rememberMe && <CheckSquare className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition">
                  Mémoriser mon adresse e-mail
                </span>
              </label>

              <span className="text-[11px] text-slate-400 font-medium">
                Saisie sécurisée
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Se Connecter</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
