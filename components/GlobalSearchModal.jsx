import { router } from "expo-router";
import { Box, ClipboardList, Search, Users, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import { searchBusiness } from "../services/searchService";

const EMPTY_RESULTS = { orders: [], products: [], customers: [] };

export default function GlobalSearchModal({ visible, onClose }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.top);
  const { business } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults(EMPTY_RESULTS);
    }
  }, [visible]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!business?.id || trimmedQuery.length < 2) {
      setResults(EMPTY_RESULTS);
      setIsSearching(false);
      return undefined;
    }

    let isCurrent = true;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const found = await searchBusiness(business.id, trimmedQuery);
        if (isCurrent) setResults(found ?? EMPTY_RESULTS);
      } catch {
        if (isCurrent) setResults(EMPTY_RESULTS);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [business?.id, query]);

  function goTo(path) {
    onClose();
    router.push(path);
  }

  const hasResults =
    results.orders.length > 0 ||
    results.products.length > 0 ||
    results.customers.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.subtle} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search orders, products, customers"
            placeholderTextColor={colors.subtle}
            autoFocus
            returnKeyType="search"
          />
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <X size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.results}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultsContent}
        >
          {isSearching && (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          )}

          {!isSearching && query.trim().length >= 2 && !hasResults && (
            <Text style={styles.emptyText}>No matches found.</Text>
          )}

          {query.trim().length < 2 && (
            <Text style={styles.hintText}>
              Type at least two characters to search.
            </Text>
          )}

          {results.orders.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Orders</Text>
              {results.orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.row}
                  onPress={() => goTo(`/order/${order.id}`)}
                >
                  <ClipboardList size={17} color={colors.muted} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>#{order.orderNumber}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {order.customerName}
                      {order.waybillNumber ? ` · ${order.waybillNumber}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {results.products.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Products</Text>
              {results.products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.row}
                  onPress={() => goTo("/(tabs)/inventory")}
                >
                  <Box size={17} color={colors.muted} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{product.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {product.sku} · {product.availableStock} in stock
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {results.customers.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Customers</Text>
              {results.customers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.row}
                  onPress={() => goTo("/(tabs)/customers")}
                >
                  <Users size={17} color={colors.muted} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{customer.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {customer.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors, topInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: topInset,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 6,
      paddingHorizontal: 14,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.textStrong,
      fontSize: 15,
    },
    results: {
      flex: 1,
    },
    resultsContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    loader: {
      marginTop: 24,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: "center",
      marginTop: 32,
    },
    hintText: {
      color: colors.subtle,
      fontSize: 13,
      textAlign: "center",
      marginTop: 32,
    },
    group: {
      marginTop: 18,
    },
    groupTitle: {
      color: colors.subtle,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "600",
    },
    rowMeta: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
  });
}
