const cds = require("@sap/cds");
const express = require("express");
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

const DEFAULT_LINE_ITEM_COLUMNS = [
  { key: "productName", label: "Product Name", visible: true, mandatory: true, editable: true, isCalculated: false, formula: "", sortOrder: 0 },
  { key: "sku", label: "SKU", visible: true, mandatory: true, editable: true, isCalculated: false, formula: "", sortOrder: 1 },
  { key: "quantity", label: "QTY", visible: true, mandatory: true, editable: true, isCalculated: false, formula: "", sortOrder: 2 },
  { key: "listPrice", label: "List Price", visible: true, mandatory: true, editable: true, isCalculated: false, formula: "", sortOrder: 3 },
  { key: "cost", label: "Cost", visible: true, mandatory: true, editable: true, isCalculated: false, formula: "", sortOrder: 4 },
  { key: "volumeDiscount", label: "Discount %", visible: true, mandatory: false, editable: true, isCalculated: false, formula: "", sortOrder: 5 },
  { key: "rebate", label: "Rebate", visible: true, mandatory: false, editable: true, isCalculated: false, formula: "", sortOrder: 6 },
  { key: "netPrice", label: "Net Price", visible: true, mandatory: false, editable: false, isCalculated: true, formula: "", sortOrder: 7 },
  { key: "margin", label: "Margin %", visible: true, mandatory: false, editable: false, isCalculated: true, formula: "", sortOrder: 8 },
  { key: "totalValue", label: "Total Value", visible: true, mandatory: false, editable: false, isCalculated: true, formula: "", sortOrder: 9 }
];

const toNum = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};

const safeJson = (v, fallback) => {
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

module.exports = function registerApiCompat(app) {
  const router = express.Router();
  app.use("/api", router);
  router.use(express.json({ limit: "10mb" }));
  router.use(express.urlencoded({ extended: true }));

  router.use((req, _res, next) => {
    if (!req.user) req.user = { id: "anonymous" };
    next();
  });

  const UiQuotes = "pricing.UiQuotes";
  const UiQuoteItems = "pricing.UiQuoteItems";
  const UiProducts = "pricing.UiProducts";
  const UiCustomers = "pricing.UiCustomers";
  const UiSellers = "pricing.UiSellers";
  const UiLineItemConfigs = "pricing.UiLineItemConfigs";
  const UiWorkflowRules = "pricing.UiWorkflowRules";
  const PricingTransactions = "pricing.PricingTransactions";

  const getDb = () => cds.connect.to("db");

  const masterEntity = (name) => {
    if (name === "products") return { entity: UiProducts, idField: "product_id" };
    if (name === "customers") return { entity: UiCustomers, idField: "customer_id" };
    if (name === "sellers") return { entity: UiSellers, idField: "seller_id" };
    return null;
  };

  router.get("/quotes/list", async (_req, res) => {
    const db = await getDb();
    const quotes = await db.run(SELECT.from(UiQuotes));
    const items = await db.run(SELECT.from(UiQuoteItems));

    const grouped = new Map();
    for (const item of items) {
      const entry = grouped.get(item.quote_id) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += toNum(item.totalValue);
      grouped.set(item.quote_id, entry);
    }

    const data = quotes
      .map((q) => {
        const aggr = grouped.get(q.id) || { count: 0, total: 0 };
        return {
          id: q.id,
          description: q.description || "",
          customerName: q.customerName || "",
          lineItemCount: aggr.count,
          totalValue: Number(aggr.total.toFixed(2)),
          dateModified: q.modifiedAt || q.createdAt || new Date().toISOString()
        };
      })
      .sort((a, b) => String(b.dateModified).localeCompare(String(a.dateModified)));

    res.json({ success: true, data });
  });

  router.get("/quotes/:id", async (req, res) => {
    const db = await getDb();
    const id = req.params.id;
    const quote = await db.run(SELECT.one.from(UiQuotes).where({ id }));
    if (!quote) return res.status(404).json({ success: false, message: "Quote not found" });

    const rows = await db.run(SELECT.from(UiQuoteItems).where({ quote_id: id }));
    const lineItems = rows.map((r) => {
      const dynamic = safeJson(r.dynamic_fields, {});
      return {
        id: r.id,
        productName: r.productName,
        sku: r.sku,
        quantity: toNum(r.quantity),
        listPrice: toNum(r.listPrice),
        cost: toNum(r.cost),
        volumeDiscount: toNum(r.volumeDiscount),
        rebate: toNum(r.rebate),
        netPrice: toNum(r.netPrice),
        margin: toNum(r.margin),
        totalValue: toNum(r.totalValue),
        ...dynamic
      };
    });

    res.json({
      success: true,
      data: {
        id: quote.id,
        description: quote.description || "",
        customerName: quote.customerName || "",
        customerId: quote.customerId || "",
        customerSegment: quote.customerSegment || "Enterprise",
        productHierarchy: quote.productHierarchy || "",
        salesOrg: quote.salesOrg || "",
        region: quote.region || "",
        country: quote.country || "",
        currency: quote.currency || "USD",
        priceList: quote.priceList || "",
        validityDate: quote.validityDate || "",
        paymentTerms: quote.paymentTerms || "",
        lineItems
      }
    });
  });

  router.post("/quotes/save", async (req, res) => {
    const db = await getDb();
    const body = req.body || {};
    const id = String(body.id || `Q-${Date.now()}`);

    const quotePayload = {
      id,
      description: body.description || "",
      customerName: body.customerName || "",
      customerId: body.customerId || "",
      customerSegment: body.customerSegment || "",
      productHierarchy: body.productHierarchy || "",
      salesOrg: body.salesOrg || "",
      region: body.region || "",
      country: body.country || "",
      currency: body.currency || "USD",
      priceList: body.priceList || "",
      validityDate: body.validityDate || null,
      paymentTerms: body.paymentTerms || ""
    };

    const exists = await db.run(SELECT.one.from(UiQuotes).where({ id }));
    if (exists) {
      await db.run(UPDATE(UiQuotes).set(quotePayload).where({ id }));
    } else {
      await db.run(INSERT.into(UiQuotes).entries(quotePayload));
    }

    await db.run(DELETE.from(UiQuoteItems).where({ quote_id: id }));

    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
    const rows = lineItems.map((line, idx) => {
      const qty = toNum(line.quantity);
      const listPrice = toNum(line.listPrice);
      const cost = toNum(line.cost);
      const discount = toNum(line.volumeDiscount);
      const rebate = toNum(line.rebate);
      const discountedPrice = listPrice * (1 - discount / 100);
      const totalBeforeRebate = discountedPrice * qty;
      const totalValue = totalBeforeRebate - rebate;
      const netPrice = qty > 0 ? totalValue / qty : 0;
      const margin = totalValue > 0 ? ((totalValue - cost * qty) / totalValue) * 100 : 0;
      return {
        id: String(line.id || `${id}-L${idx + 1}`),
        quote_id: id,
        productName: String(line.productName || ""),
        sku: String(line.sku || ""),
        quantity: qty,
        listPrice,
        cost,
        volumeDiscount: discount,
        rebate,
        netPrice,
        margin,
        totalValue,
        dynamic_fields: JSON.stringify(line.dynamic_fields || {})
      };
    });

    if (rows.length) await db.run(INSERT.into(UiQuoteItems).entries(rows));
    res.json({ success: true, data: { id } });
  });

  router.delete("/quotes/:id", async (req, res) => {
    const db = await getDb();
    const id = req.params.id;
    await db.run(DELETE.from(UiQuoteItems).where({ quote_id: id }));
    await db.run(DELETE.from(UiQuotes).where({ id }));
    res.json({ success: true });
  });

  router.get("/master/:entity", async (req, res) => {
    const info = masterEntity(req.params.entity);
    if (!info) return res.status(404).json({ success: false, message: "Entity not found" });
    const db = await getDb();
    const data = await db.run(SELECT.from(info.entity));
    res.json({ success: true, data });
  });

  router.post("/master/:entity", async (req, res) => {
    const info = masterEntity(req.params.entity);
    if (!info) return res.status(404).json({ success: false, message: "Entity not found" });
    const db = await getDb();
    const payload = req.body || {};
    if (!payload[info.idField]) {
      const prefix = info.idField.startsWith("product") ? "P" : info.idField.startsWith("customer") ? "CUST" : "SEL";
      payload[info.idField] = `${prefix}-${Date.now()}`;
    }
    await db.run(INSERT.into(info.entity).entries(payload));
    res.json({ success: true, data: payload });
  });

  router.put("/master/:entity/:id", async (req, res) => {
    const info = masterEntity(req.params.entity);
    if (!info) return res.status(404).json({ success: false, message: "Entity not found" });
    const db = await getDb();
    const id = req.params.id;
    await db.run(UPDATE(info.entity).set(req.body || {}).where({ [info.idField]: id }));
    const data = await db.run(SELECT.one.from(info.entity).where({ [info.idField]: id }));
    res.json({ success: true, data });
  });

  router.delete("/master/:entity/:id", async (req, res) => {
    const info = masterEntity(req.params.entity);
    if (!info) return res.status(404).json({ success: false, message: "Entity not found" });
    const db = await getDb();
    const id = req.params.id;
    await db.run(DELETE.from(info.entity).where({ [info.idField]: id }));
    res.json({ success: true });
  });

  router.get("/admin/line-item-config", async (req, res) => {
    const db = await getDb();
    const tenantId = String(req.query.tenant_id || "default");
    const row = await db.run(SELECT.one.from(UiLineItemConfigs).where({ tenant_id: tenantId }));
    const columns = row ? safeJson(row.columns, DEFAULT_LINE_ITEM_COLUMNS) : DEFAULT_LINE_ITEM_COLUMNS;
    res.json({ success: true, data: { tenantId, columns } });
  });

  router.put("/admin/line-item-config", async (req, res) => {
    const db = await getDb();
    const tenantId = String(req.query.tenant_id || "default");
    const columnsRaw = Array.isArray(req.body?.columns) ? req.body.columns : DEFAULT_LINE_ITEM_COLUMNS;
    const columns = columnsRaw.map((c, i) => ({
      key: c.key,
      label: c.label,
      visible: Boolean(c.visible),
      mandatory: Boolean(c.mandatory),
      editable: Boolean(c.editable),
      isCalculated: Boolean(c.isCalculated ?? c.is_calculated),
      formula: String(c.formula || ""),
      sortOrder: Number.isFinite(Number(c.sortOrder)) ? Number(c.sortOrder) : i
    }));

    const exists = await db.run(SELECT.one.from(UiLineItemConfigs).where({ tenant_id: tenantId }));
    const payload = { tenant_id: tenantId, columns: JSON.stringify(columns) };
    if (exists) await db.run(UPDATE(UiLineItemConfigs).set(payload).where({ tenant_id: tenantId }));
    else await db.run(INSERT.into(UiLineItemConfigs).entries(payload));

    res.json({ success: true, data: { tenantId, columns } });
  });

  router.post("/admin/seed/sample-data", async (req, res) => {
    const db = await getDb();
    const rowCount = Math.min(Math.max(Number(req.query.row_count || 1000), 1), 50000);
    const skus = ["SKU-1001", "SKU-2040", "SKU-3300"];
    const regions = ["NA", "EMEA", "APJ"];

    const rows = Array.from({ length: rowCount }, (_, i) => {
      const qty = 1 + Math.floor(Math.random() * 200);
      const listPrice = 100 + Math.random() * 2000;
      const discountPct = Math.random() * 25;
      const discountAmount = (listPrice * qty * discountPct) / 100;
      const net = listPrice * qty - discountAmount;
      const d = new Date(Date.now() - Math.floor(Math.random() * 120) * 24 * 3600 * 1000);
      return {
        ID: cds.utils.uuid(),
        sku: skus[i % skus.length],
        region: regions[i % regions.length],
        txDate: d.toISOString().slice(0, 10),
        listPrice: Number((listPrice * qty).toFixed(2)),
        discountPct: Number(discountPct.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        netPrice: Number(net.toFixed(2)),
        overrideReason: discountPct > 20 ? "High discount scenario" : null,
        overrideBy: req.user.id || "seed"
      };
    });

    await db.run(INSERT.into(PricingTransactions).entries(rows));
    res.json({ rows_inserted: rows.length });
  });

  router.post("/admin/seed/workflow-rules", async (_req, res) => {
    const db = await getDb();
    const defaults = [
      { rule_id: "WR-ENTERPRISE", customer_segment: "Enterprise", min_discount_pct: 20, approval_role: "VP" },
      { rule_id: "WR-MIDMARKET", customer_segment: "Mid-Market", min_discount_pct: 10, approval_role: "VP" }
    ];

    let seeded = 0;
    for (const rule of defaults) {
      const exists = await db.run(SELECT.one.from(UiWorkflowRules).where({ rule_id: rule.rule_id }));
      if (!exists) {
        await db.run(INSERT.into(UiWorkflowRules).entries(rule));
        seeded += 1;
      }
    }

    res.json({ seeded_rules: seeded });
  });

  router.post("/admin/sync/run-once", async (_req, res) => {
    res.json({
      status: "ok",
      total_rows_synced: 0,
      tables: {
        products: 0,
        customers: 0,
        sellers: 0,
        transactions: 0
      }
    });
  });

  router.post("/admin/ingest/csv", async (_req, res) => {
    res.json({
      success: true,
      imported_rows: 0,
      message: "CSV ingestion endpoint is reachable. Add parser for full file ingestion in production."
    });
  });
};
