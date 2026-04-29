import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";
import { isDisplayDate, toApiDate, toDisplayDate } from "../utils/dateFormat";

const UNIT_OPTIONS = ["g", "ml", "pcs"];

export default function ReceiptResult({ route, navigation }) {
  const { qrData, scanId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError("");
        setItems([]);

        const res = await axios.post(
          `${API_URL}/api/receipts/scan`,
          { qr: qrData },
          { timeout: 10000 }
        );

        const receiptItems = (res.data?.items || []).map((item) => ({
          ...item,
          expiresAt: toDisplayDate(item.expiresAt || item.expires_at),
        }));

        setItems(receiptItems);
      } catch (err) {
        console.log("SCAN ERROR:", err.message);
        setError("Не удалось подготовить черновик чека");
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [qrData, scanId]);

  const updateItem = (draftId, patch) => {
    setItems((prev) =>
      prev.map((item) =>
        item.draftId === draftId ? { ...item, ...patch } : item
      )
    );
  };

  const getItemStatus = (item) => {
    const name = String(item.name || "").trim();
    const quantity = Number(item.quantity);
    const unit = String(item.unit || "").trim().toLowerCase();
    const expiresAt = String(item.expiresAt || item.expires_at || "").trim();

    if (!item.include) return "excluded";
    if (!item.isEdible) return "non_food";
    if (!name) return "needs_review";
    if (!quantity || quantity <= 0) return "needs_review";
    if (!UNIT_OPTIONS.includes(unit)) return "needs_review";
    if (expiresAt && !isDisplayDate(expiresAt)) return "needs_review";
    return "ready";
  };

  const summary = useMemo(() => {
    const total = items.length;
    const ready = items.filter((item) => getItemStatus(item) === "ready").length;
    const needsReview = items.filter(
      (item) => getItemStatus(item) === "needs_review"
    ).length;
    const excluded = items.filter((item) =>
      ["excluded", "non_food"].includes(getItemStatus(item))
    ).length;

    return {
      total,
      ready,
      needsReview,
      excluded,
    };
  }, [items]);

  const handleConfirm = async () => {
    const selectedItems = items.filter((item) => item.include && item.isEdible);

    if (!selectedItems.length) {
      Alert.alert("Подтверждение", "Нет товаров, выбранных для добавления");
      return;
    }

    const invalidItem = selectedItems.find((item) => {
      const name = String(item.name || "").trim();
      const quantity = Number(item.quantity);
      const unit = String(item.unit || "").trim().toLowerCase();
      const expiresAt = String(item.expiresAt || item.expires_at || "").trim();

      return (
        !name ||
        !quantity ||
        quantity <= 0 ||
        !UNIT_OPTIONS.includes(unit) ||
        (expiresAt && !isDisplayDate(expiresAt))
      );
    });

    if (invalidItem) {
      Alert.alert(
        "Проверьте данные",
        `У товара "${invalidItem.name || invalidItem.originalName || "Без названия"}" нужно проверить название, количество, единицу и срок годности`
      );
      return;
    }

    try {
      setSubmitting(true);
      const payloadItems = items.map((item) => ({
        ...item,
        expiresAt: toApiDate(item.expiresAt || item.expires_at) || null,
      }));

      const res = await axios.post(
        `${API_URL}/api/receipts/confirm`,
        { items: payloadItems },
        { timeout: 10000 }
      );

      const addedCount = res.data?.addedCount ?? 0;
      const skippedCount = res.data?.skippedCount ?? 0;

      Alert.alert(
        "Сканирование подтверждено",
        `Добавлено товаров: ${addedCount}\nПропущено: ${skippedCount}`,
        [
          {
            text: "Сканировать ещё",
            onPress: () => navigation.navigate("ScanReceipt"),
          },
          {
            text: "К продуктам",
            onPress: () => navigation.getParent()?.navigate("ProductsTab"),
          },
        ]
      );
    } catch (err) {
      console.log("CONFIRM ERROR:", err.message);
      const errorText =
        err.response?.data?.error || "Не удалось подтвердить сканирование";
      Alert.alert("Ошибка", errorText);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanAgain = () => {
    navigation.navigate("ScanReceipt");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#28B3AC" />
          <Text style={styles.loadingText}>Готовим черновик чека...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable style={styles.secondaryButton} onPress={handleScanAgain}>
            <Text style={styles.secondaryButtonText}>Сканировать ещё</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Проверьте товары</Text>
          <Text style={styles.subtitle}>
            Отредактируйте список перед добавлением в базу
          </Text>
        </View>

        <Pressable style={styles.headerButton} onPress={handleScanAgain}>
          <Text style={styles.headerButtonText}>Сканировать ещё</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Всего позиций: {summary.total}</Text>
          <Text style={styles.summaryText}>Готовы к добавлению: {summary.ready}</Text>
          <Text style={styles.summaryText}>Нужно проверить: {summary.needsReview}</Text>
          <Text style={styles.summaryText}>Исключено: {summary.excluded}</Text>
        </View>

        {items.map((item) => {
          const status = getItemStatus(item);
          const ingredientHint = String(item.ingredientName || "").trim();

          return (
            <View
              key={item.draftId}
              style={[
                styles.card,
                status === "ready" && styles.cardReady,
                status === "needs_review" && styles.cardReview,
                (status === "excluded" || status === "non_food") &&
                  styles.cardExcluded,
              ]}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.originalName || "Без названия"}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    status === "ready" && styles.statusBadgeReady,
                    status === "needs_review" && styles.statusBadgeReview,
                    (status === "excluded" || status === "non_food") &&
                      styles.statusBadgeExcluded,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {translateStatus(status)}
                  </Text>
                </View>
              </View>

              {!!item.reason && (
                <Text style={styles.reasonText}>
                  Причина автоклассификации: {translateSkipReason(item.reason)}
                </Text>
              )}

              {!!item.suggestedIngredientName && (
                <Text style={styles.suggestionText}>
                  Автоопределение: {item.suggestedIngredientName}
                </Text>
              )}

              <View style={styles.switchRow}>
                <View style={styles.switchItem}>
                  <Text style={styles.switchLabel}>Добавить</Text>
                  <Switch
                    value={!!item.include}
                    onValueChange={(value) => updateItem(item.draftId, { include: value })}
                    trackColor={{ false: "#D7D7D7", true: "#8AD8D2" }}
                    thumbColor={item.include ? "#28B3AC" : "#F4F3F4"}
                  />
                </View>

                <View style={styles.switchItem}>
                  <Text style={styles.switchLabel}>Съедобный</Text>
                  <Switch
                    value={!!item.isEdible}
                    onValueChange={(value) =>
                      updateItem(item.draftId, { isEdible: value })
                    }
                    trackColor={{ false: "#D7D7D7", true: "#8AD8D2" }}
                    thumbColor={item.isEdible ? "#28B3AC" : "#F4F3F4"}
                  />
                </View>
              </View>

              <Text style={styles.label}>Название товара</Text>
              <TextInput
                style={styles.input}
                value={String(item.name ?? "")}
                onChangeText={(value) => updateItem(item.draftId, { name: value })}
                placeholder="Например: Гречка"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Категория / ингредиент</Text>
              <TextInput
                style={styles.input}
                value={String(item.ingredientName ?? "")}
                onChangeText={(value) =>
                  updateItem(item.draftId, { ingredientName: value })
                }
                placeholder="Например: Гречка"
                placeholderTextColor="#999"
              />

              {!ingredientHint ? (
                <Text style={styles.helperWarning}>
                  Без ингредиента товар сохранится, но не будет участвовать в рецептах и списке покупок.
                </Text>
              ) : null}

              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <Text style={styles.label}>Количество</Text>
                  <TextInput
                    style={styles.input}
                    value={item.quantity == null ? "" : String(item.quantity)}
                    onChangeText={(value) =>
                      updateItem(item.draftId, {
                        quantity: value.replace(",", "."),
                      })
                    }
                    placeholder="0"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inlineField}>
                  <Text style={styles.label}>Единица</Text>
                  <View style={styles.unitRow}>
                    {UNIT_OPTIONS.map((unitOption) => {
                      const active =
                        String(item.unit || "").toLowerCase() === unitOption;

                      return (
                        <Pressable
                          key={`${item.draftId}-${unitOption}`}
                          style={[
                            styles.unitButton,
                            active && styles.unitButtonActive,
                          ]}
                          onPress={() =>
                            updateItem(item.draftId, { unit: unitOption })
                          }
                        >
                          <Text
                            style={[
                              styles.unitButtonText,
                              active && styles.unitButtonTextActive,
                            ]}
                          >
                            {unitOption}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Срок годности</Text>
              <TextInput
                style={styles.input}
                value={String(item.expiresAt || item.expires_at || "")}
                onChangeText={(value) =>
                  updateItem(item.draftId, { expiresAt: value })
                }
                placeholder="Например: 03-05-2026"
                placeholderTextColor="#999"
              />

              <Text style={styles.helperText}>
                Вы можете вручную исправить название, количество, единицу, категорию и срок годности перед сохранением.
              </Text>
            </View>
          );
        })}

        <Pressable
          style={[styles.confirmButton, submitting && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          <Text style={styles.confirmButtonText}>
            {submitting ? "Сохраняем..." : "Подтвердить сканирование"}
          </Text>
        </Pressable>
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

function translateStatus(status) {
  switch (status) {
    case "ready":
      return "Готов";
    case "needs_review":
      return "Проверить";
    case "excluded":
      return "Исключён";
    case "non_food":
      return "Несъедобный";
    default:
      return "Черновик";
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
    paddingBottom: 140,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#F4F4F4",
  },
  headerTextWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#28B3AC",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#667085",
  },
  headerButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButtonText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    fontSize: 18,
    color: "#D64545",
    textAlign: "center",
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: "#28B3AC",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E6E9EC",
  },
  summaryText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardReady: {
    backgroundColor: "#ECFBF7",
    borderColor: "#CBECE3",
  },
  cardReview: {
    backgroundColor: "#FFF9ED",
    borderColor: "#F3DEB4",
  },
  cardExcluded: {
    backgroundColor: "#FFF4F1",
    borderColor: "#F5D2C9",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    paddingRight: 12,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeReady: {
    backgroundColor: "#C9F2E7",
  },
  statusBadgeReview: {
    backgroundColor: "#FCE7B0",
  },
  statusBadgeExcluded: {
    backgroundColor: "#F8D5CC",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C4730",
  },
  reasonText: {
    fontSize: 13,
    color: "#9A4D3A",
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 13,
    color: "#14746F",
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  switchItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475467",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE3",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2937",
    marginBottom: 12,
  },
  inlineFields: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  inlineField: {
    flex: 1,
    marginRight: 10,
  },
  unitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
  },
  unitButton: {
    minWidth: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  unitButtonActive: {
    backgroundColor: "#28B3AC",
    borderColor: "#28B3AC",
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475467",
  },
  unitButtonTextActive: {
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#667085",
    marginTop: 4,
  },
  helperWarning: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9A4D3A",
    marginTop: -4,
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: "#28B3AC",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
