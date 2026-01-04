
export interface PcdProfile {
  diagnosis: string;
  quickAccess: {
    communicationStyle: string;
    avoid: string;
    crisisStrategy: string;
    mainAdaptation: string;
  };
  medication: {
    info: string;
    impact: string;
  };
  behavior: {
    triggers: string;
    regulationStrategy: string;
  };
  communication: {
    expression: string;
    comprehension: string;
  };
  potential: {
    interests: string[];
    strengths: string;
    rewards: string;
  };
  learningStyle: {
    format: string;
    time: string;
    environment: string;
  };
  sensory: {
    auditory: string;
    visual: string;
    tactile: string;
  };
  autonomy: {
    bathroom: string;
    food: string;
    materials: string;
  };
}

export interface Student {
  id: string;
  name: string;
  class: string;
  enrollmentId: string;
  status: 'Laudo Atualizado' | 'Pendente Revisão' | 'Acompanhamento' | 'Aguardando Laudo';
  photoUrl: string;
  attachmentsCount: number;
  attachments?: FileAttachment[]; // Real attachments
  pcdProfile?: PcdProfile;
  pdt?: { // Professor Docente Tutor / Responsável
    id: string;
    name: string;
    role: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  classId?: string; // For editing
  pdtId?: string; // For editing
  diagnosis?: string; // For editing
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string; // Name
  createdById?: string; // User ID
  updatedBy?: string; // Name
}

export interface TeacherScheduleItem {
  id: string;
  subject: string;
  className: string;
  room: string;
  day: string; // 'Monday', 'Tuesday', etc.
  timeSlot: number; // 1 to 6
  type: 'regular' | 'geometry' | 'physics' | 'extra';
}

export interface ResourceType {
  label: string;
  value: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  details: string;
  icon?: any; // Using any to simplify passing Lucide components in this demo context
  iconBg: string;
  iconColor: string;
  active?: boolean;
}

export interface TimeSlot {
  id: string;
  label: string;
  start: string;
  end: string;
  type: 'class' | 'break' | 'lunch';
  isNight?: boolean;
}

export interface FileAttachment {
  name: string;
  date: string;
  size: string;
  type: 'pdf' | 'doc';
  url?: string;
}

export interface SchoolClass {
  id: string;
  series: string; // Ex: "1º Ano", "2º Ano", "3º Série"
  name: string;   // Ex: "A", "B", "Enfermagem", "Administração"
}

export interface SchoolSubject {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
  alias?: string;
  avatar?: string;
}

export interface TeacherAllocation {
  id: string; // from HorarioTurmas.id
  teacherId: string; // professor_id
  subjectId: string; // disciplina_id
  classId: string; // turma_id
  timeSlotId: string; // horario_id
  dayOfWeek: string; // dia_semana
  year: string; // ano_letivo
  semester: string; // semestre
  room?: string; // sala
  color?: string; // Visualization helper
}

export interface ComplementaryAllocation {
  id: string;
  teacherId: string;
  year: string;
  semester: string;
  dayOfWeek: string;
  timeSlotId: string; // 'horario_id' in DB
  activity: string;   // 'atividade' in DB
}

export type CalendarEventType =
  | 'outros'
  | 'prova_parcial'
  | 'prova_bimestral'
  | 'feriado'
  | 'sabado_letivo'
  | 'evento'
  | 'limite_prova'
  | 'fim_bimestre'
  | 'inicio_bimestre'
  | 'limite_media'
  | 'jornada'
  | 'gincana'
  | 'recuperacao'
  | 'recuperacao_final'
  | 'culminancia'
  | 'culminancia'
  | 'conselho'
  | 'ano_inicio'
  | 'ano_fim'
  | 'proximo_ano'
  | 'recuperacao_final_inicio'
  | 'recuperacao_final_fim';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: CalendarEventType;
  description?: string;
}

export interface AcademicTerm {
  id: number;
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  color: string; // Tailwind class mostly
}

export interface AcademicYearConfig {
  year: string;
  startDate: string;
  endDate: string;
  nextYearStartDate: string;
  recoveryStartDate: string;
  recoveryEndDate: string;
}

export interface PortalLink {
  id: string;
  title: string;
  description: string;
  category: 'drive' | 'system' | 'pdf' | 'video' | 'calendar' | 'folder' | 'upload';
  url: string;
}

export interface Agendamento {
  id: string;
  recurso_id: string;
  horario_id: string;
  turma_id: string;
  profissional_id: string;
  disciplina_id: string;
  data: string;
  descricao?: string;
  created_at: string;
  turma?: { series: string; name: string };
  disciplina?: { name: string };
  profissional?: { nome: string; alias: string };
}