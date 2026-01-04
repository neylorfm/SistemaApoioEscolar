import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Calendar,
  LogOut,
  PlusCircle,
  Trash2,
  Video,
  Film,
  Tablet,
  Plus,
  Settings,
  Save,
  User,
  Clock,
  Sun,
  Moon,
  Coffee,
  Utensils,
  LayoutTemplate,
  Edit2,
  Eye,
  EyeOff,
  Mail,
  Shield,
  Image as ImageIcon,
  Palette,
  Check,
  RefreshCw,
  Droplet,
  BookOpen,
  GraduationCap,
  Library,
  CalendarRange,
  Box,
  School,
  ChevronDown,
  Loader2,
  Search,
  Filter,
  X,
  Upload,
  Tag,
  UserPlus,
  Lock,
  Key
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useResource } from '../contexts/ResourceContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ModalType } from '../components/Modal';
import { useImageUpload } from '../hooks/useImageUpload';
import { UserSignupModal } from '../components/UserSignupModal';
import { TimeSlot } from '../types';


interface ResourceItemProps {
  id: string;
  name: string;
  details: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  active?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

interface Profissional {
  id: string;
  nome: string;
  email: string;
  foto: string | null;
  tipo: 'Administrador' | 'Coordenador' | 'Professor' | 'Colaborador';
}

const ResourceItem: React.FC<ResourceItemProps> = ({ id, name, details, icon, iconBg, iconColor, active = true, onDelete, onEdit, onToggleActive }) => (
  <div className={`bg-white rounded-lg border p-4 flex items-center justify-between group transition-colors shadow-sm ${active ? 'border-slate-200 hover:border-primary-300' : 'border-slate-100 bg-slate-50 opacity-75'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${active ? `${iconBg} ${iconColor}` : 'bg-slate-200 text-slate-400'}`}>
        {icon}
      </div>
      <div>
        <h4 className={`text-sm font-bold ${active ? 'text-slate-800' : 'text-slate-500'}`}>
          {name}
          {!active && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Desativado</span>}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">{details}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onToggleActive(id, active)}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${active ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
        title={active ? "Desativar" : "Ativar"}
      >
        {active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
      </button>
      <button
        onClick={() => onEdit(id)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
        title="Editar"
      >
        <Edit2 className="w-5 h-5" />
      </button>
      <button
        onClick={() => onDelete(id)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Excluir"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  </div>
);

const TimeSlotInput: React.FC<{
  slot: TimeSlot;
}> = ({ slot }) => {
  const { updateTimeSlot } = useResource();
  const isBreak = slot.type === 'break';
  const isLunch = slot.type === 'lunch';

  let icon = <Clock className="w-4 h-4 text-slate-400" />;
  let bgColor = "bg-white";
  let borderColor = "border-slate-200";

  if (isBreak) {
    icon = <Coffee className="w-4 h-4 text-amber-500" />;
    bgColor = "bg-amber-50";
    borderColor = "border-amber-200";
  } else if (isLunch) {
    icon = <Utensils className="w-4 h-4 text-orange-500" />;
    bgColor = "bg-orange-50";
    borderColor = "border-orange-200";
  }

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border ${borderColor} ${bgColor} transition-colors h-full`}>
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-44 shrink-0">
        {icon}
        <span className={`text-sm font-medium truncate ${isBreak || isLunch ? 'text-slate-700' : 'text-slate-900'}`}>
          {slot.label}
        </span>
      </div>
      <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0">
        <input
          type="time"
          value={slot.start}
          onChange={(e) => updateTimeSlot(slot.id, 'start', e.target.value)}
          className="block rounded-md border-slate-300 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm h-9 px-1 text-center flex-1 w-full min-w-0"
        />
        <span className="text-slate-400 text-xs shrink-0">até</span>
        <input
          type="time"
          value={slot.end}
          onChange={(e) => updateTimeSlot(slot.id, 'end', e.target.value)}
          className="block rounded-md border-slate-300 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm h-9 px-1 text-center flex-1 w-full min-w-0"
        />
      </div>

    </div>
  );
};

// Componente para preview e edição de cores
const EditableColorCard: React.FC<{
  label: string;
  previewTitle: string;
  previewSubtitle: string;
  color: string;
  onChange: (newColor: string) => void;
}> = ({ label, previewTitle, previewSubtitle, color, onChange }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2 relative group">
        <div className="h-6 w-6 rounded border border-slate-200 overflow-hidden cursor-pointer relative">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="w-full h-full" style={{ backgroundColor: color }}></div>
        </div>
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-xs font-mono text-slate-500 border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-primary-500 outline-none uppercase"
        />
      </div>
    </div>
    {/* Preview Card simulated using opacity for bg and solid color for border/text */}
    <div
      className="rounded-r border-l-4 p-3 shadow-sm transition-colors"
      style={{
        backgroundColor: `${color}15`, // 15 hex = ~8% opacity
        borderColor: color,
      }}
    >
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase mb-1" style={{ color: color }}>{previewTitle}</span>
        <span className="text-xs opacity-80 leading-tight" style={{ color: color }}>{previewSubtitle}</span>
      </div>
    </div>
  </div>
);

// Componente de Item da Matriz (Turma ou Disciplina)
const MatrixItem: React.FC<{
  name: string;
  onDelete: () => void;
  icon: React.ReactNode;
}> = ({ name, onDelete, icon }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors group">
    <div className="flex items-center gap-3">
      <div className="text-slate-400 group-hover:text-primary-600 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-700">{name}</span>
    </div>
    <button
      onClick={onDelete}
      className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

export const ResourceAdmin: React.FC = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recursos');

  React.useEffect(() => {
    if (!loading && profile?.tipo !== 'Administrador') {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  const [users, setUsers] = useState<Profissional[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profissional | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profissional | null>(null);

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const showModal = (type: ModalType, title: string, message: string) => {
    setModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Upload Hook (Independent)
  const { uploadImage, isUploading, modal: uploadModal, closeModal: closeUploadModal } = useImageUpload();


  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsSavingUser(true);

    // Format Alias: Capitalize first letter of each word
    const formattedAlias = selectedUser.alias
      ? selectedUser.alias.toLowerCase().replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase())
      : null;

    const { error } = await supabase
      .from('Profissionais')
      .update({
        nome: selectedUser.nome,
        tipo: selectedUser.tipo,
        foto: selectedUser.foto,
        alias: formattedAlias
      })
      .eq('id', selectedUser.id);

    if (error) {
      if (error.code === '23505') { // Unique violation
        showModal('error', 'Apelido Indisponível', `O apelido "${selectedUser.alias}" já está em uso. Tente outro, por exemplo ${selectedUser.alias}1.`);
      } else {
        showModal('error', 'Erro ao Salvar', 'Ocorreu um erro ao salvar as alterações.');
      }
    } else {
      await fetchUsers();
      setSelectedUser(null);
    }
    setIsSavingUser(false);
    setIsSavingUser(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Use RPC to delete from Auth.Users (which cascades to Profissionais)
    const { error } = await supabase.rpc('delete_user_by_admin', { user_id: userToDelete.id });

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir usuário: ' + error.message);
    } else {
      toast.success('Usuário removido com sucesso.');
      fetchUsers();
      closeModal();
    }
  };

  const confirmDeleteUser = (user: Profissional) => {
    setUserToDelete(user);
    setModal({
      isOpen: true,
      type: 'warning',
      title: 'Excluir Usuário?',
      message: `Tem certeza que deseja remover o acesso de "${user.nome}"? Esta ação não pode ser desfeita.`
    });
  };


  // Removed local compressImage and compressLogo in favor of shared utils


  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedUser) return;
    const file = e.target.files[0];

    const publicUrl = await uploadImage(
      file,
      { source: 'user', identifier: selectedUser.id }
    );

    if (publicUrl) {
      // Update Local State for Preview
      setSelectedUser({ ...selectedUser, foto: publicUrl });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fetch Users & Realtime Subscription
  React.useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    if (activeTab === 'usuario') {
      fetchUsers();

      channel = supabase.channel('users_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Profissionais' },
          (payload) => {
            console.log('[Realtime] Users changed:', payload);
            fetchUsers();
            toast.info('Lista de usuários atualizada');
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    const { data } = await supabase
      .from('Profissionais')
      .select('*')
      .order('nome');

    if (data) setUsers(data as any);
    setIsLoadingUsers(false);
  };


  const {
    institutionName,
    setInstitutionName,
    resources,
    addResource,
    removeResource,
    timeSlots,
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
    resourceTypes,
    addResourceType,
    updateResource,
    logoUrl,
    handleUploadLogo,
    updateLinkOrder,
    studentOrder,
    updateStudentOrder,
    sessionTimeouts,
    updateSessionTimeouts,

  } = useResource();

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Use Context function which handles upload AND DB update
    try {
      await handleUploadLogo(file);
      showModal('success', 'Upload Concluído', 'O logotipo foi atualizado com sucesso.');
      // Optional: reload if needed, but context update should trigger re-render
    } catch (error) {
      showModal('error', 'Erro no Upload', 'Falha ao atualizar o logotipo.');
    }

    // Reset input
    if (e.target) e.target.value = '';
  };

  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState('');
  const [newResourceDetails, setNewResourceDetails] = useState('');

  // Custom Type State
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');

  // States for Matrix inputs
  const [newClassSeries, setNewClassSeries] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  // Password Reset State
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
    newPassword: '';
    confirmPassword: '';
    isLoading: boolean;
  }>({
    isOpen: false,
    userId: null,
    userName: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false
  });

  const handleOpenPasswordReset = (e: React.MouseEvent, user: Profissional) => {
    e.stopPropagation(); // Prevent card click
    setPasswordResetModal({
      isOpen: true,
      userId: user.id,
      userName: user.nome,
      newPassword: '',
      confirmPassword: '',
      isLoading: false
    });
  };

  const handlePasswordReset = async () => {
    const { userId, newPassword, confirmPassword } = passwordResetModal;

    if (!userId || !newPassword || !confirmPassword) {
      toast.error('Preencha os campos de senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setPasswordResetModal(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('admin-update-password', {
        body: { userId, newPassword },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (error) throw error;

      toast.success('Senha atualizada com sucesso!');
      setPasswordResetModal(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao atualizar senha.');
    } finally {
      setPasswordResetModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // State for Custom Dropdown
  const [isSeriesOpen, setIsSeriesOpen] = useState(false);
  const seriesOptions = ['1º ANO', '2º ANO', '3º ANO'];

  const tabs = [
    { id: 'recursos', label: 'Recursos' },
    { id: 'usuario', label: 'Usuário' },
    { id: 'layout', label: 'Escola' },
    { id: 'seguranca', label: 'Sessão' },
  ];

  const handleAddResource = () => {
    // If adding a custom type, validation checks customTypeName instead of newResourceType
    if (!newResourceName || (!newResourceType && !customTypeName)) return;

    let finalType = newResourceType;
    let finalLabel = '';

    // If it's a new custom type, register it first
    if (isCustomType && customTypeName) {
      finalType = addResourceType(customTypeName);
      finalLabel = customTypeName;
      setCustomTypeName('');
      setIsCustomType(false);
    } else {
      const typeObj = resourceTypes.find(t => t.value === newResourceType);
      finalLabel = typeObj ? typeObj.label : 'Geral';
    }

    let iconBg = 'bg-slate-50';
    let iconColor = 'text-slate-600';

    // Simple logic for default colors based on known types, fallback for custom
    if (finalType === 'lab') {
      iconBg = 'bg-blue-50';
      iconColor = 'text-primary-600';
    } else if (finalType === 'projector') {
      iconBg = 'bg-purple-50';
      iconColor = 'text-purple-600';
    } else if (finalType === 'room') {
      iconBg = 'bg-amber-50';
      iconColor = 'text-amber-600';
    } else if (finalType === 'auditorium') {
      iconBg = 'bg-red-50';
      iconColor = 'text-red-600';
    } else if (finalType === 'tablet') {
      iconBg = 'bg-emerald-50';
      iconColor = 'text-emerald-600';
    } else {
      // Default for custom types
      iconBg = 'bg-slate-100';
      iconColor = 'text-slate-600';
    }

    addResource({
      id: Math.random().toString(36).substr(2, 9),
      name: newResourceName,
      type: finalType,
      details: newResourceDetails || `Tipo: ${finalLabel}`,
      iconBg,
      iconColor
    });

    setNewResourceName('');
    setNewResourceType('');
    setNewResourceDetails('');
  };

  const handleAddClass = () => {
    if (!newClassSeries.trim() || !newClassName.trim()) return;
    addClass(newClassSeries, newClassName);
    setNewClassSeries('');
    setNewClassName('');
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    addSubject(newSubjectName);
    setNewSubjectName('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lab': return <Monitor className="w-6 h-6" />;
      case 'projector': return <Video className="w-6 h-6" />;
      case 'room': return <Film className="w-6 h-6" />;
      case 'tablet': return <Tablet className="w-6 h-6" />;
      default: return <Box className="w-6 h-6" />; // Default icon for new custom types
    }
  };

  // Edit Resource State
  const [editingResource, setEditingResource] = useState<{ id: string, name: string, details: string } | null>(null);
  const [editDetails, setEditDetails] = useState('');

  const handleEditResource = (id: string) => {
    const resource = resources.find(r => r.id === id);
    if (resource) {
      setEditingResource({ id: resource.id, name: resource.name, details: resource.details });
      setEditDetails(resource.details);
    }
  };

  const saveResourceEdit = () => {
    if (editingResource) {
      updateResource(editingResource.id, { details: editDetails });
      setEditingResource(null);
      setEditDetails('');
      toast.success('Recurso atualizado com sucesso!');
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateResource(id, { active: !currentStatus });
    toast.success(currentStatus ? 'Recurso desativado' : 'Recurso ativado');
  };

  const visibleTimeSlots = hasNightShift
    ? timeSlots
    : timeSlots.filter(slot => !['l2', 't10', 't11', 'b3', 't12', 't13'].includes(slot.id));

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header
          title="Configurações"
          subtitle="Gerenciamento do Sistema"
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

        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden max-w-6xl mx-auto w-full">
          <div className="flex items-center border-b border-slate-200 mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none whitespace-nowrap ${activeTab === tab.id
                  ? 'text-primary-600 border-primary-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">

            {activeTab === 'recursos' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PlusCircle className="text-primary-600 w-5 h-5" />
                    Adicionar Novo Recurso
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Recurso</label>
                      <input
                        className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2.5 px-3 shadow-sm placeholder:text-slate-400 border"
                        placeholder="Ex: Laboratório de Informática 2"
                        type="text"
                        value={newResourceName}
                        onChange={(e) => setNewResourceName(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                      <select
                        className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2.5 px-3 shadow-sm cursor-pointer border"
                        value={isCustomType ? 'custom' : newResourceType}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setIsCustomType(true);
                            setNewResourceType('');
                          } else {
                            setIsCustomType(false);
                            setNewResourceType(val);
                          }
                        }}
                      >
                        <option value="">Selecione um tipo...</option>
                        {resourceTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                        <option value="custom" className="font-bold text-primary-600">+ Adicionar Novo Tipo</option>
                      </select>
                    </div>

                    {isCustomType && (
                      <div className="md:col-span-12 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1.5">Nome do Novo Tipo</label>
                        <input
                          className="w-full rounded-lg border-primary-200 bg-primary-50 text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2.5 px-3 shadow-sm placeholder:text-primary-300 border"
                          placeholder="Ex: Impressora 3D, Drone, Sala de Jogos..."
                          type="text"
                          value={customTypeName}
                          onChange={(e) => setCustomTypeName(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}

                    <div className="md:col-span-9">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Detalhes / Especificações</label>
                      <input
                        className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2.5 px-3 shadow-sm placeholder:text-slate-400 border"
                        placeholder="Ex: Bloco C • Capacidade: 30 alunos • Marca: Sony"
                        type="text"
                        value={newResourceDetails}
                        onChange={(e) => setNewResourceDetails(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-3 flex items-end">
                      <button
                        onClick={handleAddResource}
                        className="w-full bg-primary-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 h-[42px]"
                      >
                        <Plus className="w-5 h-5" />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Recursos Cadastrados</h3>

                  {resources.map(res => (
                    <ResourceItem
                      key={res.id}
                      id={res.id}
                      name={res.name}
                      details={res.details}
                      icon={getIcon(res.type)}
                      iconBg={res.iconBg}
                      iconColor={res.iconColor}
                      active={res.active}
                      onDelete={removeResource}
                      onEdit={handleEditResource}
                      onToggleActive={handleToggleActive}
                    />
                  ))}

                  {resources.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhum recurso cadastrado.</div>
                  )}

                  {/* Edit Resource Modal */}
                  {editingResource && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Editar Recurso: {editingResource.name}</h3>

                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Detalhes / Especificações
                          </label>
                          <input
                            type="text"
                            value={editDetails}
                            onChange={(e) => setEditDetails(e.target.value)}
                            className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2.5 px-3 shadow-sm border"
                            placeholder="Ex: Bloco C • Capacidade: 30 alunos"
                            autoFocus
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingResource(null)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={saveResourceEdit}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm shadow-primary-500/20 transition-colors"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

            {activeTab === 'usuario' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-5xl mx-auto min-h-[500px]">
                {/* Header Section */}
                {!selectedUser ? (
                  <>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 leading-none">Gerenciar Usuários</h2>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            {users.length} usuários
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button
                          onClick={() => setIsSignupModalOpen(true)}
                          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-sm shadow-primary-500/20 transition-all flex items-center gap-2"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Novo Usuário
                        </button>
                        <div className="relative group w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                          <input
                            type="text"
                            placeholder="Buscar por nome ou e-mail..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                          />
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="relative w-full sm:w-48">
                          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm appearance-none cursor-pointer hover:bg-slate-100"
                          >
                            <option value="Todos">Todos os Cargos</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Coordenador">Coordenador</option>
                            <option value="Professor">Professor</option>
                            <option value="Colaborador">Colaborador</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* List View */}
                    {isLoadingUsers ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
                        <p className="text-sm">Carregando usuários...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-500">
                        {users.filter(user => {
                          const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesType = typeFilter === 'Todos' || user.tipo === typeFilter;
                          return matchesSearch && matchesType;
                        }).map(user => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-primary-300 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 backdrop-blur-sm rounded-bl-xl border-l border-b border-slate-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteUser(user);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              {/* Password Reset Button (Admin Only) */}
                              {(profile?.tipo === 'Administrador') && (
                                <button
                                  onClick={(e) => handleOpenPasswordReset(e, user)}
                                  className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Alterar Senha"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col items-center text-center gap-3">
                              <div
                                className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-md bg-cover bg-center flex items-center justify-center text-slate-300 mb-2"
                                style={user.foto ? { backgroundImage: `url('${user.foto}')` } : {}}
                              >
                                {!user.foto && <User className="w-10 h-10" />}
                              </div>

                              <div>
                                <h3 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{user.nome}</h3>
                                <p className="text-xs text-slate-500 mb-3">{user.email}</p>
                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.tipo === 'Administrador' ? 'bg-purple-100 text-purple-700' :
                                  user.tipo === 'Coordenador' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                  {user.tipo}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {users.filter(user => {
                          const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesType = typeFilter === 'Todos' || user.tipo === typeFilter;
                          return matchesSearch && matchesType;
                        }).length === 0 && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                              <Search className="w-8 h-8 mb-2 opacity-50" />
                              <p className="text-sm font-medium">Nenhum usuário encontrado</p>
                              <p className="text-xs opacity-70 mt-1">Tente ajustar seus filtros de busca</p>
                            </div>
                          )}
                      </div>
                    )}
                  </>
                ) : (
                  // Edit View
                  <div className="max-w-2xl mx-auto animate-in slide-in-from-right-8 duration-300">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <User className="text-primary-600 w-5 h-5" />
                        Editar Perfil de Usuário
                      </h2>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-medium hover:underline"
                      >
                        Voltar para Lista
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex flex-col items-center gap-4">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/jpeg,image/png,image/svg+xml,image/jpg"
                          onChange={handlePhotoSelect}
                        />
                        <div
                          className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-xl bg-cover bg-center flex items-center justify-center text-slate-300 relative overflow-hidden group/photo cursor-pointer"
                          style={selectedUser.foto ? { backgroundImage: `url('${selectedUser.foto}')` } : {}}
                          onClick={() => !isUploading && fileInputRef.current?.click()}
                        >
                          {!selectedUser.foto && <User className="w-16 h-16" />}

                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                              <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                          )}

                          {!isUploading && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <button
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full transition-colors hover:bg-primary-100 disabled:opacity-50"
                        >
                          {isUploading ? 'Enviando...' : 'Alterar Foto'}
                        </button>
                        <p className="text-[10px] text-slate-400 max-w-[150px] text-center">
                          Máx. 200KB. Formatos: JPG, PNG, SVG
                        </p>
                      </div>

                      <div className="flex-1 space-y-5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <User className="w-3 h-3" /> Nome Completo
                          </label>
                          <input
                            type="text"
                            value={selectedUser.nome}
                            onChange={e => setSelectedUser({ ...selectedUser, nome: e.target.value })}
                            className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 text-sm py-2.5 px-3 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> E-mail
                          </label>
                          <input
                            type="email"
                            value={selectedUser.email}
                            disabled
                            className="w-full rounded-lg border-slate-200 bg-slate-100 text-slate-500 text-sm py-2.5 px-3 border cursor-not-allowed opacity-70"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Apelido (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Prof. Silva"
                            value={selectedUser.alias || ''}
                            onChange={e => setSelectedUser({ ...selectedUser, alias: e.target.value })}
                            className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 text-sm py-2.5 px-3 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all font-medium"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Usado para exibição abreviada. Deve ser único no sistema.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Cargo
                          </label>
                          <div className="relative">
                            <select
                              value={selectedUser.tipo}
                              onChange={e => setSelectedUser({ ...selectedUser, tipo: e.target.value as any })}
                              className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm py-2.5 px-3 border cursor-pointer shadow-sm appearance-none"
                            >
                              <option value="Administrador">Administrador</option>
                              <option value="Coordenador">Coordenador</option>
                              <option value="Professor">Professor</option>
                              <option value="Colaborador">Colaborador</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            * Administradores têm acesso total ao sistema.
                          </p>
                        </div>

                        <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
                          <button
                            onClick={() => setSelectedUser(null)}
                            className="px-5 h-11 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleUpdateUser}
                            disabled={isSavingUser}
                            className="px-6 h-11 rounded-xl bg-primary-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {isSavingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <School className="text-primary-600 w-5 h-5" />
                      Configurações da Escola
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie identidade, horários de funcionamento e padrões visuais.</p>
                  </div>

                </div>

                <div className="space-y-12">

                  {/* Seção 1: Identidade Visual Básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                      <h3 className="text-sm font-bold text-slate-800 border-l-4 border-primary-600 pl-3">Identidade Institucional</h3>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome da Instituição</label>
                        <input
                          type="text"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 text-sm py-2.5 px-3 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600"
                        />
                      </div>

                      <div className="flex gap-6">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Palette className="w-3 h-3" /> Cor Primária
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={semanticColors.regular}
                              onChange={(e) => setSemanticColors({ ...semanticColors, regular: e.target.value })}
                              className="h-10 w-full rounded border border-slate-200 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Usada em botões e cabeçalhos (Blue-600)</p>
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Droplet className="w-3 h-3" /> Cor Secundária
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={semanticColors.specialEvent}
                              onChange={(e) => setSemanticColors({ ...semanticColors, specialEvent: e.target.value })}
                              className="h-10 w-full rounded border border-slate-200 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Usada na área de Inclusão (Indigo-600)</p>
                        </div>
                      </div>

                      <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            Cor do Botão (Login)
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={semanticColors.loginButtonBg || semanticColors.regular}
                              onChange={(e) => setSemanticColors({ ...semanticColors, loginButtonBg: e.target.value })}
                              className="h-10 w-full rounded border border-slate-200 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Fundo do botão entrar</p>
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            Texto do Botão (Login)
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={semanticColors.loginButtonText || '#ffffff'}
                              onChange={(e) => setSemanticColors({ ...semanticColors, loginButtonText: e.target.value })}
                              className="h-10 w-full rounded border border-slate-200 cursor-pointer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Cor do texto "Entrar"</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-300 pl-3">Ativos da Marca</h3>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Logo da Instituição
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onLogoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-slate-200 rounded-xl h-[140px] flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group bg-slate-50/50">
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain" />
                          ) : (
                            <>
                              <div className="w-12 h-12 bg-white text-primary-600 rounded-lg shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <LayoutTemplate className="w-6 h-6" />
                              </div>
                              <p className="text-xs font-medium text-slate-700">Clique para carregar</p>
                              <p className="text-[10px] text-slate-400">PNG/SVG (Max 2MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Seção 2: Grade Horária & Turnos */}
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-800 pl-3">Grade Horária & Turnos</h3>
                        <p className="text-xs text-slate-500 mt-1 pl-4">Defina os horários de início e fim das aulas.</p>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center w-full sm:w-auto">
                        <button
                          onClick={() => setHasNightShift(false)}
                          className={`w-full sm:w-auto px-3 py-1.5 rounded-md text-sm font-medium transition-all flex justify-center sm:justify-start items-center gap-2 ${!hasNightShift ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Sun className="w-4 h-4" />
                          Manhã/Tarde
                        </button>
                        <button
                          onClick={() => setHasNightShift(true)}
                          className={`w-full sm:w-auto px-3 py-1.5 rounded-md text-sm font-medium transition-all flex justify-center sm:justify-start items-center gap-2 ${hasNightShift ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Moon className="w-4 h-4" />
                          Manhã/Tarde/Noite
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-primary-600" />
                        Janela de Agendamento Disponível
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map((weeks) => (
                          <button
                            key={weeks}
                            onClick={() => setAvailableWeeks(weeks)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${availableWeeks === weeks
                              ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                          >
                            {weeks} {weeks === 1 ? 'Semana' : 'Semanas'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Define quantas semanas futuras estarão visíveis e disponíveis para agendamento pelos usuários.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-2">
                      {visibleTimeSlots.map((slot) => (
                        <TimeSlotInput key={slot.id} slot={slot} />
                      ))}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Seção Nova: Matriz Curricular (Movida) */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-800 pl-3">Matriz Curricular & Enturmação</h3>
                      <p className="text-xs text-slate-500 mt-1 pl-4">Gerencie as turmas ativas e as disciplinas oferecidas na instituição.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Turmas Content */}
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col h-full">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-200">
                          <GraduationCap className="text-primary-600 w-4 h-4" />
                          Turmas
                        </h3>

                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                          <div className="relative w-full sm:w-[35%]">
                            <button
                              onClick={() => setIsSeriesOpen(!isSeriesOpen)}
                              className={`w-full flex items-center justify-between rounded-lg border bg-white text-sm py-2 px-3 shadow-sm transition-all ${isSeriesOpen
                                ? 'border-primary-600 ring-2 ring-primary-600/20'
                                : 'border-slate-300 hover:border-slate-400 text-slate-700'
                                }`}
                            >
                              <span className={newClassSeries ? 'text-slate-800' : 'text-slate-400'}>
                                {newClassSeries || 'Série...'}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSeriesOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSeriesOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSeriesOpen(false)} />
                                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                                  {seriesOptions.map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        setNewClassSeries(opt);
                                        setIsSeriesOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${newClassSeries === opt
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                      {opt}
                                      {newClassSeries === opt && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <input
                            type="text"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="ID/Curso (Ex: A, Enfermagem)"
                            className="flex-1 rounded-lg border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2 px-3 shadow-sm border"
                          />
                          <button
                            onClick={handleAddClass}
                            className="bg-primary-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-sm transition-colors shrink-0 flex items-center gap-2 uppercase font-bold text-xs"
                            title="Adicionar Turma"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Inserir Turma</span>
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar space-y-2">
                          {classes.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                              Nenhuma turma cadastrada.
                            </div>
                          ) : (
                            classes.map((cls) => (
                              <MatrixItem
                                key={cls.id}
                                name={`${cls.series} ${cls.name}`}
                                icon={<GraduationCap className="w-4 h-4" />}
                                onDelete={() => removeClass(cls.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Disciplinas Content */}
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col h-full">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-200">
                          <BookOpen className="text-primary-600 w-4 h-4" />
                          Disciplinas
                        </h3>

                        <div className="flex gap-2 mb-4 items-center">
                          <input
                            type="text"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            placeholder="Ex: Matemática"
                            className="w-[85%] rounded-lg border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm py-2 px-3 shadow-sm border"
                          />
                          <button
                            onClick={handleAddSubject}
                            className="bg-primary-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-colors"
                            title="Adicionar Disciplina"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar space-y-2">
                          {subjects.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                              Nenhuma disciplina cadastrada.
                            </div>
                          ) : (
                            subjects.map((subj) => (
                              <MatrixItem
                                key={subj.id}
                                name={subj.name}
                                icon={<BookOpen className="w-4 h-4" />}
                                onDelete={() => removeSubject(subj.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Seção 3: Paleta Semântica */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-800 pl-3">Design System & Cores</h3>
                      <p className="text-xs text-slate-400 hidden sm:block">Visualização ao vivo dos cards na grade</p>
                    </div>

                    {/* Configurador de Cor de Almoço */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors"
                          style={{ backgroundColor: `${lunchColor}20`, borderColor: lunchColor, color: lunchColor }}
                        >
                          <Utensils className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Intervalos de Longa Duração (Almoço/Jantar)</h4>
                          <p className="text-xs text-slate-500">Defina a cor de destaque para as linhas de Almoço e Jantar na grade.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative h-9 w-32">
                          <input
                            type="text"
                            value={lunchColor}
                            onChange={(e) => setLunchColor(e.target.value)}
                            className="w-full h-full pl-9 pr-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                          />
                          <div className="absolute left-1 top-1 bottom-1 w-7 rounded bg-slate-100 border border-slate-200 overflow-hidden">
                            <input
                              type="color"
                              value={lunchColor}
                              onChange={(e) => setLunchColor(e.target.value)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full h-full" style={{ backgroundColor: lunchColor }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                      {/* Agendado */}
                      <EditableColorCard
                        label="Agendado (Regular)"
                        previewTitle="Prof. Carlos"
                        previewSubtitle="Matemática - 9A"
                        color={semanticColors.regular}
                        onChange={(val) => setSemanticColors({ ...semanticColors, regular: val })}
                      />

                      {/* Bloqueado (Projetos) */}
                      <EditableColorCard
                        label="Bloqueio (Projetos)"
                        previewTitle="Bloqueado"
                        previewSubtitle="Projeto C-JOVEM"
                        color={semanticColors.blockedProject}
                        onChange={(val) => setSemanticColors({ ...semanticColors, blockedProject: val })}
                      />

                      {/* Bloqueado (Evento) */}
                      <EditableColorCard
                        label="Eventos Especiais"
                        previewTitle="Bloqueado"
                        previewSubtitle="Cultura Digital"
                        color={semanticColors.specialEvent}
                        onChange={(val) => setSemanticColors({ ...semanticColors, specialEvent: val })}
                      />

                      {/* Manutenção */}
                      <EditableColorCard
                        label="Manutenção / Crítico"
                        previewTitle="Em Manutenção"
                        previewSubtitle="Troca de Lâmpada"
                        color={semanticColors.maintenance}
                        onChange={(val) => setSemanticColors({ ...semanticColors, maintenance: val })}
                      />

                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                      <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Monitor className="w-3 h-3" /> Configuração Avançada de Superfície
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fundo da Página</label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full border border-slate-300 bg-[#f8fafc]"></div>
                            <span className="text-xs text-slate-600 font-medium">Slate-50 (#f8fafc)</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Superfície de Cards</label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm"></div>
                            <span className="text-xs text-slate-600 font-medium">White (#ffffff)</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tipografia</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 font-sans font-medium bg-white px-2 py-1 rounded border border-slate-200">Inter / Sans-serif</span>
                          </div>
                        </div>
                      </div>
                    </div>


                    <hr className="border-slate-100" />

                  </div>

                </div>

              </div>
            )}

            {activeTab === 'seguranca' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Shield className="text-primary-600 w-5 h-5" />
                      Sessão
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Gerencie configurações de acesso, timeouts para economizar mensagens.</p>
                  </div>
                </div>

                <div className="space-y-6">


                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-primary-700 bg-primary-50 px-3 py-2 rounded-lg">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Tempo Limite de Inatividade (Minutos)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {['Administrador', 'Coordenador', 'Professor', 'Colaborador'].map((role) => (
                        <div key={role} className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">{role}</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              defaultValue={sessionTimeouts[role] || 0}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateSessionTimeouts({
                                  ...sessionTimeouts,
                                  [role]: val
                                });
                                toast.success(`Tempo de sessão para ${role} atualizado.`);
                              }}
                              className="w-full pl-3 pr-12 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                              min
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {(sessionTimeouts[role] || 0) === 0 ? 'Desativado (Sessão Infinita)' : `Desloga após ${sessionTimeouts[role]}min ocioso`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main >
      </div >
      {/* Page Modal */}
      < Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.type === 'warning' ? handleDeleteUser : undefined}
        showCancel={modal.type === 'warning'}
        confirmText={modal.type === 'warning' ? 'Sim, Excluir' : 'OK'}
      />

      <UserSignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onSuccess={() => {
          fetchUsers();
          setIsSignupModalOpen(false);
        }}
      />

      {/* Upload Hook Independent Modal */}
      < Modal
        isOpen={uploadModal.isOpen}
        onClose={closeUploadModal}
        type={uploadModal.type}
        title={uploadModal.title}
        message={uploadModal.message}
        onConfirm={uploadModal.onConfirm}
      />
      {/* Password Reset Modal */}
      <Modal
        isOpen={passwordResetModal.isOpen}
        onClose={() => setPasswordResetModal(prev => ({ ...prev, isOpen: false }))}
        title="Alterar Senha de Acesso"
        type="default"
      >
        <div className="p-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Atenção</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Você está alterando a senha do usuário <strong>{passwordResetModal.userName}</strong>.
                Esta ação invalidará o acesso atual imediatamente.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Nova Senha
            </label>
            <input
              type="password"
              value={passwordResetModal.newPassword}
              onChange={(e) => setPasswordResetModal(prev => ({ ...prev, newPassword: e.target.value as any }))}
              placeholder="Digite a nova senha"
              className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 text-sm py-2 px-3 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={passwordResetModal.confirmPassword}
              onChange={(e) => setPasswordResetModal(prev => ({ ...prev, confirmPassword: e.target.value as any }))}
              placeholder="Confirme a nova senha"
              className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-800 text-sm py-2 px-3 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPasswordResetModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handlePasswordReset}
              disabled={passwordResetModal.isLoading || !passwordResetModal.newPassword || !passwordResetModal.confirmPassword}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordResetModal.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Nova Senha
            </button>
          </div>
        </div>
      </Modal>
    </div >
  );
};