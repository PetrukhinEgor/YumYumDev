// YumYum-app/screens/ProductsScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";

const API_URL = "http://192.168.1.138:5000";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
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
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/products/${id}`);
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.log("Ошибка удаления:", err.message);
      Alert.alert("Ошибка", "Не удалось удалить продукт");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

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
            Нормализовано: {Number(item.normalized_quantity)} {item.normalized_unit}
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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Загружаем продукты...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Мои продукты</Text>

      {products.length === 0 ? (
        <Text style={styles.emptyText}>Список продуктов пока пуст</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "#f8f9fb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e4e7ec",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    marginBottom: 6,
  },
  goodBadge: {
    fontSize: 14,
    color: "#146c2e",
    marginBottom: 10,
  },
  warnBadge: {
    fontSize: 14,
    color: "#b26a00",
    marginBottom: 10,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});