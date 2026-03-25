// YumYum-app/screens/ReceiptResult.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReceiptResult({ route }) {
  const { qrData } = route.params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReceipt = async () => {
      try {
        console.log("QR DATA:", qrData);

        const res = await axios.post(
          "http://192.168.1.138:5000/api/receipts/scan",
          { qr: qrData },
          { timeout: 10000 }
        );

        console.log("RESPONSE:", res.data);
        setData(res.data);
      } catch (err) {
        console.log("ERROR:", err.message);
        setError("Не удалось обработать чек");
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [qrData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#28B3AC" />
          <Text style={styles.loadingText}>Обрабатываем чек...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const savedItems = data?.savedItems || [];
  const skippedItems = data?.skippedItems || [];
  const totalItems = data?.totalItems ?? savedItems.length + skippedItems.length;
  const savedCount = data?.savedCount ?? savedItems.length;
  const skippedCount = data?.skippedCount ?? skippedItems.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Результат сканирования чека</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Всего товаров: {totalItems}</Text>
          <Text style={styles.summaryText}>Сохранено: {savedCount}</Text>
          <Text style={styles.summaryText}>Пропущено: {skippedCount}</Text>
        </View>

        <Text style={styles.sectionTitle}>Сохранённые товары</Text>

        {savedItems.length === 0 ? (
          <Text style={styles.emptyText}>Нет сохранённых товаров</Text>
        ) : (
          savedItems.map((item, index) => (
            <View key={`saved-${index}`} style={styles.card}>
              <Text style={styles.itemName}>{item.name}</Text>

              <Text style={styles.itemText}>
                Ингредиент: {item.ingredientName || "не определён"}
              </Text>

              <Text style={styles.itemText}>
                Нормализованное количество:{" "}
                {item.normalizedQuantity != null
                  ? `${item.normalizedQuantity} ${item.normalizedUnit || ""}`
                  : "не удалось определить"}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Пропущенные товары</Text>

        {skippedItems.length === 0 ? (
          <Text style={styles.emptyText}>Нет пропущенных товаров</Text>
        ) : (
          skippedItems.map((item, index) => (
            <View key={`skipped-${index}`} style={styles.cardSkipped}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemText}>
                Причина: {translateSkipReason(item.reason)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function translateSkipReason(reason) {
  switch (reason) {
    case "non_food":
      return "непищевой товар";
    case "unknown_non_food_or_unclear":
      return "товар не удалось уверенно распознать как пищевой";
    case "empty_name":
      return "пустое название товара";
    default:
      return reason || "неизвестная причина";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#28B3AC",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 6,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
    color: "#F6A347",
  },
  card: {
    backgroundColor: "#ECFBF7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CBECE3",
  },
  cardSkipped: {
    backgroundColor: "#FFF4F1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F5D2C9",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#222",
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
    color: "#444",
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 16,
  },
});