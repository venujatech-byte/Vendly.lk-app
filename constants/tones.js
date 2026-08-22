export const TONE_COLORS_LIGHT = {
  blue: { icon: "#1d75e8e0", background: "#e8f1ff" },
  orange: { icon: "#f59e0b", background: "#fff4df" },
  green: { icon: "#22a474", background: "#e6f8f1" },
  purple: { icon: "#8247e5", background: "#f0eaff" },
  red: { icon: "#ef4444", background: "#feecec" },
  teal: { icon: "#0f766e", background: "#e2f6f2" },
};

export const TONE_COLORS_DARK = {
  blue: { icon: "#469cff", background: "rgba(41, 132, 255, 0.16)" },
  orange: { icon: "#ffad24", background: "rgba(245, 158, 11, 0.15)" },
  green: { icon: "#4bd99d", background: "rgba(34, 164, 116, 0.16)" },
  purple: { icon: "#a77bff", background: "rgba(130, 71, 229, 0.17)" },
  red: { icon: "#ff6262", background: "rgba(239, 68, 68, 0.16)" },
  teal: { icon: "#2dd4bf", background: "rgba(45, 212, 191, 0.16)" },
};

export function getToneColors(tone, theme) {
  const palette = theme === "dark" ? TONE_COLORS_DARK : TONE_COLORS_LIGHT;
  return palette[tone] ?? palette.blue;
}
