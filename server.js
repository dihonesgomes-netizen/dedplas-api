

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = "APP_USR-226558986753320-050117-c4bcf5baaa54f89bf5990a82547c086e-3370454975"; // PRODUÇÃO

app.post("/pagar", async (req, res) => {
  try {
    const { itens, frete, cliente } = req.body;

    const items = itens.map(item => ({
      title: item.nome,
      quantity: item.quantidade,
      unit_price: Number(item.preco)
    }));

    if (frete > 0) {
      items.push({
        title: "Frete",
        quantity: 1,
        unit_price: Number(frete)
      });
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items,
        payer: { name: cliente }
      })
    });

    const data = await response.json();

    res.json({ url: data.init_point });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Rodando na porta", PORT));