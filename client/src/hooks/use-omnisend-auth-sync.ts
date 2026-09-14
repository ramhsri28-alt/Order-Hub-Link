import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    omnisend?: any[];
  }
}

export function useOmnisendAuthSync() {
  useEffect(() => {
    const pushToOmnisend = (email: string) => {
      console.log("[Omnisend Debug] Firing account identify for:", email);

      if (typeof window !== "undefined" && window.omnisend) {
        try {
          // Push user details to Omnisend
          window.omnisend.push([
            "account",
            {
              email: email,
              status: "subscribed", // Ensures email automations trigger
            },
          ]);
          window.omnisend.push(["track", "$pageViewed"]);
        } catch (err) {
          console.warn("[Omnisend Debug] Error pushing account event:", err);
        }
      }
    };

    // 1. Check existing session on mount (covers fast reloads and cached tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email;
      if (email) {
        pushToOmnisend(email);
      }
    });

    // 2. Global listener for auth state changes (Google OAuth returns, password logins)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const email = session?.user?.email;

      if (email && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        pushToOmnisend(email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
