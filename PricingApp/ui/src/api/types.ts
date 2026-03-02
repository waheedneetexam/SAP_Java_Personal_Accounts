export type QuoteListItem = {
  id: string;
  description?: string;
  customerName?: string;
  lineItemCount: number;
  totalValue: number;
  dateModified: string;
};

export type PricingLineItem = {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  listPrice: number;
  cost: number;
  volumeDiscount: number;
  rebate: number;
  netPrice: number;
  margin: number;
  totalValue: number;
  showAnalytics?: boolean;
  [key: string]: string | number | boolean | undefined;
};

export type QuoteDetail = {
  id: string;
  description?: string;
  customerName?: string;
  customerId?: string;
  customerSegment?: string;
  productHierarchy?: string;
  salesOrg?: string;
  region?: string;
  country?: string;
  currency?: string;
  priceList?: string;
  validityDate?: string;
  paymentTerms?: string;
  lineItems: PricingLineItem[];
};

export type TenantLineItemConfig = {
  tenantId: string;
  columns: Array<{
    key: string;
    label: string;
    visible: boolean;
    mandatory: boolean;
    editable: boolean;
    isCalculated: boolean;
    formula: string;
    sortOrder?: number;
  }>;
};

export type MasterProduct = { sku: string; name: string };
export type MasterCustomer = {
  customer_id?: string;
  name?: string;
  segment?: string;
  region?: string;
};
