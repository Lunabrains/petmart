/**
 * The only data the dashboard needs. Wizzard stays the system of record;
 * these shapes are what its export / API / read-only database must map to.
 * Everything is READ ONLY — nothing is ever written back.
 */

/** Calendar date as `YYYY-MM-DD`. */
export type ISODate = string;

export interface Product {
  id: string;
  /** Wizzard product code, e.g. "RC-DF-0012". */
  code: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  supplier: string;
  /** Latest purchase cost per unit. */
  cost: number;
  /** Current selling price per unit. */
  price: number;
  /** Units on hand right now. */
  stock: number;
}

export interface Sale {
  id: string;
  date: ISODate;
  /** Invoice / ticket the line belongs to — lets us count orders. */
  orderId: string;
  productId: string;
  quantity: number;
  /** Unit selling price at the time of the sale. */
  price: number;
  /** Unit cost at the time of the sale. */
  cost: number;
}

export interface Purchase {
  id: string;
  date: ISODate;
  productId: string;
  supplier: string;
  quantity: number;
  /** Unit purchase cost on this delivery. */
  cost: number;
}

export interface Dataset {
  /** The day the numbers are "as of". */
  today: ISODate;
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  brands: string[];
  categories: string[];
  suppliers: string[];
}
