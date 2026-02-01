import { Link, useLocation } from "wouter";
import { LayoutDashboard, LogOut, UtensilsCrossed, Settings, Menu, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { username, logout } = useAdminAuth();

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Live Orders", href: "/admin" },
    { icon: BookOpen, label: "Menu Management", href: "/admin/menu" },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/admin/login");
  };

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r fixed inset-y-0 left-0 z-20 hidden lg:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Bistro<span className="text-primary">Admin</span>
            </span>
          </Link>
        </div>

        <div className="p-4 space-y-1 flex-1">
          {sidebarItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t bg-muted/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {username?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{username || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">Restaurant Admin</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-w-0">
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 lg:hidden sticky top-0 z-10">
          <span className="font-display font-bold text-lg">BistroAdmin</span>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button size="sm" variant={location === "/admin" ? "secondary" : "ghost"}>
                <LayoutDashboard className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/menu">
              <Button size="sm" variant={location === "/admin/menu" ? "secondary" : "ghost"}>
                <BookOpen className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
