// YumYum-app/screens/HomeScreen.js

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "http://192.168.1.138:5000";

export default function HomeScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const renderRecipeCard = ({ item }) => {
    const canCook = !!item.can_cook;

    return (
      <TouchableOpacity
        style={[styles.card, canCook ? styles.cardCookable : styles.cardMissing]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("RecipeDetails", {
            recipeId: item.id,
          })
        }
      >
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
          <Text style={styles.sectionTitle}>Рекомендуем</Text>

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
  sectionTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F6A347",
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 120,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },
  card: {
    width: "48%",
    minHeight: 245,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  cardCookable: {
    backgroundColor: "#DDF6F0",
    borderColor: "#9EDFD0",
  },
  cardMissing: {
    backgroundColor: "#F4F4F4",
    borderColor: "#DFDFDF",
  },
  imageCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  imageEmoji: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    marginBottom: 8,
    minHeight: 40,
  },
  cardMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  statusBadge: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statusBadgeCookable: {
    backgroundColor: "#28B3AC",
  },
  statusBadgeMissing: {
    backgroundColor: "#E6E6E6",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  statusBadgeTextCookable: {
    color: "#FFFFFF",
  },
  statusBadgeTextMissing: {
    color: "#666666",
  },
  center: {
    alignItems: "center",
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
});