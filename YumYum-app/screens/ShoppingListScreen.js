// YumYum-app/screens/ShoppingListScreen.js

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";

export default function ShoppingListScreen({ route, navigation }) {
  const recipes = useMemo(() => route?.params?.recipes || [], [route?.params]);
  const recipeNames = useMemo(
    () => route?.params?.recipeNames || [],
    [route?.params]
  );
  const requestKey = route?.params?.requestKey || "";

  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [error, setError] = useState("");
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    const loadShoppingList = async () => {
      if (!recipes.length) {
        setShoppingList([]);
        setCheckedItems({});
        setError("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await axios.post(`${API_URL}/api/shopping-list`, {
          recipes,
        });

        setShoppingList(res.data?.shoppingList || []);
        setCheckedItems({});
      } catch (err) {
        console.log("Ошибка загрузки списка покупок:", err.message);
        setError("Не удалось загрузить список покупок");
        setShoppingList([]);
        setCheckedItems({});
      } finally {
        setLoading(false);
      }
    };

    loadShoppingList();
  }, [requestKey, recipes]);

  const checkedCount = useMemo(() => {
    return shoppingList.filter((item, index) => {
      const itemKey = getItemKey(item, index);
      return !!checkedItems[itemKey];
    }).length;
  }, [shoppingList, checkedItems]);

  const toggleChecked = (item, index) => {
    const itemKey = getItemKey(item, index);

    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const handleClearShoppingList = () => {
    Alert.alert(
      "Очистить список покупок",
      "Список покупок будет очищен, а выбранные рецепты на главной будут сброшены. Продолжить?",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Очистить",
          style: "destructive",
          onPress: () => {
            setShoppingList([]);
            setCheckedItems({});
            setError("");

            navigation.setParams({
              recipes: [],
              recipeNames: [],
              requestKey: `cleared-${Date.now()}`,
            });

            navigation.getParent()?.navigate("HomeTab", {
              screen: "HomeScreen",
              params: {
                clearSelectionKey: Date.now(),
              },
            });
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }) => {
    const itemKey = getItemKey(item, index);
    const isChecked = !!checkedItems[itemKey];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, isChecked && styles.cardChecked]}
        onPress={() => toggleChecked(item, index)}
      >
        <View style={styles.cardTopRow}>
          <TouchableOpacity
            style={[styles.checkbox, isChecked && styles.checkboxChecked]}
            onPress={() => toggleChecked(item, index)}
            activeOpacity={0.8}
          >
            <Text style={styles.checkboxText}>{isChecked ? "✓" : ""}</Text>
          </TouchableOpacity>

          <View style={styles.itemContent}>
            <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
              {item.name}
            </Text>

            <Text style={[styles.itemText, isChecked && styles.itemTextChecked]}>
              Нужно всего: {Number(item.needed)} {item.unit}
            </Text>

            <Text style={[styles.itemText, isChecked && styles.itemTextChecked]}>
              Есть сейчас: {Number(item.available)} {item.unit}
            </Text>

            <Text style={[styles.toBuyText, isChecked && styles.toBuyTextChecked]}>
              Купить: {Number(item.toBuy)} {item.unit}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const hasRecipes = recipes.length > 0;
  const hasShoppingItems = shoppingList.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Список покупок</Text>

        {recipeNames.length > 0 ? (
          <Text style={styles.subtitle}>Для блюд: {recipeNames.join(", ")}</Text>
        ) : (
          <Text style={styles.subtitle}>
            Выбери один или несколько рецептов, чтобы собрать общий список покупок
          </Text>
        )}

        {hasShoppingItems ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Прогресс покупок</Text>
            <Text style={styles.progressText}>
              Отмечено: {checkedCount} из {shoppingList.length}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#28B3AC" />
            <Text style={styles.loadingText}>Формируем список покупок...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !hasRecipes ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Пока список покупок пуст</Text>
            <Text style={styles.emptyText}>
              На главной нажми «Выбрать», отметь нужные блюда и открой общий список
              покупок.
            </Text>
          </View>
        ) : !hasShoppingItems ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Список покупок очищен</Text>
            <Text style={styles.emptyText}>
              Все покупки завершены. Можешь выбрать новые рецепты на главной.
            </Text>
          </View>
        ) : (
          <FlatList
            data={shoppingList}
            keyExtractor={(item, index) => getItemKey(item, index)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {hasRecipes ? (
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearShoppingList}
            >
              <Text style={styles.clearButtonText}>Очистить список покупок</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getItemKey(item, index) {
  return `${item.name}-${item.unit}-${index}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 16,
    paddingTop: 8,
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
    color: "#444",
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
    marginBottom: 16,
    lineHeight: 22,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#28B3AC",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 14,
    color: "#555",
  },
  errorText: {
    color: "#C0392B",
    fontSize: 15,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 110,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  cardChecked: {
    backgroundColor: "#F1F8F6",
    borderColor: "#BFE3D8",
    opacity: 0.88,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CFCFCF",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#28B3AC",
    borderColor: "#28B3AC",
  },
  checkboxText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  itemNameChecked: {
    color: "#6D8B84",
    textDecorationLine: "line-through",
  },
  itemText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
  },
  itemTextChecked: {
    color: "#7A8A86",
  },
  toBuyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F6A347",
    marginTop: 6,
  },
  toBuyTextChecked: {
    color: "#28B3AC",
  },
  emptyBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  bottomButtons: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  clearButton: {
    backgroundColor: "#F6A347",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});