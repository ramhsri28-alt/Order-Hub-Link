import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { trackOmnisendSignIn, triggerBackendFirstLogin } from "@/lib/omnisend";

/**
 * Global auth sync hook — runs once in App.tsx.
 *
 * 1. Checks Supabase database authoritative state on first login via backend /api/omnisend/first-login.
 *    If this is genuinely the first qualifying login, backend emits custom event 'new_customer_first_login' to Omnisend.
 *    Subsequent logins, page refreshes, and session checks are recognized as already triggered and safely skipped.
 * 2. Synchronizes contact profile with Omnisend frontend snippet for browser session & abandoned cart tracking.
 */
export function useOmnisendAuthSync() {
  useEffect(() => {
    const syncUserToOmnisend = async (
      accessToken: string,
      userEmail: string,
      userId: string
    ) => {
      // Fetch extra profile data (name + phone) from customer_profiles
      let fullName: string | undefined;
      let phone: string | undefined;

      try {
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("full_name, phone_number")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile) {
          fullName = profile.full_name || undefined;
          phone = profile.phone_number || undefined;
        }
      } catch {
        // Fail silently — proceed with available details
      }

      // 1. Authoritative server-side First-Login check & custom event dispatch
      await triggerBackendFirstLogin(accessToken, {
        email: userEmail,
        fullName,
        phone,
      });

      // 2. Client browser session tracking for Omnisend snippet (cart abandonment, page views)
      await trackOmnisendSignIn(userEmail, { phone, fullName });
    };

    // 1. Check existing session on mount (handles page refreshes and cached tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email && session.access_token) {
        syncUserToOmnisend(
          session.access_token,
          session.user.email,
          session.user.id
        );
      }
    });

    // 2. Listen for all future auth events (OAuth callbacks, email sign-ins)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user?.email &&
        session.access_token &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        syncUserToOmnisend(
          session.access_token,
          session.user.email,
          session.user.id
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
