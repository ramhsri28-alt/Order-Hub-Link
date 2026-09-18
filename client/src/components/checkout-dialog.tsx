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
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useCoupon } from "@/hooks/use-coupon";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Mail, User, MapPin, Navigation, Gift, Tag, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { LocationPicker } from "./location-picker";
import { trackOmnisendPlacedOrder } from "@/lib/omnisend";

interface CheckoutDialogProps {
  onClose: () => void;
}

export function CheckoutDialog({ onClose }: CheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const { user, profile } = useSupabaseAuth();
  const { couponCode, isEligible, discountPercent } = useCoupon();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { items, clearCart, getTotal, cartId, isCheckoutOpen, setIsCheckoutOpen } = useCart();
  const total = getTotal();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");

  // Sync recovery checkout auto-open
  useEffect(() => {
    if (isCheckoutOpen) {
      setOpen(true);
    }
  }, [isCheckoutOpen]);

  // Pre-fill user details from profile or auth session
  useEffect(() => {
    if (profile?.fullName) {
      setName(profile.fullName);
    } else if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    }
    if (user?.email) {
      setEmail(user.email);
    } else if (profile?.email) {
      setEmail(profile.email);
    }
    if (profile?.phoneNumber) {
      setPhone(profile.phoneNumber);
    }
  }, [user, profile]);

  const discountAmount =
    isEligible && discountPercent > 0
      ? Math.round(total * (discountPercent / 100))
      : 0;

  const discountedSubtotal = total - discountAmount;
  const taxAmount = Math.round(discountedSubtotal * 0.1);
  const finalTotal = discountedSubtotal + taxAmount;

  // Calculate bonus points (1 point per Rs. 100)
  const bonusPoints = Math.floor(finalTotal / 10000);

  const handleLocationChange = (lat: string, lng: string) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!name.trim() || !phone.trim()) {
      return;
    }
    
    try {
      await createOrder.mutateAsync({
        customerName: name,
        customerEmail: email || undefined,
        customerPhone: phone,
        deliveryAddress: address || undefined,
        landmark: landmark || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        couponCode: isEligible && couponCode ? couponCode : undefined,
        userId: user?.id,
        cartId: cartId || undefined,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      });
      
      // Track placed order in Omnisend with specific cart ID
      trackOmnisendPlacedOrder({
        totalAmount: finalTotal,
        email: email || undefined,
        cartId: cartId || undefined,
        lineItems: items.map((item) => {
          const discount = item.discount ?? 0;
          const effectivePaisa = discount > 0 ? item.price * (1 - discount / 100) : item.price;
          return {
            productTitle: item.name,
            price: Number((effectivePaisa / 100).toFixed(2)),
            quantity: item.quantity,
          };
        }),
      });

      clearCart(false, true);
      setIsCheckoutOpen(false);
      setOpen(false);
      onClose();
      setLocation("/orders");
      
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || "Failed to place order. Please try again.";
      setErrorMessage(msg);
      toast({
        title: "Order failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(next) => {
        setOpen(next);
        setIsCheckoutOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full py-6 text-lg font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
          Checkout Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Complete Order</DialogTitle>
          <DialogDescription>
            Enter your delivery details to place the order
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="pl-10"
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
            <Label>Pin Your Location</Label>
            <LocationPicker 
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
            />
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

          {/* Order & Discount Summary */}
          <div className="p-3 bg-muted/40 rounded-lg border space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {couponCode} (-{discountPercent}%)
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Taxes (10%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Final Total</span>
              <span className="text-primary">{formatCurrency(finalTotal)}</span>
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

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {errorMessage}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full py-6 font-semibold text-lg shadow-lg shadow-primary/20" 
            disabled={createOrder.isPending}
            data-testid="button-place-order"
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Place Order - ${formatCurrency(finalTotal)}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
