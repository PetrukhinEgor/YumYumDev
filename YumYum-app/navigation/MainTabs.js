// YumYum-app/navigation/MainTabs.js

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeStack from "./HomeStack";
import ScanStack from "./ScanStack";
import ShoppingStack from "./ShoppingStack";
import ProductsScreen from "../screens/ProductsScreen";

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
          height: 100,
          backgroundColor: "#28B3AC",
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
          paddingTop: 10,
          paddingBottom: 10,
        },

        tabBarItemStyle: {
          paddingVertical: 4,
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
            <TabButton label="👁️" focused={focused} center />
          ),
        }}
      />

      <Tab.Screen
        name="ProductsTab"
        component={ProductsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton label="📋" focused={focused} />
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
        focused && styles.iconWrapperFocused,
        center && styles.centerIconWrapper,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  tabBarGlow: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  iconWrapperFocused: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  centerIconWrapper: {
    backgroundColor: "rgba(255,255,255,0.10)",
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
    fontSize: 24,
    lineHeight: 26,
  },
});