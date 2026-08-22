import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "../context/ThemeContext";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Format as YYYY-MM-DD from the local date parts. Using toISOString() here
// would shift the day backwards for anyone east of UTC (Sri Lanka is +5:30).
export function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateString(value) {
  if (!value) return null;

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Build the 6x7 grid of days for the given month, padded with the surrounding
// months so every week row is complete.
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(year, month, index - startOffset + 1);
    cells.push({
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
    });
  }

  return cells;
}

export default function CalendarPicker({ value, onSelect, minDate, maxDate }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedDate = parseDateString(value);
  const minimumDate = parseDateString(minDate);
  const maximumDate = parseDateString(maxDate);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = selectedDate ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const cells = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  const todayString = toDateString(new Date());
  const selectedString = selectedDate ? toDateString(selectedDate) : null;

  function changeMonth(step) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + step, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function isDisabled(date) {
    const dateString = toDateString(date);

    if (minimumDate && dateString < toDateString(minimumDate)) return true;
    if (maximumDate && dateString > toDateString(maximumDate)) return true;

    return false;
  }

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => changeMonth(-1)}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>
          {MONTH_LABELS[visibleMonth.month]} {visibleMonth.year}
        </Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => changeMonth(1)}
          hitSlop={8}
        >
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map(({ date, isCurrentMonth }) => {
          const dateString = toDateString(date);
          const isSelected = dateString === selectedString;
          const isToday = dateString === todayString;
          const disabled = isDisabled(date);

          return (
            <TouchableOpacity
              key={dateString}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                !isSelected && isToday && styles.cellToday,
              ]}
              onPress={() => onSelect(dateString)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.cellText,
                  !isCurrentMonth && styles.cellTextMuted,
                  disabled && styles.cellTextDisabled,
                  isSelected && styles.cellTextSelected,
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    calendar: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    navButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    monthLabel: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: "700",
    },
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      color: colors.subtle,
      fontSize: 11,
      fontWeight: "700",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    cellSelected: {
      backgroundColor: colors.accent,
    },
    cellToday: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    cellText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    cellTextMuted: {
      color: colors.subtle,
      fontWeight: "400",
    },
    cellTextDisabled: {
      color: colors.border,
    },
    cellTextSelected: {
      color: "#ffffff",
      fontWeight: "700",
    },
  });
}
