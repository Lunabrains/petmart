/**
 * What an uploaded file can add to the dashboard. Rows keep the product
 * reference exactly as written in the file (code, barcode or name); the
 * preview step resolves it to a product and the owner confirms before
 * anything is added.
 */

export type ImportFileType = "excel" | "csv" | "pdf";

export interface ImportedProduct {
  code: string;
  name: string;
  barcode?: string;
  brand?: string;
  category?: string;
  supplier?: string;
  cost?: number;
  price?: number;
  stock?: number;
}

export interface ImportedSale {
  date: string;
  /** Code, barcode or name as written in the file. */
  productRef: string;
  productId?: string;
  productName?: string;
  quantity: number;
  /** Unit selling price; defaults to the product's price when missing. */
  price?: number;
  /** Unit cost; defaults to the product's latest cost when missing. */
  cost?: number;
  orderId?: string;
}

export interface ImportedPurchase {
  date: string;
  productRef: string;
  productId?: string;
  productName?: string;
  supplier?: string;
  quantity: number;
  /** Unit purchase cost on this delivery. */
  cost: number;
}

export interface SkippedLine {
  line: string;
  reason: string;
}

export interface ImportPreview {
  fileName: string;
  fileType: ImportFileType;
  /** Plain words: "Supplier invoice", "Sales report", "Price list", "Spreadsheet". */
  documentType: string;
  products: ImportedProduct[];
  sales: ImportedSale[];
  purchases: ImportedPurchase[];
  skipped: SkippedLine[];
  /** Things worth telling the owner: the date and supplier found in the file, sheets read... */
  notes: string[];
}

export interface ImportBatch {
  id: string;
  /** ISO date-time of the import. */
  at: string;
  fileName: string;
  documentType: string;
  products: ImportedProduct[];
  sales: ImportedSale[];
  purchases: ImportedPurchase[];
}

export interface ImportSummary {
  batchId: string;
  productsAdded: number;
  productsUpdated: number;
  salesAdded: number;
  purchasesAdded: number;
  /** Deliveries whose unit cost differs from the product's previous cost. */
  costChanges: number;
  skipped: number;
}

/** What the Import page lists under "Added so far". */
export interface ImportBatchSummary {
  id: string;
  at: string;
  fileName: string;
  documentType: string;
  products: number;
  sales: number;
  purchases: number;
}
