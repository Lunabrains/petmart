import { addDays, format, getDay, parseISO } from "date-fns";

import type { Dataset, ISODate, Product, Purchase, Sale } from "./types";

/**
 * Realistic demo data for an animal-supplies wholesaler / retailer.
 * Deterministic: the same `today` always produces the same dataset, so every
 * number on every screen is stable while the demo runs.
 *
 * Guaranteed cases (see `DEMO_CASES`):
 *  1. top seller almost out of stock          — Royal Canin Maxi Adult 15kg
 *  2. lots of stock, almost no sales          — Catit Cat Bed Premium
 *  3. supplier cost increased (>5%)           — six products, price unchanged
 *  4. profit dropped because cost increased   — the six above plus two smaller rises
 *  5. strong-selling products                 — ~25 "hot" products
 *  6. no sales for 90+ days                   — Ferplast Bird Cage XL and ~30 more
 */

/** Days of sales history generated (the spec asks for at least 90). */
export const DEMO_DAYS = 120;
const SEED = 20260916;

export const DEMO_CASES = {
  topSellerRunningLow: "Royal Canin Maxi Adult 15kg",
  slowWithLotsOfStock: "Catit Cat Bed Premium",
  costIncreaseExample: "Purina Medium Adult 10kg",
  noSalesForMonths: "Ferplast Bird Cage XL",
} as const;

type Rand = () => number;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const randRange = (rand: Rand, min: number, max: number) => min + rand() * (max - min);

function shuffle<T>(rand: Rand, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function poisson(rand: Rand, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    const u1 = rand() || 1e-12;
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > limit);
  return k - 1;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Retail-looking prices: whole dollars above $15, halves below. */
function roundPrice(v: number): number {
  return v >= 15 ? Math.round(v) : Math.round(v * 2) / 2;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  "Dog Food",
  "Cat Food",
  "Cat Litter",
  "Treats",
  "Toys",
  "Accessories",
  "Grooming",
  "Bird Supplies",
  "Beds",
  "Supplements",
] as const;

export const BRANDS = [
  "Royal Canin",
  "Purina",
  "Hill's",
  "Whiskas",
  "Pedigree",
  "Kong",
  "Trixie",
  "Catit",
  "Ferplast",
  "Beaphar",
] as const;

export const SUPPLIERS = [
  "Levant Pet Distribution",
  "Mediterranean Pet Supply",
  "Global Animal Care Trading",
  "Northline Wholesale",
  "PetSource Import & Export",
  "Blue Ridge Pet Products",
  "Al Rawda Trading",
  "Prime Feed Distributors",
  "Fauna Imports",
  "Sunrise Pet Wholesale",
] as const;

const BRAND_CODE: Record<string, string> = {
  "Royal Canin": "RC",
  Purina: "PUR",
  "Hill's": "HIL",
  Whiskas: "WHI",
  Pedigree: "PED",
  Kong: "KNG",
  Trixie: "TRX",
  Catit: "CAT",
  Ferplast: "FER",
  Beaphar: "BEA",
};

interface Template {
  name: string;
  price: number;
}

interface CategorySpec {
  code: string;
  brands: string[];
  target: number;
  items: Template[];
  /** Gross margin range on the selling price. */
  margin: [number, number];
}

function expand(lines: string[], sizes: Array<[string, number]>): Template[] {
  const out: Template[] = [];
  for (const line of lines) for (const [size, price] of sizes) out.push({ name: `${line} ${size}`, price });
  return out;
}

const DOG_LINES = [
  "Maxi Adult",
  "Medium Adult",
  "Mini Adult",
  "Puppy",
  "Senior Dog",
  "Light Weight Care",
  "Digestive Care",
  "Sensitive Skin",
  "Lamb & Rice",
  "Chicken & Vegetables",
  "Beef & Rice",
  "Grain Free Salmon",
];
const CAT_LINES = [
  "Indoor",
  "Kitten",
  "Sterilised",
  "Hairball Control",
  "Sensitive",
  "Urinary Care",
  "Adult Chicken",
  "Adult Fish",
  "Senior Cat",
  "Light",
];

const CATALOG: Record<string, CategorySpec> = {
  "Dog Food": {
    code: "DF",
    brands: ["Royal Canin", "Purina", "Hill's", "Pedigree"],
    target: 100,
    margin: [0.24, 0.36],
    items: [
      ...expand(DOG_LINES, [
        ["2kg", 21],
        ["4kg", 36],
        ["10kg", 64],
        ["15kg", 88],
      ]),
      { name: "Adult Wet Pouch 100g", price: 1.9 },
      { name: "Adult Dog Can 400g", price: 3.2 },
      { name: "Puppy Can 400g", price: 3.4 },
      { name: "Senior Can 400g", price: 3.4 },
    ],
  },
  "Cat Food": {
    code: "CF",
    brands: ["Royal Canin", "Purina", "Hill's", "Whiskas"],
    target: 100,
    margin: [0.26, 0.4],
    items: [
      ...expand(CAT_LINES, [
        ["400g", 7.5],
        ["2kg", 26],
        ["4kg", 46],
        ["10kg", 92],
      ]),
      { name: "Tuna Pouch 85g", price: 1.6 },
      { name: "Chicken in Jelly 85g", price: 1.6 },
      { name: "Salmon in Gravy 85g", price: 1.7 },
      { name: "Kitten Pouch 85g", price: 1.7 },
      { name: "Mixed Selection 12x85g", price: 15.9 },
      { name: "Adult Cat Can 400g", price: 3.1 },
    ],
  },
  "Cat Litter": {
    code: "CL",
    brands: ["Catit", "Purina", "Trixie"],
    target: 27,
    margin: [0.28, 0.42],
    items: [
      { name: "Clumping Litter 5kg", price: 9.5 },
      { name: "Clumping Litter 10kg", price: 17 },
      { name: "Silica Crystals 3.8L", price: 14 },
      { name: "Wood Pellets 10L", price: 12 },
      { name: "Scented Clumping 8kg", price: 16 },
      { name: "Tofu Litter 6L", price: 13.5 },
      { name: "Litter Tray", price: 22 },
      { name: "Litter Scoop", price: 6 },
      { name: "Litter Mat", price: 18 },
    ],
  },
  Treats: {
    code: "TR",
    brands: ["Purina", "Pedigree", "Whiskas", "Kong", "Trixie"],
    target: 48,
    margin: [0.3, 0.45],
    items: [
      { name: "Dental Sticks 7-pack", price: 6.5 },
      { name: "Dental Sticks 28-pack", price: 21 },
      { name: "Training Treats 200g", price: 5.5 },
      { name: "Chicken Jerky 100g", price: 7 },
      { name: "Salmon Bites 80g", price: 6 },
      { name: "Rawhide Bones 3-pack", price: 9 },
      { name: "Cat Crunchy Treats 60g", price: 3 },
      { name: "Cat Lick Treats 4-pack", price: 4 },
      { name: "Puppy Chews 150g", price: 8 },
      { name: "Biscuits 500g", price: 7.5 },
    ],
  },
  Toys: {
    code: "TY",
    brands: ["Kong", "Trixie", "Catit"],
    target: 36,
    margin: [0.35, 0.5],
    items: [
      { name: "Classic Rubber Toy S", price: 9 },
      { name: "Classic Rubber Toy M", price: 12 },
      { name: "Classic Rubber Toy L", price: 16 },
      { name: "Rope Tug", price: 8 },
      { name: "Squeaky Ball 2-pack", price: 7 },
      { name: "Plush Duck", price: 11 },
      { name: "Cat Wand Feather", price: 6 },
      { name: "Catnip Mouse 3-pack", price: 5 },
      { name: "Laser Pointer", price: 7.5 },
      { name: "Treat Dispenser Ball", price: 14 },
      { name: "Tennis Balls 3-pack", price: 6 },
      { name: "Interactive Puzzle", price: 24 },
    ],
  },
  Accessories: {
    code: "AC",
    brands: ["Trixie", "Kong", "Catit", "Ferplast"],
    target: 70,
    margin: [0.32, 0.48],
    items: [
      { name: "Nylon Leash 1.2m", price: 12 },
      { name: "Nylon Leash 2m", price: 15 },
      { name: "Adjustable Collar S", price: 9 },
      { name: "Adjustable Collar M", price: 11 },
      { name: "Adjustable Collar L", price: 13 },
      { name: "Harness S", price: 18 },
      { name: "Harness M", price: 22 },
      { name: "Harness L", price: 26 },
      { name: "Stainless Bowl 0.5L", price: 8 },
      { name: "Stainless Bowl 1.5L", price: 12 },
      { name: "Double Bowl Stand", price: 34 },
      { name: "Travel Carrier S", price: 42 },
      { name: "Travel Carrier M", price: 58 },
      { name: "Retractable Lead 5m", price: 24 },
      { name: "Water Bottle 500ml", price: 10 },
      { name: "ID Tag", price: 5 },
      { name: "Poop Bags 120-pack", price: 6 },
      { name: "Cat Scratching Post", price: 29 },
      { name: "Cat Tree Medium", price: 89 },
      { name: "Cat Tree Large", price: 139 },
    ],
  },
  Grooming: {
    code: "GR",
    brands: ["Trixie", "Beaphar"],
    target: 24,
    margin: [0.32, 0.46],
    items: [
      { name: "Slicker Brush", price: 11 },
      { name: "Deshedding Tool", price: 24 },
      { name: "Nail Clipper", price: 9 },
      { name: "Dog Shampoo 500ml", price: 12 },
      { name: "Puppy Shampoo 250ml", price: 8 },
      { name: "Cat Shampoo 250ml", price: 8.5 },
      { name: "Flea Comb", price: 5 },
      { name: "Ear Cleaner 100ml", price: 9 },
      { name: "Grooming Gloves", price: 10 },
      { name: "Detangling Spray 200ml", price: 9.5 },
      { name: "Toothbrush Kit", price: 8 },
      { name: "Pet Wipes 80-pack", price: 6.5 },
    ],
  },
  "Bird Supplies": {
    code: "BS",
    brands: ["Ferplast", "Trixie", "Beaphar"],
    target: 40,
    margin: [0.28, 0.42],
    items: [
      { name: "Bird Cage S", price: 65 },
      { name: "Bird Cage M", price: 120 },
      { name: "Bird Cage L", price: 240 },
      { name: "Bird Cage XL", price: 480 },
      { name: "Budgie Seed Mix 1kg", price: 6 },
      { name: "Parrot Seed Mix 2kg", price: 14 },
      { name: "Canary Seed 1kg", price: 6.5 },
      { name: "Cuttlebone 2-pack", price: 3.5 },
      { name: "Bird Bath", price: 9 },
      { name: "Perch Set", price: 12 },
      { name: "Mineral Block", price: 4 },
      { name: "Feeder Cup 2-pack", price: 7 },
      { name: "Nesting Box", price: 16 },
      { name: "Bird Swing", price: 8 },
    ],
  },
  Beds: {
    code: "BD",
    brands: ["Trixie", "Catit", "Ferplast"],
    target: 34,
    margin: [0.34, 0.48],
    items: [
      { name: "Cat Bed Premium", price: 44 },
      { name: "Donut Bed S", price: 28 },
      { name: "Donut Bed M", price: 38 },
      { name: "Donut Bed L", price: 52 },
      { name: "Orthopedic Mattress M", price: 64 },
      { name: "Orthopedic Mattress L", price: 84 },
      { name: "Cave Bed", price: 36 },
      { name: "Cooling Mat", price: 26 },
      { name: "Fleece Blanket", price: 14 },
      { name: "Sofa Bed M", price: 58 },
      { name: "Sofa Bed L", price: 78 },
      { name: "Cushion Bed XL", price: 72 },
    ],
  },
  Supplements: {
    code: "SP",
    brands: ["Beaphar", "Hill's", "Trixie"],
    target: 34,
    margin: [0.36, 0.5],
    items: [
      { name: "Omega-3 Oil 250ml", price: 18 },
      { name: "Joint Support 60 tabs", price: 26 },
      { name: "Multivitamin 100 tabs", price: 16 },
      { name: "Probiotic Paste 60ml", price: 14 },
      { name: "Calcium Tablets 180", price: 15 },
      { name: "Skin & Coat 90 caps", price: 22 },
      { name: "Calming Drops 30ml", price: 17 },
      { name: "Kitten Milk Replacer 200g", price: 19 },
      { name: "Puppy Milk Replacer 400g", price: 29 },
      { name: "Hairball Paste 100g", price: 9 },
      { name: "Dental Powder 70g", price: 13 },
      { name: "Flea & Tick Spot-On 3-pack", price: 24 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Product behaviour
// ---------------------------------------------------------------------------

type Tier = "hot" | "good" | "normal" | "slow" | "dead";

interface Behaviour {
  tier: Tier;
  /** Average units sold per day. */
  lambda: number;
  /** Multiplier applied to the last 30 days (selling less / selling more). */
  recentFactor: number;
  /** No sales at all more recently than this many days ago (one sale forced on that day). */
  noSalesSince?: number;
  /** Stock expressed as days of sales, or as units. */
  stockDays?: number;
  stockUnits?: number;
  /** Latest delivery cost vs the one before, e.g. 0.12 = +12%. */
  costChange?: number;
  costChangeDaysAgo?: number;
  /** Selling price was raised together with the cost (so profit did NOT drop). */
  priceRaised?: boolean;
}

const WEEKDAY_FACTOR = [0.75, 1.0, 0.95, 1.0, 1.05, 1.1, 1.25]; // Sun..Sat

function tierFor(rand: Rand): Tier {
  const r = rand();
  if (r < 0.05) return "hot";
  if (r < 0.27) return "good";
  if (r < 0.86) return "normal";
  if (r < 0.94) return "slow";
  return "dead";
}

function baseLambda(rand: Rand, tier: Tier, price: number): number {
  // Cheap pouches move many units a day; a $480 cage moves a couple a week.
  const priceAdjust = Math.min(2.2, Math.max(0.12, Math.sqrt(28 / price)));
  switch (tier) {
    case "hot":
      return randRange(rand, 6, 14) * priceAdjust;
    case "good":
      return randRange(rand, 2.5, 5.5) * priceAdjust;
    case "normal":
      return randRange(rand, 0.6, 2.2) * priceAdjust;
    case "slow":
      return randRange(rand, 0.02, 0.07);
    case "dead":
      return 0;
  }
}

function baseStockDays(rand: Rand, tier: Tier): number {
  switch (tier) {
    case "hot":
      return randRange(rand, 16, 35);
    case "good":
      return randRange(rand, 16, 40);
    default:
      return randRange(rand, 18, 55);
  }
}

function behaviourFor(rand: Rand, price: number): Behaviour {
  let tier = tierFor(rand);
  // Big-ticket items (cages, cat trees) are never volume sellers.
  if (price > 100 && (tier === "hot" || tier === "good")) tier = "normal";
  const lambda = baseLambda(rand, tier, price);
  if (tier === "slow") return { tier, lambda, recentFactor: 1, stockUnits: randInt(rand, 10, 60) };
  if (tier === "dead")
    return { tier, lambda, recentFactor: 1, stockUnits: randInt(rand, 4, 40), noSalesSince: randInt(rand, 91, DEMO_DAYS + 20) };
  return { tier, lambda, recentFactor: 1, stockDays: baseStockDays(rand, tier) };
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function generateDemo(today: ISODate): Dataset {
  const rand = mulberry32(SEED);
  const todayDate = parseISO(today);

  // 1. Products -------------------------------------------------------------
  const products: Product[] = [];
  const behaviours = new Map<string, Behaviour>();
  let seq = 1;

  const caseCombos = Object.values(DEMO_CASES).map((full) => {
    const brand = BRANDS.find((b) => full.startsWith(`${b} `))!;
    return { brand, item: full.slice(brand.length + 1) };
  });

  for (const category of CATEGORIES) {
    const spec = CATALOG[category];
    const combos: Array<{ brand: string; item: Template }> = [];
    for (const brand of spec.brands) for (const item of spec.items) combos.push({ brand, item });
    const chosen = shuffle(rand, combos).slice(0, spec.target);
    // Keep the named demo cases in the catalogue whatever the shuffle did.
    for (const wanted of caseCombos) {
      const combo = combos.find((c) => c.brand === wanted.brand && c.item.name === wanted.item);
      if (combo && !chosen.includes(combo)) chosen[chosen.length - 1] = combo;
    }

    let catSeq = 1;
    for (const { brand, item } of chosen) {
      const id = `P${String(seq).padStart(4, "0")}`;
      const price = roundPrice(item.price * randRange(rand, 0.92, 1.08));
      const margin = randRange(rand, spec.margin[0], spec.margin[1]);
      const cost = round2(price * (1 - margin));
      const brandIndex = BRANDS.indexOf(brand as (typeof BRANDS)[number]);
      const supplier =
        rand() < 0.8 ? SUPPLIERS[brandIndex] : SUPPLIERS[(brandIndex + randInt(rand, 1, 9)) % SUPPLIERS.length];
      const digits = String(620000000000 + seq * 7919 + catSeq * 13).slice(0, 12);
      products.push({
        id,
        code: `${BRAND_CODE[brand]}-${spec.code}-${String(catSeq).padStart(3, "0")}`,
        barcode: digits + checkDigit(digits),
        name: `${brand} ${item.name}`,
        brand,
        category,
        supplier,
        cost,
        price,
        stock: 0,
      });
      behaviours.set(id, behaviourFor(rand, price));
      seq++;
      catSeq++;
    }
  }

  const byName = new Map(products.map((p) => [p.name, p]));
  const behaviourOf = (p: Product) => behaviours.get(p.id)!;

  // 2. Guaranteed demo cases -----------------------------------------------
  const topSeller = byName.get(DEMO_CASES.topSellerRunningLow)!;
  topSeller.price = 89;
  topSeller.cost = 62;
  behaviours.set(topSeller.id, { tier: "hot", lambda: 7, recentFactor: 1, stockDays: 3.4 });

  const slowBed = byName.get(DEMO_CASES.slowWithLotsOfStock)!;
  slowBed.price = 44;
  slowBed.cost = 28.33;
  behaviours.set(slowBed.id, { tier: "slow", lambda: 0.05, recentFactor: 1, stockUnits: 120, noSalesSince: 42 });

  const deadCage = byName.get(DEMO_CASES.noSalesForMonths)!;
  deadCage.price = 480;
  deadCage.cost = 350;
  behaviours.set(deadCage.id, { tier: "dead", lambda: 0, recentFactor: 1, stockUnits: 8, noSalesSince: 96 });

  const costExample = byName.get(DEMO_CASES.costIncreaseExample)!;
  costExample.price = 65;
  costExample.cost = 48;
  behaviours.set(costExample.id, {
    tier: "good",
    lambda: 3.2,
    recentFactor: 1,
    stockDays: 32,
    costChange: 54 / 48 - 1,
    costChangeDaysAgo: 9,
  });

  const forced = new Set<string>([topSeller.id, slowBed.id, deadCage.id, costExample.id]);
  const sellers = shuffle(
    rand,
    products.filter((p) => !forced.has(p.id) && ["hot", "good", "normal"].includes(behaviourOf(p).tier)),
  );
  const take = (n: number) => {
    const out: Product[] = [];
    while (out.length < n && sellers.length) {
      const p = sellers.pop()!;
      forced.add(p.id);
      out.push(p);
    }
    return out;
  };

  // Case 1 companions: running low (<7 days) and low stock (7–14 days).
  for (const p of take(11)) behaviourOf(p).stockDays = randRange(rand, 1.5, 6.5);
  for (const p of take(8)) behaviourOf(p).stockDays = randRange(rand, 7.5, 13.5);
  // Too much stock: sells, but far more on the shelf than needed.
  for (const p of take(10)) behaviourOf(p).stockDays = randRange(rand, 150, 320);
  // Cases 3 and 4: cost increases.
  for (const p of take(5))
    Object.assign(behaviourOf(p), { costChange: randRange(rand, 0.06, 0.15), costChangeDaysAgo: randInt(rand, 3, 20) });
  for (const p of take(2))
    Object.assign(behaviourOf(p), { costChange: randRange(rand, 0.03, 0.045), costChangeDaysAgo: randInt(rand, 3, 20) });
  for (const p of take(3))
    Object.assign(behaviourOf(p), {
      costChange: randRange(rand, 0.07, 0.1),
      costChangeDaysAgo: randInt(rand, 3, 20),
      priceRaised: true,
    });
  // Selling less / selling more.
  for (const p of take(10)) behaviourOf(p).recentFactor = randRange(rand, 0.45, 0.7);
  for (const p of take(6)) behaviourOf(p).recentFactor = randRange(rand, 1.3, 1.6);

  // 3. Purchases (cost history) -------------------------------------------
  const purchases: Purchase[] = [];
  const costTimeline = new Map<string, Array<{ daysAgo: number; cost: number }>>();
  let purchaseSeq = 1;
  for (const p of products) {
    const b = behaviourOf(p);
    const baseCost = p.cost;
    const slots = [randInt(rand, 120, 150), randInt(rand, 70, 110), randInt(rand, 30, 65), randInt(rand, 5, 25)];
    const count = randInt(rand, 2, 4);
    let daysAgoList = slots.slice(0, count).sort((a, c) => c - a);
    if (b.costChange !== undefined) {
      const changeDay = b.costChangeDaysAgo!;
      daysAgoList = daysAgoList.filter((d) => d > changeDay + 3);
      if (daysAgoList.length === 0) daysAgoList = [changeDay + randInt(rand, 30, 60)];
      daysAgoList.push(changeDay);
    }
    const timeline: Array<{ daysAgo: number; cost: number }> = [];
    daysAgoList.forEach((daysAgo, i) => {
      const isLast = i === daysAgoList.length - 1;
      // Earlier deliveries wobble by under 1% (never enough to read as a cost
      // change); the latest delivery, and every delivery of a product with a
      // planned cost change, is exact so the demo numbers match the brief.
      const cost =
        b.costChange !== undefined && isLast
          ? round2(baseCost * (1 + b.costChange))
          : isLast || b.costChange !== undefined
            ? baseCost
            : round2(baseCost * (1 + randRange(rand, -0.008, 0.008)));
      timeline.push({ daysAgo, cost });
      const monthly = Math.max(6, Math.round(b.lambda * randRange(rand, 20, 45)));
      purchases.push({
        id: `B${String(purchaseSeq++).padStart(5, "0")}`,
        date: format(addDays(todayDate, -daysAgo), "yyyy-MM-dd"),
        productId: p.id,
        supplier: p.supplier,
        quantity: b.tier === "dead" || b.tier === "slow" ? randInt(rand, 6, 24) : monthly,
        cost,
      });
    });
    costTimeline.set(p.id, timeline);
    p.cost = timeline[timeline.length - 1].cost;
    if (b.priceRaised) {
      // Price went up with the cost; sales before the change used the old price.
      p.price = roundPrice(p.price * (1 + b.costChange!));
    }
  }

  const costAt = (productId: string, daysAgo: number): number => {
    const timeline = costTimeline.get(productId)!;
    let cost = timeline[0].cost;
    for (const entry of timeline) if (entry.daysAgo >= daysAgo) cost = entry.cost;
    return cost;
  };

  const priceAt = (p: Product, daysAgo: number): number => {
    const b = behaviourOf(p);
    if (b.priceRaised && daysAgo >= b.costChangeDaysAgo!) return roundPrice(p.price / (1 + b.costChange!));
    return p.price;
  };

  // 4. Sales ----------------------------------------------------------------
  const sales: Sale[] = [];
  let saleSeq = 1;
  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const date = addDays(todayDate, -daysAgo);
    const iso = format(date, "yyyy-MM-dd");
    const dayFactor = WEEKDAY_FACTOR[getDay(date)] * (1 + 0.1 * ((DEMO_DAYS - 1 - daysAgo) / (DEMO_DAYS - 1)));
    const orders = 45 + poisson(rand, 12);
    for (const p of products) {
      const b = behaviourOf(p);
      let units: number;
      if (b.noSalesSince !== undefined && daysAgo < b.noSalesSince) units = 0;
      else if (b.noSalesSince !== undefined && daysAgo === b.noSalesSince) units = 1;
      else units = poisson(rand, b.lambda * dayFactor * (daysAgo < 30 ? b.recentFactor : 1));
      let remaining = units;
      while (remaining > 0) {
        const wholesale = remaining >= 6 && rand() < 0.35;
        const quantity = Math.min(remaining, wholesale ? randInt(rand, 6, 24) : randInt(rand, 1, 3));
        remaining -= quantity;
        sales.push({
          id: `S${String(saleSeq++).padStart(6, "0")}`,
          date: iso,
          orderId: `O-${iso}-${String(randInt(rand, 1, orders)).padStart(3, "0")}`,
          productId: p.id,
          quantity,
          price: priceAt(p, daysAgo),
          cost: costAt(p.id, daysAgo),
        });
      }
    }
  }

  // 5. Stock ----------------------------------------------------------------
  const soldLast30 = new Map<string, number>();
  const cutoff = format(addDays(todayDate, -29), "yyyy-MM-dd");
  for (const s of sales) {
    if (s.date >= cutoff) soldLast30.set(s.productId, (soldLast30.get(s.productId) ?? 0) + s.quantity);
  }
  for (const p of products) {
    const b = behaviourOf(p);
    if (b.stockUnits !== undefined) p.stock = b.stockUnits;
    else {
      const avgDaily = (soldLast30.get(p.id) ?? 0) / 30;
      p.stock = Math.max(1, Math.round(avgDaily * (b.stockDays ?? 30)));
    }
  }
  topSeller.stock = 24;

  return {
    today,
    products,
    sales,
    purchases,
    brands: [...BRANDS],
    categories: [...CATEGORIES],
    suppliers: [...SUPPLIERS],
  };
}

function checkDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}
