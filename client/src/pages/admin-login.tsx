import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Chrome } from "lucide-react";
import { useEffect } from "react";

export default function AdminLogin() {
  const { signInWithGoogle, session, isLoading } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      setLocation("/admin");
    }
  }, [session, setLocation]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.message || "Could not sign in with Google.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Admin Dashboard</CardTitle>
          <CardDescription>
            Sign in with Google to manage restaurant orders
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button 
            onClick={handleGoogleLogin} 
            className="w-full font-semibold gap-2"
            size="lg"
            disabled={isLoading}
          >
            <Chrome className="w-5 h-5" />
            {isLoading ? "Loading..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
