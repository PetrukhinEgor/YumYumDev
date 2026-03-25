// YumYum-app/navigation/ScanStack.js

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ScanReceiptScreen from "../screens/ScanReceiptScreen";
import ReceiptResult from "../screens/ReceiptResult";

const Stack = createNativeStackNavigator();

export default function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} />
      <Stack.Screen name="ReceiptResult" component={ReceiptResult} />
    </Stack.Navigator>
  );
}