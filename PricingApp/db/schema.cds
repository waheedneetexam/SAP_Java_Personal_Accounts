namespace pricing;

using {
  cuid,
  managed
} from '@sap/cds/common';

type Money : Decimal(15,2);

entity Products : cuid {
  sku  : String(40) @mandatory;
  name : String(120) @mandatory;
}

entity Regions : cuid {
  code : String(12) @mandatory;
  name : String(80) @mandatory;
}

@assert.unique: { uqQuoteNo: [quoteNo] }
@assert.integrity
entity Quotes : cuid, managed {
  quoteNo            : String(30) @mandatory;
  customerId         : String(60);
  currency           : String(3) default 'USD';
  status             : String(30) default 'DRAFT';
  customFields       : LargeString;
  items              : Composition of many QuoteItems on items.quote = $self;
  workflowTransitions: Association to many WorkflowTransitions on workflowTransitions.quote = $self;
}

@assert.integrity
entity QuoteItems : cuid {
  quote        : Association to Quotes @mandatory;
  product      : Association to Products @mandatory;
  region       : Association to Regions @mandatory;
  quantity     : Decimal(13,3) @mandatory default 1;
  basePrice    : Money @mandatory default 0;
  discountPct  : Decimal(5,2) default 0;
  discountAmt  : Money default 0;
  netPrice     : Money default 0;
  customFields : LargeString;
}

entity PricingTransactions : cuid, managed {
  quote         : Association to Quotes;
  item          : Association to QuoteItems;
  sku           : String(40) @mandatory;
  region        : String(12) @mandatory;
  txDate        : Date @mandatory;
  listPrice     : Money;
  discountPct   : Decimal(5,2);
  discountAmount: Money;
  netPrice      : Money;
  overrideReason: String(255);
  overrideBy    : String(120);
}

entity WorkflowTransitions : cuid, managed {
  quote         : Association to Quotes @mandatory;
  fromState     : String(30);
  toState       : String(30) @mandatory;
  action        : String(40) @mandatory;
  comment       : String(500);
  transitionedBy: String(120);
}

entity AuditHistory : cuid, managed {
  entityName : String(80) @mandatory;
  entityId   : UUID @mandatory;
  action     : String(30) @mandatory;
  payload    : LargeString;
  actor      : String(120);
}

// Compatibility entities used by the cloned UI app under /api/*
entity UiProducts {
  key product_id: String(40);
  sku           : String(40);
  name          : String(120);
  family        : String(80);
  category      : String(80);
  price         : Money;
  active        : Boolean default true;
}

entity UiCustomers {
  key customer_id : String(40);
  name            : String(120);
  account_number  : String(40);
  segment         : String(40);
  region          : String(20);
  industry        : String(80);
  active          : Boolean default true;
}

entity UiSellers {
  key seller_id: String(40);
  name         : String(120);
  territory    : String(80);
  manager      : String(120);
  active       : Boolean default true;
}

entity UiQuotes : managed {
  key id          : String(40);
  description     : String(1000);
  customerName    : String(120);
  customerId      : String(40);
  customerSegment : String(40);
  productHierarchy: String(120);
  salesOrg        : String(40);
  region          : String(20);
  country         : String(40);
  currency        : String(3) default 'USD';
  priceList       : String(40);
  validityDate    : Date;
  paymentTerms    : String(120);
  lineItems       : Composition of many UiQuoteItems on lineItems.quote = $self;
}

@assert.integrity
entity UiQuoteItems {
  key id            : String(60);
  quote             : Association to UiQuotes @mandatory;
  productName       : String(120);
  sku               : String(40);
  quantity          : Decimal(13,3) default 1;
  listPrice         : Money default 0;
  cost              : Money default 0;
  volumeDiscount    : Decimal(5,2) default 0;
  rebate            : Money default 0;
  netPrice          : Money default 0;
  margin            : Decimal(9,4) default 0;
  totalValue        : Money default 0;
  dynamic_fields    : LargeString;
}

entity UiLineItemConfigs : managed {
  key tenant_id: String(80);
  columns      : LargeString;
}

entity UiWorkflowRules : managed {
  key rule_id     : String(40);
  customer_segment: String(40);
  min_discount_pct: Decimal(5,2);
  approval_role   : String(40);
}
