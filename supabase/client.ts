// supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/supabase/types"; // Ensure 'Database' is a type and exists in "@/types"

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
