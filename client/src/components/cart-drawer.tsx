import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useCoupon } from "@/hooks/use-coupon";
import { Minus, Plus, ShoppingBag, Trash2, LogIn, Tag, X, CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { CheckoutDialog } from "./checkout-dialog";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const { items, updateQuantity, removeItem, getTotal } = useCart();
  const { user } = useSupabaseAuth();
  const {
    couponCode,
    isEligible,
    discountPercent,
    eligibility,
    applyCoupon,
    removeCoupon,
  } = useCoupon();

  const total = getTotal();
  const [open, setOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");

  const discountAmount =
    isEligible && discountPercent > 0
      ? Math.round(total * (discountPercent / 100))
      : 0;

  const discountedSubtotal = total - discountAmount;
  const taxAmount = Math.round(discountedSubtotal * 0.1);
  const finalTotal = discountedSubtotal + taxAmount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      applyCoupon(couponInput.trim());
      setCouponInput("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="space-y-4">
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Your Order
          </SheetTitle>
          <SheetDescription>
            Review your delicious choices before checking out.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-8">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm">Add some tasty items from the menu!</p>
              <Button 
                variant="outline" 
                className="mt-6" 
                onClick={() => setOpen(false)}
              >
                Browse Menu
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    <div 
                      className="w-20 h-20 rounded-lg bg-cover bg-center shrink-0 border border-border/50"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-foreground line-clamp-1">{item.name}</h4>
                          <span className="font-mono text-sm font-medium">
                            {formatCurrency((item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price) * item.quantity)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {item.discount > 0 ? (
                            <>
                              <span className="line-through mr-1">{formatCurrency(item.price)}</span>
                              <span className="text-green-600">{formatCurrency(item.price * (1 - item.discount / 100))}</span>
                            </>
                          ) : formatCurrency(item.price)} each
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {items.length > 0 && (
          <div className="pt-4 mt-auto border-t bg-background space-y-4">
            {/* Coupon Code Section */}
            <div className="space-y-2">
              {couponCode ? (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    isEligible
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      : "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    {isEligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold flex items-center gap-1">
                        <span>{couponCode}</span>
                        {isEligible && (
                          <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded font-bold">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90">
                        {isEligible && isWelcome20
                          ? "Welcome! Since this is your first order you have got 20% off. Welcome to Hungry Hub!"
                          : eligibility?.message ||
                            (isEligible
                              ? "Discount applied to your order!"
                              : "Checking eligibility...")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeCoupon}
                    className="h-6 w-6 p-0 hover:bg-transparent"
                    title="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleApplyCoupon}
                  className="flex gap-2 items-center"
                >
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Coupon (e.g. WELCOME20)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="h-9 pl-8 text-xs uppercase"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="h-9 text-xs px-3"
                    disabled={!couponInput.trim()}
                  >
                    Apply
                  </Button>
                </form>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 mb-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {couponCode} (-{discountPercent}%)
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes (10%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold font-display">
                <span>Total</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <SheetFooter>
              {user ? (
                <CheckoutDialog onClose={() => setOpen(false)} />
              ) : (
                <Link href="/login" className="w-full">
                  <Button
                    className="w-full py-6 text-lg font-semibold gap-2"
                    onClick={() => setOpen(false)}
                    data-testid="button-login-to-checkout"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In to Checkout
                  </Button>
                </Link>
              )}
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
