import { z } from 'zod';
export declare const MAX_NAME = 120;
export declare const MAX_ADDRESS = 500;
export declare const MAX_NOTE = 1000;
export declare const MAX_CART_LINES = 60;
export declare const checkoutFieldSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    districtArea: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    address: z.ZodString;
    note: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    deliveryMethod: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    deliveryLocation: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        inside_dhaka: "inside_dhaka";
        dhaka_sub: "dhaka_sub";
        outside_dhaka: "outside_dhaka";
    }>>>;
    paymentMethod: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type CheckoutFields = z.infer<typeof checkoutFieldSchema>;
export declare const checkoutItemSchema: z.ZodObject<{
    productId: z.ZodString;
    variantId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    unitPrice: z.ZodNumber;
    discountPercent: z.ZodNumber;
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const checkoutPayloadSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    phone: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    districtArea: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    address: z.ZodString;
    note: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    deliveryMethod: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    deliveryLocation: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        inside_dhaka: "inside_dhaka";
        dhaka_sub: "dhaka_sub";
        outside_dhaka: "outside_dhaka";
    }>>>;
    paymentMethod: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        variantId: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        unitPrice: z.ZodNumber;
        discountPercent: z.ZodNumber;
        quantity: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;
export declare const categoryCreateSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    imageUrl: z.ZodOptional<z.ZodString>;
    parentCategoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const categoryUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    imageUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parentCategoryId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const variantInputSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    regularPrice: z.ZodNumber;
    stock: z.ZodDefault<z.ZodNumber>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const productCreateSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    slug: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    categoryId: z.ZodString;
    shortDescription: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    fullDescription: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    regularPrice: z.ZodNumber;
    discountEnabled: z.ZodDefault<z.ZodBoolean>;
    discountPercent: z.ZodDefault<z.ZodNumber>;
    stock: z.ZodDefault<z.ZodNumber>;
    trackInventory: z.ZodDefault<z.ZodBoolean>;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
    featuredFlag: z.ZodDefault<z.ZodBoolean>;
    bestSellerRank: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    status: z.ZodDefault<z.ZodEnum<{
        active: "active";
        inactive: "inactive";
    }>>;
    variants: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        sku: z.ZodString;
        regularPrice: z.ZodNumber;
        stock: z.ZodDefault<z.ZodNumber>;
        sortOrder: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export declare const productUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    categoryId: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    fullDescription: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    regularPrice: z.ZodOptional<z.ZodNumber>;
    discountEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    discountPercent: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    stock: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    trackInventory: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    lowStockThreshold: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    featuredFlag: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    bestSellerRank: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        active: "active";
        inactive: "inactive";
    }>>>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        sku: z.ZodString;
        regularPrice: z.ZodNumber;
        stock: z.ZodDefault<z.ZodNumber>;
        sortOrder: z.ZodDefault<z.ZodNumber>;
        id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export declare const staffRoleSchema: z.ZodEnum<{
    admin: "admin";
    moderator: "moderator";
}>;
export declare const statusTransitionSchema: z.ZodObject<{
    toStatus: z.ZodString;
    note: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    version: z.ZodNumber;
}, z.core.$strip>;
export declare const orderStatusSchema: z.ZodEnum<{
    Pending: "Pending";
    New: "New";
    Connected: "Connected";
    NotConnected: "NotConnected";
    Confirmed: "Confirmed";
    CourierSubmitted: "CourierSubmitted";
    InProgress: "InProgress";
    Delivered: "Delivered";
    Cancelled: "Cancelled";
    Returned: "Returned";
}>;
export declare const orderNoteSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=validate.d.ts.map