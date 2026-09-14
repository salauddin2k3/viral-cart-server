import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

interface SectionDef {
  id: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
}

interface LandingPageSeed {
  slug: string;
  title: string;
  subtitle: string;
  productSku: string;
  template: 'design_a' | 'design_b' | 'design_c';
  metaDescription: string;
  sections: SectionDef[];
}

const PREWRITTEN_PAGES: LandingPageSeed[] = [
  // ═══════════════════════════════════════════════════════════════
  // PAGE 1: Premium Gold Ring — Template A (Luxury / Dark)
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'premium-gold-ring',
    title: 'প্রিমিয়াম গোল্ড রিং — চিরকালীন সৌন্দর্যের প্রতীক',
    subtitle: '২১কে সোনায় তৈরি, হাতে পালিশ করা, প্রতিটি পরিবারের জন্য একটি মূল্যবান সম্পদ',
    productSku: 'JWL-RNG-001',
    template: 'design_a',
    metaDescription: '২১কে গোল্ডে তৈরি প্রিমিয়াম ক্লাসিক রিং। সময়হীন ডিজাইন, সেরা মানের সোনা, সাশ্রয়ী মূল্যে অর্ডার করুন।',
    sections: [
      {
        id: 'sec_hero',
        type: 'hero',
        enabled: true,
        sortOrder: 0,
        data: {
          heading: 'চিরকালীন সৌন্দর্য, একটি রিংয়ে',
          subheading: '২১কে বিশুদ্ধ সোনায় তৈরি প্রিমিয়াম ক্লাসিক রিং',
          text: 'প্রতিটি হাতের আঙুলে একটি গল্প — আমাদের ক্লাসিক গোল্ড রিং আপনার স্টাইলকে বলে দেয় আপনি কারা। এখনই অর্ডার করুন এবং পান বিশেষ ছাড়।',
        },
      },
      {
        id: 'sec_benefits',
        type: 'benefits',
        enabled: true,
        sortOrder: 1,
        data: {
          title: 'কেন আমাদের গোল্ড রিং বেছে নেবেন?',
          items: [
            '২১কে বিশুদ্ধ সোনা — প্রতিটি রিং প্রমাণিত এবং সার্টিফায়েড',
            'হাতে পালিশ করা ফিনিশ — প্রতিটি পৃষ্ঠে সূক্ষ্ম ও মসৃণ কাজ',
            'দৈনিক পরিধানের জন্য উপযোগী — আরামদায়ক ও টেকসই',
            'গিফট বক্স সহ ডেলিভারি — উপহার হিসেবে পাঠানোর জন্য পারফেক্ট',
            '৭ দিনের রিটার্ন পলিসি — সন্তুষ্ট না হলে সহজেই ফেরত দিন',
          ],
        },
      },
      {
        id: 'sec_features',
        type: 'features',
        enabled: true,
        sortOrder: 2,
        data: {
          title: 'পণ্যের বিশেষত্ব',
          items: [
            'ধাতু: ২১কে বিশুদ্ধ সোনা (91.6% Au)',
            'ওজন: প্রায় ৮-১০ গ্রাম (সাইজ অনুযায়ী পরিবর্তন হতে পারে)',
            'ফিনিশ: উচ্চমানের পলিশ ও ব্রাশড ম্যাট',
            'সাইজ: ৫ থেকে ১০ পর্যন্ত উপলব্ধ',
            'ওয়ারেন্টি: ১ বছরের ম্যানুফ্যাকচারিং ওয়ারেন্টি',
          ],
        },
      },
      {
        id: 'sec_gallery',
        type: 'gallery',
        enabled: true,
        sortOrder: 3,
        data: { title: 'পণ্যের ছবি', urls: [] },
      },
      {
        id: 'sec_testimonials',
        type: 'testimonials',
        enabled: true,
        sortOrder: 4,
        data: {
          title: 'আমাদের গ্রাহকরা কী বলছেন',
          items: [
            { name: 'ফাতেমা আক্তার', text: 'অসাধারণ মানের রিং! প্রকৃতই ২১কে সোনা। পারিবারিক অনুষ্ঠানে পরে সবাই প্রশংসা করেছে। ডেলিভারি ছিল দ্রুত।', rating: 5 },
            { name: 'রাকিবুল হাসান', text: 'স্ত্রীকে উপহার দিয়েছি। খুবই সুন্দর ডিজাইন। মূল্যের তুলনায় মান অনেক ভালো। সবাইকে সাজেশন দেব।', rating: 5 },
            { name: 'নাসরিন জাহান', text: 'দীর্ঘদিন ধরে এমন রিং খুঁজছিলাম। সোনার রং একদম সতেজ। পরিধানে অনেক আরামদায়ক।', rating: 4 },
          ],
        },
      },
      {
        id: 'sec_faq',
        type: 'faq',
        enabled: true,
        sortOrder: 5,
        data: {
          title: 'সচরাপর জিজ্ঞাসা',
          items: [
            'প্রশ্ন: এটি কি প্রকৃত ২১কে সোনা? উত্তর: হ্যাঁ, প্রতিটি রিং সরাসরি আমাদের কারখানা থেকে তৈরি এবং BIS সার্টিফায়েড।',
            'প্রশ্ন: সাইজ নির্বাচন কীভাবে করবো? উত্তর: আমাদের সাইজ চার্ট দেখুন অথবা সরাসরি আমাদের সাথে যোগাযোগ করুন।',
            'প্রশ্ন: ডেলিভারি কত সময় লাগে? উত্তর: ঢাকায় ২-৩ দিন, ঢাকার বাইরে ৪-৬ দিন।',
            'প্রশ্ন: রিটার্ন করা যায়? উত্তর: হ্যাঁ, ৭ দিনের মধ্যে অব্যবহৃত অবস্থায় রিটার্ন করা যাবে।',
          ],
        },
      },
      {
        id: 'sec_cta',
        type: 'cta',
        enabled: true,
        sortOrder: 6,
        data: {
          heading: 'এখনই অর্ডার করুন',
          text: 'সীমিত সময়ের জন্য বিশেষ মূল্যে পাচ্ছেন। কোড অফ ডেলিভারি সুবিধা উপলব্ধ।',
          buttonText: 'এখনই অর্ডার করুন',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 2: Pearl Necklace — Template B (Modern / Split)
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'pearl-necklace-collection',
    title: 'মুক্তা নেকলেস — নারীদের জন্য চিরন্তন সাজসজ্জা',
    subtitle: 'তাজা মুক্তা দিয়ে তৈরি, সোনার ক্লাস্প সহ হাতে বোনা নেকলেস',
    productSku: 'JWL-NCK-001',
    template: 'design_b',
    metaDescription: 'তাজা মুক্তা দিয়ে তৈরি প্রিমিয়াম নেকলেস। ১৪কে সোনার ক্লাস্প, সাজেশন সহ অর্ডার করুন।',
    sections: [
      {
        id: 'sec_hero',
        type: 'hero',
        enabled: true,
        sortOrder: 0,
        data: {
          heading: 'নারীদের সৌন্দর্যের প্রতীক',
          subheading: 'তাজা মুক্তা ও ১৪কে সোনায় তৈরি প্রিমিয়াম নেকলেস',
          text: 'প্রতিটি মুক্তা প্রকৃতির একটি সৃষ্টি — এবং আমরা সেটিকে আপনার জন্য সাজিয়েছি সেরা পদ্ধতিতে। আজই অর্ডার করুন।',
        },
      },
      {
        id: 'sec_benefits',
        type: 'benefits',
        enabled: true,
        sortOrder: 1,
        data: {
          title: 'কেন আমাদের মুক্তা নেকলেস বিশেষ?',
          items: [
            'তাজা মুক্তা — প্রতিটি মুক্তা হাতে বাছাই করা, ৭-৮ মিমি আকার',
            '১৪কে সোনার ক্লাস্প — লবস্টার ক্লাস্প সহজে খোলা ও বন্ধ করা যায়',
            'হাতে বোনা — প্রতিটি মুক্তা আলাদাভাবে নোড করা, নিরাপদ',
            'সাজেশনযোগ্য — ১৬ থেকে ১৮ ইঞ্চি পর্যন্ত দৈর্ঘ্য পরিবর্তন',
            'গিফট প্যাকেজিং — সুন্দর বক্সে প্যাক করে ডেলিভারি দেওয়া হয়',
          ],
        },
      },
      {
        id: 'sec_features',
        type: 'features',
        enabled: true,
        sortOrder: 2,
        data: {
          title: 'পণ্যের বিস্তারিত',
          items: [
            'মুক্তা: তাজা ফ্রেশওয়াটার পার্ল (৭-৮ মিমি)',
            'ক্লাস্প: ১৪কে গোল্ড লবস্টার ক্লাস্প',
            'দৈর্ঘ্য: অ্যাডজাস্টেবল ১৬-১৮ ইঞ্চি',
            'নোট: প্রতিটি মুক্তা আলাদাভাবে নোড করা',
            'প্যাকেজিং: প্রিমিয়াম গিফট বক্স সহ',
          ],
        },
      },
      {
        id: 'sec_testimonials',
        type: 'testimonials',
        enabled: true,
        sortOrder: 3,
        data: {
          title: 'ব্যবহারকারীদের মতামত',
          items: [
            { name: 'সাবরিনা রহমান', text: 'বিয়ের পার্টিতে পরেছিলাম। সবাই বলেছে খুব সুন্দর! মুক্তাগুলো একদম চকচক করছে। অনেক ধন্যবাদ।', rating: 5 },
            { name: 'তাসনিম আহমেদ', text: 'মায়ের জন্য কিনেছি। মা খুব খুশি হয়েছেন। মূল্য অনেক যৌক্তিক। সত্যিই সুন্দর পণ্য।', rating: 5 },
            { name: 'রুমানা পারভিন', text: 'দীর্ঘদিন ধরে মুক্তা নেকলেস খুঁজছিলাম। এটি সবচেয়ে ভালো। মুক্তাগুলো প্রকৃতই তাজা।', rating: 4 },
          ],
        },
      },
      {
        id: 'sec_faq',
        type: 'faq',
        enabled: true,
        sortOrder: 4,
        data: {
          title: 'প্রশ্নোত্তর',
          items: [
            'প্রশ্ন: মুক্তাগুলো কি প্রকৃত? উত্তর: হ্যাঁ, সম্পূর্ণ তাজা ফ্রেশওয়াটার মুক্তা।',
            'প্রশ্ন: অ্যালার্জি হতে পারে? উত্তর: না, মুক্তা সম্পূর্ণ হাইপোঅ্যালার্জেনিক।',
            'প্রশ্ন: কীভাবে যত্ন নেবো? উত্তর: পানি ও রাসায়নিক থেকে দূরে রাখুন। ব্যবহারের পর নরম কাপড়ে মুছুন।',
            'প্রশ্ন: গিফট প্যাকেজিং কি আছে? উত্তর: হ্যাঁ, প্রতিটি নেকলেস সুন্দর গিফট বক্সে প্যাক করে দেওয়া হয়।',
          ],
        },
      },
      {
        id: 'sec_cta',
        type: 'cta',
        enabled: true,
        sortOrder: 5,
        data: {
          heading: 'আজই অর্ডার করুন',
          text: 'কোড অফ ডেলিভারি। ঢাকায় ২-৩ দিনে, ঢাকার বাইরে ৪-৬ দিনে ডেলিভারি।',
          buttonText: 'এখনই অর্ডার করুন',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 3: Sony WH-1000XM5 — Template C (Clean / Conversion)
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'sony-headphones-deal',
    title: 'Sony WH-1000XM5 — নয়েজ ক্যানসেলিং হেডফোন',
    subtitle: 'শ্রেষ্ঠ শব্দ মান, সেরা কমফোর্ট, সাশ্রয়ী মূল্যে অর্ডার করুন',
    productSku: 'ELC-HPH-001',
    template: 'design_c',
    metaDescription: 'Sony WH-1000XM5 নয়েজ ক্যানসেলিং হেডফোন। ইন্ডাস্ট্রি-লিডিং সাউন্ড, ৩০ ঘণ্টা ব্যাটারি। কোড অফ ডেলিভারি।',
    sections: [
      {
        id: 'sec_hero',
        type: 'hero',
        enabled: true,
        sortOrder: 0,
        data: {
          heading: 'শব্দের মান বদলে দিন',
          subheading: 'Sony WH-1000XM5 — বিশ্বের সেরা নয়েজ ক্যানসেলিং হেডফোন',
          text: '৩০ ঘণ্টার ব্যাটারি, অ্যাডাপ্টিভ সাউন্ড, অসাধারণ কমফোর্ট। এখনই অর্ডার করুন এবং পান বিশেষ ছাড়।',
        },
      },
      {
        id: 'sec_benefits',
        type: 'benefits',
        enabled: true,
        sortOrder: 1,
        data: {
          title: 'কেন Sony WH-1000XM5 বেছে নেবেন?',
          items: [
            'ইন্ডাস্ট্রি-লিডিং নয়েজ ক্যানসেলেশন — বিশ্বের সেরা এনসি প্রযুক্তি',
            '৩০ ঘণ্টার ব্যাটারি — একবার চার্জে পুরো দিন ব্যবহার',
            'অ্যাডাপ্টিভ সাউন্ড কন্ট্রোল — পরিবেশ অনুযায়ী স্বয়ংক্রিয় সমন্বয়',
            'মাল্টিপয়েন্ট কানেকশন — দুটি ডিভাইস একসাথে সংযোগ',
            '৩ মিনিট ফাস্ট চার্জ — ৩ ঘণ্টা ব্যবহারের জন্য দ্রুত চার্জ',
          ],
        },
      },
      {
        id: 'sec_features',
        type: 'features',
        enabled: true,
        sortOrder: 2,
        data: {
          title: 'টেকনিক্যাল স্পেসিফিকেশন',
          items: [
            'ড্রাইভার: ৩০ মিমি কাস্টম ড্রাইভার ইউনিট',
            'ফ্রিকোয়েন্সি রেসপন্স: ৪ Hz - ৪০,০০০ Hz',
            'ব্লুটুথ: ৫.২ (LDAC, SBC, AAC)',
            'ওজন: ২৫০ গ্রাম (অত্যন্ত হালকা)',
            'বক্স: হার্ড ক্যারি কেস অন্তর্ভুক্ত',
          ],
        },
      },
      {
        id: 'sec_gallery',
        type: 'gallery',
        enabled: true,
        sortOrder: 3,
        data: { title: 'পণ্যের ছবি', urls: [] },
      },
      {
        id: 'sec_testimonials',
        type: 'testimonials',
        enabled: true,
        sortOrder: 4,
        data: {
          title: 'ব্যবহারকারীদের মতামত',
          items: [
            { name: 'আরিফুল ইসলাম', text: 'অফিসে ব্যবহারের জন্য কিনেছি। নয়েজ ক্যানসেলেশন অসাধারণ! এখন ফোকাস করে কাজ করতে পারি।', rating: 5 },
            { name: 'মাহমুদা খানম', text: 'সঙ্গীত শুনতে ভালোবাসি। এই হেডফোনে গানের প্রতিটি নোট পরিষ্কার শোনা যায়। অসাধারণ!', rating: 5 },
            { name: 'সাইফুল ইসলাম', text: 'বিমানে ভ্রমণের সময় ব্যবহার করি। শব্দ বন্ধ হয়ে যায়। ব্যাটারি টিকে অনেক দিন। সত্যিই দারুণ।', rating: 5 },
          ],
        },
      },
      {
        id: 'sec_faq',
        type: 'faq',
        enabled: true,
        sortOrder: 5,
        data: {
          title: 'সচরাপর জিজ্ঞাসা',
          items: [
            'প্রশ্ন: ব্যাটারি কতক্ষণ টিকে? উত্তর: ৩০ ঘণ্টা (এনসি অন)। ৩ মিনিট চার্জে ৩ ঘণ্টা ব্যবহার।',
            'প্রশ্ন: iOS ও Android উভয়ে কি কাজ করে? উত্তর: হ্যাঁ, ব্লুটুথ ৫.২ সহ iOS, Android, Windows, Mac সব কাজ করে।',
            'প্রশ্ন: ওয়্যারেস চার্জিং কি আছে? উত্তর: না, USB-C দিয়ে চার্জ করতে হয়।',
            'প্রশ্ন: ওয়ারেন্টি কতদিন? উত্তর: ১ বছরের সোনি অফিসিয়াল ওয়ারেন্টি।',
          ],
        },
      },
      {
        id: 'sec_cta',
        type: 'cta',
        enabled: true,
        sortOrder: 6,
        data: {
          heading: 'এখনই অর্ডার করুন',
          text: 'সীমিত সময়ের জন্য বিশেষ মূল্যে পাচ্ছেন। কোড অফ ডেলিভারি সুবিধা উপলব্ধ।',
          buttonText: 'এখনই কিনুন',
        },
      },
    ],
  },
];

export async function seedPreWrittenLandingPages(): Promise<void> {
  try {
    const existingCount = await prisma.landingPage.count({ where: { isPrewritten: true } });
    if (existingCount > 0) {
      console.log(JSON.stringify({ msg: 'prewritten_landing_pages_exist', count: existingCount }));
      return;
    }

    const skus = PREWRITTEN_PAGES.map((p) => p.productSku);
    const products = await prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { id: true, sku: true },
    });

    const productMap = new Map(products.map((p) => [p.sku, p.id]));

    let created = 0;
    for (const seed of PREWRITTEN_PAGES) {
      const productId = productMap.get(seed.productSku);
      if (!productId) {
        console.log(JSON.stringify({ msg: 'prewritten_product_not_found', sku: seed.productSku }));
        continue;
      }

      const content = { sections: seed.sections } as unknown as Prisma.InputJsonValue;

      await prisma.landingPage.create({
        data: {
          slug: seed.slug,
          title: seed.title,
          subtitle: seed.subtitle,
          productId,
          template: seed.template,
          content,
          metaDescription: seed.metaDescription,
          active: true,
          isPrewritten: true,
          publishedAt: new Date(),
        },
      });

      created++;
    }

    console.log(JSON.stringify({ msg: 'prewritten_landing_pages_seeded', created }));
  } catch (err) {
    console.error(JSON.stringify({ msg: 'prewritten_seed_error', error: String(err) }));
  }
}
