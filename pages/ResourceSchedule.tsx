import React, { useState, useEffect } from 'react';
import {
  Monitor,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Wrench,
  Video,
  Film,
  Tablet,
  ChevronDown,
  Check,
  History,
  X,
  Trash2,
  User,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  AlertCircle,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useResource } from '../contexts/ResourceContext';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';


// Types
import { Agendamento } from '../types';

interface Professional {
  id: string;
  nome: string;
  alias?: string;
}

export const ResourceSchedule: React.FC = () => {
  const { profile, user } = useAuth();
  const {
    resources,
    selectedResourceId,
    setSelectedResourceId,
    timeSlots,
    hasNightShift,
    lunchColor,
    classes,
    subjects,
    semanticColors,
    preBookingDays,
    useCancellationPenalty,
    isLoading
  } = useResource();

  const availableResources = resources.filter(r => r.active !== false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Agendamento[]>([]);
  const [preReservas, setPreReservas] = useState<any[]>([]); // Use PreReserva[] type properly if imported
  const [slotRanking, setSlotRanking] = useState<any[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    timeSlotId: string;
    timeLabel: string;
    timeStart: string;
    existingBooking?: Agendamento;
  } | null>(null);

  const [formData, setFormData] = useState({
    turmaId: '',
    disciplinaId: '',
    profissionalId: '',
    descricao: '',
    isFixed: false,
    recurrenceEndDate: '' // New field
  });

  const [modalMode, setModalMode] = useState<'booking' | 'pre-booking'>('booking');

  // Alert Modal State
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [showFixedDeleteConfirm, setShowFixedDeleteConfirm] = useState(false);

  // Use availableResources instead of resources
  const selectedResource = availableResources.find(r => r.id === selectedResourceId) || availableResources[0];
  const isPast = weekOffset < 0;
  const isFuture = weekOffset > 0;
  const isPreBookingWeek = weekOffset >= 2; // Weeks 2, 3, 4 are pure pre-booking
  const isTransitionWeek = weekOffset === 1; // Week 1 (Next Week) - Special logic

  // Read Only if week is past or user is not logged in
  const readOnly = isPast || !profile;

  // Permissions
  const isAdmin = profile?.tipo === 'Administrador' || profile?.tipo === 'Coordenador' || profile?.tipo === 'Colaborador';
  const isCoordinator = profile?.tipo === 'Coordenador';
  const isTeacher = profile?.tipo === 'Professor';

  // --- Data Fetching ---

  // Fetch Professionals (for Admin dropdown)
  useEffect(() => {
    const fetchPros = async () => {
      if (isAdmin) {
        const { data } = await supabase.from('Profissionais').select('id, nome, alias').order('nome');
        if (data) setAllProfessionals(data);
      }
    };
    fetchPros();
  }, [isAdmin]);

  // Date Logic
  const getWeekDates = (offset: number) => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setDate(monday.getDate() + (offset * 7));

    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        name,
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: d
      };
    });

    const currFriday = new Date(monday);
    currFriday.setDate(monday.getDate() + 4);

    return {
      start: monday,
      end: currFriday,
      formattedRange: `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} até ${currFriday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
      days
    }
  };

  // Helper to format date as YYYY-MM-DD in Local Time
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const currentWeek = getWeekDates(weekOffset);

  // Fetch Bookings
  const fetchBookings = async () => {
    if (!selectedResourceId) return;
    const startDate = formatDateLocal(currentWeek.start);
    const endDate = formatDateLocal(currentWeek.end);

    const { data, error } = await supabase
      .from('Agendamentos')
      .select(`
        *,
        turma:Turmas(series, name),
        disciplina:Disciplinas(name),
        profissional:Profissionais(nome, alias)
      `)
      .eq('recurso_id', selectedResourceId)
      .gte('data', startDate)
      .lte('data', endDate);

    // Debug Log
    if (data && data.length > 0) {
      console.log('[DEBUG] First booking:', data[0]);
      console.log('[DEBUG] Range:', startDate, endDate);
    }

    if (error) {
      console.error('Error fetching bookings:', error);
      toast.error(`Erro: ${error.message} (${error.code})`);
    } else {
      console.log(`[DEBUG] Fetched ${data?.length || 0} bookings for range ${startDate} to ${endDate}`);
      setBookings(data || []);
    }
  };

  // Fetch PreReservas
  const fetchPreReservas = async () => {
    if (!selectedResourceId) return;
    const startDate = formatDateLocal(currentWeek.start);
    const endDate = formatDateLocal(currentWeek.end);

    const { data, error } = await supabase
      .from('PreReservas')
      .select(`
        *,
        profissional:Profissionais(nome, alias)
      `)
      .eq('recurso_id', selectedResourceId)
      .eq('status', 'pending')
      .gte('data', startDate)
      .lte('data', endDate);

    if (error) {
      console.error('Error fetching pre-reservas:', error);
    } else {
      setPreReservas(data || []);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchPreReservas();

    const channel = supabase.channel(`schedule_updates_${selectedResourceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Agendamentos', filter: `recurso_id=eq.${selectedResourceId}` }, () => fetchBookings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'PreReservas', filter: `recurso_id=eq.${selectedResourceId}` }, () => fetchPreReservas())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedResourceId, weekOffset]);

  // --- Early Returns ---
  if (isLoading) {
    return (
      <div className="flex bg-slate-50 min-h-screen font-sans items-center justify-center">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Carregando recursos...</p>
        </div>
      </div>
    );
  }

  if (availableResources.length === 0) {
    return (
      <div className="flex bg-slate-50 min-h-screen font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <Monitor className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Nenhum Recurso Encontrado</h2>
          <p className="text-slate-500 max-w-md">
            Parece que nenhum recurso (Laboratórios, Projetores, Salas) foi cadastrado ainda.
            Acesse as configurações para adicionar novos recursos.
          </p>
        </div>
      </div>
    );
  }

  // --- Handlers ---

  const handleCellClick = (date: Date, slot: any, forcePreBookingView = false) => {
    const dateStr = formatDateLocal(date);
    const existingBooking = bookings.find(b => b.horario_id === slot.id && b.data === dateStr);

    if (existingBooking) {
      setSelectedSlot({
        date,
        timeSlotId: slot.id,
        timeLabel: slot.label,
        timeStart: slot.start,
        existingBooking: existingBooking
      });
      setFormData({
        turmaId: existingBooking.turma_id,
        disciplinaId: existingBooking.disciplina_id,
        profissionalId: existingBooking.profissional_id,
        descricao: existingBooking.descricao || '',
        isFixed: existingBooking.is_fixed || false,
        recurrenceEndDate: existingBooking.recurrence_end_date || ''
      });
      setModalMode('booking');
      setIsModalOpen(true);
      return;
    }

    if (forcePreBookingView) {
      openModal(date, slot, true);
      return;
    }

    if (isAdmin) {
      const hasPreBookings = preReservas.some(p =>
        p.horario_id === slot.id &&
        p.data === dateStr &&
        p.status === 'pending'
      );
      if (hasPreBookings) {
        openModal(date, slot, true);
      } else {
        openModal(date, slot);
      }
      return;
    }

    if (isTransitionWeek) {
      const today = new Date();
      const realToday = new Date();
      const currentDay = realToday.getDay();
      const diffToMonday = realToday.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const realMonday = new Date(realToday);
      realMonday.setDate(diffToMonday);
      const realFriday = new Date(realMonday);
      realFriday.setDate(realMonday.getDate() + 4);
      realFriday.setHours(0, 0, 0, 0);

      if (today < realFriday) {
        toast.info("Agendamentos para a próxima semana só abrem na Sexta-feira da semana atual.");
        return;
      }
      openModal(date, slot);
      return;
    }

    if (isPreBookingWeek) {
      const todayDay = new Date().getDay();
      const allowedDays = preBookingDays || [0, 1, 2, 3, 4, 6];
      const isWindowOpen = allowedDays.includes(todayDay);

      if (!isWindowOpen && !isAdmin) {
        const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const allowedNames = allowedDays.map(d => daysMap[d]).join(', ');
        toast.info(`Janelas de Pré-Reserva abrem apenas: ${allowedNames}.`);
        return;
      }
      openModal(date, slot, true);
      return;
    }

    openModal(date, slot);
  };

  const openModal = (date: Date, slot: any, isPreBooking = false) => {
    const userRole = profile?.tipo || '';
    if (!isAdmin && !isPreBooking) {
      if (selectedResource?.allowed_roles && selectedResource.allowed_roles.length > 0) {
        if (!selectedResource.allowed_roles.includes(userRole)) {
          setAlertModal({
            isOpen: true,
            title: 'Acesso Restrito',
            message: `Desculpe, agendamentos para este recurso estão limitados aos perfis autorizados.`,
            type: 'error'
          });
          return;
        }
      }
    }

    setSelectedSlot({
      date,
      timeSlotId: slot.id,
      timeLabel: slot.label,
      timeStart: slot.start
    });
    setFormData({
      turmaId: '',
      disciplinaId: '',
      profissionalId: isTeacher && profile?.id ? profile.id : '',
      descricao: '',
      isFixed: false,
      recurrenceEndDate: ''
    });
    setModalMode(isPreBooking ? 'pre-booking' : 'booking');
    setIsModalOpen(true);
    if (isPreBooking || modalMode === 'pre-booking') {
      fetchRanking(slot.id, date);
    } else {
      setSlotRanking([]);
    }
  };

  const fetchRanking = async (slotId: string, date: Date) => {
    if (!selectedResourceId) return;
    const { data, error } = await supabase.rpc('get_slot_ranking', {
      p_recurso_id: selectedResourceId,
      p_data: formatDateLocal(date),
      p_horario_id: slotId
    });
    if (error) console.error(error);
    else setSlotRanking(data || []);
  };

  const handleSave = async () => {
    if (!selectedSlot || !selectedResourceId) return;

    if (modalMode === 'booking' && (!formData.turmaId || !formData.disciplinaId)) {
      toast.error('Preencha a turma e a disciplina');
      return;
    }

    const profId = isAdmin ? formData.profissionalId : (profile?.id || '');
    if (!profId) {
      toast.error("Erro de identificação do usuário");
      return;
    }

    if (isAdmin && !profId) {
      toast.error('Selecione o profissional');
      return;
    }

    const dateStr = formatDateLocal(selectedSlot.date);

    try {
      if (modalMode === 'pre-booking') {
        const { error } = await supabase.from('PreReservas').insert([{
          recurso_id: selectedResourceId,
          horario_id: selectedSlot.timeSlotId,
          turma_id: formData.turmaId,
          disciplina_id: formData.disciplinaId,
          profissional_id: profId,
          data: dateStr,
          status: 'pending'
        }]);

        if (error) throw error;
        toast.success('Interesse registrado com sucesso!');
        setIsModalOpen(false);
        fetchPreReservas();
        return;
      }

      const basePayload = {
        recurso_id: selectedResourceId,
        horario_id: selectedSlot.timeSlotId,
        turma_id: formData.turmaId,
        disciplina_id: formData.disciplinaId,
        profissional_id: profId,
        descricao: formData.descricao,
        is_fixed: isAdmin ? formData.isFixed : false,
        recurrence_end_date: (isAdmin && formData.isFixed && formData.recurrenceEndDate) ? formData.recurrenceEndDate : null
      };

      // --- EDIT MODE ---
      if (selectedSlot.existingBooking) {
        if (isAdmin && selectedSlot.existingBooking.is_fixed) {
          // Fixed Booking Edit Logic
          const newEndDate = basePayload.recurrence_end_date;

          if (!confirm('Esta ação irá alterar as ocorrências futuras. Confirmar?')) return;

          // 1. Update details for THIS and FUTURE occurrences
          // We target the "Series": Same Resource + Slot + Fixed=True 
          // (and maybe Same Prof/Turma logic, but usually Resource+Slot+Fixed is unique enough for the 'slot owner')
          const { error: updateError } = await supabase
            .from('Agendamentos')
            .update({
              turma_id: basePayload.turma_id,
              disciplina_id: basePayload.disciplina_id,
              profissional_id: basePayload.profissional_id, // Allow changing prof? Yes, admin might reassign
              descricao: basePayload.descricao,
              recurrence_end_date: newEndDate
            })
            .eq('recurso_id', selectedResourceId)
            .eq('horario_id', selectedSlot.timeSlotId)
            .eq('is_fixed', true)
            .gte('data', dateStr); // Update from selected date onwards

          if (updateError) throw updateError;

          // 2. Handle CUTOFF (End Date)
          if (newEndDate) {
            const { error: deleteError } = await supabase
              .from('Agendamentos')
              .delete()
              .eq('recurso_id', selectedResourceId)
              .eq('horario_id', selectedSlot.timeSlotId)
              .eq('is_fixed', true)
              .gt('data', newEndDate); // Strictly greater than End Date

            if (deleteError) throw deleteError;
          }

          toast.success('Série de agendamentos atualizada!');

        } else {
          // Normal Edit (Single)
          const { error } = await supabase
            .from('Agendamentos')
            .update(basePayload)
            .eq('id', selectedSlot.existingBooking.id);

          if (error) throw error;
          toast.success('Agendamento atualizado!');
        }

      } else {
        // --- CREATE MODE ---
        if (isAdmin && formData.isFixed) {
          const baseDate = new Date(selectedSlot.date);
          baseDate.setDate(baseDate.getDate() - (weekOffset * 7)); // Adjust specific logic if needed? No, just use selected date as start.
          // Wait, the original logic used 'weekOffset' to calculate start? 
          // If I am in Week 2, and click Monday, I want to start Monday Week 2.
          // original logic: baseDate.setDate(baseDate.getDate() - (weekOffset * 7)) -> This moves it back to "Week 0" (Current Week).
          // Why? Maybe to generate "from the start of the view"? 
          // Actually, if I click a future date, I usually want to start FROM that date.
          // Let's assume the user selects the START date of the series.

          // Re-reading original code logic (lines 439-440 of original view):
          // const baseDate = new Date(selectedSlot.date);
          // baseDate.setDate(baseDate.getDate() - (weekOffset * 7)); 
          // This seems odd if I'm booking in the future. 
          // Ah, 'weekOffset' is the viewer offset. 
          // If I view Week +1, and click Monday... 'selectedSlot.date' IS Monday Week +1.
          // If I subtract weekOffset*7, I go back to Monday Current Week.
          // Maybe the original intention was to always back-fill to current week?
          // OR maybe there was a misunderstanding of 'selectedSlot.date'.
          // Let's stick to "From Selected Date" for safety in the new logic or keep original if it works?
          // I will keep original structure but use selectedSlot.date as the anchor.
          // Actually, let's simplify: Start from the date user CLICKED.

          let loopDate = new Date(selectedSlot.date);
          // Normalize to midnight to avoid time issues impacting comparison
          loopDate.setHours(0, 0, 0, 0);

          const payloads = [];

          // Determine how many weeks to generate.
          // If EndDate is set, generate until EndDate.
          // If NOT set, generate typical amount (e.g. 5 weeks or until end of semester).
          // Since we don't have "Semester End", we stick to a reasonable limit (e.g. 12 weeks/3 months) or the original 5.
          // Let's increment to 12 weeks to be more useful, or use EndDate if present.

          const maxWeeks = 20; // Increase slightly
          // Parse endDate string correctly handling timezone offset if necessary, 
          // or just compare YYYY-MM-DD strings to be safer.
          // But here, using Date objects at midnight is also fine.
          // Adding "T00:00:00" ensures it's treated as local midnight (or UTC depending on env, but consistent).
          // Actually, let's use string comparison for robustness.

          const endDateStr = basePayload.recurrence_end_date;

          for (let i = 0; i < maxWeeks; i++) {
            // Create date string for current iteration YYYY-MM-DD
            // Use loopDate which is now normalized to local midnight
            // Be careful with timezone shifts. 
            // safest: 
            const yearn = loopDate.getFullYear();
            const monthn = String(loopDate.getMonth() + 1).padStart(2, '0');
            const dayn = String(loopDate.getDate()).padStart(2, '0');
            const dStr = `${yearn}-${monthn}-${dayn}`;

            // Stop if we exceed End Date (lexicographical comparison works for ISO dates)
            if (endDateStr && dStr > endDateStr) break;

            payloads.push({
              ...basePayload,
              data: dStr
            });

            // Next week
            loopDate.setDate(loopDate.getDate() + 7);
          }

          const { error } = await supabase.from('Agendamentos').insert(payloads);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('Agendamentos').insert([{
            ...basePayload,
            data: dateStr
          }]);
          if (error) throw error;
        }
        toast.success('Agendamento realizado!');
      }

      setIsModalOpen(false);
      fetchBookings();

    } catch (err: any) {
      console.error(err);
      setAlertModal({
        isOpen: true,
        title: 'Não foi possível agendar',
        message: err.message || 'Ocorreu um erro.',
        type: 'warning'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedSlot?.existingBooking) return;

    const isFixed = selectedSlot.existingBooking.is_fixed;

    if (isFixed) {
      setShowFixedDeleteConfirm(true);
      return;
    } else {
      if (!confirm('Tem certeza que deseja remover este agendamento?')) return;
      const { error } = await supabase.from('Agendamentos').delete().eq('id', selectedSlot.existingBooking.id);

      if (error) {
        toast.error(`Erro ao excluir: ${error.message}`);
      } else {
        toast.success('Agendamento removido');
        setIsModalOpen(false);
        fetchBookings();
      }
    }
  };

  const executeFixedBookingDeletion = async () => {
    if (!selectedSlot || !selectedResourceId) return;

    const selectedDateStr = formatDateLocal(selectedSlot.date);
    const prevDay = new Date(selectedSlot.date);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayStr = formatDateLocal(prevDay);

    // 1. Delete Future Bookings (>= Selected Date)
    const { error: deleteError } = await supabase
      .from('Agendamentos')
      .delete()
      .eq('recurso_id', selectedResourceId)
      .eq('horario_id', selectedSlot.timeSlotId)
      .eq('is_fixed', true)
      .gte('data', selectedDateStr);

    if (deleteError) {
      toast.error('Erro ao excluir futuros: ' + deleteError.message);
      setShowFixedDeleteConfirm(false); // Close modal on error too? Or keep open? Close is safer specificially if error toast shown.
      return;
    }

    // 2. Update Past Bookings to Stop Recurrence
    const { error: updateError } = await supabase
      .from('Agendamentos')
      .update({ recurrence_end_date: prevDayStr })
      .eq('recurso_id', selectedResourceId)
      .eq('horario_id', selectedSlot.timeSlotId)
      .eq('is_fixed', true)
      .lt('data', selectedDateStr);

    if (updateError) {
      console.error('Error updating past recurrence:', updateError);
    }

    toast.success('Agendamento recorrente encerrado.');
    setShowFixedDeleteConfirm(false);
    setIsModalOpen(false);
    fetchBookings();
  };

  const handleRemovePreBooking = async (profissionalId: string) => {
    // Permission check
    const isOwner = profissionalId === profile?.id;
    const canDelete = isAdmin || isCoordinator || isOwner;

    if (!canDelete) {
      toast.error('Você não tem permissão para remover este interesse.');
      return;
    }

    if (!confirm('Tem certeza que deseja remover este interesse da fila?')) return;

    if (!selectedResourceId || !selectedSlot) return;

    try {
      const { error } = await supabase
        .from('PreReservas')
        .delete()
        .eq('recurso_id', selectedResourceId)
        .eq('horario_id', selectedSlot.timeSlotId)
        .eq('data', formatDateLocal(selectedSlot.date))
        .eq('profissional_id', profissionalId);

      if (error) throw error;

      toast.success('Interesse removido com sucesso!');
      // Refresh data
      fetchRanking(selectedSlot.timeSlotId, selectedSlot.date);
      fetchPreReservas(); // Update grid indicator
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao remover: ' + err.message);
    }
  };

  // --- Render Helpers ---

  const getIcon = (type?: string) => {
    switch (type) {
      case 'lab': return <Monitor className="w-5 h-5" />;
      case 'projector': return <Video className="w-5 h-5" />;
      case 'room': return <Film className="w-5 h-5" />;
      default: return <Tablet className="w-5 h-5" />;
    }
  };

  // Filter visible slots
  const visibleSlots = hasNightShift
    ? timeSlots
    : timeSlots.filter(slot => !['l2', 't10', 't11', 'b3', 't12', 't13'].includes(slot.id));

  return (
    <div className="flex bg-slate-50 h-screen overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 h-full">
        <div className="relative z-50">
          <Header
            title=""
            subtitle=""
            user={{
              name: profile?.nome || "Usuário",
              role: profile?.tipo || "Visitante",
              image: profile?.foto || ""
            }}
            showSearch={false}
            hideUserSection={true}
            hideLogout={true}
            showNotifications={false}
            customTitleContent={
              <div className="flex items-center gap-6">
                {/* Title Removed */}

                {/* Custom Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 p-2 pr-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-transparent transition-all group text-left"
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 ${selectedResource ? 'bg-primary-600' : 'bg-slate-400'}`}>
                      {selectedResource ? getIcon(selectedResource.type) : <Monitor className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 leading-tight flex items-center gap-2 group-hover:text-primary-700 transition-colors">
                        {selectedResource?.name || 'Selecione'}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                        {selectedResource?.details || 'Nenhum recurso selecionado'}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-50 cursor-default" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                          Selecione um Recurso
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {availableResources.map(res => {
                            const isSelected = res.id === selectedResourceId;
                            return (
                              <button
                                key={res.id}
                                onClick={() => {
                                  setSelectedResourceId(res.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${isSelected
                                  ? 'bg-primary-50 ring-1 ring-primary-100'
                                  : 'hover:bg-slate-50'
                                  }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${res.iconBg} ${res.iconColor}`}>
                                  {getIcon(res.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                                      {res.name}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {res.allowed_roles && !res.allowed_roles.includes(profile?.tipo || '') && (
                                        <Lock className="w-3.5 h-3.5 text-amber-500" title="Acesso Restrito" />
                                      )}
                                      {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-500 truncate opacity-80">
                                    {res.details}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            }
          />
        </div>

        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* Week Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 flex items-center justify-between shrink-0 mb-4">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                disabled={weekOffset <= -3} // Max 3 weeks back
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-2">
                  {isPast && <History className="w-3 h-3" />}
                  Semana de
                </p>
                <h2 className={`text-lg font-bold ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>
                  {currentWeek.formattedRange}
                  {isPast && <span className="ml-2 text-xs font-normal bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">Histórico</span>}
                </h2>
              </div>

              {/* Admin Consolidation Button */}
              {isAdmin && isTransitionWeek && (
                <button
                  onClick={async () => {
                    if (!confirm('Deseja consolidar os vencedores do ranking para esta semana? Isso irá criar os agendamentos oficiais baseados na fila de interesse.')) return;

                    const { error } = await supabase.rpc('consolidate_schedule', {
                      p_recurso_id: selectedResourceId,
                      p_start_date: formatDateLocal(currentWeek.start),
                      p_end_date: formatDateLocal(currentWeek.end)
                    });

                    if (error) {
                      toast.error('Erro ao consolidar: ' + error.message);
                    } else {
                      toast.success('Semana consolidada com sucesso!');
                      fetchBookings();
                      fetchPreReservas();
                    }
                  }}
                  className="mr-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Consolidar Vencedores
                </button>
              )}
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                disabled={weekOffset >= 4} // Max 4 weeks ahead
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Schedule Grid */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-auto relative">
              <div className="min-w-[1000px] grid grid-cols-[100px_repeat(5,1fr)]">

                {/* Header Row */}
                <div className="bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-400 uppercase sticky top-0 left-0 z-30 border-b border-r border-slate-200 h-16 shadow-[2px_2px_5px_rgba(0,0,0,0.05)]">
                  Horário
                </div>
                {currentWeek.days.map((day) => (
                  <div key={day.name} className={`text-center py-3 sticky top-0 z-20 border-b border-r border-slate-200 h-16 shadow-[0_2px_5px_rgba(0,0,0,0.02)] ${isPast ? 'bg-slate-100/80' : 'bg-slate-50'}`}>
                    <div className="text-sm font-bold text-slate-700">{day.name}</div>
                    <div className="text-xs text-slate-400">{day.date}</div>
                  </div>
                ))}

                {/* Slots Rows */}
                {visibleSlots.map((slot) => {

                  // Non-bookable Break (Intervalo standard)
                  if (slot.type === 'break') {
                    return (
                      <div key={slot.id} className="col-span-full flex z-10">
                        <div className="sticky left-0 z-10 w-[100px] flex items-center justify-center font-bold text-xs text-slate-400 bg-slate-50 border-b border-r border-slate-200 h-8 shrink-0">
                          {slot.start}
                        </div>
                        <div className="flex-1 flex items-center justify-center border-b border-slate-200 h-8 bg-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {slot.label} ({slot.start} - {slot.end})
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Bookable Slots (Class + Lunch/Intervalo Noite)
                  const isLunch = slot.type === 'lunch';
                  const rowStyle = isLunch ? { backgroundColor: `${lunchColor}20` } : {};
                  const labelColor = isLunch ? lunchColor : undefined;

                  return (
                    <React.Fragment key={slot.id}>
                      {/* Time Column */}
                      <div
                        className="flex flex-col items-center justify-center p-2 border-b border-r border-slate-200 sticky left-0 z-10 bg-white"
                        style={isLunch ? { backgroundColor: `${lunchColor}20`, color: lunchColor } : {}}
                      >
                        <span className={`text-sm font-bold ${!isLunch ? 'text-slate-700' : ''}`}>{slot.start}</span>
                        <span className={`text-[10px] ${!isLunch ? 'text-slate-400' : ''}`} style={{ opacity: isLunch ? 0.8 : 1 }}>{slot.label}</span>
                      </div>

                      {/* Day Columns */}
                      {currentWeek.days.map((day) => {
                        const dateStr = formatDateLocal(day.fullDate);
                        const booking = bookings.find(b => b.horario_id === slot.id && b.data === dateStr);

                        // Check if current user owns this booking
                        const isOwner = booking?.profissional_id === profile?.id;
                        const canModify = isAdmin || isOwner;

                        return (
                          <div
                            key={`${day.name}-${slot.id}`}
                            className="bg-transparent p-1 min-h-[100px] border-b border-r border-slate-200 relative"
                            style={rowStyle}
                            onClick={() => handleCellClick(day.fullDate, slot)}
                          >
                            {booking ? (
                              <div
                                className={`w-full h-full border-l-4 rounded-r p-2 flex flex-col justify-center cursor-pointer transition-all shadow-sm
                                  ${canModify ? 'hover:opacity-90 hover:shadow-md' : 'opacity-80'}`}
                                style={{
                                  backgroundColor: booking.is_fixed
                                    ? '#fffaf0' // Amber-50
                                    : isOwner ? `${semanticColors.regular}20` : '#f1f5f9',
                                  borderColor: booking.is_fixed
                                    ? '#d97706' // Amber-600
                                    : isOwner ? semanticColors.regular : '#94a3b8',
                                }}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  {booking.is_fixed ? (
                                    <Lock className="w-3 h-3 text-amber-600" title="Horário Fixo (Semanas)" />
                                  ) : (
                                    isOwner ? <User className="w-3 h-3 text-primary-600" /> : <Lock className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span className={`text-xs font-bold uppercase truncate ${booking.is_fixed ? 'text-amber-800' : 'text-slate-700'}`}>
                                    {booking.is_fixed ? 'FIXO' : (booking.profissional?.alias || booking.profissional?.nome)}
                                  </span>
                                </div>
                                <p className={`text-xs font-medium leading-tight ${booking.is_fixed ? 'text-amber-700' : 'text-slate-600'}`}>
                                  {booking.disciplina?.name}
                                </p>
                                <p className={`text-[10px] mt-1 ${booking.is_fixed ? 'text-amber-600/80' : 'text-slate-500'}`}>
                                  {booking.turma?.series} {booking.turma?.name}
                                </p>
                                {booking.descricao && (
                                  <div className="flex items-center gap-1 mt-0.5" title={booking.descricao}>
                                    <FileText className={`w-3 h-3 ${booking.is_fixed ? 'text-amber-400' : 'text-slate-400'}`} />
                                    <span className={`text-[9px] italic truncate max-w-[80px] ${booking.is_fixed ? 'text-amber-500' : 'text-slate-400'}`}>
                                      Obs.
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Check for Pre-Bookings (Interests)
                              (() => {
                                const slotPreReservas = preReservas.filter(p => p.horario_id === slot.id && p.data === dateStr);
                                if (slotPreReservas.length > 0) {
                                  return (
                                    <div
                                      onClick={() => handleCellClick(day.fullDate, slot, true)}
                                      className="w-full h-full border-l-4 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 rounded-r p-2 flex flex-col justify-center cursor-pointer transition-all shadow-sm group"
                                    >
                                      <div className="flex items-center gap-1.5 mb-1 text-indigo-700">
                                        <History className="w-3.5 h-3.5" />
                                        <span className="text-xs font-bold uppercase truncate">
                                          {slotPreReservas.length} {slotPreReservas.length === 1 ? 'Interessado' : 'Interessados'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-indigo-600/80 mt-1 leading-tight group-hover:text-indigo-800">
                                        Clique para ver a fila
                                      </p>

                                      {/* Preview First Interest */}
                                      <div className="mt-1.5 pt-1.5 border-t border-indigo-100/50">
                                        <p className="text-[9px] text-indigo-500 truncate">
                                          1º: <span className="font-medium">{slotPreReservas[0].profissional?.alias || slotPreReservas[0].profissional?.nome?.split(' ')[0]}</span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }

                                // Empty Slot Standard
                                return !readOnly && (
                                  <div className="w-full h-full border-2 border-dashed border-transparent hover:border-slate-300/50 rounded flex items-center justify-center transition-all group cursor-pointer opacity-50 hover:opacity-100">
                                    <Plus className="text-slate-400 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all w-5 h-5" />
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

              </div>
            </div>
          </div>
        </main>

        {/* Modal */}
        {isModalOpen && selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {selectedSlot.existingBooking ? 'Detalhes do Agendamento' : 'Novo Agendamento'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <CalendarIcon className="w-3 h-3" /> {selectedSlot.date.toLocaleDateString('pt-BR')}
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <Clock className="w-3 h-3" /> {selectedSlot.timeLabel} ({selectedSlot.timeStart})
                    {selectedSlot.existingBooking && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] text-slate-400 italic">
                          Criado em: {new Date(selectedSlot.existingBooking.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

                {/* Resource Info (Read only) */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedResource?.iconBg || 'bg-slate-100'} ${selectedResource?.iconColor || 'text-slate-500'}`}>
                    {selectedResource && getIcon(selectedResource.type)}
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase">Recurso</p>
                    <p className="text-sm font-bold text-slate-700">{selectedResource?.name || 'Recurso Indefinido'}</p>
                  </div>
                </div>

                {/* PRE-BOOKING MODE: Show Queue First */}
                {modalMode === 'pre-booking' ? (
                  <div className="space-y-4">
                    {/* Ranking Display */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-2">
                          <History className="w-3 h-3" /> Fila de Interesse (Ranking)
                        </h4>
                        <span className="text-[10px] text-slate-400">Atualizado em tempo real</span>
                      </div>

                      <div className="bg-slate-50 rounded-xl border border-slate-100 p-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {slotRanking.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-xs italic">
                            Seja o primeiro a registrar interesse!
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {slotRanking.map((rankItem) => (
                              <div key={rankItem.profissional_id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${rankItem.profissional_id === profile?.id ? 'bg-indigo-50 border border-indigo-100' : 'bg-white border border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 flex items-center justify-center rounded-full font-bold ${rankItem.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {rankItem.rank}º
                                  </span>
                                  <span className={`font-medium ${rankItem.profissional_id === profile?.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                                    {rankItem.alias || rankItem.nome}
                                    {rankItem.profissional_id === profile?.id && " (Você)"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400" title="Score Detalhado (A+C+O)">
                                    <span className="font-mono bg-slate-100 px-1 rounded">S:{rankItem.score}</span>
                                    <span className="opacity-50">|</span>
                                    <span title="Agendamentos (21d)">A:{rankItem.score_a}</span>
                                    {useCancellationPenalty && (
                                      <span title="Cancelamentos (31d)">C:{rankItem.score_c}</span>
                                    )}
                                    <span title="Ordem de Solicitação">O:{rankItem.score_o || rankItem.score_t}</span>
                                  </div>

                                  {/* Delete Button for Owner or Admin/Coord */}
                                  {(profile?.id === rankItem.profissional_id || isAdmin || isCoordinator) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemovePreBooking(rankItem.profissional_id);
                                      }}
                                      className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                                      title="Remover da fila"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Cálculo do Ranking: Soma dos Agendamentos {useCancellationPenalty ? 'e Cancelamentos' : ''} dos últimos 21 dias + Ordem de Solicitação. Quanto menor a pontuação, maior a prioridade.
                      </p>
                    </div>

                    {/* Show Form ONLY if Queue is Empty OR user is not Admin (Professors can join queue) */}
                    {/* Actually, Professors see form to join queue. Admins ONLY see form if queue is empty to Confirm. */}
                    {(!isAdmin || slotRanking.length === 0) && (
                      <div className="space-y-4 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Turma</label>
                          <select
                            value={formData.turmaId}
                            onChange={e => setFormData({ ...formData, turmaId: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
                          >
                            <option value="">Selecione a turma...</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.series} - {c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Disciplina</label>
                          <select
                            value={formData.disciplinaId}
                            onChange={e => setFormData({ ...formData, disciplinaId: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
                          >
                            <option value="">Selecione a disciplina...</option>
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Observação / Solicitação (Opcional)</label>
                          <textarea
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Ex: Preciso de cabo HDMI, Caixa de Som..."
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm min-h-[80px] resize-y"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* NORMAL BOOKING MODE */
                  <>
                    {selectedSlot.existingBooking && !isAdmin && selectedSlot.existingBooking.profissional_id !== profile?.professionalId ? (
                      // View Mode (Other user's booking)
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Profissional</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 font-medium">
                            {selectedSlot.existingBooking.profissional?.nome}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Turma</label>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 font-medium">
                              {selectedSlot.existingBooking.turma?.series} {selectedSlot.existingBooking.turma?.name}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Disciplina</label>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 font-medium">
                              {selectedSlot.existingBooking.disciplina?.name}
                            </div>
                          </div>
                          {selectedSlot.existingBooking.descricao && (
                            <div className="space-y-1 col-span-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Observação</label>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 text-sm italic">
                                {selectedSlot.existingBooking.descricao}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Edit/Create Mode
                      <div className="space-y-4">

                        {/* Professional Select - Only for Admins */}
                        {isAdmin && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Profissional</label>
                            <select
                              value={formData.profissionalId}
                              onChange={e => setFormData({ ...formData, profissionalId: e.target.value })}
                              disabled={!!selectedSlot.existingBooking}
                              className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
                            >
                              <option value="">Selecione o profissional...</option>
                              {allProfessionals.map(p => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Turma</label>
                          <select
                            value={formData.turmaId}
                            onChange={e => setFormData({ ...formData, turmaId: e.target.value })}
                            disabled={!!selectedSlot.existingBooking && !isAdmin && selectedSlot.existingBooking.profissional_id !== profile?.id}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
                          >
                            <option value="">Selecione a turma...</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.series} - {c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Disciplina</label>
                          <select
                            value={formData.disciplinaId}
                            onChange={e => setFormData({ ...formData, disciplinaId: e.target.value })}
                            disabled={!!selectedSlot.existingBooking && !isAdmin && selectedSlot.existingBooking.profissional_id !== profile?.id}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
                          >
                            <option value="">Selecione a disciplina...</option>
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Observação / Solicitação (Opcional)</label>
                          <textarea
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            disabled={isAdmin ? false : !!selectedSlot.existingBooking}
                            placeholder="Ex: Preciso de cabo HDMI, Caixa de Som..."
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm min-h-[80px] resize-y"
                          />
                        </div>

                        {isAdmin && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="isFixed"
                                checked={formData.isFixed}
                                onChange={e => setFormData({ ...formData, isFixed: e.target.checked })}
                                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              />
                              <label htmlFor="isFixed" className="text-sm font-bold text-amber-800 cursor-pointer select-none">
                                Agendamento Fixo (Semanal)
                                <p className="text-xs text-amber-600 font-normal">
                                  Replica este agendamento para todas as semanas disponíveis.
                                </p>
                              </label>
                            </div>

                            {/* End Date Input - Only visible if isFixed is checked */}
                            {formData.isFixed && (
                              <div className="pl-8 animate-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-amber-700 uppercase mb-1 block">
                                  Data Final da Recorrência (Opcional)
                                </label>
                                <input
                                  type="date"
                                  value={formData.recurrenceEndDate}
                                  min={formatDateLocal(new Date())}
                                  onChange={e => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                                  className="w-full p-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-white text-sm text-slate-700"
                                />
                                <p className="text-[10px] text-amber-600/80 mt-1">
                                  Se deixado em branco, a recorrência não terá data final definida (até o limite do calendário).
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* Footer / Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                {selectedSlot.existingBooking ? (
                  <>
                    {(isAdmin || selectedSlot.existingBooking.profissional_id === profile?.id) ? (
                      (() => {
                        // Check deletion rules (Time based)
                        const bookingDate = new Date(selectedSlot.date);
                        const now = new Date();

                        // Parse slot start time (e.g. "07:00")
                        const [hours, minutes] = selectedSlot.timeStart.split(':').map(Number);
                        bookingDate.setHours(hours, minutes, 0, 0);

                        // Calculate Deadline (2 hours before)
                        const deadline = new Date(bookingDate);
                        deadline.setHours(deadline.getHours() - 2);

                        const isPast = bookingDate < new Date(now.setHours(0, 0, 0, 0)); // Strictly past day? No, logic said "Anteriores ao dia atual"
                        // My SQL logic: if OLD.data < v_now::date. So if today is 10th, and booking is 9th. 
                        // In JS:
                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        const bDateOnly = new Date(selectedSlot.date);
                        bDateOnly.setHours(0, 0, 0, 0);

                        const isPastDay = bDateOnly < todayDate;
                        const isTooClose = new Date() > deadline;

                        // Allow Admin to bypass? User didn't say. Assuming NO for consistency with SQL. 
                        // Actually, Admins usually can do anything. But the SQL blocks everyone.
                        // So UI should reflect SQL.

                        const canDelete = !isPastDay && !isTooClose;

                        if (!canDelete) {
                          return (
                            <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm flex items-center gap-2 cursor-not-allowed" title="Não é permitido excluir agendamentos passados ou com menos de 2h de antecedência.">
                              <Trash2 className="w-4 h-4" /> Excluir
                            </div>
                          )
                        }

                        return (
                          <button
                            onClick={handleDelete}
                            className="px-4 py-2 rounded-xl bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        )
                      })()
                    ) : (
                      <div /> /* Spacer */
                    )}
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-300 transition-colors"
                    >
                      Fechar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    {(() => {
                      // Check if we should disable the button (Pre-booking window closed)
                      const todayDay = new Date().getDay();
                      const allowedDays = preBookingDays || [0, 1, 2, 3, 4, 6];
                      const isWindowOpen = allowedDays.includes(todayDay);
                      const isPreBookingMode = modalMode === 'pre-booking';
                      // Admin can always bypass window
                      const shouldDisable = isPreBookingMode && !isWindowOpen && !isAdmin;

                      if (shouldDisable) {
                        return (
                          <div className="flex-1 px-4 py-2 text-center text-xs text-amber-600 font-bold bg-amber-50 rounded-xl border border-amber-100">
                            Janela Fechada
                          </div>
                        )
                      }

                      // Check if Admin is blocked by existing queue
                      // Admin can ONLY "Confirmar Agendamento" (Standard) if Queue is empty.
                      // If Queue exists, Admin sees the queue list (handled above), and if they are in 'pre-booking' mode,
                      // they shouldn't see "Registrar Interesse" basically? Or do we allow Admin to add interest too?
                      // The prompt says: "Somente depois de apagar todas as pre-reservas existem sera possivel o cocordenador ou admin registrar"
                      // This implies "Registrar" = "Confirmar Agendamento" (Booking).
                      // So if Queue > 0, Admin cannot see the Booking Button.

                      if (isAdmin && isPreBookingMode && slotRanking.length > 0) {
                        return (
                          <div className="flex-1 px-4 py-2 text-center text-xs text-red-600 font-bold bg-red-50 rounded-xl border border-red-100" title="Esvazie a fila para liberar o agendamento.">
                            Esvazie a Fila!
                          </div>
                        )
                      }

                      // Check if user is already in queue
                      const alreadyInQueue = isPreBookingMode && slotRanking.some(r => r.profissional_id === profile?.id);

                      if (alreadyInQueue) {
                        return (
                          <button
                            disabled
                            className="flex-1 px-6 py-2 rounded-xl text-slate-400 font-bold text-sm bg-slate-100 cursor-not-allowed border border-slate-200"
                          >
                            Interesse Já Registrado
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={handleSave}
                          className={`flex-1 px-6 py-2 rounded-xl text-white font-bold text-sm transition-colors shadow-lg ${modalMode === 'pre-booking'
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                            : 'bg-primary-600 hover:bg-primary-700 shadow-primary-200'
                            }`}
                        >
                          {modalMode === 'pre-booking' ? 'Registrar Interesse' : 'Confirmar Agendamento'}
                        </button>
                      )
                    })()}
                  </>
                )}
              </div>

            </div>
          </div>
        )}
        {/* Alert Modal */}
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="p-8 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${alertModal.type === 'error' ? 'bg-red-50 text-red-500' :
                  alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                    'bg-blue-50 text-blue-500'
                  }`}>
                  {alertModal.type === 'error' ? <Lock className="w-10 h-10" /> :
                    alertModal.type === 'warning' ? <AlertCircle className="w-10 h-10" /> :
                      <Info className="w-10 h-10" />}
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {alertModal.title}
                </h3>

                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  {alertModal.message}
                </p>

                <button
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200' :
                    alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' :
                      'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-200'
                    }`}
                >
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Booking Deletion Confirmation Modal */}
        {showFixedDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-red-50 text-red-500">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex flex-col items-center gap-1">
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    Agendamento Fixo
                  </span>
                  Encerrar repetição?
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  Esta ação excluirá o agendamento desta data ({selectedSlot?.date.toLocaleDateString('pt-BR')}) e todas as repetições seguintes. O histórico anterior será mantido.
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowFixedDeleteConfirm(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeFixedBookingDeletion}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95"
                  >
                    Encerrar agendamentos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};