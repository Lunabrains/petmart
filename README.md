# Petmart — owner dashboard (demo)

A very simple management dashboard for a wholesale and retail animal-supplies company. The client
keeps using **Wizzard** as their main system; this dashboard only *reads* the relevant data and
turns it into a screen the owner understands in 30 seconds.

It answers six questions and nothing else:

1. How much am I selling?
2. What products are selling the most?
3. What products are not selling?
4. What is running out?
5. Where am I losing profit?
6. What needs my attention today?

This is a demo: all numbers come from generated demo data. Nothing is written back to Wizzard,
and there is no login, database or integration.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm test        # demo data, metrics, alert rules and Ask answers
npm run typecheck
npm run lint
```

## Pages

| Page | What it shows |
| --- | --- |
| **Home** | Sales today, profit today, stock value, products running low, slow products. "Needs Your Attention" cards with one button each. Best sellers and a 30-day sales chart. |
| **Sales** | Today / this week / this month, orders, average order, profit. Sales over 7 / 30 / 90 days. Best sellers. Products selling less than the month before. |
| **Stock** | Running low (with estimated days left), too much stock, slow products, no sales for 30 / 60 / 90 days. |
| **Products** | Search by name, code, barcode or brand. Product page with price, cost, profit per unit, stock, days of stock, supplier, sales history, cost history and alerts. |
| **Alerts** | Stock, sales and profit problems with New / Seen / Done. |
| **Ask** | "Ask About Your Business": plain questions answered only from the company's numbers. |
| **Import** | Upload an Excel/CSV export from Wizzard or a PDF from a supplier (delivery note, invoice, sales report, price list). The page shows what it recognised, the owner confirms, and the products, deliveries and sales are added to the dashboard. |

## How the numbers are calculated

All calculations live in `src/lib/metrics.ts` and follow the brief exactly:

- **Sales** = quantity × selling price over the period. **Profit** = sales − quantity × cost at the time.
- **Stock value** = current stock × latest cost.
- **Average daily sales** = units sold in the last 30 days ÷ 30. **Estimated days left** = current stock ÷ average daily sales.
- **Cost increase** = latest delivery cost compared with the delivery before it.

Alert rules (`RULES` in the same file): running low < 7 days of stock, low stock < 14 days, slow ≤ 5
units in 60 days, no sales for 90 days, cost increase > 5 %, profit drop = cost went up while the
selling price stayed the same. Alerts are derived every time from the data (`src/lib/alerts.ts`);
only their New / Seen / Done status is remembered, in a small cookie.

The Ask page (`src/lib/ask.ts`) is rule-based: it recognises the main questions and answers with
the same numbers the screens show. It never invents a number; anything it does not understand
gets the list of questions it can answer.

## Demo data

`src/lib/data/demo.ts` generates a deterministic dataset for "today": 500+ products across 10
brands, 10 categories and 10 suppliers, 120 days of sales and a delivery history per product. The
six cases from the brief are guaranteed and tested (`tests/demo.test.ts`):

1. the top seller is almost out of stock (Royal Canin Maxi Adult 15kg),
2. a product with a lot of stock and almost no sales (Catit Cat Bed Premium),
3. supplier cost increased on several products,
4. profit dropped because the cost went up and the price did not (Purina Medium Adult 10kg, $48 → $54 at $65),
5. strong-selling products,
6. a product with no sales for over 90 days (Ferplast Bird Cage XL).

## Import

`src/lib/imports/` reads files without any outside service:

- **Excel / CSV** (`excel.ts`): every sheet is read under its header row. Columns are matched
  loosely ("Qty", "Quantity", "Units"; "Unit Cost", "Purchase Price"...), and a sheet is treated as
  products, sales or deliveries from its name or its columns.
- **PDF** (`pdf.ts`): the text is extracted and every line that names a product we know (by code,
  barcode or exact name) is read for its quantity and unit amount. Wording decides the document type:
  delivery note / invoice → deliveries, sales report → sales, price list → new costs.
- **Apply** (`apply.ts`): a delivery adds stock and becomes the latest cost (so cost-increase and
  profit-drop alerts appear), a sale removes stock, a product row creates or updates a product.
  Imports live in memory for the demo session and can be removed from the Import page.

Two sample files are generated from today's data at `/api/import/sample?type=excel` and
`?type=pdf`, so the demo story always lines up: the running-low top seller gets restocked and two
products arrive at a higher cost.

## Connecting Wizzard later (phase 7)

The dashboard needs only three tables from Wizzard — products (name, code, brand, cost, selling
price, stock), sales (date, product, quantity, selling price, cost) and purchases (product,
supplier, date, purchase cost). Their shapes are in `src/lib/data/types.ts`. To go live, replace
`generateDemo()` in `src/lib/data/index.ts` with a loader that reads Wizzard's export, API or
read-only database into the same `Dataset`. Nothing else changes, and the dashboard stays
read-only.
