import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAdminAuth } from "@/hooks/use-admin-auth";
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
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function Router() {
  return (
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
