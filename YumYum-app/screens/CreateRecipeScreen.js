// YumYum-app/screens/CreateRecipeScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { API_URL } from "../config/api";

const CATEGORY_OPTIONS = [
  "Завтрак",
  "Обед",
  "Ужин",
  "Перекус",
  "Первое",
  "Второе",
  "Мангальные блюда",
  "Другое",
];

const UNIT_OPTIONS = ["g", "ml", "pcs"];

export default function CreateRecipeScreen({ navigation }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [servings, setServings] = useState("");
  const [category, setCategory] = useState("Другое");

  const [ingredients, setIngredients] = useState([
    { name: "", quantity: "", unit: "g" },
  ]);

  const [steps, setSteps] = useState([""]);
  const [loading, setLoading] = useState(false);

  const updateIngredient = (index, field, value) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: "", quantity: "", unit: "g" }]);
  };

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index, value) => {
    setSteps((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, ""]);
  };

  const removeStep = (index) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim(),
      cooking_time_min: cookingTime.trim() ? Number(cookingTime) : null,
      servings: servings.trim() ? Number(servings) : null,
      category,
      recipe_steps: steps.map((step) => step.trim()).filter(Boolean),
      ingredients: ingredients
        .map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unit: item.unit,
        }))
        .filter((item) => item.name && item.quantity > 0 && item.unit),
    };

    if (!payload.name) {
      Alert.alert("Ошибка", "Введите название рецепта");
      return;
    }

    if (!payload.ingredients.length) {
      Alert.alert("Ошибка", "Добавьте хотя бы один ингредиент");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/api/recipes`, payload);

      Alert.alert("Успех", "Рецепт создан", [
        {
          text: "OK",
          onPress: () =>
            navigation.replace("RecipeDetails", {
              recipeId: res.data.recipeId,
            }),
        },
      ]);
    } catch (err) {
      const errorText =
        err.response?.data?.error || "Не удалось создать рецепт";
      Alert.alert("Ошибка", errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Создание рецепта</Text>
        <Text style={styles.subtitle}>
          Заполни основные поля, ингредиенты и шаги приготовления.
        </Text>

        <View style={styles.block}>
          <Text style={styles.label}>Название</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Домашний омлет"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9A9A9A"
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Кратко опиши рецепт"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#9A9A9A"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.block, styles.halfBlock]}>
            <Text style={styles.label}>Время</Text>
            <TextInput
              style={styles.input}
              placeholder="15"
              value={cookingTime}
              onChangeText={setCookingTime}
              keyboardType="numeric"
              placeholderTextColor="#9A9A9A"
            />
          </View>

          <View style={[styles.block, styles.halfBlock]}>
            <Text style={styles.label}>Порции</Text>
            <TextInput
              style={styles.input}
              placeholder="2"
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholderTextColor="#9A9A9A"
            />
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Категория</Text>
          <View style={styles.chipsWrap}>
            {CATEGORY_OPTIONS.map((item) => {
              const active = category === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.categoryChipTextActive,
                    ]}
                    numberOfLines={2}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ингредиенты</Text>

        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.block}>
            <Text style={styles.label}>Ингредиент #{index + 1}</Text>

            <TextInput
              style={styles.input}
              placeholder="Название ингредиента"
              value={ingredient.name}
              onChangeText={(value) => updateIngredient(index, "name", value)}
              placeholderTextColor="#9A9A9A"
            />

            <TextInput
              style={[styles.input, styles.spacingTop]}
              placeholder="Количество"
              value={ingredient.quantity}
              onChangeText={(value) => updateIngredient(index, "quantity", value)}
              keyboardType="numeric"
              placeholderTextColor="#9A9A9A"
            />

            <View style={[styles.unitsRow, styles.spacingTop]}>
              {UNIT_OPTIONS.map((unitOption) => {
                const active = ingredient.unit === unitOption;

                return (
                  <TouchableOpacity
                    key={unitOption}
                    style={[styles.unitChip, active && styles.unitChipActive]}
                    onPress={() => updateIngredient(index, "unit", unitOption)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        active && styles.unitChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {unitOption}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {ingredients.length > 1 ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeIngredient(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.removeButtonText}>Удалить ингредиент</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={addIngredient}
          activeOpacity={0.85}
        >
          <Text style={styles.addMoreButtonText}>+ Добавить ингредиент</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Шаги приготовления</Text>

        {steps.map((step, index) => (
          <View key={index} style={styles.block}>
            <Text style={styles.label}>Шаг #{index + 1}</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Опиши действие"
              value={step}
              onChangeText={(value) => updateStep(index, value)}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9A9A9A"
            />

            {steps.length > 1 ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeStep(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.removeButtonText}>Удалить шаг</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={addStep}
          activeOpacity={0.85}
        >
          <Text style={styles.addMoreButtonText}>+ Добавить шаг</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Сохраняем..." : "Создать рецепт"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#555",
    fontWeight: "600",
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
    lineHeight: 22,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfBlock: {
    flex: 1,
  },
  block: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    minHeight: 50,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    color: "#222",
  },
  textArea: {
    minHeight: 110,
  },
  spacingTop: {
    marginTop: 10,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    minHeight: 42,
    maxWidth: "100%",
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    justifyContent: "center",
  },
  categoryChipActive: {
    backgroundColor: "#28B3AC",
    borderColor: "#28B3AC",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  unitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  unitChip: {
    minHeight: 44,
    minWidth: 74,
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  unitChipActive: {
    backgroundColor: "#F6A347",
    borderColor: "#F6A347",
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  unitChipTextActive: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F6A347",
    marginBottom: 12,
    marginTop: 4,
  },
  addMoreButton: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 16,
  },
  addMoreButtonText: {
    color: "#28B3AC",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  removeButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  removeButtonText: {
    color: "#C46A4A",
    fontWeight: "700",
    fontSize: 14,
  },
  saveButton: {
    minHeight: 54,
    backgroundColor: "#F6A347",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});