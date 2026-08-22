import { getAuthorizationHeader, resolveApiUrl } from "./apiClient";

// expo-file-system, expo-sharing and expo-print are native modules, so they
// only exist once a development build has been rebuilt with them. Load them
// defensively so the app keeps running on an older binary and callers can
// surface a clear message instead of crashing.
let FileSystem = null;
let Sharing = null;
let Print = null;

try {
  FileSystem = require("expo-file-system/legacy");
} catch {
  FileSystem = null;
}

try {
  Sharing = require("expo-sharing");
} catch {
  Sharing = null;
}

try {
  Print = require("expo-print");
} catch {
  Print = null;
}

export const isFileExportAvailable = Boolean(FileSystem && Sharing);
export const isPdfAvailable = Boolean(Print && Sharing);

const MISSING_MODULE_MESSAGE =
  "This feature needs a newer app build. Rebuild the development build to enable file downloads.";

function assertFileSupport() {
  if (!isFileExportAvailable) throw new Error(MISSING_MODULE_MESSAGE);
}

async function shareFile(fileUri, { mimeType, dialogTitle }) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(fileUri, { mimeType, dialogTitle, UTI: mimeType });
}

// Download the server-generated XLSX workbook and hand it to the OS share
// sheet, which is how a phone "saves" a file.
export async function downloadOrderExport(businessId, { status, search } = {}) {
  assertFileSupport();

  const parameters = new URLSearchParams();
  if (status) parameters.set("status", status);
  if (search) parameters.set("search", search);

  const query = parameters.toString();
  const url = resolveApiUrl(
    `/businesses/${businessId}/orders-export.xlsx${query ? `?${query}` : ""}`,
  );

  const fileName = `vendly-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  const { status: httpStatus } = await FileSystem.downloadAsync(url, fileUri, {
    headers: await getAuthorizationHeader(),
  });

  if (httpStatus !== 200) {
    throw new Error(`The export failed with status ${httpStatus}.`);
  }

  await shareFile(fileUri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export orders",
  });

  return fileUri;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Same markup the web app prints, minus the window.print() call — expo-print
// renders it straight to a PDF instead of opening a print window.
function buildWaybillHtml(order) {
  const itemRows = (order.items ?? [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.size || "-")}</td>
          <td>${escapeHtml(item.quantity)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
    <html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(order.waybillNumber)}</title>
    <style>
      body{font:14px Arial,sans-serif;color:#0b2440;margin:32px}
      header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b3b6e;padding-bottom:16px}
      h1{margin:0;color:#0b3b6e;font-size:24px} h2{font-size:16px;color:#0b3b6e}
      section{margin-top:22px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:9px;border:1px solid #cbd5e1;text-align:left}
      .total{font-size:20px;font-weight:700}
      .muted{color:#64748b}
    </style></head><body>
      <header>
        <div><h1>Vendly.lk Waybill</h1><div class="muted">${escapeHtml(order.orderNumber)}</div></div>
        <strong>${escapeHtml(order.waybillNumber)}</strong>
      </header>
      <section><h2>Delivery</h2><strong>${escapeHtml(order.customerName)}</strong><br>
      ${escapeHtml(order.phoneNumber)}${
        order.secondaryPhoneNumber
          ? `<br>${escapeHtml(order.secondaryPhoneNumber)}`
          : ""
      }<br>${escapeHtml(order.deliveryAddress)}</section>
      <section><h2>Courier</h2>${escapeHtml(order.courier)}</section>
      <section><table><thead><tr><th>Item</th><th>Size</th><th>Qty</th></tr></thead>
      <tbody>${itemRows}</tbody></table></section>
      <section class="total">Collect: ${escapeHtml(
        order.paidAmountMinor > 0 ? order.balanceDue : order.total,
      )}</section>
      ${
        order.paidAmountMinor > 0
          ? `<section class="muted">Order total ${escapeHtml(order.total)} less ${escapeHtml(order.paidAmount)} already paid.</section>`
          : ""
      }
    </body></html>`;
}

// Render the waybill to a PDF and hand it to the OS share sheet.
export async function shareWaybillPdf(order) {
  if (!isPdfAvailable) throw new Error(MISSING_MODULE_MESSAGE);

  const { uri } = await Print.printToFileAsync({
    html: buildWaybillHtml(order),
    base64: false,
  });

  // printToFileAsync names the file with a random id, so rename it to the
  // waybill number — that is the name the share sheet and the receiving app
  // will show.
  let shareUri = uri;

  if (FileSystem && order.waybillNumber) {
    const namedUri = `${FileSystem.cacheDirectory}waybill-${order.waybillNumber}.pdf`;

    try {
      await FileSystem.moveAsync({ from: uri, to: namedUri });
      shareUri = namedUri;
    } catch {
      // Keep the generated name if the rename fails.
    }
  }

  await shareFile(shareUri, {
    mimeType: "application/pdf",
    dialogTitle: `Waybill ${order.waybillNumber ?? ""}`.trim(),
  });

  return shareUri;
}

// Write a CSV of the given rows and share it as a real file.
export async function shareCsv(csvContent, fileNamePrefix) {
  assertFileSupport();

  const fileName = `${fileNamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await shareFile(fileUri, {
    mimeType: "text/csv",
    dialogTitle: "Export orders",
  });

  return fileUri;
}
