# Paca Finance — TODO (pendências)

> Atualizado em 2026-06-24. Substitui a lista antiga de "features adiadas".
> Código da monetização (M1–M4) + login social web está na branch **`feat/monetization`** (typecheck verde, 7 commits). **Backend já está no ar.**

## ✅ Já feito (não precisa mexer)
- **Banco**: 21 migrations aplicadas no projeto `gtumyiwokhroizmqcbve` (base 00001–00017 + `subscriptions`, `partner_offers`, `partner_offer_clicks`, `push_tokens`).
- **Edge functions deployadas**: `scan-receipt`, `scan-statement`, `advise-purchase`, `check-budgets`, `revenuecat-webhook`.
- **Secrets setados**: `GEMINI_API_KEY` (chave real), `REVENUECAT_WEBHOOK_SECRET`.
- **Código pronto**: cota de IA por casal (10 scans + 3 conselhos/mês, bypass Premium), paywall + gates (scan/advisor/multimoeda), webhook RC, aba Recomendações (mobile+web), push groundwork, **login Google/Apple no web**.
- Reset de senha, deleção de conta, páginas legais, privacy manifest — já feitos (trabalho de readiness, na `main`).

---

## 🔴 1. Para testar AGORA (rápido)
- [ ] **Desligar "Confirm email"** no Supabase (senão signup não loga): Auth → Providers → **Email** → desliga "Confirm email" → Save. https://supabase.com/dashboard/project/gtumyiwokhroizmqcbve/auth/providers
- [ ] **Login Google (web)** — terminar config (já comecei):
  - Google Cloud (projeto **paca** = ID `gen-lang-client-0168316998`): consent screen (External) + criar **OAuth client (Web)** com redirect URI `https://gtumyiwokhroizmqcbve.supabase.co/auth/v1/callback` → copiar Client ID/Secret.
  - Supabase → Auth → Providers → **Google**: Enable + colar Client ID/Secret.
  - Supabase → Auth → **URL Configuration** → Redirect URLs: adicionar `http://localhost:5173` (e o domínio de prod depois).
  - Adicionar `madualvesfr@gmail.com` em **Audience → Test users** (app fica em "Testing").
- [ ] Rodar `npm run dev:web` e validar: criar conta / login Google, aba **Recomendações**, gate de multimoeda no Perfil.

## 🟠 2. RevenueCat + Lojas (M1 — habilita a assinatura de verdade)
- [ ] **Conta RevenueCat** + linkar App Store Connect e Play.
- [ ] **Produtos**: mensal **R$ 24,90**, anual **R$ 179,90**, ambos com **trial 7 dias**; entitlement `premium`.
- [ ] **Webhook RC** → URL `https://gtumyiwokhroizmqcbve.functions.supabase.co/revenuecat-webhook`, header **Authorization** = `efed32dce386b7bf1f78703f4c6a6274549968effa2d85cbb5498fe062691efb` (o `REVENUECAT_WEBHOOK_SECRET`).
- [ ] Pegar **API keys do RC** (iOS/Android) pro app.
- [ ] **Lojas**: criar os produtos de **assinatura** no App Store Connect + Play Console (precisa de Apple Developer $99 + Play $25 + contrato pago + banking/tax).

## 🟡 3. App mobile (build + ligações que faltam)
- [ ] `npx expo install react-native-purchases expo-notifications` → **dev build** (não roda no Expo Go).
- [ ] **Billing**: seguir o snippet comentado em `apps/mobile/lib/billing.ts` (configurar RC com `appUserID: coupleId` + `purchasePackage`).
- [ ] **Push (cliente)**: no `_layout`, pedir permissão + `getExpoPushTokenAsync()` → chamar `useUpdatePushToken()` (já pronto no `@paca/api`).
- [ ] **Login social no mobile**: fluxo OAuth com `expo-web-browser`/`expo-auth-session` (web já está pronto; mobile falta).
- [ ] iPad: produzir screenshots 2048×2732 + ajustar layout (decisão de manter `supportsTablet:true`).

## 🟢 4. M3 Push — o que falta
- [ ] **Agendar `check-budgets`** (pg_cron ou Scheduled Function do Supabase) — hoje não dispara sozinho.
- [ ] Push de "parceiro adicionou transação" (trigger) — opcional.
- [ ] Localizar as mensagens de push (hoje em PT hardcoded no `check-budgets`).

## ⚪ 5. M2 Medição (atribuição)
- [ ] **RevenueCat → Meta CAPI** (config no dashboard do RC) pra eventos de assinatura com valor BRL — **sem SDK no app** (decisão D4, mantém "sem tracking").
- [ ] Analytics básico (eventos-chave).

## ⚪ 6. M4 Ofertas — conteúdo
- [ ] Popular `partner_offers` com parceiros reais + URLs de afiliado (template de INSERT comentado na migration `00020`). A aba fica vazia até ter dados.

## 🔧 7. Dívidas técnicas / polish
- [ ] **Teto de gasto no Gemini** (Google Cloud → billing budget) pra não tomar susto.
- [ ] Rate limit no `translate-category` (precisa de valor `translate` no enum — migration nova).
- [ ] Copy "Type DELETE" da deleção de conta (texto promete um campo que não existe).
- [ ] Email do perfil aparece como "..." em vez do email real.
- [ ] `accessibilityLabel` nos ~175 botões de ícone (VoiceOver/TalkBack).
- [ ] Crash reporting (Sentry) — OU manter sem (já removi a declaração de CrashData do manifest).
- [ ] "R$" hardcoded no `scan.tsx` (usar formatCurrency).
- [ ] Login com Apple (web): precisa de Service ID + chave no Apple Developer.

## 📦 8. Submissão nas lojas
- [ ] Ver **`SUBMISSION.md`** (na raiz) — checklist completo: screenshots (iPhone + iPad), copy da listing (PT+EN pronta), demo account, formulários de privacidade (Apple App Privacy + Google Data Safety), content rating.

## 🌿 9. Git / deploy
- [ ] Push da branch **`feat/monetization`** + abrir PR + merge na `main` (7 commits: M1.1–M1.4, M4, M3 groundwork, login social web).
- [ ] Web deploya do `main` (Vercel) — conferir após o merge.

---

## (Backlog antigo — status)
- ✅ Esqueci minha senha — feito (readiness).
- ⏳ Confirmação de email — decisão: manter **OFF** (ver item 1).
- ⏳ Login com Apple — web pronto (falta config), mobile pendente (item 3).
- [ ] Onboarding tour — adiado.
- ⏳ Notificações push — groundwork feito; falta cliente + agendamento (itens 3 e 4).
- [ ] PWA / Offline support — adiado.
