import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UtensilsCrossed, ShoppingCart, LogOut, User, ClipboardList, ShieldCheck, Tag, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useCart } from "@/hooks/use-cart";
import { useCoupon } from "@/hooks/use-coupon";
import { CartDrawer } from "@/components/cart-drawer";
import { AdminLoginModal } from "@/components/admin-login-modal";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { session, user, signOut } = useSupabaseAuth();
  const { couponCode, isEligible, removeCoupon } = useCoupon();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const cartItems = useCart((s) => s.items);
  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Promotional Banner for WELCOME20 */}
      {couponCode === "WELCOME20" && !bannerDismissed && (
        <div className="bg-gradient-to-r from-primary/95 to-amber-600 text-white text-xs sm:text-sm py-2 px-4 shadow-sm">
          <div className="container mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse text-yellow-200" />
              {isEligible ? (
                <span>
                  <strong>WELCOME20 Applied!</strong> You get <strong>20% OFF</strong> your first qualifying order at checkout.
                </span>
              ) : !user ? (
                <span>
                  <strong>WELCOME20:</strong> Get <strong>20% OFF</strong> your first order!{" "}
                  <Link href="/login" className="underline font-bold hover:text-yellow-200">
                    Sign in or create an account
                  </Link>{" "}
                  to redeem.
                </span>
              ) : (
                <span>
                  <strong>WELCOME20:</strong> Valid exclusively for newly registered customers on their first order.
                </span>
              )}
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors text-white"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Hungry<span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Cart Button — CartDrawer uses children as trigger */}
            <CartDrawer>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </Button>
            </CartDrawer>

            {/* Auth section */}
            {session && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 font-medium"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {initials}
                    </div>
                    <span className="hidden sm:block max-w-[120px] truncate text-sm">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
                      <ClipboardList className="w-4 h-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="font-semibold">
                <Link href="/login">
                  <User className="w-4 h-4 mr-1.5" />
                  Sign In
                </Link>
              </Button>
            )}

            {/* Admin Access — subtle, hidden in plain sight */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              onClick={() => setAdminModalOpen(true)}
              title="Admin Access"
              aria-label="Admin Access"
            >
              <ShieldCheck className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Admin Login Modal */}
      <AdminLoginModal open={adminModalOpen} onOpenChange={setAdminModalOpen} />
    </div>
  );
}
