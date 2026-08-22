import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../context/ThemeContext";

// Mobile equivalent of the web Sidebar collapsing into a bottom navigation
// bar — ports the exact colours/sizes from mobile.css's `.sidebar` overrides.
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navigation}
      >
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

          const iconColor = "#ffffff";
          const icon = options.tabBarIcon?.({
            color: iconColor,
            size: 20,
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
              <TouchableOpacity key={route.key} onPress={handlePress} activeOpacity={0.85}>
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
              style={styles.link}
            >
              {content}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    bar: {
      height: 66 + bottomInset,
      paddingBottom: bottomInset,
      paddingHorizontal: 7,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.16)",
    },
    navigation: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
      height: 54,
    },
    link: {
      minWidth: 68,
      height: 54,
      flexBasis: 68,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 10,
    },
    label: {
      color: "#ffffff",
      fontSize: 9,
      lineHeight: 11,
      textAlign: "center",
      maxWidth: 76,
    },
  });
}
