// YumYum-app/screens/HomeScreen.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "../config/api";

export default function HomeScreen({ navigation, route }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([]);

  const clearSelectionKey = route?.params?.clearSelectionKey;

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/recipes`);
      setRecipes(res.data || []);
    } catch (err) {
      console.log("Ошибка загрузки рецептов:", err.message);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  useEffect(() => {
    if (!clearSelectionKey) return;

    setSelectionMode(false);
    setSelectedRecipeIds([]);

    navigation.setParams({
      clearSelectionKey: undefined,
    });
  }, [clearSelectionKey, navigation]);

  const selectedRecipeNames = useMemo(() => {
    return recipes
      .filter((recipe) => selectedRecipeIds.includes(recipe.id))
      .map((recipe) => recipe.name);
  }, [recipes, selectedRecipeIds]);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedRecipeIds([]);
    } else {
      setSelectionMode(true);
    }
  };

  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipeIds((prev) => {
      if (prev.includes(recipeId)) {
        return prev.filter((id) => id !== recipeId);
      }
      return [...prev, recipeId];
    });
  };

  const openShoppingListForSelected = () => {
    if (!selectedRecipeIds.length) {
      Alert.alert("Список покупок", "Сначала выбери хотя бы один рецепт");
      return;
    }

    navigation.getParent()?.navigate("ShoppingTab", {
      screen: "ShoppingList",
      params: {
        recipes: selectedRecipeIds,
        recipeNames: selectedRecipeNames,
        requestKey: `${selectedRecipeIds.join("-")}-${Date.now()}`,
      },
    });
  };

  const renderRecipeCard = ({ item }) => {
    const canCook = !!item.can_cook;
    const isSelected = selectedRecipeIds.includes(item.id);

    const handlePress = () => {
      if (selectionMode) {
        toggleRecipeSelection(item.id);
      } else {
        navigation.navigate("RecipeDetails", {
          recipeId: item.id,
        });
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.card,
          canCook ? styles.cardCookable : styles.cardMissing,
          isSelected && styles.cardSelected,
        ]}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        {selectionMode ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            <Text style={styles.checkboxText}>{isSelected ? "✓" : ""}</Text>
          </View>
        ) : null}

        <View style={styles.imageCircle}>
          <Text style={styles.imageEmoji}>{getRecipeEmoji(item.name)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.cardMeta}>
          {item.cooking_time_min
            ? `${item.cooking_time_min} мин`
            : "Время не указано"}
        </Text>

        <Text style={styles.cardMeta}>
          {item.servings ? `${item.servings} порц.` : "Порции не указаны"}
        </Text>

        <View
          style={[
            styles.statusBadge,
            canCook ? styles.statusBadgeCookable : styles.statusBadgeMissing,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              canCook
                ? styles.statusBadgeTextCookable
                : styles.statusBadgeTextMissing,
            ]}
          >
            {canCook ? "Можно готовить" : "Не хватает ингредиентов"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Yum-Yum</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.sectionTitle}>Рекомендуем</Text>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={toggleSelectionMode}
            >
              <Text style={styles.selectButtonText}>
                {selectionMode ? "Отмена" : "Выбрать"}
              </Text>
            </TouchableOpacity>
          </View>

          {selectionMode ? (
            <Text style={styles.selectionHint}>
              Выбери несколько рецептов, чтобы собрать общий список покупок
            </Text>
          ) : null}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#28B3AC" />
              <Text style={styles.loadingText}>Загружаем рецепты...</Text>
            </View>
          ) : recipes.length === 0 ? (
            <Text style={styles.emptyText}>
              Пока нет рецептов. Добавь их в базу и они появятся здесь.
            </Text>
          ) : (
            <FlatList
              data={recipes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRecipeCard}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {selectionMode && selectedRecipeIds.length > 0 ? (
            <TouchableOpacity
              style={styles.shoppingButton}
              onPress={openShoppingListForSelected}
            >
              <Text style={styles.shoppingButtonText}>
                Список покупок для выбранных блюд ({selectedRecipeIds.length})
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
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
    backgroundColor: "#28B3AC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  header: {
    backgroundColor: "#28B3AC",
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F6A347",
    marginBottom: 18,
  },
  selectButton: {
    backgroundColor: "#28B3AC",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  selectionHint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 140,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    position: "relative",
  },
  cardCookable: {
    backgroundColor: "#E8FAF7",
    borderColor: "#BDEAE2",
  },
  cardMissing: {
    backgroundColor: "#FAFAFA",
    borderColor: "#ECECEC",
  },
  cardSelected: {
    borderColor: "#F6A347",
    borderWidth: 2,
  },
  checkbox: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#CFCFCF",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  checkboxSelected: {
    backgroundColor: "#F6A347",
    borderColor: "#F6A347",
  },
  checkboxText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  imageCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF3E4",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  imageEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    minHeight: 42,
  },
  cardMeta: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 6,
  },
  statusBadge: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statusBadgeCookable: {
    backgroundColor: "#D8F4EE",
  },
  statusBadgeMissing: {
    backgroundColor: "#F1F1F1",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  statusBadgeTextCookable: {
    color: "#1E8F80",
  },
  statusBadgeTextMissing: {
    color: "#777",
  },
  shoppingButton: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    backgroundColor: "#F6A347",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  shoppingButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});