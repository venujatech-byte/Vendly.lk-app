export const ORDER_SORT_OPTIONS = [
  { key: "orderNumber", label: "Order number" },
  { key: "waybillNumber", label: "Waybill number" },
  { key: "createdAt", label: "Order date" },
];

export const DEFAULT_ORDER_SORT = { field: "createdAt", direction: "desc" };

// Compare two text values naturally, so "VD-10" sorts after "VD-9".
// Orders with no value (an unassigned waybill, say) always sink to the bottom
// regardless of direction, so the list never opens on a block of blanks.
function compareText(left, right) {
  const leftValue = String(left ?? "").trim();
  const rightValue = String(right ?? "").trim();

  if (!leftValue && !rightValue) return 0;
  if (!leftValue) return 1;
  if (!rightValue) return -1;

  return leftValue.localeCompare(rightValue, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compareDate(left, right) {
  const leftTime = left ? new Date(left).getTime() : Number.NaN;
  const rightTime = right ? new Date(right).getTime() : Number.NaN;

  const leftIsValid = !Number.isNaN(leftTime);
  const rightIsValid = !Number.isNaN(rightTime);

  if (!leftIsValid && !rightIsValid) return 0;
  if (!leftIsValid) return 1;
  if (!rightIsValid) return -1;

  return leftTime - rightTime;
}

export function sortOrders(orders, { field, direction } = DEFAULT_ORDER_SORT) {
  const compare = field === "createdAt" ? compareDate : compareText;
  const isBlank = (value) => !String(value ?? "").trim();

  return [...orders].sort((leftOrder, rightOrder) => {
    const leftValue = leftOrder[field];
    const rightValue = rightOrder[field];

    // Keep missing values pinned to the bottom rather than flipping them to
    // the top when the direction is reversed.
    if (isBlank(leftValue) !== isBlank(rightValue)) {
      return isBlank(leftValue) ? 1 : -1;
    }

    const result = compare(leftValue, rightValue);
    return direction === "asc" ? result : -result;
  });
}
