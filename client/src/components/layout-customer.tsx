import { useState } from "react";
import { Link } from "wouter";
import { UtensilsCrossed, User, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/hooks/use-cart";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminLoginModal } from "./admin-login-modal";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const cartCount = useCart((state) => state.getCount());
  const { user, signOut } = useSupabaseAuth();
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    // If no user is logged in, open admin modal
    if (!user) {
      e.preventDefault();
      setAdminModalOpen(true);
    }
    // If logged in as customer, it operates purely as a homepage link
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2 group cursor-pointer" data-testid="link-home">
            <div className="p-2 bg-primary rounded-xl text-primary-foreground group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Hungry <span className="text-primary">Hub</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {(user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden sm:inline">{user.email?.split('@')[0] || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href="/orders">
                      <DropdownMenuItem className="cursor-pointer" data-testid="link-my-orders">
                        <Package className="w-4 h-4 mr-2" />
                        My Orders
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer" data-testid="button-customer-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" className="gap-2" data-testid="button-login">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </Link>
              )}
            <CartDrawer>
              <Button className="rounded-full px-6 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Cart ({cartCount})
              </Button>
            </CartDrawer>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="font-display font-medium mb-2">Hungry Hub Restaurant</p>
          <p className="text-sm">Made with ❤️ for great food.</p>
        </div>
      </footer>
      <AdminLoginModal open={adminModalOpen} onOpenChange={setAdminModalOpen} />
    </div>
  );
}
