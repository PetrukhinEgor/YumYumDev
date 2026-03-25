// YumYum-app/screens/ProductsScreen.js

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "http://192.168.1.138:5000";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data);
    } catch (err) {
      console.log("Ошибка загрузки продуктов:", err.message);
      Alert.alert("Ошибка", "Не удалось загрузить список продуктов");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/products/${id}`);
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.log("Ошибка удаления:", err.message);
      Alert.alert("Ошибка", "Не удалось удалить продукт");
    }
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return products;

    return products.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const ingredient = item.ingredient_name?.toLowerCase() || "";
      return name.includes(q) || ingredient.includes(q);
    });
  }, [products, search]);

  const renderProduct = ({ item }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>

        <Text style={styles.info}>
          Количество: {item.display_amount || "не указано"}
        </Text>

        <Text style={styles.info}>
          Ингредиент: {item.ingredient_name || "не распознан"}
        </Text>

        {item.normalized_quantity != null && item.normalized_unit ? (
          <Text style={styles.goodBadge}>
            Нормализовано: {Number(item.normalized_quantity)}{" "}
            {item.normalized_unit}
          </Text>
        ) : (
          <Text style={styles.warnBadge}>
            Нормализованные данные пока отсутствуют
          </Text>
        )}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteButtonText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#28B3AC" />
          <Text style={styles.loadingText}>Загружаем продукты...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Мои продукты</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по продуктам..."
          placeholderTextColor="#8a8a8a"
          value={search}
          onChangeText={setSearch}
        />

        {filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>
            {search.trim()
              ? "Ничего не найдено по вашему запросу"
              : "Список продуктов пока пуст"}
          </Text>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
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
    color: "#444",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#28B3AC",
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#222",
  },
  info: {
    fontSize: 14,
    marginBottom: 6,
    color: "#444",
  },
  goodBadge: {
    fontSize: 14,
    color: "#146C2E",
    marginBottom: 10,
  },
  warnBadge: {
    fontSize: 14,
    color: "#B26A00",
    marginBottom: 10,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F6A347",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});