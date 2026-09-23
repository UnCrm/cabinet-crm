import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Coffee,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { AgentWorkSession, User, getUserDisplayName } from '../types/crm';

interface AgentWorkDetailModalProps {
  agent: User;
  sessions: AgentWorkSession[];
  onClose: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
  initialPeriodMode?: PeriodMode;
}

export type PeriodMode = 'day' | 'week' | 'month' | 'custom';

export const AgentWorkDetailModal: React.FC<AgentWorkDetailModalProps> = ({
  agent,
  sessions,
  onClose,
  initialStartDate,
  initialEndDate,
  initialPeriodMode
}) => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>(initialPeriodMode || 'day');
  
  // Reference date picker (defaults to initialStartDate or today)
  const [selectedDate, setSelectedDate] = useState<string>(
    initialStartDate || new Date().toISOString().split('T')[0]
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    initialStartDate || new Date().toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initialEndDate || initialStartDate || new Date().toISOString().split('T')[0]
  );

  // Filter all sessions for this specific agent
  const agentSessions = useMemo(() => {
    return sessions
      .filter(s => s.userId === agent.id)
      .sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
  }, [sessions, agent.id]);

  // Compute date range based on periodMode & selectedDate
  const { startDateStr, endDateStr, periodTitle } = useMemo(() => {
    if (periodMode === 'custom') {
      const s = customStartDate || selectedDate;
      const e = customEndDate || customStartDate || selectedDate;
      const fmt = (dStr: string) => {
        const parts = dStr.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
      };
      return {
        startDateStr: s,
        endDateStr: e,
        periodTitle: s === e ? `Le ${fmt(s)}` : `Du ${fmt(s)} au ${fmt(e)}`
      };
    }

    const base = new Date(selectedDate);
    if (isNaN(base.getTime())) {
      const today = new Date().toISOString().split('T')[0];
      return { startDateStr: today, endDateStr: today, periodTitle: "Aujourd'hui" };
    }

    if (periodMode === 'day') {
      const formatted = base.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return {
        startDateStr: selectedDate,
        endDateStr: selectedDate,
        periodTitle: formatted.charAt(0).toUpperCase() + formatted.slice(1)
      };
    }

    if (periodMode === 'week') {
      // Find Monday of the selected date's week
      const dayOfWeek = base.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(base);
      monday.setDate(base.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const start = monday.toISOString().split('T')[0];
      const end = sunday.toISOString().split('T')[0];
      const startFmt = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const endFmt = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

      return {
        startDateStr: start,
        endDateStr: end,
        periodTitle: `Semaine du ${startFmt} au ${endFmt}`
      };
    }

    // Month mode
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const start = firstDay.toISOString().split('T')[0];
    const end = lastDay.toISOString().split('T')[0];
    const monthFmt = base.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return {
      startDateStr: start,
      endDateStr: end,
      periodTitle: monthFmt.charAt(0).toUpperCase() + monthFmt.slice(1)
    };
  }, [periodMode, selectedDate, customStartDate, customEndDate]);

  // Navigate back and forth in time
  const handleShiftDate = (offset: number) => {
    const base = new Date(selectedDate);
    if (isNaN(base.getTime())) return;

    if (periodMode === 'day') {
      base.setDate(base.getDate() + offset);
    } else if (periodMode === 'week') {
      base.setDate(base.getDate() + offset * 7);
    } else if (periodMode === 'month') {
      base.setMonth(base.getMonth() + offset);
    }
    setSelectedDate(base.toISOString().split('T')[0]);
  };

  // Filter sessions that fall into the selected period
  const filteredSessions = useMemo(() => {
    return agentSessions.filter(s => {
      const sessDate = (s.loginAt || '').split('T')[0];
      return sessDate >= startDateStr && sessDate <= endDateStr;
    });
  }, [agentSessions, startDateStr, endDateStr]);

  // Group filtered sessions day-by-day
  const dailyGroups = useMemo(() => {
    const groups: { [dateKey: string]: AgentWorkSession[] } = {};

    filteredSessions.forEach(s => {
      const dateKey = (s.loginAt || '').split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(s);
    });

    // Sort descending by date
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(dateKey => ({
      dateKey,
      sessions: groups[dateKey].sort((a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime())
    }));
  }, [filteredSessions]);

  // Cumulative Totals for the entire selected period
  const periodTotals = useMemo(() => {
    let totalWorkSeconds = 0;
    let totalCafeSeconds = 0;
    let totalCafeCount = 0;
    let totalDebriefSeconds = 0;
    let totalDebriefCount = 0;
    let totalFormationSeconds = 0;
    let totalFormationCount = 0;
    let sessionCount = filteredSessions.length;
    let autoDisconnectCount = 0;

    filteredSessions.forEach(s => {
      totalWorkSeconds += s.workSeconds || 0;
      if (s.isAutoDisconnected) autoDisconnectCount += 1;

      (s.breaks || []).forEach(b => {
        const isOngoing = !b.endedAt && b.startedAt;
        const duration = isOngoing
          ? Math.max(b.durationSeconds || 0, Math.floor((Date.now() - new Date(b.startedAt).getTime()) / 1000))
          : (b.durationSeconds || 0);

        if (b.type === 'PAUSE_CAFE') {
          totalCafeSeconds += duration;
          totalCafeCount += 1;
        } else if (b.type === 'PAUSE_DEBRIEF') {
          totalDebriefSeconds += duration;
          totalDebriefCount += 1;
        } else if (b.type === 'PAUSE_FORMATION') {
          totalFormationSeconds += duration;
          totalFormationCount += 1;
        }
      });
    });

    const totalPauseSeconds = totalCafeSeconds + totalDebriefSeconds + totalFormationSeconds;

    return {
      totalWorkSeconds,
      totalPauseSeconds,
      totalCafeSeconds,
      totalCafeCount,
      totalDebriefSeconds,
      totalDebriefCount,
      totalFormationSeconds,
      totalFormationCount,
      sessionCount,
      autoDisconnectCount,
      activeDaysCount: dailyGroups.length
    };
  }, [filteredSessions, dailyGroups]);

  // Formatting helpers
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatTimeOnly = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDateDisplay = (dateKey: string) => {
    try {
      const d = new Date(dateKey + 'T00:00:00');
      const text = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return text.charAt(0).toUpperCase() + text.slice(1);
    } catch {
      return dateKey;
    }
  };

  const renderBreakBadge = (type: string) => {
    switch (type) {
      case 'PAUSE_CAFE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-medium">
            <Coffee className="w-3 h-3 text-amber-600" />
            <span>Café</span>
          </span>
        );
      case 'PAUSE_DEBRIEF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-medium">
            <Users className="w-3 h-3 text-blue-600" />
            <span>Débrief</span>
          </span>
        );
      case 'PAUSE_FORMATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] font-medium">
            <GraduationCap className="w-3 h-3 text-purple-600" />
            <span>Formation</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header with Agent Info & Close */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src={agent.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName(agent))}&background=0284c7&color=fff`}
              alt={getUserDisplayName(agent)}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {getUserDisplayName(agent)}
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                  {agent.role === 'AGENT_COMMERCIAL' ? 'Commercial' : agent.role === 'GESTIONNAIRE' ? 'Gestionnaire' : agent.role}
                </span>
                {agent.equipe && (
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-xs font-medium">
                    {agent.equipe}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique chronologique des connexions, heures de travail effectives et détails des pauses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period Selector & Navigation Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Period Mode Buttons (Jour, Semaine, Mois, Personnalisé) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto flex-wrap gap-1">
            <button
              onClick={() => setPeriodMode('day')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'day'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Jour
            </button>
            <button
              onClick={() => setPeriodMode('week')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'week'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Semaine
            </button>
            <button
              onClick={() => setPeriodMode('month')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'month'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Mois
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                periodMode === 'custom'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personnalisé
            </button>
          </div>

          {/* Date Navigator / Custom Range Inputs */}
          {periodMode === 'custom' ? (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
                <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-600">Du :</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
                <span className="font-bold text-slate-600 ml-1">Au :</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
              <button
                onClick={() => {
                  const t = new Date().toISOString().split('T')[0];
                  setCustomStartDate(t);
                  setCustomEndDate(t);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Aujourd'hui"
              >
                Aujourd'hui
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                title="Période précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-lg">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-900 min-w-[160px] text-center">
                  {periodTitle}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-4 h-4 opacity-0 absolute cursor-pointer"
                  title="Choisir une date spécifique"
                />
              </div>

              <button
                onClick={() => handleShiftDate(1)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                title="Période suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="ml-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Aujourd'hui
              </button>
            </div>
          )}
        </div>

        {/* Global KPI Summary for the Selected Period */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travail Net Total</span>
            <p className="text-lg font-black text-emerald-600 mt-0.5">
              {formatDuration(periodTotals.totalWorkSeconds)}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              {periodTotals.activeDaysCount} jour(s) actif(s)
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pauses</span>
            <p className="text-lg font-black text-slate-700 mt-0.5">
              {formatDuration(periodTotals.totalPauseSeconds)}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              {periodTotals.totalCafeCount + periodTotals.totalDebriefCount + periodTotals.totalFormationCount} pause(s)
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-600">
              <span>Pause Café</span>
              <Coffee className="w-3 h-3" />
            </div>
            <p className="text-base font-black text-amber-700 mt-0.5">
              {formatDuration(periodTotals.totalCafeSeconds)}
            </p>
            <span className="text-[10px] text-amber-600 font-medium">
              {periodTotals.totalCafeCount} prise(s)
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-600">
              <span>Pause Débrief</span>
              <Users className="w-3 h-3" />
            </div>
            <p className="text-base font-black text-blue-700 mt-0.5">
              {formatDuration(periodTotals.totalDebriefSeconds)}
            </p>
            <span className="text-[10px] text-blue-600 font-medium">
              {periodTotals.totalDebriefCount} prise(s)
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-600">
              <span>Pause Formation</span>
              <GraduationCap className="w-3 h-3" />
            </div>
            <p className="text-base font-black text-purple-700 mt-0.5">
              {formatDuration(periodTotals.totalFormationSeconds)}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">
              {periodTotals.totalFormationCount} prise(s)
            </span>
          </div>
        </div>

        {/* Scrollable Day-by-Day Detailed Log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {dailyGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Aucune activité enregistrée sur cette période</p>
              <p className="text-xs text-slate-400 mt-1">L'agent n'a pas ouvert de session de travail entre le {startDateStr} et le {endDateStr}.</p>
            </div>
          ) : (
            dailyGroups.map(({ dateKey, sessions: daySessions }) => {
              // Day subtotals
              const dayWorkSeconds = daySessions.reduce((acc, s) => acc + (s.workSeconds || 0), 0);
              let dayCafeSeconds = 0;
              let dayDebriefSeconds = 0;
              let dayFormationSeconds = 0;
              let allBreaksCount = 0;

              daySessions.forEach(s => {
                (s.breaks || []).forEach(b => {
                  allBreaksCount += 1;
                  if (b.type === 'PAUSE_CAFE') dayCafeSeconds += b.durationSeconds || 0;
                  if (b.type === 'PAUSE_DEBRIEF') dayDebriefSeconds += b.durationSeconds || 0;
                  if (b.type === 'PAUSE_FORMATION') dayFormationSeconds += b.durationSeconds || 0;
                });
              });
              const dayPauseSeconds = dayCafeSeconds + dayDebriefSeconds + dayFormationSeconds;

              return (
                <div key={dateKey} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  {/* Day Header Banner */}
                  <div className="p-4 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">
                          {formatDateDisplay(dateKey)}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {daySessions.length} session(s) de travail enregistrée(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-emerald-100/80 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-300/60 font-bold">
                        <span>Travail Net : </span>
                        <span className="font-mono">{formatDuration(dayWorkSeconds)}</span>
                      </div>
                      <div className="bg-slate-200/80 text-slate-700 px-3 py-1 rounded-lg border border-slate-300 font-bold">
                        <span>Pauses : </span>
                        <span className="font-mono">{formatDuration(dayPauseSeconds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sessions List for this Day */}
                  <div className="p-4 space-y-3">
                    {daySessions.map((session, sIdx) => {
                      const sessPausesTotal = (session.breaks || []).reduce(
                        (acc, b) => acc + (b.durationSeconds || 0),
                        0
                      );

                      return (
                        <div
                          key={session.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-2xs"
                        >
                          {/* Session Head */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center border border-blue-200">
                                {sIdx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    Connexion : <span className="font-mono font-black text-emerald-700">{formatTimeOnly(session.loginAt)}</span>
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-xs font-bold text-slate-900">
                                    Déconnexion :{' '}
                                    <span className="font-mono font-black text-rose-700">
                                      {session.logoutAt ? formatTimeOnly(session.logoutAt) : 'Session en cours'}
                                    </span>
                                  </span>
                                  {session.isAutoDisconnected && (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                                      Déconnexion auto (inactif 15 min)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono">
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-bold">
                                Travail : {formatDuration(session.workSeconds)}
                              </span>
                              <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">
                                Pauses : {formatDuration(sessPausesTotal)}
                              </span>
                            </div>
                          </div>

                          {/* Breaks breakdown for this session */}
                          <div className="mt-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Détail des pauses de cette session ({session.breaks?.length || 0}) :
                            </p>

                            {(!session.breaks || session.breaks.length === 0) ? (
                              <p className="text-xs text-slate-400 italic">Aucune pause prise durant cette session de travail.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {session.breaks.map((brk, bIdx) => (
                                  <div
                                    key={brk.id || bIdx}
                                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        {renderBreakBadge(brk.type)}
                                      </div>
                                      <p className="text-[11px] text-slate-500 font-mono">
                                        {formatTimeOnly(brk.startedAt)}{' '}
                                        {brk.endedAt ? `→ ${formatTimeOnly(brk.endedAt)}` : '(en cours)'}
                                      </p>
                                    </div>
                                    <span className="font-mono font-bold text-slate-800">
                                      {formatDuration(
                                        !brk.endedAt && brk.startedAt
                                          ? Math.max(brk.durationSeconds || 0, Math.floor((Date.now() - new Date(brk.startedAt).getTime()) / 1000))
                                          : (brk.durationSeconds || 0)
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Les données affichées reflètent les connexions authentifiées et synchronisées en temps réel.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
