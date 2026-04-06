// YumYum-app/screens/HomeScreen.js

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "../config/api";

const CATEGORY_OPTIONS = [
  "Все",
  "Завтрак",
  "Обед",
  "Ужин",
  "Перекус",
  "Первое",
  "Второе",
  "Мангальные блюда",
  "Другое",
];

export default function HomeScreen({ navigation, route }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Все");

  const categoriesScrollRef = useRef(null);
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

  const orderedCategories = useMemo(() => {
    if (activeCategory === "Все") {
      return CATEGORY_OPTIONS;
    }

    const rest = CATEGORY_OPTIONS.filter((item) => item !== activeCategory);
    return [activeCategory, ...rest];
  }, [activeCategory]);

  const filteredRecipes = useMemo(() => {
    if (activeCategory === "Все") return recipes;

    return recipes.filter((recipe) => {
      const recipeCategory = recipe.category || "Другое";
      return recipeCategory === activeCategory;
    });
  }, [recipes, activeCategory]);

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

  const openCreateRecipe = () => {
    navigation.navigate("CreateRecipe");
  };

  const handleSelectCategory = (category) => {
    setActiveCategory(category);

    requestAnimationFrame(() => {
      categoriesScrollRef.current?.scrollTo({
        x: 0,
        animated: true,
      });
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

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category || "Другое"}</Text>
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
            numberOfLines={2}
          >
            {canCook ? "Можно готовить" : "Не хватает ингредиентов"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>Рецепты</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={openCreateRecipe}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText} numberOfLines={1}>
            + Рецепт
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={toggleSelectionMode}
          activeOpacity={0.85}
        >
          <Text style={styles.selectButtonText} numberOfLines={1}>
            {selectionMode ? "Отмена" : "Выбрать"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={categoriesScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {orderedCategories.map((category) => {
          const isActive = activeCategory === category;

          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                isActive && styles.categoryChipActive,
              ]}
              onPress={() => handleSelectCategory(category)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isActive && styles.categoryChipTextActive,
                ]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectionMode ? (
        <Text style={styles.selectionHint}>
          Выбери несколько рецептов, чтобы собрать общий список покупок
        </Text>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <Text style={styles.emptyText}>
      {recipes.length === 0
        ? "Пока нет рецептов. Создай первый рецепт или добавь их в базу."
        : "В этой категории пока нет рецептов."}
    </Text>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Yum-Yum</Text>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#28B3AC" />
              <Text style={styles.loadingText}>Загружаем рецепты...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRecipeCard}
              numColumns={2}
              columnWrapperStyle={
                filteredRecipes.length > 0 ? styles.row : undefined
              }
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {selectionMode && selectedRecipeIds.length > 0 ? (
            <TouchableOpacity
              style={styles.shoppingButton}
              onPress={openShoppingListForSelected}
              activeOpacity={0.9}
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
    paddingTop: 18,
  },
  listHeader: {
    paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F6A347",
    lineHeight: 36,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E4",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#28B3AC",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  selectButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#28B3AC",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  categoriesRow: {
    paddingBottom: 4,
    paddingRight: 18,
    alignItems: "center",
  },
  categoryChip: {
    alignSelf: "flex-start",
    minHeight: 40,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#28B3AC",
    borderColor: "#28B3AC",
  },
  categoryChipText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  selectionHint: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    lineHeight: 20,
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
    minHeight: 300,
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  cardCookable: {
    backgroundColor: "#DDF6F0",
    borderColor: "#9EDFD0",
  },
  cardMissing: {
    backgroundColor: "#F4F4F4",
    borderColor: "#DFDFDF",
  },
  cardSelected: {
    borderColor: "#F6A347",
    borderWidth: 2,
  },
  checkbox: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#28B3AC",
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
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFF3E4",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  imageEmoji: {
    fontSize: 30,
  },
  categoryBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    minHeight: 40,
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
    minHeight: 44,
    justifyContent: "center",
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
    textAlign: "center",
    paddingHorizontal: 8,
  },
});