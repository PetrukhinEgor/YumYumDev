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
import { API_URL } from "../config/api";
import { toDisplayDate } from "../utils/dateFormat";

function getExpirationText(product) {
  if (!product.expires_at) return "Срок годности: не указан";

  const days = product.days_until_expiration;
  const displayDate = toDisplayDate(product.expires_at);

  if (product.expiration_status === "expired") {
    return `Срок истек: ${displayDate}`;
  }

  if (product.expiration_status === "today") {
    return `Срок истекает сегодня: ${displayDate}`;
  }

  if (product.expiration_status === "soon") {
    return `Скоро истекает: ${displayDate} (${days} дн.)`;
  }

  if (days != null) {
    return `Годен до: ${displayDate} (${days} дн.)`;
  }

  return `Годен до: ${displayDate}`;
}

function getExpirationStyle(product) {
  if (product.expiration_status === "expired") return styles.expiredBadge;
  if (product.expiration_status === "today") return styles.expiredBadge;
  if (product.expiration_status === "soon") return styles.soonBadge;

  return styles.expirationBadge;
}

export default function ProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data || []);
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
    Alert.alert("Удалить продукт?", "Продукт будет удалён из списка.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/api/products/${id}`);
            setProducts((prev) => prev.filter((item) => item.id !== id));
          } catch (err) {
            console.log("Ошибка удаления:", err.message);
            Alert.alert("Ошибка", "Не удалось удалить продукт");
          }
        },
      },
    ]);
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

  const openAddProduct = () => {
    navigation.navigate("AddProduct");
  };

  const openEditProduct = (product) => {
    navigation.navigate("EditProduct", {
      product,
    });
  };

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

        <Text style={getExpirationStyle(item)}>{getExpirationText(item)}</Text>

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

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditProduct(item)}
          >
            <Text style={styles.editButtonText}>Редактировать</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteButtonText}>Удалить</Text>
          </TouchableOpacity>
        </View>
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
        <View style={styles.topRow}>
          <Text style={styles.title}>Мои продукты</Text>

          <TouchableOpacity style={styles.addButton} onPress={openAddProduct}>
            <Text style={styles.addButtonText}>+ Добавить</Text>
          </TouchableOpacity>
        </View>

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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#28B3AC",
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: "#F6A347",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },
  listContent: {
    paddingBottom: 120,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  expirationBadge: {
    marginTop: 4,
    marginBottom: 4,
    color: "#39715D",
    fontWeight: "700",
    fontSize: 14,
  },
  soonBadge: {
    marginTop: 4,
    marginBottom: 4,
    color: "#B7791F",
    fontWeight: "700",
    fontSize: 14,
  },
  expiredBadge: {
    marginTop: 4,
    marginBottom: 4,
    color: "#C24141",
    fontWeight: "700",
    fontSize: 14,
  },
  goodBadge: {
    marginTop: 8,
    color: "#1E8F80",
    fontWeight: "700",
    fontSize: 14,
  },
  warnBadge: {
    marginTop: 8,
    color: "#D08A2E",
    fontWeight: "700",
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#28B3AC",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#EFEFEF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
  },
});
