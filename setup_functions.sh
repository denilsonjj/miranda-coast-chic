#!/bin/bash

# Script para configurar Edge Functions e Secrets no Supabase
# Use: bash setup_functions.sh

PROJECT_ID="zdhqhwdxmrdwlgiqbnlj"

echo "🚀 Configurando Edge Functions e Secrets..."
echo ""

# 1. Adicionar secrets
echo "📝 Adicionando MERCADO_PAGO_ACCESS_TOKEN..."
supabase secrets set --project-id $PROJECT_ID \
  MERCADO_PAGO_ACCESS_TOKEN="TEST-1039516564010757-120413-510a017c91b8d1e3fa7eba2817e95f05-1183620218"

echo "✅ MERCADO_PAGO_ACCESS_TOKEN adicionado!"
echo ""

echo "📝 Adicionando MELHOR_ENVIO_API_KEY..."
supabase secrets set --project-id $PROJECT_ID \
  MELHOR_ENVIO_API_KEY="sua-chave-do-melhor-envio-aqui"

echo "✅ MELHOR_ENVIO_API_KEY adicionado!"
echo ""
echo "⚠️  IMPORTANTE: Atualize a chave do Melhor Envio no Supabase Console:"
echo "   1. Vá para Project Settings → Edge Functions → Secrets"
echo "   2. Procure por MELHOR_ENVIO_API_KEY"
echo "   3. Atualize com sua chave real do Melhor Envio"
echo ""

# 2. Deploy functions
echo "📤 Fazendo deploy das Edge Functions..."
supabase functions deploy calculate-shipping --project-id $PROJECT_ID
supabase functions deploy create-payment --project-id $PROJECT_ID
supabase functions deploy payment-webhook --project-id $PROJECT_ID

echo ""
echo "✨ Tudo pronto!"
echo ""
echo "URLs das funções:"
echo "  - calculate-shipping: https://zdhqhwdxmrdwlgiqbnlj.functions.supabase.co/calculate-shipping"
echo "  - create-payment: https://zdhqhwdxmrdwlgiqbnlj.functions.supabase.co/create-payment"
echo "  - payment-webhook: https://zdhqhwdxmrdwlgiqbnlj.functions.supabase.co/payment-webhook"
