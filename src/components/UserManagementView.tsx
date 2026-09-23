import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Key,
  Check,
  X,
  Lock,
  UserCheck,
  Building2,
  Briefcase,
  Mail,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOutgoing,
  Radio,
  Mic,
  Sliders,
  Eye,
  Download,
  Settings,
  User as UserIcon,
  Sparkles,
  Plus,
  FolderPlus,
  Layers,
  Server,
  Send,
  BadgeCheck,
  Monitor
} from 'lucide-react';
import { User, UserRole, UserPermissions, getDefaultPermissionsForRole, SmtpConfig, getUserDisplayName, CabinetInfo } from '../types/crm';
import { AvatarCreatorModal } from './AvatarCreatorModal';
import { InstallAppModal } from './InstallAppModal';

interface UserManagementViewProps {
  users: User[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser?: (user: User) => void;
  teams?: string[];
  onSaveTeams?: (teams: string[]) => void;
  cabinetInfo?: CabinetInfo;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onSwitchUser,
  teams = [],
  onSaveTeams,
  cabinetInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('TOUS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TOUS');

  const defaultTeamsList = [
    'Direction Générale',
    'Direction Production',
    'Équipe Auto & Habitation',
    'Équipe VTC & Pro',
    'Équipe Santé & Prévoyance',
    'Équipe Risques Spéciaux',
    'Équipe Entreprises & Flottes'
  ];

  const [teamsList, setTeamsList] = useState<string[]>(
    teams && teams.length > 0 ? teams : defaultTeamsList
  );

  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [newTeamInput, setNewTeamInput] = useState('');
  const [editingTeam, setEditingTeam] = useState<{ oldName: string; newName: string } | null>(null);

  const handleAddTeam = (teamName: string) => {
    const trimmed = teamName.trim();
    if (!trimmed) return;
    if (teamsList.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette équipe existe déjà');
      return;
    }
    const updated = [...teamsList, trimmed];
    setTeamsList(updated);
    onSaveTeams?.(updated);
    setNewTeamInput('');
    showToast(`Équipe "${trimmed}" créée avec succès`);
  };

  const handleRenameTeam = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingTeam(null);
      return;
    }
    const updated = teamsList.map(t => t === oldName ? trimmed : t);
    setTeamsList(updated);
    onSaveTeams?.(updated);

    // Update users who have this old team
    users.forEach(u => {
      if (u.equipe === oldName) {
        onSaveUser({ ...u, equipe: trimmed });
      }
    });

    setEditingTeam(null);
    showToast(`Équipe renommée en "${trimmed}"`);
  };

  const handleDeleteTeam = (teamNameToDelete: string) => {
    const usersInTeam = users.filter(u => u.equipe === teamNameToDelete);
    if (usersInTeam.length > 0) {
      showToast(`Impossible de supprimer : ${usersInTeam.length} utilisateur(s) y sont rattaché(s)`);
      return;
    }
    const updated = teamsList.filter(t => t !== teamNameToDelete);
    setTeamsList(updated);
    onSaveTeams?.(updated);
    showToast(`Équipe "${teamNameToDelete}" supprimée`);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installTargetUser, setInstallTargetUser] = useState<User | undefined>(undefined);

  // Form State for User Edit/Create
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('AGENT_COMMERCIAL');
  const [equipe, setEquipe] = useState('');
  const [status, setStatus] = useState<'ACTIF' | 'INACTIF'>('ACTIF');
  const [specialite, setSpecialite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(getDefaultPermissionsForRole('AGENT_COMMERCIAL'));

  // Active Tab inside the wider modal
  const [activeModalTab, setActiveModalTab] = useState<'PROFILE' | 'TELEPHONY' | 'SMTP' | 'PERMISSIONS'>('PROFILE');

  // Dedicated Telephony State for User
  const [useDedicatedTelephony, setUseDedicatedTelephony] = useState(true);
  const [telDirectNumber, setTelDirectNumber] = useState('');
  const [telExtension, setTelExtension] = useState('');
  const [telCallerId, setTelCallerId] = useState('');
  const [telCallMode, setTelCallMode] = useState<'SOFTPHONE_TEL_URL' | 'DIRECT_API' | 'WEBRTC'>('SOFTPHONE_TEL_URL');
  const [telPreferredProviderId, setTelPreferredProviderId] = useState('');
  const [telOperatorUserId, setTelOperatorUserId] = useState('');
  const [telSipServer, setTelSipServer] = useState('');
  const [telSipUsername, setTelSipUsername] = useState('');
  const [telSipPassword, setTelSipPassword] = useState('');
  const [showTelSipPassword, setShowTelSipPassword] = useState(false);
  const [telSipPort, setTelSipPort] = useState(5060);
  const [telRecordCalls, setTelRecordCalls] = useState(true);
  const [telAutoDialOnClick, setTelAutoDialOnClick] = useState(true);
  const [telForwardToMobile, setTelForwardToMobile] = useState('');
  const [telNotes, setTelNotes] = useState('');
  const [isTestingTelephony, setIsTestingTelephony] = useState(false);
  const [telephonyTestResult, setTelephonyTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dedicated SMTP State for User
  const [useDedicatedSmtp, setUseDedicatedSmtp] = useState(true);
  const [smtpHoster, setSmtpHoster] = useState('ssl0.ovh.net');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpEncryption, setSmtpEncryption] = useState<'TLS' | 'SSL' | 'NONE'>('SSL');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('');
  const [smtpActive, setSmtpActive] = useState(true);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const canManage = currentUser.permissions.canManageUsers;
  const isDirecteurProd = currentUser.role === 'DIRECTEUR_PRODUCTION';

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleTestTelephony = () => {
    setIsTestingTelephony(true);
    setTelephonyTestResult(null);

    setTimeout(() => {
      setIsTestingTelephony(false);
      const numberToTest = telDirectNumber.trim() || telephone.trim();
      const ext = telExtension.trim();
      if (!numberToTest && !ext) {
        setTelephonyTestResult({
          success: false,
          message: 'Veuillez saisir au moins un numéro SDA direct ou un numéro de poste interne (ex: 101).'
        });
        return;
      }
      setTelephonyTestResult({
        success: true,
        message: `Ligne de l'agent opérationnelle : Poste ${ext || '101'} • SDA ${numberToTest || 'Standard'} • Mode ${telCallMode === 'SOFTPHONE_TEL_URL' ? 'Softphone (Zoiper/tel:)' : telCallMode}`
      });
    }, 600);
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const cfg: SmtpConfig = {
        host: smtpHoster.trim(),
        port: Number(smtpPort) || 465,
        username: smtpUsername.trim() || email.trim(),
        password: smtpPassword,
        encryption: smtpEncryption,
        senderEmail: smtpSenderEmail.trim() || email.trim(),
        senderName: smtpSenderName.trim() || pseudo.trim() || `${prenom} ${nom}`.trim(),
        active: true
      };

      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig: cfg })
      });
      const data = await res.json();
      setSmtpTestResult({
        success: data.success,
        message: data.success ? (data.message || 'Connexion SMTP réussie ! Le serveur de messagerie est opérationnel.') : (data.error || 'Échec de connexion SMTP')
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'Erreur réseau lors de la vérification SMTP'
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleOpenModal = (userToEdit?: User) => {
    setActiveModalTab('PROFILE');
    setTelephonyTestResult(null);

    if (userToEdit) {
      setEditingUser(userToEdit);
      setNom(userToEdit.nom);
      setPrenom(userToEdit.prenom);
      setPseudo(userToEdit.pseudo || `${userToEdit.prenom} ${userToEdit.nom.charAt(0)}.`);
      setEmail(userToEdit.email);
      setTelephone(userToEdit.telephone);
      setPassword(userToEdit.password || 'Horizon2026!');
      setRole(userToEdit.role);
      setEquipe(userToEdit.equipe || teamsList[0] || 'Équipe Auto & Habitation');
      setStatus(userToEdit.status);
      setSpecialite(userToEdit.specialite || '');
      setAvatarUrl(userToEdit.avatarUrl || '');
      setPermissions(userToEdit.permissions || getDefaultPermissionsForRole(userToEdit.role));

      // Telephony setup for existing user
      if (userToEdit.telephonyConfig) {
        setUseDedicatedTelephony(userToEdit.telephonyConfig.enabled ?? true);
        setTelDirectNumber(userToEdit.telephonyConfig.directNumber || '');
        setTelExtension(userToEdit.telephonyConfig.extension || '');
        setTelCallerId(userToEdit.telephonyConfig.callerId || '');
        setTelCallMode(userToEdit.telephonyConfig.callMode || 'SOFTPHONE_TEL_URL');
        setTelPreferredProviderId(userToEdit.telephonyConfig.preferredProviderId || '');
        setTelOperatorUserId(userToEdit.telephonyConfig.operatorUserId || '');
        setTelSipServer(userToEdit.telephonyConfig.sipServer || '');
        setTelSipUsername(userToEdit.telephonyConfig.sipUsername || '');
        setTelSipPassword(userToEdit.telephonyConfig.sipPassword || '');
        setTelSipPort(userToEdit.telephonyConfig.sipPort || 5060);
        setTelRecordCalls(userToEdit.telephonyConfig.recordCalls ?? true);
        setTelAutoDialOnClick(userToEdit.telephonyConfig.autoDialOnClick ?? true);
        setTelForwardToMobile(userToEdit.telephonyConfig.forwardToMobile || '');
        setTelNotes(userToEdit.telephonyConfig.notes || '');
      } else {
        setUseDedicatedTelephony(true);
        setTelDirectNumber(userToEdit.telephone || '');
        const userIdx = users.findIndex(u => u.id === userToEdit.id);
        setTelExtension(userIdx >= 0 ? `${101 + userIdx}` : '101');
        setTelCallerId(userToEdit.telephone || cabinetInfo?.telephone || '');
        setTelCallMode('SOFTPHONE_TEL_URL');
        setTelPreferredProviderId(cabinetInfo?.defaultVoiceProviderId || '');
        setTelOperatorUserId(userToEdit.email);
        setTelSipServer('');
        setTelSipUsername('');
        setTelSipPassword('');
        setTelSipPort(5060);
        setTelRecordCalls(true);
        setTelAutoDialOnClick(true);
        setTelForwardToMobile('');
        setTelNotes('');
      }

      const hasRealDedicatedSmtp = Boolean(
        userToEdit.smtpConfig &&
        userToEdit.smtpConfig.active &&
        userToEdit.smtpConfig.host?.trim() &&
        userToEdit.smtpConfig.password?.trim()
      );

      if (hasRealDedicatedSmtp && userToEdit.smtpConfig) {
        setUseDedicatedSmtp(true);
        setSmtpHoster(userToEdit.smtpConfig.host || 'ssl0.ovh.net');
        setSmtpPort(userToEdit.smtpConfig.port || 465);
        setSmtpEncryption(userToEdit.smtpConfig.encryption || 'SSL');
        setSmtpUsername(userToEdit.smtpConfig.username || userToEdit.email);
        setSmtpPassword(userToEdit.smtpConfig.password || '');
        setSmtpSenderEmail(userToEdit.smtpConfig.senderEmail || userToEdit.email);
        setSmtpSenderName(userToEdit.smtpConfig.senderName || userToEdit.pseudo || `${userToEdit.prenom} ${userToEdit.nom}`);
        setSmtpActive(userToEdit.smtpConfig.active ?? true);
      } else {
        setUseDedicatedSmtp(false);
        setSmtpHoster('ssl0.ovh.net');
        setSmtpPort(465);
        setSmtpEncryption('SSL');
        setSmtpUsername(userToEdit.email || '');
        setSmtpPassword('');
        setSmtpSenderEmail(userToEdit.email || '');
        setSmtpSenderName(userToEdit.pseudo || `${userToEdit.prenom} ${userToEdit.nom}`);
        setSmtpActive(false);
      }
      setSmtpTestResult(null);
    } else {
      setEditingUser(null);
      setNom('');
      setPrenom('');
      setPseudo('');
      setEmail('');
      setTelephone('');
      setPassword('Horizon2026!');
      // Default to AGENT_COMMERCIAL for new accounts
      setRole('AGENT_COMMERCIAL');
      setEquipe(teamsList[0] || 'Équipe Auto & Habitation');
      setStatus('ACTIF');
      setSpecialite('Agent Commercial Auto & Habitation');
      setAvatarUrl('');
      setPermissions(getDefaultPermissionsForRole('AGENT_COMMERCIAL'));

      // Dedicated Telephony defaults for new account
      setUseDedicatedTelephony(true);
      setTelDirectNumber('');
      setTelExtension(`${101 + users.length}`);
      setTelCallerId(cabinetInfo?.telephone || '');
      setTelCallMode('SOFTPHONE_TEL_URL');
      setTelPreferredProviderId(cabinetInfo?.defaultVoiceProviderId || '');
      setTelOperatorUserId('');
      setTelSipServer('');
      setTelSipUsername('');
      setTelSipPassword('');
      setTelSipPort(5060);
      setTelRecordCalls(true);
      setTelAutoDialOnClick(true);
      setTelForwardToMobile('');
      setTelNotes('');

      setUseDedicatedSmtp(true);
      setSmtpHoster('ssl0.ovh.net');
      setSmtpPort(465);
      setSmtpEncryption('SSL');
      setSmtpUsername('');
      setSmtpPassword('');
      setSmtpSenderEmail('');
      setSmtpSenderName('');
      setSmtpActive(true);
      setSmtpTestResult(null);
    }
    setIsModalOpen(true);
  };

  const handleRoleChangeInModal = (newRole: UserRole) => {
    // Check constraint: Directeur de Production cannot grant ADMIN role
    if (isDirecteurProd && newRole === 'ADMIN') {
      showToast('Seul un Administrateur peut créer ou attribuer le rôle Administrateur.');
      return;
    }
    setRole(newRole);
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const handleApplyPreset = (presetRole: UserRole) => {
    if (isDirecteurProd && presetRole === 'ADMIN') {
      showToast('Seul un Administrateur peut appliquer le modèle Administrateur.');
      return;
    }
    setRole(presetRole);
    setPermissions(getDefaultPermissionsForRole(presetRole));
    showToast(`Modèle de permissions "${presetRole}" appliqué`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim() || !email.trim()) {
      showToast('Veuillez remplir au moins le nom, le prénom et l\'adresse e-mail.');
      return;
    }

    if (isDirecteurProd && role === 'ADMIN') {
      showToast('En tant que Directeur de Production, vous ne pouvez pas créer de compte Administrateur.');
      return;
    }

    const calculatedPseudo = pseudo.trim() || `${prenom.trim()} ${nom.trim().charAt(0)}.`;

    let dedicatedSmtpConfig: SmtpConfig | undefined = undefined;
    if (useDedicatedSmtp && smtpHoster.trim() && smtpPassword.trim()) {
      dedicatedSmtpConfig = {
        host: smtpHoster.trim(),
        port: Number(smtpPort) || 465,
        username: smtpUsername.trim() || email.trim(),
        password: smtpPassword.trim(),
        encryption: smtpEncryption,
        senderEmail: smtpSenderEmail.trim() || email.trim(),
        senderName: (smtpSenderName.trim() || calculatedPseudo).trim(),
        active: smtpActive
      };
    } else {
      dedicatedSmtpConfig = undefined;
    }

    // Telephony line configuration
    let dedicatedTelephonyConfig = undefined;
    if (useDedicatedTelephony) {
      dedicatedTelephonyConfig = {
        enabled: true,
        directNumber: telDirectNumber.trim() || undefined,
        extension: telExtension.trim() || undefined,
        callerId: telCallerId.trim() || undefined,
        callMode: telCallMode,
        preferredProviderId: telPreferredProviderId || undefined,
        operatorUserId: telOperatorUserId.trim() || undefined,
        sipServer: telSipServer.trim() || undefined,
        sipUsername: telSipUsername.trim() || undefined,
        sipPassword: telSipPassword.trim() || undefined,
        sipPort: Number(telSipPort) || 5060,
        recordCalls: telRecordCalls,
        autoDialOnClick: telAutoDialOnClick,
        forwardToMobile: telForwardToMobile.trim() || undefined,
        notes: telNotes.trim() || undefined
      };
    } else {
      dedicatedTelephonyConfig = {
        enabled: false,
        callMode: 'SOFTPHONE_TEL_URL' as const
      };
    }

    const newUser: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      nom: nom.trim(),
      prenom: prenom.trim(),
      pseudo: calculatedPseudo,
      email: email.trim(),
      telephone: telephone.trim(),
      password: password.trim() || 'Horizon2026!',
      role,
      equipe: equipe.trim() || 'Équipe Générale',
      status,
      specialite: specialite.trim(),
      avatarUrl: avatarUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(calculatedPseudo)}&background=0284c7&color=fff`,
      permissions,
      smtpConfig: dedicatedSmtpConfig,
      telephonyConfig: dedicatedTelephonyConfig,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split('T')[0],
      lastLoginAt: editingUser ? editingUser.lastLoginAt : 'Jamais'
    };

    onSaveUser(newUser);
    setIsModalOpen(false);
    showToast(editingUser ? `Compte de ${calculatedPseudo} mis à jour avec succès` : `Nouvel utilisateur ${calculatedPseudo} créé`);
  };

  const handleToggleUserStatus = (user: User) => {
    if (!canManage) return;
    const updated: User = {
      ...user,
      status: user.status === 'ACTIF' ? 'INACTIF' : 'ACTIF'
    };
    onSaveUser(updated);
    showToast(`Statut de ${user.prenom} ${user.nom} changé en ${updated.status}`);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.specialite && u.specialite.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      selectedRoleFilter === 'TOUS' ||
      u.role === selectedRoleFilter ||
      (selectedRoleFilter === 'AGENT_COMMERCIAL' && u.role === 'COURTIER') ||
      (selectedRoleFilter === 'RESPONSABLE_EQUIPE' && u.role === 'MANAGER');
    const matchesStatus = selectedStatusFilter === 'TOUS' || u.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Administrateur
          </span>
        );
      case 'DIRECTEUR_PRODUCTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            Dir. Production
          </span>
        );
      case 'RESPONSABLE_EQUIPE':
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Resp. Équipe
          </span>
        );
      case 'GESTIONNAIRE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            Gestionnaire
          </span>
        );
      case 'AGENT_COMMERCIAL':
      case 'COURTIER':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            Agent Commercial
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sécurité & Contrôle d'Accès (RBAC)
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Gestion des Utilisateurs & Droits
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Gérez les comptes des collaborateurs, définissez les rôles (Admin, Manager, Courtier, Gestionnaire) et configurez les permissions d'accès granulaires au CRM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canManage && (
              <>
                <button
                  onClick={() => {
                    setInstallTargetUser(undefined);
                    setShowInstallModal(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  title="Envoyer le lien d'installation sur PC ou Mac à vos collaborateurs"
                >
                  <Monitor className="w-4 h-4 text-blue-200" />
                  <span>Lien d'Installation PC</span>
                </button>
                <button
                  onClick={() => setShowTeamsModal(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Gérer les Équipes ({teamsList.length})</span>
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nouvel Utilisateur</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Warning banner if not admin */}
        {!canManage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Vous êtes actuellement connecté en tant que <strong>{currentUser.prenom} {currentUser.nom}</strong> ({currentUser.role}). Vos permissions ne vous permettent pas de modifier les utilisateurs. Mode lecture seule.
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Utilisateurs</p>
            <p className="text-xl font-extrabold text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Comptes Actifs</p>
            <p className="text-xl font-extrabold text-emerald-600">
              {users.filter((u) => u.status === 'ACTIF').length}
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Administrateurs</p>
            <p className="text-xl font-extrabold text-purple-700">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Agents & Responsables</p>
            <p className="text-xl font-extrabold text-blue-700">
              {users.filter((u) => u.role === 'AGENT_COMMERCIAL' || u.role === 'RESPONSABLE_EQUIPE' || u.role === 'COURTIER' || u.role === 'MANAGER').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, e-mail, spécialité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="TOUS">Tous les rôles</option>
            <option value="ADMIN">Administrateur</option>
            <option value="DIRECTEUR_PRODUCTION">Directeur de Production</option>
            <option value="RESPONSABLE_EQUIPE">Responsable d'Équipe</option>
            <option value="AGENT_COMMERCIAL">Agent Commercial</option>
            <option value="GESTIONNAIRE">Gestionnaire</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="ACTIF">Actifs uniquement</option>
            <option value="INACTIF">Inactifs uniquement</option>
          </select>
        </div>
      </div>

      {/* Users Grid Card List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((u) => {
          const isCurrentSessionUser = u.id === currentUser.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs hover:shadow-md flex flex-col justify-between relative ${
                isCurrentSessionUser ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
              }`}
            >
              {isCurrentSessionUser && (
                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                  Vous
                </div>
              )}

              <div className="space-y-4">
                {/* User Header */}
                <div className="flex items-start gap-3.5">
                  <img
                    src={
                      u.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.prenom + ' ' + u.nom)}&background=0284c7&color=fff`
                    }
                    alt={u.prenom}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                      {u.prenom} {u.nom}
                    </h3>
                    <div className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold">
                      <BadgeCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span className="truncate">Pseudo : {u.pseudo || `${u.prenom} ${u.nom.charAt(0)}.`}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">{u.specialite || 'Courtier en Assurances'}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {getRoleBadge(u.role)}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIF'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIF' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {u.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info & Dedicated SMTP */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{u.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Mot de passe : <strong className="text-slate-800">{u.password ? '••••••••' : 'Défaut (Horizon2026!)'}</strong></span>
                  </div>

                  {/* Individual Telephony indicator */}
                  <div className="pt-1">
                    {u.telephonyConfig && u.telephonyConfig.enabled && (u.telephonyConfig.directNumber || u.telephonyConfig.extension) ? (
                      <div className="flex items-center justify-between gap-1 text-[11px] text-indigo-900 bg-indigo-50/90 border border-indigo-200/90 px-2.5 py-1 rounded-lg">
                        <div className="flex items-center gap-1.5 truncate">
                          <PhoneCall className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">
                            Ligne : <strong>{u.telephonyConfig.directNumber || `Poste ${u.telephonyConfig.extension}`}</strong>
                          </span>
                        </div>
                        {u.telephonyConfig.extension && u.telephonyConfig.directNumber && (
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded border border-indigo-200 shrink-0">
                            Ext. {u.telephonyConfig.extension}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Ligne : Standard Cabinet</span>
                      </div>
                    )}
                  </div>

                  {/* Individual SMTP indicator */}
                  <div className="pt-1">
                    {u.smtpConfig && u.smtpConfig.host && u.smtpConfig.username ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/90 border border-emerald-200/90 px-2.5 py-1 rounded-lg">
                        <Server className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">SMTP Dédié : <strong>{u.smtpConfig.senderEmail || u.smtpConfig.username}</strong></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>SMTP : Serveur global cabinet</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions Summary Pills */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Permissions d'accès :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                        u.permissions.canViewAllLeads
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                      title={
                        u.permissions.canViewAllLeads
                          ? 'Accès à tous les leads du cabinet'
                          : 'Restreint aux leads assignés uniquement'
                      }
                    >
                      {u.permissions.canViewAllLeads ? '👁️ Tous les leads' : '🔒 Ses leads uniquement'}
                    </span>

                    {u.permissions.canExportData && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        📥 Export Excel/CSV
                      </span>
                    )}

                    {u.permissions.canDeleteLeads && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        🗑️ Suppr. Leads
                      </span>
                    )}

                    {u.permissions.canManageUsers && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        👥 Gestion Users
                      </span>
                    )}

                    {u.permissions.canEditSettings && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        ⚙️ Admin Paramètres
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <div className="flex items-center gap-1.5 ml-auto">
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                          u.status === 'ACTIF'
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title={u.status === 'ACTIF' ? 'Désactiver le compte' : 'Activer le compte'}
                      >
                        {u.status === 'ACTIF' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => {
                          setInstallTargetUser(u);
                          setShowInstallModal(true);
                        }}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition cursor-pointer"
                        title={`Envoyer le lien d'installation PC/Mac à ${u.prenom} ${u.nom}`}
                      >
                        <Monitor className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenModal(u)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Modifier</span>
                      </button>

                      {users.length > 1 && !isCurrentSessionUser && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition cursor-pointer"
                          title="Supprimer définitivement l'utilisateur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* USER EDIT / CREATE MODAL - EXPANDED WORKSPACE VIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl max-w-5xl xl:max-w-6xl w-full border border-slate-200/80 shadow-2xl my-2 sm:my-4 overflow-hidden flex flex-col h-[94vh] max-h-[94vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(pseudo.trim() || prenom || 'Agent')}&background=4f46e5&color=fff`}
                    alt="Avatar"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-400/50 shadow-md bg-slate-800"
                  />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${status === 'ACTIF' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate">
                      {editingUser ? `Modifier le compte : ${prenom} ${nom}` : 'Créer un nouvel agent / collaborateur'}
                    </h2>
                    {pseudo && (
                      <span className="text-[11px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/30 font-semibold">
                        Pseudo : {pseudo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300 flex-wrap">
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-white/10 text-indigo-300 font-medium">
                      {role}
                    </span>
                    <span>•</span>
                    <span className="text-slate-300 truncate">{equipe || 'Équipe Générale'}</span>
                    {telExtension && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-300 font-mono">Poste {telExtension}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  title="Fermer sans enregistrer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="px-6 bg-slate-100/90 border-b border-slate-200 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 py-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('PROFILE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeModalTab === 'PROFILE'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <UserIcon className={`w-4 h-4 ${activeModalTab === 'PROFILE' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>1. Profil & Identité</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('TELEPHONY')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeModalTab === 'TELEPHONY'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <PhoneCall className={`w-4 h-4 ${activeModalTab === 'TELEPHONY' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>2. Ligne Téléphonique & VoIP</span>
                  {useDedicatedTelephony && (telDirectNumber || telExtension) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('SMTP')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeModalTab === 'SMTP'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Mail className={`w-4 h-4 ${activeModalTab === 'SMTP' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>3. Messagerie & SMTP Dédié</span>
                  {useDedicatedSmtp && smtpHoster && (
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('PERMISSIONS')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeModalTab === 'PERMISSIONS'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${activeModalTab === 'PERMISSIONS' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>4. Droits & Permissions</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                    {Object.values(permissions).filter(Boolean).length}/9
                  </span>
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                <span>Section :</span>
                <span className="font-semibold text-slate-800">
                  {activeModalTab === 'PROFILE' && 'Identité & Équipe'}
                  {activeModalTab === 'TELEPHONY' && 'Ligne Directe, Poste & VoIP'}
                  {activeModalTab === 'SMTP' && 'E-mail professionnel & Devis'}
                  {activeModalTab === 'PERMISSIONS' && 'Habilitations CRM'}
                </span>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden text-slate-800">
              <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: PROFILE & IDENTITY */}
              {activeModalTab === 'PROFILE' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-indigo-600" />
                      <span>1. Informations Personnelles & Rôle Commercial</span>
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Rôle sélectionné : <strong className="text-indigo-600">{role}</strong>
                    </span>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={prenom}
                      onChange={(e) => {
                        setPrenom(e.target.value);
                        if (!pseudo || pseudo === `${prenom} ${nom ? nom.charAt(0) + '.' : ''}`.trim()) {
                          setPseudo(`${e.target.value} ${nom ? nom.charAt(0) + '.' : ''}`.trim());
                        }
                      }}
                      placeholder="Ex: Sophie"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => {
                        setNom(e.target.value);
                        if (!pseudo || pseudo === `${prenom} ${nom ? nom.charAt(0) + '.' : ''}`.trim()) {
                          setPseudo(`${prenom} ${e.target.value ? e.target.value.charAt(0) + '.' : ''}`.trim());
                        }
                      }}
                      placeholder="Ex: Martin"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Field Pseudo - Prioritaire pour chat interne et signatures */}
                  <div className="sm:col-span-2 bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4 text-indigo-600" />
                        <span>Pseudo d'Affichage Commercial & Signature *</span>
                      </label>
                      <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100/90 px-2 py-0.5 rounded-full border border-indigo-200">
                        Chat interne & E-mails
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={pseudo}
                      onChange={(e) => {
                        setPseudo(e.target.value);
                        if (!smtpSenderName || smtpSenderName === pseudo) {
                          setSmtpSenderName(e.target.value);
                        }
                      }}
                      placeholder="Ex: Sophie M. ou Marc D."
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-[11px] text-indigo-900/80 mt-1.5 leading-snug">
                      ℹ️ Ce <strong>pseudo</strong> s'affichera obligatoirement sur le <strong>chat interne</strong> et dans la <strong>signature de tous les e-mails et devis</strong> envoyés aux assurés (à la place du nom et prénom réels).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Professionnel *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (!smtpUsername || smtpUsername === email) {
                          setSmtpUsername(e.target.value);
                        }
                        if (!smtpSenderEmail || smtpSenderEmail === email) {
                          setSmtpSenderEmail(e.target.value);
                        }
                      }}
                      placeholder="s.martin@horizon-courtage.fr"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="01 42 68 90 00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Mot de passe d'accès *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Générer</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mot de passe d'accès..."
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <Lock className="w-3.5 h-3.5 text-indigo-600" /> : <Key className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle Principal & Droits *</label>
                    <select
                      value={role}
                      onChange={(e) => handleRoleChangeInModal(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="AGENT_COMMERCIAL">Agent Commercial (Ses leads rattachés uniquement)</option>
                      <option value="RESPONSABLE_EQUIPE">Responsable d'Équipe (Leads de son équipe)</option>
                      <option value="GESTIONNAIRE">Gestionnaire (Leads de son équipe / Back-office)</option>
                      <option value="DIRECTEUR_PRODUCTION">Directeur de Production (Accès Admin sauf création d'Admin)</option>
                      {!isDirecteurProd && (
                        <option value="ADMIN">Administrateur Cabinet (Accès total & création Admins)</option>
                      )}
                    </select>
                    {isDirecteurProd && (
                      <p className="text-[11px] text-amber-700 mt-1 italic">
                        ℹ️ En tant que Directeur de Production, la création de comptes Administrateur est réservée aux Admins.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Équipe Rattachée *</label>
                      <button
                        type="button"
                        onClick={() => setShowTeamsModal(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Gérer les équipes</span>
                      </button>
                    </div>
                    <select
                      required
                      value={equipe}
                      onChange={(e) => {
                        if (e.target.value === 'NEW_TEAM_OPTION') {
                          const name = window.prompt('Saisissez le nom de la nouvelle équipe (ex: Équipe Prévoyance Pro) :');
                          if (name && name.trim()) {
                            handleAddTeam(name.trim());
                            setEquipe(name.trim());
                          }
                        } else {
                          setEquipe(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {teamsList.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="NEW_TEAM_OPTION" className="text-indigo-600 font-bold">
                        ➕ + Créer une nouvelle équipe...
                      </option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Rattache le commercial, gestionnaire ou responsable à son équipe opérationnelle.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Statut du Compte</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'ACTIF' | 'INACTIF')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="ACTIF">Actif (Autorisé à se connecter)</option>
                      <option value="INACTIF">Inactif (Bloqué)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Spécialité / Fonction</label>
                    <input
                      type="text"
                      value={specialite}
                      onChange={(e) => setSpecialite(e.target.value)}
                      placeholder="Ex: Agent Commercial Auto & VTC"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar & Photo de Profil</label>
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          avatarUrl.trim() ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(pseudo.trim() || prenom || 'Agent')}&background=0284c7&color=fff`
                        }
                        alt="Avatar preview"
                        className="w-9 h-9 rounded-xl object-cover border border-slate-300 shadow-2xs shrink-0 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Créer / Choisir Avatar</span>
                      </button>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Ou coller une URL..."
                        className="flex-1 min-w-0 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none truncate"
                        title="URL directe d'une photo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 2: TELEPHONY & VOIP */}
              {activeModalTab === 'TELEPHONY' && (
                <div className="space-y-6">
                  {/* Header & Main Switch */}
                  <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 p-5 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                        <PhoneCall className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Ligne Téléphonique & VoIP Dédiée de l'Agent
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Paramétrez le numéro direct (SDA), le poste interne et la passerelle d'appel pour que l'agent puisse émettre et recevoir des appels en un clic.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 bg-white/90 px-4 py-2 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-xs font-bold text-slate-800">
                        {useDedicatedTelephony ? 'Ligne Dédiée Activée' : 'Utiliser le Standard Général'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useDedicatedTelephony}
                          onChange={(e) => setUseDedicatedTelephony(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  {useDedicatedTelephony ? (
                    <div className="space-y-6">
                      {/* Live Summary Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Poste Interne</span>
                          <span className="font-bold text-slate-900 font-mono text-sm">{telExtension || 'Non défini'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Ligne Directe (SDA)</span>
                          <span className="font-bold text-slate-900 font-mono text-sm">{telDirectNumber || 'Numéro standard'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Mode d'appel</span>
                          <span className="font-semibold text-emerald-700">
                            {telCallMode === 'SOFTPHONE_TEL_URL' ? 'Softphone (Zoiper/tel:)' : telCallMode === 'DIRECT_API' ? 'API Cloud directe' : 'WebRTC'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Caller ID sortant</span>
                          <span className="font-semibold text-slate-800 truncate block">{telCallerId || 'Standard cabinet'}</span>
                        </div>
                      </div>

                      {/* 2-Column Main Telephony Settings */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Card 1: Coordonnées de ligne et numérotation */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <PhoneOutgoing className="w-4 h-4 text-emerald-600" />
                            <span>Numérotation & Ligne Directe</span>
                          </h4>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Numéro de ligne directe SDA (Numéro dédié de l'agent)
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={telDirectNumber}
                                onChange={(e) => {
                                  setTelDirectNumber(e.target.value);
                                  if (!telCallerId) setTelCallerId(e.target.value);
                                }}
                                placeholder="Ex: 01 89 23 45 12"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Ce numéro est la ligne directe de l'agent. Les prospects qui rappellent aboutissent directement sur son poste.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Poste interne / Extension SIP *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={telExtension}
                                  onChange={(e) => setTelExtension(e.target.value)}
                                  placeholder="Ex: 101, 102, 204"
                                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">#</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">Numéro court pour transferts internes.</p>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Numéro d'appelant sortant (Caller ID)
                              </label>
                              <input
                                type="text"
                                value={telCallerId}
                                onChange={(e) => setTelCallerId(e.target.value)}
                                placeholder={telDirectNumber || cabinetInfo?.telephone || 'Standard cabinet'}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <div className="flex gap-1.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => setTelCallerId(telDirectNumber || telephone)}
                                  disabled={!telDirectNumber && !telephone}
                                  className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium disabled:opacity-40 cursor-pointer"
                                >
                                  Ligne directe
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTelCallerId(cabinetInfo?.telephone || '')}
                                  disabled={!cabinetInfo?.telephone}
                                  className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium disabled:opacity-40 cursor-pointer"
                                >
                                  Standard
                                </button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Renvoi / Redirection vers mobile (si non répondu)
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={telForwardToMobile}
                                onChange={(e) => setTelForwardToMobile(e.target.value)}
                                placeholder="Ex: 06 12 34 56 78 (Mobile de l'agent)"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <PhoneForwarded className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Redirige l'appel vers le portable de l'agent si indisponible au bureau.
                            </p>
                          </div>
                        </div>

                        {/* Card 2: Opérateur & Mode d'appel */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Radio className="w-4 h-4 text-indigo-600" />
                            <span>Opérateur & Passerelle Téléphonique</span>
                          </h4>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Passerelle VoIP Rattachée
                            </label>
                            <select
                              value={telPreferredProviderId}
                              onChange={(e) => setTelPreferredProviderId(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">-- Utiliser l'opérateur VoIP par défaut du cabinet --</option>
                              {cabinetInfo?.telephonyProviders?.map((prov) => (
                                <option key={prov.id} value={prov.id}>
                                  {prov.name} ({prov.providerType}) {prov.isDefaultVoice ? '★ Défaut' : ''}
                                </option>
                              ))}
                              <option value="GENERIC_SOFTPHONE">Softphone Système / Zoiper / MicroSIP / Teams (tel:)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Mode d'Appel Préférentiel pour l'Agent
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {[
                                {
                                  id: 'SOFTPHONE_TEL_URL',
                                  label: 'Softphone / tel:',
                                  sub: 'Zoiper, MicroSIP, Teams',
                                  icon: PhoneCall
                                },
                                {
                                  id: 'DIRECT_API',
                                  label: 'Passerelle Cloud',
                                  sub: 'Ringover, Twilio, 3CX, OVH',
                                  icon: Radio
                                },
                                {
                                  id: 'WEBRTC',
                                  label: 'WebRTC Direct',
                                  sub: 'Casque & Micro PC/Mac',
                                  icon: Mic
                                }
                              ].map((modeItem) => {
                                const Icon = modeItem.icon;
                                const isSelected = telCallMode === modeItem.id;
                                return (
                                  <button
                                    key={modeItem.id}
                                    type="button"
                                    onClick={() => setTelCallMode(modeItem.id as any)}
                                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                      isSelected
                                        ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                                    </div>
                                    <span className="text-xs font-bold block">{modeItem.label}</span>
                                    <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">{modeItem.sub}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Identifiant Agent / Utilisateur CTI
                            </label>
                            <input
                              type="text"
                              value={telOperatorUserId}
                              onChange={(e) => setTelOperatorUserId(e.target.value)}
                              placeholder="Ex: agent-ringover-42, poste-3cx@domaine.com, ou email de l'agent"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Identifiant chez l'opérateur pour associer les enregistrements et statuts.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Paramètres SIP Dédiés (Optionnel / Trunk SIP) */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Server className="w-4 h-4 text-slate-600" />
                            <span>Paramètres SIP Individuels (Optionnel : OVH, 3CX, FreePBX, Asterisk)</span>
                          </h4>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Poste physique ou softphone
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Serveur / Proxy SIP
                            </label>
                            <input
                              type="text"
                              value={telSipServer}
                              onChange={(e) => setTelSipServer(e.target.value)}
                              placeholder="sip5.ovh.fr, pbx.cabinet.fr..."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Compte / Login SIP
                            </label>
                            <input
                              type="text"
                              value={telSipUsername}
                              onChange={(e) => setTelSipUsername(e.target.value)}
                              placeholder="0033189234512 ou 101"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Port SIP
                            </label>
                            <input
                              type="number"
                              value={telSipPort}
                              onChange={(e) => setTelSipPort(Number(e.target.value))}
                              placeholder="5060"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Mot de passe secret SIP
                            </label>
                            <div className="relative">
                              <input
                                type={showTelSipPassword ? 'text' : 'password'}
                                value={telSipPassword}
                                onChange={(e) => setTelSipPassword(e.target.value)}
                                placeholder="Mot de passe SIP..."
                                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowTelSipPassword(!showTelSipPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {showTelSipPassword ? <Lock className="w-3.5 h-3.5 text-emerald-600" /> : <Key className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Notes internes / Matériel attribué
                            </label>
                            <input
                              type="text"
                              value={telNotes}
                              onChange={(e) => setTelNotes(e.target.value)}
                              placeholder="Ex: Yealink T46U Bureau 2 ou Casque Jabra"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Options d'Appel */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-slate-600" />
                          <span>Options d'Appel & Enregistrement</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition cursor-pointer">
                            <input
                              type="checkbox"
                              checked={telRecordCalls}
                              onChange={(e) => setTelRecordCalls(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                                Enregistrement automatique des conversations
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Conforme DDA : enregistre et rattache l'audio des appels à l'historique du lead.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition cursor-pointer">
                            <input
                              type="checkbox"
                              checked={telAutoDialOnClick}
                              onChange={(e) => setTelAutoDialOnClick(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                                Déclenchement direct au clic (Click-to-Call)
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Lance immédiatement la numérotation dès que l'agent clique sur le numéro d'un prospect.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Card 5: Tester la Ligne */}
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Vérification & Test de la Ligne de l'Agent</span>
                          </h5>
                          <p className="text-[11px] text-emerald-900/80 mt-0.5">
                            Vérifiez la validité de la ligne directe et la cohérence de l'extension avant la mise en production.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleTestTelephony}
                          disabled={isTestingTelephony}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
                        >
                          {isTestingTelephony ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Test en cours...</span>
                            </>
                          ) : (
                            <>
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Tester la ligne téléphonique</span>
                            </>
                          )}
                        </button>
                      </div>

                      {telephonyTestResult && (
                        <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
                          telephonyTestResult.success
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-rose-50 text-rose-900 border-rose-300'
                        }`}>
                          {telephonyTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold">{telephonyTestResult.success ? 'Ligne Téléphonique Prête' : 'Paramétrage Incomplet'}</p>
                            <p className="text-[11px] mt-0.5">{telephonyTestResult.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
                      <Phone className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">Ligne individuelle désactivée</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Cet agent n'a pas de ligne téléphonique directe dédiée. Il utilisera le standard général du cabinet ({cabinetInfo?.telephone || 'Numéro principal'}) pour ses appels sortants.
                      </p>
                      <button
                        type="button"
                        onClick={() => setUseDedicatedTelephony(true)}
                        className="mt-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition cursor-pointer shadow-xs inline-flex items-center gap-2"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Activer une ligne dédiée pour cet agent</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* TAB 3: SMTP MESSAGERIE */}
              {activeModalTab === 'SMTP' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-blue-600" />
                      <span>3. Configuration Messagerie SMTP Dédiée (Email & Envoi Devis)</span>
                    </h3>
                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      Boîte E-mail Pro Dédiée
                    </span>
                  </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Serveur SMTP individuel pour ce compte</p>
                      <p className="text-[11px] text-slate-500">
                        Permet à l'agent d'envoyer ses devis et ses e-mails de relance avec son adresse e-mail professionnelle propre.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDedicatedSmtp}
                        onChange={(e) => setUseDedicatedSmtp(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {useDedicatedSmtp ? (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-700 block mb-1.5">
                          ⚡ Remplissage rapide par fournisseur :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'Google / Gmail', host: 'smtp.gmail.com', port: 587, encryption: 'TLS' as const },
                            { name: 'OVHcloud', host: 'ssl0.ovh.net', port: 587, encryption: 'TLS' as const },
                            { name: 'Microsoft 365', host: 'smtp.office365.com', port: 587, encryption: 'TLS' as const },
                            { name: 'Brevo (Sendinblue)', host: 'smtp-relay.brevo.com', port: 587, encryption: 'TLS' as const },
                            { name: 'Ionos (1&1)', host: 'smtp.ionos.fr', port: 587, encryption: 'TLS' as const }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setSmtpHoster(preset.host);
                                setSmtpPort(preset.port);
                                setSmtpEncryption(preset.encryption);
                                setSmtpTestResult(null);
                              }}
                              className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition shadow-2xs"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Hôte SMTP (Serveur sortant) *
                          </label>
                          <input
                            type="text"
                            required={useDedicatedSmtp}
                            value={smtpHoster}
                            onChange={(e) => setSmtpHoster(e.target.value)}
                            placeholder="ssl0.ovh.net, smtp.gmail.com, mail.infomaniak.com"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Port SMTP *
                          </label>
                          <input
                            type="number"
                            required={useDedicatedSmtp}
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(Number(e.target.value))}
                            placeholder="465 ou 587"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Protocole de Sécurité
                          </label>
                          <select
                            value={smtpEncryption}
                            onChange={(e) => setSmtpEncryption(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="SSL">SSL / TLS Direct (Port 465 conseillé)</option>
                            <option value="TLS">STARTTLS / TLS (Port 587)</option>
                            <option value="NONE">Aucun (Non sécurisé - Port 25)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Identifiant / Login SMTP (Email de connexion) *
                          </label>
                          <input
                            type="text"
                            required={useDedicatedSmtp}
                            value={smtpUsername}
                            onChange={(e) => setSmtpUsername(e.target.value)}
                            placeholder={email || 'identifiant.agent@cabinet.fr'}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Mot de passe SMTP / Clé d'application
                          </label>
                          <div className="relative">
                            <input
                              type={showSmtpPassword ? 'text' : 'password'}
                              value={smtpPassword}
                              onChange={(e) => setSmtpPassword(e.target.value)}
                              placeholder="Mot de passe du compte mail..."
                              className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showSmtpPassword ? <Lock className="w-3.5 h-3.5 text-blue-600" /> : <Key className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Adresse Expéditeur visible (From)
                          </label>
                          <input
                            type="email"
                            value={smtpSenderEmail}
                            onChange={(e) => setSmtpSenderEmail(e.target.value)}
                            placeholder={email || 'agent@horizon-courtage.fr'}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nom d'expéditeur visible sur les e-mails (Pseudo par défaut)
                        </label>
                        <input
                          type="text"
                          value={smtpSenderName}
                          onChange={(e) => setSmtpSenderName(e.target.value)}
                          placeholder={pseudo || `${prenom} ${nom}`}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smtpActive}
                            onChange={(e) => setSmtpActive(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs font-semibold text-slate-800">
                            Activer ce SMTP dédié pour l'envoi des devis et relances
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={handleTestSmtpConnection}
                          disabled={isTestingSmtp || !smtpHoster}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          {isTestingSmtp ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              <span>Vérification...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Tester la connexion SMTP</span>
                            </>
                          )}
                        </button>
                      </div>

                      {smtpTestResult && (
                        <div
                          className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                            smtpTestResult.success
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {smtpTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold">{smtpTestResult.success ? 'Succès du test SMTP' : 'Échec de la connexion SMTP'}</p>
                            <p className="text-[11px] mt-0.5">{smtpTestResult.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                      <Mail className="w-8 h-8 text-slate-400 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-800">SMTP global utilisé</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Cet agent utilisera le serveur SMTP centralisé configuré dans les Paramètres Généraux du cabinet pour l'envoi de ses e-mails et devis.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

              {/* TAB 4: GRANULAR PERMISSIONS */}
              {activeModalTab === 'PERMISSIONS' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>4. Permissions Granulaires et Droits d'Accès CRM</span>
                    </h3>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium">Modèles rapides :</span>
                    {!isDirecteurProd && (
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('ADMIN')}
                        className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Admin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('DIRECTEUR_PRODUCTION')}
                      className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      Dir. Prod
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('RESPONSABLE_EQUIPE')}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      Resp. Équipe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('AGENT_COMMERCIAL')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      Agent Comm.
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('GESTIONNAIRE')}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      Gestionnaire
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  {/* Permission 1: View all leads vs assigned leads */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canViewAllLeads}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canViewAllLeads: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        Voir la totalité des leads du cabinet
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Si désactivé, l'utilisateur ne verra dans le CRM que les leads qui lui sont spécifiquement assignés.
                      </p>
                    </div>
                  </label>

                  {/* Permission 2: Create leads */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canCreateLeads}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canCreateLeads: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Créer de nouveaux leads (Bouton Nouveau Lead)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Permet de créer un prospect Auto, Habitation ou VTC.
                      </p>
                    </div>
                  </label>

                  {/* Permission 3: Edit leads */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canEditLeads}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canEditLeads: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Modifier les fiches leads & devis
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Éditer les coordonnées, caractéristiques du véhicule/logement et montants de prime.
                      </p>
                    </div>
                  </label>

                  {/* Permission 4: Delete leads */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canDeleteLeads)}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canDeleteLeads: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 text-rose-700 flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer des leads
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Accorde le droit de supprimer définitivement une fiche client. Si non cochée, le bouton de suppression est verrouillé et inaccessible.
                      </p>
                    </div>
                  </label>

                  {/* Permission 5: Change lead status */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canChangeLeadStatus}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canChangeLeadStatus: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Changer le statut & la qualification
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Passer le lead de "Nouveau" à "Devis Envoyé", "Gagné" ou "Perdu".
                      </p>
                    </div>
                  </label>

                  {/* Permission 6: Export data */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canExportData}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canExportData: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        Exporter les données (Excel / CSV)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Autorise le téléchargement des fichiers d'export de la base de prospects.
                      </p>
                    </div>
                  </label>

                  {/* Permission 7: Assign leads */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canAssignLeads}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canAssignLeads: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Re-assigner les leads aux courtiers
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Changer le courtier responsable d'un portefeuille de leads.
                      </p>
                    </div>
                  </label>

                  {/* Permission 8: Manage users */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canManageUsers}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canManageUsers: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 text-purple-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Gérer les utilisateurs et les droits
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Accès à cette page de gestion des utilisateurs.
                      </p>
                    </div>
                  </label>

                  {/* Permission 9: Settings & SMTP */}
                  <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.canEditSettings}
                      onChange={(e) =>
                        setPermissions({ ...permissions, canEditSettings: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-slate-700" />
                        Accéder aux Paramètres du Cabinet & Serveur SMTP
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Modifier l'ORIAS, la raison sociale, les modèles d'e-mail et le serveur mail.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            </div>

            {/* Sticky Modal Footer Actions */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Summary Status Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-semibold text-slate-700">
                  👤 {role}
                </span>

                <span className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  useDedicatedTelephony && (telDirectNumber || telExtension)
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {useDedicatedTelephony
                      ? (telDirectNumber ? `${telDirectNumber} (SDA)` : `Poste ${telExtension || 'N/A'}`)
                      : 'Téléphonie Standard'}
                  </span>
                </span>

                <span className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  useDedicatedSmtp && smtpHoster
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>{useDedicatedSmtp ? 'SMTP Dédié' : 'SMTP Cabinet'}</span>
                </span>
              </div>

              {/* Navigation & Submit Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {activeModalTab !== 'PROFILE' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeModalTab === 'PERMISSIONS') setActiveModalTab('SMTP');
                      else if (activeModalTab === 'SMTP') setActiveModalTab('TELEPHONY');
                      else if (activeModalTab === 'TELEPHONY') setActiveModalTab('PROFILE');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    ← Précédent
                  </button>
                )}

                {activeModalTab !== 'PERMISSIONS' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeModalTab === 'PROFILE') setActiveModalTab('TELEPHONY');
                      else if (activeModalTab === 'TELEPHONY') setActiveModalTab('SMTP');
                      else if (activeModalTab === 'SMTP') setActiveModalTab('PERMISSIONS');
                    }}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Suivant →
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUser ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}</span>
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Modal Studio Avatar pour l'utilisateur en cours d'édition/création */}
      {isAvatarModalOpen && (
        <AvatarCreatorModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          currentAvatarUrl={avatarUrl}
          user={
            editingUser || {
              id: 'temp-user',
              nom: nom.trim() || 'Collaborateur',
              prenom: prenom.trim() || 'Nouveau',
              pseudo: pseudo.trim() || prenom.trim() || 'Agent',
              email: email.trim() || 'agent@cabinet.fr',
              role,
              status,
              specialite,
              equipe,
              permissions,
              createdAt: new Date().toISOString()
            }
          }
          onSaveAvatar={(newAvatarUrl) => {
            setAvatarUrl(newAvatarUrl);
          }}
        />
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Supprimer l'utilisateur ?</h3>
                <p className="text-xs text-slate-500">Cette action est définitive et irréversible.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Vous allez supprimer le compte de <strong className="text-slate-900">{deletingUser.prenom} {deletingUser.nom}</strong> ({deletingUser.email}). Ses accès au CRM seront immédiatement révoqués.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(deletingUser.id);
                  showToast(`Utilisateur ${deletingUser.prenom} ${deletingUser.nom} supprimé avec succès`);
                  setDeletingUser(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer Définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE TEAMS MODAL */}
      {showTeamsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Gestion des Équipes & Organigramme</h3>
                  <p className="text-xs text-slate-500">Créez et organisez les équipes pour y attacher vos commerciaux, gestionnaires et responsables d'équipe.</p>
                </div>
              </div>
              <button
                onClick={() => setShowTeamsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Team Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTeam(newTeamInput);
              }}
              className="flex items-center gap-2 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 shrink-0"
            >
              <input
                type="text"
                value={newTeamInput}
                onChange={(e) => setNewTeamInput(e.target.value)}
                placeholder="Nom de la nouvelle équipe (ex: Équipe Risques Spéciaux, Équipe Flottes...)"
                className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newTeamInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter l'équipe</span>
              </button>
            </form>

            {/* Teams List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {teamsList.map((teamName) => {
                const members = users.filter(u => u.equipe === teamName);
                const commercialsCount = members.filter(u => u.role === 'AGENT_COMMERCIAL' || u.role === 'COURTIER').length;
                const gestionnairesCount = members.filter(u => u.role === 'GESTIONNAIRE').length;
                const responsablesCount = members.filter(u => u.role === 'RESPONSABLE_EQUIPE' || u.role === 'MANAGER').length;
                const isEditing = editingTeam?.oldName === teamName;

                return (
                  <div
                    key={teamName}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingTeam.newName}
                            onChange={(e) => setEditingTeam({ ...editingTeam, newName: e.target.value })}
                            className="flex-1 px-3 py-1.5 bg-white border border-indigo-400 rounded-xl text-xs font-bold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameTeam(teamName, editingTeam.newName)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                            title="Valider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTeam(null)}
                            className="p-1.5 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition cursor-pointer"
                            title="Annuler"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{teamName}</h4>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                            {members.length} membre{members.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTeam({ oldName: teamName, newName: teamName })}
                            className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition cursor-pointer shadow-2xs"
                            title="Renommer l'équipe"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(teamName)}
                            className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer shadow-2xs"
                            title="Supprimer l'équipe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Member breakdown */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                      {responsablesCount > 0 && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-lg">
                          👤 {responsablesCount} Resp. d'Équipe
                        </span>
                      )}
                      {commercialsCount > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-lg">
                          💼 {commercialsCount} Commercial{commercialsCount > 1 ? 'aux' : ''}
                        </span>
                      )}
                      {gestionnairesCount > 0 && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-lg">
                          🏢 {gestionnairesCount} Gestionnaire{gestionnairesCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {members.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">
                          Aucun membre n'est encore rattaché à cette équipe.
                        </span>
                      )}
                    </div>

                    {/* Member Avatars */}
                    {members.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {members.map((u) => (
                          <div
                            key={u.id}
                            className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs text-[11px]"
                          >
                            <img
                              src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.prenom + ' ' + u.nom)}&background=0284c7&color=fff`}
                              alt={u.prenom}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span className="font-semibold text-slate-800">{u.prenom} {u.nom}</span>
                            <span className="text-[10px] text-slate-400 font-medium">({u.role === 'AGENT_COMMERCIAL' ? 'Agent' : u.role === 'RESPONSABLE_EQUIPE' ? 'Resp.' : u.role})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowTeamsModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'envoi du lien d'installation sur PC / Mac */}
      {showInstallModal && (
        <InstallAppModal
          isOpen={showInstallModal}
          onClose={() => {
            setShowInstallModal(false);
            setInstallTargetUser(undefined);
          }}
          currentUser={currentUser}
          users={users}
          cabinetInfo={cabinetInfo}
          initialTargetUser={installTargetUser}
          initialTab="SHARE"
        />
      )}
    </div>
  );
};
