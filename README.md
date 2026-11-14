# FALA English — Lumi adaptive tutor

O FALA é uma plataforma de inglês orientada por objetivos, interesses e evidências de aprendizagem. A Lumi é a tutora virtual: conversa com o aluno, corrige erros relevantes, cria atividades contextualizadas e adapta as próximas etapas a partir do histórico disponível.

## Produto nesta versão

- **Onboarding em 6 etapas:** objetivo, nível percebido, interesses, dificuldades, situação real de uso, disponibilidade, sotaque e preferência de feedback.
- **Perfil individual:** dados do aluno enviados junto às chamadas do tutor e armazenados na conta autenticada.
- **Lumi conversacional:** diálogo em inglês no nível estimado, com explicações pontuais em português e correção de no máximo um erro importante por turno.
- **Trilha de aprendizagem:** plano estruturado com foco atual, etapas, prática sugerida e critério de sucesso.
- **Atividade adaptativa:** microatividade criada com base nos interesses, objetivo, barreiras e histórico de tentativas.
- **Sinais de aprendizagem:** observações da IA são registradas como hipóteses com confiança estimada; a Lumi deve confirmá-las com evidências, não tratar um erro isolado como diagnóstico.
- **Escrita:** revisão contextual, versão mais natural, explicações e tarefa de reescrita.
- **Fala:** leitura por voz, gravação e transcrição autenticada no backend quando disponível. Transcrição não é avaliação fonética. Nas etapas de fala das trilhas há opção de digitar quando o microfone não estiver disponível.
- **Vocabulário e progresso:** palavras, sessões, tentativas, histórico de conversa, indicadores por habilidade e atividade semanal.
- **Mobile/PWA:** interface responsiva, navegação inferior em telas pequenas e suporte para instalação no celular/offline shell.

## Rodar localmente

Requisitos: Node.js 20.19+ ou 22.12+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:5173`. Sem credenciais do Supabase, o frontend exibe uma experiência de demonstração. O tutor com IA e a sincronização entre dispositivos exigem uma sessão autenticada e as funções de backend implantadas.

## Configuração do Supabase

1. Crie um projeto Supabase dedicado ao FALA.
2. Execute o conteúdo de `supabase/schema.sql` no SQL Editor do projeto. Todas as tabelas têm RLS e políticas que restringem as linhas ao `auth.uid()` do usuário.
3. Copie a Project URL e a publishable key para `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

4. Faça login no CLI e vincule o projeto. Consulte os comandos suportados pela versão instalada antes de executar:

```bash
supabase --help
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy tutor
supabase functions deploy transcribe
supabase functions deploy lumi-session
```

5. No Supabase Dashboard, configure **Edge Function Secrets**:
   - `OPENAI_API_KEY`: chave nova, nunca a chave que foi exposta em uma conversa.
   - `OPENAI_MODEL`: `gpt-6-luna` (opcional; é o padrão do código).
   - `ELEVENLABS_API_KEY`: chave da ElevenLabs usada apenas pela função `lumi-session` para emitir tokens temporários de conversa por voz. Nunca use `VITE_ELEVENLABS_API_KEY` nem coloque essa chave no navegador.

A chave OpenAI existe somente no backend. Nunca use `VITE_OPENAI_API_KEY`, `service_role` ou qualquer chave secreta no navegador.

6. Em Supabase Auth, configure cadastro/login por e-mail e as URLs de redirecionamento para `https://alefsoaresvp-sudo.github.io/FALA/` e `http://localhost:5173/`.
7. Verifique os advisors de segurança e teste as políticas RLS com duas contas diferentes antes de abrir o app a outras pessoas.

## Publicação no GitHub Pages

O repositório usa GitHub Actions para compilar Vite e publicar a pasta `dist`.

1. No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como Source.
2. Em **Settings → Secrets and variables → Actions → Variables**, cadastre:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Faça push na branch `main` ou execute manualmente o workflow **Deploy FALA English** na aba Actions.
4. A URL publicada será `https://alefsoaresvp-sudo.github.io/FALA/`.

A publishable key é pública por desenho e só pode ser usada com RLS e grants mínimos. A OpenAI API key permanece nos Edge Function Secrets do Supabase.

## Instalar no celular

Abra o endereço publicado no Chrome/Edge do celular e use **Instalar app** ou **Adicionar à tela inicial** no menu do navegador. O shell da aplicação tem cache offline; chamadas de IA e dados sincronizados exigem internet.

## Arquitetura

- Frontend: React 19 + TypeScript + Vite.
- Dados e autenticação: Supabase Auth + Postgres + RLS.
- Tutor: OpenAI Responses API dentro de uma Supabase Edge Function autenticada.
- Lumi por voz: agente Conversational AI da ElevenLabs com WebRTC e token emitido pela Edge Function autenticada `lumi-session`; a chave persistente fica somente nos secrets do Supabase.
- Transcrição: `gpt-transcribe` dentro de uma Supabase Edge Function autenticada.
- Fonte e publicação: GitHub + GitHub Actions + GitHub Pages.

## Limitações honestas do MVP

- A pontuação de habilidade só se torna confiável com um histórico maior de tentativas. Poucas respostas não são uma avaliação formal de proficiência.
- A transcrição identifica palavras, mas não mede fonemas, ritmo, entonação ou inteligibilidade. A avaliação fonética específica precisa de um serviço dedicado e validação por sotaque.
- A revisão de escrita usa IA quando o usuário está autenticado e a função está configurada; sem backend, há apenas experiência de demonstração.
- O cache PWA cobre o shell. O uso de IA, login e banco exige conexão.
- Antes de produção: adicionar limites/rate limits por usuário, controles de gasto, telemetria consentida, tratamento de abuso, testes automatizados e política de privacidade/termos.

## Segurança e dados

- Nunca commitar `.env.local`, chaves privadas, tokens, áudios ou dados de usuários.
- RLS está ligado em todas as tabelas de aprendizagem; as políticas filtram `user_id` pela sessão autenticada.
- A aplicação não persiste gravações de voz por padrão; envia o blob para transcrição e registra apenas uma transcrição curta nos detalhes da sessão.
- Observações geradas pela IA são hipóteses para orientar prática, não rótulos permanentes do aluno.


## Ativar a versão conectada

1. Crie um projeto Supabase dedicado ao FALA e execute `supabase/schema.sql` nele. O script cria o estado de módulos em `track_progress` com RLS por proprietário.
2. Implante as Edge Functions `tutor` e `transcribe`, mantendo a verificação de JWT habilitada.
3. Cadastre `OPENAI_API_KEY` e, opcionalmente, `OPENAI_MODEL` como secrets das Edge Functions. Nunca coloque a chave privada no Vite, no GitHub Pages ou em `VITE_*`.
4. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` como variáveis do GitHub Actions para o build publicado. Para desenvolvimento local, use `.env.local`.
5. Em Authentication, configure o endereço do site publicado e os redirects permitidos.

A análise de foto exige autenticação válida, Edge Function implantada e suporte a entrada de imagem do modelo configurado. O navegador comprime a imagem, envia-a diretamente para a Edge Function e não salva o arquivo enviado. A qualidade da transcrição depende de foco, iluminação, rotação e tamanho da letra.

O progresso local funciona sem login no próprio navegador. Para sincronizar entre dispositivos, é necessário concluir a integração do Supabase e aplicar o esquema desta versão.


## FALA 4.0 — áudio mobile e organização

### Gravação no celular
- A captura usa `getUserMedia` e `MediaRecorder` sempre que o navegador oferece suporte, independentemente do login.
- A gravação é limitada a 45 segundos e usa cancelamento de eco, redução de ruído e ganho automático quando suportados pelo aparelho.
- O aluno pode reproduzir o arquivo gravado no próprio dispositivo. A transcrição com a Lumi exige uma sessão Supabase autenticada e a Edge Function `transcribe` ativa.
- O código tenta WEBM/Opus e MP4, comuns em navegadores móveis. Tipos e extensões são normalizados no backend antes de enviar ao provedor.
- O arquivo de áudio não é persistido no banco ou em Storage. A sessão registra apenas o texto transcrito e metadados mínimos.
- O microfone do navegador exige HTTPS e permissão. Abra o endereço do GitHub Pages no Chrome/Safari atualizado, não dentro de um navegador incorporado, e permita o acesso ao microfone nas configurações do site.

### Modelo de dados para reutilização
O banco do FALA é dividido logicamente em:
- **Identidade e preferências:** `profiles`.
- **Planejamento e progresso:** `learning_plans`, `learning_sessions`, `track_progress`.
- **Avaliação e adaptação:** `activity_attempts`, `learner_insights`.
- **Conteúdo do aluno:** `vocabulary_items`.
- **Conversas:** `chat_messages`.

Todas as tabelas expostas em `public` têm RLS e políticas por `auth.uid()`. Consulte `supabase/DATABASE_ARCHITECTURE.md` antes de copiar ou adaptar o modelo para outro produto. Para sistemas independentes, crie outro projeto Supabase e aplique o esquema nele; não misture dados de produtos diferentes no projeto de produção do FALA.
