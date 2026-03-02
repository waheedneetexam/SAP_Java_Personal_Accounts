const cds = require("@sap/cds");
const { SELECT, INSERT, UPDATE } = cds.ql;

class PricingRepository {
  constructor(tx, entities) {
    this.tx = tx;
    this.entities = entities;
  }

  async getQuoteWithItems(quoteId) {
    const quote = await this.tx.run(
      SELECT.one.from(this.entities.Quotes).where({ ID: quoteId })
    );
    if (!quote) return null;

    const items = await this.tx.run(
      SELECT.from(this.entities.QuoteItems)
        .columns("*", { ref: ["product", "sku"], as: "productSku" }, { ref: ["region", "code"], as: "regionCode" })
        .where({ quote_ID: quoteId })
    );

    quote.items = items;
    return quote;
  }

  async saveQuoteItems(items) {
    for (const item of items) {
      await this.tx.run(
        UPDATE(this.entities.QuoteItems)
          .set({ netPrice: item.netPrice, discountAmt: item.discountAmt, discountPct: item.discountPct })
          .where({ ID: item.ID })
      );
    }
  }

  async setQuoteStatus(quoteId, status) {
    await this.tx.run(UPDATE(this.entities.Quotes).set({ status }).where({ ID: quoteId }));
  }

  async insertTransactions(quote, user) {
    const rows = quote.items.map((item) => ({
      ID: cds.utils.uuid(),
      quote_ID: quote.ID,
      item_ID: item.ID,
      sku: item.productSku || "",
      region: item.regionCode || "",
      txDate: new Date().toISOString().slice(0, 10),
      listPrice: Number(item.basePrice) * Number(item.quantity),
      discountPct: item.discountPct,
      discountAmount: item.discountAmt,
      netPrice: item.netPrice,
      overrideReason: Number(item.discountPct || 0) > 0 ? "Manual / policy constrained discount" : null,
      overrideBy: user || "system"
    }));

    if (rows.length) {
      await this.tx.run(INSERT.into(this.entities.PricingTransactions).entries(rows));
    }
  }

  async insertWorkflowTransition(data) {
    await this.tx.run(INSERT.into(this.entities.WorkflowTransitions).entries(data));
  }

  async insertAudit(data) {
    await this.tx.run(INSERT.into(this.entities.AuditHistory).entries(data));
  }
}

module.exports = { PricingRepository };
