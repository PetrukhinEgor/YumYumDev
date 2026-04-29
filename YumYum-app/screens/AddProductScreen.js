// YumYum-app/screens/AddProductScreen.js

import React, { useState } from "react";
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
import { isDisplayDate, toApiDate } from "../utils/dateFormat";

const UNIT_OPTIONS = ["g", "ml", "pcs"];

export default function AddProductScreen({ navigation }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert("Ошибка", "Введите название продукта");
      return;
    }

    if (!quantity.trim()) {
      Alert.alert("Ошибка", "Введите количество");
      return;
    }

    if (expiresAt.trim() && !isDisplayDate(expiresAt)) {
      Alert.alert("Ошибка", "Введите срок годности в формате ДД-ММ-ГГГГ");
      return;
    }

    const apiExpiresAt = toApiDate(expiresAt);

    try {
      setLoading(true);

      await axios.post(`${API_URL}/api/products`, {
        name: trimmedName,
        quantity: Number(quantity),
        unit,
        expiresAt: apiExpiresAt || undefined,
      });

      Alert.alert("Успех", "Продукт добавлен вручную", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      const errorText =
        err.response?.data?.error || "Не удалось добавить продукт";
      Alert.alert("Ошибка", errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Ручной ввод продукта</Text>
        <Text style={styles.subtitle}>
          Добавь продукт вручную, если чека нет или товар не распознался.
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
            Можно оставить пустым: приложение подставит примерный срок по категории продукта.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Сохраняем..." : "Сохранить продукт"}
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
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#555",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#28B3AC",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 20,
  },
  block: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    color: "#222",
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
  },
  unitsRow: {
    flexDirection: "row",
    gap: 10,
  },
  unitChip: {
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },
  unitChipActive: {
    backgroundColor: "#28B3AC",
    borderColor: "#28B3AC",
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  unitChipTextActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#F6A347",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
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
