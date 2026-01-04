
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { X, UserPlus, Loader2, Lock, Mail, User, Shield, AlertTriangle } from 'lucide-react';

interface UserSignupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Temporary credentials for signup action only - exposes public key which is safe
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aqaqtiwiuesmincehxrg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

export const UserSignupModal: React.FC<UserSignupModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Professor');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            // Create a temporary client to avoid logging out the current admin
            const tempClient = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false, // Fix: Don't save this session to localStorage!
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            // 1. Sign Up
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: name,
                        tipo: role
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Profile is auto-created by DB Trigger 'handle_new_user' using the metadata provided above.
                // We don't need to manually insert/update anymore.

                toast.success('Usuário criado com sucesso!');
                onSuccess();
                onClose();

                // Reset form
                setName('');
                setEmail('');
                setPassword('');
                setRole('Professor');

                // Logout the temp client just to be clean
                await tempClient.auth.signOut();
            }

        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error(error.message || 'Erro ao criar conta.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg text-primary-700">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary-900">Novo Usuário</h3>
                            <p className="text-xs text-primary-700">Cadastro de acesso ao sistema</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-primary-700/50 hover:text-primary-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-700 leading-tight">
                        Este usuário terá acesso imediato ao sistema com as permissões do cargo selecionado.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Ex: Professor Carlos"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="usuario@escola.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cargo / Função</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white font-medium text-slate-700"
                            >
                                <option value="Professor">Professor</option>
                                <option value="Coordenador">Coordenador</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Colaborador">Colaborador</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Senha Provisória</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm"
                                placeholder="******"
                                minLength={6}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 text-right">Mínimo 6 caracteres</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-600/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Usuário'}
                    </button>
                </form>
            </div>
        </div>
    );
};
