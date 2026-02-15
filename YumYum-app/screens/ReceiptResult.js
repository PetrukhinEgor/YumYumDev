// YumYum-app/screens/ReceiptResult.js
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, ScrollView } from 'react-native'
import axios from 'axios'

export default function ReceiptResult({ route }) {
  const { qrData } = route.params
  const [data, setData] = useState(null)

  useEffect(() => {
    axios.post('http://192.168.1.138:5000/api/receipts/scan', { qr: qrData })
      .then(res => setData(res.data))
      .catch(err => console.log(err))
  }, [])

  if (!data) return <ActivityIndicator size="large" />

  return (
    <ScrollView style={{ padding:20 }}>
      <Text style={{ fontSize:18, marginBottom:10 }}>Товары в чеке:</Text>
      {data?.data?.json?.items?.map((item, index) => (
        <Text key={index}>
          {item.name} — {item.sum / 100} ₽
        </Text>
      ))}
    </ScrollView>
  )
}
