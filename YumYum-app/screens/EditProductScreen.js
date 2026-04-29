// YumYum-app/screens/EditProductScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { API_URL } from "../config/api";
import { isDisplayDate, toApiDate, toDisplayDate } from "../utils/dateFormat";

const UNIT_OPTIONS = ["g", "ml", "pcs"];

export default function EditProductScreen({ route, navigation }) {
  const product = route?.params?.product;

  const initialName = useMemo(() => String(product?.name || ""), [product]);
  const initialQuantity = useMemo(
    () =>
      product?.quantity != null && product?.quantity !== ""
        ? String(product.quantity)
        : "",
    [product]
  );
  const initialUnit = useMemo(
    () => String(product?.unit || "g").toLowerCase(),
    [product]
  );
  const initialExpiresAt = useMemo(
    () => toDisplayDate(product?.expires_at),
    [product]
  );

  const [name, setName] = useState(initialName);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState(
    UNIT_OPTIONS.includes(initialUnit) ? initialUnit : "g"
  );
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);

    if (!product?.id) {
      Alert.alert("Ошибка", "Не удалось получить данные продукта");
      return;
    }

    if (!trimmedName) {
      Alert.alert("Ошибка", "Введите название продукта");
      return;
    }

    if (!quantity.trim()) {
      Alert.alert("Ошибка", "Введите количество");
      return;
    }

    if (!parsedQuantity || parsedQuantity <= 0) {
      Alert.alert("Ошибка", "Количество должно быть больше нуля");
      return;
    }

    if (expiresAt.trim() && !isDisplayDate(expiresAt)) {
      Alert.alert("Ошибка", "Введите срок годности в формате ДД-ММ-ГГГГ");
      return;
    }

    const apiExpiresAt = toApiDate(expiresAt);

    try {
      setLoading(true);

      await axios.patch(`${API_URL}/api/products/${product.id}`, {
        name: trimmedName,
        quantity: parsedQuantity,
        unit,
        expiresAt: apiExpiresAt || null,
      });

      Alert.alert("Успех", "Продукт обновлён", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      const errorText =
        err.response?.data?.error || "Не удалось обновить продукт";
      Alert.alert("Ошибка", errorText);
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Продукт не найден</Text>

          <TouchableOpacity
            style={styles.backButtonFallback}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonFallbackText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Редактирование продукта</Text>
        <Text style={styles.subtitle}>
          Здесь можно вручную исправить название, количество и единицу измерения.
        </Text>

        <View style={styles.block}>
          <Text style={styles.label}>Название продукта</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Картошка"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9A9A9A"
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Количество</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: 500"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholderTextColor="#9A9A9A"
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Единица</Text>
          <View style={styles.unitsRow}>
            {UNIT_OPTIONS.map((item) => {
              const active = unit === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.unitChip, active && styles.unitChipActive]}
                  onPress={() => setUnit(item)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      active && styles.unitChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Срок годности</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: 03-05-2026"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholderTextColor="#9A9A9A"
          />
          <Text style={styles.hintText}>
            Оставьте пустым, если срок неизвестен. Для новых продуктов backend старается рассчитать его автоматически.
          </Text>
        </View>

        {/* <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Важно</Text>
          <Text style={styles.infoCardText}>
            После сохранения backend пересчитает нормализованные данные продукта.
            Это нужно, чтобы рецепты, проверка доступности и список покупок
            считались корректно.
          </Text>
        </View> */}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Сохраняем..." : "Сохранить изменения"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
  },
  backButtonFallback: {
    backgroundColor: "#28B3AC",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backButtonFallbackText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    color: "#28B3AC",
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#28B3AC",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#666",
    marginBottom: 18,
  },
  block: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#222",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  hintText: {
    marginTop: -4,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
  },
  unitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "#E3E3E3",
  },
  unitChipActive: {
    backgroundColor: "#28B3AC",
    borderColor: "#28B3AC",
  },
  unitChipText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "700",
  },
  unitChipTextActive: {
    color: "#FFFFFF",
  },
  infoCard: {
    backgroundColor: "#FFF7EC",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1DFC1",
    marginBottom: 18,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#A86814",
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#7A5A2C",
  },
  saveButton: {
    backgroundColor: "#28B3AC",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
