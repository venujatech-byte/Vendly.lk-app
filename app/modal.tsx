import { router } from 'expo-router';
import { Share, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/authContextValue';
import { useAppTheme } from '@/context/ThemeContext';
import ScreenHeader from '@/components/ScreenHeader';
import { Box, Copy, Link2, Share2 } from 'lucide-react-native';

export default function ShareBusinessModal() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.top, insets.bottom);
  const { business, sellerProfile } = useAuth();

  const businessName = sellerProfile?.businessName ?? business?.name ?? 'Your Store';
  const shortCode = business?.shortCode;
  const webAppUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://vendly.lk').replace(/\/$/, '');
  const chatbotLink = shortCode ? `${webAppUrl}/s/${shortCode}` : null;

  async function handleShareChatbotLink() {
    if (!chatbotLink) {
      return;
    }
    await Share.share({ message: `Shop our catalog directly: ${chatbotLink}` });
  }

  async function handleCopyLink() {
    if (!chatbotLink) {
      return;
    }
    await Share.share({ message: chatbotLink });
  }

  async function handleShareBusiness() {
    const message = `Check out ${businessName} on Vendly!${chatbotLink ? ` ${chatbotLink}` : ''}`;
    await Share.share({ message });
  }

  if (!business?.id) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Share Business" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>No business data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Share Business" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.logoWrapper}>
            <Box size={32} color={colors.accent} />
          </View>
          <Text style={styles.businessName}>{businessName}</Text>
          {shortCode && (
            <Text style={styles.shortCode}>Short code: {shortCode}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Chatbot Link</Text>
        <View style={styles.card}>
          {chatbotLink ? (
            <>
              <Text style={styles.linkText} numberOfLines={1}>{chatbotLink}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleShareChatbotLink} activeOpacity={0.8}>
                  <Share2 size={18} color="#ffffff" />
                  <Text style={styles.buttonText}>Share Link</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyLink} activeOpacity={0.8}>
                  <Copy size={18} color={colors.accent} />
                  <Text style={[styles.buttonText, { color: colors.accent }]}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noCodeState}>
              <Link2 size={28} color={colors.subtle} />
              <Text style={styles.noCodeTitle}>Chatbot not configured</Text>
              <Text style={styles.noCodeText}>
                Your business doesn&apos;t have a chatbot short code assigned yet.
                Contact support to enable the customer ordering chatbot.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Quick Share</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.quickShareButton} onPress={handleShareBusiness} activeOpacity={0.8}>
            <View style={styles.quickShareIcon}>
              <Share2 size={20} color="#ffffff" />
            </View>
            <View style={styles.quickShareText}>
              <Text style={styles.quickShareTitle}>Share Business Profile</Text>
              <Text style={styles.quickShareSubtitle}>Send your store link via any app</Text>
            </View>
            <Box size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {chatbotLink && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoNumber}>1</Text>
                <Text style={styles.infoText}>Customer opens the link</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNumber}>2</Text>
                <Text style={styles.infoText}>Browses your product catalog</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNumber}>3</Text>
                <Text style={styles.infoText}>Places an order directly</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoNumber}>4</Text>
                <Text style={styles.infoText}>Order appears in your app</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors, topInset, bottomInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingTop: 14 + topInset,
      paddingBottom: 24 + bottomInset,
      gap: 20,
    },
    headerCard: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 10,
    },
    logoWrapper: {
      width: 72,
      height: 72,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    businessName: {
      color: colors.textStrong,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    shortCode: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    linkText: {
      color: colors.text,
      fontSize: 14,
      fontFamily: 'monospace',
      backgroundColor: colors.surfaceSoft,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      borderRadius: 10,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      borderRadius: 10,
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
    },
    noCodeState: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
    },
    noCodeTitle: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    noCodeText: {
      color: colors.muted,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    quickShareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    quickShareIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickShareText: {
      flex: 1,
      gap: 2,
    },
    quickShareTitle: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    quickShareSubtitle: {
      color: colors.muted,
      fontSize: 12,
    },
    infoCard: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    infoTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: '700',
    },
    infoList: {
      gap: 10,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    infoNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      color: colors.text,
      fontSize: 13,
      flex: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
    },
  });
}