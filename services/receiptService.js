import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

function formatLkr(minorUnits = 0) {
  return `LKR ${(Number(minorUnits) / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateOrderReceiptHtml(business, order) {
  const storeName = business?.name || "Vendly Store";
  const orderNumber = order?.orderNumber || order?.id || "N/A";
  const dateStr = order?.date || new Date().toLocaleDateString("en-LK");
  const items = order?.items || [];
  const customerName = order?.customerName || order?.customerSnapshot?.name || "Customer";
  const phone = order?.phoneNumber || order?.customerSnapshot?.phoneNumber || "";
  const address =
    order?.deliveryAddress ||
    order?.customerSnapshot?.address ||
    {};
  const addressStr = [address.line1, address.line2, address.city, address.district]
    .filter(Boolean)
    .join(", ");

  const subtotalMinor = order?.subtotalMinor || (Number(order?.subtotal || 0) * 100) || 0;
  const deliveryMinor = order?.deliveryFeeMinor || (Number(order?.deliveryFee || 0) * 100) || 0;
  const discountMinor = order?.discountTotalMinor || (Number(order?.discount || 0) * 100) || 0;
  const totalMinor =
    order?.totalAmountMinor ||
    order?.totalMinor ||
    (Number(order?.total || 0) * 100) ||
    0;

  const paymentMethodLabel =
    order?.paymentMethod === "paid"
      ? "Fully Paid"
      : order?.paymentMethod === "deposit"
      ? "Deposit Paid / Balance Due"
      : "Cash on Delivery (COD)";

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <div style="font-weight: 600; font-size: 13px; color: #1e293b;">${item.name || item.productName || "Product"}</div>
        ${item.size ? `<div style="font-size: 11px; color: #64748b;">Variant / Size: ${item.size}</div>` : ""}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569; font-size: 13px;">${item.quantity || 1}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #1e293b; font-size: 13px;">${formatLkr(item.lineTotalMinor || Number(item.sellingPrice || 0) * (item.quantity || 1) * 100)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${orderNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1e293b;
      background: #ffffff;
    }
    .receipt-box {
      max-width: 480px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 2px dashed #e2e8f0;
    }
    .store-name {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: #ecfdf5;
      color: #059669;
      font-size: 12px;
      font-weight: 700;
      border-radius: 9999px;
    }
    .meta-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .meta-col {
      line-height: 1.5;
    }
    .meta-title {
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0 6px;
      margin-top: 8px;
      border-top: 2px solid #0f172a;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <div class="store-name">${storeName}</div>
      <div class="badge">ORDER RECEIPT</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Order #${orderNumber} • ${dateStr}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <div class="meta-title">Customer</div>
        <div style="font-weight: 600;">${customerName}</div>
        <div>${phone}</div>
      </div>
      <div class="meta-col" style="text-align: right; max-width: 200px;">
        <div class="meta-title">Delivery Address</div>
        <div>${addressStr || "Store pickup / Not specified"}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px; color: #64748b; text-transform: uppercase;">
          <th style="text-align: left; padding-bottom: 6px;">Item</th>
          <th style="text-align: center; padding-bottom: 6px;">Qty</th>
          <th style="text-align: right; padding-bottom: 6px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top: 16px;">
      <div class="summary-row">
        <span>Subtotal</span>
        <span>${formatLkr(subtotalMinor)}</span>
      </div>
      ${
        discountMinor > 0
          ? `
      <div class="summary-row" style="color: #ef4444;">
        <span>Discount</span>
        <span>-${formatLkr(discountMinor)}</span>
      </div>
      `
          : ""
      }
      <div class="summary-row">
        <span>Delivery Fee</span>
        <span>${formatLkr(deliveryMinor)}</span>
      </div>
      <div class="summary-row">
        <span>Payment Method</span>
        <span>${paymentMethodLabel}</span>
      </div>
      <div class="total-row">
        <span>Total Due</span>
        <span style="color: #0d5fa9;">${formatLkr(totalMinor)}</span>
      </div>
    </div>

    <div class="footer">
      Thank you for shopping with ${storeName}!<br/>
      Powered by Vendly.lk
    </div>
  </div>
</body>
</html>
  `;
}

export async function printOrderReceipt(business, order) {
  const html = generateOrderReceiptHtml(business, order);
  await Print.printAsync({ html });
}

export async function shareOrderReceiptPdf(business, order) {
  const html = generateOrderReceiptHtml(business, order);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: `Receipt #${order?.orderNumber || "order"}`,
    });
  }
}
