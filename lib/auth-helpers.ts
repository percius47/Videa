import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";

// Create a direct admin client for server components
// This bypasses cookies completely by using the service key
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Get user session directly from request header
export async function getSession(): Promise<Session | null> {
  try {
    // Get a direct admin client
    const supabase = createServerSupabaseClient();

    // Direct access without cookies
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return null;
    }

    return data?.session || null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

// Get user details directly from request header
export async function getUserDetails(): Promise<User | null> {
  try {
    // Get a direct admin client
    const supabase = createServerSupabaseClient();

    // Direct access without cookies
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting user:", error);
      return null;
    }

    return data?.user || null;
  } catch (error) {
    console.error("Error getting user details:", error);
    return null;
  }
}

// Extract user ID
export async function getUserId(): Promise<string | null> {
  const user = await getUserDetails();
  return user?.id || null;
}
