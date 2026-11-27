/**
 * Shop categories — four buckets we show on /shop and under /shop/category/:slug.
 *
 * Vendor data only has two raw categories ("Robotics Kits", "IoT Kits") which
 * is too coarse for SEO + browsing. This module classifies every product into
 * one of four shop categories by name heuristics so the UI, SEO landings and
 * "You may also like" rail all read from one source of truth.
 */

export const SHOP_CATEGORIES = [
  {
    slug: 'curriculum-books',
    name: 'Curriculum Books',
    short: 'Books',
    icon: 'BookOpen', // from lucide-react
    accent: '#2563EB',
    bg: 'from-blue-50 to-blue-100',
    tagline: 'Robotics, AI & IoT textbooks for Grades 1–10',
    description:
      'NCF/NEP-aligned robotics, AI and IoT textbooks for Grades 1–10, used in 400+ partner schools across India. Each book pairs with the matching Grade kit for a classroom-ready curriculum.',
    seoTitle: 'Robotics, AI & IoT Curriculum Books for Grades 1–10 | OLL Shop',
    seoDescription:
      'Buy OLL\'s NEP-aligned Robotics, AI and IoT curriculum textbooks for Grades 1 to 10. Trusted by 400+ partner schools in India. Flat ₹150 delivery, secure checkout.',
    keywords:
      'robotics textbook, AI textbook class 7 8 9 10, IoT book school curriculum, NEP-aligned robotics book, OLL curriculum books, ICSE CBSE robotics coursebook',
  },
  {
    slug: 'curriculum-robotic-kits',
    name: 'Curriculum Robotic Kits',
    short: 'Grade Kits',
    icon: 'Package',
    accent: '#DC2626',
    bg: 'from-red-50 to-red-100',
    tagline: 'Grade-wise robotics kits that match the OLL coursebook',
    description:
      'Grade-by-grade robotics kits engineered to match the OLL curriculum books page-by-page. Every kit ships with teacher-led syllabus, lesson plans and video tutorials — ready for the classroom from day one.',
    seoTitle: 'Grade-wise Robotics Kits for Schools (Grades 1–10) | OLL Shop',
    seoDescription:
      'Grade 1, 2, 3, 4, 5, 6, 7, 8, 9 & 10 robotics kits aligned to the OLL curriculum. In-classroom tested with 400+ partner schools. Pan-India delivery.',
    keywords:
      'grade 1 robotics kit, grade 5 robotics kit, grade 9 robotics kit, school robotics kit India, curriculum robotics kit, classroom robotics kit, OLL grade kits',
  },
  {
    slug: 'competition-and-advanced-kits',
    name: 'Competition Kits & Advanced Kits',
    short: 'Competition',
    icon: 'Trophy',
    accent: '#F59E0B',
    bg: 'from-amber-50 to-amber-100',
    tagline: 'Championship-ready kits — RoboSumo, RoboRacer, Drone, Aeromodel & 3D Pen',
    description:
      'Battle-ready kits for the OLL × Techfest IIT Bombay championship (RoboSumo, RoboRacer) plus advanced build kits — drones, aero-models and 3D pens — for students pushing beyond the standard syllabus.',
    seoTitle: 'Competition & Advanced Robotics Kits — RoboSumo, RoboRacer, Drone | OLL Shop',
    seoDescription:
      'OLL competition-grade robotics kits for Techfest IIT Bombay 2026 — RoboSumo kit, RoboRacer kit, drone, aero-model and 3D pen. Prize pool ₹1.5L, free registration.',
    keywords:
      'robosumo kit, roboracer kit, iit bombay techfest kit, drone kit for school, aeromodel kit, 3d pen for kids, school robotics competition kit',
  },
  {
    slug: 'individual-components',
    name: 'Individual Components',
    short: 'Components',
    icon: 'Cpu',
    accent: '#047857',
    bg: 'from-emerald-50 to-emerald-100',
    tagline: 'Motors, sensors, wires, Blox and structural parts — buy only what you need',
    description:
      'Need just one Blox, a BO motor, an ESP32 chip, an AI Vision module or a 60mm axle? Buy OLL robotics components à-la-carte. Perfect for replacing worn parts, extending a lab or prototyping a one-off project.',
    seoTitle: 'Robotics Components — Motors, Sensors, Blox, Wires, ESP32, AI Vision | OLL Shop',
    seoDescription:
      'Buy individual robotics components — BO motors, servo motors, ESP32-S3, IR sensors, Blox modules, AI Vision Blox, wires, beams, elbows, axles, gears, batteries. Flat ₹150 delivery across India.',
    keywords:
      'bo motor, servo motor, esp32 s3 chip, ir sensor, oll blox, ai vision blox, robotics components india, motor driver, lipo battery, buzzer blox, servo blox',
  },
];

// Fast lookup by slug
export const CATEGORY_BY_SLUG = Object.fromEntries(SHOP_CATEGORIES.map((c) => [c.slug, c]));

// Lower-case fragments that force a product into a specific category. First
// match wins — ORDER MATTERS. Books come before everything else because
// "Book-G-9 IOT /AI Vision" is a BOOK, not an "AI Vision" competition kit.
const RULES = [
  // ── Books first (so "Book-G-9 IOT /AI Vision" lands in books, not comp) ─
  { slug: 'curriculum-books', match: ['book-', 'book g', 'book-g', 'textbook'] },
  // ── Competition & Advanced ───────────────────────────────────────────
  // NB: AI Vision Blox was previously here under 'ai vision' but it is a
  // standalone sensor module customers buy à-la-carte, so it belongs under
  // Individual Components (handled implicitly by the fall-through below).
  { slug: 'competition-and-advanced-kits', match: ['robo sumo', 'robosumo', 'robo racer', 'roboracer', 'drone', 'aeromodel', '3d pen'] },
  // ── Grade kits ──
  { slug: 'curriculum-robotic-kits', match: ['grade 1 robotics kit', 'grade 2  robotics kit', 'grade 2 robotics kit', 'grade 3 robotics kit', 'grade 4 robotics kit', 'grade 5 robotics kit', 'grade 6 robotics kit', 'grade 7  robotics kit', 'grade 7 robotics kit', 'grade 8 robotics kit', 'grade 9 rob kit', 'grade 10 rob kit'] },
];

// Loose match of the vendor-panel `category` text → shop slug.
const VENDOR_CATEGORY_RULES = [
  { slug: 'curriculum-books', match: ['book'] },
  { slug: 'competition-and-advanced-kits', match: ['competition', 'advanced'] },
  { slug: 'curriculum-robotic-kits', match: ['curriculum', 'robotic kit', 'grade kit', 'grade'] },
  { slug: 'individual-components', match: ['component', 'part', 'spare'] },
];

const fromVendorCategory = (raw) => {
  const v = (raw || '').toLowerCase().trim();
  if (!v) return null;
  const slugified = v.replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (CATEGORY_BY_SLUG[slugified]) return slugified;
  const rule = VENDOR_CATEGORY_RULES.find((r) => r.match.some((m) => v.includes(m)));
  return rule ? rule.slug : null;
};

/**
 * Classify a product → one of 4 shop category slugs.
 * Falls back to 'individual-components' which is the right bucket for
 * single parts (wires, motors, blox, structural pieces).
 */
export const getShopCategorySlug = (product) => {
  if (!product) return 'individual-components';
  // Allow an explicit override field on the product doc.
  if (product.shop_category && CATEGORY_BY_SLUG[product.shop_category]) {
    return product.shop_category;
  }
  const vendorSlug = fromVendorCategory(product.vendor_category);
  if (vendorSlug) return vendorSlug;
  const name = (product.name || '').toLowerCase().trim();
  for (const rule of RULES) {
    for (const needle of rule.match) {
      if (name.includes(needle)) return rule.slug;
    }
  }
  return 'individual-components';
};

export const getShopCategory = (product) => CATEGORY_BY_SLUG[getShopCategorySlug(product)];
