import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function CustomerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Fields required",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Standard Supabase Email/Password login placeholder
    // If you haven't wired up signInWithPassword in useSupabaseAuth, 
    // you can add it later. For now we will just show a toast.
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Feature coming soon",
        description: "Email login is not yet fully configured. Please use Google Sign In.",
      });
    }, 500);
  };

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

          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  data-testid="input-customer-email"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  data-testid="input-customer-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-semibold mt-4"
              size="lg"
              disabled={isLoading}
              data-testid="button-customer-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
