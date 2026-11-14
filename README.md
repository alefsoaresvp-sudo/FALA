# FALA English — Lumi, tutora virtual de inglês

O FALA é um ambiente de aprendizagem de inglês com uma tutora virtual chamada Lumi. A aplicação combina prática guiada, trilhas, conversa, escrita, fala, vocabulário e acompanhamento de progresso.

## O que existe no frontend v2

- **Acesso demo-first:** o conteúdo básico abre sem cadastro; autenticação Supabase é opcional para sincronizar dados e acessar funções de IA.
- **Perfil completo:** objetivo, nível estimado, interesses, habilidades prioritárias, dificuldades, contexto de uso, prazo, minutos por dia, sotaque e estilo de correção.
- **Lumi por texto:** conversa contextual, correção curta e explicações em português quando necessário. Requer login e a Edge Function `tutor`.
- **Lumi por voz:** personagem de voz com conversa em tempo real via ElevenLabs Conversational AI e WebRTC. Requer login, microfone, HTTPS e a Edge Function `lumi-session`.
- **Plano adaptativo:** geração e salvamento do plano individual na tabela `learning_plans`. A geração com IA exige login e `OPENAI_API_KEY`.
- **Aprender:** microlições introdutórias com expressão-chave, tradução, alternativas e feedback.
- **Trilhas:** seis trilhas com situações práticas, etapas sequenciais e mini prova final. A aprovação exige 70%. O progresso usa `track_progress`.
- **Music Lab:** versos originais do FALA, vocabulário, tradução, leitura por voz e recuperação ativa. A voz das linhas usa Speech Synthesis do navegador; não é áudio cantado.
- **Escrita:** revisão de texto com a Lumi e envio opcional de foto de exercício, com compressão no navegador antes do envio.
- **Fala:** gravação local, reprodução e transcrição autenticada via ElevenLabs Scribe.
- **Vocabulário e progresso:** caderno de palavras, histórico de sessões e média dos resultados registrados.
- **Mobile:** layout responsivo, dock inferior e menu expandido no celular.

## Limites entre modo demo e conta conectada

Sem login, o aluno pode explorar as telas, fazer exercícios locais, ouvir frases pela voz do navegador e manter dados locais neste aparelho. O modo demo não finge que respostas heurísticas são IA.

Login é necessário para sincronização entre dispositivos, conversa real com a Lumi, sessão de voz, transcrição com Scribe, análise de escrita por IA, avaliação aberta das etapas de trilhas, análise de foto e plano adaptativo.

As chamadas de IA dependem das quotas e condições de cobrança dos provedores. O código não promete uso ilimitado ou gratuito. A interface deve manter as tarefas locais acessíveis quando um provedor estiver indisponível.

## Arquitetura

- Frontend: React 19, TypeScript, Vite.
- Auth e dados: Supabase Auth, Postgres, RLS.
- Chat, plano, avaliação de texto/foto: OpenAI Responses API, dentro da Edge Function autenticada `tutor`.
- Voz em tempo real: ElevenLabs Conversational AI, agente `Lumi — FALA English`, via `lumi-session`.
- Transcrição de áudio gravado: ElevenLabs Speech to Text Scribe v2, via `transcribe`.
- Publicação: GitHub Actions + GitHub Pages.

## Secrets do Supabase

Cadastre em **Project → Edge Functions → Secrets**. Não coloque chaves privadas no repositório, no Vite, no navegador ou em variáveis `VITE_*`.

| Secret | Uso |
|---|---|
| `ELEVENLABS_API_KEY` | Geração de token para conversa por voz e transcrição Scribe |
| `OPENAI_API_KEY` | Chat textual, plano adaptativo, avaliações, revisão de texto e análise de foto |
| `OPENAI_MODEL` | Opcional; padrão atual do código: `gpt-6-luna` |

A chave ElevenLabs precisa ter permissão para Conversational AI e Speech to Text. A Edge Function valida JWT e retorna apenas tokens efêmeros de sessão para o cliente. A chave persistente nunca sai do backend.

## Executar localmente

Requisitos: Node.js 20.19+ ou 22.12+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:5173`. As funções do Supabase precisam estar implantadas e os secrets definidos para as experiências conectadas.

## Supabase

As tabelas existentes são mantidas, sem migrações destrutivas:

- `profiles`
- `learning_plans`
- `learning_sessions`
- `track_progress`
- `activity_attempts`
- `learner_insights`
- `vocabulary_items`
- `chat_messages`

RLS deve permanecer habilitado em todas as tabelas expostas. Não remova contas, histórico ou dados existentes.

Edge Functions:
- `tutor` — JWT obrigatório; usa `OPENAI_API_KEY`.
- `transcribe` — JWT obrigatório; usa `ELEVENLABS_API_KEY` e Scribe v2.
- `lumi-session` — JWT obrigatório; emite token temporário para o agente Conversational AI.

## GitHub Pages

O repositório usa GitHub Actions para compilar Vite e publicar a pasta `dist`. A URL configurada é:

https://alefsoaresvp-sudo.github.io/FALA/

As variáveis públicas do Supabase usadas no build são `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. A publishable key é pública por desenho e deve ser protegida por RLS e permissões mínimas.

## Segurança, privacidade e limitações

- Nenhuma chave privada pode ser incluída no bundle do frontend.
- Voz e transcrição exigem autenticação; áudio de fala gravada não é salvo em Storage pelo app.
- O agente de voz está configurado para não gravar áudio e excluir o áudio de conversas; transcrições seguem a retenção configurada na ElevenLabs.
- A transcrição reconhece palavras, mas não fornece avaliação fonética ou pontuação de pronúncia.
- A análise de foto exige login e uma função `tutor` funcional; a imagem é comprimida no navegador e enviada ao backend, sem persistência em Storage.
- O modo demo mantém progresso local e não substitui sincronização entre dispositivos.
- Uma compilação bem-sucedida não substitui teste real de login, microfone e chamadas a provedores externos.
