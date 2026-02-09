import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
    id: string;
    nome: string;
    email: string;
    foto: string | null;
    tipo: 'Administrador' | 'Coordenador' | 'Professor' | 'Colaborador';
    alias?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('Profissionais')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setProfile(data as UserProfile);
            } else {
                // Profile not found (deleted or not created yet)
                // If this happens during login, we must block access.
                console.warn('Profile not found for user (AuthContext):', userId);
                console.error('FetchProfile Data was null.');

                await supabase.auth.signOut();
                setProfile(null);
                setSession(null);
                setUser(null);
                toast.error('Acesso negado: Perfil de usuário não encontrado ou desativado.');
            }
        } catch (err) {
            console.error('Error fetching profile (AuthContext):', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Effect to handle loading state based on profile fetch
    useEffect(() => {
        if (user && profile) {
            setLoading(false);
        } else if (!user && !loading) {
            // If no user and initial load is done (handled above), ensure loading is false
            // This logic keeps loading true while fetching profile if user exists
        }
    }, [user, profile]);

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
