import { Link } from "wouter";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/hooks/use-cart";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const cartCount = useCart((state) => state.count);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-primary rounded-xl text-primary-foreground group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Bistro<span className="text-primary">Sync</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:flex">
                Staff Login
              </Button>
            </Link>
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
          <p className="font-display font-medium mb-2">BistroSync Restaurant</p>
          <p className="text-sm">Made with ❤️ for great food.</p>
        </div>
      </footer>
    </div>
  );
}
