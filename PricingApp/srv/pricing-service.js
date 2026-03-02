const cds = require("@sap/cds");
const { SELECT } = cds.ql;

const { CalculationEngine } = require("./core/calculation-engine");
const { WorkflowMachine } = require("./core/workflow-machine");
const { PricingRepository } = require("./adapters/repositories");

const isJson = (input) => {
  if (input == null || input === "") return true;
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
};

module.exports = cds.service.impl(function () {
  const {
    Quotes,
    QuoteItems,
    Products,
    Regions,
    PricingTransactions,
    WorkflowTransitions,
    AuditHistory
  } = this.entities;

  const workflow = new WorkflowMachine();
  const engine = new CalculationEngine(async () => ({
    maxDiscountPct: 35
  }));

  cds.once("served", async () => {
    const db = await cds.connect.to("db");
    if (cds.env.requires?.db?.kind !== "sqlite") return;
    try {
      const table = await db.run(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='pricing_PricingTransactions'"
      );
      if (!Array.isArray(table) || !table.length) return;
      await db.run("CREATE INDEX IF NOT EXISTS IDX_TX_SKU_REGION_DATE ON pricing_PricingTransactions (sku, region, txDate)");
      await db.run("CREATE INDEX IF NOT EXISTS IDX_TX_REGION_DATE ON pricing_PricingTransactions (region, txDate)");
      await db.run("CREATE INDEX IF NOT EXISTS IDX_TX_QUOTE_ITEM ON pricing_PricingTransactions (quote_ID, item_ID)");
    } catch (e) {
      cds.log("pricing").warn("Index initialization skipped:", e.message);
    }
  });

  const validateCustomFields = (req, fieldName, value) => {
    if (!isJson(value)) {
      req.reject(400, `${fieldName} must be a valid JSON string`);
    }
  };

  this.before(["CREATE", "UPDATE"], Quotes, (req) => {
    validateCustomFields(req, "Quotes.customFields", req.data.customFields);
  });

  this.before(["CREATE", "UPDATE"], QuoteItems, async (req) => {
    validateCustomFields(req, "QuoteItems.customFields", req.data.customFields);

    if (req.data.product_ID) {
      const product = await SELECT.one.from(Products).where({ ID: req.data.product_ID });
      if (!product) req.reject(400, "Selected product does not exist");
    }

    if (req.data.region_ID) {
      const region = await SELECT.one.from(Regions).where({ ID: req.data.region_ID });
      if (!region) req.reject(400, "Selected region does not exist");
    }
  });

  this.on("calculateQuote", async (req) => {
    const { quoteId } = req.data || {};
    if (!quoteId) req.reject(400, "quoteId is required");

    const tx = cds.transaction(req);
    const repo = new PricingRepository(tx, {
      Quotes,
      QuoteItems,
      PricingTransactions,
      WorkflowTransitions,
      AuditHistory
    });

    const quote = await repo.getQuoteWithItems(quoteId);
    if (!quote) req.reject(404, "Quote not found");
    if (!quote.items || !quote.items.length) req.reject(400, "Quote has no line items");

    await engine.execute({ quote, items: quote.items, user: req.user.id });
    await repo.saveQuoteItems(quote.items);
    await repo.setQuoteStatus(quote.ID, "CALCULATED");
    await repo.insertTransactions(quote, req.user.id);

    await repo.insertAudit({
      ID: cds.utils.uuid(),
      entityName: "Quotes",
      entityId: quote.ID,
      action: "CALCULATE",
      payload: JSON.stringify({ itemCount: quote.items.length }),
      actor: req.user.id
    });

    return tx.run(SELECT.one.from(Quotes).where({ ID: quote.ID }));
  });

  this.on("transitionQuote", async (req) => {
    const { quoteId, action, comment } = req.data || {};
    if (!quoteId) req.reject(400, "quoteId is required");
    if (!action) req.reject(400, "action is required");

    const tx = cds.transaction(req);
    const repo = new PricingRepository(tx, {
      Quotes,
      QuoteItems,
      PricingTransactions,
      WorkflowTransitions,
      AuditHistory
    });

    const quote = await tx.run(SELECT.one.from(Quotes).where({ ID: quoteId }));
    if (!quote) req.reject(404, "Quote not found");

    let toState;
    try {
      toState = workflow.transition(quote.status || "DRAFT", action);
    } catch (e) {
      req.reject(400, e.message);
    }

    await repo.setQuoteStatus(quoteId, toState);

    await repo.insertWorkflowTransition({
      ID: cds.utils.uuid(),
      quote_ID: quoteId,
      fromState: quote.status || "DRAFT",
      toState,
      action,
      comment,
      transitionedBy: req.user.id
    });

    await repo.insertAudit({
      ID: cds.utils.uuid(),
      entityName: "Quotes",
      entityId: quoteId,
      action: "WORKFLOW_TRANSITION",
      payload: JSON.stringify({ from: quote.status || "DRAFT", to: toState, action, comment: comment || null }),
      actor: req.user.id
    });

    return tx.run(SELECT.one.from(Quotes).where({ ID: quoteId }));
  });

  this.on("priceWaterfall", async (req) => {
    const { sku, region, from, to } = req.data || {};
    const where = {};
    if (sku) where.sku = sku;
    if (region) where.region = region;

    const tx = cds.transaction(req);
    let rows = await tx.run(SELECT.from(PricingTransactions).where(where));

    if (from) rows = rows.filter((r) => r.txDate >= from);
    if (to) rows = rows.filter((r) => r.txDate <= to);

    const gross = rows.reduce((s, r) => s + Number(r.listPrice || 0), 0);
    const discount = rows.reduce((s, r) => s + Number(r.discountAmount || 0), 0);
    const net = rows.reduce((s, r) => s + Number(r.netPrice || 0), 0);

    return [
      { dimension: "Gross", amount: Number(gross.toFixed(2)) },
      { dimension: "Discount", amount: Number((-discount).toFixed(2)) },
      { dimension: "Net", amount: Number(net.toFixed(2)) }
    ];
  });

  this.on("scatter", async (req) => {
    const { region, from, to } = req.data || {};
    const where = {};
    if (region) where.region = region;

    const tx = cds.transaction(req);
    let rows = await tx.run(SELECT.from(PricingTransactions).where(where));

    if (from) rows = rows.filter((r) => r.txDate >= from);
    if (to) rows = rows.filter((r) => r.txDate <= to);

    return rows.map((r) => ({
      sku: r.sku,
      region: r.region,
      discount: Number(r.discountPct || 0),
      netPrice: Number(r.netPrice || 0)
    }));
  });

  this.on("timeSeries", async (req) => {
    const { sku, region, from, to } = req.data || {};
    const where = {};
    if (sku) where.sku = sku;
    if (region) where.region = region;

    const tx = cds.transaction(req);
    let rows = await tx.run(SELECT.from(PricingTransactions).where(where));

    if (from) rows = rows.filter((r) => r.txDate >= from);
    if (to) rows = rows.filter((r) => r.txDate <= to);

    const grouped = new Map();
    for (const row of rows) {
      const key = row.txDate;
      const entry = grouped.get(key) || { txDate: key, gross: 0, discount: 0, net: 0 };
      entry.gross += Number(row.listPrice || 0);
      entry.discount += Number(row.discountAmount || 0);
      entry.net += Number(row.netPrice || 0);
      grouped.set(key, entry);
    }

    return [...grouped.values()]
      .sort((a, b) => a.txDate.localeCompare(b.txDate))
      .map((x) => ({
        txDate: x.txDate,
        gross: Number(x.gross.toFixed(2)),
        discount: Number(x.discount.toFixed(2)),
        net: Number(x.net.toFixed(2))
      }));
  });
});
