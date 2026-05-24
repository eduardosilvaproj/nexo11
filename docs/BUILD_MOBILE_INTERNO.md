# Guia Técnico: Build e Distribuição Interna

## Preparação do Ambiente
```bash
# Instalar dependências
cd mobile
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Preencher EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Desenvolvimento Local
```bash
npx expo start
```
*Use o app "Expo Go" no seu celular para testar via QR Code.*

## Distribuição Interna (EAS Build)

### 🤖 Android (APK de Preview)
```bash
eas build --profile preview --platform android
```
*Este comando gera um link para download do APK que pode ser instalado diretamente no Android.*

### 🍎 iOS (TestFlight)
```bash
eas build --profile production --platform ios
```
*Certifique-se de que o `bundleIdentifier` está correto e você possui acesso ao Apple Developer Program.*

## Variáveis Obrigatórias (.env)
- `EXPO_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima (anon) para acesso ao banco via RLS.

## Validação de Notificações
1. Certifique-se de que o `projectId` em `app.json` corresponde ao seu projeto no Expo Dashboard.
2. No dashboard do Expo, utilize a ferramenta "Push Notification Tool" para testar o envio para um token específico registrado na tabela `device_tokens`.
