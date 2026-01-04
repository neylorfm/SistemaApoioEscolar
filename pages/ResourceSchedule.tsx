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
  FileText
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
    availableWeeks,
    classes,
    subjects,
    semanticColors,
    isLoading
  } = useResource();

  const availableResources = resources.filter(r => r.active !== false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Agendamento[]>([]);
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
    descricao: ''
  });

  // Use availableResources instead of resources
  const selectedResource = availableResources.find(r => r.id === selectedResourceId) || availableResources[0];
  const isPast = weekOffset < 0;
  // Read Only if week is past or user is not logged in
  const readOnly = isPast || !profile;

  // 1. Loading State
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

  // 2. Empty State (No Resources)
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

  // Permissions
  const isAdmin = profile?.tipo === 'Administrador' || profile?.tipo === 'Coordenador' || profile?.tipo === 'Colaborador';
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
    // Current date logic (using real dates now instead of hardcoded)
    const today = new Date();
    // Adjust to Monday of the current week (or offset week)
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));

    // Apply offset
    monday.setDate(monday.getDate() + (offset * 7));

    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        name,
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: d // Object for comparison
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

  const currentWeek = getWeekDates(weekOffset);

  // Fetch Bookings
  const fetchBookings = async () => {
    if (!selectedResourceId) return;

    const startDate = currentWeek.start.toISOString().split('T')[0];
    const endDate = currentWeek.end.toISOString().split('T')[0];

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

    if (error) {
      console.error('Error fetching bookings:', error);
      toast.error(`Erro: ${error.message} (${error.code})`);
    } else {
      setBookings(data || []);
    }
  };

  useEffect(() => {
    fetchBookings();

    // Realtime Subscription for Agendamentos
    const channel = supabase.channel(`schedule_updates_${selectedResourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Agendamentos',
          filter: `recurso_id=eq.${selectedResourceId}`
        },
        (payload) => {
          console.log('[Realtime] Schedule changed:', payload);
          fetchBookings();
          toast.info('Agenda atualizada em tempo real');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedResourceId, weekOffset]);

  // --- Handlers ---

  const handleCellClick = (date: Date, slot: any) => {
    // Prevent booking in past if needed (optional rule)
    // if (isPast) return; 

    // Find existing
    const dateStr = date.toISOString().split('T')[0];
    const existing = bookings.find(b => b.horario_id === slot.id && b.data === dateStr);

    if (existing) {
      // Open Details
      setSelectedSlot({
        date,
        timeSlotId: slot.id,
        timeLabel: slot.label,
        timeStart: slot.start,
        existingBooking: existing
      });
      setFormData({
        turmaId: existing.turma_id,
        disciplinaId: existing.disciplina_id,
        profissionalId: existing.profissional_id,
        descricao: existing.descricao || ''
      });
      setIsModalOpen(true);
    } else {
      // Open New Booking
      // Only allow click if we have write permission (Admins or Teachers)
      if (!profile) return;

      setSelectedSlot({
        date,
        timeSlotId: slot.id,
        timeLabel: slot.label,
        timeStart: slot.start
      });
      setFormData({
        turmaId: '',
        disciplinaId: '',
        profissionalId: isTeacher && profile?.id ? profile.id : '', // Auto-set for teacher
        descricao: ''
      });
      setIsModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!selectedSlot || !selectedResourceId) return;
    if (!formData.turmaId || !formData.disciplinaId) {
      toast.error('Preencha a turma e a disciplina');
      return;
    }
    if (isAdmin && !formData.profissionalId) {
      toast.error('Selecione o profissional');
      return;
    }

    const dateStr = selectedSlot.date.toISOString().split('T')[0];
    const profId = isAdmin ? formData.profissionalId : (profile?.id || '');

    if (!profId) {
      toast.error("Erro de identificação do usuário");
      return;
    }

    const payload = {
      recurso_id: selectedResourceId,
      horario_id: selectedSlot.timeSlotId,
      data: dateStr,
      turma_id: formData.turmaId,
      disciplina_id: formData.disciplinaId,
      profissional_id: profId,
      descricao: formData.descricao
    };

    try {
      const { error } = await supabase.from('Agendamentos').insert([payload]);

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast.error('Horário já reservado por outro usuário');
        } else {
          throw error;
        }
      } else {
        toast.success('Agendamento realizado!');
        setIsModalOpen(false);
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar agendamento');
    }
  };

  const handleDelete = async () => {
    if (!selectedSlot?.existingBooking) return;

    if (!confirm('Tem certeza que deseja remover este agendamento?')) return;

    const { error } = await supabase
      .from('Agendamentos')
      .delete()
      .eq('id', selectedSlot.existingBooking.id);

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir agendamento');
    } else {
      toast.success('Agendamento removido');
      setIsModalOpen(false);
      fetchBookings();
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
                                    {isSelected && <Check className="w-4 h-4 text-primary-600" />}
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
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                disabled={weekOffset >= availableWeeks - 1}
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
                        const dateStr = day.fullDate.toISOString().split('T')[0];
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
                                  backgroundColor: isOwner ? `${semanticColors.regular}20` : '#f1f5f9',
                                  borderColor: isOwner ? semanticColors.regular : '#94a3b8',
                                }}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  {isOwner ? <User className="w-3 h-3 text-primary-600" /> : <Lock className="w-3 h-3 text-slate-400" />}
                                  <span className="text-xs font-bold uppercase text-slate-700 truncate">
                                    {booking.profissional?.alias || booking.profissional?.nome}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-slate-600 leading-tight">
                                  {booking.disciplina?.name}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {booking.turma?.series} {booking.turma?.name}
                                </p>
                                {booking.descricao && (
                                  <div className="flex items-center gap-1 mt-0.5" title={booking.descricao}>
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    <span className="text-[9px] text-slate-400 italic truncate max-w-[80px]">
                                      Obs.
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Empty Slot
                              !readOnly && (
                                <div className="w-full h-full border-2 border-dashed border-transparent hover:border-slate-300/50 rounded flex items-center justify-center transition-all group cursor-pointer opacity-50 hover:opacity-100">
                                  <Plus className="text-slate-400 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all w-5 h-5" />
                                </div>
                              )
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

                {/* Read Only existing info OR Form */}
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
                          disabled={!!selectedSlot.existingBooking} // Disable changing owner on edit for now (simpler) or let admin change? Let's disable for safety unless requested.
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
                        disabled={isAdmin ? false : !!selectedSlot.existingBooking} // Admins can edit description? Or just during creation? User implies editability. Let's assume edit on modal if authorized.
                        placeholder="Ex: Preciso de cabo HDMI, Caixa de Som..."
                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm min-h-[80px] resize-y"
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Footer / Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                {selectedSlot.existingBooking ? (
                  <>
                    {(isAdmin || selectedSlot.existingBooking.profissional_id === profile?.id) ? (
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-xl bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Excluir
                      </button>
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
                    <button
                      onClick={handleSave}
                      className="flex-1 px-6 py-2 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                    >
                      Confirmar Agendamento
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};