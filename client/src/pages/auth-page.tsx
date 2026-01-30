import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Redirect to="/admin" />;

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary rounded-xl text-primary-foreground mb-4 shadow-lg shadow-primary/25">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold">Staff Login</h1>
          <p className="text-muted-foreground">Welcome back! Please sign in to access the dashboard.</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Use your staff credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full py-6 text-lg font-semibold" 
              onClick={() => window.location.href = "/api/login"}
            >
              Log in with Replit
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Secure access for authorized personnel only.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
