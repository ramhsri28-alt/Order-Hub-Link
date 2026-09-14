import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { trackOmnisendSignIn, trackOmnisendSignUp } from "@/lib/omnisend";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === "SIGNED_IN" && session?.user?.email) {
        const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
        const now = Date.now();
        // If account was created within the last 60 seconds, treat as new user sign-up
        if (createdAt > 0 && now - createdAt < 60000) {
          trackOmnisendSignUp(session.user.email);
        } else {
          trackOmnisendSignIn(session.user.email);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Correct redirect URL for Localhost, Vercel, and GitHub Pages (which has /Order-Hub-Link/)
    const base = import.meta.env.BASE_URL || "/";
    const redirectUrl = new URL(base, window.location.origin).toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    trackOmnisendSignIn(email);
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    session,
    user,
    isLoading,
    signInWithGoogle,
    signInWithPassword,
    signOut,
  };
}
