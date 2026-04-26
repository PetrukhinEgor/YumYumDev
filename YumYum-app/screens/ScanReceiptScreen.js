import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

export default function ScanReceiptScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
    }, [])
  );

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.infoText}>Запрос разрешения на камеру...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.infoText}>Нет доступа к камере</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;

    setScanned(true);

    navigation.navigate("ReceiptResult", {
      qrData: data,
      scanId: Date.now(),
    });
  };

  return (
    <SafeAreaView style={styles.cameraSafeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Сканирование чека</Text>
          <Text style={styles.overlayText}>Наведите камеру на QR-код чека</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cameraSafeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F4F4",
    padding: 20,
  },
  infoText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 110,
    backgroundColor: "rgba(0,0,0,0.50)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
