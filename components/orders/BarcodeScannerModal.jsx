import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../context/ThemeContext";

// expo-camera is a native module, so it only exists once a development build
// has been rebuilt with it. Load it defensively so the rest of the app keeps
// working on an older binary and the caller can fall back to manual entry.
let CameraModule = null;
try {
  CameraModule = require("expo-camera");
} catch {
  CameraModule = null;
}

const BARCODE_TYPES = [
  "qr",
  "code128",
  "code39",
  "code93",
  "ean13",
  "ean8",
  "itf14",
  "upc_a",
  "upc_e",
  "codabar",
  "datamatrix",
  "pdf417",
];

export default function BarcodeScannerModal({ visible, onClose, onScanned }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.top, insets.bottom);

  const isCameraAvailable = Boolean(CameraModule?.CameraView);
  const [permission, requestPermission] = CameraModule?.useCameraPermissions
    ? CameraModule.useCameraPermissions()
    : [null, null];
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (visible) setHasScanned(false);
  }, [visible]);

  useEffect(() => {
    if (visible && isCameraAvailable && permission && !permission.granted) {
      requestPermission?.();
    }
  }, [visible, isCameraAvailable, permission, requestPermission]);

  function handleBarcodeScanned({ data }) {
    // The camera fires continuously — only act on the first read.
    if (hasScanned) return;

    setHasScanned(true);
    onScanned(String(data ?? "").trim());
  }

  function renderBody() {
    if (!isCameraAvailable) {
      return (
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>Scanner not available yet</Text>
          <Text style={styles.messageText}>
            The camera module is not part of the installed app build. Rebuild the
            development build to enable waybill scanning, or enter the number
            manually.
          </Text>
        </View>
      );
    }

    if (!permission) {
      return <ActivityIndicator color="#ffffff" size="large" />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>Camera permission needed</Text>
          <Text style={styles.messageText}>
            Allow camera access to scan a waybill barcode.
          </Text>

          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { CameraView } = CameraModule;

    return (
      <>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        />

        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.reticle} />
          <Text style={styles.overlayText}>
            Point the camera at the waybill barcode
          </Text>
        </View>
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        {renderBody()}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan waybill</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.manualButton} onPress={() => onScanned(null)}>
            <Text style={styles.manualButtonText}>Enter number manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors, topInset, bottomInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#000000",
      alignItems: "center",
      justifyContent: "center",
    },
    header: {
      position: "absolute",
      top: topInset,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      height: 56,
    },
    headerTitle: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "700",
    },
    closeButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    reticle: {
      width: 260,
      height: 160,
      borderWidth: 3,
      borderColor: "#ffffff",
      borderRadius: 16,
      backgroundColor: "transparent",
    },
    overlayText: {
      color: "#ffffff",
      fontSize: 13,
      marginTop: 18,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    messageBox: {
      paddingHorizontal: 32,
      alignItems: "center",
    },
    messageTitle: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    messageText: {
      color: "rgba(255,255,255,0.75)",
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },
    permissionButton: {
      marginTop: 18,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    permissionButtonText: {
      color: "#ffffff",
      fontWeight: "700",
    },
    footer: {
      position: "absolute",
      bottom: bottomInset + 24,
      left: 0,
      right: 0,
      alignItems: "center",
    },
    manualButton: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.6)",
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 22,
    },
    manualButtonText: {
      color: "#ffffff",
      fontWeight: "600",
      fontSize: 13,
    },
  });
}
