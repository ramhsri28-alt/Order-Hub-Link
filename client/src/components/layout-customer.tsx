import { Link } from "wouter";
import { UtensilsCrossed, User, LogOut, Package, LayoutDashboard } from "lucide-react";
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

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const cartCount = useCart((state) => state.getCount());
  const { user, signOut } = useSupabaseAuth();

  const storedName = typeof window !== "undefined" ? localStorage.getItem("customer_full_name") : null;
  const displayName = storedName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const isAdmin = user?.email === 'hungryhub@gmail.com' || user?.user_metadata?.role === 'admin';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer" data-testid="link-home">
            <div className="p-2 bg-primary rounded-xl text-primary-foreground group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Hungry <span className="text-primary">Hub</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline font-medium">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b truncate">
                    {user.email}
                  </div>
                  <Link href="/orders">
                    <DropdownMenuItem className="cursor-pointer" data-testid="link-my-orders">
                      <Package className="w-4 h-4 mr-2" />
                      My Orders
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive" data-testid="button-customer-logout">
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
              <Button className="rounded-full px-5 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
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
    </div>
  );
}
