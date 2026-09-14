import { Link } from "wouter";
import { UtensilsCrossed, LogOut, Package, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/hooks/use-cart";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const cartCount = useCart((state) => state.getCount());
  const { user, signOut } = useSupabaseAuth();

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
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex gap-2">
                <Package className="w-4 h-4" />
                <span>Orders</span>
              </Button>
            </Link>

            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            </Link>

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive gap-1 text-xs"
                title={`Signed in as ${user.email}. Click to sign out.`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
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
