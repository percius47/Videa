import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
export const supabaseAnonKey = process.env
  .NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create a Supabase client with the environment variables
export const createClientSupabase = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};
