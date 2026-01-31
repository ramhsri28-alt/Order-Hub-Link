import { z } from 'zod';
import { insertMenuItemSchema, insertOrderSchema } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  menu: {
    list: {
      method: 'GET' as const,
      path: '/api/menu',
      responses: {
        200: z.array(z.any()), // Frontend will infer from schema
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/menu/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      responses: {
        200: z.array(z.any()), // Returns OrderWithItems[]
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: z.object({
        customerName: z.string().min(1, "Name is required"),
        customerEmail: z.string().email().optional().or(z.literal("")),
        customerPhone: z.string().min(10, "Phone number is required"),
        deliveryAddress: z.string().optional(),
        landmark: z.string().optional(),
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number().min(1),
        })).min(1, "Order must have at least one item"),
      }),
      responses: {
        201: z.any(), // Returns OrderWithItems
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status',
      input: z.object({
        status: z.enum(["pending", "preparing", "ready", "delivered", "cancelled"]),
      }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
};

// ============================================
// HELPERS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
