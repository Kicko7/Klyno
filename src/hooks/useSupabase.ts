import { useEffect, useState } from 'react';

import { supabase } from '@/libs/supabase';
import type { Database } from '@/types/supabase';

type User = Database['public']['Tables']['users']['Row'];

export const useSupabase = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch user data from our users table
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', session.user.id)
          .single();

        setUser(userData);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', session.user.id)
          .single();

        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { loading, supabase, user };
};
