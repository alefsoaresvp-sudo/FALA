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
- **Fala:** leitura por voz, gravação e transcrição autenticada no backend quando disponível. Transcrição não é avaliação fonética.
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
```

5. No Supabase Dashboard, configure **Edge Function Secrets**:
   - `OPENAI_API_KEY`: chave nova, nunca a chave que foi exposta em uma conversa.
   - `OPENAI_MODEL`: `gpt-6-luna` (opcional; é o padrão do código).

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
