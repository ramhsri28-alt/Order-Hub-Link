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
import { useCart } from "@/hooks/use-cart";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { CheckoutDialog } from "./checkout-dialog";
import { formatCurrency } from "@/lib/utils";

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const { items, updateQuantity, removeItem, getTotal } = useCart();
  const total = getTotal();
  const [open, setOpen] = useState(false);

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
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {formatCurrency(item.price)} each
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
          <div className="pt-6 mt-auto border-t bg-background">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes (10%)</span>
                <span>{formatCurrency(total * 0.1)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold font-display">
                <span>Total</span>
                <span>{formatCurrency(total * 1.1)}</span>
              </div>
            </div>
            <SheetFooter>
              <CheckoutDialog onClose={() => setOpen(false)} />
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
