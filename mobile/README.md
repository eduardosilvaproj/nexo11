# NEXO Operacional (Mobile)

App único iOS/Android para a equipe operacional do NEXO. Compartilha o mesmo backend (Lovable Cloud / Supabase), RLS e permissões do sistema web.

## Estrutura

```
/mobile
  App.tsx
  app.json              # Config Expo (nome, bundle id, splash)
  package.json
  src/
    lib/supabase.ts     # Cliente Supabase (mesmo projeto do web)
    hooks/useAuth.tsx   # Sessão, perfil, loja
    constants/perfis.ts # Espelha src/lib/permissions.ts
    navigation/         # Stack + Tabs
    screens/            # Login, Home, Agenda, Tarefas, Notificações
```

## Como rodar localmente

```bash
cd mobile
npm install        # ou bun install
npx expo start     # abre Expo Go (QR Code para iOS/Android)
```

Para builds nativos use EAS:
```bash
npx eas build -p ios
npx eas build -p android
```

## Fase 1 (entregue)
- Login Supabase Auth
- Carregamento de profile (nome, perfil, loja_id)
- Home dinâmica por perfil
- Agenda do dia/semana (montagens + entregas, via RLS)
- Notificações
- Esqueleto de Tarefas

## Próximas fases
- Fase 1+: módulos por perfil (medições, separações, entregas, montagens, chamados), upload de fotos, assinatura
- Fase 2: vendedor (vendas/clientes/follow-up) e gerente (indicadores)
- Fase 3: chat interno e comunicados

## Segurança
- Usa apenas a `anon key` + sessão do usuário (RLS faz o resto).
- Nunca usar `service_role` no app.
- Fotos/assinaturas em buckets **privados** do storage.
- Permissões espelhadas em `src/constants/perfis.ts` — alterações relevantes do `src/lib/permissions.ts` (web) devem ser refletidas aqui.
