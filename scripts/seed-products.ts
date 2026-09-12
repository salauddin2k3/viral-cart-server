import 'dotenv/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import zlib from 'zlib';
import { prisma } from '../src/lib/prisma.js';

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), 'storage');
const UPLOADS_DIR = join(STORAGE_DIR, 'uploads');
const BASE_URL = process.env.STORAGE_BASE_URL ?? 'http://localhost:5000/storage';

function createPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const raw: number[] = [];
  for (let y = 0; y < height; y++) {
    raw.push(0);
    for (let x = 0; x < width; x++) {
      const noise = Math.floor(((x + y) % 3) * 8);
      raw.push(Math.min(255, r + noise));
      raw.push(Math.min(255, g + noise));
      raw.push(Math.min(255, b + noise));
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));

  function crc32(buf: Buffer): Buffer {
    let c = 0xffffffff;
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) {
        cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      }
      table[n] = cc;
    }
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    c = (c ^ 0xffffffff) >>> 0;
    const out = Buffer.alloc(4);
    out.writeUInt32BE(c, 0);
    return out;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuffer, data]);
    return Buffer.concat([length, typeBuffer, data, crc32(crcInput)]);
  }

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const CATEGORIES = [
  {
    name: 'পুরুষদের পোশাক',
    nameEn: "Men's Clothing",
    products: [
      {
        name: 'ক্যাজুয়াল পলো শার্ট',
        nameEn: 'Casual Polo Shirt',
        shortDesc: 'স্বাচ্ছন্দ্যকর কটন পলো শার্ট, দৈনিক ব্যবহারের জন্য আদর্শ।',
        fullDesc: '১০০% প্রিমিয়াম কটন দিয়ে তৈরি এই পলো শার্ট আপনাকে দেবে সর্বোচ্চ স্বাচ্ছন্দ্য। সামঞ্জস্যপূর্ণ ফিট, আধুনিক ডিজাইন এবং টেকসই ফ্যাব্রিক। যেকোনো অনুষ্ঠান বা অফিসে পরিধানের জন্য উপযুক্ত।',
        sku: 'MCL-POLO-001',
        regularPrice: 1299,
        discountEnabled: true,
        discountPercent: 15,
        stock: 45,
        featuredFlag: true,
        bestSellerRank: 2,
        color: [41, 98, 255],
      },
      {
        name: 'ডেনিম জিন্স',
        nameEn: 'Denim Jeans',
        shortDesc: 'ক্লাসিক ফিট ডেনিম জিন্স, টেকসই ম্যাটেরিয়াল।',
        fullDesc: 'প্রিমিয়াম ডেনিম ফ্যাব্রিক দিয়ে তৈরি এই জিন্স আপনার পছন্দের পোশাক। স্ট্রেচেবল ম্যাটেরিয়াল যা চলাচলে স্বাচ্ছন্দ্য দেয়। বিশেষ ওয়াশ প্রসেস যা রঙ দীর্ঘস্থায়ী রাখে। পকেটের ডিজাইন আধুনিক ও কার্যকরী।',
        sku: 'MCL-JEAN-002',
        regularPrice: 1899,
        discountEnabled: false,
        discountPercent: 0,
        stock: 30,
        featuredFlag: false,
        bestSellerRank: null,
        color: [30, 60, 114],
      },
      {
        name: 'ফরমাল সুইটশার্ট',
        nameEn: 'Formal Sweatshirt',
        shortDesc: 'আরামদায়ক সুইটশার্ট, শীতকালের জন্য আদর্শ।',
        fullDesc: 'উষ্ণ ও আরামদায়ক সুইটশার্ট যা শীতকালে আপনাকে রাখবে স্বস্তিতে। প্রিমিয়াম ফ্লিস লাইনিং, রিবড কাফ এবং হেমলাইন। আধুনিক ডিজাইন যা ক্যাজুয়াল ও সেমি-ফরমাল উভয় লুকের জন্য উপযুক্ত।',
        sku: 'MCL-SWEA-003',
        regularPrice: 2199,
        discountEnabled: true,
        discountPercent: 20,
        stock: 25,
        featuredFlag: false,
        bestSellerRank: null,
        color: [55, 55, 55],
      },
      {
        name: 'সামার শর্টস',
        nameEn: 'Summer Shorts',
        shortDesc: 'হালকা ও বাতাসাচ্ছন্ন্য শর্টস, গ্রীষ্মকালের জন্য তৈরি।',
        fullDesc: 'হালকা কটন ফ্যাব্রিক দিয়ে তৈরি শর্টস গ্রীষ্মকালে সর্বোচ্চ স্বাচ্ছন্দ্য প্রদান করে। এলাস্টিক ওয়েস্টব্যান্ড, ডুয়েল সাইড পকেট এবং ড্রলস্ট্রিং ক্লোজার। বিচ, পার্ক বা বাড়িতে পরিধানের জন্য আদর্শ।',
        sku: 'MCL-SHRT-004',
        regularPrice: 899,
        discountEnabled: false,
        discountPercent: 0,
        stock: 60,
        featuredFlag: false,
        bestSellerRank: null,
        color: [194, 178, 128],
      },
    ],
  },
  {
    name: 'মহিলাদের পোশাক',
    nameEn: "Women's Clothing",
    products: [
      {
        name: 'এমব্রয়ডারি কুর্তি',
        nameEn: 'Embroidery Kurti',
        shortDesc: 'হাতে বোনা এমব্রয়ডারি সহ সুন্দর কুর্তি।',
        fullDesc: 'প্রিমিয়াম জরি ও রেশমি থ্রেড দিয়ে হাতে বোনা এমব্রয়ডারি। সুতির কাপড় যা ত্বকের জন্য নিরাপদ। আধুনিক প্যাটার্ন যা ঐতিহ্যবাহী ও ফ্যাশনেবল উভয়। পার্টি ও অনুষ্ঠানের জন্য আদর্শ।',
        sku: 'WCL-KURT-001',
        regularPrice: 1599,
        discountEnabled: true,
        discountPercent: 10,
        stock: 35,
        featuredFlag: true,
        bestSellerRank: 1,
        color: [219, 112, 147],
      },
      {
        name: 'প্রিন্টেড সাড়ি',
        nameEn: 'Printed Saree',
        shortDesc: 'ডিজিটাল প্রিন্টেড সাড়ি, হালকা ও সুন্দর।',
        fullDesc: 'আধুনিক ডিজিটাল প্রিন্টিং প্রযুক্তিতে তৈরি এই সাড়ি দেখতে অত্যন্ত সুন্দর। হালকা ফ্যাব্রিক যা পরিধানে স্বাচ্ছন্দ্যজনক। বিশেষ অনুষ্ঠান ও পার্টিতে পরিধানের জন্য উপযুক্ত। মেশিন ওয়াশেবল।',
        sku: 'WCL-SARE-002',
        regularPrice: 2499,
        discountEnabled: false,
        discountPercent: 0,
        stock: 20,
        featuredFlag: true,
        bestSellerRank: 3,
        color: [138, 43, 226],
      },
      {
        name: 'কটন লেগিংস',
        nameEn: 'Cotton Leggings',
        shortDesc: 'স্ট্রেচেবল কটন লেগিংস, আরামদায়ক ফিট।',
        fullDesc: '৯৫% কটন ও ৫% স্প্যান্ডেক্স দিয়ে তৈরি এই লেগিংস সর্বোচ্চ স্বাচ্ছন্দ্য প্রদান করে। এলাস্টিক ওয়েস্টব্যান্ড, ফ্ল্যাটলক সিলাম এবং অপাক টাইট ফিট। কুর্তি, টপ বা কার্ডিগানের সাথে পেয়ার করুন।',
        sku: 'WCL-LEGG-003',
        regularPrice: 699,
        discountEnabled: true,
        discountPercent: 25,
        stock: 80,
        featuredFlag: false,
        bestSellerRank: null,
        color: [40, 40, 40],
      },
      {
        name: 'ফ্লোরাল ম্যাক্সি ড্রেস',
        nameEn: 'Floral Maxi Dress',
        shortDesc: 'সুন্দর ফুলের প্রিন্ট সহ ম্যাক্সি ড্রেস।',
        fullDesc: 'হালকা রেয়ন ফ্যাব্রিকে তৈরি এই ম্যাক্সি ড্রেস গ্রীষ্মকালের জন্য একদম পারফেক্ট। ফ্লোরাল প্রিন্ট যা আপনাকে দেবে ফ্রেশ ও স্টাইলিশ লুক। এডজাস্টেবল স্ট্র্যাপ এবং ফুল লেংথ স্কার্ট।',
        sku: 'WCL-MAXI-004',
        regularPrice: 1999,
        discountEnabled: false,
        discountPercent: 0,
        stock: 15,
        featuredFlag: false,
        bestSellerRank: null,
        color: [255, 105, 180],
      },
    ],
  },
  {
    name: 'ইলেকট্রনিক্স',
    nameEn: 'Electronics',
    products: [
      {
        name: 'ওয়ায়ারলেস ব্লুটুথ ইয়ারফোন',
        nameEn: 'Wireless Bluetooth Earphones',
        shortDesc: 'নয়েজ ক্যানসেলিং সহ ওয়ায়ারলেস ইয়ারফোন।',
        fullDesc: 'অ্যাকটিভ নয়েজ ক্যানসেলিং প্রযুক্তি সহ ওয়ায়ারলেস ইয়ারফোন। ব্লুটুথ ৫.৩ সংযোগ, ৩০ ঘণ্টা ব্যাটারি লাইফ, ফাস্ট চার্জিং সাপোর্ট। IPX৫ ওয়াটার রেজিস্ট্যান্ট। সুপিরিয়র সাউন্ড কোয়ালিটি।',
        sku: 'ELC-EAR-001',
        regularPrice: 2499,
        discountEnabled: true,
        discountPercent: 20,
        stock: 50,
        featuredFlag: true,
        bestSellerRank: 4,
        color: [20, 20, 20],
      },
      {
        name: 'পাওয়ার ব্যাংক ২০০০০mAh',
        nameEn: 'Power Bank 20000mAh',
        shortDesc: 'উচ্চ ক্ষমতাসম্পন্ন পাওয়ার ব্যাংক, দ্রুত চার্জিং।',
        fullDesc: '২০০০০mAh ক্ষমতা সম্পন্ন পাওয়ার ব্যাংক যা আপনার সব ডিভাইস চার্জ রাখবে। ডুয়াল USB আউটপুট, USB-C ইনপুট, কুইক চার্জ ৩.০ সাপোর্ট। LED ইন্ডিকেটর, ওভার-চার্জ প্রোটেকশন। ভ্রমণের সময় অপরিহার্য।',
        sku: 'ELC-PWR-002',
        regularPrice: 1799,
        discountEnabled: false,
        discountPercent: 0,
        stock: 40,
        featuredFlag: false,
        bestSellerRank: null,
        color: [0, 150, 136],
      },
      {
        name: 'স্মার্ট ওয়াচ প্রো',
        nameEn: 'Smart Watch Pro',
        shortDesc: 'ফিটনেস ট্র্যাকার সহ স্মার্ট ওয়াচ।',
        fullDesc: '১.৭৫ ইঞ্চি AMOLED ডিসপ্লে, হার্ট রেট মনিটর, SpO2 সেন্সর, ১০০+ স্পোর্টস মোড। ৭ দিনের ব্যাটারি লাইফ, IP৬৮ ওয়াটারপ্রুফ। কল ও মেসেজ নোটিফিকেশন, GPS ট্র্যাকিং।',
        sku: 'ELC-WATCH-003',
        regularPrice: 4999,
        discountEnabled: true,
        discountPercent: 15,
        stock: 20,
        featuredFlag: true,
        bestSellerRank: 5,
        color: [33, 33, 33],
      },
      {
        name: 'পোর্টেবল স্পিকার',
        nameEn: 'Portable Speaker',
        shortDesc: 'শক্তিশালী সাউন্ড সহ পোর্টেবল স্পিকার।',
        fullDesc: '২০W আউটপুট পাওয়ার সহ পোর্টেবল ব্লুটুথ স্পিকার। ডুয়াল প্যাসিভ রেডিয়েটর, ৩৬০° সাউন্ড। IPX৭ ওয়াটারপ্রুফ, ১২ ঘণ্টা প্লেটাইম। বাইলাইনার মোডে দুটি স্পিকার কানেক্ট করা যায়।',
        sku: 'ELC-SPK-004',
        regularPrice: 3299,
        discountEnabled: false,
        discountPercent: 0,
        stock: 25,
        featuredFlag: false,
        bestSellerRank: null,
        color: [63, 81, 181],
      },
    ],
  },
  {
    name: 'ঘর ও রান্নাঘর',
    nameEn: 'Home & Kitchen',
    products: [
      {
        name: 'নন-স্টিক কুকওয়্যার সেট',
        nameEn: 'Non-Stick Cookware Set',
        shortDesc: '৫ পিস নন-স্টিক কুকওয়্যার সেট, বেকড কোটিং।',
        fullDesc: 'প্রিমিয়াম গ্রেড নন-স্টিক কোটিং সহ ৫ পিস কুকওয়্যার সেট। ফ্রাই প্যান, কড়াই, ঢাকনি অন্তর্ভুক্ত। বেকেলাইট হ্যান্ডেল, গরম প্রতিরোধী। গ্যাস, ইন্ডাকশন ও ইলেকট্রিক চুলায় ব্যবহারযোগ্য।',
        sku: 'HOM-COOK-001',
        regularPrice: 3499,
        discountEnabled: true,
        discountPercent: 18,
        stock: 15,
        featuredFlag: true,
        bestSellerRank: 6,
        color: [120, 80, 40],
      },
      {
        name: 'বেডশিট সেট (কিং সাইজ)',
        nameEn: 'Bed Sheet Set (King Size)',
        shortDesc: '১০০% কটন বেডশিট সেট, রাজা আকার।',
        fullDesc: '১০০% প্রিমিয়াম কটন দিয়ে তৈরি বেডশিট সেট। ১টি বেডশিট (১০৮"×১০৮"), ২টি পিলোকভার। ৪০০ টিসি কাউন্ট, সফট ও স্মুথ ফিল। মাল্টি-কালার প্রিন্ট, ফেড প্রতিরোধী। মেশিন ওয়াশেবল।',
        sku: 'HOM-BED-002',
        regularPrice: 2299,
        discountEnabled: false,
        discountPercent: 0,
        stock: 30,
        featuredFlag: false,
        bestSellerRank: null,
        color: [100, 149, 237],
      },
      {
        name: 'স্টেইনলেস স্টিল বোতল',
        nameEn: 'Stainless Steel Bottle',
        shortDesc: 'ডুয়াল-ওয়াল ভ্যাকুয়াম ইন্সুলেটেড বোতল।',
        fullDesc: '১৮/৮ স্টেইনলেস স্টিল দিয়ে তৈরি ডুয়াল-ওয়াল ভ্যাকুয়াম ইন্সুলেটেড বোতল। ২৪ ঘণ্টা ঠান্ডা, ১২ ঘণ্টা গরম রাখে। ৭৫০ml ক্ষমতা, লিক-প্রুফ ক্যাপ। BPA-মুক্ত, খাদ্য নিরাপদ।',
        sku: 'HOM-BOTT-003',
        regularPrice: 899,
        discountEnabled: true,
        discountPercent: 12,
        stock: 100,
        featuredFlag: false,
        bestSellerRank: null,
        color: [192, 192, 192],
      },
      {
        name: 'এয়ার পিউরিফায়ার',
        nameEn: 'Air Purifier',
        shortDesc: 'HEPA ফিল্টার সহ এয়ার পিউরিফায়ার।',
        fullDesc: 'True HEPA H13 ফিল্টার সহ এয়ার পিউরিফায়ার যা ৯৯.৯৭% ধুলাবালি, পরাগ ও অ্যালার্জেন দূর করে। ৩৫০ বর্গফুট কভারেজ, ৩-স্পিড ফ্যান, নাইট মোড। শান্ত অপারেশন (২৫dB), ফিল্টার রিপ্লেসমেন্ট ইন্ডিকেটর।',
        sku: 'HOM-AIR-004',
        regularPrice: 5999,
        discountEnabled: false,
        discountPercent: 0,
        stock: 10,
        featuredFlag: true,
        bestSellerRank: null,
        color: [230, 230, 250],
      },
    ],
  },
  {
    name: 'সৌন্দর্য ও পরিচর্যা',
    nameEn: 'Beauty & Personal Care',
    products: [
      {
        name: 'ভিটামিন সি সিরাম',
        nameEn: 'Vitamin C Serum',
        shortDesc: 'ব্রাইটনিং ভিটামিন সি সিরাম, ৩০ml।',
        fullDesc: '২০% ভিটামিন সি, ভিটামিন ই ও হায়ালুরোনিক এসিড দিয়ে তৈরি এডভান্সড সিরাম। দাগ-কমানো, ত্বকের উজ্জ্বলতা বাড়ানো এবং ফাইন লাইন কমানোর জন্য কার্যকর। সকল ত্বকের ধরনের জন্য উপযুক্ত। প্যারাবেন-মুক্ত।',
        sku: 'BTY-SERA-001',
        regularPrice: 1299,
        discountEnabled: true,
        discountPercent: 20,
        stock: 60,
        featuredFlag: true,
        bestSellerRank: 7,
        color: [255, 193, 7],
      },
      {
        name: 'হাইড্রেটিং ফেশিয়াল ক্রিম',
        nameEn: 'Hydrating Facial Cream',
        shortDesc: 'দীর্ঘস্থায়ী ময়েশ্চারাইজেশন সহ ফেশিয়াল ক্রিম।',
        fullDesc: 'হায়ালুরোনিক এসিড ও সেরামাইড দিয়ে তৈরি হাইড্রেটিং ফেশিয়াল ক্রিম। ৭২ ঘণ্টা পর্যন্ত ময়েশ্চার রিটেনশন। নন-গ্রিসি ফর্মুলা, ফাস্ট অ্যাবজর্পিং। সকল ত্বকের জন্য নিরাপদ।',
        sku: 'BTY-CREM-002',
        regularPrice: 899,
        discountEnabled: false,
        discountPercent: 0,
        stock: 45,
        featuredFlag: false,
        bestSellerRank: null,
        color: [255, 228, 225],
      },
      {
        name: 'চালকুমারি হেয়ার অয়েল',
        nameEn: 'Chalkumari Hair Oil',
        shortDesc: 'প্রাকৃতিক উপাদানে তৈরি হেয়ার অয়েল।',
        fullDesc: 'চালকুমারি, নারিকেল, আমলা ও ব্রিংগরাজ দিয়ে তৈরি প্রাকৃতিক হেয়ার অয়েল। চুলের গোড়া থেকে পুষ্টি প্রদান করে, চুল পড়া বন্ধ করে এবং চুলকে ঘন ও মসৃণ করে। রাসায়নিক মুক্ত, ১০০% প্রাকৃতিক।',
        sku: 'BTY-HAIR-003',
        regularPrice: 499,
        discountEnabled: true,
        discountPercent: 15,
        stock: 70,
        featuredFlag: false,
        bestSellerRank: null,
        color: [139, 69, 19],
      },
      {
        name: 'এসপিএফ ৫০ সানস্ক্রিন',
        nameEn: 'SPF 50 Sunscreen',
        shortDesc: 'ব্রড স্পেকট্রাম UV প্রোটেকশন সানস্ক্রিন।',
        fullDesc: 'SPF ৫০+ PA++++ ব্রড স্পেকট্রাম UV প্রোটেকশন। লাইটওয়েট, নন-গ্রিসি ফর্মুলা। ওয়াটার-রেজিস্ট্যান্ট (৮০ মিনিট)। নিয়মিত ব্যবহারে ত্বকের রঙ সমান রাখে এবং সূর্যের ক্ষতিকর রশ্মি থেকে রক্ষা করে।',
        sku: 'BTY-SUN-004',
        regularPrice: 799,
        discountEnabled: false,
        discountPercent: 0,
        stock: 55,
        featuredFlag: false,
        bestSellerRank: null,
        color: [255, 250, 205],
      },
    ],
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function calculateFinalPrice(regularPrice: number, discountEnabled: boolean, discountPercent: number): number {
  if (!discountEnabled) return regularPrice;
  return Math.round(regularPrice * (1 - discountPercent / 100) * 100) / 100;
}

async function main(): Promise<void> {
  console.log('Seeding categories, products, and images...');

  await mkdir(UPLOADS_DIR, { recursive: true });

  const existingCategories = await prisma.category.findMany({ select: { name: true } });
  const existingNames = new Set(existingCategories.map((c: { name: string }) => c.name));

  for (const cat of CATEGORIES) {
    let category = await prisma.category.findFirst({ where: { name: cat.name } });

    if (!category) {
      const slug = generateSlug(cat.nameEn);
      category = await prisma.category.create({
        data: {
          name: cat.name,
          slug,
          status: 'active',
        },
      });
      console.log(`  Created category: ${cat.name} (${cat.nameEn})`);
    } else {
      console.log(`  Category exists: ${cat.name}`);
    }

    for (const prod of cat.products) {
      const existingProduct = await prisma.product.findFirst({ where: { sku: prod.sku } });
      if (existingProduct) {
        console.log(`    Product exists: ${prod.name}`);
        continue;
      }

      const slug = generateSlug(prod.nameEn);
      const finalPrice = calculateFinalPrice(prod.regularPrice, prod.discountEnabled, prod.discountPercent);

      const product = await prisma.product.create({
        data: {
          name: prod.name,
          sku: prod.sku,
          slug,
          nameSearch: prod.name,
          categoryId: category.id,
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

      const [cr, cg, cb] = prod.color;
      const png = createPng(400, 400, cr, cg, cb);
      const filename = `${randomUUID()}.png`;
      const filePath = join(UPLOADS_DIR, filename);
      await writeFile(filePath, png);

      const imageUrl = `${BASE_URL}/uploads/${filename}`;

      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          altText: prod.nameEn,
          sortOrder: 0,
        },
      });

      console.log(`    Created: ${prod.name} (${prod.nameEn}) — ${prod.regularPrice} BDT`);
    }
  }

  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();
  const totalImages = await prisma.productImage.count();
  console.log(`\nDone! Categories: ${totalCategories}, Products: ${totalProducts}, Images: ${totalImages}`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
