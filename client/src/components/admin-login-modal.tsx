import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock } from "lucide-react";

interface AdminLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminLoginModal({ open, onOpenChange }: AdminLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithPassword } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Fields required",
        description: "Please enter your admin credentials.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await signInWithPassword(email, password);
      const user = data.user;
      const isAdmin = user?.email === 'hungryhub@gmail.com' || user?.user_metadata?.role === 'admin';
      
      if (!isAdmin) {
        throw new Error("Unauthorized access. Admin privileges required.");
      }

      toast({
        title: "Welcome Back Admin",
        description: "You have successfully authenticated.",
      });
      onOpenChange(false);
      setLocation("/admin");
    } catch (e: any) {
      toast({
        title: "Authentication failed",
        description: e.message || "Invalid credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-center">Admin Access</DialogTitle>
          <DialogDescription className="text-center">
            Authorized personnel only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdminLogin} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full font-semibold"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? "Authenticating..." : "Access Dashboard"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
