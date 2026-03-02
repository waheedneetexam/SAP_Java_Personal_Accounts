class CalculationEngine {
  constructor(policyProvider) {
    this.policyProvider = policyProvider;
    this.nodes = [
      { id: "validate", deps: [], run: this.validate.bind(this) },
      { id: "base", deps: ["validate"], run: this.computeBase.bind(this) },
      { id: "discount", deps: ["base"], run: this.computeDiscount.bind(this) },
      { id: "net", deps: ["discount"], run: this.computeNet.bind(this) }
    ];
  }

  async execute(ctx) {
    const done = new Set();
    for (const node of this.nodes) {
      for (const dep of node.deps) {
        if (!done.has(dep)) {
          throw new Error(`DAG violation: missing dependency ${dep}`);
        }
      }
      await node.run(ctx);
      done.add(node.id);
    }
    return ctx;
  }

  async validate(ctx) {
    for (const item of ctx.items) {
      if (Number(item.quantity) <= 0) throw new Error("Quantity must be greater than zero");
      if (Number(item.basePrice) < 0) throw new Error("Base price cannot be negative");
    }
  }

  async computeBase(ctx) {
    for (const item of ctx.items) {
      item._gross = Number(item.basePrice) * Number(item.quantity);
    }
  }

  async computeDiscount(ctx) {
    const policy = await this.policyProvider(ctx);
    for (const item of ctx.items) {
      const requestedPct = Number(item.discountPct || 0);
      const policyMax = Number(policy.maxDiscountPct || 0);
      const appliedPct = Math.min(requestedPct, policyMax);
      item._discountAmount = (item._gross * appliedPct) / 100;
      item._appliedDiscountPct = appliedPct;
    }
  }

  async computeNet(ctx) {
    for (const item of ctx.items) {
      item.netPrice = Number((item._gross - item._discountAmount).toFixed(2));
      item.discountAmt = Number(item._discountAmount.toFixed(2));
      item.discountPct = Number(item._appliedDiscountPct.toFixed(2));
    }
  }
}

module.exports = { CalculationEngine };
