const TRANSITIONS = {
  DRAFT: { submit: "REVIEW", cancel: "CANCELLED" },
  CALCULATED: { submit: "REVIEW", cancel: "CANCELLED" },
  REVIEW: { approve: "APPROVED", reject: "REJECTED", cancel: "CANCELLED" },
  APPROVED: { activate: "ACTIVE", cancel: "CANCELLED" },
  REJECTED: { resubmit: "REVIEW", cancel: "CANCELLED" },
  ACTIVE: { close: "CLOSED" },
  CLOSED: {},
  CANCELLED: {}
};

class WorkflowMachine {
  transition(currentState, action) {
    const state = currentState || "DRAFT";
    const normalized = String(action || "").trim().toLowerCase();
    const next = TRANSITIONS[state] && TRANSITIONS[state][normalized];
    if (!next) {
      throw new Error(`Action '${normalized}' is not allowed from state '${state}'`);
    }
    return next;
  }
}

module.exports = { WorkflowMachine };
