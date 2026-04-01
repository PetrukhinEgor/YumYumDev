// YumYum-app/navigation/ShoppingStack.js

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ShoppingListScreen from "../screens/ShoppingListScreen";

const Stack = createNativeStackNavigator();

export default function ShoppingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
    </Stack.Navigator>
  );
}