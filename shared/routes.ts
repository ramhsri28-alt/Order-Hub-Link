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
        200: z.array(z.any()),
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
    create: {
      method: 'POST' as const,
      path: '/api/menu',
      input: z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().min(1, "Description is required"),
        price: z.number().min(1, "Price must be greater than 0"),
        imageUrl: z.string().url("Valid image URL is required"),
        category: z.string().min(1, "Category is required"),
        discount: z.number().min(0).max(100).default(0),
        available: z.boolean().default(true),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/menu/:id',
      input: z.object({
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        price: z.number().min(1).optional(),
        imageUrl: z.string().url().optional(),
        category: z.string().min(1).optional(),
        discount: z.number().min(0).max(100).optional(),
        available: z.boolean().optional(),
      }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/menu/:id',
      responses: {
        204: z.any(),
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
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
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
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        couponCode: z.string().optional(),
        userId: z.string().optional(),
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
  coupons: {
    validate: {
      method: 'POST' as const,
      path: '/api/coupons/validate',
      input: z.object({
        code: z.string().min(1),
        userId: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      }),
      responses: {
        200: z.object({
          eligible: z.boolean(),
          code: z.string(),
          message: z.string(),
          discount_percent: z.number().optional(),
        }),
        400: errorSchemas.validation,
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
