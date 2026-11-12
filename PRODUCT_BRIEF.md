# FALA — Product brief (working draft)

## Positioning

A practical English coach for Portuguese-speaking learners. The app starts by understanding what the learner needs to do in English, then creates short, adaptive practice loops that move from comprehension to production.

**Working name:** FALA English. Name, domain availability and trademark clearance are not yet validated.

## Initial target segment

Brazilian adults who have studied English before but struggle to use it in conversation, plus beginners who need a clear path. The first release should focus on one segment to keep lessons, prompts and measurement coherent:

**Primary hypothesis:** adults with basic or intermediate English who want more confidence speaking for work, travel and everyday situations.

This is a product hypothesis, not a proven market size or a validated customer segment. Validate with interviews and a small beta before expanding.

## User jobs to be done

1. When I need to speak English in a real situation, help me rehearse what I will say before I have to do it.
2. When I make a mistake, explain the most important correction so I can avoid repeating it.
3. When I have only 5–15 minutes, give me a useful activity I can finish.
4. When I forget vocabulary, bring it back at the right time and make me use it in context.
5. When I practice speaking, tell me what was understood and distinguish transcription quality from actual phonetic accuracy.

## Evidence reviewed

- A peer-reviewed study on learner experiences with mobile language apps and AI reported that learners can be dissatisfied when app activities do not match their desired skill, when explanations are unclear, and when speaking exercises are absent. Participants often described short study sessions. Source: https://journals.sagepub.com/doi/full/10.1177/00472395241238693
- A meta-analysis of 48 experiments (3,411 participants) found a medium-to-large effect of spaced practice on second-language learning, with longer spacing helping delayed retention more than shorter spacing. Source: https://onlinelibrary.wiley.com/doi/full/10.1111/lang.12479
- Duolingo has continued expanding AI-supported speaking and video-call practice. Source: https://blog.duolingo.com/product-highlights/
- Babbel documents speech recognition exercises that compare learner speech with a target phrase. Source: https://support.babbel.com/hc/pt-br/articles/19211305815570-Reconhecimento-de-fala
- ELSA's App Store listing describes AI conversation, pronunciation, stress and speaking practice. Source: https://apps.apple.com/br/app/elsa-speak-aprenda-ingl%C3%AAs/id1083804886
- Microsoft Azure Speech documents pronunciation scoring at phoneme, syllable, word and full-text levels, depending on locale and assessment mode. Source: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment

## Community signals (anecdotal, not representative research)

Public Reddit discussions from English learners repeatedly mention three practical expectations:

- The learner wants more than isolated word repetition: open-ended conversation, real-life role-play and feedback on what they actually said.
- Some learners combine separate tools for speaking, pronunciation, contextual vocabulary, writing and listening because no single app consistently covers all needs.
- Speech recognition that rejects understandable speech, fails to hear a microphone or marks a correct attempt as wrong damages trust and encourages learners to skip speaking tasks.

Examples: https://www.reddit.com/r/EnglishLearning/comments/1o14u8p/ai_apps_i_use_to_study_and_practice_english/ ; https://www.reddit.com/r/EnglishLearning/comments/1ng7hxo/apps_i_use_to_improve_my_english/ ; https://www.reddit.com/r/duolingo/comments/1vh0pms/the_speech_recognition_exercises_are_completely/ ; https://www.reddit.com/r/duolingo/comments/1l8thd9/the_speak_lessons_are_useless/

Product implication: do not automatically penalize an accent or a failed ASR result. Show the recognized transcript, permit replay/retry, allow the learner to report a mismatch, and separate "recognized words" from "pronunciation assessment".

## Product principles

- Start with user goals; do not force a generic course path.
- Put speaking and listening into the core loop, not behind a premium-looking side feature.
- Keep the default daily session short and useful; let advanced learners go deeper.
- Correct selectively: one important correction is better than overwhelming the learner.
- Explain grammar through the learner's own examples.
- Gamification should reinforce consistency, not become the reason to open the app.
- Never represent ASR transcript similarity as phoneme-level pronunciation accuracy.
- Show progress through observed performance, not vanity metrics.

## Proposed daily loop

1. **Recall (2 min):** retrieve a small number of due words/phrases.
2. **Learn (3 min):** one useful structure or phrase in context.
3. **Produce (3–5 min):** speaking, writing or role-play task related to the learner's goals.
4. **Feedback (1 min):** one correction, one strength and one next practice.

The exact timing is configurable and should be tested against completion and retention, not assumed to be optimal.

## MVP scope

### Include
- Onboarding: purpose, self-assessed level, target skills, time, accent preference and learning style.
- First-session diagnostic with short listening, vocabulary and speaking tasks.
- Daily learning plan with a single clear recommended next action.
- AI role-play with adjustable difficulty and context.
- Audio playback, voice capture and server-side transcription.
- Writing correction with explanations.
- Personal vocabulary notebook and spaced review schedule.
- Progress by skill, practice time and repeated error patterns.

### Defer
- Public leaderboards and social feeds.
- Avatars, animated characters and elaborate gamification.
- Full CEFR placement certification.
- Huge lesson library before usage data exists.
- Marketplace for human tutors.
- Multiple languages at launch.

## Product metrics to validate

- Activation: percentage of new users who complete onboarding and first practice.
- Time to value: time from signup to first useful spoken/written production.
- Speaking supply: number of meaningful learner speaking turns per active user per week.
- Habit: D1, D7 and D30 retention; sessions per active user per week.
- Learning signal: delayed recall of saved vocabulary and performance on repeated task types.
- Quality: percentage of AI feedback marked helpful; repeated-error rate over time.
- Economics: AI cost per weekly active user and per completed learning session.

Do not optimize total minutes alone; a long session can be inefficient. Learning and retention signals must accompany engagement metrics.

## Validation plan

1. Interview 10–15 target users about a recent real situation where English blocked them.
2. Ask what they currently use, what they abandoned and why; do not pitch FALA during the first half of the interview.
3. Test the onboarding prototype with 5 users and observe where they hesitate.
4. Run a 2-week beta with 20–30 users. Test whether they complete at least 3 practices per week and whether they report concrete improvement in one target task.
5. Review transcripts and corrections manually before adding more automated lesson generation.

## Competitive reading

- Duolingo: strong habit formation and broad course progression; FALA should not compete on game volume.
- Babbel: structured lessons, explanations and guided speech repetition; FALA should connect structured learning to open-ended production.
- Busuu: course structure and AI conversation scenarios; FALA should differentiate through the learner profile, error memory and coherent daily plan.
- ELSA Speak: pronunciation-centric feedback; FALA should provide pronunciation as one component in an integrated path covering speaking, listening, writing and vocabulary.

These are positioning observations from public product information, not a full product teardown or user satisfaction ranking.


## FALA 3.0 — desenho pedagógico e produto

### Módulos situacionais
A aplicação inclui trilhas para viagem/temporada no exterior, restaurantes e delivery, trabalho e carreira, conversas e novas amizades, compras e serviços, e carros/tecnologia. Cada módulo tem quatro microetapas que misturam compreensão, escrita e fala, seguidas de uma avaliação de transferência com cinco questões. A regra de 70% é um critério operacional de conclusão do módulo, não certificação de proficiência.

### Rotina diária
Três tarefas pequenas (ouvir/falar, resolver uma situação, produzir escrita/conversa) ocupam a meta diária escolhida. A meta é distribuída de acordo com o tempo disponível. A repetição espaçada e a recuperação ativa são estratégias úteis; o conteúdo deve voltar em outros contextos, em vez de apenas repetir o mesmo exercício.

### Music Lab
O primeiro laboratório usa versos originais curtos que variam por interesse, leitura linha a linha, tradução, vocabulário e completar lacunas. A voz do navegador é síntese de fala, não performance musical. O produto não deve avaliar afinação ou “nota de canto” sem uma tecnologia especificamente validada para isso. Canções comerciais só devem ser incorporadas com direitos/uso autorizado; o MVP usa conteúdo original próprio.

### Escrita por imagem
O aluno pode fotografar uma página/caderno. A imagem é reduzida no navegador e enviada para a Edge Function autenticada; a Lumi transcreve o texto visível, sinaliza palavras ilegíveis e corrige até três pontos importantes. A foto não é persistida no banco pelo MVP. Fotos desfocadas, mal iluminadas, inclinadas ou com letra muito pequena devem ser tratadas como fonte de incerteza.

### Limites da versão
- A análise avançada de fonemas e avaliação de canto continuam fora do escopo atual. O reconhecimento/transcrição não mede precisão fonética.
- O Music Lab atual é prática guiada com texto original e fala sintetizada; ainda não é um player de faixas musicais.
- Login, sincronização, funções de IA e análise de imagem dependem do projeto Supabase dedicado, variáveis públicas de conexão e secrets configurados no backend.
- Os módulos e as mini provas são uma primeira biblioteca curada; a etapa seguinte deverá incluir testes adaptativos com justificativas, revisão de erros e repetição espaçada por palavra/estrutura.
