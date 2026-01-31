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
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@/hooks/use-orders";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Loader2, Phone, Mail, User } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

interface CheckoutDialogProps {
  onClose: () => void;
}

export function CheckoutDialog({ onClose }: CheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const { items, clearCart, getTotal } = useCart();
  const total = getTotal();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();
  const { isAuthenticated, customerName, customerEmail } = useCustomerAuth();

  useEffect(() => {
    if (customerEmail) {
      setEmail(customerEmail);
    }
  }, [customerEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !customerName) {
      return;
    }
    
    try {
      const order = await createOrder.mutateAsync({
        customerName: customerName,
        customerEmail: email || undefined,
        customerPhone: phone,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      });
      
      clearCart();
      setOpen(false);
      onClose();
      
      // Open WhatsApp with order notification
      const itemsList = items.map(item => `${item.quantity}x ${item.name}`).join(', ');
      const message = encodeURIComponent(
        `New Order Placed!\n\n` +
        `Order: ${order.orderNumber}\n` +
        `Customer: ${customerName}\n` +
        `Phone: ${phone}\n` +
        `Items: ${itemsList}\n` +
        `Total: ${formatCurrency(total * 1.1)}`
      );
      window.open(`https://wa.me/9779805190408?text=${message}`, '_blank');
      
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
            Confirm your details to place the order
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={customerName || ""}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9805190408"
                required
                className="pl-10"
                data-testid="input-phone"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="For digital receipt"
                className="pl-10"
                data-testid="input-email"
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full py-6 font-semibold text-lg" 
            disabled={createOrder.isPending}
            data-testid="button-place-order"
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(total * 1.1)}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
