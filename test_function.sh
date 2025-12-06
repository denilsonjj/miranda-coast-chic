#!/bin/bash

# Teste rápido da Edge Function de frete

FUNCTION_URL="https://zdhqhwdxmrdwlgiqbnlj.functions.supabase.co/calculate-shipping"

echo "🧪 Testando Edge Function de Frete..."
echo "URL: $FUNCTION_URL"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "from_postal_code": "01310100",
    "to_postal_code": "20040020",
    "products": [
      {
        "width": 20,
        "height": 5,
        "length": 30,
        "weight": 0.3,
        "quantity": 1
      }
    ]
  }' \
  -v

echo ""
echo "Se viu erro 404 ou 500, a função pode não estar deployada."
echo "Se viu sucesso, a função está funcionando! ✅"
