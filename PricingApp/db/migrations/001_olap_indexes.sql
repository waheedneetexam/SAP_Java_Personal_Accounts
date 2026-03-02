-- OLAP-focused indexes for high-density analytics on transactions.
CREATE INDEX IF NOT EXISTS IDX_TX_SKU_REGION_DATE
  ON pricing_PricingTransactions (sku, region, txDate);

CREATE INDEX IF NOT EXISTS IDX_TX_REGION_DATE
  ON pricing_PricingTransactions (region, txDate);

CREATE INDEX IF NOT EXISTS IDX_TX_QUOTE_ITEM
  ON pricing_PricingTransactions (quote_ID, item_ID);
