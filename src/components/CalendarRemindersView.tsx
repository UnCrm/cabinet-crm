import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Car, 
  Home, 
  Briefcase, 
  Check, 
  X, 
  CalendarRange, 
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { Lead, LeadType, User, CabinetInfo, ActivityLogItem, getUserDisplayName, completeProchaineAction, cancelProchaineAction } from '../types/crm';
import { matchLeadSearch } from '../utils/search';
import { getAccessibleLeads } from '../utils/permissions';

interface CalendarRemindersViewProps {
  leads: Lead[];
  currentUser: User;
  users: User[];
  cabinetInfo: CabinetInfo;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onCompleteReminder: (leadId: string) => void;
  onCancelReminder?: (leadId: string) => void;
  onOpenNewLeadModal: () => void;
}

type ViewMode = 'month' | 'week' | 'agenda';

export const CalendarRemindersView: React.FC<CalendarRemindersViewProps> = ({
  leads,
  currentUser,
  users,
  cabinetInfo,
  onSelectLead,
  onUpdateLead,
  onCompleteReminder,
  onCancelReminder,
  onOpenNewLeadModal
}) => {
  // Current calendar viewing date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduct, setFilterProduct] = useState<LeadType | 'ALL'>('ALL');
  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modals
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);
  const [rescheduleLead, setRescheduleLead] = useState<Lead | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');
  const [rescheduleTitle, setRescheduleTitle] = useState('');

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter accessible leads according to user permissions (agent sees ONLY assigned leads)
  const accessibleLeads = useMemo(() => {
    return getAccessibleLeads(leads, currentUser);
  }, [leads, currentUser]);

  // Filter out leads with scheduled reminders from accessible leads only
  const allReminders = useMemo(() => {
    return accessibleLeads.filter(l => Boolean(l.prochaineActionDate));
  }, [accessibleLeads]);

  // Statistics
  const stats = useMemo(() => {
    const active = allReminders.filter(l => l.status !== 'GAGNE' && l.status !== 'PERDU');
    const overdue = active.filter(l => (l.prochaineActionDate || '') < todayStr);
    const today = active.filter(l => (l.prochaineActionDate || '') === todayStr);
    
    // Within 7 days
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];
    const thisWeek = active.filter(l => {
      const d = l.prochaineActionDate || '';
      return d >= todayStr && d <= nextWeekStr;
    });

    return {
      total: active.length,
      overdue: overdue.length,
      today: today.length,
      thisWeek: thisWeek.length
    };
  }, [allReminders, todayStr]);

  // Filtered Reminders based on user selections
  const filteredReminders = useMemo(() => {
    return allReminders.filter(lead => {
      const actionDate = lead.prochaineActionDate || '';
      
      // Urgency filter
      if (filterUrgency === 'OVERDUE' && actionDate >= todayStr) return false;
      if (filterUrgency === 'TODAY' && actionDate !== todayStr) return false;
      if (filterUrgency === 'UPCOMING' && actionDate <= todayStr) return false;

      // Product filter
      if (filterProduct !== 'ALL' && lead.type !== filterProduct) return false;

      // User filter
      if (filterUser !== 'ALL') {
        const assigned = lead.attribueA || lead.assignedBroker;
        if (assigned !== filterUser) return false;
      }

      // Search text query sans contrainte (téléphone, immat, nom, ville, titre...)
      if (searchQuery.trim()) {
        const title = (lead.prochaineActionIntitule || '').toLowerCase();
        const matchesTitle = title.includes(searchQuery.toLowerCase().trim());
        if (!matchesTitle && !matchLeadSearch(lead, searchQuery)) {
          return false;
        }
      }

      // Specific single day filter if clicked in calendar
      if (selectedDate && actionDate !== selectedDate) {
        return false;
      }

      return true;
    });
  }, [allReminders, filterUrgency, filterProduct, filterUser, searchQuery, selectedDate, todayStr]);

  // Map reminders by date string YYYY-MM-DD
  const remindersByDate = useMemo(() => {
    const map = new Map<string, Lead[]>();
    allReminders.forEach(lead => {
      const d = lead.prochaineActionDate;
      if (!d) return;
      const current = map.get(d) || [];
      current.push(lead);
      map.set(d, current);
    });
    return map;
  }, [allReminders]);

  // Calendar navigation
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Month grid generation (Monday to Sunday)
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // In JS: 0=Sunday, 1=Monday... We want 0=Monday, 6=Sunday
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days = [];

    // Preceding month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const pMonth = month === 0 ? 11 : month - 1;
      const pYear = month === 0 ? year - 1 : year;
      const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Trailing next month days to fill grid of 35 or 42
    const totalCells = days.length > 35 ? 42 : 35;
    const remainingDays = totalCells - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nMonth = month === 11 ? 0 : month + 1;
      const nYear = month === 11 ? year + 1 : year;
      const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [currentDate, todayStr]);

  // Week view calculation
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    const monday = new Date(d.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      const year = nextDay.getFullYear();
      const month = String(nextDay.getMonth() + 1).padStart(2, '0');
      const dayNum = String(nextDay.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;
      days.push({
        dateStr,
        date: nextDay,
        dayName: nextDay.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNum: nextDay.getDate(),
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Handle Reschedule submit
  const handleConfirmReschedule = () => {
    if (!rescheduleLead || !rescheduleDate) return;

    const newActivity: ActivityLogItem = {
      id: 'act-resched-' + Date.now(),
      type: 'STATUS_CHANGE',
      title: 'Reprogrammation rappel',
      description: `Rappel reprogrammé au ${rescheduleDate} à ${rescheduleTime} (${rescheduleTitle || 'Relance'})`,
      author: getUserDisplayName(currentUser),
      date: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedLead: Lead = {
      ...rescheduleLead,
      prochaineActionDate: rescheduleDate,
      prochaineActionHeure: rescheduleTime,
      prochaineActionIntitule: rescheduleTitle || rescheduleLead.prochaineActionIntitule || 'Relance client',
      historyLogs: [newActivity, ...(rescheduleLead.historyLogs || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateLead(updatedLead);
    setRescheduleLead(null);
  };

  // Quick preset reschedule
  const handleQuickReschedule = (lead: Lead, daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;

    const newActivity: ActivityLogItem = {
      id: 'act-resched-quick-' + Date.now(),
      type: 'STATUS_CHANGE',
      title: `Rappel décalé (+${daysToAdd}j)`,
      description: `Rappel décalé de +${daysToAdd}j au ${newDateStr}`,
      author: getUserDisplayName(currentUser),
      date: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedLead: Lead = {
      ...lead,
      prochaineActionDate: newDateStr,
      historyLogs: [newActivity, ...(lead.historyLogs || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateLead(updatedLead);
  };

  // Complete a reminder
  const handleComplete = (lead: Lead) => {
    const author = getUserDisplayName(currentUser);
    const updatedLead = completeProchaineAction(lead, author);
    onUpdateLead(updatedLead);
    onCompleteReminder(lead.id);
  };

  // Cancel a reminder
  const handleCancel = (lead: Lead) => {
    const author = getUserDisplayName(currentUser);
    const updatedLead = cancelProchaineAction(lead, author);
    onUpdateLead(updatedLead);
    if (onCancelReminder) {
      onCancelReminder(lead.id);
    } else {
      onCompleteReminder(lead.id);
    }
  };

  const getProductBadge = (type: LeadType) => {
    switch (type) {
      case 'AUTO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Car className="w-3 h-3 text-blue-600" />
            Auto
          </span>
        );
      case 'HABITATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Home className="w-3 h-3 text-emerald-600" />
            Habitation
          </span>
        );
      case 'VTC':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Briefcase className="w-3 h-3 text-amber-700" />
            VTC
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & View Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Calendrier & Rappels
                </h1>
                <p className="text-xs text-slate-500">
                  Planning interactif des relances commerciales, rendez-vous clients et échéances
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Buttons */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Mois</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Semaine</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Agenda & Liste</span>
              </button>
            </div>

            {/* Nouveau Rappel Button */}
            <button
              onClick={() => setIsAddReminderModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Rappel</span>
            </button>
          </div>
        </div>

        {/* Date Navigation Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              onClick={handleNext}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-sm font-black text-slate-800 capitalize ml-2">
              {viewMode === 'month' &&
                currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              {viewMode === 'week' &&
                `Semaine du ${weekDays[0]?.dayNum} au ${weekDays[6]?.dayNum} ${currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
              {viewMode === 'agenda' &&
                `Tous les rappels (${filteredReminders.length})`}
            </span>
          </div>

          {selectedDate && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
              <span>Jour filtré : <strong>{selectedDate}</strong></span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-blue-600 hover:text-blue-900 font-bold ml-1 cursor-pointer"
              >
                ✕ Tout afficher
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Retard */}
        <div 
          onClick={() => setFilterUrgency(filterUrgency === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterUrgency === 'OVERDUE'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">En Retard</span>
            <span className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-rose-800 mt-2">{stats.overdue}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Relances dépassées à traiter</p>
        </div>

        {/* Aujourd'hui */}
        <div 
          onClick={() => setFilterUrgency(filterUrgency === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterUrgency === 'TODAY'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Aujourd'hui</span>
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-amber-800 mt-2">{stats.today}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">À effectuer dans la journée</p>
        </div>

        {/* Cette Semaine */}
        <div 
          onClick={() => setFilterUrgency(filterUrgency === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterUrgency === 'UPCOMING'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">7 Prochains Jours</span>
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <CalendarRange className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-blue-800 mt-2">{stats.thisWeek}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Relances programmées</p>
        </div>

        {/* Total Actifs */}
        <div 
          onClick={() => setFilterUrgency('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterUrgency === 'ALL'
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400'
              : 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Total Programmés</span>
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-indigo-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sur l'ensemble du cabinet</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par prospect, téléphone, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Product Filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 hidden sm:inline">Produit :</span>
          {(['ALL', 'AUTO', 'HABITATION', 'VTC'] as const).map((prod) => (
            <button
              key={prod}
              onClick={() => setFilterProduct(prod)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterProduct === prod
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {prod === 'ALL' ? 'Tous' : prod === 'AUTO' ? 'Auto' : prod === 'HABITATION' ? 'Habitation' : 'VTC'}
            </button>
          ))}
        </div>

        {/* Assigned Broker Filter - Only accessible to managers and admins */}
        {Boolean(currentUser?.permissions?.canViewAllLeads || currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTEUR_PRODUCTION') ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 hidden sm:inline">Conseiller :</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Tous les conseillers</option>
              {users.map((u) => (
                <option key={u.id} value={getUserDisplayName(u)}>
                  {getUserDisplayName(u)} ({u.role})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 shadow-xs">
            <span>🔒 Mes rappels uniquement ({getUserDisplayName(currentUser)})</span>
          </div>
        )}
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthGridDays.map((dayObj, idx) => {
              const dayReminders = remindersByDate.get(dayObj.dateStr) || [];
              const isSelected = selectedDate === dayObj.dateStr;
              const hasOverdue = dayReminders.some(l => dayObj.dateStr < todayStr);

              return (
                <div
                  key={`day-${dayObj.dateStr}-${idx}`}
                  onClick={() => {
                    if (dayReminders.length > 0) {
                      setSelectedDate(selectedDate === dayObj.dateStr ? null : dayObj.dateStr);
                    }
                  }}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition group relative ${
                    !dayObj.isCurrentMonth
                      ? 'bg-slate-50/60 text-slate-300'
                      : 'bg-white hover:bg-slate-50/80 text-slate-700'
                  } ${dayObj.isToday ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/10' : ''} ${
                    isSelected ? 'ring-2 ring-inset ring-indigo-600 bg-indigo-50/20' : ''
                  } ${dayReminders.length > 0 ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        dayObj.isToday
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : dayObj.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayObj.dayNum}
                    </span>

                    {dayReminders.length > 0 && (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                          hasOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : dayObj.dateStr === todayStr
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {dayReminders.length}
                      </span>
                    )}
                  </div>

                  {/* Reminder Chips */}
                  <div className="mt-1.5 space-y-1 overflow-hidden">
                    {dayReminders.slice(0, 2).map((lead) => {
                      const isOverdue = dayObj.dateStr < todayStr;
                      const isToday = dayObj.dateStr === todayStr;

                      return (
                        <div
                          key={`chip-${lead.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className={`px-1.5 py-1 rounded text-[10px] truncate flex items-center gap-1 border transition hover:scale-[1.02] cursor-pointer shadow-2xs ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : isToday
                              ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 font-semibold'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                          }`}
                          title={`${lead.prochaineActionHeure || ''} - ${lead.prenom} ${lead.nom} : ${lead.prochaineActionIntitule || 'Rappel'}`}
                        >
                          <span className="font-mono font-bold shrink-0">
                            {lead.prochaineActionHeure || '14:00'}
                          </span>
                          <span className="font-bold truncate">
                            {lead.nom}
                          </span>
                        </div>
                      );
                    })}

                    {dayReminders.length > 2 && (
                      <div className="text-[10px] font-bold text-blue-600 px-1 hover:underline">
                        +{dayReminders.length - 2} autres...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {weekDays.map((wDay) => {
              const dayReminders = remindersByDate.get(wDay.dateStr) || [];
              const isOverdue = wDay.dateStr < todayStr;

              return (
                <div key={wDay.dateStr} className={`p-3 min-h-[350px] flex flex-col ${
                  wDay.isToday ? 'bg-blue-50/20 ring-1 ring-inset ring-blue-400' : 'bg-white'
                }`}>
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase font-bold text-slate-400">{wDay.dayName}</p>
                      <p className={`text-base font-black ${wDay.isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                        {wDay.dayNum}
                      </p>
                    </div>
                    {dayReminders.length > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {dayReminders.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 flex-1 overflow-y-auto">
                    {dayReminders.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">
                        Aucun rappel
                      </p>
                    ) : (
                      dayReminders.map((lead) => (
                        <div
                          key={`week-${lead.id}`}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-blue-400 transition space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {lead.prochaineActionHeure || '14:00'}
                            </span>
                            {getProductBadge(lead.type)}
                          </div>

                          <div 
                            onClick={() => onSelectLead(lead)} 
                            className="cursor-pointer hover:underline"
                          >
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {lead.prenom} {lead.nom}
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              📌 {lead.prochaineActionIntitule || 'Rappeler le client'}
                            </p>
                          </div>

                          <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                            <a
                              href={`tel:${lead.telephone}`}
                              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                              title="Appeler"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{lead.telephone}</span>
                            </a>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleComplete(lead)}
                                className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition cursor-pointer"
                                title="Marquer comme fait"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCancel(lead)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded transition cursor-pointer"
                                title="Annuler l'action"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda & List Detailed Section (always visible in 'agenda' mode or under calendar if selected) */}
      {(viewMode === 'agenda' || selectedDate) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-base text-slate-900">
                {selectedDate
                  ? `Rappels du ${selectedDate}`
                  : `Échéancier & Liste des Rappels (${filteredReminders.length})`}
              </h2>
            </div>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Voir tous les rappels
              </button>
            )}
          </div>

          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">Aucun rappel trouvé</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {selectedDate
                  ? 'Aucune relance de prévue pour cette journée spécifique.'
                  : 'Félicitations, aucun rappel ne correspond aux filtres appliqués.'}
              </p>
              <button
                onClick={() => setIsAddReminderModalOpen(true)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Programmer un nouveau rappel</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReminders
                .sort((a, b) => {
                  const dateA = `${a.prochaineActionDate || ''} ${a.prochaineActionHeure || ''}`;
                  const dateB = `${b.prochaineActionDate || ''} ${b.prochaineActionHeure || ''}`;
                  return dateA.localeCompare(dateB);
                })
                .map((lead) => {
                  const actionDate = lead.prochaineActionDate || '';
                  const isOverdue = actionDate < todayStr;
                  const isToday = actionDate === todayStr;

                  return (
                    <div
                      key={`agenda-${lead.id}`}
                      className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/80 -mx-6 px-6 transition rounded-xl"
                    >
                      {/* Left: Client & Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : isToday
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {isOverdue ? '🚨 EN RETARD' : isToday ? '⚡ AUJOURD\'HUI' : '📅 PROGRAMMÉ'}
                          </span>

                          <span className="font-mono font-bold text-xs text-slate-700 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {lead.prochaineActionDate} {lead.prochaineActionHeure && `à ${lead.prochaineActionHeure}`}
                          </span>

                          {getProductBadge(lead.type)}

                          <span className="text-xs text-slate-400 font-mono">
                            Ref: {lead.referenceDevis}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <p 
                            onClick={() => onSelectLead(lead)} 
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 transition cursor-pointer"
                          >
                            {lead.civilite || 'Mr'} {lead.prenom} {lead.nom}
                          </p>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {lead.ville} {lead.codePostal && `(${lead.codePostal})`}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 bg-amber-50/60 border border-amber-200/60 p-2 rounded-lg inline-block">
                          📌 <strong>Action prévue :</strong> {lead.prochaineActionIntitule || 'Rappeler le prospect'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          <a
                            href={`tel:${lead.telephone}`}
                            className="flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                            <span>{lead.telephone}</span>
                          </a>

                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-medium hover:underline"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lead.email}</span>
                          </a>

                          <span className="flex items-center gap-1 text-slate-500">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            Assigné : <strong className="text-slate-700 ml-0.5">{lead.attribueA || lead.assignedBroker || 'Non assigné'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Quick Reschedule Presets */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => handleQuickReschedule(lead, 1)}
                            className="px-2 py-1 hover:bg-white text-[11px] font-bold text-slate-700 rounded-lg transition cursor-pointer"
                            title="Reporter à demain"
                          >
                            +1j
                          </button>
                          <button
                            onClick={() => handleQuickReschedule(lead, 3)}
                            className="px-2 py-1 hover:bg-white text-[11px] font-bold text-slate-700 rounded-lg transition cursor-pointer"
                            title="Reporter dans 3 jours"
                          >
                            +3j
                          </button>
                          <button
                            onClick={() => handleQuickReschedule(lead, 7)}
                            className="px-2 py-1 hover:bg-white text-[11px] font-bold text-slate-700 rounded-lg transition cursor-pointer"
                            title="Reporter dans 1 semaine"
                          >
                            +7j
                          </button>
                        </div>

                        {/* Personnaliser Date */}
                        <button
                          onClick={() => {
                            setRescheduleLead(lead);
                            setRescheduleDate(lead.prochaineActionDate || todayStr);
                            setRescheduleTime(lead.prochaineActionHeure || '14:00');
                            setRescheduleTitle(lead.prochaineActionIntitule || '');
                          }}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition cursor-pointer"
                          title="Modifier la date ou l'heure"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Voir Fiche */}
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Fiche Lead
                        </button>

                        {/* Traité / Fait */}
                        <button
                          onClick={() => handleComplete(lead)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Valider et clôturer ce rappel (C'est fait)"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Fait</span>
                        </button>

                        {/* Annuler l'action */}
                        <button
                          onClick={() => handleCancel(lead)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Annuler cette action"
                        >
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>Annuler</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Programmer un Nouveau Rappel */}
      {isAddReminderModalOpen && (
        <AddReminderModal
          isOpen={isAddReminderModalOpen}
          onClose={() => setIsAddReminderModalOpen(false)}
          leads={leads}
          currentUser={currentUser}
          onSaveReminder={(leadId, actionTitle, actionDate, actionTime, noteContent) => {
            const targetLead = leads.find(l => l.id === leadId);
            if (!targetLead) return;

            const newLogs: ActivityLogItem[] = [
              {
                id: 'act-new-remind-' + Date.now(),
                type: 'STATUS_CHANGE',
                description: `Nouveau rappel programmé au ${actionDate} à ${actionTime} : ${actionTitle}`,
                author: getUserDisplayName(currentUser),
                date: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              },
              ...(targetLead.historyLogs || [])
            ];

            const updatedNotes = [...(targetLead.notes || [])];
            if (noteContent && noteContent.trim()) {
              updatedNotes.push({
                id: 'note-remind-' + Date.now(),
                author: getUserDisplayName(currentUser),
                date: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                content: `[Rappel programmé pour le ${actionDate}] : ${noteContent.trim()}`
              });
            }

            const updatedLead: Lead = {
              ...targetLead,
              prochaineActionDate: actionDate,
              prochaineActionHeure: actionTime,
              prochaineActionIntitule: actionTitle,
              prochaineActionStatut: 'A_FAIRE',
              notes: updatedNotes,
              historyLogs: newLogs,
              updatedAt: new Date().toISOString()
            };

            onUpdateLead(updatedLead);
            setIsAddReminderModalOpen(false);
          }}
        />
      )}

      {/* Modal: Reprogrammer un rappel personnalisé */}
      {rescheduleLead && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-blue-600">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Reprogrammer le Rappel</h3>
              </div>
              <button
                onClick={() => setRescheduleLead(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold uppercase">Prospect concerné</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">
                {rescheduleLead.prenom} {rescheduleLead.nom} ({rescheduleLead.type})
              </p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                📞 {rescheduleLead.telephone}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intitulé de l'action
                </label>
                <input
                  type="text"
                  value={rescheduleTitle}
                  onChange={(e) => setRescheduleTitle(e.target.value)}
                  placeholder="Ex : Relance devis envoyé"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nouvelle Date *
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nouvelle Heure
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setRescheduleLead(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={!rescheduleDate}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Valider la reprogrammation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Add Reminder Modal
interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  currentUser: User;
  onSaveReminder: (leadId: string, actionTitle: string, actionDate: string, actionTime: string, noteContent: string) => void;
}

const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  leads,
  currentUser,
  onSaveReminder
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [actionTitle, setActionTitle] = useState('Relance devis envoyé');
  const [actionDate, setActionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [actionTime, setActionTime] = useState('14:30');
  const [noteContent, setNoteContent] = useState('');

  // Suggestions for fast picking
  const suggestions = [
    'Relance devis envoyé',
    'Premier appel de qualification',
    'Récupérer le relevé d\'information',
    'Signature électronique du contrat',
    'Ajuster la cotisation / franchise',
    'Contrôle des pièces justificatives'
  ];

  const searchFilteredLeads = useMemo(() => {
    const accessible = getAccessibleLeads(leads, currentUser);
    if (!leadSearch.trim()) return accessible.slice(0, 15);
    return accessible.filter(l => matchLeadSearch(l, leadSearch)).slice(0, 15);
  }, [leads, currentUser, leadSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-blue-600">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">Programmer un Rappel Prospect</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Step 1: Select Lead */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Sélectionner le prospect *
            </label>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou téléphone..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none mb-2"
            />
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Choisir un prospect ({searchFilteredLeads.length} trouvés) --</option>
              {searchFilteredLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.prenom} {l.nom} - {l.type} ({l.telephone}) [{l.referenceDevis}]
                </option>
              ))}
            </select>
          </div>

          {/* Suggestions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Intitulé de l'action / Relance *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {suggestions.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setActionTitle(sug)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer ${
                    actionTitle === sug
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              placeholder="Ex : Appeler pour validation tarifaire"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Date & Heure du rappel *
              </label>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Demain (+1j)', days: 1 },
                  { label: '+2j', days: 2 },
                  { label: '+3j', days: 3 },
                  { label: '+7j (1 sem.)', days: 7 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + preset.days);
                      setActionDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-[10px] font-bold text-slate-600 rounded-md transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <input
                  type="time"
                  value={actionTime}
                  onChange={(e) => setActionTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note d'accompagnement (facultatif)
            </label>
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Détails pour préparer le rappel (ex : client attend une réduction sur franchise)"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedLeadId || !actionDate) return;
              onSaveReminder(selectedLeadId, actionTitle, actionDate, actionTime, noteContent);
            }}
            disabled={!selectedLeadId || !actionDate || !actionTitle.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Enregistrer le rappel
          </button>
        </div>
      </div>
    </div>
  );
};
