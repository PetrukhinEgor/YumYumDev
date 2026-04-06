// YumYum-app/navigation/MainTabs.js

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeStack from "./HomeStack";
import ScanStack from "./ScanStack";
import ShoppingStack from "./ShoppingStack";
import ProductsStack from "./ProductsStack";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
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
            <TabButton label="🏠" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="📸" focused={focused} center />
          ),
        }}
      />

      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="📝" focused={focused} />
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  centerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "transparent",
  },

  iconWrapperFocused: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  iconText: {
    fontSize: 22,
  },

  iconTextFocused: {
    fontSize: 24,
  },

  centerIconText: {
    fontSize: 22,
  },
});