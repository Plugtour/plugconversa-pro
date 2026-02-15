// caminho: api/server.js

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://plugconversa.com.br',
      'https://app.plugconversa.com.br'
    ],
    credentials: true
  })
)

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'PlugConversaPro API online 🚀' })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`)
})

// fim: api/server.js
