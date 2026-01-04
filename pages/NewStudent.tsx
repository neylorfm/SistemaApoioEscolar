import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  User,
  Upload,
  Link as LinkIcon,
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  Save,
  Zap,
  Activity,
  AlertTriangle,
  MessageCircle,
  Star,
  BookOpen,
  Ear,
  Accessibility,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { useResource } from '../contexts/ResourceContext';
import { FileAttachment } from '../types';
import { supabase } from '../lib/supabase'; // Import Supabase
import { Loader2 } from 'lucide-react'; // Import Loader2
import { Modal } from '../components/Modal';
import { useImageUpload } from '../hooks/useImageUpload';

// Helper component for form sections
const FormSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  colorClass?: string;
  bgClass?: string;
}> = ({ title, icon, children, colorClass = "text-slate-900", bgClass = "bg-white" }) => (
  <div className={`rounded-xl shadow-sm border border-slate-200 mb-6 ${bgClass}`}>
    <div className="px-6 py-4 border-b border-slate-100/80 flex items-center gap-2 bg-slate-50/50 rounded-t-xl">
      <div className={`${colorClass}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const NewStudent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { classes, teachers, addStudent, updateStudent, students } = useResource();
  const { profile } = useAuth();
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const isEditing = !!id;

  // File Upload Hook
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading, modal: uploadModal, closeModal: closeUploadModal } = useImageUpload();



  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showModal = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, onConfirm?: () => void) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  // Complex state to hold all profile data
  const [formData, setFormData] = useState({
    // Identity
    name: '',
    enrollmentId: '',
    classId: '',
    pdtId: '',
    status: 'Aguardando Laudo',
    photoUrl: '',

    // PCD Profile
    diagnosis: '',

    // Quick Access
    communicationStyle: '',
    avoid: '',
    crisisStrategy: '',
    mainAdaptation: '',

    // Health & Behavior
    medicationInfo: '',
    medicationImpact: '',
    triggers: '',
    regulationStrategy: '',

    // Skills
    expression: '',
    comprehension: '',
    interests: '', // comma separated
    strengths: '',
    rewards: '',

    // Learning
    format: '',
    time: '',
    environment: '',

    // Sensory
    auditory: '',
    visual: '',
    tactile: '',

    // Autonomy
    bathroom: '',
    food: '',
    materials: '',


    // Attachments
    attachments: [] as FileAttachment[]
  });

  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  // Removed local compressImage in favor of shared utils


  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Use the Hook!
    const publicUrl = await uploadImage(
      file,
      { source: 'student', identifier: formData.enrollmentId || 'new' } // Use enrollmentId if available
    );

    if (publicUrl) {
      setFormData(prev => ({ ...prev, photoUrl: publicUrl }));
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName || !newAttachmentUrl) {
      showModal('warning', 'Campos Incompletos', 'Preencha o nome e o link do documento.');
      return;
    }

    const newFile: FileAttachment = {
      name: newAttachmentName,
      date: new Date().toLocaleDateString('pt-BR'),
      size: 'Link Externo',
      type: 'doc', // Defaulting to doc icon
      url: newAttachmentUrl
    };

    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newFile]
    }));

    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Populate form if editing
  React.useEffect(() => {
    if (isEditing && id) {
      const studentToEdit = students.find(s => s.id === id);
      if (studentToEdit) {
        const pcd = studentToEdit.pcdProfile || {};
        const pcdAccess = pcd.quickAccess || {};
        const pcdMed = pcd.medication || {};
        const pcdBeh = pcd.behavior || {};
        const pcdComm = pcd.communication || {};
        const pcdPot = pcd.potential || {};
        const pcdLearn = pcd.learningStyle || {};
        const pcdSens = pcd.sensory || {};
        const pcdAuto = pcd.autonomy || {};

        setFormData({
          name: studentToEdit.name,
          enrollmentId: studentToEdit.enrollmentId,
          classId: studentToEdit.classId || '',
          pdtId: studentToEdit.pdtId || '',
          status: studentToEdit.status,
          photoUrl: studentToEdit.photoUrl,
          diagnosis: studentToEdit.diagnosis || '',

          communicationStyle: pcdAccess.communicationStyle || '',
          avoid: pcdAccess.avoid || '',
          crisisStrategy: pcdAccess.crisisStrategy || '',
          mainAdaptation: pcdAccess.mainAdaptation || '',

          medicationInfo: pcdMed.info || '',
          medicationImpact: pcdMed.impact || '',

          triggers: pcdBeh.triggers || '',
          regulationStrategy: pcdBeh.regulationStrategy || '',

          expression: pcdComm.expression || '',
          comprehension: pcdComm.comprehension || '',

          interests: Array.isArray(pcdPot.interests) ? pcdPot.interests.join(', ') : '',
          strengths: pcdPot.strengths || '',
          rewards: pcdPot.rewards || '',

          format: pcdLearn.format || '',
          time: pcdLearn.time || '',
          environment: pcdLearn.environment || '',

          auditory: pcdSens.auditory || '',
          visual: pcdSens.visual || '',
          tactile: pcdSens.tactile || '',

          bathroom: pcdAuto.bathroom || '',
          food: pcdAuto.food || '',
          materials: pcdAuto.materials || '',

          attachments: studentToEdit.attachments || []
        });
      }
    }
  }, [id, students, classes]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.enrollmentId || !formData.classId) {
      showModal('warning', 'Campos Obrigatórios', 'Por favor, preencha os campos obrigatórios: Nome, Matrícula e Turma.');
      return;
    }

    if (isEditing && id) {
      const { success, error } = await updateStudent(id, formData);
      if (success) {
        showModal('success', 'Sucesso', 'Aluno atualizado com sucesso!', () => {
          // Explicitly navigate on confirm
          navigate('/');
        });
      } else {
        showModal('error', 'Erro', 'Erro ao atualizar aluno: ' + (error?.message || "Erro desconhecido"));
      }
    } else {
      const { success, error } = await addStudent(formData);
      if (success) {
        showModal('success', 'Sucesso', 'Aluno criado com sucesso!', () => {
          // Explicitly navigate on confirm
          navigate('/');
        });
      } else {
        showModal('error', 'Erro', 'Erro ao criar aluno: ' + (error?.message || "Erro desconhecido"));
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Header */}
        {/* Header */}
        <Header
          title="Gerenciar Alunos"
          user={{
            name: profile?.nome || "Usuário",
            role: profile?.tipo || "Visitante",
            image: profile?.foto || ""
          }}
          showSearch={false}
          showNotifications={false}
          hideUserSection={true}
          hideLogout={true}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-2"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Header>

        {/* Main Content */}
        <main className="flex-1 w-full flex justify-center py-8 px-4 sm:px-6">
          <div className="w-full max-w-5xl flex flex-col gap-6">

            {/* Title Block */}
            <div className="flex flex-col gap-2 mb-2">
              <h2 className="text-slate-900 tracking-tight text-[32px] font-bold leading-tight">{isEditing ? "Editar Aluno" : "Novo Aluno PCD"}</h2>
              <p className="text-slate-500 text-sm font-normal leading-normal">
                Preencha o Prontuário de Inclusão completo. As informações inseridas alimentarão o relatório pedagógico e o perfil de acesso rápido para os professores.
              </p>
            </div>

            {/* 1. IDENTIFICAÇÃO (Identity) */}
            <FormSection title="Identificação do Aluno" icon={<User className="w-5 h-5" />}>
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-4 min-w-[200px]">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/svg+xml,image/jpg"
                    onChange={handlePhotoSelect}
                  />
                  <div className="relative group">
                    <div
                      className="bg-center bg-no-repeat bg-cover rounded-full h-32 w-32 bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden cursor-pointer"
                      style={{ backgroundImage: formData.photoUrl ? `url("${formData.photoUrl}")` : undefined }}
                      onClick={() => profile?.tipo === 'Administrador' && !isUploading && fileInputRef.current?.click()}
                    >
                      {!formData.photoUrl && <User className="w-12 h-12 text-slate-300" />}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    {/* Only show upload button for Admin */}
                    {profile?.tipo === 'Administrador' && (
                      <button
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-md hover:bg-blue-600 transition-colors"
                        title="Carregar Foto"
                        disabled={isUploading}
                      >
                        <Upload className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Basic Inputs */}
                <div className="flex-1 flex flex-col gap-5 w-full">
                  <label className="flex flex-col w-full">
                    <span className="text-slate-900 text-sm font-medium leading-normal pb-2">Nome Completo <span className="text-red-500">*</span></span>
                    <input
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 h-10 px-3 placeholder:text-slate-400 text-sm"
                      placeholder="Ex: João da Silva"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <label className="flex flex-col w-full">
                      <span className="text-slate-900 text-sm font-medium leading-normal pb-2">Matrícula <span className="text-red-500">*</span></span>
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 h-10 px-3 placeholder:text-slate-400 text-sm"
                        placeholder="Ex: 2023001"
                        value={formData.enrollmentId}
                        onChange={(e) => handleChange('enrollmentId', e.target.value)}
                      />
                    </label>

                    {/* SELECT: Turma (Dynamic) */}
                    <label className="flex flex-col w-full">
                      <span className="text-slate-900 text-sm font-medium leading-normal pb-2 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-primary-600" /> Turma <span className="text-red-500">*</span>
                      </span>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 h-10 px-3 text-sm"
                        value={formData.classId}
                        onChange={(e) => handleChange('classId', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.series} - {c.name}</option>
                        ))}
                      </select>
                    </label>

                    {/* SELECT: PDT (Dynamic) */}
                    <label className="flex flex-col w-full">
                      <span className="text-slate-900 text-sm font-medium leading-normal pb-2 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-primary-600" /> Professor (PDT)
                      </span>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 h-10 px-3 text-sm"
                        value={formData.pdtId}
                        onChange={(e) => handleChange('pdtId', e.target.value)}
                      >
                        <option value="">Selecione o Responsável...</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Status & Diagnosis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    {/* SELECT: Status */}
                    <div className="relative">
                      <label className="flex flex-col w-full">
                        <span className="text-slate-900 text-sm font-medium leading-normal pb-2 flex items-center gap-1 justify-between">
                          <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-primary-600" /> Status do Laudo</span>
                          <button
                            onClick={() => setShowStatusHelp(!showStatusHelp)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1"
                            type="button"
                          >
                            <HelpCircle className="w-3 h-3" /> Entenda os Status
                          </button>
                        </span>
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 h-10 px-3 text-sm"
                          value={formData.status}
                          onChange={(e) => handleChange('status', e.target.value)}
                        >
                          <option value="Aguardando Laudo">⚪ Aguardando Laudo</option>
                          <option value="Laudo Atualizado">🟢 Laudo Atualizado</option>
                          <option value="Pendente Revisão">🟡 Pendente Revisão</option>
                          <option value="Acompanhamento">🔵 Acompanhamento</option>
                        </select>
                      </label>

                      {/* Status Help Card */}
                      {showStatusHelp && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 p-4 bg-white rounded-xl shadow-xl border border-slate-200 text-sm animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                            <h4 className="font-bold text-slate-800">Guia de Status para Ensino Médio</h4>
                            <button onClick={() => setShowStatusHelp(false)} className="text-slate-400 hover:text-slate-600"><Trash2 className="w-4 h-4 rotate-45" /></button>
                          </div>
                          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1 text-green-700 font-bold block bg-green-50 p-1 rounded">🟢 Laudo Atualizado</div>
                              <p className="text-slate-600 mb-1">Documento válido e recente.</p>
                              <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
                                <li><strong className="text-slate-700">Segurança Legal:</strong> Respaldo para Adaptações Curriculares e PEI.</li>
                                <li><strong className="text-slate-700">Censo & Verbas:</strong> Garante registro correto e recursos AEE.</li>
                                <li><strong className="text-slate-700">ENEM:</strong> Permite solicitar recursos de acessibilidade.</li>
                              </ul>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 text-yellow-700 font-bold block bg-yellow-50 p-1 rounded">🟡 Pendente Revisão</div>
                              <p className="text-slate-600 mb-1">Laudo antigo ou vencido.</p>
                              <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
                                <li><strong className="text-slate-700">Alerta:</strong> Laudos da infância podem não refletir o quadro atual na adolescência.</li>
                                <li><strong className="text-slate-700">Ação:</strong> Solicitar reavaliação médica à família.</li>
                              </ul>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 text-blue-700 font-bold block bg-blue-50 p-1 rounded">🔵 Acompanhamento</div>
                              <p className="text-slate-600 mb-1">Sem laudo, mas com necessidades observadas.</p>
                              <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
                                <li><strong className="text-slate-700">Sondagem:</strong> Em avaliação psicológica ou orientação.</li>
                                <li><strong className="text-slate-700">Flexibilidade:</strong> Suporte escolar sem obrigatoriedade legal estrita de grandes adaptações.</li>
                              </ul>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 text-slate-600 font-bold block bg-slate-100 p-1 rounded">⚪ Aguardando Laudo</div>
                              <p className="text-slate-600 mb-1">Família informou condição, mas documento está pendente.</p>
                              <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
                                <li><strong className="text-slate-700">Alerta Vermelho:</strong> Risco jurídico e perda de prazos (PCD em vestibulares).</li>
                                <li><strong className="text-slate-700">Ação:</strong> Cobrar a família periodicamente.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Diagnóstico */}
                    <label className="flex flex-col w-full">
                      <span className="text-slate-900 text-sm font-medium leading-normal pb-2">Diagnóstico Principal (CID)</span>
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 h-10 px-3 placeholder:text-slate-400 text-sm font-medium"
                        placeholder="Ex: TEA Nível 2 de Suporte (F84.0)"
                        value={formData.diagnosis}
                        onChange={(e) => handleChange('diagnosis', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* 2. CARTÃO DE ACESSO RÁPIDO (Quick Access) */}
            <FormSection title="Resumo para Professor (Acesso Rápido)" icon={<Zap className="w-5 h-5" />} colorClass="text-indigo-600" bgClass="bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col w-full">
                  <span className="text-slate-900 text-xs font-bold uppercase tracking-wide pb-1.5">Estilo de Comunicação Resumido</span>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 h-20 p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50"
                    placeholder="Ex: Verbal, frases curtas..."
                    value={formData.communicationStyle}
                    onChange={(e) => handleChange('communicationStyle', e.target.value)}
                  />
                </label>
                <label className="flex flex-col w-full">
                  <span className="text-red-600 text-xs font-bold uppercase tracking-wide pb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> O que evitar (Crucial)
                  </span>
                  <textarea
                    className="w-full rounded-lg border border-red-200 bg-red-50/20 h-20 p-3 text-sm resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                    placeholder="Ex: Toque físico, gritos..."
                    value={formData.avoid}
                    onChange={(e) => handleChange('avoid', e.target.value)}
                  />
                </label>
                <label className="flex flex-col w-full">
                  <span className="text-slate-900 text-xs font-bold uppercase tracking-wide pb-1.5">Estratégia de Crise</span>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 h-20 p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50"
                    placeholder="Ex: Levar para local silencioso..."
                    value={formData.crisisStrategy}
                    onChange={(e) => handleChange('crisisStrategy', e.target.value)}
                  />
                </label>
                <label className="flex flex-col w-full">
                  <span className="text-slate-900 text-xs font-bold uppercase tracking-wide pb-1.5">Adaptação Principal</span>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 h-20 p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50"
                    placeholder="Ex: Tempo estendido, prova oral..."
                    value={formData.mainAdaptation}
                    onChange={(e) => handleChange('mainAdaptation', e.target.value)}
                  />
                </label>
              </div>
            </FormSection>

            {/* 3. SAÚDE E COMPORTAMENTO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSection title="Medicação" icon={<Activity className="w-5 h-5" />} colorClass="text-pink-600" bgClass="bg-white">
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Info / Nome / Horário</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 h-9 px-3 text-sm bg-slate-50"
                      placeholder="Ex: Risperidona 1mg (Manhã)"
                      value={formData.medicationInfo}
                      onChange={(e) => handleChange('medicationInfo', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Impacto em Sala</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 h-24 p-3 text-sm resize-none bg-slate-50"
                      placeholder="Ex: Sonolência na 1ª aula, sede excessiva..."
                      value={formData.medicationImpact}
                      onChange={(e) => handleChange('medicationImpact', e.target.value)}
                    />
                  </label>
                </div>
              </FormSection>

              <FormSection title="Gatilhos & Comportamento" icon={<AlertTriangle className="w-5 h-5" />} colorClass="text-orange-600" bgClass="bg-white">
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Gatilhos (Triggers)</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 h-16 p-3 text-sm resize-none bg-slate-50"
                      placeholder="O que desencadeia crises?"
                      value={formData.triggers}
                      onChange={(e) => handleChange('triggers', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Estratégia de Regulação</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 h-16 p-3 text-sm resize-none bg-slate-50"
                      placeholder="O que ajuda a acalmar?"
                      value={formData.regulationStrategy}
                      onChange={(e) => handleChange('regulationStrategy', e.target.value)}
                    />
                  </label>
                </div>
              </FormSection>
            </div>

            {/* 4. APRENDIZAGEM & POTENCIALIDADES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSection title="Estilo de Aprendizagem" icon={<BookOpen className="w-5 h-5" />} colorClass="text-emerald-600" bgClass="bg-white">
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Formato Ideal</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 h-9 px-3 text-sm bg-slate-50"
                      placeholder="Ex: Visual, Estruturado, Texto Ampliado"
                      value={formData.format}
                      onChange={(e) => handleChange('format', e.target.value)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col w-full">
                      <span className="text-slate-700 text-xs font-bold uppercase pb-1">Tempo</span>
                      <input
                        className="w-full rounded-lg border border-slate-300 h-9 px-3 text-sm bg-slate-50"
                        placeholder="Ex: +50% tempo"
                        value={formData.time}
                        onChange={(e) => handleChange('time', e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col w-full">
                      <span className="text-slate-700 text-xs font-bold uppercase pb-1">Ambiente</span>
                      <input
                        className="w-full rounded-lg border border-slate-300 h-9 px-3 text-sm bg-slate-50"
                        placeholder="Ex: Longe da porta"
                        value={formData.environment}
                        onChange={(e) => handleChange('environment', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Potencialidades & Hiperfocos" icon={<Star className="w-5 h-5" />} colorClass="text-yellow-600" bgClass="bg-white">
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Interesses (Separar por vírgula)</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 h-9 px-3 text-sm bg-slate-50"
                      placeholder="Ex: Dinossauros, Trens, Desenho"
                      value={formData.interests}
                      onChange={(e) => handleChange('interests', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Pontos Fortes</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 h-14 p-3 text-sm resize-none bg-slate-50"
                      placeholder="Ex: Memória visual, raciocínio lógico..."
                      value={formData.strengths}
                      onChange={(e) => handleChange('strengths', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 text-xs font-bold uppercase pb-1">Recompensas</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 h-9 px-3 text-sm bg-slate-50"
                      placeholder="Ex: Adesivos, tempo livre"
                      value={formData.rewards}
                      onChange={(e) => handleChange('rewards', e.target.value)}
                    />
                  </label>
                </div>
              </FormSection>
            </div>

            {/* 5. COMUNICAÇÃO, SENSORIAL, AUTONOMIA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Comunicação */}
              <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
                <div className="px-4 py-3 border-b border-blue-100 flex items-center gap-2 bg-blue-50/50">
                  <MessageCircle className="text-blue-600 w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">Comunicação</h3>
                </div>
                <div className="p-4 space-y-4">
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Expressão</span>
                    <textarea
                      className="w-full mt-1 rounded-md border-slate-300 text-xs p-2 h-16 resize-none bg-slate-50"
                      placeholder="Como se expressa?"
                      value={formData.expression}
                      onChange={(e) => handleChange('expression', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Compreensão</span>
                    <textarea
                      className="w-full mt-1 rounded-md border-slate-300 text-xs p-2 h-16 resize-none bg-slate-50"
                      placeholder="Como entende?"
                      value={formData.comprehension}
                      onChange={(e) => handleChange('comprehension', e.target.value)}
                    />
                  </label>
                </div>
              </div>

              {/* Sensorial */}
              <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
                <div className="px-4 py-3 border-b border-purple-100 flex items-center gap-2 bg-purple-50/50">
                  <Ear className="text-purple-600 w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">Sensorial</h3>
                </div>
                <div className="p-4 space-y-3">
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Auditivo</span>
                    <input className="w-full mt-1 rounded-md border-slate-300 text-xs px-2 h-8 bg-slate-50"
                      placeholder="Ex: Sensível a sinais"
                      value={formData.auditory}
                      onChange={(e) => handleChange('auditory', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Visual</span>
                    <input className="w-full mt-1 rounded-md border-slate-300 text-xs px-2 h-8 bg-slate-50"
                      placeholder="Ex: Luzes fortes"
                      value={formData.visual}
                      onChange={(e) => handleChange('visual', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tátil</span>
                    <input className="w-full mt-1 rounded-md border-slate-300 text-xs px-2 h-8 bg-slate-50"
                      placeholder="Ex: Texturas"
                      value={formData.tactile}
                      onChange={(e) => handleChange('tactile', e.target.value)}
                    />
                  </label>
                </div>
              </div>

              {/* Autonomia */}
              <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
                <div className="px-4 py-3 border-b border-cyan-100 flex items-center gap-2 bg-cyan-50/50">
                  <Accessibility className="text-cyan-600 w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-800">Autonomia (AVD)</h3>
                </div>
                <div className="p-4 space-y-3">
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Banheiro</span>
                    <input className="w-full mt-1 rounded-md border-slate-300 text-xs px-2 h-8 bg-slate-50"
                      placeholder="Independente?"
                      value={formData.bathroom}
                      onChange={(e) => handleChange('bathroom', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Alimentação</span>
                    <input className="w-full mt-1 rounded-md border-slate-300 text-xs px-2 h-8 bg-slate-50"
                      placeholder="Come sozinho?"
                      value={formData.food}
                      onChange={(e) => handleChange('food', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Materiais</span>
                    <input className="w-full mt-1 rounded-md border-slate-300 text-xs px-2 h-8 bg-slate-50"
                      placeholder="Organização"
                      value={formData.materials}
                      onChange={(e) => handleChange('materials', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Section: Attachments */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  <FolderOpen className="text-primary-600 w-5 h-5" />
                  Documentos e Laudos
                </h3>
                <p className="text-sm text-slate-500">Adicione links para documentos armazenados externamente (Google Drive, Dropbox, etc).</p>
              </div>

              {/* Add New Link Row */}

              <div className="p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Documento</label>
                    <input
                      className="w-full rounded-md border-slate-300 bg-white text-sm h-10 px-3 focus:border-primary-600 focus:ring-primary-600"
                      placeholder="Ex: Laudo Médico 2024"
                      type="text"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Link (URL)</label>
                    <input
                      className="w-full rounded-md border-slate-300 bg-white text-sm h-10 px-3 focus:border-primary-600 focus:ring-primary-600"
                      placeholder="https://drive.google.com/..."
                      type="url"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={handleAddAttachment}
                      type="button"
                      className="w-full h-10 bg-primary-600 hover:bg-blue-600 text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* List of Attachments */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Documentos Adicionados:</h4>
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{file.name}</p>
                            <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                              {file.url} <LinkIcon className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-2"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 flex items-center justify-end gap-3 sticky bottom-4 z-10">
              <button
                onClick={() => navigate('/')}
                className="px-6 h-10 rounded-lg text-slate-700 font-medium hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 h-10 rounded-lg bg-primary-600 text-white font-medium hover:bg-blue-600 shadow-sm transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Salvar Alterações' : 'Salvar Aluno'}
              </button>
            </div>

          </div>
        </main>
      </div>
      {/* Page State Modal (Save Success/Error) */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
      />

      {/* Upload Hook Independent Modal */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={closeUploadModal}
        type={uploadModal.type}
        title={uploadModal.title}
        message={uploadModal.message}
        onConfirm={uploadModal.onConfirm}
      />
    </div>
  );
};
