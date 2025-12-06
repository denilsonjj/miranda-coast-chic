# ✅ SETUP NOVO PROJETO SUPABASE - RESUMO

## 📌 O Que Foi Feito

### ✨ **Arquivos Criados:**

1. **`.env.local`** - Variáveis de ambiente do frontend
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_MERCADO_PAGO_PUBLIC_KEY

2. **`SETUP_DATABASE.sql`** - Script completo para criar banco
   - Tabelas (profiles, products, orders, etc)
   - RLS Policies (segurança)
   - Triggers e Indexes
   - Funções (has_role, update_updated_at)

3. **`SETUP_GUIDE.md`** - Guia passo-a-passo (LEIA ISSO!)
   - Como executar o SQL
   - Como criar buckets
   - Como criar admin user
   - Como deployar functions

4. **`setup_functions.sh`** - Script bash para deploy (opcional)

5. **`.env.supabase`** - Credenciais backend (GUARDAR BEM!)

---

## 🎯 PRÓXIMOS PASSOS (ORDEM IMPORTANTE!)

### 1️⃣ **Executar SQL (15 min)**
- Copie `SETUP_DATABASE.sql`
- Acesse Supabase Console → SQL Editor
- Cole e execute

### 2️⃣ **Criar Buckets (5 min)**
- Storage → New bucket
- `products` (public)
- `announcements` (public)

### 3️⃣ **Criar Admin User (5 min)**
- Authentication → Add user
- Execute INSERT em user_roles

### 4️⃣ **Deploy Functions (10 min) - OPCIONAL AGORA**
```bash
bash setup_functions.sh
```

---

## 🔐 Credenciais Armazenadas

| Tipo | Uso | Arquivo |
|------|-----|---------|
| **ANON_KEY** | Frontend | `.env.local` ✅ |
| **SERVICE_ROLE** | Setup apenas | `.env.supabase` 🔒 |
| **MERCADO_PAGO_PUBLIC** | Frontend | `.env.local` ✅ |
| **MERCADO_PAGO_SECRET** | Backend | Supabase Secrets 🔒 |

---

## 📊 Estrutura do Banco

```
├── user_roles (admin/user)
├── profiles (dados do usuário)
├── addresses (endereços)
├── products (catálogo)
├── cart_items (carrinho)
├── orders (pedidos)
├── order_items (itens do pedido)
└── announcements (banners/promoções)
```

Tudo com RLS habilitado e policies de segurança!

---

## ✅ Testes

Depois de tudo configurado, teste:

1. **Registre-se** no app
2. **Faça login com admin**
3. **Vá ao painel admin** (/admin)
4. **Crie um produto**
5. **Adicione ao carrinho**
6. **Faça checkout**

Se tudo funcionar = **SUCESSO!** 🎉

---

## 🆘 Troubleshooting

| Erro | Solução |
|------|---------|
| RLS policy error | Verifique user_roles se você é admin |
| Bucket not found | Crie buckets públicos |
| Function 404 | Deploy functions com `setup_functions.sh` |
| Payment error | Verifique MERCADO_PAGO_ACCESS_TOKEN nos secrets |

---

## 📞 Dados da Sua Conta

**Supabase:**
- URL: https://zdhqhwdxmrdwlgiqbnlj.supabase.co
- Project ID: zdhqhwdxmrdwlgiqbnlj

**Mercado Pago (Teste):**
- Public Key: TEST-28081cf6-654c-4db4-9a70-c9941984a102
- Access Token: TEST-1039516564010757-120413-510a017c91b8d1e3fa7eba2817e95f05-1183620218

---

**Tudo pronto! Qualquer dúvida, é só chamar!** 🚀
