using { pricing as db } from '../db/schema';

@path:'/pricing'
service PricingService {
  @requires: 'PricingViewer'
  entity Products as projection on db.Products;

  @requires: 'PricingViewer'
  entity Regions as projection on db.Regions;

  @requires: 'PricingViewer'
  entity Quotes as projection on db.Quotes;

  @requires: 'PricingViewer'
  entity QuoteItems as projection on db.QuoteItems;

  @requires: 'PricingAnalyst'
  entity PricingTransactions as projection on db.PricingTransactions;

  @requires: 'PricingManager'
  entity WorkflowTransitions as projection on db.WorkflowTransitions;

  @requires: 'PricingAuditor'
  entity AuditHistory as projection on db.AuditHistory;

  type WaterfallPoint {
    dimension: String(120);
    amount   : Decimal(15,2);
  }

  type ScatterPoint {
    sku      : String(40);
    region   : String(12);
    discount : Decimal(5,2);
    netPrice : Decimal(15,2);
  }

  type TimeSeriesPoint {
    txDate   : Date;
    gross    : Decimal(15,2);
    discount : Decimal(15,2);
    net      : Decimal(15,2);
  }

  @requires: 'PricingAnalyst'
  action calculateQuote(quoteId : UUID) returns Quotes;

  @requires: 'PricingManager'
  action transitionQuote(quoteId : UUID, action : String, comment : String) returns Quotes;

  @requires: 'PricingAnalyst'
  action priceWaterfall(sku : String, region : String, from : Date, to : Date) returns many WaterfallPoint;

  @requires: 'PricingAnalyst'
  action scatter(region : String, from : Date, to : Date) returns many ScatterPoint;

  @requires: 'PricingAnalyst'
  action timeSeries(sku : String, region : String, from : Date, to : Date) returns many TimeSeriesPoint;
}
