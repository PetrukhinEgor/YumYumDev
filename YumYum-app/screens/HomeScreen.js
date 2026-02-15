// YumYum-app/screens/HomeScreen.js
import React from 'react'
import { View, Text, Button } from 'react-native'

export default function HomeScreen({ navigation }) {
  return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize:20, marginBottom:20 }}>
        YumYum — Сканер чеков
      </Text>

      <Button
        title="Сканировать чек"
        onPress={() => navigation.navigate('ScanReceipt')}
      />
    </View>
  )
}
