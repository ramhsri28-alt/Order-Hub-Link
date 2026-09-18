import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "./use-supabase-auth";
import type { CouponEligibilityResult } from "@shared/schema";

const COUPON_STORAGE_KEY = "hh_applied_coupon";
const AUTO_APPLIED_KEY = "hh_auto_welcome_applied";

export function useCoupon() {
  const { user, profile, isLoading: isAuthLoading } = useSupabaseAuth();
  const [couponCode, setCouponCode] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCoupon = urlParams.get("coupon");
      if (urlCoupon) {
        const clean = urlCoupon.trim().toUpperCase();
        try {
          sessionStorage.setItem(COUPON_STORAGE_KEY, clean);
        } catch {}
        return clean;
      }
      try {
        return sessionStorage.getItem(COUPON_STORAGE_KEY);
      } catch {}
    }
    return null;
  });

  const [eligibility, setEligibility] = useState<CouponEligibilityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check URL parameters whenever location changes or component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlCoupon = urlParams.get("coupon");
    if (urlCoupon) {
      const clean = urlCoupon.trim().toUpperCase();
      setCouponCode(clean);
      try {
        sessionStorage.setItem(COUPON_STORAGE_KEY, clean);
      } catch {}
    }
  }, []);

  const checkEligibility = useCallback(
    async (code: string | null) => {
      if (!code) {
        setEligibility(null);
        return false;
      }

      if (code !== "WELCOME20") {
        setEligibility({
          eligible: false,
          code: "INVALID_COUPON",
          message: `Coupon "${code}" is invalid.`,
        });
        return false;
      }

      if (isAuthLoading) return false;

      if (!user) {
        // Don't show an error if we're just auto-checking when logged out
        if (code === "WELCOME20" && !couponCode) {
           return false;
        }
        setEligibility({
          eligible: false,
          code: "AUTH_REQUIRED",
          message: "Sign in or create an account to apply WELCOME20 to your first order.",
        });
        return false;
      }

      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc(
          "check_welcome_coupon_eligibility",
          {
            p_user_id: user.id,
            p_email: user.email || profile?.email || null,
            p_phone: profile?.phoneNumber || null,
          }
        );

        if (error) {
          console.warn("Coupon check error:", error.message);
          if (code === "WELCOME20") {
            setCouponCode(null);
            setEligibility(null);
            try { sessionStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
            return false;
          }
          setEligibility({
            eligible: false,
            code: "NOT_FIRST_ORDER",
            message: error.message,
          });
          return false;
        } else {
          const res = data as CouponEligibilityResult;
          if (!res.eligible && code === "WELCOME20") {
            setCouponCode(null);
            setEligibility(null);
            try { sessionStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
            return false;
          }
          setEligibility(res);
          return res.eligible;
        }
      } catch (err: any) {
        if (code === "WELCOME20") {
          setCouponCode(null);
          setEligibility(null);
          try { sessionStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
          return false;
        }
        setEligibility({
          eligible: false,
          code: "NOT_FIRST_ORDER",
          message: err?.message || "Could not verify coupon eligibility.",
        });
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [couponCode, user, profile, isAuthLoading]
  );

  // Auto-apply or validate coupon
  useEffect(() => {
    async function handleAutoApply() {
      // If user is authenticated and we haven't checked yet
      if (user && !isAuthLoading) {
        // If they already have a coupon code set, validate it
        if (couponCode) {
          await checkEligibility(couponCode);
        } 
        // If they don't have a coupon code set, automatically check for WELCOME20
        else {
          let hasRemoved = false;
          try {
            hasRemoved = sessionStorage.getItem(AUTO_APPLIED_KEY) === "removed";
          } catch {}
          
          if (!hasRemoved) {
            const isEligible = await checkEligibility("WELCOME20");
            if (isEligible) {
              setCouponCode("WELCOME20");
              try {
                sessionStorage.setItem(COUPON_STORAGE_KEY, "WELCOME20");
              } catch {}
            }
          }
        }
      } else if (!user && !isAuthLoading && couponCode) {
         // If logged out but had a coupon, validate it (will show auth required)
         checkEligibility(couponCode);
      }
    }
    
    handleAutoApply();
  }, [user?.id, profile?.phoneNumber, isAuthLoading, couponCode]); // removed checkEligibility to avoid infinite loop since couponCode changes inside

  const applyCoupon = async (code: string) => {
    const clean = code.trim().toUpperCase();
    setCouponCode(clean);
    try {
      sessionStorage.setItem(COUPON_STORAGE_KEY, clean);
    } catch {}
    await checkEligibility(clean);
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setEligibility(null);
    try {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
      sessionStorage.setItem(AUTO_APPLIED_KEY, "removed"); // remember they removed it so we don't auto-apply again this session if we wanted to be strict, but actually it's fine to let them remove it.
    } catch {}
  };

  const isWelcome20 = couponCode === "WELCOME20";
  const isEligible = eligibility?.eligible ?? false;
  const discountPercent = isEligible && isWelcome20 ? (eligibility?.discount_percent ?? 20) : 0;

  return {
    couponCode,
    isWelcome20,
    isEligible,
    discountPercent,
    eligibility,
    isChecking,
    applyCoupon,
    removeCoupon,
    refetchEligibility: () => checkEligibility(couponCode),
  };
}
