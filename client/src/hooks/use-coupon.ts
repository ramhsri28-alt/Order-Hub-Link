import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "./use-supabase-auth";
import type { CouponEligibilityResult } from "@shared/schema";

const COUPON_STORAGE_KEY = "hh_applied_coupon";

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
    async (code: string | null = couponCode) => {
      if (!code) {
        setEligibility(null);
        return;
      }

      if (code !== "WELCOME20") {
        setEligibility({
          eligible: false,
          code: "INVALID_COUPON",
          message: `Coupon "${code}" is invalid.`,
        });
        return;
      }

      if (isAuthLoading) return;

      if (!user) {
        setEligibility({
          eligible: false,
          code: "AUTH_REQUIRED",
          message: "Sign in or create an account to apply WELCOME20 to your first order.",
        });
        return;
      }

      setIsChecking(true);
      try {
        // Direct Supabase RPC check (works everywhere: Vercel & local)
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
          setEligibility({
            eligible: false,
            code: "NOT_FIRST_ORDER",
            message: error.message,
          });
        } else {
          setEligibility(data as CouponEligibilityResult);
        }
      } catch (err: any) {
        setEligibility({
          eligible: false,
          code: "NOT_FIRST_ORDER",
          message: err?.message || "Could not verify coupon eligibility.",
        });
      } finally {
        setIsChecking(false);
      }
    },
    [couponCode, user, profile, isAuthLoading]
  );

  useEffect(() => {
    if (couponCode) {
      checkEligibility(couponCode);
    } else {
      setEligibility(null);
    }
  }, [couponCode, user?.id, profile?.phoneNumber, checkEligibility]);

  const applyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    setCouponCode(clean);
    try {
      sessionStorage.setItem(COUPON_STORAGE_KEY, clean);
    } catch {}
    checkEligibility(clean);
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setEligibility(null);
    try {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
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
