import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Printer, ChevronDown, UserSearch, MapPin, Search, Check, Clock, CalendarDays, Filter, X, Edit, Save, Plus, Trash2, BookOpen, AlertTriangle } from 'lucide-react';
import { useResource } from '../contexts/ResourceContext';
import { useAuth } from '../contexts/AuthContext';

export const TeacherSchedule: React.FC = () => {
  const { profile } = useAuth();
  const { timeSlots, teachers, allocations, subjects, classes, institutionName, academicYear, complementaryAllocations, addComplementaryAllocation, removeComplementaryAllocation, refreshAllocations } = useResource();

  useEffect(() => {
    if (allocations.length === 0) {
      refreshAllocations();
    }
  }, [allocations.length, refreshAllocations]);

  // Filter out breaks/intervals as they are not used for allocations
  const filteredTimeSlots = timeSlots.filter(ts => ts.type === 'class');

  const [isEditMode, setIsEditMode] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; day: string; timeSlotId: string; timeLabel: string; currentActivity?: string; allocationId?: string } | null>(null);
  const [conflictModalState, setConflictModalState] = useState<{ isOpen: boolean; title: string; message: string; submessage?: string } | null>(null);

  // Filter States
  const [selectedYear, setSelectedYear] = useState(academicYear?.year || new Date().getFullYear().toString());

  // Update selected year when context loads
  React.useEffect(() => {
    if (academicYear?.year) setSelectedYear(academicYear.year);
  }, [academicYear]);
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const filteredTeachers = teachers.filter(t =>
    (t.alias || t.name).toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.name.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const [visibleDays, setVisibleDays] = useState<string[]>(days);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleDay = (day: string) => {
    setVisibleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Auto-select logged-in teacher
  React.useEffect(() => {
    if (profile?.tipo === 'Professor' && !selectedTeacherId && teachers.length > 0) {
      // Check if profile.id matches a teacher in the list
      if (teachers.find(t => t.id === profile?.id)) {
        setSelectedTeacherId(profile.id);
      }
    }
  }, [profile, teachers, selectedTeacherId]);

  // Helper function to get allocations for the selected teacher and specific day
  const getDailyAllocations = (day: string) => {
    // 1. Regular Class Allocations
    const classAllocs = allocations.filter(a =>
      a.teacherId === selectedTeacherId &&
      a.dayOfWeek === day &&
      a.year === selectedYear &&
      a.semester === selectedSemester
    ).map(a => ({ ...a, type: 'class' as const }));

    // 2. Complementary Allocations
    const compAllocs = complementaryAllocations.filter(c =>
      c.teacherId === selectedTeacherId &&
      c.dayOfWeek === day &&
      c.year === selectedYear &&
      c.semester === selectedSemester
    ).map(c => ({
      id: c.id,
      teacherId: c.teacherId,
      timeSlotId: c.timeSlotId,
      dayOfWeek: c.dayOfWeek,
      year: c.year,
      semester: c.semester,
      activity: c.activity,
      type: 'activity' as const,
      // Fake props to satisfy type if needed, or handle in render
      subjectId: '',
      classId: '',
    }));

    // Merge
    const allAllocs = [...classAllocs, ...compAllocs];

    // Map to include detailed info and sort by timeSlot index
    return allAllocs.map(alloc => {
      const timeSlotIndex = filteredTimeSlots.findIndex(ts => ts.id === alloc.timeSlotId);
      // Skip if slot not found (e.g. was a break allocation and we are filtering breaks)
      if (timeSlotIndex === -1) return null;

      const timeSlot = filteredTimeSlots[timeSlotIndex];
      const subject = subjects.find(s => s.id === alloc.subjectId);
      const schoolClass = classes.find(c => c.id === alloc.classId);

      return {
        ...alloc,
        timeSlot,
        subject,
        schoolClass,
        order: timeSlotIndex
      };
    }).filter(a => a !== null).sort((a, b) => a!.order - b!.order) as any[];
  };

  const handleCellClick = (day: string, timeSlotId: string, timeLabel: string) => {
    if (!isEditMode || !selectedTeacherId) return;

    // Check if there is already an allocation
    const existing = getDailyAllocations(day).find(a => a.timeSlotId === timeSlotId);

    if (existing) {
      if (existing.type === 'class') {
        alert('Para alterar aulas, utilize a Grade de Turmas.');
        return;
      }
      // Edit/Delete Activity
      setModalState({
        isOpen: true,
        day,
        timeSlotId,
        timeLabel,
        currentActivity: existing.activity,
        allocationId: existing.id
      });
    } else {
      // Create new Activity
      setModalState({
        isOpen: true,
        day,
        timeSlotId,
        timeLabel
      });
    }
  };

  // Filter days that actually have classes AND are selected in the filter
  const activeDays = days.filter(day =>
    visibleDays.includes(day) && getDailyAllocations(day).length > 0
  );

  return (
    <div className="flex bg-background-light min-h-screen overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Header
          title=""
          subtitle=""
          hideUserSection={true}
          hideLogout={true}
          customTitleContent={
            <div className="flex items-center gap-3">
              {profile?.foto ? (
                <img src={profile.foto} alt="Perfil" className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold border-2 border-primary-50 shadow-sm">
                  {profile?.nome?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 leading-tight">{profile?.nome || "Usuário"}</span>
                <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full w-fit mt-0.5">
                  {profile?.tipo || "Visitante"}
                </span>
              </div>
            </div>
          }
          showSearch={false}
          showNotifications={false}
        />

        <main className="flex-1 flex flex-col p-4 overflow-hidden">

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-4 shrink-0 flex flex-col lg:flex-row gap-4 items-center justify-between relative z-20">

            {/* Teacher Selector */}
            <div className="relative w-full lg:w-auto">
              <button
                onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                className={`flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all group w-full lg:w-auto text-left ${!selectedTeacher ? 'bg-indigo-600 hover:bg-indigo-700 border-transparent text-white shadow-lg shadow-indigo-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
              >
                {!selectedTeacher ? (
                  <>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <UserSearch className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white/70 uppercase tracking-wider mb-0.5">Comece por aqui</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white leading-none">Escolher Professor</span>
                        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${isTeacherDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
                      {selectedTeacher.avatar ? (
                        <img src={selectedTeacher.avatar} alt={selectedTeacher.alias || selectedTeacher.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{(selectedTeacher.alias || selectedTeacher.name).charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Horário de Aulas de</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-800 leading-none">{selectedTeacher.alias || selectedTeacher.name}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isTeacherDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </>
                )}
              </button>

              {/* Dropdown Menu */}
              {isTeacherDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsTeacherDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-full lg:w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative mb-2 px-2 pt-2">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar professor..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
                      {filteredTeachers.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTeacherId(t.id);
                            setIsTeacherDropdownOpen(false);
                            setTeacherSearch('');
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${selectedTeacherId === t.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedTeacherId === t.id ? 'bg-primary-200 text-primary-700' : 'bg-slate-200 text-slate-500'}`}>
                            <span className="text-sm font-bold">{(t.alias || t.name).charAt(0)}</span>
                          </div>
                          <span className="text-sm font-medium flex-1">{t.alias || t.name}</span>
                          {selectedTeacherId === t.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">

              {/* Day Filter */}
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  disabled={!selectedTeacher}
                  className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 ${isFilterOpen || visibleDays.length !== days.length
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    } ${!selectedTeacher ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Filtrar Dias"
                >
                  <Filter className="w-5 h-5" />
                  {visibleDays.length !== days.length && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                      {visibleDays.length}
                    </span>
                  )}
                </button>

                {isFilterOpen && selectedTeacher && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-50">
                        <span className="text-xs font-bold text-slate-500 uppercase">Filtrar Dias</span>
                        {visibleDays.length < days.length && (
                          <button
                            onClick={() => setVisibleDays(days)}
                            className="text-[10px] text-indigo-600 font-bold hover:underline"
                          >
                            Resetar
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {days.map(day => (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left text-sm font-medium ${visibleDays.includes(day)
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'hover:bg-slate-50 text-slate-600'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center grid transition-all ${visibleDays.includes(day)
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-slate-300'
                              }`}>
                              {visibleDays.includes(day) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
                <div className="relative px-2 border-r border-slate-200 mr-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    disabled
                    className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 py-1 pl-1 pr-6 cursor-not-allowed appearance-none"
                  >
                    <option value={selectedYear}>{selectedYear}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedSemester('1')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedSemester === '1'
                      ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    1º Sem
                  </button>
                  <button
                    onClick={() => setSelectedSemester('2')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedSemester === '2'
                      ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    2º Sem
                  </button>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

              {/* Edit Toggle */}
              {(profile?.tipo === 'Administrador' || profile?.tipo === 'Coordenador') && selectedTeacher && (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isEditMode
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-1 ring-amber-300'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                  {isEditMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  <span>{isEditMode ? 'Salvar' : 'Complementar Grade'}</span>
                </button>
              )}

              <button
                className="p-2.5 text-slate-500 hover:text-primary-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                title="Imprimir Grade"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Activity Modal */}
          {modalState && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 m-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {modalState.allocationId ? 'Editar Atividade' : 'Nova Atividade'}
                  </h3>
                  <button onClick={() => setModalState(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-wider">
                  {modalState.day} • {modalState.timeLabel}
                </p>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const activity = (form.elements.namedItem('activity') as HTMLInputElement).value;

                  if (activity) {
                    if (modalState.allocationId) {
                      // Remove old one first (simple update simulation)
                      removeComplementaryAllocation(modalState.allocationId);
                    }
                    addComplementaryAllocation({
                      teacherId: selectedTeacherId,
                      dayOfWeek: modalState.day,
                      timeSlotId: modalState.timeSlotId,
                      year: selectedYear,
                      semester: selectedSemester,
                      activity
                    });
                    setModalState(null);
                  }
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Descrição da Atividade
                    </label>
                    <input
                      name="activity"
                      defaultValue={modalState.currentActivity}
                      placeholder="Ex: Planejamento, Reunião, Atendimento"
                      className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-between gap-3 pt-2">
                    {modalState.allocationId ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Remover esta atividade?')) {
                            removeComplementaryAllocation(modalState.allocationId!);
                            setModalState(null);
                          }
                        }}
                        className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalState(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Conflict Modal */}
          {conflictModalState && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200 border-l-4 border-amber-500">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{conflictModalState.title}</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">{conflictModalState.message}</p>
                    {conflictModalState.submessage && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-500 border border-slate-100">
                        {conflictModalState.submessage}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setConflictModalState(null)}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Column-Based Layout */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-white rounded-xl border border-slate-200 shadow-sm">
            {selectedTeacher ? (
              <div className="h-full flex divide-x divide-slate-100 min-w-full">

                {activeDays.length === 0 && !isEditMode ? (
                  <div className="w-full flex flex-col items-center justify-center p-10 text-slate-400">
                    <CalendarDays className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma aula ou atividade cadastrada para este professor.</p>
                  </div>
                ) : (
                  (isEditMode ? visibleDays : activeDays).map(day => {
                    const dailyClasses = getDailyAllocations(day);

                    // Pre-fill empty slots for edit mode
                    const displayItems = isEditMode
                      ? filteredTimeSlots.map(ts => {
                        const existing = dailyClasses.find(d => d.timeSlotId === ts.id);
                        return existing || {
                          id: `empty-${ts.id}`,
                          timeSlotId: ts.id,
                          timeSlot: ts,
                          type: 'empty' as const,
                          order: ts.order
                        };
                      })
                      : dailyClasses;

                    return (
                      <div key={day} className="flex-1 min-w-[300px] flex flex-col h-full bg-slate-50/30">
                        {/* Day Header */}
                        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between">
                          <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">{day}</h3>
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                            {dailyClasses.length} Aulas
                          </span>
                        </div>

                        {/* Classes List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                          {displayItems.map((item, index) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (!item.timeSlot) return;

                                if (item.type === 'class') {
                                  // Trigger Conflict Modal
                                  const alloc = item as any; // Cast for access
                                  const className = alloc.schoolClass ? `${alloc.schoolClass.series} ${alloc.schoolClass.name}` : 'uma turma';
                                  const room = alloc.room ? ` na sala ${alloc.room}` : '';

                                  setConflictModalState({
                                    isOpen: true,
                                    title: 'Professor em Aula',
                                    message: `Não é possível adicionar uma atividade complementar neste horário.`,
                                    submessage: `O professor já está ministrando aula para a turma ${className}${room}.`
                                  });
                                  return;
                                }

                                handleCellClick(day, item.timeSlot.id, item.timeSlot.label);
                              }}
                              className={`relative group ${isEditMode ? 'cursor-pointer' : ''}`}
                            >
                              {item.type === 'empty' ? (
                                <div className="h-20 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                                  <span className="text-xs font-bold text-center">
                                    {item.timeSlot?.label}<br />
                                    <span className="text-[10px] font-normal">Disponível</span>
                                  </span>
                                </div>
                              ) : (
                                <div className={`relative z-10 rounded-lg border p-3 shadow-sm hover:shadow-md transition-all flex items-stretch gap-3 ${item.type === 'activity'
                                  ? 'bg-teal-50 border-teal-200 hover:border-teal-300'
                                  : 'bg-white border-slate-200 hover:border-primary-200'
                                  }`}>
                                  {/* Left: Time & Period */}
                                  <div className={`flex flex-col items-center justify-center w-14 border-r pr-3 shrink-0 ${item.type === 'activity' ? 'border-teal-100' : 'border-slate-100'
                                    }`}>
                                    <span className={`text-lg font-black leading-none mb-1 ${item.type === 'activity' ? 'text-teal-600' : 'text-primary-600'
                                      }`}>
                                      {item.timeSlot?.label.split('ª')[0]}ª
                                    </span>
                                    <div className={`text-[10px] font-bold leading-tight text-center ${item.type === 'activity' ? 'text-teal-400' : 'text-slate-400'
                                      }`}>
                                      {item.timeSlot?.start}<br />as<br />{item.timeSlot?.end}
                                    </div>
                                  </div>

                                  {/* Right: Details */}
                                  <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
                                    {item.type === 'activity' ? (
                                      <>
                                        <h4 className="text-sm font-bold text-teal-800 leading-tight mb-1 uppercase break-words whitespace-normal">
                                          {item.activity}
                                        </h4>
                                        <p className="text-xs font-semibold text-teal-600 mb-1">
                                          Atividade Complementar
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <h4 className="text-sm font-bold text-slate-900 leading-tight mb-1 uppercase break-words whitespace-normal">
                                          {item.subject?.name || 'Disciplina'}
                                        </h4>
                                        <p className="text-xs font-semibold text-slate-600 mb-1 break-words whitespace-normal">
                                          {item.schoolClass ? `${item.schoolClass.series} ${item.schoolClass.name}` : 'Turma não encontrada'}
                                        </p>
                                        {item.room && (
                                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="uppercase font-bold break-words whitespace-normal">{item.room}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}

              </div>
            ) : (
              <div className="w-full flex-col flex items-center justify-center h-full p-10 text-slate-400/60">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <UserSearch className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">Selecione um Professor</h3>
                <p className="max-w-md text-center text-slate-400">
                  Escolha um professor acima para visualizar sua grade horária individual, turmas e salas de aula.
                </p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};