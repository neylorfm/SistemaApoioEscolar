import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import {
  Resource,
  TimeSlot,
  SchoolClass,
  SchoolSubject,
  Teacher,
  TeacherAllocation,
  ComplementaryAllocation,
  CalendarEvent,
  CalendarEventType,
  ResourceType,
  AcademicTerm,
  AcademicYearConfig,
  PortalLink,
  Student
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useImageUpload } from '../hooks/useImageUpload';
import { toast } from 'sonner';

export interface SemanticColors {
  regular: string;
  blockedProject: string;
  specialEvent: string;
  maintenance: string;
  loginButtonBg?: string; // Custom login button background
  loginButtonText?: string; // Custom login button text
}

interface ResourceContextData {
  institutionName: string;
  setInstitutionName: (name: string) => void;
  logoUrl: string | null;
  handleUploadLogo: (file: File) => Promise<string>;
  resources: Resource[];
  addResource: (resource: Resource) => void;
  removeResource: (id: string) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;

  // Resource Types
  resourceTypes: ResourceType[];
  addResourceType: (label: string) => string; // Returns the new value/slug

  timeSlots: TimeSlot[];
  updateTimeSlot: (id: string, field: keyof TimeSlot, value: string) => void;
  selectedResourceId: string;
  setSelectedResourceId: (id: string) => void;
  hasNightShift: boolean;
  setHasNightShift: (value: boolean) => void;
  lunchColor: string; // Agora é uma string Hex
  setLunchColor: (color: string) => void;
  semanticColors: SemanticColors;
  setSemanticColors: (colors: SemanticColors) => void;
  availableWeeks: number;
  setAvailableWeeks: (weeks: number) => void;

  // Matriz Data
  classes: SchoolClass[];
  addClass: (series: string, name: string) => void;
  removeClass: (id: string) => void;
  subjects: SchoolSubject[];
  addSubject: (name: string) => void;
  removeSubject: (id: string) => void;

  // Teacher & Allocation Data
  teachers: Teacher[];
  allocations: TeacherAllocation[];
  addAllocation: (allocation: Omit<TeacherAllocation, 'id'>) => Promise<void>;
  removeAllocation: (id: string) => Promise<void>;
  copySemesterSchedule: (sourceSem: string, targetSem: string, year: string, classId: string) => Promise<void>;

  // Complementary Allocations
  complementaryAllocations: ComplementaryAllocation[];
  addComplementaryAllocation: (allocation: Omit<ComplementaryAllocation, 'id'>) => Promise<void>;
  removeComplementaryAllocation: (id: string) => Promise<void>;

  // Calendar Events
  calendarEvents: CalendarEvent[]; // Combined events
  manualEvents: CalendarEvent[]; // Events from DB only
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  removeCalendarEvent: (id: string) => void;
  updateCalendarEvent: (id: string, event: Partial<Omit<CalendarEvent, 'id'>>) => void;
  clearCalendarEvents: () => void;

  // Academic Terms (Bimestres)
  academicTerms: AcademicTerm[];
  updateAcademicTerm: (id: number, field: 'start' | 'end', value: string) => void;

  // Academic Year Config
  academicYear: AcademicYearConfig;
  updateAcademicYear: (field: keyof AcademicYearConfig, value: string) => void;
  updateFullAcademicConfig: (newYearConfig: AcademicYearConfig, newTerms: AcademicTerm[]) => Promise<void>;

  // Portal Links
  portalLinks: PortalLink[];
  addPortalLink: (link: Omit<PortalLink, 'id'>) => void;
  updatePortalLink: (id: string, link: Omit<PortalLink, 'id'>) => void;
  removePortalLink: (id: string) => void;

  // Link Order Preference
  linkOrder: string[];
  updateLinkOrder: (order: string[]) => void;

  // Student Order Preference
  studentOrder: string[];
  updateStudentOrder: (order: string[]) => void;

  // Students
  students: Student[];
  addStudent: (data: any) => Promise<{ success: boolean; error?: any }>;
  updateStudent: (id: string, data: any) => Promise<{ success: boolean; error?: any }>;
  deleteStudent: (id: string) => Promise<{ success: boolean; error?: any }>;

  // Session Config
  sessionTimeouts: Record<string, number>;
  updateSessionTimeouts: (timeouts: Record<string, number>) => Promise<void>;

  // Security
  refreshStudents: () => Promise<void>;
  refreshAllocations: () => Promise<void>;
  isLoading: boolean;
}

const ResourceContext = createContext<ResourceContextData>({} as ResourceContextData);

export const ResourceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [institutionName, setInstitutionNameState] = useState('O NOME DA ESCOLA AQUI');
  const [hasNightShift, setHasNightShiftState] = useState(true);
  const [lunchColor, setLunchColorState] = useState<string>('#f97316'); // Default Orange Hex
  const [availableWeeks, setAvailableWeeksState] = useState<number>(2);
  const [logoUrl, setLogoUrlState] = useState<string | null>(null);
  const [schoolSettingsId, setSchoolSettingsId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  const { user, profile } = useAuth();
  const [linkOrder, setLinkOrder] = useState<string[]>([]);
  const [studentOrder, setStudentOrder] = useState<string[]>([]);

  // Use the upload hook (ignoring its internal modal state, we just want the function)
  const { uploadImage } = useImageUpload();

  // Fetch Preferences
  useEffect(() => {
    if (!user) {
      setLinkOrder([]);
      setStudentOrder([]);
      return;
    }

    const fetchPrefs = async () => {
      const { data } = await supabase
        .from('PreferenciasUsuario')
        .select('link_order, student_order')
        .eq('user_id', user.id)
        .single();

      if (data) {
        if (Array.isArray(data.link_order)) {
          setLinkOrder(data.link_order.map((id: any) => String(id)));
        }
        if (Array.isArray(data.student_order)) {
          setStudentOrder(data.student_order.map((id: any) => String(id)));
        }
      }
    };

    fetchPrefs();
  }, [user]);

  const updateLinkOrder = async (newOrder: string[]) => {
    setLinkOrder(newOrder);

    if (user) {
      const { error } = await supabase
        .from('PreferenciasUsuario')
        .upsert({
          user_id: user.id,
          link_order: newOrder
        }, { onConflict: 'user_id' });

      if (error) console.error("Error saving link order:", error);
    }
  };

  const updateStudentOrder = async (newOrder: string[]) => {
    setStudentOrder(newOrder);

    if (user) {
      const { error } = await supabase
        .from('PreferenciasUsuario')
        .upsert({
          user_id: user.id,
          student_order: newOrder
        }, { onConflict: 'user_id' });

      if (error) console.error("Error saving student order:", error);
    }
  };

  // Students Data
  const [students, setStudents] = useState<Student[]>([]);

  // Define fetch function outside useEffect to reuse it
  const refreshStudents = async () => {
    if (!user) return; // Guard clause

    // DEBUG: One Join Only (Turma)
    const { data, error } = await supabase
      .from('Alunos')
      .select(`
          id,
          nome,
          matricula,
          status,
          foto_url,
          pcd_dados,
          anexos,
          created_at,
          turma_id,
          pdt_id,
          diagnostico,
          turma:Turmas(series, name),
          pdt:Profissionais(id, nome, foto, alias)
        `)
      .order('nome');

    if (data) {
      const formattedStudents: Student[] = data.map((d: any) => ({
        id: d.id,
        name: d.nome,
        enrollmentId: d.matricula,
        class: d.turma ? `${d.turma.series} - ${d.turma.name}` : 'Sem Turma',
        classId: d.turma_id,
        pdtId: d.pdt_id,
        diagnosis: d.diagnostico,
        status: d.status,
        photoUrl: d.foto_url,
        attachmentsCount: Array.isArray(d.anexos) ? d.anexos.length : 0,
        attachments: Array.isArray(d.anexos) ? d.anexos : [],
        pcdProfile: d.pcd_dados,
        createdAt: d.created_at, // Standard DB timestamp
        createdBy: d.pcd_dados?._metadata?.createdBy, // From JSON metadata
        createdById: d.pcd_dados?._metadata?.createdById,
        updatedBy: d.pcd_dados?._metadata?.updatedBy,
        updatedAt: d.pcd_dados?._metadata?.updatedAt,
        pdt: d.pdt ? {
          id: d.pdt.id,
          name: d.pdt.nome,
          alias: d.pdt.alias,
          role: 'Professor',
          avatar: d.pdt.foto
        } : undefined
      }));
      setStudents(formattedStudents);
    } else if (error) {
      console.error("Error fetching students:", error);
    }
  };

  // Initial Fetch Removed for Lazy Loading
  // useEffect(() => {
  //   fetchStudents();
  // }, [user]);

  const addStudent = async (formData: any) => {
    try {
      // Construct PCD Profile JSON
      const pcdProfile = {
        quickAccess: {
          communicationStyle: formData.communicationStyle,
          avoid: formData.avoid,
          crisisStrategy: formData.crisisStrategy,
          mainAdaptation: formData.mainAdaptation
        },
        medication: {
          info: formData.medicationInfo,
          impact: formData.medicationImpact
        },
        behavior: {
          triggers: formData.triggers,
          regulationStrategy: formData.regulationStrategy
        },
        communication: {
          expression: formData.expression,
          comprehension: formData.comprehension
        },
        potential: {
          interests: formData.interests ? formData.interests.split(',').map((s: string) => s.trim()) : [],
          strengths: formData.strengths,
          rewards: formData.rewards
        },
        learningStyle: {
          format: formData.format,
          time: formData.time,
          environment: formData.environment
        },
        sensory: {
          auditory: formData.auditory,
          visual: formData.visual,
          tactile: formData.tactile
        },
        autonomy: {
          bathroom: formData.bathroom,
          food: formData.food,
          materials: formData.materials
        },
        _metadata: {
          createdBy: profile?.nome || user?.email || 'Sistema',
          createdById: user?.id,
          createdAt: new Date().toISOString()
        }
      };

      // Prepare Payload
      const payload = {
        nome: formData.name,
        matricula: formData.enrollmentId,
        turma_id: formData.classId,
        pdt_id: formData.pdtId || null,
        status: formData.status || 'Aguardando Laudo', // Default fallback
        foto_url: formData.photoUrl,
        diagnostico: formData.diagnosis,
        pcd_dados: pcdProfile,

        anexos: formData.attachments || []
      };

      const { error } = await supabase
        .from('Alunos')
        .insert([payload]);

      if (error) {
        console.error("Error creating student:", error);
        return { success: false, error };
      }

      // Refresh list immediately
      await refreshStudents();

      return { success: true };

    } catch (err) {
      console.error("Unexpected error creating student:", err);
      return { success: false, error: err };
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Alunos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting student:", error);
        return { success: false, error };
      }

      setStudents(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (err) {
      console.error("Unexpected error deleting student:", err);
      return { success: false, error: err };
    }
  };

  const updateStudent = async (id: string, formData: any) => {
    try {
      // 1. Fetch existing data to preserve creation metadata
      const { data: existingData, error: fetchError } = await supabase
        .from('Alunos')
        .select('pcd_dados')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const existingMetadata = existingData?.pcd_dados?._metadata || {};

      // 2. Construct Updated PCD Profile JSON
      const pcdProfile = {
        quickAccess: {
          communicationStyle: formData.communicationStyle,
          avoid: formData.avoid,
          crisisStrategy: formData.crisisStrategy,
          mainAdaptation: formData.mainAdaptation
        },
        medication: {
          info: formData.medicationInfo,
          impact: formData.medicationImpact
        },
        behavior: {
          triggers: formData.triggers,
          regulationStrategy: formData.regulationStrategy
        },
        communication: {
          expression: formData.expression,
          comprehension: formData.comprehension
        },
        potential: {
          interests: formData.interests ? formData.interests.split(',').map((s: string) => s.trim()) : [],
          strengths: formData.strengths,
          rewards: formData.rewards
        },
        learningStyle: {
          format: formData.format,
          time: formData.time,
          environment: formData.environment
        },
        sensory: {
          auditory: formData.auditory,
          visual: formData.visual,
          tactile: formData.tactile
        },
        autonomy: {
          bathroom: formData.bathroom,
          food: formData.food,
          materials: formData.materials
        },
        _metadata: {
          ...existingMetadata, // Preserve createdBy
          updatedBy: profile?.nome || user?.email || 'Sistema',
          updatedById: user?.id,
          updatedAt: new Date().toISOString()
        }
      };

      // 3. Prepare Payload
      const payload = {
        nome: formData.name,
        matricula: formData.enrollmentId,
        turma_id: formData.classId,
        pdt_id: formData.pdtId ? formData.pdtId : null,
        status: formData.status,
        foto_url: formData.photoUrl,
        diagnostico: formData.diagnosis,
        pcd_dados: pcdProfile,
        anexos: formData.attachments || []
      };

      console.log("Updating student with payload:", payload);

      const { error } = await supabase
        .from('Alunos')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error("Error updating student:", error);
        return { success: false, error };
      }

      await refreshStudents();
      return { success: true };

    } catch (err) {
      console.error("Unexpected error updating student:", err);
      return { success: false, error: err };
    }
  };

  // Cores semânticas padrão
  const [semanticColors, setSemanticColorsState] = useState<SemanticColors>({
    regular: '#2563eb',       // blue-600
    blockedProject: '#d97706', // amber-600
    specialEvent: '#9333ea',   // purple-600
    maintenance: '#dc2626'     // red-600
  });

  // Helper to fetch public config from new table or JSON as fallback
  const fetchPublicConfig = async () => {
    try {
      // 1. Try New Public Table (ConfiguracaoLogin)
      const { data: configData, error: configError } = await supabase
        .from('ConfiguracaoLogin')
        .select('titulo, logo_url, cores')
        .single();

      if (configData) {
        if (configData.titulo) setInstitutionNameState(configData.titulo);
        if (configData.logo_url) setLogoUrlState(configData.logo_url);
        if (configData.cores) setSemanticColorsState(configData.cores);
        return;
      }

      // 2. Fallback: Public JSON (Legacy/Offline support or if table empty)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl('school_config.json');
      const response = await fetch(`${publicUrl}?t=${Date.now()}`); // Cache bust
      if (response.ok) {
        const json = await response.json();
        if (json) {
          setInstitutionNameState(json.name);
          setLogoUrlState(json.logoUrl);
          if (json.semanticColors) setSemanticColorsState(json.semanticColors);
        }
      }
    } catch (err) {
      console.error('Error fetching public config:', err);
    }


  };

  const fetchSettings = async () => {
    // 0. Always start by fetching public config to ensure login page is fast
    // (Even if logged in, this doesn't hurt, and ensures we have branding)
    await fetchPublicConfig();

    // 1. If User is logged in, fetch full settings from DB
    if (user) {
      const { data, error } = await supabase
        .from('Escola')
        .select('*')
        .single();

      if (data) {
        setSchoolSettingsId(data.id);
        setInstitutionNameState(data.name);
        setHasNightShiftState(data.hasNightShift);
        setLunchColorState(data.lunchColor);
        setAvailableWeeksState(data.availableWeeks);
        setSemanticColorsState(data.semanticColors);
        setLogoUrlState(data.logo_url || data.logoUrl); // Handle both casings

        // Parse Academic Config
        if (data.academic_config) {
          if (data.academic_config.yearConfig) setAcademicYear(data.academic_config.yearConfig);
          if (data.academic_config.terms) setAcademicTerms(data.academic_config.terms);
        }

        // Session Timeouts
        if (data.session_timeouts) {
          setSessionTimeouts(data.session_timeouts);
        }


      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching school settings from DB:', error);
      }
    }
  };

  // Master Data Fetch
  useEffect(() => {
    const loadAllData = async () => {
      // Always fetch public config first (branding)
      await fetchPublicConfig();

      if (user) {
        setIsLoading(true);
        try {
          // Parallelize independent fetches
          await Promise.all([
            fetchSettings(), // Gets full school settings
            fetchResources(),
            fetchMatrixData(),
            fetchTeachers(),
            fetchTimeSlots(),
            fetchLinks(),
            fetchEvents(),
            refreshAllocations(),
            refreshStudents()
          ]);
        } catch (error) {
          console.error("Error loading initial data:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  // Update helper with Public Table sync
  const updateSchoolSetting = async (field: string, value: any) => {
    if (!schoolSettingsId) return;

    // 1. Update Main Table (Escola)
    const { error } = await supabase
      .from('Escola')
      .update({ [field]: value })
      .eq('id', schoolSettingsId);

    if (error) console.error(`Error updating ${field}: `, error);

    // 2. Sync to Public Table (ConfiguracaoLogin)
    // Map fields from internal name to public table name
    const updatePayload: any = {};
    if (field === 'name') updatePayload.titulo = value;
    if (field === 'logoUrl') updatePayload.logo_url = value;
    if (field === 'semanticColors') updatePayload.cores = value;

    if (Object.keys(updatePayload).length > 0) {
      const { error: syncError } = await supabase
        .from('ConfiguracaoLogin')
        .update(updatePayload)
        .eq('escola_id', schoolSettingsId);

      if (syncError) {
        // If update fails (e.g. no row exists yet), try upsert or insert?
        // Optimistically, the migration script created the row.
        console.error("Error syncing to ConfiguracaoLogin:", syncError);
      }
    }

    // 3. Update Public JSON (Legacy Fallback)
    const newState = {
      name: field === 'name' ? value : institutionName,
      logoUrl: field === 'logoUrl' ? value : logoUrl,
      semanticColors: field === 'semanticColors' ? value : semanticColors
    };
    try {
      const blob = new Blob([JSON.stringify(newState)], { type: 'application/json' });
      await supabase.storage
        .from('avatars')
        .upload('school_config.json', blob, { upsert: true, contentType: 'application/json' });
    } catch (e) {
      console.error("Failed to update public config json", e);
    }
  };

  const setInstitutionName = (name: string) => {
    setInstitutionNameState(name);
    updateSchoolSetting('name', name);
  };

  const setHasNightShift = (value: boolean) => {
    setHasNightShiftState(value);
    updateSchoolSetting('hasNightShift', value);
  };

  const setLunchColor = (color: string) => {
    setLunchColorState(color);
    updateSchoolSetting('lunchColor', color);
  };

  const setAvailableWeeks = (weeks: number) => {
    setAvailableWeeksState(weeks);
    updateSchoolSetting('availableWeeks', weeks);
  };

  // Session Timeouts
  const [sessionTimeouts, setSessionTimeouts] = useState<Record<string, number>>({
    Administrador: 20,
    Coordenador: 45,
    Professor: 60,
    Colaborador: 15
  });

  const updateSessionTimeouts = async (timeouts: Record<string, number>) => {
    setSessionTimeouts(timeouts);
    updateSchoolSetting('session_timeouts', timeouts);
  };




  const setSemanticColors = (colors: SemanticColors) => {
    setSemanticColorsState(colors);
    updateSchoolSetting('semanticColors', colors);
  };

  const handleUploadLogo = async (file: File) => {
    try {
      // Use the centralized hook for validation and upload
      const publicUrl = await uploadImage(file, { source: 'logo' });

      if (!publicUrl) throw new Error("Upload falhou ou foi cancelado.");

      // Update State and DB
      setLogoUrlState(publicUrl);
      await updateSchoolSetting('logoUrl', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  // Resource Types Logic
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([
    { label: 'Laboratório', value: 'lab' },
    { label: 'Projetor/Equipamento', value: 'projector' },
    { label: 'Sala de Vídeo/Aula', value: 'room' },
    { label: 'Auditório', value: 'auditorium' },
    { label: 'Carrinho Móvel', value: 'tablet' }
  ]);

  const addResourceType = (label: string) => {
    // Create a simple slug from label
    const value = label.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "_"); // replace non-alphanum with underscore

    // Check if exists
    if (!resourceTypes.find(t => t.value === value)) {
      setResourceTypes([...resourceTypes, { label, value }]);
    }
    return value;
  };

  const [resources, setResources] = useState<Resource[]>([]);

  // Fetch Resources from Supabase
  // Fetch Resources from Supabase
  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('Recursos')
      .select('*')
      .order('name');

    if (data) {
      setResources(data);
      // Auto-select first resource if none selected
      if (!selectedResourceId && data.length > 0) {
        setSelectedResourceId(data[0].id);
      }
    } else if (error) {
      console.error('Error fetching resources:', error);
    }
  };

  // Effect removed, called in master load

  const addResource = async (resource: Resource) => {
    // Optimistic update or wait for DB? Let's wait for DB to get real ID.
    const { data, error } = await supabase
      .from('Recursos')
      .insert([{
        name: resource.name,
        details: resource.details,
        type: resource.type,
        iconBg: resource.iconBg,
        iconColor: resource.iconColor
      }])
      .select()
      .single();

    if (data) {
      setResources(prev => [...prev, data]);
    } else if (error) {
      console.error('Error adding resource:', error);
    }
  };

  const removeResource = async (id: string) => {
    const { error } = await supabase
      .from('Recursos')
      .delete()
      .eq('id', id);

    if (!error) {
      setResources(prev => prev.filter(r => r.id !== id));
    } else {
      console.error('Error removing resource:', error);
    }
  };

  const updateResource = async (id: string, updates: Partial<Resource>) => {
    const { error } = await supabase
      .from('Recursos')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setResources(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } else {
      console.error('Error updating resource:', error);
    }
  };

  // Dados (Matriz) - Turmas
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Dados (Matriz) - Disciplinas
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);

  // Fetch Classes and Subjects
  const fetchMatrixData = async () => {
    // Fetch Classes
    const { data: classesData, error: classesError } = await supabase
      .from('Turmas')
      .select('*')
      .order('name');

    if (classesData) setClasses(classesData);
    else if (classesError) console.error('Error fetching classes:', classesError);

    // Fetch Subjects
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('Disciplinas')
      .select('*')
      .order('name');

    if (subjectsData) setSubjects(subjectsData);
    else if (subjectsError) console.error('Error fetching subjects:', subjectsError);
  };

  const addClass = async (series: string, name: string) => {
    const { data, error } = await supabase
      .from('Turmas')
      .insert([{ series, name }])
      .select()
      .single();

    if (data) {
      setClasses(prev => [...prev, data]);
    } else if (error) {
      console.error('Error adding class:', error);
    }
  };



  const removeClass = async (id: string) => {
    const { error } = await supabase
      .from('Turmas')
      .delete()
      .eq('id', id);

    if (!error) {
      setClasses(prev => prev.filter(c => c.id !== id));
    } else {
      console.error('Error removing class:', error);
    }
  };



  const addSubject = async (name: string) => {
    const { data, error } = await supabase
      .from('Disciplinas')
      .insert([{ name }])
      .select()
      .single();

    if (data) {
      setSubjects(prev => [...prev, data]);
    } else if (error) {
      console.error('Error adding subject:', error);
    }
  };

  const removeSubject = async (id: string) => {
    const { error } = await supabase
      .from('Disciplinas')
      .delete()
      .eq('id', id);

    if (!error) {
      setSubjects(prev => prev.filter(s => s.id !== id));
    } else {
      console.error('Error removing subject:', error);
    }
  };

  // Teachers
  // Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Fetch Teachers
  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('Profissionais')
      .select('id, nome, alias, foto')
      .eq('tipo', 'Professor')
      .order('nome');

    if (data) {
      setTeachers(data.map((t: any) => ({
        id: t.id,
        name: t.nome,
        alias: t.alias,
        avatar: t.foto
      })));
    } else if (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  // Allocations (Lotações)
  const [allocations, setAllocations] = useState<TeacherAllocation[]>([]);
  const [complementaryAllocations, setComplementaryAllocations] = useState<ComplementaryAllocation[]>([]);

  // Fetch Allocations
  const refreshAllocations = async () => {
    // Ensure we have a year to filter by
    const currentYear = academicYear.year || new Date().getFullYear().toString();

    // 1. Fetch Class Allocations
    const { data: classData, error: classError } = await supabase
      .from('HorarioTurmas')
      .select('*')
      .eq('ano_letivo', currentYear);

    if (classData) {
      setAllocations(classData.map((a: any) => ({
        id: a.id,
        teacherId: a.professor_id,
        subjectId: a.disciplina_id,
        classId: a.turma_id,
        timeSlotId: a.horario_id,
        dayOfWeek: a.dia_semana,
        year: a.ano_letivo,
        semester: a.semestre,
        room: a.sala,
        color: 'bg-primary-50 border-primary-500' // Default color
      })));
    } else if (classError) {
      console.error('Error fetching allocations:', classError);
    }

    // 2. Fetch Complementary Allocations
    const { data: compData, error: compError } = await supabase
      .from('HorarioComplementar')
      .select('*')
      .eq('ano_letivo', currentYear);

    if (compData) {
      setComplementaryAllocations(compData.map((c: any) => ({
        id: c.id,
        teacherId: c.professor_id,
        year: c.ano_letivo,
        semester: c.semestre,
        dayOfWeek: c.dia_semana,
        timeSlotId: c.horario_id,
        activity: c.atividade
      })));
    } else if (compError) {
      console.error('Error fetching complementary allocations:', compError);
    }
  };

  // Initial Fetch Removed for Lazy Loading
  // useEffect(() => {
  //   fetchAllocations();
  // }, []);

  const addAllocation = async (allocation: Omit<TeacherAllocation, 'id'>) => {
    // Determine color based on subject or random? Keeping local state simple.

    // Map to DB
    const payload = {
      turma_id: allocation.classId,
      professor_id: allocation.teacherId || null,
      disciplina_id: allocation.subjectId,
      horario_id: allocation.timeSlotId,
      dia_semana: allocation.dayOfWeek,
      ano_letivo: allocation.year,
      semestre: allocation.semester,
      sala: allocation.room
    };

    // Upsert based on Unique Key (turma, horario, dia, ano, semestre)
    const { data, error } = await supabase
      .from('HorarioTurmas')
      .upsert(payload, { onConflict: 'turma_id, horario_id, dia_semana, ano_letivo, semestre' })
      .select()
      .single();

    if (data) {
      // Refresh or optimistic update
      // setAllocations(prev => [...prev.filter(a => a.id !== data.id), { ...allocation, id: data.id }]); 
      // Upsert might replace, so filter out potential collision first.
      await refreshAllocations();
    } else if (error) {
      console.error('Error adding allocation:', error);
    }
  };

  const removeAllocation = async (id: string) => {
    const { error } = await supabase
      .from('HorarioTurmas')
      .delete()
      .eq('id', id);

    if (!error) {
      setAllocations(prev => prev.filter(a => a.id !== id));
    } else {
      console.error('Error removing allocation:', error);
    }
  };

  const addComplementaryAllocation = async (allocation: Omit<ComplementaryAllocation, 'id'>) => {
    const { data, error } = await supabase
      .from('HorarioComplementar')
      .insert({
        professor_id: allocation.teacherId,
        dia_semana: allocation.dayOfWeek,
        horario_id: allocation.timeSlotId,
        atividade: allocation.activity,
        ano_letivo: allocation.year,
        semestre: allocation.semester
      })
      .select()
      .single();

    if (data) {
      setComplementaryAllocations(prev => [...prev, {
        id: data.id,
        teacherId: data.professor_id,
        year: data.ano_letivo,
        semester: data.semestre,
        dayOfWeek: data.dia_semana,
        timeSlotId: data.horario_id,
        activity: data.atividade
      }]);
    } else {
      console.error("Error adding complementary allocation:", error);
    }
  };

  const removeComplementaryAllocation = async (id: string) => {
    const { error } = await supabase
      .from('HorarioComplementar')
      .delete()
      .eq('id', id);

    if (!error) {
      setComplementaryAllocations(prev => prev.filter(c => c.id !== id));
    } else {
      console.error("Error removing complementary allocation:", error);
    }
  };

  const copySemesterSchedule = async (sourceSem: string, targetSem: string, year: string, classId: string) => {
    console.log(`[CopySchedule] Starting copy from ${sourceSem} to ${targetSem} for class ${classId} year ${year}`);

    // 1. Fetch source allocations
    const { data: sourceData, error: fetchError } = await supabase
      .from('HorarioTurmas')
      .select('*')
      .eq('ano_letivo', year)
      .eq('semestre', sourceSem)
      .eq('turma_id', classId);

    if (fetchError) {
      console.error("[CopySchedule] Error fetching source:", fetchError);
      return;
    }

    if (!sourceData || sourceData.length === 0) {
      console.warn("[CopySchedule] No source data found to copy.");
      return;
    }

    console.log(`[CopySchedule] Found ${sourceData.length} records to copy.`);

    // 2. Prepare target payloads
    const targetPayloads = sourceData.map(item => ({
      turma_id: item.turma_id,
      professor_id: item.professor_id,
      disciplina_id: item.disciplina_id,
      horario_id: item.horario_id,
      dia_semana: item.dia_semana,
      ano_letivo: item.ano_letivo, // Same year
      semestre: targetSem,         // Target semester
      sala: item.sala
    }));

    // 3. DELETE existing target allocations (Clean Copy)
    const { error: deleteError } = await supabase
      .from('HorarioTurmas')
      .delete()
      .eq('ano_letivo', year)
      .eq('semestre', targetSem)
      .eq('turma_id', classId);

    if (deleteError) {
      console.error("[CopySchedule] Error clearing target semester:", deleteError);
      return; // Abort if clear failed
    }

    console.log("[CopySchedule] Target semester cleared.");

    // 4. Insert new records
    // Since we cleared, we can just insert.
    const { error: insertError, data: insertData } = await supabase
      .from('HorarioTurmas')
      .insert(targetPayloads)
      .select();

    if (insertError) {
      console.error("[CopySchedule] Error inserting new records:", insertError);
    } else {
      console.log(`[CopySchedule] Successfully inserted ${insertData?.length} records.`);
      await refreshAllocations();
      console.log("[CopySchedule] Allocations refreshed.");
    }
  };

  const [selectedResourceId, setSelectedResourceId] = useState<string>('');

  // TimeSlots (Schedule/Horários)
  const [rawTimeSlots, setRawTimeSlots] = useState<TimeSlot[]>([]);

  // Derived TimeSlots based on Night Shift setting
  const timeSlots = React.useMemo(() => {
    if (hasNightShift) return rawTimeSlots;
    return rawTimeSlots.filter(slot => {
      // Filter out night slots (start time >= 18:00)
      // or checking if it's the specific night slots (usually 10th-13th class)
      // Let's rely on 'isNight' property if reliable, or parsing start time
      if (slot.type === 'class') {
        const hour = parseInt(slot.start.split(':')[0]);
        return hour < 18;
      }
      // Keep breaks/intervals unless they are specifically night intervals?
      // Usually intervals for night shift are late. Let's filter by time for all types.
      const hour = parseInt(slot.start.split(':')[0]);
      return hour < 18;
    });
  }, [rawTimeSlots, hasNightShift]);

  // Fetch TimeSlots
  const fetchTimeSlots = async () => {
    const { data, error } = await supabase
      .from('Horarios')
      .select('*')
      .order('position');

    if (data) {
      // Map DB columns to TimeSlot interface
      const formattedSlots: TimeSlot[] = data.map(slot => ({
        id: slot.id,
        label: slot.label,
        start: slot.start_time,
        end: slot.end_time,
        type: slot.type as any,
        isNight: parseInt(slot.start_time.split(':')[0]) >= 18
      }));
      setRawTimeSlots(formattedSlots);
    } else if (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const updateTimeSlot = async (id: string, field: keyof TimeSlot, value: string) => {
    // Map internal fields to DB columns
    const dbFieldMap: Record<string, string> = {
      start: 'start_time',
      end: 'end_time',
      label: 'label',
      type: 'type'
    };

    const dbField = dbFieldMap[field] || field;

    const { error } = await supabase
      .from('Horarios')
      .update({ [dbField]: value })
      .eq('id', id);

    if (!error) {
      setRawTimeSlots(prev => prev.map(slot =>
        slot.id === id ? { ...slot, [field]: value } : slot
      ));
    } else {
      console.error('Error updating time slot:', error);
    }
  };



  // Calendar Events Logic
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);

  // Computed events (System + Manual)


  // Fetch Calendar Events (Manual Only)
  // Fetch Calendar Events (Manual Only)
  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('CalendarioLetivo')
      .select('*')
      // Filter out system events if any remain in DB, or just treat all DB events as manual extras
      .not('type', 'in', '("ano_inicio","ano_fim","proximo_ano","recuperacao_final_inicio","recuperacao_final_fim","inicio_bimestre","fim_bimestre")');

    if (data) {
      setManualEvents(data);
    } else if (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  // Effect removed, called in master load

  const addCalendarEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    const { data, error } = await supabase
      .from('CalendarioLetivo')
      .insert([event])
      .select()
      .single();

    if (data) {
      setManualEvents(prev => [...prev, data]);
    } else if (error) {
      console.error('Error adding calendar event:', error);
    }
  };

  const removeCalendarEvent = async (id: string) => {
    const { error } = await supabase
      .from('CalendarioLetivo')
      .delete()
      .eq('id', id);

    if (!error) {
      setManualEvents(prev => prev.filter(e => e.id !== id));
    } else {
      console.error('Error removing calendar event:', error);
    }
  };

  const updateCalendarEvent = async (id: string, event: Partial<Omit<CalendarEvent, 'id'>>) => {
    const { error } = await supabase
      .from('CalendarioLetivo')
      .update(event)
      .eq('id', id);

    if (!error) {
      setManualEvents(prev => prev.map(e => e.id === id ? { ...e, ...event } : e));
    } else {
      console.error('Error updating calendar event:', error);
    }
  };

  const clearCalendarEvents = async () => {
    const { error } = await supabase
      .from('CalendarioLetivo')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (!error) {
      setManualEvents([]);
    } else {
      console.error('Error clearing calendar events:', error);
    }
  };

  // Academic Terms & Year Config
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([
    { id: 1, label: '1º Bimestre', start: `${new Date().getFullYear()}-02-10`, end: `${new Date().getFullYear()}-04-15`, color: 'bg-blue-50/50 border-blue-100' },
    { id: 2, label: '2º Bimestre', start: `${new Date().getFullYear()}-04-16`, end: `${new Date().getFullYear()}-06-30`, color: 'bg-green-50/50 border-green-100' },
    { id: 3, label: '3º Bimestre', start: `${new Date().getFullYear()}-08-01`, end: `${new Date().getFullYear()}-09-30`, color: 'bg-orange-50/50 border-orange-100' },
    { id: 4, label: '4º Bimestre', start: `${new Date().getFullYear()}-10-01`, end: `${new Date().getFullYear()}-12-15`, color: 'bg-purple-50/50 border-purple-100' },
  ]);

  const [academicYear, setAcademicYear] = useState<AcademicYearConfig>({
    year: new Date().getFullYear().toString(),
    startDate: `${new Date().getFullYear()}-02-01`,
    endDate: `${new Date().getFullYear()}-12-20`,
    nextYearStartDate: `${new Date().getFullYear() + 1}-02-01`,
    recoveryStartDate: `${new Date().getFullYear()}-12-21`,
    recoveryEndDate: `${new Date().getFullYear()}-12-30`,
  });

  // Computed events (System + Manual)
  const calendarEvents = React.useMemo(() => {
    const systemEvents: CalendarEvent[] = [];

    // Helper to add system event
    const addSysEvent = (date: string, title: string, type: CalendarEventType, idSuffix: string) => {
      if (date) {
        systemEvents.push({
          id: `sys-${idSuffix}`,
          title,
          date,
          type,
          description: 'Configuração do Ano Letivo'
        });
      }
    };

    // 1. Year Config
    addSysEvent(academicYear.startDate, 'Início Ano Letivo', 'ano_inicio', 'start');
    addSysEvent(academicYear.endDate, 'Fim Ano Letivo', 'ano_fim', 'end');
    addSysEvent(academicYear.nextYearStartDate, 'Início Próximo Ano', 'proximo_ano', 'next-start');
    addSysEvent(academicYear.recoveryStartDate, 'Início Recuperação Final', 'recuperacao_final_inicio', 'rec-start');
    addSysEvent(academicYear.recoveryEndDate, 'Fim Recuperação Final', 'recuperacao_final_fim', 'rec-end');

    // 2. Terms
    academicTerms.forEach(term => {
      addSysEvent(term.start, `Início ${term.label}`, 'inicio_bimestre', `term-${term.id}-start`);
      addSysEvent(term.end, `Fim ${term.label}`, 'fim_bimestre', `term-${term.id}-end`);
    });

    return [...systemEvents, ...manualEvents];
  }, [academicYear, academicTerms, manualEvents]);




  // Save full config to Escola
  const saveAcademicConfig = async (newYearConfig: AcademicYearConfig, newTerms: AcademicTerm[]) => {
    if (!schoolSettingsId) return;

    const config = {
      yearConfig: newYearConfig,
      terms: newTerms
    };

    const { error } = await supabase
      .from('Escola')
      .update({ academic_config: config })
      .eq('id', schoolSettingsId);

    if (error) console.error("Error saving academic config:", error);
  };

  const updateAcademicYear = async (field: keyof AcademicYearConfig, value: string) => {
    setAcademicYear(prev => {
      const updated = { ...prev, [field]: value };
      saveAcademicConfig(updated, academicTerms);
      return updated;
    });
  };

  const updateAcademicTerm = async (id: number, field: 'start' | 'end', value: string) => {
    setAcademicTerms(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, [field]: value } : t);
      saveAcademicConfig(academicYear, updated);
      return updated;
    });
  };

  const updateFullAcademicConfig = async (newYearConfig: AcademicYearConfig, newTerms: AcademicTerm[]) => {
    setAcademicYear(newYearConfig);
    setAcademicTerms(newTerms);
    await saveAcademicConfig(newYearConfig, newTerms);
  };

  // Portal Links Logic
  const [portalLinks, setPortalLinks] = useState<PortalLink[]>([]);

  // Fetch Links
  // Fetch Links
  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('Links')
      .select('*');

    if (data) {
      setPortalLinks(data);
    } else if (error) {
      console.error('Error fetching links:', error);
    }
  };

  // Effect removed, called in master load

  const addPortalLink = async (link: Omit<PortalLink, 'id'>) => {
    const { data, error } = await supabase
      .from('Links')
      .insert([link])
      .select()
      .single();

    if (data) {
      setPortalLinks(prev => [...prev, data]);
    } else if (error) {
      console.error('Error adding link:', error);
    }
  };

  const updatePortalLink = async (id: string, link: Omit<PortalLink, 'id'>) => {
    const { error } = await supabase
      .from('Links')
      .update(link)
      .eq('id', id);

    if (!error) {
      setPortalLinks(prev => prev.map(l => l.id === id ? { ...link, id } : l));
    } else {
      console.error('Error updating link:', error);
    }
  };


  const removePortalLink = async (id: string) => {
    const { error } = await supabase
      .from('Links')
      .delete()
      .eq('id', id);

    if (!error) {
      setPortalLinks(portalLinks.filter(l => l.id !== id));
    } else {
      console.error('Error removing link:', error);
    }
  };

  // Realtime Subscriptions
  useEffect(() => {
    const channel = supabase.channel('resource_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Links' },
        (payload) => {
          console.log('[Realtime] Links changed:', payload);
          fetchLinks();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Alunos' },
        (payload) => {
          console.log('[Realtime] Alunos changed:', payload);
          refreshStudents();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'CalendarioLetivo' },
        (payload) => {
          console.log('[Realtime] CalendarioLetivo changed:', payload);
          fetchEvents();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Recursos' },
        (payload) => {
          console.log('[Realtime] Recursos changed:', payload);
          fetchResources();
        }
      )
      .subscribe();

    // Dedicated channel for Allocations to avoid conflicts and debug better
    const allocationsChannel = supabase.channel('allocations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'HorarioTurmas' },
        (payload) => {
          console.log('[Realtime] HorarioTurmas changed:', payload);
          refreshAllocations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'HorarioComplementar' },
        (payload) => {
          console.log('[Realtime] HorarioComplementar changed:', payload);
          refreshAllocations();
        }
      )
      .subscribe();

    // Dedicated Channel for Escola Settings (Critical for Session/Security)
    const escolaChannel = supabase.channel('escola_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Escola' },
        (payload) => {
          console.log('[Realtime] Escola settings changed (Isolated):', payload);
          fetchSettings();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("Connected to Escola Realtime");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(allocationsChannel);
      supabase.removeChannel(escolaChannel);
    };
  }, [user]);

  return (
    <ResourceContext.Provider value={{
      institutionName,
      setInstitutionName,
      logoUrl,
      handleUploadLogo,
      resources,
      addResource,
      removeResource,
      updateResource,
      resourceTypes,
      addResourceType,
      timeSlots,
      updateTimeSlot,
      selectedResourceId,
      setSelectedResourceId,
      hasNightShift,
      setHasNightShift,
      lunchColor,
      setLunchColor,
      semanticColors,
      setSemanticColors,
      availableWeeks,
      setAvailableWeeks,
      classes,
      addClass,
      removeClass,
      subjects,
      addSubject,
      removeSubject,
      teachers,
      allocations,
      addAllocation,
      removeAllocation,
      copySemesterSchedule,
      complementaryAllocations,
      addComplementaryAllocation,
      removeComplementaryAllocation,
      calendarEvents,
      addCalendarEvent,
      removeCalendarEvent,
      updateCalendarEvent,
      clearCalendarEvents,
      academicTerms,
      updateAcademicTerm,
      academicYear,
      updateAcademicYear,
      updateFullAcademicConfig,
      portalLinks,
      addPortalLink,
      updatePortalLink,
      removePortalLink,
      linkOrder,
      updateLinkOrder,
      studentOrder,
      updateStudentOrder,
      students,
      addStudent,
      updateStudent,
      deleteStudent,
      sessionTimeouts,
      updateSessionTimeouts,
      refreshStudents,
      refreshAllocations,
      isLoading
    }}>
      {children}
    </ResourceContext.Provider >
  );
};


export const useResource = () => useContext(ResourceContext);