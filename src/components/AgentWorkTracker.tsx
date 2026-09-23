import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Coffee, GraduationCap, Users, Play, Power, AlertTriangle, Clock } from 'lucide-react';
import { AgentWorkSession, AgentWorkStatus, User, shouldTrackAgentPresence } from '../types/crm';
import { syncAgentSessionToFirestore } from '../firebase';

interface AgentWorkTrackerProps {
  currentUser: User | null;
  activeSession: AgentWorkSession | null;
  onUpdateSession: (session: AgentWorkSession) => void;
  onAutoLogout: () => void;
  onManualLogout: () => void;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes = 900,000 ms

export const AgentWorkTracker: React.FC<AgentWorkTrackerProps> = ({
  currentUser,
  activeSession,
  onUpdateSession,
  onAutoLogout,
  onManualLogout
}) => {
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [secondsRemainingWarning, setSecondsRemainingWarning] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const breakDropdownRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activeSessionRef = useRef<AgentWorkSession | null>(activeSession);
  activeSessionRef.current = activeSession;

  // Close break dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (breakDropdownRef.current && !breakDropdownRef.current.contains(e.target as Node)) {
        setShowBreakModal(false);
      }
    };
    if (showBreakModal) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showBreakModal]);

  // Track user interactions to reset inactivity timer
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemainingWarning(null);

    // If session is online, update lastActiveAt timestamp
    if (activeSessionRef.current && activeSessionRef.current.status === 'ONLINE') {
      const nowIso = new Date().toISOString();
      const updated = {
        ...activeSessionRef.current,
        lastActiveAt: nowIso
      };
      // State change handled periodically or on event
    }
  }, []);

  // Listen to user interaction events (mouse, keyboard, touch, scroll)
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserEvent = () => recordActivity();

    events.forEach(evt => window.addEventListener(evt, handleUserEvent, { passive: true }));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserEvent));
    };
  }, [recordActivity]);

  // Main 1-second interval: increment work duration if ONLINE, or pause duration if on break
  useEffect(() => {
    if (!currentUser || !activeSession || !shouldTrackAgentPresence(currentUser.role)) return;

    const interval = setInterval(() => {
      // Trigger UI re-render for live counters
      setTick(t => t + 1);

      const current = activeSessionRef.current;
      if (!current) return;

      const now = Date.now();
      const inactiveMs = now - lastActivityRef.current;

      // 1. Inactivity check (15 minutes) - only triggers if currently ONLINE (if on break, agent is intentionally paused)
      if (current.status === 'ONLINE') {
        if (inactiveMs >= INACTIVITY_TIMEOUT_MS) {
          // Trigger Auto-Logout
          const nowIso = new Date().toISOString();
          const closedSession: AgentWorkSession = {
            ...current,
            status: 'OFFLINE',
            logoutAt: nowIso,
            lastActiveAt: nowIso,
            isAutoDisconnected: true
          };
          syncAgentSessionToFirestore(closedSession);
          onUpdateSession(closedSession);
          onAutoLogout();
          return;
        } else if (inactiveMs >= INACTIVITY_TIMEOUT_MS - 60000) {
          // Show countdown warning in the last 60 seconds
          const remSecs = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - inactiveMs) / 1000));
          setSecondsRemainingWarning(remSecs);
        } else {
          setSecondsRemainingWarning(null);
        }
      } else {
        setSecondsRemainingWarning(null);
      }

      // 2. Increment active work seconds OR active pause seconds
      if (current.status === 'ONLINE') {
        const updated: AgentWorkSession = {
          ...current,
          workSeconds: (current.workSeconds || 0) + 1,
          lastActiveAt: new Date().toISOString()
        };
        onUpdateSession(updated);

        // Sync to cloud every 30 seconds to avoid spamming
        if (updated.workSeconds % 30 === 0) {
          syncAgentSessionToFirestore(updated);
        }
      } else if (
        current.status === 'PAUSE_CAFE' ||
        current.status === 'PAUSE_DEBRIEF' ||
        current.status === 'PAUSE_FORMATION'
      ) {
        // Increment ongoing break duration
        const updatedBreaks = [...(current.breaks || [])];
        const nowIso = new Date().toISOString();
        const nowMs = Date.now();

        if (updatedBreaks.length === 0 || updatedBreaks[updatedBreaks.length - 1].endedAt) {
          // Fallback: create break entry if not present
          updatedBreaks.push({
            id: `break-${nowMs}`,
            type: current.status as 'PAUSE_CAFE' | 'PAUSE_DEBRIEF' | 'PAUSE_FORMATION',
            startedAt: nowIso,
            durationSeconds: 1
          });
        } else {
          const lastIdx = updatedBreaks.length - 1;
          const ongoing = updatedBreaks[lastIdx];
          const startMs = ongoing.startedAt ? new Date(ongoing.startedAt).getTime() : nowMs;
          const elapsed = Math.max((ongoing.durationSeconds || 0) + 1, Math.floor((nowMs - startMs) / 1000));

          updatedBreaks[lastIdx] = {
            ...ongoing,
            durationSeconds: elapsed
          };
        }

        const updated: AgentWorkSession = {
          ...current,
          breaks: updatedBreaks,
          lastActiveAt: nowIso
        };
        onUpdateSession(updated);

        // Sync to cloud periodically (every 15s) so managers see live pause tracking
        const currentBreakDuration = updatedBreaks[updatedBreaks.length - 1]?.durationSeconds || 0;
        if (currentBreakDuration % 15 === 0) {
          syncAgentSessionToFirestore(updated);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, activeSession?.id, onAutoLogout, onUpdateSession]);

  if (!currentUser || !activeSession || !shouldTrackAgentPresence(currentUser.role)) return null;

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  // Start a specific break
  const handleStartBreak = (type: 'PAUSE_CAFE' | 'PAUSE_DEBRIEF' | 'PAUSE_FORMATION') => {
    const nowIso = new Date().toISOString();
    const newBreak = {
      id: `break-${Date.now()}`,
      type,
      startedAt: nowIso,
      durationSeconds: 0
    };

    const updated: AgentWorkSession = {
      ...activeSession,
      status: type,
      lastActiveAt: nowIso,
      breaks: [...(activeSession.breaks || []), newBreak]
    };

    setShowBreakModal(false);
    onUpdateSession(updated);
    syncAgentSessionToFirestore(updated);
    lastActivityRef.current = Date.now();
  };

  // Resume work from break
  const handleResumeWork = () => {
    const nowIso = new Date().toISOString();
    const updatedBreaks = [...(activeSession.breaks || [])];
    if (updatedBreaks.length > 0) {
      const lastIdx = updatedBreaks.length - 1;
      const lastBreak = updatedBreaks[lastIdx];
      if (!lastBreak.endedAt) {
        const startMs = lastBreak.startedAt ? new Date(lastBreak.startedAt).getTime() : Date.now();
        const finalDuration = Math.max(lastBreak.durationSeconds || 0, Math.floor((Date.now() - startMs) / 1000));
        updatedBreaks[lastIdx] = {
          ...lastBreak,
          endedAt: nowIso,
          durationSeconds: finalDuration
        };
      }
    }

    const updated: AgentWorkSession = {
      ...activeSession,
      status: 'ONLINE',
      lastActiveAt: nowIso,
      breaks: updatedBreaks
    };

    onUpdateSession(updated);
    syncAgentSessionToFirestore(updated);
    lastActivityRef.current = Date.now();
  };

  const isOnBreak = activeSession.status === 'PAUSE_CAFE' ||
    activeSession.status === 'PAUSE_DEBRIEF' ||
    activeSession.status === 'PAUSE_FORMATION';

  // Calculate ongoing pause duration in real-time
  const breaksList = activeSession.breaks || [];
  const ongoingBreak = breaksList.length > 0 ? breaksList[breaksList.length - 1] : null;
  const isOngoingBreakActive = Boolean(isOnBreak && ongoingBreak && !ongoingBreak.endedAt);

  const currentBreakSeconds = isOngoingBreakActive && ongoingBreak
    ? Math.max(
        ongoingBreak.durationSeconds || 0,
        ongoingBreak.startedAt ? Math.floor((Date.now() - new Date(ongoingBreak.startedAt).getTime()) / 1000) : 0
      )
    : 0;

  // Cumulative pause time across all breaks taken during this session
  const totalSessionPauseSeconds = breaksList.reduce((acc, b) => {
    if (!b.endedAt && isOngoingBreakActive && ongoingBreak && b.id === ongoingBreak.id) {
      return acc + currentBreakSeconds;
    }
    return acc + (b.durationSeconds || 0);
  }, 0);

  // Current status badge config
  const getStatusConfig = () => {
    switch (activeSession.status) {
      case 'ONLINE':
        return {
          label: 'En Ligne',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dotClass: 'bg-emerald-400 animate-pulse',
          Icon: Play
        };
      case 'PAUSE_CAFE':
        return {
          label: 'Pause Café',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dotClass: 'bg-amber-400 animate-pulse',
          Icon: Coffee
        };
      case 'PAUSE_DEBRIEF':
        return {
          label: 'Pause Débrief',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          dotClass: 'bg-blue-400 animate-pulse',
          Icon: Users
        };
      case 'PAUSE_FORMATION':
        return {
          label: 'Pause Formation',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          dotClass: 'bg-purple-400 animate-pulse',
          Icon: GraduationCap
        };
      default:
        return {
          label: 'Déconnecté',
          badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
          dotClass: 'bg-slate-400',
          Icon: Power
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <>
      {/* Warning popup when about to be disconnected (last 60s of inactivity) */}
      {secondsRemainingWarning !== null && (
        <div className="fixed bottom-5 right-5 z-50 bg-amber-500 text-slate-950 px-4 py-3 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <p className="font-extrabold">Inactivité détectée !</p>
            <p className="text-[11px] font-medium">Déconnexion automatique dans <span className="font-bold underline">{secondsRemainingWarning}s</span> sans action.</p>
          </div>
          <button
            onClick={recordActivity}
            className="ml-2 px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Je suis là !
          </button>
        </div>
      )}

      {/* Persistent Status Bar in Navbar or Sub-Header */}
      <div className="flex items-center gap-2 text-xs">
        {/* Dynamic Counter Display */}
        {isOnBreak ? (
          // ON BREAK: Active Pause Timer counting up second-by-second
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              activeSession.status === 'PAUSE_CAFE'
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-200 shadow-md shadow-amber-950/40'
                : activeSession.status === 'PAUSE_DEBRIEF'
                ? 'bg-blue-950/50 border-blue-500/60 text-blue-200 shadow-md shadow-blue-950/40'
                : 'bg-purple-950/50 border-purple-500/60 text-purple-200 shadow-md shadow-purple-950/40'
            }`}
            title={`Pause en cours : ${formatTime(currentBreakSeconds)}. Temps de travail effectif figé à ${formatTime(activeSession.workSeconds)}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
            
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs whitespace-nowrap flex items-center gap-1">
                <statusConfig.Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{statusConfig.label} :</span>
              </span>

              {/* LIVE PAUSE COUNTER */}
              <span className="font-mono font-black text-white text-xs sm:text-sm tracking-wider bg-black/40 px-2 py-0.5 rounded-lg border border-white/10 shadow-inner flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                {formatTime(currentBreakSeconds)}
              </span>

              {/* Cumulative Pause Time across session */}
              {totalSessionPauseSeconds > currentBreakSeconds && (
                <span
                  className="text-[10px] opacity-80 font-normal hidden lg:inline ml-0.5"
                  title="Total cumulé de toutes vos pauses aujourd'hui"
                >
                  (Cumul: {formatTime(totalSessionPauseSeconds)})
                </span>
              )}

              {/* Frozen effective work time */}
              <span
                className="text-[10px] text-slate-400 hidden xl:inline ml-1.5 pl-1.5 border-l border-slate-700/80 font-mono"
                title="Temps de travail effectif figé pendant la pause"
              >
                Travail: {formatTime(activeSession.workSeconds)}
              </span>
            </div>
          </div>
        ) : (
          // ONLINE: Active Work Timer counting up second-by-second
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-200"
            title={`En ligne. Travail effectif : ${formatTime(activeSession.workSeconds)}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dotClass}`} />
            
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-300 hidden md:inline text-xs">
                {statusConfig.label} :
              </span>

              {/* LIVE WORK COUNTER */}
              <span className="font-mono font-bold text-white text-xs tracking-wider">
                {formatTime(activeSession.workSeconds)}
              </span>

              {/* If pauses were taken today, display total pauses */}
              {totalSessionPauseSeconds > 0 && (
                <span
                  className="text-[10px] text-amber-400 hidden md:inline-flex items-center gap-1 ml-1.5 pl-1.5 border-l border-slate-700 font-mono"
                  title="Total des pauses prises durant cette journée"
                >
                  <Coffee className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{formatTime(totalSessionPauseSeconds)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pause & Resume Actions */}
        {isOnBreak ? (
          <button
            onClick={handleResumeWork}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/30 cursor-pointer animate-pulse shrink-0"
            title="Reprendre le travail en ligne"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Reprendre</span>
          </button>
        ) : (
          <div className="relative shrink-0" ref={breakDropdownRef}>
            <button
              onClick={() => setShowBreakModal(!showBreakModal)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 font-medium rounded-xl text-xs transition cursor-pointer"
              title="Prendre une pause"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Prendre une pause</span>
            </button>

            {/* Break selection dropdown */}
            {showBreakModal && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <p className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sélectionner le motif :
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => handleStartBreak('PAUSE_CAFE')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 rounded-xl transition cursor-pointer text-left"
                  >
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>Pause Café</span>
                  </button>
                  <button
                    onClick={() => handleStartBreak('PAUSE_DEBRIEF')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-blue-500/20 hover:text-blue-300 rounded-xl transition cursor-pointer text-left"
                  >
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Pause Débrief</span>
                  </button>
                  <button
                    onClick={() => handleStartBreak('PAUSE_FORMATION')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-purple-500/20 hover:text-purple-300 rounded-xl transition cursor-pointer text-left"
                  >
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span>Pause Formation</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
