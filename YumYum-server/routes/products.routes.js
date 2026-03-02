//YumYum-server/routes/products.routes.js

const express = require('express')
const pool = require('../db')
const router = express.Router()

// Получить продукты пользователя (пока user_id = 1)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC",
      [1]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Ошибка получения продуктов" })
  }
})

// Удалить продукт
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await pool.query(
      "DELETE FROM products WHERE id = $1 AND user_id = $2",
      [id, 1]
    )

    res.json({ message: "Продукт удалён" })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Ошибка удаления" })
  }
})

// Обновить количество продукта
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { quantity } = req.body

    await pool.query(
      `
      UPDATE products
      SET quantity = $1
      WHERE id = $2 AND user_id = $3
      `,
      [quantity, id, 1]
    )

    res.json({ message: "Количество обновлено" })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Ошибка обновления" })
  }
})


module.exports = router
