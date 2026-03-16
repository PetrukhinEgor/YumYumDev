//YumYum-server/index.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const initDb = require('./initDb')




const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/receipts', require('./routes/receipts.routes'))
app.use('/api/products', require('./routes/products.routes'))
app.use("/api/recipes", require("./routes/recipes.routes"));
app.use("/api/shopping-list", require("./routes/shopping.routes"));



const PORT = process.env.PORT || 5000

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})
