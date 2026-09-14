import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, ArrowLeft, User } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function CustomerLogin() {
  const { signInWithGoogle } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("customer_full_name") || "" : "";
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Full Name is required",
        description: "Please enter your full name before signing in.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("customer_full_name", fullName.trim());
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      toast({
        title: "Google sign‑in failed",
        description: e?.message || "Could not complete sign in.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center pb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </Link>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Welcome to Hungry Hub</CardTitle>
          <CardDescription>
            Enter your name and sign in with Google to place orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="space-y-2 text-left">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Required so we can personalize your order and cart.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full font-semibold h-12 flex items-center justify-center gap-3 border-2 hover:bg-muted/50 transition-all shadow-sm"
              size="lg"
              disabled={isLoading}
              data-testid="button-google-signin"
            >
              <FcGoogle className="w-5 h-5" />
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
