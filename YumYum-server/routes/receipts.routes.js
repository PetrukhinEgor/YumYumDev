//YumYum-server/routes/receipts.routes.js
const express = require('express')
const axios = require('axios')
const router = express.Router()

router.post('/scan', async (req, res) => {
  try {
    const { qr } = req.body

    const formData = new URLSearchParams()
    formData.append('token', '35521.K6zscE35uOFpo8juZ')
    formData.append('qrraw', qr)

    const response = await axios.post(
      'https://proverkacheka.com/api/v1/check/get',
      formData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error(error.response?.data || error.message)
    res.status(500).json({ error: 'Ошибка получения данных чека' })
  }
})

module.exports = router
