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

import {
  CircleCheck,
  Clock3,
  Package,
  Package2,
  SquareCheckBig,
  Truck,
  Undo2,
} from "lucide-react-native";

export const ORDER_STAT_DEFINITIONS = [
  { key: "all", label: "All", tone: "blue", icon: Package },
  { key: "pending", label: "Pending", tone: "orange", icon: Clock3 },
  { key: "confirmed", label: "Confirmed", tone: "green", icon: SquareCheckBig },
  { key: "packed", label: "Packed", tone: "blue", icon: Package2 },
  { key: "shipped", label: "Shipped", tone: "purple", icon: Truck },
  { key: "delivered", label: "Delivered", tone: "teal", icon: CircleCheck },
  { key: "returned", label: "Returned", tone: "red", icon: Undo2 },
];
