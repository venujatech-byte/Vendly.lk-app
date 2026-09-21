import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../context/ThemeContext";

// Mobile equivalent of the web Sidebar collapsing into a bottom navigation
// bar — ports the exact colours from mobile.css's `.sidebar` overrides, but
// distributes tabs evenly (flex) instead of a fixed-width scrolling row so
// all of them stay visible on a single phone-width screen.
export default function BottomTabBar({ state, descriptors, navigation }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  return (
    <LinearGradient
      colors={colors.navGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bar}
    >
      <View style={styles.navigation}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = options.title ?? route.name;

          function handlePress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          const icon = options.tabBarIcon?.({
            color: "#ffffff",
            size: 18,
            focused: isFocused,
          });

          const content = (
            <>
              {icon}
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
            </>
          );

          if (isFocused) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={handlePress}
                activeOpacity={0.85}
                style={styles.tab}
              >
                <LinearGradient
                  colors={colors.navActiveGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.link}
                >
                  {content}
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={handlePress}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <View style={styles.link}>{content}</View>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    bar: {
      height: 64 + bottomInset,
      paddingBottom: bottomInset,
      paddingHorizontal: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.12)",
    },
    navigation: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      maxWidth: 680,
      alignSelf: "center",
      width: "100%",
    },
    tab: {
      flex: 1,
      height: 52,
      paddingHorizontal: 2,
    },
    link: {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      borderRadius: 10,
      paddingVertical: 2,
    },
    label: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 9.5,
      lineHeight: 12,
      fontWeight: "600",
      textAlign: "center",
    },
  });
}
