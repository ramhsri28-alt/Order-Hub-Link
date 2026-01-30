import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@/hooks/use-orders";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface CheckoutDialogProps {
  onClose: () => void;
}

export function CheckoutDialog({ onClose }: CheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { items, clearCart, getTotal } = useCart();
  const total = getTotal();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createOrder.mutateAsync({
        customerName: name,
        customerEmail: email,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      });
      
      clearCart();
      setOpen(false);
      onClose();
      // Redirect to a simple success page or show a confetti celebration
      // For now, let's just close everything as the toast handles feedback
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full py-6 text-lg font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
          Checkout Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Complete Order</DialogTitle>
          <DialogDescription>
            Enter your details so we know who to call when it's ready!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              required
              className="py-3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="For digital receipt"
              className="py-3"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full py-6 font-semibold text-lg" 
            disabled={createOrder.isPending}
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${((total * 1.1) / 100).toFixed(2)}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
