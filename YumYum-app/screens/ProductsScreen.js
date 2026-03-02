import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Button } from "react-native";
import axios from "axios";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const handleDelete = (id) => {
  axios.delete(`http://192.168.1.138:5000/api/products/${id}`)
    .then(() => {
      // Обновляем список после удаления
      setProducts(prev => prev.filter(p => p.id !== id))
    })
    .catch(err => console.log(err))
}


  useEffect(() => {
    axios
      .get("http://192.168.1.138:5000/api/products")
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Мои продукты</Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <Text>
              {item.name} — {item.quantity} {item.unit}
            </Text>

            <Button title="Удалить" onPress={() => handleDelete(item.id)} />
          </View>
        )}
      />
    </View>
  );
}
