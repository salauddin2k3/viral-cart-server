import { z } from 'zod';
import { isValidBdPhone, normalizeBdPhone } from './phone';

export const MAX_NAME = 120;
export const MAX_ADDRESS = 500;
export const MAX_NOTE = 1000;
export const MAX_CART_LINES = 60;

export const checkoutFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(MAX_NAME, `Name must be at most ${MAX_NAME} characters`),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .refine((val) => isValidBdPhone(val), 'Invalid Bangladesh phone number')
    .transform(normalizeBdPhone),
  districtArea: z.string().trim().max(100).optional().default(''),
  address: z
    .string()
    .trim()
    .min(1, 'Address is required')
    .max(MAX_ADDRESS, `Address must be at most ${MAX_ADDRESS} characters`),
  note: z
    .string()
    .trim()
    .max(MAX_NOTE, `Note must be at most ${MAX_NOTE} characters`)
    .optional()
    .default(''),
  deliveryMethod: z.string().trim().max(100).optional().default(''),
  deliveryLocation: z.enum(['inside_dhaka', 'dhaka_sub', 'outside_dhaka']).optional().default('inside_dhaka'),
  paymentMethod: z.string().trim().max(50).optional().default('cod'),
});

export type CheckoutFields = z.infer<typeof checkoutFieldSchema>;

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  unitPrice: z.number().positive(),
  discountPercent: z.number().int().min(0).max(100),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutPayloadSchema = z.object({
  sessionId: z.string().uuid().optional(),
  name: checkoutFieldSchema.shape.name,
  phone: checkoutFieldSchema.shape.phone,
  districtArea: checkoutFieldSchema.shape.districtArea,
  address: checkoutFieldSchema.shape.address,
  note: checkoutFieldSchema.shape.note,
  deliveryMethod: checkoutFieldSchema.shape.deliveryMethod,
  deliveryLocation: checkoutFieldSchema.shape.deliveryLocation,
  paymentMethod: checkoutFieldSchema.shape.paymentMethod,
  items: z
    .array(checkoutItemSchema)
    .min(1, 'Cart must have at least one item')
    .max(MAX_CART_LINES, `Cart must have at most ${MAX_CART_LINES} items`),
});

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly')
    .optional()
    .or(z.literal('')),
  imageUrl: z.string().url().optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const variantInputSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  regularPrice: z.number().positive(),
  stock: z.number().int().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(50),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().uuid(),
  shortDescription: z.string().trim().max(500).optional().default(''),
  fullDescription: z.string().trim().max(50000).optional().default(''),
  regularPrice: z.number().positive(),
  discountEnabled: z.boolean().default(false),
  discountPercent: z.number().int().min(0).max(100).default(0),
  stock: z.number().int().min(0).default(0),
  trackInventory: z.boolean().default(true),
  lowStockThreshold: z.number().int().min(0).default(5),
  featuredFlag: z.boolean().default(false),
  bestSellerRank: z.number().int().positive().nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  variants: z.array(variantInputSchema).optional().default([]),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  variants: z.array(variantInputSchema.extend({ id: z.string().optional() })).optional(),
});

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export const staffRoleSchema = z.enum(['admin', 'moderator']);

export const statusTransitionSchema = z.object({
  toStatus: z.string().min(1),
  note: z.string().trim().max(1000).optional().default(''),
  version: z.number().int().positive(),
});

export const orderStatusSchema = z.enum([
  'New',
  'Pending',
  'Connected',
  'NotConnected',
  'Confirmed',
  'CourierSubmitted',
  'InProgress',
  'Delivered',
  'Cancelled',
  'Returned',
]);

export const orderNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note cannot be empty').max(MAX_NOTE, `Note must be at most ${MAX_NOTE} characters`),
});
