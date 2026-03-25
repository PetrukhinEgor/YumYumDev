// YumYum-app/screens/RecipeDetailsScreen.js

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "http://192.168.1.138:5000";

export default function RecipeDetailsScreen({ route, navigation }) {
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState(null);
  const [checkData, setCheckData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [recipeRes, checkRes] = await Promise.all([
        axios.get(`${API_URL}/api/recipes/${recipeId}`),
        axios.get(`${API_URL}/api/recipes/${recipeId}/check`),
      ]);

      setRecipe(recipeRes.data);
      setCheckData(checkRes.data);
    } catch (err) {
      console.log("Ошибка загрузки рецепта:", err.message);
      setRecipe(null);
      setCheckData(null);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCook = async () => {
    Alert.alert(
      "Подтвердить приготовление",
      "После подтверждения нужные ингредиенты будут списаны со склада продуктов.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Подтвердить",
          onPress: async () => {
            try {
              setActionLoading(true);

              const res = await axios.post(
                `${API_URL}/api/recipes/${recipeId}/cook`
              );

              Alert.alert("Успех", res.data.message || "Блюдо приготовлено");
              await loadData();
            } catch (err) {
              const errorText =
                err.response?.data?.error || "Не удалось приготовить блюдо";
              Alert.alert("Ошибка", errorText);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddToShoppingList = async () => {
    try {
      setActionLoading(true);

      const res = await axios.post(`${API_URL}/api/shopping-list`, {
        recipes: [recipeId],
      });

      const items = res.data?.shoppingList || [];

      if (items.length === 0) {
        Alert.alert("Список покупок", "Ничего добавлять не нужно");
        return;
      }

      const message = items
        .map((item) => `${item.name} — купить ${Number(item.toBuy)} ${item.unit}`)
        .join("\n");

      Alert.alert("Добавлено в список покупок", message);
    } catch (err) {
      const errorText =
        err.response?.data?.error || "Не удалось сформировать список покупок";
      Alert.alert("Ошибка", errorText);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#28B3AC" />
          <Text style={styles.loadingText}>Загружаем рецепт...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe || !checkData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Не удалось загрузить рецепт</Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canCook = !!checkData.canCook;
  const ingredientsStatus = checkData.ingredientsStatus || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.topBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.topBackText}>← Назад</Text>
        </TouchableOpacity>

        <View style={styles.imageBlock}>
          <Text style={styles.imageEmoji}>{getRecipeEmoji(recipe.name)}</Text>
        </View>

        <Text style={styles.title}>{recipe.name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              ⏱ {recipe.cooking_time_min ? `${recipe.cooking_time_min} мин` : "—"}
            </Text>
          </View>

          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              🍽 {recipe.servings ? `${recipe.servings} порц.` : "—"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusCard,
            canCook ? styles.statusCardCookable : styles.statusCardMissing,
          ]}
        >
          <Text
            style={[
              styles.statusTitle,
              canCook ? styles.statusTitleCookable : styles.statusTitleMissing,
            ]}
          >
            {canCook ? "Можно готовить" : "Не хватает ингредиентов"}
          </Text>

          <Text style={styles.statusDescription}>
            {canCook
              ? "Ниже показано, сколько ингредиентов есть и сколько останется после приготовления."
              : "Ниже показано, чего не хватает и что стоит добавить в список покупок."}
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Описание</Text>
          <Text style={styles.descriptionText}>
            {recipe.description || "Описание пока не добавлено"}
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Ингредиенты и остатки</Text>

          {ingredientsStatus.length ? (
            ingredientsStatus.map((item, index) => (
              <View
                key={`${item.ingredient_id}-${index}`}
                style={[
                  styles.ingredientCard,
                  item.enough
                    ? styles.ingredientCardEnough
                    : styles.ingredientCardMissing,
                ]}
              >
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.ingredientText}>
                  Нужно: {Number(item.needed)} {item.unit}
                </Text>
                <Text style={styles.ingredientText}>
                  Есть сейчас: {Number(item.available)} {item.unit}
                </Text>

                {item.enough ? (
                  <Text style={styles.ingredientOkText}>
                    Остаток после приготовления:{" "}
                    {Number(item.remainingAfterCook)} {item.unit}
                  </Text>
                ) : (
                  <Text style={styles.ingredientMissingText}>
                    Не хватает: {Number(item.missing)} {item.unit}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.descriptionText}>Ингредиенты не указаны</Text>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Шаги приготовления</Text>

          {recipe.recipe_steps?.length ? (
            recipe.recipe_steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.descriptionText}>Шаги пока не добавлены</Text>
          )}
        </View>

        {canCook ? (
          <TouchableOpacity
            style={[styles.actionButton, actionLoading && styles.buttonDisabled]}
            activeOpacity={0.9}
            onPress={handleCook}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading ? "Выполняем..." : "Подтвердить приготовление"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              actionLoading && styles.buttonDisabled,
            ]}
            activeOpacity={0.9}
            onPress={handleAddToShoppingList}
            disabled={actionLoading}
          >
            <Text style={styles.secondaryActionButtonText}>
              {actionLoading
                ? "Формируем список..."
                : "Добавить недостающее в список покупок"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getRecipeEmoji(name = "") {
  const lower = name.toLowerCase();

  if (lower.includes("омлет")) return "🍳";
  if (lower.includes("пельмен")) return "🥟";
  if (lower.includes("борщ")) return "🍲";
  if (lower.includes("карто")) return "🥔";
  if (lower.includes("салат")) return "🥗";
  if (lower.includes("яич")) return "🍳";
  if (lower.includes("пюре")) return "🥣";
  if (lower.includes("мяс")) return "🍖";

  return "🍽️";
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
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  errorText: {
    fontSize: 18,
    color: "#444",
    marginBottom: 16,
  },
  topBackButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  topBackText: {
    fontSize: 16,
    color: "#555",
    fontWeight: "600",
  },
  imageBlock: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  imageEmoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 22,
  },
  metaChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  metaChipText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
  statusCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  statusCardCookable: {
    backgroundColor: "#DDF6F0",
    borderColor: "#9EDFD0",
  },
  statusCardMissing: {
    backgroundColor: "#F4F4F4",
    borderColor: "#D9D9D9",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  statusTitleCookable: {
    color: "#18877E",
  },
  statusTitleMissing: {
    color: "#666666",
  },
  statusDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  block: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F6A347",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  ingredientCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  ingredientCardEnough: {
    backgroundColor: "#ECFBF7",
    borderColor: "#CBECE3",
  },
  ingredientCardMissing: {
    backgroundColor: "#F4F4F4",
    borderColor: "#DEDEDE",
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  ingredientText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
  },
  ingredientOkText: {
    fontSize: 14,
    color: "#18877E",
    fontWeight: "600",
    marginTop: 2,
  },
  ingredientMissingText: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "600",
    marginTop: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#28B3AC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  actionButton: {
    marginTop: 8,
    backgroundColor: "#28B3AC",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 4,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  secondaryActionButton: {
    marginTop: 8,
    backgroundColor: "#F6A347",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 4,
  },
  secondaryActionButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    backgroundColor: "#F6A347",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});