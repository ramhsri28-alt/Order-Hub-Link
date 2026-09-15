import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

export type CustomerProfileData = {
  fullName: string;
  phoneNumber: string;
  email: string;
} | null;

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfileData>(null);

  // Load profile from customer_profiles table
  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("customer_profiles")
        .select("full_name, phone_number, email")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setProfile({
          fullName: data.full_name ?? "",
          phoneNumber: data.phone_number ?? "",
          email: data.email ?? "",
        });
      }
    } catch {
      // Profile may not exist yet for Google OAuth users — that is fine
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user?.id) {
        loadProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user?.id) {
        loadProfile(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── GOOGLE OAUTH ──────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const base = import.meta.env.BASE_URL || "/";
    const redirectUrl = new URL(base, window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) throw error;
  };

  // ─── EMAIL SIGN-UP ─────────────────────────────────────────────────────────
  /**
   * Registers a NEW user with email + password.
   * Also creates a customer_profiles row with full name and phone number.
   * The use-omnisend-auth-sync hook will detect the new account and
   * push them to Omnisend as a subscribed contact automatically.
   */
  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phoneNumber,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Sign-up failed — no user returned.");

    // Save profile data to customer_profiles table
    const { error: profileError } = await supabase
      .from("customer_profiles")
      .upsert({
        user_id: data.user.id,
        email: email,
        full_name: fullName,
        phone_number: phoneNumber,
      });

    if (profileError) {
      // Log but don't block — auth succeeded, profile will be created on next login
      console.warn("Profile save error:", profileError.message);
    }

    return data;
  };

  // ─── EMAIL SIGN-IN ─────────────────────────────────────────────────────────
  /**
   * Signs in a RETURNING user with email + password.
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // ─── LEGACY PASSWORD METHOD (kept for any existing references) ─────────────
  const signInWithPassword = async (email: string, password: string) => {
    return signInWithEmail(email, password);
  };

  // ─── SIGN OUT ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    session,
    user,
    profile,
    isLoading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signInWithPassword,
    signOut,
  };
}
