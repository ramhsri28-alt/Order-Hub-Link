import type { OrderWithItems } from "@shared/schema";

const WHATSAPP_NUMBER = "9805190408";

export function sendWhatsAppNotification(order: OrderWithItems): void {
  const itemsList = order.items
    .map(item => `${item.quantity}x ${item.menuItem.name}`)
    .join(', ');
  
  const message = encodeURIComponent(
    `New Order Received!\n\n` +
    `Order: ${order.orderNumber}\n` +
    `Customer: ${order.customerName}\n` +
    `Phone: ${order.customerPhone}\n` +
    `Items: ${itemsList}\n` +
    `Total: $${(order.totalAmount / 100).toFixed(2)}`
  );

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  
  console.log(`WhatsApp notification URL: ${whatsappUrl}`);
  
  return;
}
