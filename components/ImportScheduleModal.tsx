import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check, AlertCircle, FileText, Loader2, Download } from 'lucide-react';
import { useResource } from '../contexts/ResourceContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface ImportScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedRow {
    turma: string;
    dia: string;
    horario: string;
    disciplina: string;
    professor: string;
    sala: string;
    status?: 'valid' | 'error';
    message?: string;
    data?: any; // Mapped IDs
}

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { classes, subjects, teachers, timeSlots, selectedYear, refreshAllocations } = useResource();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];
                validateRows(rows);
                setStep('preview');
            },
            error: (error) => {
                toast.error('Erro ao ler CSV: ' + error.message);
            }
        });
    };

    const normalize = (str: string) => str?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

    const validateRows = (rows: any[]) => {
        const validated: ParsedRow[] = rows.map((row, index) => {
            const result: ParsedRow = {
                turma: row['Turma'] || row['turma'] || '',
                dia: row['Dia'] || row['dia'] || '',
                horario: row['Horario'] || row['Horário'] || row['horario'] || '',
                disciplina: row['Disciplina'] || row['disciplina'] || '',
                professor: row['Professor'] || row['professor'] || '',
                sala: row['Sala'] || row['sala'] || '',
                status: 'valid'
            };

            const errors: string[] = [];
            const mappedIds: any = {};

            // 1. Validate Class
            // normalize matching
            const foundClass = classes.find(c =>
                normalize(`${c.series} ${c.name}`) === normalize(result.turma) ||
                normalize(c.name) === normalize(result.turma) // Fallback
            );
            if (foundClass) mappedIds.classId = foundClass.id;
            else errors.push(`Turma '${result.turma}' não encontrada`);

            // 2. Validate Subject
            const foundSubject = subjects.find(s => normalize(s.name) === normalize(result.disciplina));
            if (foundSubject) mappedIds.subjectId = foundSubject.id;
            else errors.push(`Disciplina '${result.disciplina}' não encontrada`);

            // 3. Validate Teacher
            // Try alias first, then name
            const foundTeacher = teachers.find(t =>
                normalize(t.alias || '') === normalize(result.professor) ||
                normalize(t.name) === normalize(result.professor)
            );
            if (foundTeacher) mappedIds.teacherId = foundTeacher.id;
            else errors.push(`Professor '${result.professor}' não encontrado`);

            // 4. Validate TimeSlot
            // Try Label match (1ª Aula) or fuzzy
            const foundSlot = timeSlots.find(t =>
                normalize(t.label) === normalize(result.horario) ||
                t.label.startsWith(result.horario) || // e.g. "1" matches "1ª Aula"
                t.start === result.horario
            );
            if (foundSlot) mappedIds.timeSlotId = foundSlot.id;
            else errors.push(`Horário '${result.horario}' não encontrado`);

            // 5. Validate Day
            const dayMap: { [key: string]: string } = {
                'segunda': 'Segunda', 'terca': 'Terça', 'terça': 'Terça',
                'quarta': 'Quarta', 'quinta': 'Quinta', 'sexta': 'Sexta'
            };
            const normalizedDay = normalize(result.dia);
            let foundDay = Object.keys(dayMap).find(k => normalizedDay.includes(k));

            if (foundDay) mappedIds.dayOfWeek = dayMap[foundDay];
            else errors.push(`Dia '${result.dia}' inválido`);

            if (errors.length > 0) {
                result.status = 'error';
                result.message = errors.join(', ');
            } else {
                result.data = mappedIds;
            }

            return result;
        });

        setPreviewData(validated);
    };

    const handleImport = async () => {
        const validRows = previewData.filter(r => r.status === 'valid');
        if (validRows.length === 0) {
            toast.error('Nenhum registro válido para importar');
            return;
        }

        setIsProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        // TODO: Ideally use a bulk RPC calls if possible, but loop is safer for now
        // We process sequentially 
        for (const row of validRows) {
            const { classId, subjectId, teacherId, timeSlotId, dayOfWeek } = row.data;

            const payload = {
                turma_id: classId,
                professor_id: teacherId,
                disciplina_id: subjectId,
                horario_id: timeSlotId,
                dia_semana: dayOfWeek,
                ano_letivo: selectedYear || new Date().getFullYear().toString(),
                semestre: '1', // Default to 1st sem for CSV.
                sala: row.sala
            };

            const { error } = await supabase
                .from('HorarioTurmas')
                .upsert(payload, { onConflict: 'turma_id, horario_id, dia_semana, ano_letivo, semestre' });

            if (error) {
                console.error('Import error row:', row, error);
                errorCount++;
            } else {
                successCount++;
            }
        }

        setIsProcessing(false);
        toast.success(`Importação concluída: ${successCount} salvos, ${errorCount} erros.`);
        refreshAllocations();
        onSuccess();
        onClose();
    };

    const validCount = previewData.filter(r => r.status === 'valid').length;
    const errorCount = previewData.filter(r => r.status === 'error').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 m-4 animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Upload className="w-6 h-6 text-indigo-600" />
                            Importar Horários (CSV)
                        </h3>
                        <p className="text-sm text-slate-500">Adicione horários em massa via planilha</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {step === 'upload' ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer m-4"
                            onClick={() => fileInputRef.current?.click()}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".csv"
                            />
                            <FileText className="w-16 h-16 text-slate-400 mb-4" />
                            <p className="text-lg font-medium text-slate-700">Clique para selecionar o arquivo CSV</p>
                            <p className="text-sm text-slate-500 mt-2">Formato: Turma, Dia, Horario, Disciplina, Professor, Sala</p>

                            <div className="mt-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm text-left max-w-md w-full">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Exemplo CSV:</p>
                                <code className="text-xs text-slate-600 block bg-slate-50 p-2 rounded">
                                    Turma,Dia,Horario,Disciplina,Professor,Sala<br />
                                    1 A,Segunda,1ª Aula,Matemática,Prof. Silva,101<br />
                                    2 B,Terça,09:30,História,Prof. Maria,
                                </code>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <div className="flex gap-4 text-sm">
                                    <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                        <Check className="w-4 h-4" /> {validCount} Válidos
                                    </div>
                                    <div className="flex items-center gap-1 text-rose-600 font-medium">
                                        <AlertCircle className="w-4 h-4" /> {errorCount} Erros
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setStep('upload'); setFile(null); }}
                                    className="text-sm text-slate-500 hover:text-indigo-600 underline"
                                >
                                    Escolher outro arquivo
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                                        <tr>
                                            <th className="p-2 border-b">Status</th>
                                            <th className="p-2 border-b">Turma</th>
                                            <th className="p-2 border-b">Dia</th>
                                            <th className="p-2 border-b">Horário</th>
                                            <th className="p-2 border-b">Disciplina</th>
                                            <th className="p-2 border-b">Professor</th>
                                            <th className="p-2 border-b">Mensagem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewData.map((row, i) => (
                                            <tr key={i} className={row.status === 'error' ? 'bg-rose-50/30' : 'hover:bg-slate-50'}>
                                                <td className="p-2">
                                                    {row.status === 'valid'
                                                        ? <Check className="w-4 h-4 text-emerald-500" />
                                                        : <AlertCircle className="w-4 h-4 text-rose-500" />
                                                    }
                                                </td>
                                                <td className="p-2">{row.turma}</td>
                                                <td className="p-2">{row.dia}</td>
                                                <td className="p-2">{row.horario}</td>
                                                <td className="p-2">{row.disciplina}</td>
                                                <td className="p-2">{row.professor}</td>
                                                <td className="p-2 text-xs text-rose-600">{row.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    {step === 'preview' && (
                        <button
                            onClick={handleImport}
                            disabled={isProcessing || validCount === 0}
                            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Importar {validCount} Registros
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
