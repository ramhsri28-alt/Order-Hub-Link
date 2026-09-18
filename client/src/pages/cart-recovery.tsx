import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShoppingBag, AlertCircle, CheckCircle2 } from "lucide-react";

export default function CartRecoveryPage() {
  const [, setLocation] = useLocation();
  const { restoreCart } = useCart();
  const [status, setStatus] = useState<"loading" | "restored" | "already_purchased" | "expired" | "not_found">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function recover() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token") || "";

        if (!token) {
          setStatus("not_found");
          setErrorMessage("No recovery token was provided.");
          return;
        }

        // Call secure Supabase RPC to validate and fetch cart
        const { data, error } = await supabase.rpc("get_cart_by_recovery_token", {
          p_token: token.trim(),
        });

        if (error) {
          console.error("Cart recovery RPC error:", error);
          setStatus("not_found");
          setErrorMessage(error.message || "Failed to validate recovery token.");
          return;
        }

        if (!data?.valid) {
          const reason = data?.reason;
          if (reason === "already_purchased") {
            setStatus("already_purchased");
          } else if (reason === "expired") {
            setStatus("expired");
          } else {
            setStatus("not_found");
          }
          return;
        }

        const cart = data.cart;
        const items = (cart.cart_items as CartItem[]) || [];

        if (items.length === 0) {
          setStatus("not_found");
          setErrorMessage("This saved cart is empty.");
          return;
        }

        // Restore items and cart ID into Zustand
        restoreCart(items, cart.id, token.trim());
        setStatus("restored");

        // Short delay to display success before taking customer directly to checkout
        setTimeout(() => {
          setLocation("/");
        }, 1200);

      } catch (err: any) {
        console.error("Recovery error:", err);
        setStatus("not_found");
        setErrorMessage(err?.message || "An unexpected error occurred while restoring your cart.");
      }
    }

    recover();
  }, [restoreCart, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <Card className="max-w-md w-full shadow-xl border-border/60">
        <CardHeader className="text-center pb-2">
          {status === "loading" && (
            <div className="mx-auto my-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {status === "restored" && (
            <div className="mx-auto my-4 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          {(status === "already_purchased" || status === "expired" || status === "not_found") && (
            <div className="mx-auto my-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          )}

          <CardTitle className="text-2xl font-display">
            {status === "loading" && "Restoring Your Cart..."}
            {status === "restored" && "Cart Restored!"}
            {status === "already_purchased" && "Order Already Placed"}
            {status === "expired" && "Recovery Link Expired"}
            {status === "not_found" && "Cart Not Found"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we safely recover your selected items."}
            {status === "restored" && "Taking you directly to checkout to complete your order..."}
            {status === "already_purchased" && "This cart has already been purchased. Thank you for your order!"}
            {status === "expired" && "This recovery link is over 7 days old and has expired."}
            {status === "not_found" && (errorMessage || "The recovery link is invalid or no longer exists.")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex justify-center">
          {status === "restored" ? (
            <Button onClick={() => setLocation("/")} className="w-full">
              Proceed to Checkout Now
            </Button>
          ) : status !== "loading" ? (
            <Button onClick={() => setLocation("/")} variant="outline" className="w-full flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Explore Delicious Menu
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
