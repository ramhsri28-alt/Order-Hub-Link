import { CustomerLayout } from "@/components/layout-customer";
import { useOrders } from "@/hooks/use-orders";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Truck, 
  AlertCircle,
  Loader2,
  Gift,
  Package,
  ArrowLeft,
  Tag
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus, OrderWithItems } from "@shared/schema";
import { Link } from "wouter";
import { motion } from "framer-motion";

const statusConfig: Record<OrderStatus, { label: string, color: string, icon: any, step: number }> = {
  pending: { 
    label: "Order Placed", 
    color: "bg-amber-100 text-amber-700 border-amber-200", 
    icon: AlertCircle,
    step: 1
  },
  preparing: { 
    label: "Being Prepared", 
    color: "bg-blue-100 text-blue-700 border-blue-200", 
    icon: ChefHat,
    step: 2
  },
  ready: { 
    label: "Ready for Pickup", 
    color: "bg-green-100 text-green-700 border-green-200", 
    icon: CheckCircle2,
    step: 3
  },
  delivered: { 
    label: "Delivered", 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    icon: Truck,
    step: 4
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
    step: 0
  }
};

function OrderStatusStepper({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  const steps = [
    { label: "Placed", icon: Package, step: 1 },
    { label: "Preparing", icon: ChefHat, step: 2 },
    { label: "Ready", icon: CheckCircle2, step: 3 },
    { label: "Delivered", icon: Truck, step: 4 },
  ];

  if (status === 'cancelled') {
    return (
      <div className="flex items-center justify-center py-4">
        <Badge variant="destructive" className="text-lg py-2 px-4">
          Order Cancelled
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full py-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = config.step >= step.step;
        const isCurrent = config.step === step.step;
        
        return (
          <div key={step.label} className="flex flex-col items-center flex-1">
            <div className="relative flex items-center w-full">
              {index > 0 && (
                <div 
                  className={`absolute left-0 right-1/2 h-1 -translate-x-1/2 transition-colors ${
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
              {index < steps.length - 1 && (
                <div 
                  className={`absolute left-1/2 right-0 h-1 translate-x-1/2 transition-colors ${
                    config.step > step.step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
              <motion.div 
                className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-colors ${
                  isCompleted 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
            </div>
            <span className={`text-xs mt-2 font-medium ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderTrackingCard({ order }: { order: OrderWithItems }) {
  const config = statusConfig[order.status as OrderStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">{order.orderNumber}</p>
              <CardTitle className="text-xl">Your Order</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
              {order.bonusPoints > 0 && (
                <div className="flex items-center gap-1 mt-2 text-amber-600">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-medium">+{order.bonusPoints} points</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <OrderStatusStepper status={order.status as OrderStatus} />
          
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-4">Order Items</h4>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <div className="flex gap-3">
                    <span className="font-mono font-bold w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                      {item.quantity}x
                    </span>
                    <span className="font-medium">
                      {item.menuItem?.name || "Unknown Item"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            
            <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(order.subtotalAmount || order.totalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {order.couponCode || "Discount"}
                  </span>
                  <span className="font-mono">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(order.totalAmount * 1.1)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function OrderTracking() {
  const { data: allOrders, isLoading } = useOrders();
  const { customerName, isAuthenticated: isCustAuth } = useCustomerAuth();
  const { user, profile } = useSupabaseAuth();

  const isUserAuthenticated = Boolean(user || isCustAuth);

  // Filter orders for current authenticated customer
  const myOrders =
    allOrders?.filter((o) => {
      if (user?.id && (o as any).userId === user.id) return true;
      if (user?.email && o.customerEmail && o.customerEmail.toLowerCase() === user.email.toLowerCase()) return true;
      if (profile?.phoneNumber && o.customerPhone === profile.phoneNumber) return true;
      if (customerName && o.customerName === customerName) return true;
      return false;
    }) || [];

  const totalPoints = myOrders.reduce((sum, o) => sum + (o.bonusPoints || 0), 0);

  if (!isUserAuthenticated) {
    return (
      <CustomerLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-display font-bold mb-2">Sign in to track orders</h2>
          <p className="text-muted-foreground mb-6">You need to be signed in to view your order history</p>
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">My Orders</h1>
            <p className="text-muted-foreground">Track your order status and history</p>
          </div>
        </div>

        {/* Points Summary Card */}
        <Card className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Gift className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Bonus Points</p>
                <p className="text-3xl font-bold text-amber-600">{totalPoints}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Earn 1 point for every Rs. 100 spent</p>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Keep ordering to earn more!</p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : myOrders.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">Start ordering to see your order history here!</p>
            <Link href="/">
              <Button>Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {myOrders.map(order => (
              <OrderTrackingCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
