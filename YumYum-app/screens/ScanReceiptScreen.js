// YumYum-app/screens/ScanReceiptScreen.js
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

export default function ScanReceiptScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    if (!permission) requestPermission()
  }, [])

  if (!permission) return <Text>Запрос разрешения...</Text>
  if (!permission.granted) return <Text>Нет доступа к камере</Text>

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return
    setScanned(true)
    navigation.replace('ReceiptResult', { qrData: data })
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"]
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>Наведите камеру на QR-код чека</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center'
  },
  text: {
    color: 'white',
    fontSize: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10
  }
})
