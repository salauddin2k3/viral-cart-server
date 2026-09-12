import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function calcFinal(price: number, enabled: boolean, pct: number): number {
  if (!enabled) return price;
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

// ---------------------------------------------------------------------------
// CATEGORY DEFINITIONS
// ---------------------------------------------------------------------------

interface SubDef {
  name: string;
  slug: string;
}

interface CategoryDef {
  name: string;
  slug: string;
  imageUrl: string;
  subcategories: SubDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: 'Jewelry',
    slug: 'jewelry',
    imageUrl: 'https://picsum.photos/seed/jewelry-category/400/400',
    subcategories: [
      { name: 'Rings', slug: 'rings' },
      { name: 'Necklaces', slug: 'necklaces' },
      { name: 'Bracelets', slug: 'bracelets' },
    ],
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    imageUrl: 'https://picsum.photos/seed/electronics-category/400/400',
    subcategories: [
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Headphones', slug: 'headphones' },
      { name: 'Smart Watches', slug: 'smart-watches' },
    ],
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    imageUrl: 'https://picsum.photos/seed/clothing-category/400/400',
    subcategories: [
      { name: 'T-Shirts', slug: 't-shirts' },
      { name: 'Shirts', slug: 'shirts' },
      { name: 'Panjabi', slug: 'panjabi' },
    ],
  },
];

// ---------------------------------------------------------------------------
// PRODUCT DEFINITIONS
// ---------------------------------------------------------------------------

interface VariantDef {
  name: string;
  skuSuffix: string;
  regularPrice: number;
  discountEnabled: boolean;
  discountPercent: number;
  stock: number;
  sortOrder: number;
}

interface ProductDef {
  name: string;
  sku: string;
  subSlug: string;
  shortDesc: string;
  fullDesc: string;
  regularPrice: number;
  discountEnabled: boolean;
  discountPercent: number;
  stock: number;
  featuredFlag: boolean;
  bestSellerRank: number | null;
  variants?: VariantDef[];
}

const PRODUCTS: ProductDef[] = [
  // =========================================================================
  // JEWELRY — Rings
  // =========================================================================
  {
    name: 'Classic Gold Ring',
    sku: 'JWL-RNG-001',
    subSlug: 'rings',
    shortDesc: 'Elegant 21K gold ring with a timeless design.',
    fullDesc:
      'Crafted from 21K gold, this classic ring features a polished finish and a comfortable fit. Perfect for daily wear or special occasions. Comes with a certificate of authenticity.',
    regularPrice: 12500,
    discountEnabled: false,
    discountPercent: 0,
    stock: 25,
    featuredFlag: true,
    bestSellerRank: 1,
  },
  {
    name: 'Minimal Silver Ring',
    sku: 'JWL-RNG-002',
    subSlug: 'rings',
    shortDesc: 'Sleek sterling silver ring with a minimal aesthetic.',
    fullDesc:
      '925 sterling silver ring with a brushed matte finish. Lightweight and comfortable for all-day wear. Hypoallergenic and tarnish-resistant.',
    regularPrice: 3200,
    discountEnabled: true,
    discountPercent: 10,
    stock: 40,
    featuredFlag: false,
    bestSellerRank: null,
  },
  {
    name: 'Diamond Solitaire Ring',
    sku: 'JWL-RNG-003',
    subSlug: 'rings',
    shortDesc: 'Stunning 0.5ct diamond solitaire set in 18K white gold.',
    fullDesc:
      'A brilliant 0.5-carat round-cut diamond set in 18K white gold with a four-prong setting. VS1 clarity, G color. Includes GIA certification and luxury gift box.',
    regularPrice: 45000,
    discountEnabled: false,
    discountPercent: 0,
    stock: 10,
    featuredFlag: true,
    bestSellerRank: 3,
  },
  {
    name: 'Rose Gold Band Ring',
    sku: 'JWL-RNG-004',
    subSlug: 'rings',
    shortDesc: 'Delicate rose gold band with a satin finish.',
    fullDesc:
      '18K rose gold band with a subtle satin finish. Versatile design suitable for stacking or wearing solo. Available in sizes 5–10.',
    regularPrice: 8900,
    discountEnabled: true,
    discountPercent: 5,
    stock: 30,
    featuredFlag: false,
    bestSellerRank: null,
  },

  // =========================================================================
  // JEWELRY — Necklaces
  // =========================================================================
  {
    name: 'Elegant Pearl Necklace',
    sku: 'JWL-NCK-001',
    subSlug: 'necklaces',
    shortDesc: 'Lustrous freshwater pearl necklace with gold clasp.',
    fullDesc:
      'A strand of hand-selected freshwater pearls (7–8mm) with a 14K gold lobster clasp. Each pearl is individually knotted for security. Adjustable 16–18 inch length.',
    regularPrice: 18500,
    discountEnabled: true,
    discountPercent: 8,
    stock: 15,
    featuredFlag: true,
    bestSellerRank: 2,
  },
  {
    name: 'Gold Pendant Necklace',
    sku: 'JWL-NCK-002',
    subSlug: 'necklaces',
    shortDesc: '14K gold pendant on a delicate chain.',
    fullDesc:
      'A minimalist 14K gold pendant suspended from a 16-inch cable chain with a spring-ring clasp. Hypoallergenic and suitable for everyday wear. Gift-ready packaging included.',
    regularPrice: 22000,
    discountEnabled: false,
    discountPercent: 0,
    stock: 20,
    featuredFlag: true,
    bestSellerRank: 4,
  },
  {
    name: 'Silver Chain Necklace',
    sku: 'JWL-NCK-003',
    subSlug: 'necklaces',
    shortDesc: 'Versatile sterling silver chain necklace.',
    fullDesc:
      '925 sterling silver 20-inch cable chain. lobster clasp. 2.5mm width for a subtle yet refined look. Can be worn alone or with a pendant.',
    regularPrice: 5800,
    discountEnabled: true,
    discountPercent: 12,
    stock: 35,
    featuredFlag: false,
    bestSellerRank: null,
  },
  {
    name: 'Temple Necklace',
    sku: 'JWL-NCK-004',
    subSlug: 'necklaces',
    shortDesc: 'Traditional temple-style gold-plated necklace.',
    fullDesc:
      'Intricately designed temple necklace with 22K gold plating over brass. Features traditional motifs and green kemp stones. Length: 18 inches with 2-inch extender.',
    regularPrice: 35000,
    discountEnabled: false,
    discountPercent: 0,
    stock: 8,
    featuredFlag: true,
    bestSellerRank: 5,
  },

  // =========================================================================
  // JEWELRY — Bracelets
  // =========================================================================
  {
    name: 'Classic Chain Bracelet',
    sku: 'JWL-BRC-001',
    subSlug: 'bracelets',
    shortDesc: 'Timeless 14K gold chain bracelet.',
    fullDesc:
      '14K yellow gold curb chain bracelet, 7.5 inches. Lobster clasp closure. 3.5mm width for a refined look. Hypoallergenic and tarnish-resistant.',
    regularPrice: 9500,
    discountEnabled: false,
    discountPercent: 0,
    stock: 20,
    featuredFlag: false,
    bestSellerRank: null,
  },
  {
    name: 'Tennis Bracelet',
    sku: 'JWL-BRC-002',
    subSlug: 'bracelets',
    shortDesc: 'Brilliant cubic zirconia tennis bracelet.',
    fullDesc:
      'A sparkling tennis bracelet set with AAAA-grade cubic zirconia stones in a silver-toned setting. Secure box clasp with safety latch. 7 inches.',
    regularPrice: 28000,
    discountEnabled: true,
    discountPercent: 10,
    stock: 12,
    featuredFlag: true,
    bestSellerRank: 6,
  },
  {
    name: 'Gold Bangle Set',
    sku: 'JWL-BRC-003',
    subSlug: 'bracelets',
    shortDesc: 'Set of 3 gold-plated bangles.',
    fullDesc:
      'A set of three 18K gold-plated bangles with polished and textured finishes. Mix and match or wear together. Each bangle is 2.5mm thick and 60mm diameter.',
    regularPrice: 15000,
    discountEnabled: true,
    discountPercent: 15,
    stock: 18,
    featuredFlag: false,
    bestSellerRank: 7,
  },

  // =========================================================================
  // ELECTRONICS — Smartphones
  // =========================================================================
  {
    name: 'Samsung Galaxy A15',
    sku: 'ELC-MOB-001',
    subSlug: 'smartphones',
    shortDesc: '6.5" Super AMOLED display smartphone.',
    fullDesc:
      'Samsung Galaxy A15 with 6.5" Super AMOLED display, MediaTek Helio G99 processor, 5000mAh battery, and 50MP triple camera system. Perfect for daily use.',
    regularPrice: 15999,
    discountEnabled: true,
    discountPercent: 10,
    stock: 25,
    featuredFlag: true,
    bestSellerRank: 1,
    variants: [
      { name: '128GB', skuSuffix: 'ELC-MOB-001-128', regularPrice: 15999, discountEnabled: true, discountPercent: 10, stock: 15, sortOrder: 0 },
      { name: '256GB', skuSuffix: 'ELC-MOB-001-256', regularPrice: 18999, discountEnabled: true, discountPercent: 8, stock: 10, sortOrder: 1 },
    ],
  },
  {
    name: 'iPhone 15',
    sku: 'ELC-MOB-002',
    subSlug: 'smartphones',
    shortDesc: 'Apple iPhone 15 with A16 Bionic chip.',
    fullDesc:
      'iPhone 15 features the A16 Bionic chip, 48MP main camera, Dynamic Island, and USB-C. 6.1" Super Retina XDR display. All-day battery life.',
    regularPrice: 89999,
    discountEnabled: false,
    discountPercent: 0,
    stock: 15,
    featuredFlag: true,
    bestSellerRank: 2,
    variants: [
      { name: '128GB', skuSuffix: 'ELC-MOB-002-128', regularPrice: 89999, discountEnabled: false, discountPercent: 0, stock: 8, sortOrder: 0 },
      { name: '256GB', skuSuffix: 'ELC-MOB-002-256', regularPrice: 99999, discountEnabled: false, discountPercent: 0, stock: 5, sortOrder: 1 },
      { name: '512GB', skuSuffix: 'ELC-MOB-002-512', regularPrice: 119999, discountEnabled: false, discountPercent: 0, stock: 2, sortOrder: 2 },
    ],
  },
  {
    name: 'Xiaomi Redmi Note 13',
    sku: 'ELC-MOB-003',
    subSlug: 'smartphones',
    shortDesc: '120Hz AMOLED display with 108MP camera.',
    fullDesc:
      'Xiaomi Redmi Note 13 with 6.67" 120Hz AMOLED display, Snapdragon 685, 108MP main camera, 5000mAh battery with 33W fast charging.',
    regularPrice: 18999,
    discountEnabled: true,
    discountPercent: 12,
    stock: 30,
    featuredFlag: true,
    bestSellerRank: 3,
    variants: [
      { name: '128GB', skuSuffix: 'ELC-MOB-003-128', regularPrice: 18999, discountEnabled: true, discountPercent: 12, stock: 20, sortOrder: 0 },
      { name: '256GB', skuSuffix: 'ELC-MOB-003-256', regularPrice: 21999, discountEnabled: true, discountPercent: 10, stock: 10, sortOrder: 1 },
    ],
  },
  {
    name: 'OnePlus 12',
    sku: 'ELC-MOB-004',
    subSlug: 'smartphones',
    shortDesc: 'Flagship Snapdragon 8 Gen 3 with Hasselblad camera.',
    fullDesc:
      'OnePlus 12 features Snapdragon 8 Gen 3, 6.82" 2K 120Hz LTPO display, Hasselblad triple camera, 5400mAh battery with 100W SUPERVOOC charging.',
    regularPrice: 65999,
    discountEnabled: false,
    discountPercent: 0,
    stock: 12,
    featuredFlag: true,
    bestSellerRank: null,
    variants: [
      { name: '256GB', skuSuffix: 'ELC-MOB-004-256', regularPrice: 65999, discountEnabled: false, discountPercent: 0, stock: 7, sortOrder: 0 },
      { name: '512GB', skuSuffix: 'ELC-MOB-004-512', regularPrice: 72999, discountEnabled: false, discountPercent: 0, stock: 5, sortOrder: 1 },
    ],
  },

  // =========================================================================
  // ELECTRONICS — Headphones
  // =========================================================================
  {
    name: 'Sony WH-1000XM5',
    sku: 'ELC-HPH-001',
    subSlug: 'headphones',
    shortDesc: 'Industry-leading noise-cancelling headphones.',
    fullDesc:
      'Sony WH-1000XM5 with Auto NC Optimizer, 30-hour battery life, Multipoint connection, and Speak-to-Chat. Ultra-comfortable design with premium drivers.',
    regularPrice: 32999,
    discountEnabled: true,
    discountPercent: 10,
    stock: 18,
    featuredFlag: true,
    bestSellerRank: 1,
  },
  {
    name: 'JBL Tune 770NC',
    sku: 'ELC-HPH-002',
    subSlug: 'headphones',
    shortDesc: 'Adaptive noise cancelling with JBL Pure Bass.',
    fullDesc:
      'JBL Tune 770NC wireless over-ear headphones with adaptive noise cancelling, JBL Pure Bass sound, 44-hour battery, and foldable design.',
    regularPrice: 8999,
    discountEnabled: true,
    discountPercent: 15,
    stock: 35,
    featuredFlag: false,
    bestSellerRank: 3,
  },
  {
    name: 'AirPods Pro 2',
    sku: 'ELC-HPH-003',
    subSlug: 'headphones',
    shortDesc: 'Apple AirPods Pro 2nd generation with USB-C.',
    fullDesc:
      'AirPods Pro 2 with H2 chip, up to 2x more Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio, and USB-C charging.',
    regularPrice: 28999,
    discountEnabled: false,
    discountPercent: 0,
    stock: 20,
    featuredFlag: true,
    bestSellerRank: 2,
  },
  {
    name: 'Boat Rockerz 550',
    sku: 'ELC-HPH-004',
    subSlug: 'headphones',
    shortDesc: 'Affordable over-ear wireless headphones.',
    fullDesc:
      'Boat Rockerz 550 with 50mm drivers, Bluetooth 5.0, 20-hour playback, padded ear cushions, and lightweight foldable design.',
    regularPrice: 3999,
    discountEnabled: true,
    discountPercent: 20,
    stock: 50,
    featuredFlag: false,
    bestSellerRank: 5,
  },

  // =========================================================================
  // ELECTRONICS — Smart Watches
  // =========================================================================
  {
    name: 'Apple Watch Series 9',
    sku: 'ELC-WCH-001',
    subSlug: 'smart-watches',
    shortDesc: 'Latest Apple Watch with S9 SiP and Double Tap.',
    fullDesc:
      'Apple Watch Series 9 with S9 SiP, brighter Always-On Retina display, Double Tap gesture, precision GPS, and health monitoring (ECG, SpO2, temperature).',
    regularPrice: 42999,
    discountEnabled: false,
    discountPercent: 0,
    stock: 15,
    featuredFlag: true,
    bestSellerRank: 1,
    variants: [
      { name: '41mm', skuSuffix: 'ELC-WCH-001-41', regularPrice: 42999, discountEnabled: false, discountPercent: 0, stock: 8, sortOrder: 0 },
      { name: '45mm', skuSuffix: 'ELC-WCH-001-45', regularPrice: 46999, discountEnabled: false, discountPercent: 0, stock: 7, sortOrder: 1 },
    ],
  },
  {
    name: 'Samsung Galaxy Watch 6',
    sku: 'ELC-WCH-002',
    subSlug: 'smart-watches',
    shortDesc: 'Advanced health tracking with Wear OS.',
    fullDesc:
      'Samsung Galaxy Watch 6 with BioActive Sensor, sapphire crystal display, Wear OS, sleep coaching, and 40-hour battery life.',
    regularPrice: 28999,
    discountEnabled: true,
    discountPercent: 10,
    stock: 20,
    featuredFlag: true,
    bestSellerRank: 2,
    variants: [
      { name: '40mm', skuSuffix: 'ELC-WCH-002-40', regularPrice: 28999, discountEnabled: true, discountPercent: 10, stock: 12, sortOrder: 0 },
      { name: '44mm', skuSuffix: 'ELC-WCH-002-44', regularPrice: 31999, discountEnabled: true, discountPercent: 8, stock: 8, sortOrder: 1 },
    ],
  },
  {
    name: 'Amazfit GTR 4',
    sku: 'ELC-WCH-003',
    subSlug: 'smart-watches',
    shortDesc: 'Premium smartwatch with 14-day battery life.',
    fullDesc:
      'Amazfit GTR 4 with 1.43" AMOLED display, dual-band GPS, 14-day battery, 150+ sports modes, and health monitoring (heart rate, SpO2, stress).',
    regularPrice: 18999,
    discountEnabled: true,
    discountPercent: 15,
    stock: 22,
    featuredFlag: false,
    bestSellerRank: 4,
  },

  // =========================================================================
  // CLOTHING — T-Shirts
  // =========================================================================
  {
    name: 'Premium Cotton T-Shirt',
    sku: 'CLO-TSH-001',
    subSlug: 't-shirts',
    shortDesc: '100% premium cotton crew neck t-shirt.',
    fullDesc:
      'Made from 100% combed cotton (180 GSM) for a soft, breathable feel. Pre-shrunk fabric, reinforced shoulders, and a modern regular fit. Machine washable.',
    regularPrice: 899,
    discountEnabled: false,
    discountPercent: 0,
    stock: 100,
    featuredFlag: false,
    bestSellerRank: null,
    variants: [
      { name: 'S', skuSuffix: 'CLO-TSH-001-S', regularPrice: 899, discountEnabled: false, discountPercent: 0, stock: 25, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-TSH-001-M', regularPrice: 899, discountEnabled: false, discountPercent: 0, stock: 30, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-TSH-001-L', regularPrice: 899, discountEnabled: false, discountPercent: 0, stock: 25, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-TSH-001-XL', regularPrice: 899, discountEnabled: false, discountPercent: 0, stock: 20, sortOrder: 3 },
    ],
  },
  {
    name: 'Graphic Print T-Shirt',
    sku: 'CLO-TSH-002',
    subSlug: 't-shirts',
    shortDesc: 'Bold graphic print on premium cotton.',
    fullDesc:
      'Eye-catching graphic print on 100% cotton (180 GSM). Water-based eco-friendly ink that won\'t crack or fade. Regular fit with ribbed crew neck.',
    regularPrice: 1199,
    discountEnabled: true,
    discountPercent: 10,
    stock: 75,
    featuredFlag: true,
    bestSellerRank: 2,
    variants: [
      { name: 'S', skuSuffix: 'CLO-TSH-002-S', regularPrice: 1199, discountEnabled: true, discountPercent: 10, stock: 20, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-TSH-002-M', regularPrice: 1199, discountEnabled: true, discountPercent: 10, stock: 25, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-TSH-002-L', regularPrice: 1199, discountEnabled: true, discountPercent: 10, stock: 20, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-TSH-002-XL', regularPrice: 1199, discountEnabled: true, discountPercent: 10, stock: 10, sortOrder: 3 },
    ],
  },
  {
    name: 'Polo T-Shirt',
    sku: 'CLO-TSH-003',
    subSlug: 't-shirts',
    shortDesc: 'Classic polo t-shirt with collar.',
    fullDesc:
      'Premium cotton pique polo shirt with a two-button placket and embroidered logo. Ribbed collar and cuffs. Smart casual fit.',
    regularPrice: 1499,
    discountEnabled: false,
    discountPercent: 0,
    stock: 60,
    featuredFlag: true,
    bestSellerRank: 3,
    variants: [
      { name: 'S', skuSuffix: 'CLO-TSH-003-S', regularPrice: 1499, discountEnabled: false, discountPercent: 0, stock: 15, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-TSH-003-M', regularPrice: 1499, discountEnabled: false, discountPercent: 0, stock: 20, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-TSH-003-L', regularPrice: 1499, discountEnabled: false, discountPercent: 0, stock: 15, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-TSH-003-XL', regularPrice: 1499, discountEnabled: false, discountPercent: 0, stock: 10, sortOrder: 3 },
    ],
  },
  {
    name: 'V-Neck T-Shirt',
    sku: 'CLO-TSH-004',
    subSlug: 't-shirts',
    shortDesc: 'Slim-fit V-neck t-shirt.',
    fullDesc:
      '100% cotton V-neck t-shirt with a slim, flattering fit. Lightweight 150 GSM fabric. Reinforced seams and tag-free comfort label.',
    regularPrice: 799,
    discountEnabled: true,
    discountPercent: 15,
    stock: 80,
    featuredFlag: false,
    bestSellerRank: null,
    variants: [
      { name: 'S', skuSuffix: 'CLO-TSH-004-S', regularPrice: 799, discountEnabled: true, discountPercent: 15, stock: 20, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-TSH-004-M', regularPrice: 799, discountEnabled: true, discountPercent: 15, stock: 25, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-TSH-004-L', regularPrice: 799, discountEnabled: true, discountPercent: 15, stock: 20, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-TSH-004-XL', regularPrice: 799, discountEnabled: true, discountPercent: 15, stock: 15, sortOrder: 3 },
    ],
  },

  // =========================================================================
  // CLOTHING — Shirts
  // =========================================================================
  {
    name: 'Classic Casual Shirt',
    sku: 'CLO-SHT-001',
    subSlug: 'shirts',
    shortDesc: 'Relaxed-fit casual cotton shirt.',
    fullDesc:
      '100% cotton casual shirt with a relaxed fit. Button-down collar, single chest pocket. Pre-washed for softness. Perfect for weekends and casual outings.',
    regularPrice: 1899,
    discountEnabled: false,
    discountPercent: 0,
    stock: 45,
    featuredFlag: true,
    bestSellerRank: 1,
    variants: [
      { name: 'S', skuSuffix: 'CLO-SHT-001-S', regularPrice: 1899, discountEnabled: false, discountPercent: 0, stock: 10, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-SHT-001-M', regularPrice: 1899, discountEnabled: false, discountPercent: 0, stock: 15, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-SHT-001-L', regularPrice: 1899, discountEnabled: false, discountPercent: 0, stock: 12, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-SHT-001-XL', regularPrice: 1899, discountEnabled: false, discountPercent: 0, stock: 8, sortOrder: 3 },
    ],
  },
  {
    name: 'Formal Dress Shirt',
    sku: 'CLO-SHT-002',
    subSlug: 'shirts',
    shortDesc: 'Slim-fit non-iron formal shirt.',
    fullDesc:
      'Premium wrinkle-resistant cotton blend. Slim-fit design with a spread collar, French placket, and adjustable cuffs. Ideal for office and formal events.',
    regularPrice: 2499,
    discountEnabled: true,
    discountPercent: 10,
    stock: 35,
    featuredFlag: true,
    bestSellerRank: 2,
    variants: [
      { name: 'S', skuSuffix: 'CLO-SHT-002-S', regularPrice: 2499, discountEnabled: true, discountPercent: 10, stock: 8, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-SHT-002-M', regularPrice: 2499, discountEnabled: true, discountPercent: 10, stock: 12, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-SHT-002-L', regularPrice: 2499, discountEnabled: true, discountPercent: 10, stock: 10, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-SHT-002-XL', regularPrice: 2499, discountEnabled: true, discountPercent: 10, stock: 5, sortOrder: 3 },
    ],
  },
  {
    name: 'Oxford Button-Down',
    sku: 'CLO-SHT-003',
    subSlug: 'shirts',
    shortDesc: 'Classic Oxford cloth button-down shirt.',
    fullDesc:
      'Authentic Oxford weave cotton, button-down collar, and a box pleat at the back. Durable and versatile — works tucked in or untucked.',
    regularPrice: 2199,
    discountEnabled: false,
    discountPercent: 0,
    stock: 40,
    featuredFlag: false,
    bestSellerRank: null,
    variants: [
      { name: 'S', skuSuffix: 'CLO-SHT-003-S', regularPrice: 2199, discountEnabled: false, discountPercent: 0, stock: 10, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-SHT-003-M', regularPrice: 2199, discountEnabled: false, discountPercent: 0, stock: 12, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-SHT-003-L', regularPrice: 2199, discountEnabled: false, discountPercent: 0, stock: 10, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-SHT-003-XL', regularPrice: 2199, discountEnabled: false, discountPercent: 0, stock: 8, sortOrder: 3 },
    ],
  },
  {
    name: 'Linen Summer Shirt',
    sku: 'CLO-SHT-004',
    subSlug: 'shirts',
    shortDesc: 'Breathable linen shirt for hot weather.',
    fullDesc:
      '100% natural linen shirt with a relaxed fit. Camp collar, short sleeves, and a straight hem. Perfect for summer and tropical climates.',
    regularPrice: 1999,
    discountEnabled: true,
    discountPercent: 12,
    stock: 30,
    featuredFlag: false,
    bestSellerRank: null,
    variants: [
      { name: 'S', skuSuffix: 'CLO-SHT-004-S', regularPrice: 1999, discountEnabled: true, discountPercent: 12, stock: 8, sortOrder: 0 },
      { name: 'M', skuSuffix: 'CLO-SHT-004-M', regularPrice: 1999, discountEnabled: true, discountPercent: 12, stock: 10, sortOrder: 1 },
      { name: 'L', skuSuffix: 'CLO-SHT-004-L', regularPrice: 1999, discountEnabled: true, discountPercent: 12, stock: 8, sortOrder: 2 },
      { name: 'XL', skuSuffix: 'CLO-SHT-004-XL', regularPrice: 1999, discountEnabled: true, discountPercent: 12, stock: 4, sortOrder: 3 },
    ],
  },

  // =========================================================================
  // CLOTHING — Panjabi
  // =========================================================================
  {
    name: 'Premium Panjabi',
    sku: 'CLO-PNJ-001',
    subSlug: 'panjabi',
    shortDesc: 'Elegant cotton panjabi for festive occasions.',
    fullDesc:
      'Soft cotton panjabi with embroidered neckline and front placket. Side pockets and a modern regular fit. Ideal for Eid, weddings, and cultural events.',
    regularPrice: 3499,
    discountEnabled: false,
    discountPercent: 0,
    stock: 25,
    featuredFlag: true,
    bestSellerRank: 1,
    variants: [
      { name: 'M', skuSuffix: 'CLO-PNJ-001-M', regularPrice: 3499, discountEnabled: false, discountPercent: 0, stock: 8, sortOrder: 0 },
      { name: 'L', skuSuffix: 'CLO-PNJ-001-L', regularPrice: 3499, discountEnabled: false, discountPercent: 0, stock: 10, sortOrder: 1 },
      { name: 'XL', skuSuffix: 'CLO-PNJ-001-XL', regularPrice: 3499, discountEnabled: false, discountPercent: 0, stock: 7, sortOrder: 2 },
    ],
  },
  {
    name: 'Silk Panjabi',
    sku: 'CLO-PNJ-002',
    subSlug: 'panjabi',
    shortDesc: 'Luxurious silk panjabi with intricate weaving.',
    fullDesc:
      'Pure silk panjabi with zari border and hand-finished details. Mandarin collar, full-length front button placket. Includes matching inner shirt.',
    regularPrice: 5999,
    discountEnabled: true,
    discountPercent: 8,
    stock: 15,
    featuredFlag: true,
    bestSellerRank: 2,
    variants: [
      { name: 'M', skuSuffix: 'CLO-PNJ-002-M', regularPrice: 5999, discountEnabled: true, discountPercent: 8, stock: 5, sortOrder: 0 },
      { name: 'L', skuSuffix: 'CLO-PNJ-002-L', regularPrice: 5999, discountEnabled: true, discountPercent: 8, stock: 6, sortOrder: 1 },
      { name: 'XL', skuSuffix: 'CLO-PNJ-002-XL', regularPrice: 5999, discountEnabled: true, discountPercent: 8, stock: 4, sortOrder: 2 },
    ],
  },
  {
    name: 'Cotton Panjabi',
    sku: 'CLO-PNJ-003',
    subSlug: 'panjabi',
    shortDesc: 'Everyday cotton panjabi at an affordable price.',
    fullDesc:
      'Breathable cotton panjabi with a simple, clean design. Mandarin collar and side slits. Machine washable — great value for everyday wear.',
    regularPrice: 2499,
    discountEnabled: true,
    discountPercent: 15,
    stock: 30,
    featuredFlag: false,
    bestSellerRank: 4,
    variants: [
      { name: 'M', skuSuffix: 'CLO-PNJ-003-M', regularPrice: 2499, discountEnabled: true, discountPercent: 15, stock: 10, sortOrder: 0 },
      { name: 'L', skuSuffix: 'CLO-PNJ-003-L', regularPrice: 2499, discountEnabled: true, discountPercent: 15, stock: 12, sortOrder: 1 },
      { name: 'XL', skuSuffix: 'CLO-PNJ-003-XL', regularPrice: 2499, discountEnabled: true, discountPercent: 15, stock: 8, sortOrder: 2 },
    ],
  },
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Seed Reset Script ===\n');

  // -------------------------------------------------------------------------
  // 1. Handle existing products (soft-delete or hard-delete)
  // -------------------------------------------------------------------------
  console.log('Step 1: Handling existing products...');

  const existingProducts = await prisma.product.findMany({
    select: { id: true, name: true, sku: true },
    orderBy: { createdAt: 'asc' },
  });

  let softDeleted = 0;
  let hardDeleted = 0;

  for (const product of existingProducts) {
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: product.id },
    });
    const checkoutItemCount = await prisma.checkoutSessionItem.count({
      where: { productId: product.id },
    });
    const hasReferences = orderItemCount > 0 || checkoutItemCount > 0;

    if (hasReferences) {
      await prisma.product.update({
        where: { id: product.id },
        data: { deletedAt: new Date(), status: 'inactive', sku: `LEGACY-${product.sku}` },
      });
      softDeleted++;
      console.log(`  [soft-delete] ${product.name} (has order/checkout references)`);
    } else {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productVariant.deleteMany({ where: { productId: product.id } });
      await prisma.product.delete({ where: { id: product.id } });
      hardDeleted++;
      console.log(`  [hard-delete] ${product.name}`);
    }
  }
  console.log(`  Products: ${softDeleted} soft-deleted, ${hardDeleted} hard-deleted\n`);

  // -------------------------------------------------------------------------
  // 2. Reassign soft-deleted products to a legacy bucket, then delete categories
  // -------------------------------------------------------------------------
  console.log('Step 2: Handling categories...');

  // Check if any soft-deleted products still reference categories
  const orphanProducts = await prisma.product.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, categoryId: true },
  });

  if (orphanProducts.length > 0) {
    // Create or find a "Legacy" category to hold orphaned products
    let legacyCategory = await prisma.category.findFirst({
      where: { slug: 'legacy-products' },
    });
    if (!legacyCategory) {
      legacyCategory = await prisma.category.create({
        data: { name: 'Legacy Products', slug: 'legacy-products', status: 'inactive' },
      });
      console.log('  Created legacy category for orphaned products');
    }

    for (const p of orphanProducts) {
      if (p.categoryId !== legacyCategory.id) {
        await prisma.product.update({
          where: { id: p.id },
          data: { categoryId: legacyCategory.id },
        });
      }
    }
    console.log(`  Reassigned ${orphanProducts.length} soft-deleted product(s) to legacy category`);
  }

  // Now safe to delete all categories except the legacy one
  await prisma.category.deleteMany({
    where: { slug: { not: 'legacy-products' } },
  });
  console.log('  Old categories deleted (legacy preserved).\n');

  // -------------------------------------------------------------------------
  // 3. Create parent categories
  // -------------------------------------------------------------------------
  console.log('Step 3: Creating parent categories...');
  const parentCategoryIds: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.imageUrl,
        status: 'active',
      },
    });
    parentCategoryIds[cat.slug] = parent.id;
    console.log(`  [+] ${cat.name} (${cat.slug})`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 4. Create subcategories
  // -------------------------------------------------------------------------
  console.log('Step 4: Creating subcategories...');
  const subcategoryIds: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const parentId = parentCategoryIds[cat.slug];
    for (const sub of cat.subcategories) {
      const created = await prisma.category.create({
        data: {
          name: sub.name,
          slug: sub.slug,
          status: 'active',
          parentCategoryId: parentId,
        },
      });
      subcategoryIds[sub.slug] = created.id;
      console.log(`  [+] ${sub.name} (${sub.slug})`);
    }
  }
  console.log();

  // -------------------------------------------------------------------------
  // 5. Create products with images
  // -------------------------------------------------------------------------
  console.log('Step 5: Creating products...');
  let productCount = 0;
  let imageCount = 0;
  let variantCount = 0;

  for (const prod of PRODUCTS) {
    const categoryId = subcategoryIds[prod.subSlug];
    if (!categoryId) {
      console.log(`  [!] Skipping ${prod.name} — subcategory "${prod.subSlug}" not found`);
      continue;
    }

    const finalPrice = calcFinal(prod.regularPrice, prod.discountEnabled, prod.discountPercent);

    const product = await prisma.product.create({
      data: {
        name: prod.name,
        sku: prod.sku,
        slug: slugify(prod.name),
        nameSearch: prod.name,
        categoryId,
        shortDescription: prod.shortDesc,
        fullDescription: prod.fullDesc,
        regularPrice: prod.regularPrice,
        discountEnabled: prod.discountEnabled,
        discountPercent: prod.discountPercent,
        finalPrice,
        stock: prod.stock,
        trackInventory: true,
        lowStockThreshold: 5,
        featuredFlag: prod.featuredFlag,
        bestSellerRank: prod.bestSellerRank,
        status: 'active',
      },
    });

    // Create product image
    const imageUrl = `https://picsum.photos/seed/${slugify(prod.name)}/400/400`;
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: imageUrl,
        altText: prod.name,
        sortOrder: 0,
      },
    });
    imageCount++;
    productCount++;

    // Create variants (if any)
    if (prod.variants && prod.variants.length > 0) {
      for (const v of prod.variants) {
        const variantFinalPrice = calcFinal(v.regularPrice, v.discountEnabled, v.discountPercent);
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            sku: v.skuSuffix,
            regularPrice: v.regularPrice,
            discountEnabled: v.discountEnabled,
            discountPercent: v.discountPercent,
            finalPrice: variantFinalPrice,
            stock: v.stock,
            status: 'active',
            sortOrder: v.sortOrder,
          },
        });
        variantCount++;
      }
    }

    const variantNote = prod.variants ? ` (${prod.variants.length} variants)` : '';
    console.log(`  [+] ${prod.name} — ৳${prod.regularPrice} (${prod.sku})${variantNote}`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 6. Summary
  // -------------------------------------------------------------------------
  const totalCategories = await prisma.category.count();
  const totalProducts = await prisma.product.count({ where: { deletedAt: null } });
  const totalImages = await prisma.productImage.count();
  const totalVariants = await prisma.productVariant.count();

  console.log('=== Summary ===');
  console.log(`  Categories:     ${totalCategories}`);
  console.log(`  Products:       ${totalProducts}`);
  console.log(`  Product Images: ${totalImages}`);
  console.log(`  Product Variants: ${totalVariants}`);
  console.log(`  Products Created (this run): ${productCount}`);
  console.log(`  Images Created (this run):   ${imageCount}`);
  console.log(`  Variants Created (this run): ${variantCount}`);
  console.log('\nSeed reset complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
