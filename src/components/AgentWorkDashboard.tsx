import React, { useState, useMemo } from 'react';
import {
  Clock,
  Coffee,
  GraduationCap,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronDown,
  Shield,
  ArrowUpDown,
  Download,
  Eye,
  CalendarDays
} from 'lucide-react';
import { AgentWorkSession, User, getUserDisplayName, shouldTrackAgentPresence } from '../types/crm';
import { AgentWorkDetailModal } from './AgentWorkDetailModal';
import { exportPresenceToExcel } from '../utils/presenceExport';

interface AgentWorkDashboardProps {
  currentUser: User;
  users: User[];
  sessions: AgentWorkSession[];
}

export const AgentWorkDashboard: React.FC<AgentWorkDashboardProps> = ({
  currentUser,
  users,
  sessions
}) => {
  const [selectedEquipe, setSelectedEquipe] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Period filter states: support today, yesterday, week, month and custom date range (du date X au date Y)
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('today');
  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(todayISO);

  const [selectedAgentForDetail, setSelectedAgentForDetail] = useState<User | null>(null);

  // Determine visibility scope:
  // - ADMIN & DIRECTEUR_PRODUCTION: All agents across all teams
  // - RESPONSABLE_EQUIPE / MANAGER: Only agents belonging to their own team
  const isGlobalAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'DIRECTEUR_PRODUCTION';
  const managerEquipe = currentUser.equipe;

  // Preset switch handler
  const applyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(sunday.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setPeriodPreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setPeriodPreset('custom');
  };

  const formatDateDMY = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
  };

  const isMultiDay = startDate !== endDate;

  // Filter users: only include agents whose presence is tracked (Commercials and Gestionnaires)
  // Supervised by:
  // - ADMIN & DIRECTEUR_PRODUCTION: All trackable agents across all teams
  // - RESPONSABLE_EQUIPE / MANAGER: Only trackable agents belonging to their own team
  const visibleUsers = useMemo(() => {
    return users.filter(u => {
      // Admins, Directeurs, and Responsables/Managers do not have counters and are not displayed in this supervision table
      if (!shouldTrackAgentPresence(u.role)) return false;

      if (isGlobalAdmin) return true;
      if (managerEquipe && u.equipe) {
        return u.equipe.toLowerCase().trim() === managerEquipe.toLowerCase().trim();
      }
      return false;
    });
  }, [users, isGlobalAdmin, managerEquipe]);

  // List of distinct teams
  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    visibleUsers.forEach(u => {
      if (u.equipe) set.add(u.equipe);
    });
    return Array.from(set);
  }, [visibleUsers]);

  // Map each visible user to their aggregated session metrics over the chosen period [startDate, endDate]
  const agentRows = useMemo(() => {
    return visibleUsers.map(user => {
      // Find sessions for this user within the selected period
      const userSessions = sessions.filter(s => {
        if (s.userId !== user.id) return false;
        const sessionDate = (s.loginAt || '').split('T')[0];
        if (!sessionDate) return false;
        if (startDate && sessionDate < startDate) return false;
        if (endDate && sessionDate > endDate) return false;
        return true;
      });

      // Find active or latest session
      const activeSession = userSessions.find(s => s.status !== 'OFFLINE') || userSessions[0];

      // Live status if today's session is active
      const todaySession = sessions.find(s => s.userId === user.id && (s.loginAt || '').startsWith(todayISO));
      const liveStatus = todaySession ? todaySession.status : (activeSession ? activeSession.status : 'OFFLINE');

      // Calculate total work seconds for the selected period
      const totalWorkSeconds = userSessions.reduce((acc, s) => acc + (s.workSeconds || 0), 0);

      // Distinct active days in the period
      const activeDaysSet = new Set<string>();
      userSessions.forEach(s => {
        const d = (s.loginAt || '').split('T')[0];
        if (d && (s.workSeconds || 0) > 0) activeDaysSet.add(d);
      });
      const activeDaysCount = activeDaysSet.size;

      // Aggregate all breaks
      let pauseCafeSeconds = 0;
      let pauseDebriefSeconds = 0;
      let pauseFormationSeconds = 0;
      let pauseCafeCount = 0;
      let pauseDebriefCount = 0;
      let pauseFormationCount = 0;

      userSessions.forEach(s => {
        (s.breaks || []).forEach(b => {
          const isOngoing = !b.endedAt && b.startedAt;
          const duration = isOngoing
            ? Math.max(b.durationSeconds || 0, Math.floor((Date.now() - new Date(b.startedAt).getTime()) / 1000))
            : (b.durationSeconds || 0);

          if (b.type === 'PAUSE_CAFE') {
            pauseCafeSeconds += duration;
            pauseCafeCount += 1;
          } else if (b.type === 'PAUSE_DEBRIEF') {
            pauseDebriefSeconds += duration;
            pauseDebriefCount += 1;
          } else if (b.type === 'PAUSE_FORMATION') {
            pauseFormationSeconds += duration;
            pauseFormationCount += 1;
          }
        });
      });

      const totalPauseSeconds = pauseCafeSeconds + pauseDebriefSeconds + pauseFormationSeconds;

      return {
        user,
        latestSession: activeSession,
        currentStatus: liveStatus,
        totalWorkSeconds,
        activeDaysCount,
        sessionsCount: userSessions.length,
        totalPauseSeconds,
        pauseCafeSeconds,
        pauseCafeCount,
        pauseDebriefSeconds,
        pauseDebriefCount,
        pauseFormationSeconds,
        pauseFormationCount,
        loginAt: activeSession?.loginAt,
        logoutAt: activeSession?.logoutAt,
        isAutoDisconnected: activeSession?.isAutoDisconnected
      };
    });
  }, [visibleUsers, sessions, startDate, endDate, todayISO]);

  // Apply search & dropdown filters
  const filteredRows = useMemo(() => {
    return agentRows.filter(row => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        getUserDisplayName(row.user).toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.user.equipe && row.user.equipe.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesEquipe =
        selectedEquipe === 'ALL' ||
        (row.user.equipe && row.user.equipe === selectedEquipe);

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ONLINE' && row.currentStatus === 'ONLINE') ||
        (selectedStatus === 'PAUSE' && (row.currentStatus === 'PAUSE_CAFE' || row.currentStatus === 'PAUSE_DEBRIEF' || row.currentStatus === 'PAUSE_FORMATION')) ||
        (selectedStatus === 'OFFLINE' && row.currentStatus === 'OFFLINE');

      return matchesSearch && matchesEquipe && matchesStatus;
    });
  }, [agentRows, searchQuery, selectedEquipe, selectedStatus]);

  // Global KPIs for the day
  const onlineCount = agentRows.filter(r => r.currentStatus === 'ONLINE').length;
  const inPauseCount = agentRows.filter(r => r.currentStatus.startsWith('PAUSE_')).length;
  const offlineCount = agentRows.filter(r => r.currentStatus === 'OFFLINE').length;
  const totalWorkSecondsAll = agentRows.reduce((acc, r) => acc + r.totalWorkSeconds, 0);

  // Format seconds to HH:MM:SS or HHh MMm
  const formatHoursMinutes = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatTimeHHMM = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const renderStatusBadge = (status: string, isAutoDisc?: boolean) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>En Ligne</span>
          </span>
        );
      case 'PAUSE_CAFE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold shadow-xs">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span>Pause Café</span>
          </span>
        );
      case 'PAUSE_DEBRIEF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold shadow-xs">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Pause Débrief</span>
          </span>
        );
      case 'PAUSE_FORMATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold shadow-xs">
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
            <span>Pause Formation</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Déconnecté</span>
            {isAutoDisc && <span className="text-[10px] text-rose-600 font-bold" title="Déconnecté après 15 min d'inactivité">(Inactif)</span>}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none pb-12">
      {/* Header & Date Range Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Suivi de Présence & Pauses des Conseillers
              </h1>
              <p className="text-xs text-slate-500">
                {isGlobalAdmin
                  ? 'Vue Direction Générale • Supervision de toutes les équipes et télétravailleurs'
                  : `Supervision de votre équipe rattachée : ${managerEquipe || 'Équipe Commerciale'}`}
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Presets (Du date X au date Y) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 p-2 border border-slate-200 rounded-2xl">
          {/* Preset Buttons */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl gap-1 flex-wrap">
            <button
              onClick={() => applyPreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodPreset === 'today'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => applyPreset('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodPreset === 'yesterday'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hier
            </button>
            <button
              onClick={() => applyPreset('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodPreset === 'week'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => applyPreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodPreset === 'month'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriodPreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodPreset === 'custom'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personnalisé
            </button>
          </div>

          {/* Date range inputs X -> Y */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-500">Du :</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
            />
            <span className="font-bold text-slate-500 ml-1">Au :</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">En Ligne Actifs</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{onlineCount}</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">En Pause</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{inPauseCount}</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Déconnectés</p>
            <p className="text-2xl font-black text-slate-600 mt-1">{offlineCount}</p>
          </div>
          <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cumul Travail Équipe</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{formatHoursMinutes(totalWorkSecondsAll)}</p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par prénom, nom, pseudo, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Filter (if admin) */}
          {isGlobalAdmin && availableTeams.length > 0 && (
            <select
              value={selectedEquipe}
              onChange={(e) => setSelectedEquipe(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les équipes ({availableTeams.length})</option>
              {availableTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ONLINE">En Ligne</option>
            <option value="PAUSE">En Pause (Toutes)</option>
            <option value="OFFLINE">Déconnecté</option>
          </select>

          {/* Export Excel Relevé Présence & Pauses */}
          <button
            onClick={() => exportPresenceToExcel({
              users: visibleUsers,
              sessions,
              startDate,
              endDate,
              equipeFilter: selectedEquipe
            })}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Exporter le relevé détaillé au format Excel pour les fiches de paie et le pilotage"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Conseiller & Équipe</th>
                <th className="py-3.5 px-4">Statut Actuel</th>
                <th className="py-3.5 px-4">{isMultiDay ? 'Jours Travaillés' : 'Connexion'}</th>
                <th className="py-3.5 px-4 text-emerald-700">{isMultiDay ? 'Cumul Travail Net' : 'Temps Travail Net'}</th>
                <th className="py-3.5 px-4 text-amber-700">Pause Café</th>
                <th className="py-3.5 px-4 text-blue-700">Pause Débrief</th>
                <th className="py-3.5 px-4 text-purple-700">Pause Formation</th>
                <th className="py-3.5 px-4 text-slate-700 font-extrabold">Total Pauses</th>
                <th className="py-3.5 px-4 text-right">Détail Historique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    Aucun agent trouvé pour les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ user, currentStatus, totalWorkSeconds, activeDaysCount, sessionsCount, pauseCafeSeconds, pauseCafeCount, pauseDebriefSeconds, pauseDebriefCount, pauseFormationSeconds, pauseFormationCount, totalPauseSeconds, loginAt, logoutAt, isAutoDisconnected }) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName(user))}&background=0284c7&color=fff`}
                          alt={getUserDisplayName(user)}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {getUserDisplayName(user)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span>{user.equipe || 'Sans équipe'}</span>
                            <span>•</span>
                            <span className="text-slate-400">{user.role}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {renderStatusBadge(currentStatus, isAutoDisconnected)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {isMultiDay ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {activeDaysCount} jour{activeDaysCount > 1 ? 's' : ''}
                          </span>
                          <span className="text-[11px] text-slate-400">({sessionsCount} sess.)</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-900 font-semibold">{formatTimeHHMM(loginAt)}</span>
                          {logoutAt && (
                            <span className="text-slate-400 text-[11px] ml-1">→ {formatTimeHHMM(logoutAt)}</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {formatHoursMinutes(totalWorkSeconds)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {pauseCafeSeconds > 0 ? (
                        <div className="font-mono font-medium text-amber-700">
                          <span>{formatHoursMinutes(pauseCafeSeconds)}</span>
                          <span className="text-[10px] text-amber-500 ml-1">({pauseCafeCount}x)</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">0m</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {pauseDebriefSeconds > 0 ? (
                        <div className="font-mono font-medium text-blue-700">
                          <span>{formatHoursMinutes(pauseDebriefSeconds)}</span>
                          <span className="text-[10px] text-blue-500 ml-1">({pauseDebriefCount}x)</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">0m</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {pauseFormationSeconds > 0 ? (
                        <div className="font-mono font-medium text-purple-700">
                          <span>{formatHoursMinutes(pauseFormationSeconds)}</span>
                          <span className="text-[10px] text-purple-500 ml-1">({pauseFormationCount}x)</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">0m</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {formatHoursMinutes(totalPauseSeconds)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedAgentForDetail(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer group"
                        title="Voir le détail des connexions jour par jour, semaine ou mois"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition" />
                        <span>Voir détail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Modal per Agent */}
      {selectedAgentForDetail && (
        <AgentWorkDetailModal
          agent={selectedAgentForDetail}
          sessions={sessions}
          onClose={() => setSelectedAgentForDetail(null)}
          initialStartDate={startDate}
          initialEndDate={endDate}
          initialPeriodMode={periodPreset === 'today' ? 'day' : periodPreset === 'week' ? 'week' : periodPreset === 'month' ? 'month' : 'custom'}
        />
      )}
    </div>
  );
};
