# Track Flow — mini app Zepp OS (Amazfit Bip 6)

App de relógio para marcar check-ins direto do pulso. O relógio fala com a
Edge Function `watch-api` do Supabase através do celular (lib ZML — o
`httpRequest` do relógio é encaminhado pelo app Zepp).

## Como funciona

- **Primeira abertura:** tela de pareamento. Gere um código em
  **Perfil → Relógio → Parear** no Track Flow web e digite os 6 dígitos
  (toque em cada dígito para mudar). O relógio troca o código por um token
  de dispositivo e o guarda localmente.
- **Uso diário:** lista dos hábitos de hoje com streak/meta; toque no botão
  da direita para marcar/desmarcar. Hábitos de "largar" mostram os dias
  livres e o botão registra recaída (✕).
- **Revogar:** Perfil → Relógio → ícone de lixeira. O relógio volta à tela
  de pareamento sozinho (recebe 401 e descarta o token).

## Instalação (modo desenvolvedor — seu relógio)

Pré-requisitos: Node.js no computador, app Zepp no celular logado na mesma
conta do relógio.

1. Crie a conta de desenvolvedor e ative o modo dev:
   [console.zepp.com](https://console.zepp.com) → registre-se; no app Zepp
   do celular: **Perfil → Configurações → Sobre → toque 7x no logo** para
   liberar o "Developer Mode".
2. Instale a CLI e crie um projeto-alvo para o Bip 6 (isso preenche o
   `deviceSource` correto do aparelho no `app.json`):

   ```sh
   npm i -g @zeppos/zeus-cli
   zeus create trackflow-watch   # escolha o template vazio e o alvo Bip 6
   ```

3. Copie os arquivos desta pasta por cima do projeto criado
   (`app.js`, `app.json`*, `page/`, `app-side/`, `utils/`, `assets/`,
   `package.json`) e rode `npm install` dentro dele.

   > \* Do `app.json` gerado pelo `zeus create`, preserve o `appId` (obtido
   > no console Zepp) e o bloco `platforms` (com o `deviceSource` real do
   > Bip 6); o restante pode vir do nosso arquivo.

4. Configure a URL da sua API em `utils/config.js`
   (`https://SEU-PROJETO.supabase.co/functions/v1/watch-api`).
5. Faça o deploy da função (uma vez): `supabase functions deploy watch-api
--no-verify-jwt` (o token de dispositivo faz a autenticação).
6. Teste: `zeus dev` abre o simulador; `zeus preview` gera um QR code —
   escaneie no app Zepp (Developer Mode) para instalar no relógio.

## Distribuição para outras pessoas

Publicação na loja da Zepp: `zeus build` gera o pacote e o envio é feito no
[console.zepp.com](https://console.zepp.com) (passa por review da Zepp).

## Ajustes esperados no primeiro teste

Este projeto foi escrito contra a API pública do Zepp OS 3+ (widgets
`@zos/ui`, `localStorage` de `@zos/storage`, `httpRequest` do ZML) sem
acesso a um simulador/aparelho. Se algo divergir na sua versão do SDK, os
pontos prováveis são os nomes de propriedades dos widgets em
`page/index.js` e a versão do `@zeppos/zml` no `package.json` — os erros
aparecem no console do `zeus dev`.
