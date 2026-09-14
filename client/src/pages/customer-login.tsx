// Imports needed for Google sign‑in only
import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function CustomerLogin() {
  const { signInWithGoogle } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Google sign‑in only – email/password flow removed


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </Link>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Welcome to Hungry Hub</CardTitle>
          <CardDescription>
            Sign in to securely place your order and save preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-8">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setIsLoading(true);
                try {
                  await signInWithGoogle();
                } catch (e) {
                  toast({
                    title: "Google sign‑in failed",
                    variant: "destructive",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full font-semibold h-12 flex items-center justify-center gap-2"
              size="lg"
              disabled={isLoading}
              data-testid="button-google-signin"
            >
              <FcGoogle className="w-5 h-5" />
              Sign in with Google
            </Button>
          </div>
          
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          
        </CardContent>
      </Card>
    </div>
  );
}
