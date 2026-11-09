export const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? v + "T00:00:00" : v);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

export const money = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0));

export const STATUS_LABEL = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_SCREENING: "Under Screening", DESK_REJECTED: "Desk Rejected",
  UNDER_REVIEW: "Under Review", REVISION_REQUIRED: "Revision Required", REVISED: "Revised", ACCEPTED: "Accepted",
  REJECTED: "Rejected", IN_PRODUCTION: "In Production", PUBLISHED: "Published", WITHDRAWN: "Withdrawn",
};

export const REC_LABEL = { ACCEPT: "Accept", MINOR_REVISION: "Minor Revision", MAJOR_REVISION: "Major Revision", REJECT: "Reject" };

export const statusLabel = (s) => STATUS_LABEL[s] || s;

export const bytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
