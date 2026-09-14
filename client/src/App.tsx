import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";

// Pages
import CustomerHome from "@/pages/customer-home";
import CustomerLogin from "@/pages/customer-login";
import OrderTracking from "@/pages/order-tracking";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminMenu from "@/pages/admin-menu";
import AdminLogin from "@/pages/admin-login";
import NotFound from "@/pages/not-found";

// Protected Admin Route Wrapper
function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, user, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user?.email === 'hungryhub@gmail.com' || user?.user_metadata?.role === 'admin';

  if (!session || !isAdmin) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <WouterRouter base={base}>
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={CustomerHome} />
        <Route path="/login" component={CustomerLogin} />
        <Route path="/orders" component={OrderTracking} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/menu">
          {() => <ProtectedAdminRoute component={AdminMenu} />}
        </Route>
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
