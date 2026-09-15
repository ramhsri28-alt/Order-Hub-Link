import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation, Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  UtensilsCrossed,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

// ─── Small helper: Password visibility toggle ──────────────────────────────
function PasswordInput({
  id,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 h-11"
        disabled={disabled}
        required
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function CustomerLogin() {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } =
    useSupabaseAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ── Shared loading + Google state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ── Sign-Up form state
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // ── Sign-In form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [isSignInLoading, setIsSignInLoading] = useState(false);

  // ─── Google Sign-In ────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      toast({
        title: "Google sign-in failed",
        description: e?.message || "Could not complete sign in.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
    // Don't setIsGoogleLoading(false) on success — Google redirects the page
  };

  // ─── Email Sign-Up ─────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUpFullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    if (!signUpPhone.trim() || signUpPhone.trim().length < 7) {
      toast({
        title: "Valid phone number is required",
        description: "Please enter a valid mobile number.",
        variant: "destructive",
      });
      return;
    }
    if (!signUpEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (signUpPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsSignUpLoading(true);
    try {
      await signUpWithEmail(
        signUpEmail.trim(),
        signUpPassword,
        signUpFullName.trim(),
        signUpPhone.trim()
      );

      setSignUpSuccess(true);
      toast({
        title: "Account created! 🎉",
        description:
          "Please check your email to confirm your account before signing in.",
      });
    } catch (e: any) {
      toast({
        title: "Sign-up failed",
        description: e?.message || "Could not create account.",
        variant: "destructive",
      });
    } finally {
      setIsSignUpLoading(false);
    }
  };

  // ─── Email Sign-In ─────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signInEmail.trim() || !signInPassword) {
      toast({
        title: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    setIsSignInLoading(true);
    try {
      await signInWithEmail(signInEmail.trim(), signInPassword);
      toast({ title: "Welcome back! 👋" });
      setLocation("/");
    } catch (e: any) {
      toast({
        title: "Sign-in failed",
        description: e?.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsSignInLoading(false);
    }
  };

  const anyLoading = isGoogleLoading || isSignUpLoading || isSignInLoading;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </Link>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">
            Welcome to Hungry Hub
          </CardTitle>
          <CardDescription>
            Sign up or sign in to place your order
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* ── SIGN IN TAB ─────────────────────────────────────────── */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="pl-10 h-11"
                      disabled={anyLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password">Password</Label>
                  <PasswordInput
                    id="signin-password"
                    placeholder="Your password"
                    value={signInPassword}
                    onChange={setSignInPassword}
                    disabled={anyLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold mt-2"
                  disabled={anyLoading}
                  data-testid="button-signin"
                >
                  {isSignInLoading ? "Signing in…" : "Sign In"}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 font-semibold flex items-center justify-center gap-3 border-2 hover:bg-muted/50 transition-all shadow-sm"
                  disabled={anyLoading}
                  data-testid="button-google-signin"
                >
                  <FcGoogle className="w-5 h-5" />
                  {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
                </Button>
              </form>
            </TabsContent>

            {/* ── SIGN UP TAB ─────────────────────────────────────────── */}
            <TabsContent value="signup">
              {signUpSuccess ? (
                /* ── Success state ── */
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                  <h3 className="text-lg font-semibold">
                    Account created successfully!
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    We sent a confirmation link to{" "}
                    <strong>{signUpEmail}</strong>. Click the link in your email
                    to activate your account, then sign in.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setSignUpSuccess(false)}
                  >
                    Back to Sign Up
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpFullName}
                        onChange={(e) => setSignUpFullName(e.target.value)}
                        className="pl-10 h-11"
                        disabled={anyLoading}
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-phone">
                      Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+977 98XXXXXXXX"
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        className="pl-10 h-11"
                        disabled={anyLoading}
                        autoComplete="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used for order updates and delivery notifications.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="pl-10 h-11"
                        disabled={anyLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <PasswordInput
                      id="signup-password"
                      placeholder="Min. 6 characters"
                      value={signUpPassword}
                      onChange={setSignUpPassword}
                      disabled={anyLoading}
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm-password">
                      Confirm Password{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <PasswordInput
                      id="signup-confirm-password"
                      placeholder="Repeat your password"
                      value={signUpConfirmPassword}
                      onChange={setSignUpConfirmPassword}
                      disabled={anyLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold mt-2"
                    disabled={anyLoading}
                    data-testid="button-signup"
                  >
                    {isSignUpLoading ? "Creating account…" : "Create Account"}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        or
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="w-full h-11 font-semibold flex items-center justify-center gap-3 border-2 hover:bg-muted/50 transition-all shadow-sm"
                    disabled={anyLoading}
                    data-testid="button-google-signup"
                  >
                    <FcGoogle className="w-5 h-5" />
                    {isGoogleLoading
                      ? "Redirecting…"
                      : "Sign up with Google"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
