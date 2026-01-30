import { AdminLayout } from "@/components/admin-layout";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Truck, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus, OrderWithItems } from "@shared/schema";

const statusConfig: Record<OrderStatus, { label: string, color: string, icon: any, next?: OrderStatus }> = {
  pending: { 
    label: "Pending", 
    color: "bg-amber-100 text-amber-700 border-amber-200", 
    icon: AlertCircle,
    next: "preparing" 
  },
  preparing: { 
    label: "Preparing", 
    color: "bg-blue-100 text-blue-700 border-blue-200", 
    icon: ChefHat,
    next: "ready"
  },
  ready: { 
    label: "Ready", 
    color: "bg-green-100 text-green-700 border-green-200", 
    icon: CheckCircle2,
    next: "delivered"
  },
  delivered: { 
    label: "Delivered", 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    icon: Truck,
    next: undefined
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
    next: undefined
  }
};

function OrderCard({ order }: { order: OrderWithItems }) {
  const updateStatus = useUpdateOrderStatus();
  const config = statusConfig[order.status as OrderStatus];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: `var(--${config.color.split(' ')[1].replace('text-', '')})` }}>
      <CardHeader className="bg-muted/10 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">{order.customerName}</h3>
              <Badge variant="outline" className={config.color}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="text-right">
            <span className="block font-mono font-bold text-lg">
              {formatCurrency(order.totalAmount * 1.1)}
            </span>
            <span className="text-xs text-muted-foreground">
              Order #{order.id}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="space-y-2 mb-6">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <div className="flex gap-2">
                <span className="font-mono font-bold w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                  {item.quantity}x
                </span>
                <span className="font-medium text-foreground/90">
                  {item.menuItem?.name || "Unknown Item"}
                </span>
              </div>
              <span className="text-muted-foreground">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        
        {config.next && (
          <Button 
            className="w-full font-semibold" 
            size="lg"
            onClick={() => updateStatus.mutate({ id: order.id, status: config.next! })}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Advance Status"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="h-[50vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
  const activeOrders = orders?.filter(o => ['preparing', 'ready'].includes(o.status)) || [];
  const completedOrders = orders?.filter(o => ['delivered', 'cancelled'].includes(o.status)) || [];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Live Orders</h1>
          <p className="text-muted-foreground">Manage incoming orders in real-time</p>
        </div>
        <div className="flex gap-4">
           {/* Summary stats could go here */}
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-card p-1 border">
          <TabsTrigger value="active" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
            Pending ({pendingOrders.length})
            {pendingOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeOrders.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-card rounded-xl border border-dashed">
                <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No active orders</h3>
                <p className="text-muted-foreground">The kitchen is clear!</p>
              </div>
            ) : (
              activeOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingOrders.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-card rounded-xl border border-dashed">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground">No pending orders waiting for review.</p>
              </div>
            ) : (
              pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {completedOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
