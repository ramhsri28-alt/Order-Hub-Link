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
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@/hooks/use-orders";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Loader2, Phone, Mail, User, MapPin, Navigation, Gift } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

interface CheckoutDialogProps {
  onClose: () => void;
}

export function CheckoutDialog({ onClose }: CheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const { items, clearCart, getTotal } = useCart();
  const total = getTotal();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();
  const { isAuthenticated, customerName, customerEmail } = useCustomerAuth();

  // Calculate bonus points (1 point per Rs. 100)
  const bonusPoints = Math.floor((total * 1.1) / 10000);

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
      await createOrder.mutateAsync({
        customerName: customerName,
        customerEmail: email || undefined,
        customerPhone: phone,
        deliveryAddress: address || undefined,
        landmark: landmark || undefined,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      });
      
      clearCart();
      setOpen(false);
      onClose();
      setLocation("/orders");
      
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Complete Order</DialogTitle>
          <DialogDescription>
            Enter your delivery details to place the order
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
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
            <Label htmlFor="address">Delivery Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full delivery address"
                className="pl-10 min-h-[80px]"
                data-testid="input-address"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="landmark">Landmark (Optional)</Label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near hospital, temple, etc."
                className="pl-10"
                data-testid="input-landmark"
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

          {/* Bonus Points Preview */}
          {bonusPoints > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <Gift className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  You'll earn {bonusPoints} bonus points!
                </p>
                <p className="text-xs text-amber-600/80">Earn 1 point for every Rs. 100 spent</p>
              </div>
            </div>
          )}
          
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
              `Place Order - ${formatCurrency(total * 1.1)}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
