// YumYum-app/navigation/MainTabs.js

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import ScanStack from "./ScanStack";
import ShoppingStack from "./ShoppingStack";
import ProductsScreen from "../screens/ProductsScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  const tabBarBottom = Math.max(insets.bottom, 10);
  const tabBarHeight = 72;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        sceneStyle: {
          backgroundColor: "#F4F4F4",
        },

        tabBarStyle: {
          backgroundColor: "#28B3AC",
          borderTopWidth: 0,
          borderRadius: 24,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          overflow: "hidden",
        },

        tabBarItemStyle: {
          paddingVertical: 8,
        },

        tabBarBackground: () => (
          <View style={styles.tabBarBackground}>
            <View style={styles.tabBarGlow} />
          </View>
        ),
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

      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="🛒" focused={focused} />
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
  tabBarBackground: {
    flex: 1,
    backgroundColor: "#28B3AC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#28B3AC",
  },

  tabBarGlow: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

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
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  iconWrapperFocused: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  centerIconWrapperFocused: {
    backgroundColor: "#F6A347",
  },

  iconText: {
    fontSize: 22,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "700",
  },

  iconTextFocused: {
    color: "#FFFFFF",
  },

  centerIconText: {
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 30,
  },
});