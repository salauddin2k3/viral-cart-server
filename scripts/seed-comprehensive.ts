import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

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
// DATA DEFINITIONS
// ---------------------------------------------------------------------------

interface SubDef {
  name: string;
  slug: string;
}

interface ProductDef {
  name: string;
  sku: string;
  shortDesc: string;
  fullDesc: string;
  regularPrice: number;
  discountEnabled: boolean;
  discountPercent: number;
  stock: number;
  featuredFlag: boolean;
  bestSellerRank: number | null;
}

interface CategoryDef {
  name: string;
  slug: string;
  subcategories: SubDef[];
  products: ProductDef[];
}

const CATEGORIES: CategoryDef[] = [
  // 1. Electronics
  {
    name: 'ইলেকট্রনিক্স',
    slug: 'electronics',
    subcategories: [
      { name: 'মোবাইল ফোন', slug: 'mobile-phones' },
      { name: 'ল্যাপটপ ও কম্পিউটার', slug: 'laptops-computers' },
      { name: 'অডিও', slug: 'audio' },
      { name: 'ওয়্যারলেস ডিভাইস', slug: 'wireless-devices' },
      { name: 'পাওয়ার ব্যাংক', slug: 'power-banks' },
    ],
    products: [
      {
        name: 'স্যামসাং গ্যালাক্সি A15',
        sku: 'ELC-MOB-001',
        shortDesc: '৬.৫ ইঞ্চি সুপার AMOLED ডিসপ্লে সহ স্মার্টফোন।',
        fullDesc: 'স্যামসাং গ্যালাক্সি A15 ৬.৫ ইঞ্চি সুপার AMOLED ডিসপ্লে, MediaTek Helio G99 প্রসেসর, ৫০০০mAh ব্যাটারি এবং ৫০MP ট্রিপল ক্যামেরা সিস্টেম। দৈনিক ব্যবহারের জন্য আদর্শ।',
        regularPrice: 15999,
        discountEnabled: true,
        discountPercent: 10,
        stock: 25,
        featuredFlag: true,
        bestSellerRank: 1,
      },
      {
        name: 'লেনোভো আইডিয়াপ্যাড ৩',
        sku: 'ELC-LAP-002',
        shortDesc: '১৪" ফুল HD ডিসপ্লে সহ ল্যাপটপ।',
        fullDesc: 'লেনোভো আইডিয়াপ্যাড ৩ ১৪" ফুল HD IPS ডিসপ্লে, Intel Core i5-1235U, ৮GB RAM, ৫১২GB SSD। পাতলা ও হালকা ডিজাইন, অফিস ও স্টুডেন্টদের জন্য উপযুক্ত।',
        regularPrice: 52999,
        discountEnabled: false,
        discountPercent: 0,
        stock: 15,
        featuredFlag: true,
        bestSellerRank: null,
      },
      {
        name: 'JBL টুর প্লাস ইয়ারবাড',
        sku: 'ELC-AUD-003',
        shortDesc: 'অ্যাকটিভ নয়েজ ক্যানসেলিং ইয়ারবাড।',
        fullDesc: 'JBL টুর প্লাস ট্রু ওয়্যারলেস ইয়ারবাড, অ্যাকটিভ নয়েজ ক্যানসেলিং, ৩০ ঘণ্টা ব্যাটারি, IPX৫ ওয়াটারপ্রুফ। সুপিরিয়র সাউন্ড কোয়ালিটি।',
        regularPrice: 3499,
        discountEnabled: true,
        discountPercent: 15,
        stock: 40,
        featuredFlag: false,
        bestSellerRank: 3,
      },
    ],
  },

  // 2. Fashion
  {
    name: 'ফ্যাশন',
    slug: 'fashion',
    subcategories: [
      { name: 'পুরুষদের পোশাক', slug: 'mens-clothing' },
      { name: 'মহিলাদের পোশাক', slug: 'womens-clothing' },
      { name: 'শিশুদের পোশাক', slug: 'kids-clothing' },
      { name: 'ট্র্যাডিশনাল', slug: 'traditional' },
      { name: 'ক্যাজুয়াল', slug: 'casual' },
    ],
    products: [
      {
        name: 'ক্যাজুয়াল পলো শার্ট',
        sku: 'FAS-POLO-001',
        shortDesc: '১০০% কটন পলো শার্ট, দৈনিক ব্যবহারের জন্য আদর্শ।',
        fullDesc: 'প্রিমিয়াম কটন দিয়ে তৈরি পলো শার্ট। সামঞ্জস্যপূর্ণ ফিট, আধুনিক ডিজাইন। যেকোনো অনুষ্ঠান বা অফিসে পরিধানের জন্য উপযুক্ত।',
        regularPrice: 1299,
        discountEnabled: true,
        discountPercent: 15,
        stock: 45,
        featuredFlag: true,
        bestSellerRank: 2,
      },
      {
        name: 'এমব্রয়ডারি কুর্তি',
        sku: 'FAS-KURT-002',
        shortDesc: 'হাতে বোনা এমব্রয়ডারি সহ সুন্দর কুর্তি।',
        fullDesc: 'প্রিমিয়াম জরি ও রেশমি থ্রেড দিয়ে হাতে বোনা এমব্রয়ডারি। সুতির কাপড় যা ত্বকের জন্য নিরাপদ। পার্টি ও অনুষ্ঠানের জন্য আদর্শ।',
        regularPrice: 1599,
        discountEnabled: true,
        discountPercent: 10,
        stock: 35,
        featuredFlag: true,
        bestSellerRank: 1,
      },
    ],
  },

  // 3. Home & Kitchen
  {
    name: 'হোম অ্যান্ড কিচেন',
    slug: 'home-kitchen',
    subcategories: [
      { name: 'কুকওয়্যার', slug: 'cookware' },
      { name: 'বেডিং', slug: 'bedding' },
      { name: 'বোতল ও মগ', slug: 'bottles-mugs' },
      { name: 'এয়ার পিউরিফায়ার', slug: 'air-purifiers' },
      { name: 'রান্নাঘরের যন্ত্রপাতি', slug: 'kitchen-appliances' },
    ],
    products: [
      {
        name: 'নন-স্টিক কুকওয়্যার সেট',
        sku: 'HOM-COOK-001',
        shortDesc: '৫ পিস নন-স্টিক কুকওয়্যার সেট।',
        fullDesc: 'প্রিমিয়াম নন-স্টিক কোটিং সহ ৫ পিস কুকওয়্যার। বেকড কোটিং, বেকেলাইট হ্যান্ডেল। গ্যাস, ইন্ডাকশন ও ইলেকট্রিক চুলায় ব্যবহারযোগ্য।',
        regularPrice: 3499,
        discountEnabled: true,
        discountPercent: 18,
        stock: 15,
        featuredFlag: true,
        bestSellerRank: 6,
      },
      {
        name: 'স্টেইনলেস স্টিল বোতল',
        sku: 'HOM-BOTT-002',
        shortDesc: 'ডুয়াল-ওয়াল ভ্যাকুয়াম ইন্সুলেটেড বোতল।',
        fullDesc: '১৮/৮ স্টেইনলেস স্টিল, ২৪ ঘণ্টা ঠান্ডা, ১২ ঘণ্টা গরম রাখে। ৭৫০ml, লিক-প্রুফ ক্যাপ। BPA-মুক্ত।',
        regularPrice: 899,
        discountEnabled: true,
        discountPercent: 12,
        stock: 100,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 4. Beauty & Personal Care
  {
    name: 'বিউটি অ্যান্ড পার্সোনাল কেয়ার',
    slug: 'beauty-personal-care',
    subcategories: [
      { name: 'স্কিন কেয়ার', slug: 'skin-care' },
      { name: 'হেয়ার কেয়ার', slug: 'hair-care' },
      { name: 'মেকআপ', slug: 'makeup' },
      { name: 'পারফিউম', slug: 'perfume' },
      { name: 'পুরুষদের গ্রুমিং', slug: 'mens-grooming' },
    ],
    products: [
      {
        name: 'ভিটামিন সি সিরাম',
        sku: 'BTY-SERA-001',
        shortDesc: '২০% ভিটামিন সি সিরাম, ৩০ml।',
        fullDesc: '২০% ভিটামিন সি, ভিটামিন ই ও হায়ালুরোনিক এসিড দিয়ে তৈরি। দাগ-কমানো, ত্বকের উজ্জ্বলতা বাড়ানো। সকল ত্বকের জন্য উপযুক্ত।',
        regularPrice: 1299,
        discountEnabled: true,
        discountPercent: 20,
        stock: 60,
        featuredFlag: true,
        bestSellerRank: 7,
      },
      {
        name: 'চালকুমারি হেয়ার অয়েল',
        sku: 'BTY-HAIR-002',
        shortDesc: 'প্রাকৃতিক উপাদানে তৈরি হেয়ার অয়েল।',
        fullDesc: 'চালকুমারি, নারিকেল, আমলা ও ব্রিংগরাজ দিয়ে তৈরি। চুলের গোড়া থেকে পুষ্টি প্রদান করে। ১০০% প্রাকৃতিক।',
        regularPrice: 499,
        discountEnabled: true,
        discountPercent: 15,
        stock: 70,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 5. Health & Wellness
  {
    name: 'হেলথ অ্যান্ড ওয়েলনেস',
    slug: 'health-wellness',
    subcategories: [
      { name: 'সাপ্লিমেন্ট', slug: 'supplements' },
      { name: 'ফিটনেস যন্ত্র', slug: 'fitness-equipment' },
      { name: 'মাসাজ', slug: 'massage' },
      { name: 'থার্মামিটার', slug: 'thermometers' },
      { name: 'ব্লাড প্রেশর', slug: 'blood-pressure' },
    ],
    products: [
      {
        name: 'অমেগা-৩ ফিশ অয়েল',
        sku: 'HLT-OMG-001',
        shortDesc: '১০০০mg ফিশ অয়েল সাপ্লিমেন্ট, ৬০ ক্যাপসুল।',
        fullDesc: 'ইকোসা পেন্টানোয়িক এসিড (EPA) ও ডকোসাহেক্সানোয়িক এসিড (DHA) সমৃদ্ধ। হৃদযন্ত্রের স্বাস্থ্য, মস্তিষ্কের কার্যক্ষমতা ও চোখের স্বাস্থ্যে সহায়ক।',
        regularPrice: 1499,
        discountEnabled: false,
        discountPercent: 0,
        stock: 50,
        featuredFlag: true,
        bestSellerRank: null,
      },
      {
        name: 'রেজিস্ট্যান্স ব্যান্ড সেট',
        sku: 'HLT-RES-002',
        shortDesc: '৫টি রেজিস্ট্যান্স ব্যান্ড, বিভিন্ন শক্তি।',
        fullDesc: '৫টি রেজিস্ট্যান্স ব্যান্ড (১০-৫০ পাউন্ড), বাসায় ফিটনেসের জন্য আদর্শ। ল্যাটেক্স-মুক্ত, টেকসই। বিভিন্ন ওয়ার্কআউটের জন্য উপযুক্ত।',
        regularPrice: 799,
        discountEnabled: true,
        discountPercent: 25,
        stock: 35,
        featuredFlag: false,
        bestSellerRank: 5,
      },
    ],
  },

  // 6. Sports & Outdoors
  {
    name: 'স্পোর্টস অ্যান্ড আউটডোর্স',
    slug: 'sports-outdoors',
    subcategories: [
      { name: 'ক্রিকেট', slug: 'cricket' },
      { name: 'ফুটবল', slug: 'football' },
      { name: 'জিম সরঞ্জাম', slug: 'gym-equipment' },
      { name: 'ক্যাম্পিং', slug: 'camping' },
      { name: 'সাইকেল', slug: 'cycling' },
    ],
    products: [
      {
        name: 'ক্রিকেট ব্যাট (এলিট)',
        sku: 'SPT-CRIC-001',
        shortDesc: 'ক্যাশমারি উইলো ক্রিকেট ব্যাট।',
        fullDesc: 'প্রিমিয়াম ক্যাশমারি উইলো দিয়ে তৈরি, ফুল শেপ, সরিং এরিয়া। হালকা ও শক্তিশালী। প্রফেশনাল ও আধা-প্রফেশনাল খেলোয়াড়দের জন্য উপযুক্ত।',
        regularPrice: 2999,
        discountEnabled: false,
        discountPercent: 0,
        stock: 20,
        featuredFlag: false,
        bestSellerRank: 4,
      },
      {
        name: 'ইয়োগা ম্যাট (৬mm)',
        sku: 'SPT-YOGA-002',
        shortDesc: 'নন-স্লিপ ইয়োগা ম্যাট, ১৮৩×৬১ সেমি।',
        fullDesc: '৬mm পুরু, নন-স্লিপ টেক্সচার, TPE উপাদান। পরিবেশ-বান্ধব, BPA-মুক্ত। ইয়োগা, পিলাটিস ও ফ্লোর এক্সারসাইজের জন্য আদর্শ।',
        regularPrice: 1299,
        discountEnabled: true,
        discountPercent: 20,
        stock: 30,
        featuredFlag: true,
        bestSellerRank: null,
      },
    ],
  },

  // 7. Books & Stationery
  {
    name: 'বই অ্যান্ড স্টেশনারি',
    slug: 'books-stationery',
    subcategories: [
      { name: 'শিক্ষামূলক বই', slug: 'educational-books' },
      { name: 'ফিকশন', slug: 'fiction' },
      { name: 'নোটবুক', slug: 'notebooks' },
      { name: 'পেন ও পেন্সিল', slug: 'pens-pencils' },
      { name: 'অফিস সরঞ্জাম', slug: 'office-supplies-stationery' },
    ],
    products: [
      {
        name: 'বাংলা সাহিত্যের ইতিহাস',
        sku: 'BKS-BAN-001',
        shortDesc: 'বাংলা সাহিত্যের সম্পূর্ণ ইতিহাস।',
        fullDesc: 'মধ্যযুগ থেকে আধুনিক যুগ পর্যন্ত বাংলা সাহিত্যের বিস্তারিত ইতিহাস। ৫০০+ পৃষ্ঠা, রেফারেন্স সহ।',
        regularPrice: 899,
        discountEnabled: false,
        discountPercent: 0,
        stock: 25,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'প্রিমিয়াম নোটবুক সেট',
        sku: 'BKS-NOTE-002',
        shortDesc: '৩টি A5 নোটবুক, ২০০ পৃষ্ঠা প্রতিটি।',
        fullDesc: 'হার্ডকভার, ১০০ GSM পেপার। লাইনড, স্কয়ার ও ব্ল্যান্ক। স্মুথ রাইটিং এক্সপেরিয়েন্স।',
        regularPrice: 599,
        discountEnabled: true,
        discountPercent: 10,
        stock: 80,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 8. Toys & Games
  {
    name: 'টয়স অ্যান্ড গেমস',
    slug: 'toys-games',
    subcategories: [
      { name: 'পাজল', slug: 'puzzles' },
      { name: 'বোর্ড গেমস', slug: 'board-games' },
      { name: 'শিশুদের খেলনা', slug: 'kids-toys' },
      { name: 'রিমোট কন্ট্রোল', slug: 'remote-control' },
      { name: 'শিক্ষামূলক খেলনা', slug: 'educational-toys' },
    ],
    products: [
      {
        name: '১০০০ পিস পাজল',
        sku: 'TOY-PUZ-001',
        shortDesc: '১০০০ পিস জিগস পাজল, ম্যাপ ডিজাইন।',
        fullDesc: '১০০০ পিস জিগস পাজল, মানচিত্র ডিজাইন। উচ্চ মানের কার্ডবোর্ড, প্রিসিশন কাট। ৫০×৭০ সেমি সম্পূর্ণ আকার।',
        regularPrice: 1499,
        discountEnabled: true,
        discountPercent: 15,
        stock: 20,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'বিল্ডিং ব্লক সেট',
        sku: 'TOY-BLD-002',
        shortDesc: '২০০+ পিস বিল্ডিং ব্লক সেট।',
        fullDesc: '২০০+ রঙিন ব্লক, ম্যাগনেটিক। শিশুদের সৃজনশীলতা ও মোটর স্কিল বিকাশে সহায়ক। নিরাপদ, BPA-মুক্ত।',
        regularPrice: 1899,
        discountEnabled: false,
        discountPercent: 0,
        stock: 30,
        featuredFlag: true,
        bestSellerRank: 8,
      },
    ],
  },

  // 9. Grocery & Gourmet
  {
    name: 'গ্রসারি অ্যান্ড গুরমে',
    slug: 'grocery-gourmet',
    subcategories: [
      { name: 'চা ও কফি', slug: 'tea-coffee' },
      { name: 'মসলা', slug: 'spices' },
      { name: 'ড্রাই ফ্রুট', slug: 'dry-fruits' },
      { name: 'অলিভ অয়েল', slug: 'olive-oil' },
      { name: 'চকলেট', slug: 'chocolate' },
    ],
    products: [
      {
        name: 'প্রিমিয়াম গ্রিন টি',
        sku: 'GRC-TEA-001',
        shortDesc: '১০০% অর্গানিক গ্রিন টি, ৫০ টিব্যাগ।',
        fullDesc: 'উচ্চমানের সেচারা পাতা থেকে তৈরি। অ্যান্টিঅক্সিডেন্টে সমৃদ্ধ, মেটাবলিজম বাড়ানো ও ওজন কমাতে সহায়ক।',
        regularPrice: 699,
        discountEnabled: false,
        discountPercent: 0,
        stock: 60,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'বাদাম মিশ্রণ (৫০০g)',
        sku: 'GRC-NUT-002',
        shortDesc: 'পেস্টু, বাদাম, কিশমিশ মিশ্রণ।',
        fullDesc: 'বিশুদ্ধ পেস্টু, আলমন্ড, কাশেউ, কিশমিশ। কোনো প্রেজারভেটিভ নেই। স্ন্যাকিং ও সালাদের জন্য আদর্শ।',
        regularPrice: 599,
        discountEnabled: true,
        discountPercent: 10,
        stock: 45,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 10. Baby Products
  {
    name: 'বেবি প্রোডাক্টস',
    slug: 'baby-products',
    subcategories: [
      { name: 'শিশুদের পোশাক', slug: 'baby-clothing' },
      { name: 'ডায়াপার', slug: 'diapers' },
      { name: 'বেবি ফুড', slug: 'baby-food' },
      { name: 'স্ট্রলার', slug: 'strollers' },
      { name: 'বেবি কেয়ার', slug: 'baby-care' },
    ],
    products: [
      {
        name: 'শিশুদের অল-ওয়েদার জামা',
        sku: 'BAB-ALL-001',
        shortDesc: 'কটন শিশুদের জামা, ৩-৬ মাস।',
        fullDesc: '১০০% অর্গানিক কটন, সফট ও স্কিন-ফ্রেন্ডলি। স্ন্যাপ বাটন ক্লোজার, সহজ পরিধান।',
        regularPrice: 799,
        discountEnabled: true,
        discountPercent: 20,
        stock: 40,
        featuredFlag: true,
        bestSellerRank: null,
      },
      {
        name: 'বেবি ময়েশ্চারাইজার',
        sku: 'BAB-MOIS-002',
        shortDesc: 'জোয়াবা ও ক্যামোমাইল বেবি ময়েশ্চারাইজার।',
        fullDesc: 'সেন্সিটিভ বেবি ত্বকের জন্য। প্যারাবেন-মুক্ত, হাইপোঅ্যালার্জেনিক। ২০০ml।',
        regularPrice: 449,
        discountEnabled: false,
        discountPercent: 0,
        stock: 55,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 11. Pet Supplies
  {
    name: 'পেট সাপ্লাই',
    slug: 'pet-supplies',
    subcategories: [
      { name: 'কুকুরের খাদ্য', slug: 'dog-food' },
      { name: 'বিড়ালের খাদ্য', slug: 'cat-food' },
      { name: 'পেট টয়স', slug: 'pet-toys' },
      { name: 'পেট গ্রুমিং', slug: 'pet-grooming' },
      { name: 'পেট বেড', slug: 'pet-beds' },
    ],
    products: [
      {
        name: 'প্রিমিয়াম কুকুরের খাদ্য (৫kg)',
        sku: 'PET-DOG-001',
        shortDesc: 'চিকেন ও রাইস ফর্মুলা।',
        fullDesc: 'উচ্চ প্রোটিন, ভিটামিন ও মিনারেল সমৃদ্ধ। ১২ মাসের বেশি বয়সী কুকুরদের জন্য। পূর্ণ ও সুষম খাদ্য।',
        regularPrice: 1999,
        discountEnabled: true,
        discountPercent: 10,
        stock: 25,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'ক্যাট টয় সেট',
        sku: 'PET-CAT-002',
        shortDesc: '৫টি ইন্টারেকটিভ ক্যাট টয়।',
        fullDesc: 'ফেদার টয়, বল, রোপ টয় অন্তর্ভুক্ত। ক্যাটদের মানসিক উত্তেজনা ও ব্যায়ামে সহায়ক।',
        regularPrice: 699,
        discountEnabled: false,
        discountPercent: 0,
        stock: 35,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 12. Automotive
  {
    name: 'অটোমোটিভ',
    slug: 'automotive',
    subcategories: [
      { name: 'কার এক্সেসরিজ', slug: 'car-accessories' },
      { name: 'মোটরসাইকেল পার্টস', slug: 'motorcycle-parts' },
      { name: 'কার কেয়ার', slug: 'car-care' },
      { name: 'নেভিগেশন', slug: 'navigation' },
      { name: 'কার ইলেকট্রনিক্স', slug: 'car-electronics' },
    ],
    products: [
      {
        name: 'কার ফোন হোল্ডার',
        sku: 'AUTO-HOLD-001',
        shortDesc: 'ম্যাগনেটিক কার ফোন হোল্ডার।',
        fullDesc: 'শক্তিশালী ম্যাগনেট, ৩৬০° রোটেবল, সহজ ইন্সটলেশন। সকল স্মার্টফোনের জন্য উপযুক্ত।',
        regularPrice: 499,
        discountEnabled: true,
        discountPercent: 20,
        stock: 60,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'কার ভ্যাকুয়াম ক্লিনার',
        sku: 'AUTO-VAC-002',
        shortDesc: 'পোর্টেবল কার ভ্যাকুয়াম ক্লিনার।',
        fullDesc: '১২০০W পাওয়ার, HEPA ফিল্টার, ড্রাই/ওয়েট ক্লিনিং। কারের আসন ও ম্যাট পরিষ্কারের জন্য আদর্শ।',
        regularPrice: 2499,
        discountEnabled: false,
        discountPercent: 0,
        stock: 15,
        featuredFlag: true,
        bestSellerRank: null,
      },
    ],
  },

  // 13. Office Supplies
  {
    name: 'অফিস সাপ্লাই',
    slug: 'office-supplies',
    subcategories: [
      { name: 'ডেস্ক অর্গানাইজার', slug: 'desk-organizer' },
      { name: 'প্রিন্টার', slug: 'printers' },
      { name: 'স্টেশনারি', slug: 'stationery' },
      { name: 'ফাইলিং', slug: 'filing' },
      { name: 'চেয়ার', slug: 'chairs' },
    ],
    products: [
      {
        name: 'এর্গোনমিক অফিস চেয়ার',
        sku: 'OFC-CHAIR-001',
        shortDesc: 'অ্যাডজাস্টেবল লাম্বার সাপোর্ট সহ চেয়ার।',
        fullDesc: 'নেট ব্যাক, হাইট অ্যাডজাস্টেবল, ১৩৫° রিক্লাইন। লম্বা সময় বসে কাজ করার জন্য আদর্শ। ওজন সহনীয় ১৫০kg।',
        regularPrice: 8999,
        discountEnabled: true,
        discountPercent: 15,
        stock: 10,
        featuredFlag: true,
        bestSellerRank: null,
      },
      {
        name: 'ডেস্ক অর্গানাইজার',
        sku: 'OFC-ORG-002',
        shortDesc: 'বাঁশের ডেস্ক অর্গানাইজার।',
        fullDesc: 'প্রাকৃতিক বাঁশের তৈরি, বহু-কম্পার্টমেন্ট। পেন, মোবাইল, নোটস রাখার জন্য। পরিবেশ-বান্ধব।',
        regularPrice: 1299,
        discountEnabled: false,
        discountPercent: 0,
        stock: 40,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 14. Garden & Outdoors
  {
    name: 'গার্ডেন অ্যান্ড আউটডোর্স',
    slug: 'garden-outdoors',
    subcategories: [
      { name: 'গার্ডেন হাতিয়ার', slug: 'garden-tools' },
      { name: 'প্লান্টার', slug: 'planters' },
      { name: 'ইরিগেশন', slug: 'irrigation' },
      { name: 'আউটডোর ফার্নিচার', slug: 'outdoor-furniture' },
      { name: 'লাইটিং', slug: 'garden-lighting' },
    ],
    products: [
      {
        name: 'গার্ডেন হাতিয়ার সেট',
        sku: 'GRD-TOOL-001',
        shortDesc: '১২ পিস গার্ডেন হাতিয়ার সেট।',
        fullDesc: 'শাটেল, ট্রান্সপ্লান্টার, ওয়েডার, প্রুনার অন্তর্ভুক্ত। কার্বন স্টিল ব্লেড, এর্গোনমিক হ্যান্ডেল।',
        regularPrice: 1799,
        discountEnabled: true,
        discountPercent: 12,
        stock: 20,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'সোলার গার্ডেন লাইট',
        sku: 'GRD-LIGHT-002',
        shortDesc: '১০টি সোলার LED গার্ডেন লাইট।',
        fullDesc: 'সোলার চার্জিং, অটো অন/অফ। IP৬৫ ওয়াটারপ্রুফ। রাতে ৮ ঘণ্টা পর্যন্ত আলো।',
        regularPrice: 999,
        discountEnabled: true,
        discountPercent: 25,
        stock: 35,
        featuredFlag: true,
        bestSellerRank: null,
      },
    ],
  },

  // 15. Clothing (Specialized)
  {
    name: 'পোশাক',
    slug: 'clothing',
    subcategories: [
      { name: 'শার্ট', slug: 'shirts' },
      { name: 'টি-শার্ট', slug: 't-shirts' },
      { name: 'জিন্স', slug: 'jeans' },
      { name: 'সাড়ি', slug: 'sarees' },
      { name: 'লেগিংস', slug: 'leggings' },
    ],
    products: [
      {
        name: 'ফরমাল সুইটশার্ট',
        sku: 'CLT-SWEAT-001',
        shortDesc: 'আরামদায়ক সুইটশার্ট, শীতকালের জন্য।',
        fullDesc: 'প্রিমিয়াম ফ্লিস লাইনিং, রিবড কাফ। আধুনিক ডিজাইন, ক্যাজুয়াল ও সেমি-ফরমাল উভয় লুকের জন্য।',
        regularPrice: 2199,
        discountEnabled: true,
        discountPercent: 20,
        stock: 25,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'প্রিন্টেড সাড়ি',
        sku: 'CLT-SARE-002',
        shortDesc: 'ডিজিটাল প্রিন্টেড সাড়ি।',
        fullDesc: 'আধুনিক ডিজিটাল প্রিন্টিং। হালকা ফ্যাব্রিক, সুন্দর ডিজাইন। বিশেষ অনুষ্ঠানের জন্য।',
        regularPrice: 2499,
        discountEnabled: false,
        discountPercent: 0,
        stock: 20,
        featuredFlag: true,
        bestSellerRank: 3,
      },
    ],
  },

  // 16. Footwear
  {
    name: 'জুতা',
    slug: 'footwear',
    subcategories: [
      { name: 'স্নিকার্স', slug: 'sneakers' },
      { name: 'স্যান্ডেল', slug: 'sandals' },
      { name: 'ফরমাল জুতা', slug: 'formal-shoes' },
      { name: 'স্পোর্টস শুজ', slug: 'sports-shoes' },
      { name: 'বুট', slug: 'boots' },
    ],
    products: [
      {
        name: 'ক্যাজুয়াল স্নিকার্স',
        sku: 'FTW-SNK-001',
        shortDesc: 'হালকা ও আরামদায়ক স্নিকার্স।',
        fullDesc: 'ব্রিদেবল মেশ অপার, EVA মিডসোল। দৈনিক ব্যবহারের জন্য আদর্শ। সফট ইনসোল।',
        regularPrice: 1799,
        discountEnabled: true,
        discountPercent: 15,
        stock: 35,
        featuredFlag: true,
        bestSellerRank: 2,
      },
      {
        name: 'লেদার ফরমাল শু',
        sku: 'FTW-FORM-002',
        shortDesc: 'প্রিমিয়াম লেদার ফরমাল জুতা।',
        fullDesc: 'প্রিমিয়াম সিন্থেটিক লেদার, অফিস ও অনুষ্ঠানের জন্য। নন-স্লিপ সোল।',
        regularPrice: 2499,
        discountEnabled: false,
        discountPercent: 0,
        stock: 20,
        featuredFlag: false,
        bestSellerRank: null,
      },
    ],
  },

  // 17. Accessories
  {
    name: 'অ্যাক্সেসরিজ',
    slug: 'accessories',
    subcategories: [
      { name: 'ব্যাগ', slug: 'bags' },
      { name: 'ওয়াচ', slug: 'watches' },
      { name: 'গগলস', slug: 'goggles' },
      { name: 'বেল্ট', slug: 'belts' },
      { name: 'জুয়েলারি', slug: 'jewelry' },
    ],
    products: [
      {
        name: 'লেদার ওয়ালেট',
        sku: 'ACC-WAL-001',
        shortDesc: 'পুরুষদের প্রিমিয়াম লেদার ওয়ালেট।',
        fullDesc: 'সিন্থেটিক লেদার, ৮ কার্ড স্লট, ২ নোট কম্পার্টমেন্ট। স্লিম ডিজাইন, পকেটে সহজে ফিট।',
        regularPrice: 899,
        discountEnabled: true,
        discountPercent: 10,
        stock: 50,
        featuredFlag: false,
        bestSellerRank: null,
      },
      {
        name: 'সোলার ওয়াচ',
        sku: 'ACC-WATCH-002',
        shortDesc: 'সোলার চার্জিং ডিজিটাল ওয়াচ।',
        fullDesc: 'সোলার পাওয়ার, ৫০M ওয়াটারপ্রুফ, LED ডিসপ্লে। ক্রনোগ্রাফ, অ্যালার্ম। স্পোর্টস ও ক্যাজুয়াল উভয় লুকের জন্য।',
        regularPrice: 1999,
        discountEnabled: true,
        discountPercent: 15,
        stock: 25,
        featuredFlag: true,
        bestSellerRank: 1,
      },
    ],
  },
];

const HERO_SLIDES = [
  {
    title: 'সামার সেল ২০২৬',
    subtitle: 'সর্বোচ্চ ৫০% পর্যন্ত ছাড়',
    imageUrl: '/storage/uploads/hero/summer-sale.svg',
    linkUrl: '/offers/summer-sale',
    template: 'full-width',
    sortOrder: 0,
  },
  {
    title: 'নতুন ইলেকট্রনিক্স',
    subtitle: 'সেরা ব্র্যান্ডের সেরা দাম',
    imageUrl: '/storage/uploads/hero/electronics.svg',
    linkUrl: '/category/electronics',
    template: 'split',
    sortOrder: 1,
  },
  {
    title: 'ফ্যাশন ট্রেন্ডস',
    subtitle: 'এই মৌসুমের সেরা সংগ্রহ',
    imageUrl: '/storage/uploads/hero/fashion.svg',
    linkUrl: '/category/fashion',
    template: 'centered',
    sortOrder: 2,
  },
  {
    title: 'বাসায় বসে অর্ডার করুন',
    subtitle: 'দ্রুত ডেলিভারি সারা দেশে',
    imageUrl: '/storage/uploads/hero/delivery.svg',
    linkUrl: '/about/delivery',
    template: 'minimal',
    sortOrder: 3,
  },
];

// ---------------------------------------------------------------------------
// SEED EXECUTION
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Comprehensive Seed Script ===\n');

  // 1. Clear existing catalog data (preserve orders, checkout sessions, and user data)
  console.log('Clearing existing catalog data...');
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.landingPage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.heroSlide.deleteMany();
  console.log('  Catalog data cleared (orders preserved).\n');

  // 2. Create categories and subcategories
  console.log('Creating categories...');
  const subcategoryMap: Record<string, string> = {}; // slug -> id

  for (const cat of CATEGORIES) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        status: 'active',
      },
    });
    console.log(`  [+] ${cat.name} (${cat.slug})`);

    for (const sub of cat.subcategories) {
      const created = await prisma.category.create({
        data: {
          name: sub.name,
          slug: sub.slug,
          status: 'active',
          parentCategoryId: parent.id,
        },
      });
      subcategoryMap[sub.slug] = created.id;
      console.log(`      └─ ${sub.name}`);
    }
  }
  console.log();

  // 3. Create products
  console.log('Creating products...');
  let productCount = 0;
  const placeholderUrl = '/storage/uploads/products/placeholder.svg';

  for (const cat of CATEGORIES) {
    // Distribute products across subcategories
    const subs = cat.subcategories;
    for (let i = 0; i < cat.products.length; i++) {
      const prod = cat.products[i];
      const subSlug = subs[i % subs.length].slug;
      const categoryId = subcategoryMap[subSlug];

      const finalPrice = calcFinal(
        prod.regularPrice,
        prod.discountEnabled,
        prod.discountPercent,
      );

      const product = await prisma.product.create({
        data: {
          name: prod.name,
          sku: prod.sku,
          slug: prod.sku.toLowerCase().toLowerCase(),
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

      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: placeholderUrl,
          altText: prod.name,
          sortOrder: 0,
        },
      });

      productCount++;
      console.log(`  [+] ${prod.name} — ৳${prod.regularPrice} (${prod.sku})`);
    }
  }
  console.log();

  // 4. Create hero slides
  console.log('Creating hero slides...');
  for (const slide of HERO_SLIDES) {
    await prisma.heroSlide.create({
      data: {
        title: slide.title,
        subtitle: slide.subtitle,
        imageUrl: slide.imageUrl,
        linkUrl: slide.linkUrl,
        template: slide.template,
        sortOrder: slide.sortOrder,
        active: true,
      },
    });
    console.log(`  [+] ${slide.title}`);
  }
  console.log();

  // Summary
  const totalCategories = await prisma.category.count();
  const totalProducts = await prisma.product.count();
  const totalImages = await prisma.productImage.count();
  const totalSlides = await prisma.heroSlide.count();

  console.log('=== Summary ===');
  console.log(`  Categories:      ${totalCategories}`);
  console.log(`  Products:        ${totalProducts}`);
  console.log(`  Product Images:  ${totalImages}`);
  console.log(`  Hero Slides:     ${totalSlides}`);
  console.log('\nSeeding complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
