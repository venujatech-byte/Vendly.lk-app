import { FolderPlus, Layers, Trash2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";
import {
  createCategory,
  getCategories,
  removeCategory,
} from "@/services/categoryService";

export default function AddCategoryModal({
  visible,
  onClose,
  businessId,
  onCategoryAdded,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && businessId) {
      loadCategories();
    }
  }, [visible, businessId]);

  async function loadCategories() {
    setIsLoading(true);
    try {
      const list = await getCategories(businessId);
      setCategories(list || []);
    } catch {
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCategory() {
    if (!name.trim()) {
      Alert.alert("Required", "Category name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const newCat = await createCategory(businessId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setName("");
      setDescription("");
      loadCategories();
      onCategoryAdded?.(newCat);
    } catch (err) {
      Alert.alert("Error", err.message || "Could not create category.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category) {
    Alert.alert(
      "Delete Category",
      `Delete "${category.name}"? Products in this category will become uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeCategory(businessId, category.id);
              loadCategories();
            } catch (err) {
              Alert.alert("Error", err.message || "Could not delete category.");
            }
          },
        },
      ],
    );
  }

  if (!visible) return null;

  const styles = createStyles(colors, insets.bottom);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Layers size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Product Categories</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.addBox}>
              <Text style={styles.boxTitle}>Add New Category</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Category Name (e.g., T-Shirts, Perfumes)"
                placeholderTextColor={colors.subtle}
              />
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={colors.subtle}
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleCreateCategory}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <FolderPlus size={16} color="#ffffff" />
                    <Text style={styles.addBtnText}>Create Category</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.listTitle}>
              Existing Categories ({categories.length})
            </Text>

            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={{ marginVertical: 16 }}
              />
            ) : categories.length === 0 ? (
              <Text style={styles.emptyText}>No categories created yet.</Text>
            ) : (
              categories.map((cat) => (
                <View key={cat.id} style={styles.catRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    {cat.description ? (
                      <Text style={styles.catDesc}>{cat.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(cat)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingBottom: Math.max(bottomInset, 16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    content: {
      padding: 18,
      gap: 14,
    },
    addBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    boxTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.textStrong,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 2,
    },
    addBtnText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    listTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 6,
    },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: 12,
    },
    catRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textStrong,
    },
    catDesc: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    deleteBtn: {
      padding: 8,
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    doneBtn: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    doneBtnText: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
