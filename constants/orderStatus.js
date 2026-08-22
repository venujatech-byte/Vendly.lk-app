export const STATUS_TRANSITIONS = {
  "needs-confirmation": ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

export const STATUS_LABELS = {
  "needs-confirmation": "Pending",
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const STATUS_TONES = {
  pending: "orange",
  confirmed: "green",
  packed: "blue",
  shipped: "purple",
  delivered: "teal",
  returned: "red",
  cancelled: "red",
};

export const TONE_COLORS = {
  blue: { icon: "#1d75e8e0", background: "#e8f1ff" },
  orange: { icon: "#f59e0b", background: "#fff4df" },
  green: { icon: "#22a474", background: "#e6f8f1" },
  purple: { icon: "#8247e5", background: "#f0eaff" },
  red: { icon: "#ef4444", background: "#feecec" },
  teal: { icon: "#0f766e", background: "#e2f6f2" },
};

export const ORDER_STAT_DEFINITIONS = [
  { key: "all", label: "All", tone: "blue" },
  { key: "pending", label: "Pending", tone: "orange" },
  { key: "confirmed", label: "Confirmed", tone: "green" },
  { key: "packed", label: "Packed", tone: "blue" },
  { key: "shipped", label: "Shipped", tone: "purple" },
  { key: "delivered", label: "Delivered", tone: "teal" },
  { key: "returned", label: "Returned", tone: "red" },
];
