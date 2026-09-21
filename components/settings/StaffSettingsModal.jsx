import {
  Mail,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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
  addBusinessMember,
  cancelBusinessInvitation,
  getBusinessMembers,
  removeBusinessMember,
  updateBusinessMember,
} from "@/services/memberService";

const ROLES = [
  { id: "admin", label: "Admin / Manager", description: "Full access to all operations" },
  { id: "staff", label: "Staff", description: "Manage orders, inventory, and couriers" },
  { id: "viewer", label: "Viewer", description: "Read-only access to view reports" },
];

export default function StaffSettingsModal({
  visible,
  onClose,
  businessId,
  currentRole,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [isInviting, setIsInviting] = useState(false);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBusinessMembers(businessId);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(err.message || "Failed to load team members.");
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  async function handleSendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid staff email address.");
      return;
    }

    setIsInviting(true);
    try {
      await addBusinessMember(businessId, { email, role: inviteRole });
      setInviteEmail("");
      setIsInviteOpen(false);
      loadData();
      Alert.alert("Invitation Sent", `An invitation has been sent to ${email}.`);
    } catch (err) {
      Alert.alert("Invite Failed", err.message || "Could not send invitation.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemoveMember(member) {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.displayName || member.email} from the business?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeBusinessMember(businessId, member.uid || member.id);
              loadData();
            } catch (err) {
              Alert.alert("Error", err.message || "Could not remove member.");
            }
          },
        },
      ],
    );
  }

  async function handleCancelInvitation(invitation) {
    try {
      await cancelBusinessInvitation(businessId, invitation.id);
      loadData();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not cancel invitation.");
    }
  }

  const styles = createStyles(colors, insets.bottom);

  if (!visible) return null;

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
              <Users size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Team & Staff</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.topRow}>
              <Text style={styles.sectionSubtitle}>
                Manage who has access to your Vendly workspace.
              </Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setIsInviteOpen(true)}
              >
                <UserPlus size={15} color="#ffffff" />
                <Text style={styles.inviteButtonText}>Invite Staff</Text>
              </TouchableOpacity>
            </View>

            {isInviteOpen && (
              <View style={styles.inviteBox}>
                <Text style={styles.boxTitle}>Invite New Team Member</Text>
                <TextInput
                  style={styles.input}
                  placeholder="staff@example.com"
                  placeholderTextColor={colors.subtle}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.roleLabel}>Select Role:</Text>
                <View style={styles.rolesRow}>
                  {ROLES.map((role) => (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.roleChip,
                        inviteRole === role.id && styles.roleChipActive,
                      ]}
                      onPress={() => setInviteRole(role.id)}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          inviteRole === role.id && styles.roleChipTextActive,
                        ]}
                      >
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.cancelInviteBtn}
                    onPress={() => setIsInviteOpen(false)}
                  >
                    <Text style={styles.cancelInviteText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sendInviteBtn}
                    onPress={handleSendInvite}
                    disabled={isInviting}
                  >
                    {isInviting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.sendInviteText}>Send Invite</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.accent}
                style={{ marginVertical: 24 }}
              />
            ) : (
              <>
                <Text style={styles.listHeader}>
                  Active Members ({members.length})
                </Text>
                {members.map((member) => (
                  <View key={member.uid || member.id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(member.displayName || member.email || "U")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.displayName || member.email}
                      </Text>
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {member.email}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.roleBadge}>
                          <Shield size={11} color={colors.accent} />
                          <Text style={styles.roleBadgeText}>
                            {(member.role || "staff").toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {member.role !== "owner" && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleRemoveMember(member)}
                      >
                        <Trash2 size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {invitations.length > 0 && (
                  <>
                    <Text style={[styles.listHeader, { marginTop: 16 }]}>
                      Pending Invitations ({invitations.length})
                    </Text>
                    {invitations.map((inv) => (
                      <View key={inv.id} style={styles.memberCard}>
                        <View
                          style={[
                            styles.memberAvatar,
                            { backgroundColor: colors.surfaceSoft },
                          ]}
                        >
                          <Mail size={16} color={colors.muted} />
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {inv.email}
                          </Text>
                          <Text style={styles.memberEmail}>
                            Invited as {inv.role || "staff"} • Pending
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleCancelInvitation(inv)}
                        >
                          <X size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Done</Text>
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
      maxHeight: "88%",
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
      gap: 12,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    sectionSubtitle: {
      flex: 1,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    inviteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    inviteButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 12,
    },
    inviteBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      marginVertical: 6,
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
    roleLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.muted,
    },
    rolesRow: {
      flexDirection: "row",
      gap: 6,
    },
    roleChip: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    roleChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    roleChipText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.muted,
    },
    roleChipTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    inviteActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    cancelInviteBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelInviteText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "600",
    },
    sendInviteBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    sendInviteText: {
      fontSize: 12,
      color: "#ffffff",
      fontWeight: "700",
    },
    errorBanner: {
      padding: 10,
      backgroundColor: colors.dangerBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
    },
    listHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 6,
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    memberAvatarText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
    memberInfo: {
      flex: 1,
      gap: 2,
    },
    memberName: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    memberEmail: {
      fontSize: 11,
      color: colors.muted,
    },
    badgeRow: {
      flexDirection: "row",
      marginTop: 4,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.accent,
    },
    deleteBtn: {
      padding: 8,
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    closeBtn: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    closeBtnText: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
