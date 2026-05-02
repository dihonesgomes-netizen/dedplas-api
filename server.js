import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;

const CEP_ORIGEM = "07500000";

app.get("/", (req, res) => {
  res.json({
    status: "API DEDPLAS funcionando",
    rotas: ["/pagar", "/frete"]
  });
});

app.post("/frete", async (req, res) => {
  try {
    const { cep, itens } = req.body;

    if (!MELHOR_ENVIO_TOKEN) {
      return res.status(500).json({ erro: "MELHOR_ENVIO_TOKEN não configurado no Render" });
    }

    if (!cep) {
      return res.status(400).json({ erro: "CEP não informado" });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({ erro: "Carrinho vazio" });
    }

    const products = itens.map((item, index) => ({
      id: String(index + 1),
      width: Number(item.largura || 15),
      height: Number(item.altura || 15),
      length: Number(item.comprimento || 15),
      weight: Number(item.peso || 0.3),
      insurance_value: Number(item.preco || 1),
      quantity: Number(item.quantidade || 1)
    }));

    const resposta = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MELHOR_ENVIO_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "DEDPLAS (dihonesgomes@gmail.com)"
      },
      body: JSON.stringify({
        from: { postal_code: CEP_ORIGEM },
        to: { postal_code: String(cep).replace(/\D/g, "") },
        products
      })
    });

    const dados = await resposta.json();
    return res.json(dados);

  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
});

app.post("/pagar", async (req, res) => {
  try {
    const { itens, frete } = req.body;

    if (!ACCESS_TOKEN) {
      return res.status(500).json({ erro: "ACCESS_TOKEN não configurado no Render" });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({ erro: "Carrinho vazio" });
    }

    const items = itens.map(item => ({
      title: item.nome,
      quantity: Number(item.quantidade || 1),
      unit_price: Number(item.preco),
      currency_id: "BRL"
    }));

    if (Number(frete || 0) > 0) {
      items.push({
        title: "Frete",
        quantity: 1,
        unit_price: Number(frete),
        currency_id: "BRL"
      });
    }

    const resposta = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items,
        statement_descriptor: "DEDPLAS",
        external_reference: "DEDPLAS-" + Date.now()
      })
    });

    const dados = await resposta.json();

    if (!dados.init_point) {
      return res.status(400).json({
        erro: "Mercado Pago não gerou link",
        detalhe: dados
      });
    }

    return res.json({ url: dados.init_point });

  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("API DEDPLAS rodando na porta " + PORT);
});
