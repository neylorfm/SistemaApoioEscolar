import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Printer, Edit, ChevronDown, Users, X, Clock, MapPin, Coffee, Plus, Save, Trash2, Check, BookOpen, GraduationCap, User, Search, Filter, Copy, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useResource } from '../contexts/ResourceContext';
import { useAuth } from '../contexts/AuthContext';

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { subjectId: string; teacherId: string; room: string }) => void;
  day: string;
  timeLabel: string;
  initialData?: { subjectId: string; teacherId: string; room: string } | null;
}

const AllocationModal: React.FC<AllocationModalProps> = ({ isOpen, onClose, onSave, day, timeLabel, initialData }) => {
  const { teachers, subjects } = useResource();
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [room, setRoom] = useState('');

  // Update state when initialData changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSubjectId(initialData.subjectId || '');
        setTeacherId(initialData.teacherId || '');
        setRoom(initialData.room || '');
      } else {
        setSubjectId('');
        setTeacherId('');
        setRoom('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Horários das Turmas</h3>
            <p className="text-sm text-slate-500">{day} • {timeLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <User className="w-4 h-4 text-primary-600" /> Professor
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-sm py-2.5 px-3 bg-slate-50 border"
            >
              <option value="">Selecione o professor...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-600" /> Disciplina
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-sm py-2.5 px-3 bg-slate-50 border"
            >
              <option value="">Selecione a disciplina...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" /> Sala (Opcional)
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ex: Sala 101"
              className="w-full rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-sm py-2.5 px-3 bg-slate-50 border"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (subjectId) { // Teacher is optional
                onSave({ subjectId, teacherId, room });
                setSubjectId('');
                setTeacherId('');
                setRoom('');
              }
            }}
            disabled={!subjectId}
            className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'safe' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, type = 'safe', confirmLabel, cancelLabel, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <Check className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 whitespace-pre-line leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={() => {
              if (onCancel) onCancel();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {cancelLabel || 'Cancelar'}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 ${type === 'warning'
              ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
          >
            {confirmLabel || (type === 'warning' ? 'Sim, continuar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
};


interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: string;
  timeLabel: string;
  freeTeachers: any[];
  busyTeachers: any[];
  complementaryTeachers: any[];
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose, day, timeLabel, freeTeachers, busyTeachers, complementaryTeachers }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 m-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              Disponibilidade de Professores
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wide">{day} • {timeLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Free Teachers */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-4 text-emerald-800 border-b border-emerald-200 pb-2">
                <Check className="w-5 h-5" />
                <h4 className="font-bold">Livres ({freeTeachers.length})</h4>
              </div>
              <ul className="space-y-2">
                {freeTeachers.map(t => (
                  <li key={t.id} className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-emerald-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      {(t.alias || t.name).substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{t.alias || t.name}</span>
                  </li>
                ))}
                {freeTeachers.length === 0 && <p className="text-sm text-emerald-600/60 italic text-center py-4">Nhum professor livre.</p>}
              </ul>
            </div>

            {/* Complementary Teachers */}
            <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
              <div className="flex items-center gap-2 mb-4 text-cyan-800 border-b border-cyan-200 pb-2">
                <Clock className="w-5 h-5" />
                <h4 className="font-bold">Em Atividade ({complementaryTeachers.length})</h4>
              </div>
              <ul className="space-y-2">
                {complementaryTeachers.map(item => (
                  <li key={item.teacher.id} className="flex flex-col bg-white p-2 rounded-lg shadow-sm border border-cyan-100">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-xs">
                        {(item.teacher.alias || item.teacher.name).substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.teacher.alias || item.teacher.name}</span>
                    </div>
                    <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded w-fit ml-11">
                      {item.activity}
                    </span>
                  </li>
                ))}
                {complementaryTeachers.length === 0 && <p className="text-sm text-cyan-600/60 italic text-center py-4">Nenhum professor em atividade complementar.</p>}
              </ul>
            </div>

            {/* Busy Teachers */}
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 opacity-80">
              <div className="flex items-center gap-2 mb-4 text-rose-800 border-b border-rose-200 pb-2">
                <BookOpen className="w-5 h-5" />
                <h4 className="font-bold">Em Aula ({busyTeachers.length})</h4>
              </div>
              <ul className="space-y-2">
                {busyTeachers.map(item => (
                  <li key={item.teacher.id} className="flex flex-col bg-white p-2 rounded-lg shadow-sm border border-rose-100">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs">
                        {(item.teacher.alias || item.teacher.name).substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.teacher.alias || item.teacher.name}</span>
                    </div>
                    <span className="text-xs text-rose-600 ml-11 font-medium">
                      {item.className} - {item.subjectName}
                    </span>
                  </li>
                ))}
                {busyTeachers.length === 0 && <p className="text-sm text-rose-600/60 italic text-center py-4">Nenhum professor em aula.</p>}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
export const ClassSchedule: React.FC = () => {
  const { profile } = useAuth();
  const {
    classes,
    timeSlots,
    allocations,
    addAllocation,
    removeAllocation,
    copySemesterSchedule,
    subjects,
    teachers,
    institutionName,
    academicYear,
    complementaryAllocations,
    refreshAllocations
  } = useResource();
  const [isEditMode, setIsEditMode] = useState(false);

  // Trigger fetch if allocations are empty (Lazy Loading)
  React.useEffect(() => {
    if (allocations.length === 0) {
      refreshAllocations();
    }
  }, [allocations.length, refreshAllocations]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState(academicYear?.year || new Date().getFullYear().toString());

  // Update selected year when context loads
  React.useEffect(() => {
    if (academicYear?.year) setSelectedYear(academicYear.year);
  }, [academicYear]);
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>(['1']);

  // Backward compatibility helper
  const selectedSemester = selectedSemesters[0];
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');

  // Day Filter States
  const allDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const [visibleDays, setVisibleDays] = useState<string[]>(allDays);
  const [isDayFilterOpen, setIsDayFilterOpen] = useState(false);

  // Custom Dropdown States
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [classSearch, setClassSearch] = useState('');

  const [isAvailabilityMode, setIsAvailabilityMode] = useState(false); // New mode

  // Modals
  const [modalState, setModalState] = useState<{
    isOpen: boolean; day: string; timeSlotId: string; timeLabel: string;
    initialData?: { subjectId: string; teacherId: string; room: string } | null;
  } | null>(null);

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<{
    day: string;
    timeLabel: string;
    freeTeachers: any[];
    busyTeachers: any[];
    complementaryTeachers: any[];
  } | null>(null);

  // Confirmation Modal State
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'safe' | 'warning';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'safe',
    onConfirm: () => { },
  });

  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const filteredClasses = classes.filter(c => `${c.series} ${c.name}`.toLowerCase().includes(classSearch.toLowerCase()));

  // Helper to find allocation for a specific cell (By Class)
  const getAllocation = (day: string, timeSlotId: string) => {
    return allocations.find(a =>
      a.classId === selectedClassId &&
      a.dayOfWeek === day &&
      a.timeSlotId === timeSlotId &&
      a.year === selectedYear &&
      selectedSemesters.includes(a.semester)
    );
  };

  const handleCellClick = (day: string, timeSlotId: string, timeLabel: string) => {
    if (isAvailabilityMode) {
      // Logic for Availability Check
      const currentSlotAllocations = allocations.filter(a =>
        a.dayOfWeek === day &&
        a.timeSlotId === timeSlotId &&
        a.year === selectedYear &&
        selectedSemesters.includes(a.semester)
      );

      const currentComplementary = complementaryAllocations.filter(c =>
        c.dayOfWeek === day &&
        c.timeSlotId === timeSlotId &&
        c.year === selectedYear &&
        selectedSemesters.includes(c.semester)
      );

      const busyTeacherIds = new Set(currentSlotAllocations.map(a => a.teacherId));
      const compTeacherIds = new Set(currentComplementary.map(c => c.teacherId));

      const busyTeachers = currentSlotAllocations.map(a => {
        const teacher = teachers.find(t => t.id === a.teacherId);
        const schoolClass = classes.find(c => c.id === a.classId);
        const subject = subjects.find(s => s.id === a.subjectId);
        return {
          teacher: teacher || { name: 'Desconhecido', id: a.teacherId },
          className: schoolClass ? `${schoolClass.series} ${schoolClass.name}` : 'Unknown',
          subjectName: subject?.name || 'Unknown'
        };
      });

      const complementaryTeachersList: any[] = [];
      const freeTeachersList: any[] = [];

      currentComplementary.forEach(c => {
        const teacher = teachers.find(t => t.id === c.teacherId);
        const data = {
          teacher: teacher || { name: 'Desconhecido', id: c.teacherId },
          activity: c.activity
        };

        if (c.activity.toLowerCase().includes('livre')) {
          freeTeachersList.push({ ...data.teacher, activity: c.activity });
        } else {
          complementaryTeachersList.push(data);
        }
      });

      // Old logic: "Free" meant no allocation. New logic: "Free" means Explicit "Livre" activity.
      // Teachers with NO allocation are considered "Unavailable" / "Not in School" and are NOT shown.

      setAvailabilityData({
        day,
        timeLabel,
        freeTeachers: freeTeachersList,
        busyTeachers,
        complementaryTeachers: complementaryTeachersList
      });
      setAvailabilityModalOpen(true);
      return;
    }

    if (!isEditMode) return;

    // Check if there is an existing allocation
    const existingAllocation = getAllocation(day, timeSlotId);

    if (existingAllocation) {
      // Edit existing
      setModalState({
        isOpen: true,
        day,
        timeSlotId,
        timeLabel,
        initialData: {
          subjectId: existingAllocation.subjectId,
          teacherId: existingAllocation.teacherId, // might be null/empty, that's fine
          room: existingAllocation.room || ''
        }
      });
    } else {
      // Create new
      setModalState({ isOpen: true, day, timeSlotId, timeLabel, initialData: null });
    }
  };

  const handleSaveAllocation = (data: { subjectId: string; teacherId: string; room: string }) => {
    if (modalState && selectedClass) {
      type ConflictInfo = {
        semester: string;
        day: string;
        time: string;
        description: string;
      };
      const conflicts: ConflictInfo[] = [];

      // Check for conflicts in ALL selected semesters (ONLY IF TEACHER IS SELECTED)
      if (data.teacherId) {
        for (const sem of selectedSemesters) {
          // 1. Check for conflicts with other classes (Existing Logic)
          const conflict = allocations.find(a =>
            a.teacherId === data.teacherId &&
            a.dayOfWeek === modalState.day &&
            a.timeSlotId === modalState.timeSlotId &&
            a.year === selectedYear &&
            a.semester === sem &&
            a.classId !== selectedClass.id // Only conflict if it's a different class
          );

          const teacher = teachers.find(t => t.id === data.teacherId);
          const teacherName = teacher ? (teacher.alias || teacher.name) : 'Professor';
          const timeSlot = timeSlots.find(ts => ts.id === modalState.timeSlotId);
          const lessonName = timeSlot ? timeSlot.label.split('ª')[0] + 'ª Aula' : 'Aula';

          if (conflict) {
            const conflictClass = classes.find(c => c.id === conflict.classId);
            const conflictClassName = conflictClass ? `${conflictClass.series} ${conflictClass.name}` : 'Outra Turma';

            conflicts.push({
              semester: sem,
              day: modalState.day,
              time: `${lessonName} (${modalState.timeLabel})`,
              description: `${teacherName} já está na turma ${conflictClassName}`
            });
          }

          // 2. Check for conflicts with Complementary Allocations (New Logic)
          const compConflict = complementaryAllocations.find(c =>
            c.teacherId === data.teacherId &&
            c.dayOfWeek === modalState.day &&
            c.timeSlotId === modalState.timeSlotId &&
            c.year === selectedYear &&
            c.semester === sem
          );

          if (compConflict) {
            conflicts.push({
              semester: sem,
              day: modalState.day,
              time: `${lessonName} (${modalState.timeLabel})`,
              description: `${teacherName} tem atividade complementar registrada de ${compConflict.activity}`
            });
          }
        }
      }

      if (conflicts.length > 0) {
        const currentClassName = `${selectedClass.series} ${selectedClass.name}`;
        let message = '';

        if (conflicts.length === 1) {
          const c = conflicts[0];
          message = `Não é possível salvar este horário na turma ${currentClassName} ,pois existe conflito em ${c.semester}º Semestre - ${c.day}, ${c.time}:\n\n${c.description}`;
        } else {
          // Format: 1ª AULA - SEGUNDA
          const timeSlot = timeSlots.find(ts => ts.id === modalState.timeSlotId);
          const simpleLesson = timeSlot ? timeSlot.label.split('ª')[0] + 'ª AULA' : 'AULA';
          const contextHeader = `${simpleLesson} - ${modalState.day.toUpperCase()}`;

          message = `Não é possível salvar este horário na turma ${currentClassName} ,pois existem conflitos:\n\n${contextHeader}\n\n${conflicts.map(c => `• ${c.semester}º Semestre: ${c.description}`).join('\n')}`;
        }

        setConfirmModalState({
          isOpen: true,
          title: 'Conflito de Horário',
          message: message,
          type: 'warning',
          confirmLabel: 'Tentar outro horário',
          cancelLabel: 'Cancelar',
          onConfirm: () => { }, // Closes warning, keeps form open
          onCancel: () => setModalState(null) // Closes warning and form (Back to grid)
        });
        return;
      }

      // Save for ALL selected semesters if no conflicts
      for (const sem of selectedSemesters) {
        addAllocation({
          teacherId: data.teacherId,
          year: selectedYear,
          semester: sem,
          dayOfWeek: modalState.day,
          timeSlotId: modalState.timeSlotId,
          subjectId: data.subjectId,
          classId: selectedClass.id,
          room: data.room,
          color: 'bg-indigo-50 border-indigo-500' // Default color for class schedule
        });
      }
      setModalState(null);
    }
  };

  const toggleDay = (day: string) => {
    if (visibleDays.includes(day)) {
      // Don't allow hiding all days
      if (visibleDays.length > 1) {
        setVisibleDays(visibleDays.filter(d => d !== day));
      }
    } else {
      // Add day and sort based on original order
      const newDays = [...visibleDays, day];
      newDays.sort((a, b) => allDays.indexOf(a) - allDays.indexOf(b));
      setVisibleDays(newDays);
    }
  };

  if (!selectedClass) return <div className="p-10">Carregando...</div>;

  return (
    <div className="flex bg-background-light min-h-screen overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Header
          title={institutionName}
          subtitle="Grade Horária das Turmas"
          user={{
            name: profile?.nome || "Usuário",
            role: profile?.tipo || "Visitante",
            image: profile?.foto || ""
          }}
          showSearch={false}
          showNotifications={false}
          hideUserSection={true}
          hideLogout={true}
        />

        <main className="flex-1 flex flex-col p-4 overflow-hidden">

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-4 shrink-0 flex flex-col lg:flex-row gap-4 items-center justify-between relative z-50">

            {/* Class Selector - Modernized */}
            <div className="relative w-full lg:w-auto">
              <button
                onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                className="flex items-center gap-3 p-2 pr-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group w-full lg:w-auto text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Visualizando Grade de</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-800 leading-none">{selectedClass.series} {selectedClass.name}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Custom Dropdown Menu */}
              {isClassDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsClassDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-full lg:w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative mb-2 px-2 pt-2">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar turma..."
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
                      {filteredClasses.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">Nenhuma turma encontrada.</div>
                      ) : (
                        filteredClasses.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedClassId(c.id);
                              setIsClassDropdownOpen(false);
                              setClassSearch('');
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${selectedClassId === c.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedClassId === c.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                              <span className="text-sm font-bold">{c.series.substring(0, 1)}{c.name.substring(0, 1)}</span>
                            </div>
                            <span className="text-sm font-medium flex-1">{c.series} {c.name}</span>
                            {selectedClassId === c.id && <Check className="w-4 h-4" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            {/* Controls */}
            <div className="flex-1 flex flex-wrap md:flex-nowrap items-center gap-2 pb-2 sm:pb-0 text-slate-500">

              {/* Year Selector */}
              <div className="bg-slate-100 p-1 rounded-lg shrink-0 flex items-center justify-center h-[38px] border border-transparent">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  disabled
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 py-0 pl-1 pr-6 cursor-not-allowed appearance-none"
                >
                  <option value={selectedYear}>{selectedYear}</option>
                </select>
              </div>

              {/* Semesters Group with Status Below */}
              <div className="flex flex-col items-center">
                <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 h-[38px] items-center">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (isEditMode) {
                          if (selectedSemesters.includes('1')) {
                            if (selectedSemesters.length > 1) setSelectedSemesters(selectedSemesters.filter(s => s !== '1'));
                          } else {
                            setSelectedSemesters([...selectedSemesters, '1']);
                          }
                        } else {
                          setSelectedSemesters(['1']);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all h-full flex items-center ${selectedSemesters.includes('1')
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      1º Sem
                    </button>
                    <button
                      onClick={() => {
                        if (isEditMode) {
                          if (selectedSemesters.includes('2')) {
                            if (selectedSemesters.length > 1) setSelectedSemesters(selectedSemesters.filter(s => s !== '2'));
                          } else {
                            setSelectedSemesters([...selectedSemesters, '2']);
                          }
                        } else {
                          setSelectedSemesters(['2']);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all h-full flex items-center ${selectedSemesters.includes('2')
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      2º Sem
                    </button>
                  </div>

                  {/* Copy Button Area */}
                  {isEditMode && (profile?.tipo === 'Administrador' || profile?.tipo === 'Coordenador') && (
                    <button
                      onClick={() => {
                        const hasTargetData = allocations.some(a =>
                          a.classId === selectedClassId &&
                          a.year === selectedYear &&
                          a.semester === '2'
                        );

                        if (hasTargetData) {
                          setConfirmModalState({
                            isOpen: true,
                            title: "Sobrescrever Semestre",
                            message: "O 2º semestre já possui horários cadastrados. Ao copiar, TODOS os horários existentes do 2º semestre serão substituídos pelos do 1º semestre.",
                            type: 'warning',
                            onConfirm: async () => {
                              await copySemesterSchedule('1', '2', selectedYear, selectedClassId);
                            }
                          });
                        } else {
                          setConfirmModalState({
                            isOpen: true,
                            title: "Confirmar Cópia",
                            message: "Confirma a cópia da grade do 1º semestre para o 2º semestre?",
                            type: 'safe',
                            onConfirm: async () => {
                              await copySemesterSchedule('1', '2', selectedYear, selectedClassId);
                            }
                          });
                        }
                      }}
                      className="p-1.5 ml-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all shrink-0 h-full flex items-center"
                      title="Copiar horários do 1º para o 2º semestre."
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* Dynamic Helper Text - Now Below */}
                {isEditMode && (
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight mt-1 whitespace-nowrap">
                    {selectedSemesters.length === 1 && selectedSemesters[0] === '1' && "Gravando 1º Sem"}
                    {selectedSemesters.length === 1 && selectedSemesters[0] === '2' && "Gravando 2º Sem"}
                    {selectedSemesters.length === 2 && "Gravando Ano Todo"}
                  </span>
                )}
              </div>

              <div className="h-8 w-px bg-slate-200 hidden md:block shrink-0"></div>

              {/* Day Filter Button */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsDayFilterOpen(!isDayFilterOpen)}
                  className="p-2.5 h-[38px] text-slate-500 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all flex items-center gap-2"
                  title="Filtrar Dias"
                >
                  <Filter className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Dias</span>
                </button>

                {isDayFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsDayFilterOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Exibir Dias
                      </div>
                      {allDays.map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <span>{day}</span>
                          {visibleDays.includes(day) && <Check className="w-4 h-4 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Force Break for Admin Buttons on Mobile */}
              <div className="w-full md:hidden"></div>

              {/* Admin Buttons */}
              {(profile?.tipo === 'Administrador' || profile?.tipo === 'Coordenador') && (
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setIsAvailabilityMode(!isAvailabilityMode);
                      if (isEditMode) setIsEditMode(false);
                    }}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap h-[38px] ${isAvailabilityMode
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-300'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                      }`}
                  >
                    {isAvailabilityMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>Disponibilidade</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsEditMode(!isEditMode);
                      if (isAvailabilityMode) setIsAvailabilityMode(false);
                    }}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap h-[38px] ${isEditMode
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-1 ring-amber-300'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                      }`}
                  >
                    {isEditMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    <span>{isEditMode ? 'Salvar' : 'Editar Grade'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grid Area - Matrix View */}
          <div className={`flex-1 bg-white rounded-xl border shadow-sm outline-none overflow-hidden flex flex-col transition-all duration-300 ${isEditMode ? 'ring-2 ring-amber-100 border-amber-200' : 'border-slate-200'}`}>

            {/* Main Scroll Container - Handles BOTH X and Y scrolling */}
            <div className="w-full h-full overflow-auto custom-scrollbar relative">

              {/* Width Enforcer - Ensures content is wide enough to scroll */}
              <div className="min-w-[1600px] flex flex-col h-full bg-white">

                {/* Table Header - Sticky Top */}
                <div
                  className="grid border-b border-slate-200 bg-slate-50 shrink-0 sticky top-0 z-30"
                  style={{ gridTemplateColumns: `70px repeat(${visibleDays.length}, minmax(0,1fr))` }}
                >
                  <div className="p-3 flex items-center justify-center border-r border-slate-200 bg-slate-50 sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <Clock className="text-slate-400 w-4 h-4" />
                  </div>
                  {visibleDays.map((day) => (
                    <div key={day} className="p-3 text-center border-r border-slate-200 last:border-r-0 bg-slate-50">
                      <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{day}</p>
                    </div>
                  ))}
                </div>

                {/* Grid Body */}
                <div className="grid flex-1" style={{ gridTemplateColumns: `70px repeat(${visibleDays.length}, minmax(0,1fr))` }}>

                  {timeSlots.filter(ts => ts.type === 'class').map(slot => {

                    return (
                      <React.Fragment key={slot.id}>
                        {/* Time Column */}
                        <div className="border-b border-r border-slate-200 p-2 flex flex-col items-center justify-center text-center bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <span className="text-xs font-bold text-slate-700 leading-tight">{slot.label.split('ª')[0]}ª</span>
                          <div className="flex flex-col text-[10px] text-slate-400 font-medium mt-1 leading-none gap-0.5">
                            <span>{slot.start}</span>
                            <span>{slot.end}</span>
                          </div>
                        </div>

                        {/* Days Columns */}
                        {visibleDays.map(day => {
                          const allocation = getAllocation(day, slot.id);
                          const subject = subjects.find(s => s.id === allocation?.subjectId);
                          const teacher = teachers.find(t => t.id === allocation?.teacherId);

                          if (allocation) {
                            return (
                              <div key={`${day}-${slot.id}`} className="border-b border-r border-slate-200 p-1 bg-white relative h-full min-h-[85px]">
                                <div className={`h-full w-full rounded-md border-l-[3px] p-2 flex flex-col gap-0.5 transition-all relative hover:brightness-95 ${allocation.color || 'bg-indigo-50 border-indigo-500'} ${isAvailabilityMode ? 'cursor-pointer hover:ring-2 hover:ring-inset hover:ring-emerald-400' : ''}`}
                                  onClick={(e) => {
                                    if (isAvailabilityMode) {
                                      e.stopPropagation();
                                      handleCellClick(day, slot.id, `${slot.start} - ${slot.end}`);
                                    } else if (isEditMode) {
                                      e.stopPropagation();
                                      handleCellClick(day, slot.id, `${slot.start} - ${slot.end}`);
                                    }
                                  }}
                                >
                                  {isEditMode && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeAllocation(allocation.id);
                                      }}
                                      className="absolute top-1 right-1 p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-colors z-10"
                                      title="Remover Lotação"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                    <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 uppercase">{subject?.name || 'Desconhecido'}</p>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 line-clamp-1 flex items-center gap-1 mb-1">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    {teacher?.alias || teacher?.name || 'Sem Professor'}
                                  </p>
                                  <div className="flex items-center gap-1 mt-auto pt-1 border-t border-slate-100/50">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{allocation.room || 'Sem Sala'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            // Empty Slot
                            return (
                              <div
                                key={`${day}-${slot.id}`}
                                className={`border-b border-r border-slate-200 p-1 bg-white min-h-[85px] ${isEditMode || isAvailabilityMode ? 'cursor-pointer hover:bg-slate-50' : ''} ${isAvailabilityMode ? 'hover:bg-emerald-50' : ''}`}
                                onClick={() => handleCellClick(day, slot.id, `${slot.start} - ${slot.end}`)}
                              >
                                {isEditMode && (
                                  <div className="h-full w-full rounded-md border border-dashed border-slate-200 flex items-center justify-center group">
                                    <Plus className="text-slate-200 group-hover:text-indigo-400 transition-colors w-5 h-5" />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div >

      <AllocationModal
        isOpen={!!modalState}
        onClose={() => setModalState(null)}
        onSave={handleSaveAllocation}
        day={modalState?.day || ''}
        timeLabel={modalState?.timeLabel || ''}
        initialData={modalState?.initialData}
      />

      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        onCancel={confirmModalState.onCancel}
        title={confirmModalState.title}
        message={confirmModalState.message}
        type={confirmModalState.type}
        confirmLabel={confirmModalState.confirmLabel}
        cancelLabel={confirmModalState.cancelLabel}

      />
      <AvailabilityModal
        isOpen={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        day={availabilityData?.day || ''}
        timeLabel={availabilityData?.timeLabel || ''}
        freeTeachers={availabilityData?.freeTeachers || []}
        busyTeachers={availabilityData?.busyTeachers || []}
        complementaryTeachers={availabilityData?.complementaryTeachers || []}
      />
    </div >
  );
};