'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface SupabaseContextType {
  loading: boolean;
  refreshTeams: () => Promise<void>;
  refreshUser: () => Promise<void>;
  teams: Team[];
  user: User | null;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', session.user.id)
        .single();
      
      setUser(userData);
    }
  };

  const refreshTeams = async () => {
    if (!user) return;

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams (*)
      `)
      .eq('user_id', user.id);

    if (teamMembers) {
      const userTeams = teamMembers.map(tm => tm.teams as Team);
      setTeams(userTeams);
    }
  };

  useEffect(() => {
    const initializeSupabase = async () => {
      await refreshUser();
      setLoading(false);
    };

    initializeSupabase();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await refreshUser();
        } else {
          setUser(null);
          setTeams([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshTeams();
    }
  }, [user]);

  return (
    <SupabaseContext.Provider
      value={{
        loading,
        refreshTeams,
        refreshUser,
        teams,
        user,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabaseContext = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabaseContext must be used within a SupabaseProvider');
  }
  return context;
}; 