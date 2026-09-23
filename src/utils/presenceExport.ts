import * as XLSX from 'xlsx';
import { AgentWorkSession, User, getUserDisplayName } from '../types/crm';

interface ExportPresenceParams {
  users: User[];
  sessions: AgentWorkSession[];
  startDate: string;
  endDate: string;
  equipeFilter?: string;
}

export function exportPresenceToExcel({
  users,
  sessions,
  startDate,
  endDate,
  equipeFilter
}: ExportPresenceParams) {
  // Filter sessions within date range
  const filteredSessions = sessions.filter(s => {
    const sessionDate = (s.loginAt || '').split('T')[0];
    if (!sessionDate) return false;
    if (startDate && sessionDate < startDate) return false;
    if (endDate && sessionDate > endDate) return false;
    return true;
  });

  const isAllEquipes = !equipeFilter || equipeFilter === 'ALL';

  // 1. Feuille Synthèse par Conseiller
  const summaryRows = users
    .filter(u => isAllEquipes || (u.equipe && u.equipe.toLowerCase() === equipeFilter.toLowerCase()))
    .map(user => {
      const userSessions = filteredSessions.filter(s => s.userId === user.id);
      
      const totalWorkSeconds = userSessions.reduce((acc, s) => acc + (s.workSeconds || 0), 0);

      // Breaks calculation
      let cafeSec = 0;
      let debriefSec = 0;
      let formationSec = 0;

      userSessions.forEach(s => {
        (s.breaks || []).forEach(b => {
          if (b.type === 'PAUSE_CAFE') cafeSec += (b.durationSeconds || 0);
          else if (b.type === 'PAUSE_DEBRIEF') debriefSec += (b.durationSeconds || 0);
          else if (b.type === 'PAUSE_FORMATION') formationSec += (b.durationSeconds || 0);
        });
      });

      const totalPauseSec = cafeSec + debriefSec + formationSec;

      // Active days set
      const activeDays = new Set<string>();
      userSessions.forEach(s => {
        const d = (s.loginAt || '').split('T')[0];
        if (d && (s.workSeconds || 0) > 0) activeDays.add(d);
      });

      const formatHours = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h}h ${String(m).padStart(2, '0')}m`;
      };

      return {
        'Conseiller': getUserDisplayName(user),
        'Nom Complet': `${user.prenom} ${user.nom}`.trim(),
        'Équipe': user.equipe || 'Sans équipe',
        'Rôle': user.role,
        'Jours Actifs': activeDays.size,
        'Nombre Sessions': userSessions.length,
        'Heures Travaillées Nettes': formatHours(totalWorkSeconds),
        'Heures Nettes (Décimal)': Number((totalWorkSeconds / 3600).toFixed(2)),
        'Total Pauses': formatHours(totalPauseSec),
        'Pause Café': formatHours(cafeSec),
        'Pause Débrief': formatHours(debriefSec),
        'Pause Formation': formatHours(formationSec)
      };
    });

  // 2. Feuille Détail Session par Session
  const detailRows = filteredSessions.map(s => {
    const user = users.find(u => u.id === s.userId);
    const dateStr = (s.loginAt || '').split('T')[0];
    const loginTime = s.loginAt ? new Date(s.loginAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
    const logoutTime = s.logoutAt ? new Date(s.logoutAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : (s.status === 'ONLINE' ? 'En cours' : 'Déconnecté');

    let cafeSec = 0;
    let debriefSec = 0;
    let formationSec = 0;

    (s.breaks || []).forEach(b => {
      if (b.type === 'PAUSE_CAFE') cafeSec += (b.durationSeconds || 0);
      else if (b.type === 'PAUSE_DEBRIEF') debriefSec += (b.durationSeconds || 0);
      else if (b.type === 'PAUSE_FORMATION') formationSec += (b.durationSeconds || 0);
    });

    const formatHours = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h ${String(m).padStart(2, '0')}m`;
    };

    return {
      'Date': dateStr,
      'Conseiller': s.userPseudo || (user ? getUserDisplayName(user) : 'Agent'),
      'Équipe': s.userEquipe || user?.equipe || 'N/A',
      'Heure Connexion': loginTime,
      'Heure Déconnexion': logoutTime,
      'Statut': s.status,
      'Temps Net Travaillé': formatHours(s.workSeconds || 0),
      'Temps Net (Décimal)': Number(((s.workSeconds || 0) / 3600).toFixed(2)),
      'Pause Café': formatHours(cafeSec),
      'Pause Débrief': formatHours(debriefSec),
      'Pause Formation': formatHours(formationSec),
      'Déconnexion Auto Inactivité': s.isAutoDisconnected ? 'Oui' : 'Non'
    };
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthese_Presence');

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Sessions');

  const fileName = `Releve_Presence_${startDate}_au_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
