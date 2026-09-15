import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { trackOmnisendSignIn, trackOmnisendSignUp } from "@/lib/omnisend";

/**
 * Global auth sync hook — runs once in App.tsx.
 * On every page load and auth state change, identifies the logged-in user to
 * Omnisend so it can track sessions, abandoned carts, and send automations.
 *
 * For NEW users: pushes status="subscribed" so Welcome automations trigger.
 * For RETURNING users: pushes identification so Omnisend knows who is browsing
 * (enabling abandoned cart detection).
 */
export function useOmnisendAuthSync() {
  useEffect(() => {
    const syncUserToOmnisend = async (
      event: "SIGNED_IN" | "INITIAL_SESSION" | "TOKEN_REFRESHED",
      userEmail: string,
      userCreatedAt?: string
    ) => {
      // Fetch extra profile data (name + phone) from customer_profiles
      let fullName: string | undefined;
      let phone: string | undefined;

      try {
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("full_name, phone_number")
          .eq("email", userEmail)
          .maybeSingle();

        if (profile) {
          fullName = profile.full_name || undefined;
          phone = profile.phone_number || undefined;
        }
      } catch {
        // Fail silently — still identify with just email
      }

      // Determine if this is a new sign-up (account created within the last 90 seconds)
      const createdAt = userCreatedAt ? new Date(userCreatedAt).getTime() : 0;
      const isNewSignUp = createdAt > 0 && Date.now() - createdAt < 90000;

      if (isNewSignUp) {
        // New user → subscribe + trigger Welcome automation
        await trackOmnisendSignUp(userEmail, { phone, fullName });
      } else {
        // Returning user → identify for session tracking / abandoned cart
        await trackOmnisendSignIn(userEmail, { phone, fullName });
      }
    };

    // 1. Check existing session on mount (handles page refreshes and cached tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        syncUserToOmnisend(
          "INITIAL_SESSION",
          session.user.email,
          session.user.created_at
        );
      }
    });

    // 2. Listen for all future auth events (OAuth callbacks, email sign-ins, token refreshes)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user?.email &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        syncUserToOmnisend(event, session.user.email, session.user.created_at);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
