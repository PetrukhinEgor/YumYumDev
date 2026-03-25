// YumYum-app/navigation/MainTabs.js

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import ScanStack from "./ScanStack";
import ProductsScreen from "../screens/ProductsScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          height: bottomOffset + 45,
          backgroundColor: "#28B3AC",
          borderTopWidth: 0,
          borderRadius: 24,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="⌂" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="＋" focused={focused} center />
          ),
        }}
      />

      <Tab.Screen
        name="ProductsTab"
        component={ProductsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="▦" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabButton({ label, focused, center = false }) {
  return (
    <View
      style={[
        styles.iconWrapper,
        center && styles.centerIconWrapper,
        focused && styles.iconWrapperFocused,
        center && focused && styles.centerIconWrapperFocused,
      ]}
    >
      <Text
        style={[
          styles.iconText,
          focused && styles.iconTextFocused,
          center && styles.centerIconText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  centerIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -22,
    backgroundColor: "#F6A347",
  },
  iconWrapperFocused: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  centerIconWrapperFocused: {
    backgroundColor: "#F6A347",
  },
  iconText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  centerIconText: {
    fontSize: 30,
  },
  iconTextFocused: {
    color: "#FFFFFF",
  },
});