import { Banknote, CheckCircle2, Coins, CreditCard } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../context/ThemeContext";

export default function PaymentBadge({ paymentMethod = "cod", paymentStatus = "unpaid", depositAmount, paidAmountMinor }) {
  const { theme } = useAppTheme();
  const isDark = theme === "dark";

  const method = String(paymentMethod).toLowerCase();
  const status = String(paymentStatus).toLowerCase();
  const hasPaidDeposit = (paidAmountMinor ?? 0) > 0 || Boolean(depositAmount);

  let label = "COD";
  let Icon = Banknote;
  let bg = isDark ? "rgba(22, 140, 245, 0.16)" : "#edf6ff";
  let border = isDark ? "#315d89" : "#a9c9ee";
  let text = isDark ? "#74b8ff" : "#1265b8";

  if (method === "deposit" || (hasPaidDeposit && status !== "paid")) {
    label = depositAmount ? `DEPOSIT (${depositAmount})` : "DEPOSIT PAID";
    Icon = Coins;
    bg = isDark ? "rgba(245, 158, 11, 0.15)" : "#fff7e7";
    border = isDark ? "#745421" : "#f6c56c";
    text = isDark ? "#ffc35c" : "#a86200";
  } else if (status === "paid" || method === "paid") {
    label = "PAID";
    Icon = CheckCircle2;
    bg = isDark ? "rgba(34, 164, 116, 0.16)" : "#e6f8f1";
    border = isDark ? "#27634f" : "#9bd5bd";
    text = isDark ? "#70ddb5" : "#087a57";
  } else if (method === "card" || method === "bank_transfer") {
    label = method === "card" ? "CARD" : "BANK TRANSFER";
    Icon = CreditCard;
    bg = isDark ? "rgba(130, 71, 229, 0.16)" : "#f0eaff";
    border = isDark ? "#58309a" : "#cfbcfa";
    text = isDark ? "#b692ff" : "#8247e5";
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Icon size={11} color={text} />
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
