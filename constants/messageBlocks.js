export const MESSAGE_TEMPLATES = [
  {
    id: "confirm_order",
    title: "Order Confirmation",
    getText: (order, business) =>
      `Hi ${order.customerName || "there"}, thank you for ordering from ${business?.name || "our store"}! 🛍️\n\n` +
      `Your order #${order.orderNumber} for LKR ${Number(order.total || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })} has been received and is being processed.\n\n` +
      `We will notify you once your package is dispatched. Thank you!`,
  },
  {
    id: "dispatch_tracking",
    title: "Dispatch & Tracking",
    getText: (order, business) =>
      `Hi ${order.customerName || "there"}, good news! 📦\n\n` +
      `Your order #${order.orderNumber} from ${business?.name || "our store"} has been dispatched with ${order.courier || "our courier service"}.\n` +
      (order.waybillNumber ? `Waybill Number: ${order.waybillNumber}\n` : "") +
      `Please ensure someone is available at your delivery address to receive the parcel.\n\n` +
      `Thank you!`,
  },
  {
    id: "payment_reminder",
    title: "Payment Reminder",
    getText: (order, business) =>
      `Hi ${order.customerName || "there"}, this is a gentle reminder regarding payment for order #${order.orderNumber} from ${business?.name || "our store"}.\n\n` +
      `Total amount: LKR ${Number(order.total || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}\n\n` +
      `Please let us know once paid or if you have any questions!`,
  },
  {
    id: "delivery_followup",
    title: "Delivery Follow-up",
    getText: (order, business) =>
      `Hi ${order.customerName || "there"}! We hope you love your purchase from ${business?.name || "our store"}! ✨\n\n` +
      `If you have a moment, please let us know how everything went. We appreciate your feedback!`,
  },
];
