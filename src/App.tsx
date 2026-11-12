import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, AudioLines, Award, BookOpen, Bookmark, BriefcaseBusiness,
  Camera, Car, Check, CheckCheck, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, Flame, Headphones, Home, Languages, Lightbulb,
  LockKeyhole, Map, MessageCircle, Mic, MicOff, Moon, Music2, PlayCircle, Plus,
  RotateCcw, Send, Settings2, ShoppingBag, Sparkles, Sun, Target, Trophy, Utensils,
  Users, Volume2, WandSparkles, X,
} from 'lucide-react'
import { supabase } from './supabase'

type Goal = 'work' | 'travel' | 'conversation' | 'study' | 'life'
type Level = 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'unsure'
type Focus = 'speaking' | 'listening' | 'pronunciation' | 'writing' | 'vocabulary' | 'grammar'
type Profile = {
  name: string
  goal: Goal
  level: Level
  focuses: Focus[]
  minutes: number
  accent: 'us' | 'uk'
  style: 'conversation' | 'guided' | 'mixed'
  interests: string[]
  customInterest: string
  barriers: string[]
  scenario: string
  timeHorizon: string
  feedbackStyle: 'gentle' | 'balanced' | 'direct'
}

type LearnerStats = { totalMinutes: number; totalSessions: number; activeDays: number; skillScores: Record<string, number>; weeklyMinutes: number[] }
type LearningPlan = { headline: string; today: string; focus_order: string[]; weeks: { period: string; objective: string; practice: string }[]; success_metric: string; adaptation_note: string }
type LearnerInsight = { id?: string; skill: string; observation: string; recommendation: string; confidence: number; created_at?: string }

type PersonalizedActivity = {
  activity_type?: 'multiple_choice' | 'complete_sentence' | 'roleplay' | 'translation'
  title: string
  skill: string
  context: string
  target_phrase: string
  translation: string
  explanation: string
  question: string
  options: string[]
  correct_index: number
  feedback: string
  input_hint?: string
  expected_answer?: string
}

type ActivityEvaluation = { score: number; is_acceptable: boolean; improved_answer: string; correction: string; strengths: string; next_step: string }

type Page = 'home' | 'tracks' | 'learn' | 'speak' | 'write' | 'music' | 'vocabulary' | 'progress'
type ChatMessage = { role: 'assistant' | 'user'; text: string; note?: string }

const profileKey = 'fala-profile-v2'
const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'tracks', label: 'Trilhas', icon: Map },
  { id: 'learn', label: 'Aprender', icon: BookOpen },
  { id: 'speak', label: 'Falar', icon: AudioLines },
  { id: 'write', label: 'Escrever', icon: Languages },
  { id: 'music', label: 'Música', icon: Music2 },
  { id: 'vocabulary', label: 'Vocabulário', icon: Bookmark },
  { id: 'progress', label: 'Progresso', icon: Award },
]

const goalOptions: { id: Goal; title: string; detail: string; emoji: string }[] = [
  { id: 'work', title: 'Trabalho e carreira', detail: 'Reuniões, entrevistas e clientes', emoji: '↗' },
  { id: 'travel', title: 'Viagens', detail: 'Aeroporto, hotel e situações reais', emoji: '✈' },
  { id: 'conversation', title: 'Conversar com confiança', detail: 'Falar sem travar no dia a dia', emoji: '◉' },
  { id: 'study', title: 'Estudos e provas', detail: 'Cursos, exames e leitura', emoji: '▤' },
  { id: 'life', title: 'Um pouco de tudo', detail: 'Quero usar inglês na minha vida', emoji: '✳' },
]
const focusOptions: { id: Focus; title: string; detail: string }[] = [
  { id: 'speaking', title: 'Falar', detail: 'Montar frases e conversar' },
  { id: 'listening', title: 'Entender', detail: 'Compreender o inglês falado' },
  { id: 'pronunciation', title: 'Pronúncia', detail: 'Falar com mais clareza' },
  { id: 'writing', title: 'Escrever', detail: 'Criar frases e textos' },
  { id: 'vocabulary', title: 'Vocabulário', detail: 'Aprender palavras úteis' },
  { id: 'grammar', title: 'Gramática', detail: 'Entender como as frases funcionam' },
]
const levelLabels: Record<Level, string> = {
  beginner: 'Começando do zero', basic: 'Sei algumas palavras e frases',
  intermediate: 'Consigo me virar, mas erro bastante', advanced: 'Consigo conversar, quero evoluir', unsure: 'Não sei meu nível ainda',
}
const initialMessages: ChatMessage[] = [
  { role: 'assistant', text: 'Oi! Eu sou a Lumi, sua parceira de inglês. Vamos conversar sem pressão. I will help you one step at a time. What do you enjoy doing in your free time?' },
]

function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(profileKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      name: parsed.name ?? '', goal: parsed.goal ?? 'conversation', level: parsed.level ?? 'unsure',
      focuses: parsed.focuses ?? ['speaking', 'listening'], minutes: parsed.minutes ?? 10,
      accent: parsed.accent ?? 'us', style: parsed.style ?? 'mixed', interests: parsed.interests ?? [],
      customInterest: parsed.customInterest ?? '', barriers: parsed.barriers ?? [], scenario: parsed.scenario ?? 'daily',
      timeHorizon: parsed.timeHorizon ?? 'flexible', feedbackStyle: parsed.feedbackStyle ?? 'balanced',
    }
  } catch { return null }
}
function speakText(text: string, accent: 'us' | 'uk' = 'us', rate = 0.88) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US'
  utterance.rate = Math.max(0.55, Math.min(1.15, rate))
  window.speechSynthesis.speak(utterance)
}
function greetingName(name: string) { return name.trim() ? name.trim().split(' ')[0] : 'estudante' }

const interestOptions = [
  { id: 'cars', title: 'Carros e automobilismo', emoji: '🏎️' },
  { id: 'technology', title: 'Tecnologia e IA', emoji: '💻' },
  { id: 'games', title: 'Games', emoji: '🎮' },
  { id: 'films', title: 'Filmes e séries', emoji: '🎬' },
  { id: 'music', title: 'Música', emoji: '🎧' },
  { id: 'sports', title: 'Esportes', emoji: '⚽' },
  { id: 'business', title: 'Negócios e dinheiro', emoji: '📈' },
  { id: 'travel', title: 'Viagens e culturas', emoji: '✈️' },
  { id: 'food', title: 'Comida e culinária', emoji: '🍜' },
  { id: 'fitness', title: 'Saúde e treino', emoji: '🏋️' },
  { id: 'science', title: 'Ciência e curiosidades', emoji: '🔬' },
  { id: 'fashion', title: 'Moda e lifestyle', emoji: '👟' },
]
const barrierOptions = [
  { id: 'freeze', title: 'Eu travo quando preciso falar' },
  { id: 'translate', title: 'Penso em português antes de falar' },
  { id: 'vocabulary', title: 'Falta vocabulário na hora' },
  { id: 'listening', title: 'Entendo pouco quando escuto' },
  { id: 'pronunciation', title: 'Tenho vergonha da pronúncia' },
  { id: 'grammar', title: 'Sei palavras, mas não monto frases' },
]
const scenarioOptions = [
  { id: 'travel', title: 'Viajar e passar uma temporada fora', detail: 'Aeroporto, hotel, aluguel, compras e imprevistos', emoji: '🧳' },
  { id: 'work', title: 'Trabalho e negócios', detail: 'Reuniões, clientes, entrevistas e apresentações', emoji: '💼' },
  { id: 'relocation', title: 'Morar fora', detail: 'Casa, documentos, serviços e vida cotidiana', emoji: '🏡' },
  { id: 'study', title: 'Estudar e fazer provas', detail: 'Aulas, leitura, exames e apresentações', emoji: '📚' },
  { id: 'social', title: 'Fazer amizades e conversar', detail: 'Conhecer pessoas e manter conversas naturais', emoji: '🗣️' },
  { id: 'general', title: 'Evoluir por interesse pessoal', detail: 'Entender conteúdo e consumir inglês sem depender de tradução', emoji: '🌎' },
]

type TrackKind = 'choice' | 'write' | 'speak'
type TrackLesson = {
  title: string
  kind: TrackKind
  scenario: string
  target_phrase: string
  translation: string
  question: string
  options?: string[]
  correct_index?: number
  input_hint?: string
  expected_answer?: string
}
type TrackQuestion = { question: string; options: string[]; correct_index: number; explanation: string }
type LearningTrack = {
  id: string
  title: string
  category: string
  description: string
  level: string
  minutes: number
  icon: typeof Home
  goals: string[]
  interests: string[]
  lessons: TrackLesson[]
  exam: TrackQuestion[]
}
type TrackProgress = { completed_lessons: number[]; exam_score: number | null; exam_passed: boolean }

const themeKey = 'fala-theme-v1'
const trackProgressKey = 'fala-track-progress-v1'
const dailyAgendaKey = 'fala-daily-agenda-v1'
function todayKey() {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-')
}
function readTrackProgress(): Record<string, TrackProgress> {
  try { const raw = localStorage.getItem(trackProgressKey); return raw ? JSON.parse(raw) as Record<string, TrackProgress> : {} } catch { return {} }
}
function readDailyAgenda(): boolean[] {
  try {
    const raw = localStorage.getItem(dailyAgendaKey)
    const parsed = raw ? JSON.parse(raw) as { date?: string; done?: boolean[] } : null
    return parsed?.date === todayKey() && Array.isArray(parsed.done) ? [!!parsed.done[0],!!parsed.done[1],!!parsed.done[2]] : [false,false,false]
  } catch { return [false,false,false] }
}
const mobileNavItems: { id: Page; label: string; icon: typeof Home }[] = [
  {id:'home',label:'Início',icon:Home},{id:'tracks',label:'Trilhas',icon:Map},
  {id:'speak',label:'Falar',icon:AudioLines},{id:'write',label:'Escrever',icon:Languages},
  {id:'music',label:'Música',icon:Music2},{id:'vocabulary',label:'Palavras',icon:Bookmark},
]
const dailySteps = [
  { title:'Ouvir e repetir', detail:'Escute uma frase e pratique o ritmo da fala.', minutes:3, page:'speak' as Page, icon:Headphones },
  { title:'Resolver uma situação', detail:'Avance uma etapa em uma trilha do seu objetivo.', minutes:5, page:'tracks' as Page, icon:Map },
  { title:'Produzir em inglês', detail:'Escreva algumas frases ou converse com a Lumi.', minutes:4, page:'write' as Page, icon:Languages },
]

const learningTracks: LearningTrack[] = [
  {
    id:'travel-season', title:'Viagem e temporada fora', category:'VIAGEM · VIDA REAL',
    description:'Do aeroporto ao aluguel temporário: resolva situações práticas com autonomia.',
    level:'Iniciante a intermediário', minutes:28, icon:Map, goals:['travel','life','conversation'], interests:['travel'],
    lessons:[
      {title:'No aeroporto',kind:'choice',scenario:'Você chegou ao aeroporto e precisa encontrar o balcão de check-in.',target_phrase:'Excuse me, where is the check-in desk?',translation:'Com licença, onde fica o balcão de check-in?',question:'Qual pergunta é mais natural para localizar o balcão?',options:['Where check-in is?','Excuse me, where is the check-in desk?','I want desk check-in.'],correct_index:1},
      {title:'Check-in no hotel',kind:'write',scenario:'Você chegou à recepção. Diga que tem uma reserva em seu nome e pergunte o horário do café da manhã.',target_phrase:'I have a reservation under the name...',translation:'Tenho uma reserva em nome de...',question:'Escreva duas frases para fazer o check-in.',input_hint:'Hello, I have a reservation under the name...',expected_answer:'Hello, I have a reservation under the name Silva. What time is breakfast?'},
      {title:'Transporte pela cidade',kind:'speak',scenario:'Você está na rua e precisa pedir um carro até o centro.',target_phrase:'Could you take me to the city center, please?',translation:'Você poderia me levar ao centro da cidade, por favor?',question:'Ouça a frase, repita em voz alta e envie sua fala.',expected_answer:'Could you take me to the city center, please?'},
      {title:'Resolver um imprevisto',kind:'choice',scenario:'A chave do quarto não funciona. Você precisa explicar o problema sem ficar agressivo.',target_phrase:'My room key does not seem to be working.',translation:'Minha chave do quarto parece não estar funcionando.',question:'Como você explicaria o problema com educação?',options:['My room key does not seem to be working. Could you help me?','Give new key now.','The room is bad.'],correct_index:0},
    ],
    exam:[
      {question:'Você quer perguntar onde fica o portão de embarque.',options:['Where is the boarding gate?','Where boarding gate?','I need gate where.'],correct_index:0,explanation:'Use Where is + lugar para perguntar onde algo fica.'},
      {question:'Como informar que tem uma reserva?',options:['I have a reservation.','I am reservation.','I have reserve.'],correct_index:0,explanation:'Reservation é o substantivo usado para reserva.'},
      {question:'Peça para alguém falar mais devagar.',options:['Could you speak more slowly, please?','Talk slow me.','You speak slow.'],correct_index:0,explanation:'Could you... please? deixa o pedido educado.'},
      {question:'Como dizer que perdeu a mala?',options:['I lost my luggage.','I missed my baggages.','I lose the luggages yesterday.'],correct_index:0,explanation:'Lost é o passado de lose; luggage costuma ser incontável.'},
      {question:'Peça um recibo.',options:['Could I have a receipt, please?','I want paper money.','Give receipt me.'],correct_index:0,explanation:'Could I have...? é uma forma natural e educada.'},
    ],
  },
  {
    id:'food-delivery', title:'Restaurantes e delivery', category:'COMIDA · PEDIDOS',
    description:'Leia cardápios, faça pedidos, personalize pratos e resolva problemas com entregas.',
    level:'Todos os níveis', minutes:24, icon:Utensils, goals:['travel','life','conversation'], interests:['food'],
    lessons:[
      {title:'Pedir uma refeição',kind:'choice',scenario:'O atendente pergunta o que você gostaria de pedir.',target_phrase:'I would like the grilled chicken, please.',translation:'Eu gostaria do frango grelhado, por favor.',question:'Qual resposta é educada e completa?',options:['I want chicken now.','I would like the grilled chicken, please.','Chicken for me, fast.'],correct_index:1},
      {title:'Personalizar o pedido',kind:'write',scenario:'Você quer um hambúrguer sem cebola e com água sem gás.',target_phrase:'Could I have it without onions?',translation:'Poderia ser sem cebola?',question:'Escreva seu pedido com duas preferências.',input_hint:'Could I have a burger without onions and...',expected_answer:'Could I have a burger without onions and a bottle of still water, please?'},
      {title:'Pedir comida por telefone',kind:'speak',scenario:'Você está ligando para um restaurante para pedir comida para viagem.',target_phrase:'I would like to place an order for pickup.',translation:'Gostaria de fazer um pedido para retirar.',question:'Repita a frase como se estivesse falando com o restaurante.',expected_answer:'I would like to place an order for pickup.'},
      {title:'Resolver um pedido errado',kind:'choice',scenario:'Você recebeu o prato errado e precisa explicar o problema.',target_phrase:'I am afraid this is not what I ordered.',translation:'Receio que isto não seja o que pedi.',question:'Como explicar o erro sem soar rude?',options:['This is wrong. Fix it!','I am afraid this is not what I ordered. Could you check it?','You brought bad food.'],correct_index:1},
    ],
    exam:[
      {question:'Como pedir a conta?',options:['Could we have the bill, please?','Bring money.','Where pay?'],correct_index:0,explanation:'Bill é a conta no restaurante.'},
      {question:'Como pedir sem leite?',options:['Without milk, please.','No milk me.','I am no milk.'],correct_index:0,explanation:'Without + substantivo expressa ausência de algo.'},
      {question:'Como perguntar se o prato é apimentado?',options:['Is this dish spicy?','This dish has pepper?','Spicy it is?'],correct_index:0,explanation:'Is this dish...? é a estrutura de pergunta.'},
      {question:'O que significa take away?',options:['Comer no local','Para levar','Pagar em dinheiro'],correct_index:1,explanation:'Take away (UK) ou takeout (US) é comida para levar.'},
      {question:'Como pedir uma recomendação?',options:['What do you recommend?','What you say food?','Recommend me now.'],correct_index:0,explanation:'What do you recommend? é direto e natural.'},
    ],
  },
  {
    id:'work-career', title:'Trabalho e carreira', category:'TRABALHO · NEGÓCIOS',
    description:'Apresente ideias, participe de reuniões, peça esclarecimentos e pratique entrevistas.',
    level:'Básico a avançado', minutes:30, icon:BriefcaseBusiness, goals:['work','study'], interests:['business','technology'],
    lessons:[
      {title:'Apresentar-se',kind:'speak',scenario:'Você está conhecendo um colega em uma reunião internacional.',target_phrase:'I work with software development and automation.',translation:'Trabalho com desenvolvimento de software e automação.',question:'Repita sua apresentação e tente adaptar a área à sua realidade.',expected_answer:'I work with software development and automation.'},
      {title:'Dar uma atualização',kind:'write',scenario:'Sua equipe pergunta o andamento de uma tarefa. Explique que está em progresso e quando pretende terminar.',target_phrase:'I am working on it and expect to finish by Friday.',translation:'Estou trabalhando nisso e espero terminar até sexta.',question:'Escreva uma atualização curta para sua equipe.',input_hint:'I am working on...',expected_answer:'I am working on the report and expect to finish by Friday.'},
      {title:'Pedir esclarecimento',kind:'choice',scenario:'Você não entendeu uma parte da reunião e quer confirmar.',target_phrase:'Could you clarify the last point?',translation:'Você poderia esclarecer o último ponto?',question:'Qual frase é profissional e educada?',options:['I do not understand anything.','Could you clarify the last point?','Say again now.'],correct_index:1},
      {title:'Entrevista de emprego',kind:'write',scenario:'O recrutador pergunta sobre uma habilidade sua e um resultado concreto.',target_phrase:'One of my strengths is solving problems.',translation:'Um dos meus pontos fortes é resolver problemas.',question:'Escreva 3 frases sobre uma habilidade e um resultado que você alcançou.',input_hint:'One of my strengths is...',expected_answer:'One of my strengths is problem-solving. I organized a project and helped the team save time.'},
    ],
    exam:[
      {question:'Como dizer “sou responsável por vendas”?',options:['I am responsible for sales.','I responsible sales.','I have responsible of sales.'],correct_index:0,explanation:'Be responsible for + substantivo/gerúndio.'},
      {question:'Como pedir para repetir um ponto?',options:['Could you repeat that point, please?','Repeat me point.','You repeat now.'],correct_index:0,explanation:'Could you repeat...? é uma solicitação educada.'},
      {question:'Como falar de uma tarefa em andamento?',options:['I am working on it.','I work it now yesterday.','I working on.'],correct_index:0,explanation:'Present continuous: am/is/are + verbo-ing.'},
      {question:'Como propor uma ideia?',options:['I would suggest a different approach.','I suggest you different.','My idea more good.'],correct_index:0,explanation:'I would suggest... é uma forma profissional.'},
      {question:'Como encerrar uma reunião?',options:['That covers my main points. Thank you.','I finish. Bye now.','Meeting is over for me.'],correct_index:0,explanation:'That covers my main points resume o que você apresentou.'},
    ],
  },
  {
    id:'social-friends', title:'Conversas e novas amizades', category:'SOCIAL · CONVERSAÇÃO',
    description:'Conheça pessoas, mantenha conversas, faça perguntas e combine programas.',
    level:'Iniciante a intermediário', minutes:24, icon:Users, goals:['conversation','life','travel'], interests:['films','games','sports','music'],
    lessons:[
      {title:'Começar uma conversa',kind:'choice',scenario:'Você está em um evento e quer conhecer alguém.',target_phrase:'Hi, I do not think we have met. I am Alex.',translation:'Oi, acho que ainda não nos conhecemos. Sou Alex.',question:'Qual abertura soa natural?',options:['Who are you?','Hi, I do not think we have met. I am Alex.','Tell your name.'],correct_index:1},
      {title:'Fazer uma pergunta de continuação',kind:'write',scenario:'A pessoa diz que gosta de cinema. Faça uma pergunta para manter o papo.',target_phrase:'What kind of movies are you into?',translation:'De que tipo de filme você gosta?',question:'Escreva uma pergunta e uma frase sobre algo de que você gosta.',input_hint:'What kind of...?',expected_answer:'What kind of movies are you into? I really enjoy science fiction.'},
      {title:'Convidar alguém',kind:'speak',scenario:'Você quer convidar uma pessoa para tomar café no fim de semana.',target_phrase:'Would you like to grab a coffee this weekend?',translation:'Você gostaria de tomar um café neste fim de semana?',question:'Repita o convite com entonação cordial.',expected_answer:'Would you like to grab a coffee this weekend?'},
      {title:'Responder a um convite',kind:'choice',scenario:'Você está ocupado, mas quer recusar sem encerrar a amizade.',target_phrase:'I would love to, but I already have plans.',translation:'Eu adoraria, mas já tenho compromisso.',question:'Qual recusa é gentil?',options:['No. Never.','I would love to, but I already have plans.','I do not want you.'],correct_index:1},
    ],
    exam:[
      {question:'Como perguntar sobre interesses?',options:['What are you interested in?','What you interest?','You like what?'],correct_index:0,explanation:'Be interested in é a construção correta.'},
      {question:'Como demonstrar interesse?',options:['That sounds interesting. Tell me more.','That sound interest.','Talk more now.'],correct_index:0,explanation:'That sounds interesting é uma resposta natural.'},
      {question:'Como perguntar de onde alguém é?',options:['Where are you from?','Where you from is?','You from where are?'],correct_index:0,explanation:'Where are you from? é a estrutura correta.'},
      {question:'Como sugerir um horário?',options:['How about Saturday afternoon?','What time Saturday you?','Saturday afternoon do you?'],correct_index:0,explanation:'How about...? introduz uma sugestão.'},
      {question:'Como dizer “faz sentido”?',options:['That makes sense.','That make senses.','This has sense.'],correct_index:0,explanation:'A expressão fixa é That makes sense.'},
    ],
  },
  {
    id:'shopping-services', title:'Compras e serviços', category:'COMPRAS · COTIDIANO',
    description:'Pergunte preços, tamanhos, devoluções, agendamentos e resolva pequenos problemas.',
    level:'Todos os níveis', minutes:24, icon:ShoppingBag, goals:['travel','life','conversation'], interests:['fashion','technology'],
    lessons:[
      {title:'Perguntar por um tamanho',kind:'choice',scenario:'Você encontrou uma camiseta, mas precisa de um tamanho maior.',target_phrase:'Do you have this in a larger size?',translation:'Você tem esta peça em um tamanho maior?',question:'Qual pergunta funciona na loja?',options:['Have bigger?','Do you have this in a larger size?','I need more large.'],correct_index:1},
      {title:'Comparar produtos',kind:'write',scenario:'Compare dois produtos e explique qual prefere e por quê.',target_phrase:'This one is more affordable, but the other one is more durable.',translation:'Este é mais acessível, mas o outro é mais durável.',question:'Escreva duas frases comparando produtos.',input_hint:'This one is..., but...',expected_answer:'This one is more affordable, but the other one is more durable. I prefer the second one.'},
      {title:'Fazer uma devolução',kind:'speak',scenario:'Você comprou algo que não serviu e precisa perguntar sobre troca.',target_phrase:'Could I exchange this for a different size?',translation:'Eu poderia trocar isto por outro tamanho?',question:'Repita a frase como se estivesse falando com o atendente.',expected_answer:'Could I exchange this for a different size?'},
      {title:'Agendar um serviço',kind:'choice',scenario:'Você quer marcar um horário para amanhã à tarde.',target_phrase:'Do you have any availability tomorrow afternoon?',translation:'Você tem algum horário disponível amanhã à tarde?',question:'Como perguntar pela disponibilidade?',options:['You are free tomorrow?','Do you have any availability tomorrow afternoon?','I schedule tomorrow.'],correct_index:1},
    ],
    exam:[
      {question:'Como perguntar o preço?',options:['How much does this cost?','How many costs this?','What price this have?'],correct_index:0,explanation:'How much does this cost? pergunta o preço.'},
      {question:'Como pedir para experimentar?',options:['Can I try this on?','Can I use this dress?','I try this now?'],correct_index:0,explanation:'Try on é experimentar roupa.'},
      {question:'Como dizer que quer trocar um item?',options:['I would like to exchange this.','I like change this.','I want exchange it yesterday.'],correct_index:0,explanation:'Would like to exchange é uma solicitação educada.'},
      {question:'Como pedir um recibo?',options:['Could I get a receipt?','Can you give me a recipe?','Where is the receipting?'],correct_index:0,explanation:'Receipt é recibo; recipe é receita culinária.'},
      {question:'Como perguntar se aceitam cartão?',options:['Do you take credit cards?','You have credit card?','Can you card me?'],correct_index:0,explanation:'Do you take...? pergunta se o estabelecimento aceita.'},
    ],
  },
  {
    id:'cars-tech', title:'Carros, tecnologia e oficina', category:'INTERESSES · CONTEÚDO',
    description:'Descreva problemas, compare especificações, peça ajuda e fale sobre o que gosta.',
    level:'Básico a intermediário', minutes:26, icon:Car, goals:['conversation','work','life'], interests:['cars','technology','games'],
    lessons:[
      {title:'Descrever um problema',kind:'speak',scenario:'Você está na oficina e precisa dizer que o motor faz um barulho estranho.',target_phrase:'The engine has been making a strange noise.',translation:'O motor está fazendo um barulho estranho.',question:'Repita a frase e preste atenção a engine e strange.',expected_answer:'The engine has been making a strange noise.'},
      {title:'Comparar duas opções',kind:'write',scenario:'Compare dois carros usando uma vantagem e uma desvantagem.',target_phrase:'This model is faster, but it uses more fuel.',translation:'Este modelo é mais rápido, mas consome mais combustível.',question:'Escreva uma comparação em inglês.',input_hint:'This model is..., but...',expected_answer:'This model is faster, but it uses more fuel. The other one is cheaper.'},
      {title:'Pedir uma explicação técnica',kind:'choice',scenario:'Um mecânico explica o problema, mas você não entende o termo técnico.',target_phrase:'Could you explain what that part does?',translation:'Você poderia explicar o que essa peça faz?',question:'Como pedir uma explicação sem fingir que entendeu?',options:['I know it. Go.','Could you explain what that part does?','Your part is bad.'],correct_index:1},
      {title:'Falar de um interesse',kind:'write',scenario:'Explique por que gosta de carros, tecnologia ou outro tema escolhido.',target_phrase:'I have been interested in cars for years.',translation:'Tenho interesse por carros há anos.',question:'Escreva três frases sobre seu interesse e faça uma pergunta ao interlocutor.',input_hint:'I have been interested in...',expected_answer:'I have been interested in cars for years. I enjoy learning how engines work. What about you?'},
    ],
    exam:[
      {question:'Como dizer “o carro está fazendo um barulho”?',options:['The car is making a noise.','The car does a noise.','The car has noiseing.'],correct_index:0,explanation:'Make a noise é a expressão natural.'},
      {question:'Como perguntar sobre consumo?',options:['How much fuel does it use?','How many fuel use?','It use much gas?'],correct_index:0,explanation:'How much fuel does it use? pergunta consumo.'},
      {question:'Como dizer que uma opção é mais barata?',options:['This option is cheaper.','This option is more cheap.','This option cheaper than.'],correct_index:0,explanation:'Cheap forma o comparativo cheaper.'},
      {question:'Como pedir ajuda?',options:['Could you take a look at this?','Look this for me now.','You look this.'],correct_index:0,explanation:'Take a look at é uma forma natural de pedir para olhar.'},
      {question:'Como dizer “não tenho certeza”?',options:['I am not sure.','I no sure.','I have no sure.'],correct_index:0,explanation:'I am not sure é a expressão correta.'},
    ],
  },
]

function readMusicSet(profile: Profile) {
  const interest = profile.customInterest || profile.interests[0] || ''
  if (interest === 'cars' || interest === 'technology') return {
    title:'Every mile I learn', theme:'Carros e tecnologia',
    lyrics:['I check the road, I start the ride','The engine hums, I feel alive','I take my time, I learn each turn','Every mile gives me more to learn'],
    translation:'Eu confiro a estrada e começo a viagem / O motor ronca e eu me sinto vivo / Vou com calma e aprendo cada curva / Cada quilômetro me ensina mais.',
    words:[['engine','motor'],['ride','passeio / viagem'],['turn','curva / virar'],['mile','milha']],
    gap:'engine', options:['window','engine','kitchen'],
  }
  if (interest === 'food' || interest === 'fitness') return {
    title:'A little better every day', theme:'Comida e rotina',
    lyrics:['I choose my words, I take a bite','I learn a phrase and say it right','A little practice, step by step','A better habit I can get'],
    translation:'Escolho minhas palavras e dou uma mordida / Aprendo uma frase e a digo corretamente / Um pouco de prática, passo a passo / Posso criar um hábito melhor.',
    words:[['bite','mordida'],['phrase','frase'],['habit','hábito'],['step by step','passo a passo']],
    gap:'phrase', options:['phrase','engine','cloud'],
  }
  return {
    title:'One step at a time', theme:'Viagens e novos começos',
    lyrics:['I pack my dreams and take a train','I ask for help and try again','A different street, a brand new view','I learn the world by talking to you'],
    translation:'Arrumo meus sonhos e pego um trem / Peço ajuda e tento outra vez / Uma rua diferente, uma nova paisagem / Aprendo o mundo conversando com você.',
    words:[['pack','arrumar / fazer as malas'],['train','trem'],['brand new','totalmente novo'],['view','vista / paisagem']],
    gap:'train', options:['train','engine','bill'],
  }
}

function Onboarding({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState<Goal>('conversation')
  const [level, setLevel] = useState<Level>('unsure')
  const [focuses, setFocuses] = useState<Focus[]>(['speaking', 'listening'])
  const [minutes, setMinutes] = useState(10)
  const [accent, setAccent] = useState<'us' | 'uk'>('us')
  const [style, setStyle] = useState<'conversation' | 'guided' | 'mixed'>('mixed')
  const [interests, setInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState('')
  const [barriers, setBarriers] = useState<string[]>([])
  const [scenario, setScenario] = useState('travel')
  const [timeHorizon, setTimeHorizon] = useState('flexible')
  const [feedbackStyle, setFeedbackStyle] = useState<'gentle' | 'balanced' | 'direct'>('balanced')
  const progress = ((step + 1) / 6) * 100
  const toggle = <T extends string,>(items: T[], setItems: (value: T[]) => void, id: T) => setItems(items.includes(id) ? items.filter(x => x !== id) : [...items, id])
  const next = () => step < 5 ? setStep(step + 1) : onComplete({ name, goal, level, focuses, minutes, accent, style, interests, customInterest, barriers, scenario, timeHorizon, feedbackStyle })
  const canContinue = (step !== 2 || interests.length > 0 || customInterest.trim().length > 1) && (step !== 3 || focuses.length > 0)

  return <main className="onboarding-shell">
    <div className="onboarding-top"><div className="brand"><span className="brand-mark">f.</span><span>fala<span className="brand-light">english</span></span></div><span className="step-label">SEU PERFIL DE APRENDIZAGEM · {step + 1}/6</span></div>
    <div className="onboarding-progress"><span style={{ width: `${progress}%` }} /></div>
    <section className="onboarding-card">
      <div className="eyebrow"><Sparkles size={14} /> PERSONALIZAÇÃO COM A LUMI</div>
      {step === 0 && <>
        <h1>Vamos construir um inglês<br /><em>que tenha a ver com você.</em></h1>
        <p className="onboarding-copy">A Lumi vai conhecer seus objetivos para transformar situações reais em aulas. Nada de conteúdo aleatório.</p>
        <label className="field-label" htmlFor="student-name">Como podemos chamar você?</label>
        <input id="student-name" className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder="Seu primeiro nome" autoFocus />
        <div className="field-label">O que você quer conquistar com o inglês?</div>
        <div className="choice-grid goal-grid">{goalOptions.map(item => <button type="button" key={item.id} className={`choice-card ${goal === item.id ? 'selected' : ''}`} onClick={() => setGoal(item.id)}><span className="choice-emoji">{item.emoji}</span><span className="choice-title">{item.title}</span><span className="choice-detail">{item.detail}</span>{goal === item.id && <CheckCircle2 className="choice-check" size={17} />}</button>)}</div>
      </>}
      {step === 1 && <>
        <h1>Qual é seu ponto<br /><em>de partida?</em></h1>
        <p className="onboarding-copy">É uma estimativa inicial. A Lumi vai observar suas respostas nas atividades e ajustar o nível com o tempo.</p>
        <div className="level-list">{(Object.keys(levelLabels) as Level[]).map((key, index) => <button type="button" key={key} className={`level-option ${level === key ? 'selected' : ''}`} onClick={() => setLevel(key)}><span className="level-index">0{index + 1}</span><span className="level-description">{levelLabels[key]}</span>{level === key && <CheckCircle2 size={18} />}</button>)}</div>
        <div className="soft-note"><Lightbulb size={16} /> Não vamos confiar só na sua autoavaliação: exercícios curtos também ajudam a estimar seu nível.</div>
      </>}
      {step === 2 && <>
        <h1>Do que você gosta<br /><em>de verdade?</em></h1>
        <p className="onboarding-copy">Vamos usar seus interesses como contexto para ensinar vocabulário, gramática e conversação. Você pode marcar vários.</p>
        <div className="choice-grid interest-grid">{interestOptions.map(item => <button type="button" key={item.id} className={`interest-option ${interests.includes(item.id) ? 'selected' : ''}`} onClick={() => toggle(interests, setInterests, item.id)}><span>{item.emoji}</span><strong>{item.title}</strong>{interests.includes(item.id) && <CheckCircle2 size={15}/>}</button>)}</div>
        <label className="field-label" htmlFor="custom-interest">Outro interesse? Escreva com suas palavras.</label>
        <input id="custom-interest" className="text-input" value={customInterest} onChange={e => setCustomInterest(e.target.value)} placeholder="Ex.: Fórmula 1, carros antigos, programação em Python..." />
        <div className="soft-note"><Sparkles size={16} /> Exemplo: se você gosta de carros, a Lumi pode ensinar comparativos, peças, test drives e conversas em uma oficina — com inglês útil para fora desse tema também.</div>
      </>}
      {step === 3 && <>
        <h1>O que costuma<br /><em>atrapalhar você?</em></h1>
        <p className="onboarding-copy">Essas dificuldades ajudam a escolher o tipo de exercício e a quantidade de ajuda. Selecione suas prioridades.</p>
        <div className="field-label">Quais habilidades quer desenvolver?</div>
        <div className="choice-grid focus-grid">{focusOptions.map(item => <button type="button" key={item.id} className={`focus-option ${focuses.includes(item.id) ? 'selected' : ''}`} onClick={() => toggle(focuses, setFocuses, item.id)}><span className="focus-check">{focuses.includes(item.id) ? <Check size={14} /> : <Plus size={14} />}</span><span className="choice-title">{item.title}</span><span className="choice-detail">{item.detail}</span></button>)}</div>
        <div className="field-label">O que mais acontece com você?</div>
        <div className="barrier-list">{barrierOptions.map(item => <button type="button" key={item.id} className={`barrier-option ${barriers.includes(item.id) ? 'selected' : ''}`} onClick={() => toggle(barriers, setBarriers, item.id)}><span>{barriers.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</span>{item.title}</button>)}</div>
      </>}
      {step === 4 && <>
        <h1>Vamos preparar você<br /><em>para uma situação real.</em></h1>
        <p className="onboarding-copy">Isso ajuda a Lumi a montar simulações e diálogos que façam sentido para sua vida.</p>
        <div className="choice-grid scenario-grid">{scenarioOptions.map(item => <button type="button" key={item.id} className={`choice-card ${scenario === item.id ? 'selected' : ''}`} onClick={() => setScenario(item.id)}><span className="choice-emoji">{item.emoji}</span><span className="choice-title">{item.title}</span><span className="choice-detail">{item.detail}</span>{scenario === item.id && <CheckCircle2 className="choice-check" size={17}/>}</button>)}</div>
        <div className="field-label">Quando você pretende usar o inglês?</div>
        <div className="horizon-grid">{[{id:'30-days',label:'Nos próximos 30 dias'},{id:'90-days',label:'Em 1–3 meses'},{id:'6-months',label:'Em 3–6 meses'},{id:'flexible',label:'Sem prazo definido'}].map(item=><button type="button" key={item.id} className={`horizon-option ${timeHorizon === item.id ? 'selected' : ''}`} onClick={() => setTimeHorizon(item.id)}>{item.label}</button>)}</div>
      </>}
      {step === 5 && <>
        <h1>Agora vamos definir<br /><em>um ritmo sustentável.</em></h1>
        <p className="onboarding-copy">A Lumi vai dosar explicações, correções e atividades de acordo com sua rotina.</p>
        <div className="field-label">Quanto tempo por dia você consegue dedicar?</div>
        <div className="time-options">{[5, 10, 15, 20, 30].map(value => <button type="button" key={value} className={`time-option ${minutes === value ? 'selected' : ''}`} onClick={() => setMinutes(value)}>{value}<small>min</small></button>)}</div>
        <div className="settings-row"><div><strong>Pronúncia de referência</strong><span>O modelo de inglês que você vai ouvir</span></div><div className="segmented"><button type="button" className={accent === 'us' ? 'active' : ''} onClick={() => setAccent('us')}>EUA</button><button type="button" className={accent === 'uk' ? 'active' : ''} onClick={() => setAccent('uk')}>Reino Unido</button></div></div>
        <div className="settings-row"><div><strong>Como prefere aprender?</strong><span>O FALA pode misturar formatos</span></div><select className="select-input" value={style} onChange={e => setStyle(e.target.value as typeof style)}><option value="mixed">Um pouco de cada</option><option value="conversation">Conversando</option><option value="guided">Passo a passo</option></select></div>
        <div className="settings-row feedback-setting"><div><strong>Como prefere receber correções?</strong><span>Isso muda o tom da Lumi, não o rigor do aprendizado</span></div><div className="feedback-options">{[{id:'gentle',label:'Com calma'},{id:'balanced',label:'Equilibrado'},{id:'direct',label:'Direto ao ponto'}].map(item=><button type="button" key={item.id} className={feedbackStyle === item.id ? 'selected' : ''} onClick={() => setFeedbackStyle(item.id as typeof feedbackStyle)}>{item.label}</button>)}</div></div>
        <div className="soft-note"><LockKeyhole size={15} /> Seu perfil serve para personalizar o ensino. Você poderá editar ou apagar suas informações.</div>
      </>}
      <div className="onboarding-actions">{step > 0 ? <button className="back-button" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Voltar</button> : <span className="privacy-note">Cerca de 2–3 minutos</span>}<button className="primary-button" disabled={!canContinue || (step === 0 && !name.trim())} onClick={next}>{step === 5 ? 'Conhecer minha trilha' : 'Continuar'} <ArrowRight size={17} /></button></div>
    </section>
    <p className="onboarding-footnote">FALA ENGLISH <span>·</span> APRENDER COM INTENÇÃO</p>
  </main>
}

function App() {
  const [profile, setProfile] = useState<Profile | null>(() => readProfile())
  const [page, setPage] = useState<Page>('home')
  const [lessonDone, setLessonDone] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [apiNotice, setApiNotice] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [writingText, setWritingText] = useState('')
  const [writingFeedback, setWritingFeedback] = useState('')
  const [words, setWords] = useState<string[]>(['actually', 'figure out', 'I am looking forward to'])
  const [showSettings, setShowSettings] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [dailyActivity, setDailyActivity] = useState<PersonalizedActivity | null>(null)
  const [activityBusy, setActivityBusy] = useState(false)
  const [openAnswer, setOpenAnswer] = useState('')
  const [activityEvaluation, setActivityEvaluation] = useState<ActivityEvaluation | null>(null)
  const [evaluationBusy, setEvaluationBusy] = useState(false)
  const [planSummary, setPlanSummary] = useState('')
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null)
  const [accountReady, setAccountReady] = useState(false)
  const [learnerStats, setLearnerStats] = useState<LearnerStats>({ totalMinutes: 0, totalSessions: 0, activeDays: 0, skillScores: {}, weeklyMinutes: Array(7).fill(0) })
  const [recentMistakes, setRecentMistakes] = useState<string[]>([])
  const [learnerInsights, setLearnerInsights] = useState<LearnerInsight[]>([])
  const [darkTheme, setDarkTheme] = useState(() => localStorage.getItem(themeKey) === 'dark')
  const [trackProgress, setTrackProgress] = useState<Record<string, TrackProgress>>(() => readTrackProgress())
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [trackMode, setTrackMode] = useState<'overview' | 'lesson' | 'exam'>('overview')
  const [trackLessonIndex, setTrackLessonIndex] = useState(0)
  const [trackChoice, setTrackChoice] = useState<number | null>(null)
  const [trackResponse, setTrackResponse] = useState('')
  const [trackFeedback, setTrackFeedback] = useState('')
  const [trackEvaluation, setTrackEvaluation] = useState<ActivityEvaluation | null>(null)
  const [trackBusy, setTrackBusy] = useState(false)
  const [trackExamAnswers, setTrackExamAnswers] = useState<Record<number, number>>({})
  const [trackExamScore, setTrackExamScore] = useState<number | null>(null)
  const [dailyChecks, setDailyChecks] = useState<boolean[]>(() => readDailyAgenda())
  const [musicAnswer, setMusicAnswer] = useState('')
  const [musicFeedback, setMusicFeedback] = useState('')
  const [writingPhoto, setWritingPhoto] = useState<File | null>(null)
  const [writingPhotoPreview, setWritingPhotoPreview] = useState<string | null>(null)
  const [writingPhotoFeedback, setWritingPhotoFeedback] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const saveProfile = async (userId: string, learner: Profile) => {
    if (!supabase) return
    const { error } = await supabase.from('profiles').upsert({
      user_id: userId,
      display_name: learner.name,
      goal: learner.goal,
      estimated_level: learner.level,
      focus_areas: learner.focuses,
      daily_minutes: learner.minutes,
      accent: learner.accent,
      learning_style: learner.style,
      interests: learner.interests,
      custom_interest: learner.customInterest,
      barriers: learner.barriers,
      learning_context: learner.scenario,
      time_horizon: learner.timeHorizon,
      feedback_style: learner.feedbackStyle,
    }, { onConflict: 'user_id' })
    if (error) throw error
  }

  const syncProfile = async (userId: string) => {
    const learner = profile ?? readProfile()
    if (!learner) return
    await saveProfile(userId, learner)
  }

  const generateActivity = async (learner: Profile, realLifeContext?: string) => {
    const interest = learner.customInterest || interestOptions.find(item => item.id === learner.interests[0])?.title || 'cotidiano'
    const demo: PersonalizedActivity = {
      activity_type: 'multiple_choice',
      title: realLifeContext ? 'Desafio Lumi · ' + realLifeContext : `Inglês aplicado a ${interest}`,
      skill: learner.focuses[0] || 'speaking',
      context: learner.scenario,
      target_phrase: learner.goal === 'travel' ? 'Could you recommend a good place nearby?' : learner.goal === 'work' ? 'Let me walk you through the main idea.' : `I'm really interested in ${interest.toLowerCase()}.`,
      translation: learner.goal === 'travel' ? 'Você poderia recomendar um bom lugar aqui perto?' : learner.goal === 'work' ? 'Deixe-me apresentar a ideia principal.' : `Tenho bastante interesse em ${interest.toLowerCase()}.`,
      explanation: `A Lumi escolheu este exemplo para conectar seu objetivo com um tema de que você gosta: ${interest}. Observe a estrutura e tente reutilizá-la em outra situação.`,
      question: 'Qual resposta mantém a conversa de forma mais natural?',
      options: ['I like very much.', 'That sounds interesting. Could you tell me more?', 'I am agree.'],
      correct_index: 1,
      feedback: '“That sounds interesting. Could you tell me more?” demonstra interesse e mantém a conversa. “I agree” não leva “am”.',
    }
    setDailyActivity(demo)
    setQuizAnswer(null)
    setLessonDone(false)
    setOpenAnswer('')
    setActivityEvaluation(null)
    if (!supabase) return
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.access_token) return
    setActivityBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('tutor', { body: { mode: 'activity', profile: learner, activity: realLifeContext ? { title: realLifeContext, context: realLifeContext } : undefined, learningEvidence: { skillScores: learnerStats.skillScores, recentMistakes, previousInsights: learnerInsights.map(item => `${item.skill}: ${item.observation} → ${item.recommendation}`) } } })
      if (error) throw error
      const generated = data?.structured as PersonalizedActivity | undefined
      if (generated?.title && Array.isArray(generated.options) && generated.options.length >= 2) {
        setDailyActivity(generated)
      }
    } catch (error) {
      console.error('Daily activity generation failed', error)
      setApiNotice('A atividade personalizada não foi gerada agora. Mantive uma atividade de demonstração para você continuar.')
    } finally { setActivityBusy(false) }
  }

  const createLearningPlan = async (learner: Profile, userId?: string) => {
    const interest = learner.customInterest || interestOptions.find(item => item.id === learner.interests[0])?.title || 'seus interesses'
    setPlanSummary(`Sua trilha vai combinar ${learner.goal === 'travel' ? 'situações de viagem' : learner.goal === 'work' ? 'contextos profissionais' : 'conversas do cotidiano'} com temas de ${interest}. Prioridade inicial: ${learner.focuses.slice(0, 2).join(' e ')}.`)
    if (!supabase || !userId) return
    try {
      const { data, error } = await supabase.functions.invoke('tutor', { body: { mode: 'plan', profile: learner, learningEvidence: { skillScores: learnerStats.skillScores, recentMistakes, previousInsights: learnerInsights.map(item => `${item.skill}: ${item.observation} → ${item.recommendation}`) } } })
      if (error) throw error
      const plan = data?.structured
      if (plan?.headline) {
        setLearningPlan(plan as LearningPlan)
        setPlanSummary(`${plan.headline} ${(plan.today ?? '').toString()}`)
        await supabase.from('learning_plans').upsert({ user_id: userId, plan, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
    } catch (error) {
      console.error('Learning plan generation failed', error)
      setApiNotice('Não consegui gerar sua trilha com IA agora. Sua personalização inicial foi mantida.')
    }
  }

  const completeOnboarding = (nextProfile: Profile) => {
    localStorage.setItem(profileKey, JSON.stringify(nextProfile))
    setProfile(nextProfile)
    setChat([{ role: 'assistant', text: `Oi, ${greetingName(nextProfile.name)}! Eu sou a Lumi. Vi que você quer desenvolver inglês para ${nextProfile.scenario} e gosta de ${nextProfile.customInterest || nextProfile.interests.join(', ')}. Vamos usar isso a nosso favor. What would you like to be able to do in English first?` }])
    void generateActivity(nextProfile)
    if (!supabase) { void createLearningPlan(nextProfile); return }
    void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        await saveProfile(data.user.id, nextProfile)
        await createLearningPlan(nextProfile, data.user.id)
      } else {
        void createLearningPlan(nextProfile)
        setAuthMessage('Seu perfil inicial está pronto. Crie uma conta para salvar a evolução e usar a Lumi com IA em qualquer dispositivo.')
        setShowSettings(true)
      }
    }).catch(error => {
      console.error('Could not sync learner profile', error)
      setAuthMessage('Seu perfil ficou salvo neste dispositivo. Entre na conta quando a sincronização estiver disponível.')
      setShowSettings(true)
    })
  }

  const hydrateAccount = async (userId: string) => {
    if (!supabase) return
    try {
      const { data: row, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      if (row) {
        const restored: Profile = {
          name: row.display_name ?? '', goal: row.goal ?? 'conversation', level: row.estimated_level ?? 'unsure',
          focuses: row.focus_areas ?? ['speaking', 'listening'], minutes: row.daily_minutes ?? 10,
          accent: row.accent ?? 'us', style: row.learning_style ?? 'mixed', interests: row.interests ?? [],
          customInterest: row.custom_interest ?? '', barriers: row.barriers ?? [], scenario: row.learning_context ?? 'daily',
          timeHorizon: row.time_horizon ?? 'flexible', feedbackStyle: row.feedback_style ?? 'balanced',
        }
        localStorage.setItem(profileKey, JSON.stringify(restored))
        setProfile(restored)
        void generateActivity(restored)
      } else {
        const local = profile ?? readProfile()
        if (local) { await saveProfile(userId, local); void generateActivity(local) }
      }
      const { data: vocabulary } = await supabase.from('vocabulary_items').select('term').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
      if (vocabulary?.length) setWords(vocabulary.map(item => item.term))
      const { data: plan } = await supabase.from('learning_plans').select('plan').eq('user_id', userId).maybeSingle()
      if (plan?.plan?.headline) { setLearningPlan(plan.plan as LearningPlan); setPlanSummary(`${plan.plan.headline} ${plan.plan.today ?? ''}`) }
      else {
        const localLearner = row ? {
          name: row.display_name ?? '', goal: row.goal ?? 'conversation', level: row.estimated_level ?? 'unsure',
          focuses: row.focus_areas ?? ['speaking', 'listening'], minutes: row.daily_minutes ?? 10, accent: row.accent ?? 'us',
          style: row.learning_style ?? 'mixed', interests: row.interests ?? [], customInterest: row.custom_interest ?? '',
          barriers: row.barriers ?? [], scenario: row.learning_context ?? 'daily', timeHorizon: row.time_horizon ?? 'flexible', feedbackStyle: row.feedback_style ?? 'balanced',
        } as Profile : profile ?? readProfile()
        if (localLearner) await createLearningPlan(localLearner, userId)
      }
      const since = new Date()
      since.setDate(since.getDate() - 7)
      const { data: sessions } = await supabase.from('learning_sessions').select('activity_type,duration_seconds,completed_at').eq('user_id', userId).gte('completed_at', since.toISOString())
      const activeDays = new Set((sessions ?? []).map(item => new Date(item.completed_at).toLocaleDateString('en-CA'))).size
      const weeklyMinutes = Array(7).fill(0) as number[]
      for (const item of sessions ?? []) {
        const dayIndex = (new Date(item.completed_at).getDay() + 6) % 7
        weeklyMinutes[dayIndex] += Number(item.duration_seconds || 0) / 60
      }
      const skillMap: Record<string, { score: number; count: number }> = {}
      const { data: attempts } = await supabase.from('activity_attempts').select('skill,score,learner_answer,prompt,correction,attempted_at').eq('user_id', userId).not('score', 'is', null).order('attempted_at', { ascending: false }).limit(200)
      for (const attempt of attempts ?? []) {
        const key = String(attempt.skill || 'speaking')
        skillMap[key] ??= { score: 0, count: 0 }
        skillMap[key].score += Number(attempt.score || 0)
        skillMap[key].count += 1
      }
      const skillScores = Object.fromEntries(Object.entries(skillMap).map(([key, value]) => [key, Math.round(value.score / value.count)]))
      setRecentMistakes((attempts ?? []).filter(item => Number(item.score ?? 100) < 70).slice(0, 8).map(item => `${String(item.skill || 'speaking')}: ${String(item.learner_answer || '').slice(0, 100)} (prompt: ${String(item.prompt || '').slice(0, 100)})`))
      setLearnerStats({
        totalMinutes: Math.round((sessions ?? []).reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0) / 60),
        totalSessions: (sessions ?? []).length,
        activeDays,
        skillScores,
        weeklyMinutes,
      })
      const { data: insights } = await supabase.from('learner_insights').select('id,skill,observation,recommendation,confidence,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      if (insights?.length) setLearnerInsights(insights as LearnerInsight[])
      const { data: messages } = await supabase.from('chat_messages').select('role,content,metadata').eq('user_id', userId).order('created_at', { ascending: true }).limit(30)
      if (messages?.length) setChat(messages.map(item => ({ role: item.role as 'user' | 'assistant', text: item.content, note: item.metadata?.correction })))
      const { data: savedTracks, error: tracksError } = await supabase.from('track_progress').select('track_id,completed_lessons,exam_score,exam_passed').eq('user_id', userId)
      if (!tracksError && savedTracks?.length) {
        const restoredTracks: Record<string, TrackProgress> = { ...trackProgress }
        for (const row of savedTracks) restoredTracks[row.track_id] = { completed_lessons: row.completed_lessons ?? [], exam_score: row.exam_score ?? null, exam_passed: !!row.exam_passed }
        setTrackProgress(restoredTracks)
        localStorage.setItem(trackProgressKey, JSON.stringify(restoredTracks))
      } else if (!tracksError) {
        for (const [trackId, progress] of Object.entries(trackProgress)) {
          await supabase.from('track_progress').upsert({ user_id: userId, track_id: trackId, ...progress, updated_at: new Date().toISOString() }, { onConflict: 'user_id,track_id' })
        }
      }
      setAccountReady(true)
    } catch (error) {
      console.error('Account hydration failed', error)
      setAuthMessage('Login concluído, mas não consegui carregar seus dados. Confira as tabelas e políticas do Supabase.')
    }
  }
  const handleAuth = async (mode: 'signin' | 'signup') => {
    if (!supabase) return
    if (!authEmail.trim() || authPassword.length < 8) { setAuthMessage('Informe um e-mail e uma senha com pelo menos 8 caracteres.'); return }
    setAuthBusy(true); setAuthMessage('')
    try {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword })
        : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
      if (result.error) throw result.error
      if (result.data.user && result.data.session) {
        await syncProfile(result.data.user.id)
        await hydrateAccount(result.data.user.id)
        setAuthMessage(mode === 'signup' ? 'Conta criada. Seu perfil e preferências foram sincronizados.' : 'Login concluído. Seus dados foram carregados.')
      } else {
        setAuthMessage('Conta criada. Verifique seu e-mail para confirmar o cadastro e depois entre no aplicativo.')
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível autenticar. Verifique seus dados e tente novamente.')
    } finally { setAuthBusy(false) }
  }
  const handleSignOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    setAuthMessage(error ? error.message : 'Você saiu da conta. O modo demonstração continua disponível.')
  }
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat])
  useEffect(() => {
    document.documentElement.dataset.theme = darkTheme ? 'dark' : 'light'
    localStorage.setItem(themeKey, darkTheme ? 'dark' : 'light')
  }, [darkTheme])
  useEffect(() => {
    localStorage.setItem(dailyAgendaKey, JSON.stringify({ date: todayKey(), done: dailyChecks }))
  }, [dailyChecks])
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      if (data.session?.user.id) void hydrateAccount(data.session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      if (session?.user.id) void hydrateAccount(session.user.id)
      else setAccountReady(false)
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => () => { recognitionRef.current?.stop(); if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); mediaStreamRef.current?.getTracks().forEach(track => track.stop()); window.speechSynthesis?.cancel() }, [])
  const firstName = useMemo(() => greetingName(profile?.name ?? ''), [profile?.name])
  const todayLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date()).toUpperCase(), [])

  const recordAttempt = async (answer: string, index: number, correct: boolean) => {
    if (!supabase || !dailyActivity) return
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const { error } = await supabase.from('activity_attempts').insert({
      user_id: data.user.id,
      activity_type: 'multiple_choice',
      skill: dailyActivity.skill || 'speaking',
      interest_context: profile?.customInterest || profile?.interests.join(', '),
      prompt: dailyActivity.question,
      learner_answer: answer,
      correction: { correct_answer: dailyActivity.options[dailyActivity.correct_index], feedback: dailyActivity.feedback, selected_index: index },
      score: correct ? 100 : 0,
    })
    if (error) console.error('Activity attempt sync failed', error)
  }

  const evaluateOpenActivity = async () => {
    if (!dailyActivity || !openAnswer.trim() || evaluationBusy) return
    const localAnswer = openAnswer.trim()
    setEvaluationBusy(true)
    setActivityEvaluation(null)
    try {
      if (supabase) {
        const { data: session } = await supabase.auth.getSession()
        if (session.session?.access_token) {
          const { data, error } = await supabase.functions.invoke('tutor', {
            body: {
              mode: 'evaluate',
              message: localAnswer,
              activity: dailyActivity,
              profile,
              learningEvidence: { skillScores: learnerStats.skillScores, recentMistakes, previousInsights: learnerInsights.map(item => `${item.skill}: ${item.observation} → ${item.recommendation}`) },
            },
          })
          if (error) throw error
          const evaluation = data?.structured as ActivityEvaluation | undefined
          if (!evaluation || typeof evaluation.score !== 'number' || !evaluation.correction) throw new Error('Invalid activity evaluation')
          setActivityEvaluation(evaluation)
          setLessonDone(!!evaluation.is_acceptable)
          const userId = session.session.user.id
          const { error: attemptError } = await supabase.from('activity_attempts').insert({
            user_id: userId,
            activity_type: dailyActivity.activity_type || 'open_response',
            skill: dailyActivity.skill || 'speaking',
            interest_context: profile?.customInterest || profile?.interests.join(', '),
            prompt: dailyActivity.question,
            learner_answer: localAnswer,
            correction: evaluation,
            score: Math.max(0, Math.min(100, evaluation.score)),
          })
          if (attemptError) console.error('Open response attempt sync failed', attemptError)
          await supabase.from('learning_sessions').insert({ user_id: userId, activity_type: dailyActivity.skill === 'writing' ? 'writing' : 'lesson', duration_seconds: 240, score: evaluation.score, details: { title: dailyActivity.title, activity_type: dailyActivity.activity_type } })
          setLearnerStats(current => ({ ...current, totalMinutes: current.totalMinutes + 4, totalSessions: current.totalSessions + 1 }))
          return
        }
      }
      const words = localAnswer.split(/\s+/).filter(Boolean)
      const demoEvaluation = {
        score: Math.min(100, Math.max(15, Math.round(words.length * 5))),
        is_acceptable: words.length >= 5,
        improved_answer: localAnswer,
        correction: 'A avaliação inteligente exige uma conta autenticada e a função da Lumi ativa. Esta é apenas uma checagem local de tamanho; não é uma nota de inglês.',
        strengths: words.length >= 5 ? 'Você tentou construir uma resposta completa.' : 'Você começou a produzir uma resposta própria.',
        next_step: 'Conecte sua conta para receber correção gramatical e feedback contextual da Lumi.',
      }
      setActivityEvaluation(demoEvaluation)
      setLessonDone(demoEvaluation.is_acceptable)
    } catch (error) {
      console.error('Activity evaluation failed', error)
      setApiNotice('A avaliação da Lumi falhou. Revise a conexão e tente novamente.')
    } finally { setEvaluationBusy(false) }
  }

  const sendMessage = async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChat(current => [...current, { role: 'user', text }])
    setChatInput('')
    setApiNotice('')
    setChatLoading(true)
    try {
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session?.access_token) {
          const { data, error } = await supabase.functions.invoke('tutor', { body: { mode: 'conversation', message: text, history: chat.slice(-8), profile, learningEvidence: { skillScores: learnerStats.skillScores, recentMistakes, previousInsights: learnerInsights.map(item => `${item.skill}: ${item.observation} → ${item.recommendation}`) } } })
          if (error) throw error
          const reply = typeof data?.reply === 'string' ? data.reply : ''
          if (reply) {
            setChat(current => [...current, { role: 'assistant', text: reply, note: data?.correction }])
            await supabase.from('chat_messages').insert([
              { user_id: sessionData.session.user.id, role: 'user', content: text },
              { user_id: sessionData.session.user.id, role: 'assistant', content: reply, metadata: { ...(data?.correction ? { correction: data.correction } : {}), ...(data?.learning_insight ? { learning_insight: data.learning_insight } : {}) } },
            ])
            const insight = data?.learning_insight as Omit<LearnerInsight, 'id' | 'created_at'> | null
            if (insight?.observation && insight?.recommendation) {
              const { data: savedInsight, error: insightError } = await supabase.from('learner_insights').insert({ user_id: sessionData.session.user.id, skill: insight.skill || 'speaking', observation: insight.observation, recommendation: insight.recommendation, confidence: Math.max(0, Math.min(1, Number(insight.confidence) || 0)), evidence: { source: 'conversation' } }).select('id,skill,observation,recommendation,confidence,created_at').single()
              if (insightError) console.error('Learner insight sync failed', insightError)
              else if (savedInsight) setLearnerInsights(current => [savedInsight as LearnerInsight, ...current].slice(0, 5))
            }
            setChatLoading(false)
            return
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 650))
      const answer = demoReply(text, profile)
      setChat(current => [...current, { role: 'assistant', text: answer }])
      setApiNotice('Modo demonstração: para a Lumi responder com IA e salvar seu histórico, conecte sua conta FALA.')
    } catch (error) {
      console.error(error)
      setChat(current => [...current, { role: 'assistant', text: 'I had trouble connecting just now. Please try again in a moment.' }])
      setApiNotice('Não foi possível chamar o tutor. Verifique a conexão e as configurações do Supabase.')
    } finally { setChatLoading(false) }
  }

  const checkWriting = async () => {
    if (!writingText.trim()) return
    setWritingFeedback('Analisando seu texto...')
    if (!supabase) { setWritingFeedback('Prévia local: conecte a conta FALA para ativar a análise de IA. Enquanto isso, revise se cada frase tem sujeito, verbo e pontuação.'); return }
    {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session?.access_token) {
        try {
          const { data, error } = await supabase.functions.invoke('tutor', { body: { mode: 'writing', message: writingText, profile } })
          if (error) throw error
          if (data?.reply) setWritingFeedback(data.reply)
          const { data: userData } = await supabase.auth.getUser()
          if (userData.user) await supabase.from('learning_sessions').insert({ user_id: userData.user.id, activity_type: 'writing', duration_seconds: 240, details: { word_count: writingText.trim().split(/\s+/).length } })
        } catch (error) { console.error(error); setWritingFeedback('Não foi possível analisar agora. Verifique se a função tutor está implantada e tente novamente.') }
      }
    }
  }

  const startRecording = async () => {
    setTranscript('')
    setApiNotice('')
    const { data: activeSession } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    const backend = supabase
    if (backend && activeSession.session?.access_token && navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
        audioChunksRef.current = []
        const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
        const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined)
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = event => { if (event.data.size > 0) audioChunksRef.current.push(event.data) }
        recorder.onerror = () => {
          setRecording(false)
          setApiNotice('Não foi possível gravar o áudio. Confira a permissão do microfone e tente novamente.')
          stream.getTracks().forEach(track => track.stop())
        }
        recorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop())
          mediaStreamRef.current = null
          const mimeType = recorder.mimeType || 'audio/webm'
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          audioChunksRef.current = []
          if (!blob.size) { setApiNotice('Não recebemos áudio. Tente gravar novamente.'); return }
          setApiNotice('Enviando áudio para transcrição segura...')
          try {
            const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm'
            const form = new FormData()
            form.append('file', new File([blob], `fala-practice.${extension}`, { type: mimeType.split(';')[0] }))
            const { data, error } = await backend.functions.invoke('transcribe', { body: form })
            if (error) throw error
            if (typeof data?.text === 'string' && data.text.trim()) {
              setTranscript(data.text.trim())
              setApiNotice('Transcrição concluída. Isso reconhece palavras, mas não mede a pronúncia dos fonemas.')
              const { data: userData } = await backend.auth.getUser()
              if (userData.user) await backend.from('learning_sessions').insert({ user_id: userData.user.id, activity_type: 'speaking', duration_seconds: 120, details: { transcript: data.text.trim() } })
            } else {
              setApiNotice('Não conseguimos reconhecer palavras nesse áudio. Tente falar um pouco mais perto do microfone.')
            }
          } catch (error) {
            console.error(error)
            setApiNotice('A transcrição não foi concluída. Verifique o deploy da função transcribe e tente novamente.')
          }
        }
        recorder.start()
        setRecording(true)
        return
      } catch (error) {
        console.error(error)
        setApiNotice('Não foi possível acessar o microfone. Confira a permissão do navegador.')
        return
      }
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setApiNotice('Seu navegador não oferece reconhecimento de voz nesta tela. Use Chrome ou faça login para enviar o áudio ao serviço de transcrição.')
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = profile?.accent === 'uk' ? 'en-GB' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = event => { setTranscript(event.results[0][0].transcript); setRecording(false) }
    recognition.onerror = () => { setRecording(false); setApiNotice('Não conseguimos acessar o microfone. Confira a permissão do navegador.') }
    recognition.onend = () => setRecording(false)
    recognitionRef.current = recognition
    try { recognition.start(); setRecording(true) } catch { setRecording(false) }
  }
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
      return
    }
    recognitionRef.current?.stop()
    setRecording(false)
  }
  const saveWord = (word: string) => {
    setWords(current => current.includes(word) ? current : [...current, word])
    const backend = supabase
    if (backend) void backend.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { error } = await backend.from('vocabulary_items').upsert({ user_id: data.user.id, term: word, meaning: '' }, { onConflict: 'user_id,term' })
        if (error) console.error('Vocabulary sync failed', error)
      }
    })
  }
  const updateLearnerProfile = (updated: Profile) => {
    setProfile(updated)
    localStorage.setItem(profileKey, JSON.stringify(updated))
    if (supabase) void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) await saveProfile(data.user.id, updated)
    }).catch(error => console.error('Profile update sync failed', error))
  }

  const resetProfile = () => { localStorage.removeItem(profileKey); setProfile(null); setShowSettings(false) }

  const activeTrack = learningTracks.find(item => item.id === activeTrackId) ?? null
  const activeTrackProgress = activeTrack ? (trackProgress[activeTrack.id] ?? { completed_lessons: [], exam_score: null, exam_passed: false }) : { completed_lessons: [], exam_score: null, exam_passed: false }
  const activeTrackLesson = activeTrack ? activeTrack.lessons[trackLessonIndex] ?? null : null
  const recommendedTrack = learningTracks.find(item => item.goals.includes(profile?.goal ?? 'conversation')) ?? learningTracks[0]
  const musicSet = useMemo(() => profile ? readMusicSet(profile) : null, [profile])
  const dailyCompleteCount = dailyChecks.filter(Boolean).length

  const toggleDailyCheck = (index: number) => {
    const updated = [...dailyChecks]
    updated[index] = !updated[index]
    setDailyChecks(updated)
    localStorage.setItem(dailyAgendaKey, JSON.stringify({ date: todayKey(), done: updated }))
  }
  const updateTrackProgress = (trackId: string, nextProgress: TrackProgress) => {
    const updated = { ...trackProgress, [trackId]: nextProgress }
    setTrackProgress(updated)
    localStorage.setItem(trackProgressKey, JSON.stringify(updated))
    const backend = supabase
    if (backend) void backend.auth.getUser().then(({ data }) => {
      if (data.user) return backend.from('track_progress').upsert({
        user_id: data.user.id, track_id: trackId, ...nextProgress, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,track_id' })
    }).then(result => { if (result?.error) console.error('Track progress sync failed', result.error) })
  }
  const openTrack = (trackId: string) => {
    setActiveTrackId(trackId); setTrackMode('overview'); setTrackFeedback('')
    setTrackEvaluation(null); setTrackExamAnswers({}); setTrackExamScore(null)
  }
  const startTrackLesson = (index: number) => {
    setTrackLessonIndex(index); setTrackMode('lesson'); setTrackChoice(null)
    setTrackResponse(''); setTrackFeedback(''); setTrackEvaluation(null); setTranscript('')
  }
  const completeTrackLesson = async () => {
    if (!activeTrack) return
    const lesson = activeTrack.lessons[trackLessonIndex]
    if (lesson.kind === 'choice') {
      if (trackChoice === null) { setTrackFeedback('Escolha uma resposta para continuar.'); return }
      if (trackChoice !== lesson.correct_index) { setTrackFeedback('Ainda não. Releia a situação e tente outra opção.'); return }
    } else {
      const answer = lesson.kind === 'speak' ? (transcript.trim() || trackResponse.trim()) : trackResponse.trim()
      if (lesson.kind === 'speak' && !answer) { setTrackFeedback('Grave sua tentativa ou digite uma resposta para continuar.'); return }
      if (lesson.kind === 'write' && answer.split(/\s+/).filter(Boolean).length < 5) { setTrackFeedback('Escreva pelo menos cinco palavras para praticar uma resposta completa.'); return }
      const backend = supabase
      if (backend) {
        const { data: session } = await backend.auth.getSession()
        if (session.session?.access_token) {
          setTrackBusy(true); setTrackFeedback('A Lumi está avaliando esta resposta...')
          try {
            const { data, error } = await backend.functions.invoke('tutor', { body: {
              mode: 'evaluate', message: answer,
              activity: { activity_type: lesson.kind === 'speak' ? 'roleplay' : 'complete_sentence', title: lesson.title, question: lesson.question, expected_answer: lesson.expected_answer || lesson.target_phrase, target_phrase: lesson.target_phrase, context: lesson.scenario },
              profile, learningEvidence: { skillScores: learnerStats.skillScores, recentMistakes, previousInsights: learnerInsights.map(item => item.observation) },
            } })
            if (error) throw error
            const evaluation = data?.structured as ActivityEvaluation | undefined
            if (!evaluation || typeof evaluation.score !== 'number') throw new Error('Invalid evaluation')
            setTrackEvaluation(evaluation)
            if (evaluation.score < 55) { setTrackFeedback('Revise a correção da Lumi e tente novamente. A etapa ainda não foi liberada.'); return }
            await backend.from('activity_attempts').insert({
              user_id: session.session.user.id, activity_type: lesson.kind, skill: lesson.kind === 'write' ? 'writing' : 'speaking',
              interest_context: activeTrack.title, prompt: lesson.question, learner_answer: answer, correction: evaluation, score: evaluation.score,
            })
            await backend.from('learning_sessions').insert({ user_id: session.session.user.id, activity_type: lesson.kind === 'write' ? 'writing' : 'speaking', duration_seconds: 240, score: evaluation.score, details: { track_id: activeTrack.id, lesson: lesson.title } })
          } catch (error) {
            console.error('Track lesson evaluation failed', error)
            setTrackFeedback('A avaliação da Lumi falhou. Você pode tentar novamente ou concluir a prática sem nota no modo local.')
            return
          } finally { setTrackBusy(false) }
        } else {
          setTrackFeedback('Prática local: a resposta foi feita, mas a correção detalhada exige uma conta conectada.')
        }
      } else {
        setTrackFeedback('Prática local concluída. A correção automática será ativada quando a conta e a IA estiverem conectadas.')
      }
    }
    const completed = [...new Set([...activeTrackProgress.completed_lessons, trackLessonIndex])].sort((a,b)=>a-b)
    updateTrackProgress(activeTrack.id, { ...activeTrackProgress, completed_lessons: completed })
    const backendForSession = supabase
    if (backendForSession) void backendForSession.auth.getUser().then(({ data }) => {
      if (data.user) return backendForSession.from('learning_sessions').insert({ user_id: data.user.id, activity_type: 'lesson', duration_seconds: 240, details: { track_id: activeTrack.id, lesson: lesson.title } })
    })
    setTrackMode('overview')
  }
  const submitTrackExam = () => {
    if (!activeTrack) return
    if (Object.keys(trackExamAnswers).length !== activeTrack.exam.length) { setTrackFeedback('Responda às cinco questões antes de enviar a mini prova.'); return }
    const correct = activeTrack.exam.filter((item,index) => trackExamAnswers[index] === item.correct_index).length
    const score = Math.round(correct / activeTrack.exam.length * 100)
    setTrackExamScore(score)
    const passed = score >= 70
    updateTrackProgress(activeTrack.id, { ...activeTrackProgress, exam_score: score, exam_passed: passed })
    setTrackFeedback(passed ? 'Módulo concluído. Você atingiu o mínimo de 70% nesta mini prova.' : 'Você ainda não atingiu 70%. Revise as etapas e tente novamente.')
    if (supabase) void supabase.auth.getUser().then(({ data }) => {
      if (data.user) return supabase.from('learning_sessions').insert({ user_id: data.user.id, activity_type: 'lesson', duration_seconds: 300, score, details: { track_id: activeTrack.id, exam: true } })
    })
  }
  const analyzeWritingPhoto = async () => {
    if (!writingPhoto) { setWritingPhotoFeedback('Escolha ou fotografe uma página do seu exercício primeiro.'); return }
    const backend = supabase
    if (!backend) { setWritingPhotoFeedback('A análise por imagem exige a conta conectada e a função da Lumi implantada.'); return }
    const { data: session } = await backend.auth.getSession()
    if (!session.session?.access_token) { setWritingPhotoFeedback('Entre na sua conta para enviar a foto com segurança à Lumi.'); return }
    setPhotoBusy(true); setWritingPhotoFeedback('Preparando a imagem e enviando para análise segura...')
    try {
      if (!['image/jpeg','image/png','image/webp'].includes(writingPhoto.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP. Converta fotos HEIC para JPG antes de enviar.')
      const bitmap = await createImageBitmap(writingPhoto)
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Falha ao comprimir a foto.')), 'image/jpeg', 0.84))
      const imageDataUrl = await new Promise<string>((resolve,reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Falha ao ler a imagem.'))
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'))
        reader.readAsDataURL(blob)
      })
      const { data, error } = await backend.functions.invoke('tutor', { body: { mode:'writing_image', imageDataUrl, profile, message: writingText.trim() } })
      if (error) throw error
      if (typeof data?.reply !== 'string' || !data.reply.trim()) throw new Error('A Lumi não retornou uma análise válida.')
      setWritingPhotoFeedback(data.reply)
      await backend.from('learning_sessions').insert({ user_id: session.session.user.id, activity_type:'writing', duration_seconds:300, details:{ source:'photo', mime_type:'image/jpeg' } })
    } catch (error) {
      console.error('Photo writing analysis failed', error)
      setWritingPhotoFeedback(error instanceof Error ? error.message : 'Não foi possível analisar a foto. Tente outra imagem, com melhor iluminação e foco.')
    } finally { setPhotoBusy(false) }
  }

  if (!profile) return <Onboarding onComplete={completeOnboarding} />

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">f.</span><span>fala<span className="brand-light">english</span></span></div>
      <div className="sidebar-section-label">SEU ESPAÇO</div>
      <nav className="main-nav">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'speak' && <span className="nav-dot" />}</button> })}</nav>
      <div className="sidebar-bottom">
        <div className="streak-card"><div className="streak-top"><span className="streak-icon"><Flame size={17} /></span><span className="streak-count">{learnerStats.activeDays} dias ativos</span></div><strong>Você está criando ritmo.</strong><span>Mais um pouco hoje mantém sua sequência.</span><div className="streak-days">{['S','T','Q','Q','S','S','D'].map((day, index) => <span key={index} className={(learnerStats.weeklyMinutes[index] || 0) > 0 ? 'done' : ''}>{(learnerStats.weeklyMinutes[index] || 0) > 0 ? <Check size={12} /> : day}</span>)}</div></div>
        <button className="profile-button" onClick={() => setShowSettings(true)}><span className="avatar">{firstName.slice(0, 1).toUpperCase()}</span><span className="profile-meta"><strong>{profile.name || 'Meu perfil'}</strong><small>{userEmail && accountReady ? 'Dados sincronizados' : 'Plano pessoal'}</small></span><Settings2 size={17} /></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="mobile-brand brand"><span className="brand-mark">f.</span><span>fala<span className="brand-light">english</span></span></div><div className="breadcrumb">FALA <ChevronRight size={13} /> <span>{navItems.find(item => item.id === page)?.label}</span></div><div className="topbar-right"><span className="level-pill"><span className="level-dot" /> {levelLabels[profile.level]}</span><button className="icon-button" onClick={() => setDarkTheme(value=>!value)} aria-label={darkTheme ? 'Ativar tema claro' : 'Ativar tema escuro'} title={darkTheme ? 'Tema claro' : 'Tema escuro'}>{darkTheme ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Configurações"><Settings2 size={18} /></button></div></header>
      <div className="content-wrap">
        {page === 'home' && <>
          <div className="welcome-row"><div><div className="eyebrow muted">{todayLabel} · SUA ROTINA DE INGLÊS</div><h1>Olá, {firstName}. <em>Vamos praticar?</em></h1><p>Um passo de cada vez. Hoje, foque no que você quer conseguir falar.</p></div><div className="daily-target"><span className="target-icon"><Target size={19} /></span><span><small>SUA META DIÁRIA</small><strong>{profile.minutes} minutos</strong></span></div></div>
          <section className="hero-practice"><div className="hero-copy"><div className="hero-tag"><Sparkles size={13} /> SUGERIDO PARA VOCÊ</div><h2>Seu inglês precisa<br />sair do papel.</h2><p>A Lumi transforma seus interesses em situações reais, acompanha suas dificuldades e adapta o próximo passo.</p><div className="hero-actions"><button className="primary-button" onClick={() => setPage('learn')}>Começar prática <ArrowRight size={17} /></button><span className="duration"><Clock3 size={14} /> {profile.minutes} min</span></div></div><div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="chat-bubble bubble-a">How was your day?</div><div className="voice-visual"><AudioLines size={48} strokeWidth={1.2} /></div><div className="chat-bubble bubble-b">Pretty good, thanks!</div><span className="visual-caption">SPEAK · LISTEN · LEARN</span></div></section>
          <section className="panel daily-agenda-panel">
            <div className="panel-heading"><div><span className="eyebrow muted">ROTINA DE HOJE</span><h3>Três passos para usar inglês de verdade</h3></div><span className="panel-badge">{dailyCompleteCount}/3 concluídos</span></div>
            <div className="daily-agenda-progress"><i style={{width:(dailyCompleteCount/3*100)+'%'}}/></div>
            <div className="daily-agenda-grid">{dailySteps.map((step,index)=>{const Icon=step.icon;return <article className={'daily-agenda-step'+(dailyChecks[index]?' done':'')} key={step.title}><div className="daily-step-top"><span className="daily-step-icon"><Icon size={17}/></span><small>{step.minutes} MIN</small></div><strong>{step.title}</strong><p>{step.detail}</p><div className="daily-step-actions"><button className="text-link" onClick={()=>{if(index===1)openTrack(recommendedTrack.id);setPage(step.page)}}>{index===1?'Abrir trilha':'Começar'} <ArrowRight size={13}/></button><button className="daily-check-button" onClick={()=>toggleDailyCheck(index)}>{dailyChecks[index]?<CheckCircle2 size={16}/>:<Check size={16}/>} {dailyChecks[index]?'Feito':'Marcar feito'}</button></div></article>})}</div>
          </section>
          <section className="panel lumi-plan-card">
            <div className="lumi-card-avatar lumi-mascot" aria-label="Lumi"><span>L</span><i /></div>
            <div className="lumi-card-content"><span className="eyebrow muted">A LUMI PERSONALIZOU PARA VOCÊ</span><h3>{dailyActivity?.title || `Sua trilha começa com ${profile.interests[0] || 'seus objetivos'}`}</h3><p>{planSummary || `Vamos praticar inglês usando temas como ${profile.customInterest || profile.interests.join(', ') || 'situações reais'}.`}</p><div className="interest-chips">{profile.interests.slice(0,4).map(item=><span key={item}>{interestOptions.find(x=>x.id===item)?.title || item}</span>)}{profile.customInterest && <span>{profile.customInterest}</span>}</div></div>
            <div className="lumi-card-actions"><button className="primary-button" onClick={() => setPage('learn')}>Fazer atividade <ArrowRight size={15}/></button><button className="text-link" disabled={activityBusy} onClick={() => void generateActivity(profile)}>{activityBusy ? 'Criando...' : 'Gerar outra' } <RotateCcw size={13}/></button></div>
          </section>
          {learningPlan?.weeks?.length ? <section className="panel roadmap-panel"><div className="panel-heading"><div><span className="eyebrow muted">SUA TRILHA ADAPTATIVA</span><h3>{learningPlan.headline}</h3></div><span className="panel-badge">3 etapas</span></div><p className="roadmap-today"><Sparkles size={15}/><span><strong>Hoje:</strong> {learningPlan.today}</span></p><div className="roadmap-grid">{learningPlan.weeks.slice(0,3).map((week,index)=><article className="roadmap-step" key={`${week.period}-${index}`}><span className="roadmap-step-index">0{index+1}</span><small>{week.period}</small><strong>{week.objective}</strong><p>{week.practice}</p></article>)}</div><div className="roadmap-footer"><span><Target size={14}/> {learningPlan.success_metric}</span><span>{learningPlan.adaptation_note}</span></div></section> : null}
          {learnerInsights.length ? <section className="panel insight-panel"><div className="insight-badge"><Sparkles size={17}/></div><div className="insight-copy"><span className="eyebrow muted">OBSERVAÇÃO DA LUMI · HIPÓTESE DE APRENDIZAGEM</span><h3>{learnerInsights[0].observation}</h3><p>{learnerInsights[0].recommendation}</p><small>Confiança estimada pela IA: {Math.round(learnerInsights[0].confidence * 100)}%. Você pode corrigir essa leitura conversando com a Lumi.</small></div><button className="text-link" onClick={() => setPage('speak')}>Praticar <ArrowRight size={14}/></button></section> : null}
          <div className="section-heading"><div><span className="eyebrow muted">SEU DESENVOLVIMENTO</span><h2>O que vamos fortalecer</h2></div><button className="text-link" onClick={() => setPage('progress')}>Ver progresso <ArrowRight size={15} /></button></div>
          <div className="skills-grid">{[{name:'Conversação',sub:'Fale com mais naturalidade',icon:MessageCircle,value:learnerStats.skillScores.speaking ?? 0,color:'lavender'},{name:'Compreensão',sub:'Entenda o inglês falado',icon:Headphones,value:learnerStats.skillScores.listening ?? 0,color:'mint'},{name:'Vocabulário',sub:`${words.length} expressões salvas`,icon:Bookmark,value:learnerStats.skillScores.vocabulary ?? 0,color:'peach'},{name:'Escrita',sub:'Monte frases mais claras',icon:Languages,value:learnerStats.skillScores.writing ?? 0,color:'blue'}].map(skill => { const Icon = skill.icon; return <button className="skill-card" key={skill.name} onClick={() => setPage(skill.name === 'Conversação' || skill.name === 'Compreensão' ? 'speak' : skill.name === 'Escrita' ? 'write' : 'vocabulary')}><span className={`skill-icon ${skill.color}`}><Icon size={19} /></span><span className="skill-name">{skill.name}</span><span className="skill-sub">{skill.value ? `${skill.value}% de acerto médio` : 'Ainda sem dados suficientes'}</span><span className="skill-progress"><i style={{ width: `${skill.value}%` }} /></span></button> })}</div>
          <div className="bottom-grid"><section className="panel weekly-panel"><div className="panel-heading"><div><span className="eyebrow muted">CONSISTÊNCIA</span><h3>Seu ritmo nesta semana</h3></div><span className="panel-badge">seus dados</span></div><div className="weekly-chart">{['S','T','Q','Q','S','S','D'].map((day,index)=>{const value=learnerStats.weeklyMinutes[index] || 0;const max=Math.max(profile.minutes, ...learnerStats.weeklyMinutes, 1);return <div className="chart-day" key={index}><div className="chart-track"><span style={{height:`${Math.max(value ? 7 : 0, Math.min(100, value/max*100))}%`}} /></div><small>{day}</small></div>})}</div><div className="chart-footer"><span><i className="legend-dot" /> Minutos de prática</span><strong>{learnerStats.totalMinutes} min <small>nos últimos 7 dias</small></strong></div></section>
          <section className="panel review-panel"><div className="panel-heading"><div><span className="eyebrow muted">REVISÃO INTELIGENTE</span><h3>Vale lembrar</h3></div><span className="review-count">{words.length.toString().padStart(2,'0')}</span></div><div className="review-word"><div><strong>actually</strong><span>na verdade · de fato</span></div><button className="sound-button" onClick={() => speakText('Actually', profile.accent)}><Volume2 size={17} /></button></div><div className="review-word"><div><strong>figure out</strong><span>descobrir · entender</span></div><button className="sound-button" onClick={() => speakText('Figure out', profile.accent)}><Volume2 size={17} /></button></div><button className="text-link review-link" onClick={() => setPage('vocabulary')}>Revisar palavras <ArrowRight size={15} /></button></section></div>
        </>}

        {page === 'tracks' && <>
          <div className="page-intro"><span className="eyebrow muted">TRILHAS · SITUAÇÕES DO MUNDO REAL</span><h1>Aprenda para <em>conseguir fazer.</em></h1><p>Escolha uma missão. Cada módulo tem quatro etapas práticas e uma mini prova final. Você precisa atingir 70% para concluir.</p></div>
          {!activeTrack ? <div className="track-catalog-grid">{learningTracks.map(track=>{const Icon=track.icon;const progress=trackProgress[track.id]??{completed_lessons:[],exam_score:null,exam_passed:false};const isRecommended=track.goals.includes(profile.goal)||track.interests.some(item=>profile.interests.includes(item));return <article className="panel track-catalog-card" key={track.id}><div className="track-card-top"><span className="track-card-icon"><Icon size={21}/></span><span className="track-category">{track.category}</span></div><h3>{track.title}</h3><p>{track.description}</p><div className="track-meta"><span><Clock3 size={13}/> {track.minutes} min</span><span>{track.level}</span></div><div className="track-progress-row"><span>{progress.completed_lessons.length}/4 etapas</span><strong>{progress.exam_passed?'Concluído':progress.completed_lessons.length===4?'Mini prova liberada':'Em andamento'}</strong></div><div className="track-progress"><i style={{width:(progress.completed_lessons.length/4*100)+'%'}}/></div><button className="primary-button" onClick={()=>openTrack(track.id)}>{progress.exam_passed?'Revisar módulo':progress.completed_lessons.length===4?'Fazer mini prova':'Abrir trilha'} <ArrowRight size={15}/></button>{isRecommended&&<span className="track-recommended"><Sparkles size={12}/> Combina com seu objetivo ou interesses</span>}</article>})}</div>
          : <div className="track-detail-wrap">
            <button className="text-link track-back" onClick={()=>{setActiveTrackId(null);setTrackMode('overview')}}><ArrowLeft size={15}/> Todas as trilhas</button>
            <section className="panel track-detail-panel">
              <div className="track-detail-heading"><div><span className="eyebrow muted">{activeTrack.category}</span><h2>{activeTrack.title}</h2><p>{activeTrack.description}</p></div><span className="track-detail-icon">{(() => {const Icon=activeTrack.icon;return <Icon size={27}/>})()}</span></div>
              <div className="track-progress-row"><span>{activeTrackProgress.completed_lessons.length} de {activeTrack.lessons.length} etapas práticas</span><strong>{activeTrackProgress.exam_passed?'Módulo concluído':activeTrackProgress.exam_score!==null?'Última prova: '+activeTrackProgress.exam_score+'%':'Meta da prova: 70%'}</strong></div>
              <div className="track-progress"><i style={{width:(activeTrackProgress.completed_lessons.length/activeTrack.lessons.length*100)+'%'}}/></div>
              {trackMode==='overview' && <>
                <div className="track-lesson-list">{activeTrack.lessons.map((lesson,index)=>{const done=activeTrackProgress.completed_lessons.includes(index);const unlocked=done||index<=activeTrackProgress.completed_lessons.length;const Icon=lesson.kind==='choice'?ClipboardCheck:lesson.kind==='write'?Languages:Mic;return <button className={'track-lesson-row'+(done?' completed':'')+(unlocked?'':' locked')} key={lesson.title} disabled={!unlocked} onClick={()=>startTrackLesson(index)}><span className="track-lesson-number">{done?<CheckCircle2 size={17}/>:String(index+1).padStart(2,'0')}</span><span className="track-lesson-copy"><strong>{lesson.title}</strong><small>{lesson.kind==='choice'?'Escolha e compreensão':lesson.kind==='write'?'Resposta escrita':'Fala e repetição'}</small></span><Icon size={17}/><ChevronRight size={16}/></button>})}</div>
                <div className="track-challenge-extra"><div><span className="eyebrow muted">APRENDIZADO ADAPTATIVO</span><strong>Quer ir além do roteiro?</strong><small>A Lumi pode criar uma atividade extra usando este módulo, seu nível e seus erros recentes.</small></div><button className="secondary-button" onClick={()=>{void generateActivity(profile,activeTrack.title+' · '+activeTrack.description);setPage('learn')}} disabled={activityBusy}>{activityBusy?'Criando desafio...':'Criar desafio com a Lumi'} <WandSparkles size={14}/></button></div>
                {activeTrackProgress.completed_lessons.length===activeTrack.lessons.length&&!activeTrackProgress.exam_passed&&<div className="track-exam-callout"><div><span className="eyebrow muted">ETAPA FINAL</span><h3>Você concluiu as atividades práticas.</h3><p>Agora faça a mini prova de cinco questões. É necessário acertar pelo menos 70% para concluir o módulo.</p></div><button className="primary-button" onClick={()=>{setTrackMode('exam');setTrackExamAnswers({});setTrackExamScore(null);setTrackFeedback('')}}><Trophy size={16}/> Começar mini prova</button></div>}
                {activeTrackProgress.exam_passed&&<div className="track-passed-callout"><Trophy size={20}/><div><strong>Módulo concluído</strong><span>Melhor resultado: {activeTrackProgress.exam_score}%. Você pode revisar as etapas quando quiser.</span></div></div>}
              </>}
              {trackMode==='lesson'&&activeTrackLesson&&<div className="track-active-lesson">
                <button className="text-link" onClick={()=>setTrackMode('overview')}><ArrowLeft size={14}/> Voltar às etapas</button>
                <div className="track-lesson-progress-label">ETAPA {trackLessonIndex+1} DE {activeTrack.lessons.length} · {activeTrackLesson.kind==='choice'?'COMPREENSÃO':activeTrackLesson.kind==='write'?'ESCRITA':'FALA'}</div>
                <h3>{activeTrackLesson.title}</h3><p className="track-scenario">{activeTrackLesson.scenario}</p>
                <div className="track-phrase-box"><div><small>EXPRESSÃO-CHAVE</small><h2>{activeTrackLesson.target_phrase}</h2><p>{activeTrackLesson.translation}</p></div><button className="sound-button large" onClick={()=>speakText(activeTrackLesson.target_phrase,profile.accent)} aria-label="Ouvir expressão"><Volume2 size={19}/></button></div>
                <div className="field-label">{activeTrackLesson.question}</div>
                {activeTrackLesson.kind==='choice'?<div className="answer-options">{(activeTrackLesson.options??[]).map((option,index)=><button className={'answer-option'+(trackChoice===index?(index===activeTrackLesson.correct_index?' correct':' incorrect'):'')} key={option} onClick={()=>{setTrackChoice(index);setTrackFeedback(index===activeTrackLesson.correct_index?'Correto. Você escolheu a resposta adequada ao contexto.':'Essa opção não é a melhor para a situação. Tente novamente.')}}><span>{String.fromCharCode(65+index)}</span>{option}{trackChoice===index&&(index===activeTrackLesson.correct_index?<CheckCircle2 size={17}/>:<X size={17}/>)}</button>)}</div>
                : activeTrackLesson.kind==='write'?<textarea className="track-response-area" value={trackResponse} onChange={e=>{setTrackResponse(e.target.value);setTrackEvaluation(null);setTrackFeedback('')}} rows={4} placeholder={activeTrackLesson.input_hint||'Escreva sua resposta em inglês...'}/>
                : <div className="track-speaking-card"><p>1. Ouça o exemplo. 2. Repita em voz alta. 3. Grave sua tentativa para comparar o texto reconhecido. Sem microfone, você pode digitar a frase.</p><button className="listen-button" onClick={()=>speakText(activeTrackLesson.target_phrase,profile.accent)}><Volume2 size={16}/> Ouvir exemplo</button><button className={'record-button'+(recording?' recording':'')} onClick={recording?stopRecording:()=>void startRecording()}>{recording?<MicOff size={20}/>:<Mic size={20}/>}<span>{recording?'Parar gravação':'Gravar minha fala'}</span></button>{transcript&&<div className="track-transcript"><small>TRANSCRIÇÃO RECONHECIDA</small><p>{transcript}</p></div>}<textarea className="track-response-area" value={trackResponse} onChange={e=>setTrackResponse(e.target.value)} rows={2} placeholder="Ou digite sua tentativa em inglês..."/><small className="muted">A transcrição compara palavras; não mede afinação nem precisão fonética.</small></div>}
                {trackEvaluation&&<div className="answer-feedback success"><strong>Feedback da Lumi · {trackEvaluation.score}/100</strong><p>{trackEvaluation.strengths}</p><p><b>Correção:</b> {trackEvaluation.correction}</p><p><b>Versão mais natural:</b> {trackEvaluation.improved_answer}</p><p><b>Próximo passo:</b> {trackEvaluation.next_step}</p></div>}
                {trackFeedback&&<div className="answer-feedback">{trackFeedback}</div>}
                <div className="track-lesson-actions"><span>{activeTrackLesson.kind==='choice'?'Uma resposta correta libera a etapa.':'Faça sua tentativa para liberar a etapa.'}</span><button className="primary-button" onClick={()=>void completeTrackLesson()} disabled={trackBusy||(activeTrackLesson.kind==='choice'?trackChoice===null:activeTrackLesson.kind==='write'?trackResponse.trim().split(/\s+/).filter(Boolean).length<5:!transcript.trim()&&trackResponse.trim().split(/\s+/).filter(Boolean).length<5)}>{trackBusy?'Lumi está avaliando...':'Concluir etapa'} <ArrowRight size={15}/></button></div>
              </div>}
              {trackMode==='exam'&&<div className="track-exam-panel"><div className="track-exam-intro"><span className="eyebrow muted">MINI PROVA · {activeTrack.exam.length} QUESTÕES</span><h3>Vamos consolidar o que você praticou.</h3><p>Responda sem consultar as etapas. Você precisa de 70% para concluir este módulo.</p></div>{activeTrack.exam.map((question,index)=><div className="track-exam-question" key={question.question}><strong>{index+1}. {question.question}</strong><div className="exam-options">{question.options.map((option,optionIndex)=><button className={trackExamAnswers[index]===optionIndex?'selected':''} key={option} onClick={()=>setTrackExamAnswers(current=>({...current,[index]:optionIndex}))}>{String.fromCharCode(65+optionIndex)} · {option}</button>)}</div>{trackExamScore!==null&&<p className="exam-explanation"><b>{trackExamAnswers[index]===question.correct_index?'Correto.':'Revisão: '}</b>{question.explanation}</p>}</div>)}{trackFeedback&&<div className={'track-passed-callout'+(trackExamScore!==null&&trackExamScore<70?' exam-failed':'')}><Trophy size={20}/><div><strong>{trackExamScore===null?'':trackExamScore>=70?'Aprovado':'Ainda não aprovado'}</strong><span>{trackFeedback}</span></div></div>}<div className="track-lesson-actions"><span>{Object.keys(trackExamAnswers).length}/{activeTrack.exam.length} respostas marcadas</span><button className="primary-button" onClick={submitTrackExam} disabled={Object.keys(trackExamAnswers).length!==activeTrack.exam.length}>Corrigir mini prova <CheckCheck size={16}/></button></div>{trackExamScore!==null&&trackExamScore<70&&<button className="secondary-button" onClick={()=>{setTrackExamAnswers({});setTrackExamScore(null);setTrackFeedback('')}}>Tentar novamente</button>}</div>}
            </section>
          </div>}
        </>}

        {page === 'learn' && <>
          <div className="page-intro"><span className="eyebrow muted">APRENDER · ATIVIDADE PERSONALIZADA</span><h1>Inglês no seu <em>universo.</em></h1><p>A Lumi usa seus interesses e seu objetivo para criar situações novas, não só repetir exercícios.</p></div>
          <div className="lesson-layout"><section className="panel lesson-panel"><div className="lesson-progress-row"><span>{dailyActivity?.skill?.toUpperCase() || 'PRÁTICA'} · CONTEXTO REAL</span><span>{activityBusy ? 'CRIANDO...' : 'PERSONALIZADO'}</span></div><div className="lesson-progress"><i style={{width: lessonDone ? '100%' : '35%'}} /></div><div className="lesson-content"><span className="lesson-kicker">{dailyActivity?.title || 'Atividade da Lumi'}</span><div className="phrase-row"><h2>{dailyActivity?.target_phrase || 'How can I help you today?'}</h2><button className="sound-button large" onClick={() => speakText(dailyActivity?.target_phrase || 'How can I help you today?', profile.accent)}><Volume2 size={20}/></button></div><p className="translation">{dailyActivity?.translation || 'Como posso ajudar você hoje?'}</p><div className="explanation"><Lightbulb size={17}/><div><strong>Por que isso é útil</strong><span>{dailyActivity?.explanation || 'Observe a estrutura, ouça a frase e tente reutilizá-la com suas próprias palavras.'}</span></div></div><div className="field-label">{dailyActivity?.question || 'Escolha a resposta que mantém a conversa:'}</div>{dailyActivity?.activity_type === 'complete_sentence' || dailyActivity?.activity_type === 'roleplay' || dailyActivity?.activity_type === 'translation' ? <div className="open-activity"><textarea value={openAnswer} onChange={e=>{setOpenAnswer(e.target.value);setActivityEvaluation(null);setLessonDone(false)}} placeholder={dailyActivity.input_hint || 'Escreva sua resposta em inglês...'} rows={3} disabled={!!activityEvaluation?.is_acceptable}/><div className="open-activity-actions"><span>{openAnswer.trim().split(/\s+/).filter(Boolean).length} palavras · responda com suas próprias palavras</span><button className="primary-button" onClick={() => void evaluateOpenActivity()} disabled={!openAnswer.trim() || evaluationBusy || !!activityEvaluation?.is_acceptable}>{evaluationBusy ? 'Lumi está analisando...' : 'Enviar para a Lumi'} <ArrowRight size={15}/></button></div>{activityEvaluation && <div className={`answer-feedback ${activityEvaluation.is_acceptable ? 'success' : 'try-again'}`}><strong>{activityEvaluation.is_acceptable ? 'Boa construção' : 'Vamos melhorar um ponto'}</strong><p>{activityEvaluation.strengths}</p><p><b>Uma versão mais natural:</b> {activityEvaluation.improved_answer}</p><p><b>Correção:</b> {activityEvaluation.correction}</p><p><b>Próximo passo:</b> {activityEvaluation.next_step}</p><span className="muted">Avaliação orientativa: {activityEvaluation.score}/100</span></div>}</div> : <><div className="answer-options">{(dailyActivity?.options || ['Could you tell me more?', 'I am agree.', 'I like very much.']).map((answer,index)=><button key={`${answer}-${index}`} className={`answer-option ${quizAnswer === answer ? (index === (dailyActivity?.correct_index ?? 0) ? 'correct' : 'incorrect') : ''}`} onClick={() => {setQuizAnswer(answer);const correct=index === (dailyActivity?.correct_index ?? 0);if(correct) setLessonDone(true);void recordAttempt(answer,index,correct)}} disabled={lessonDone || !!quizAnswer}><span>{String.fromCharCode(65+index)}</span>{answer}{quizAnswer === answer && (index === (dailyActivity?.correct_index ?? 0) ? <CheckCircle2 size={17}/> : <X size={17}/>)}</button>)}</div>{quizAnswer && <div className={`answer-feedback ${quizAnswer === (dailyActivity?.options?.[dailyActivity?.correct_index ?? 0] ?? '') ? 'success' : 'try-again'}`}>{quizAnswer === (dailyActivity?.options?.[dailyActivity?.correct_index ?? 0] ?? '') ? (dailyActivity?.feedback || 'Boa resposta. Agora tente usar a estrutura em uma frase sua.') : 'Ainda não. Compare as opções e pense em qual delas soa mais natural neste contexto. ' + (dailyActivity?.feedback || '')}</div>}</>}<div className="lesson-bottom"><span><Clock3 size={14}/> 4–6 min</span><button className="primary-button" disabled={dailyActivity?.activity_type === 'complete_sentence' || dailyActivity?.activity_type === 'roleplay' || dailyActivity?.activity_type === 'translation' ? !activityEvaluation?.is_acceptable : !quizAnswer} onClick={() => {if(lessonDone || !!activityEvaluation?.is_acceptable){const backend=supabase;if(backend) void backend.auth.getUser().then(({data})=>{if(data.user) return backend.from('learning_sessions').insert({user_id:data.user.id,activity_type:'lesson',duration_seconds:300,score:100,details:{title:dailyActivity?.title,skill:dailyActivity?.skill,interest:profile.interests}})});setPage('speak');setQuizAnswer(null)}else setQuizAnswer(null)}}>{(lessonDone || activityEvaluation?.is_acceptable) ? 'Praticar falando' : (dailyActivity?.activity_type === 'complete_sentence' || dailyActivity?.activity_type === 'roleplay' || dailyActivity?.activity_type === 'translation') ? (activityEvaluation ? 'Continue a atividade' : 'Escreva sua resposta acima') : quizAnswer ? 'Tentar novamente' : 'Escolha uma resposta'} <ArrowRight size={16}/></button></div></div></section><aside className="panel lesson-side"><span className="eyebrow muted">SUA PERSONALIZAÇÃO</span><h3>{profile.customInterest || interestOptions.find(item=>item.id===profile.interests[0])?.title || goalOptions.find(item=>item.id===profile.goal)?.title}</h3><p>A Lumi conecta o assunto aos seus interesses e faz você reutilizar a mesma estrutura em situações diferentes.</p><div className="side-divider"/><span className="eyebrow muted">PRÓXIMO PASSO</span><div className="path-item active"><span>01</span><div><strong>Entender a expressão</strong><small>Você está aqui</small></div></div><div className="path-item"><span>02</span><div><strong>Responder com suas palavras</strong><small>Prática ativa</small></div></div><div className="path-item"><span>03</span><div><strong>Usar em uma conversa</strong><small>Transferir para a vida real</small></div></div><button className="text-link" disabled={activityBusy} onClick={()=>void generateActivity(profile)}>{activityBusy?'Criando outra atividade...':'Criar nova atividade'} <WandSparkles size={14}/></button></aside></div>
        </>}

        {page === 'speak' && <>
          <div className="page-intro"><span className="eyebrow muted">FALAR · SPEAKING LAB</span><h1>Solte a voz. <em>Sem medo de errar.</em></h1><p>Treine uma frase e depois converse sobre um assunto real.</p></div>
          <div className="speak-grid"><section className="panel pronunciation-panel"><div className="panel-heading"><div><span className="eyebrow muted">TREINO DE FALA</span><h3>Repita em voz alta</h3></div><span className="level-pill">{profile.accent === 'us' ? 'Inglês americano' : 'Inglês britânico'}</span></div><div className="speak-prompt"><span className="prompt-label">DIGA ESTA FRASE</span><h2>I'd like to improve my English.</h2><p>Eu gostaria de melhorar meu inglês.</p><button className="listen-button" onClick={() => speakText("I'd like to improve my English.", profile.accent)}><Volume2 size={16}/> Ouvir exemplo</button></div><button className={`record-button ${recording ? 'recording' : ''}`} onClick={recording ? stopRecording : () => { void startRecording() }}>{recording ? <MicOff size={23}/> : <Mic size={23}/>}<span>{recording ? 'Parar gravação' : 'Toque para falar'}</span></button><p className="record-hint">{recording ? 'Estou ouvindo. Fale a frase com calma.' : 'O reconhecimento depende do navegador. O FALA não salva gravações nesta versão.'}</p>{transcript && <div className="transcript-result"><span className="eyebrow muted">O QUE FOI RECONHECIDO</span><p>“{transcript}”</p><div className="soft-note"><Lightbulb size={15}/> Esta é uma comparação de transcrição, não uma nota fonética. A avaliação detalhada de sons será conectada ao serviço de pronúncia.</div></div>}</section><section className="panel conversation-panel"><div className="panel-heading"><div><span className="eyebrow muted">CONVERSA GUIADA</span><h3>Converse com a Lumi</h3></div><span className="online-status"><i/> EM PRÁTICA</span></div><div className="chat-topic"><span className="topic-avatar lumi-face">L</span><div><strong>Lumi · sua parceira de inglês</strong><small>Tema adaptado aos seus interesses</small></div><button className="icon-button" onClick={() => setChat([{ role: 'assistant', text: `Vamos recomeçar, ${firstName}. Escolha um tema que você gosta e vamos conversar em inglês: ${profile.customInterest || profile.interests.join(', ') || 'seu dia a dia'}.` }])} aria-label="Reiniciar conversa"><RotateCcw size={16}/></button></div><div className="chat-messages">{chat.map((item,index)=><div className={`chat-message ${item.role}`} key={index}><div className="message-avatar">{item.role === 'assistant' ? 'L' : firstName.slice(0,1).toUpperCase()}</div><div><p>{item.text}</p>{item.note && <small>{item.note}</small>}</div></div>)}{chatLoading && <div className="chat-message assistant"><div className="message-avatar">L</div><div className="typing-indicator"><i/><i/><i/></div></div>}<div ref={chatEndRef}/></div><form className="chat-compose" onSubmit={e => {e.preventDefault(); void sendMessage()}}><input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Responda em inglês ou peça ajuda em português..."/><button type="submit" disabled={!chatInput.trim() || chatLoading}><Send size={17}/></button></form>{apiNotice && <p className="api-notice">{apiNotice}</p>}<div className="chat-footnote"><Sparkles size={13}/> Erros fazem parte do aprendizado. Tente responder em inglês.</div></section></div>
        </>}

        {page === 'music' && musicSet && <>
          <div className="page-intro"><span className="eyebrow muted">MUSIC LAB · PRONÚNCIA E RITMO</span><h1>Aprenda inglês <em>com música.</em></h1><p>Trechos originais curtos, repetição guiada, vocabulário e recuperação ativa. O objetivo é usar o inglês, não só ouvir passivamente.</p></div>
          <section className="panel music-hero"><div className="music-hero-copy"><span className="eyebrow muted">MICROCANÇÃO ORIGINAL · {musicSet.theme.toUpperCase()}</span><h2>{musicSet.title}</h2><p>Ouça devagar, perceba as sílabas fortes, repita e depois tente completar uma linha sem olhar.</p><div className="music-controls"><button className="primary-button" onClick={()=>speakText(musicSet.lyrics.join('. '),profile.accent,0.68)}><PlayCircle size={16}/> Ouvir devagar</button><button className="secondary-button" onClick={()=>speakText(musicSet.lyrics.join('. '),profile.accent,0.92)}><Volume2 size={16}/> Ritmo natural</button></div></div><div className="music-disc"><Music2 size={44}/><span>FALA<br/>MUSIC LAB</span></div></section>
          <div className="music-grid"><section className="panel music-lyrics-panel"><div className="panel-heading"><div><span className="eyebrow muted">OUVIR · LER · REPETIR</span><h3>Verso em inglês</h3></div><span className="level-pill">Original</span></div><div className="music-lyrics">{musicSet.lyrics.map((line,index)=><button key={line} onClick={()=>speakText(line,profile.accent,0.78)}><span>0{index+1}</span><strong>{line}</strong><Volume2 size={15}/></button>)}</div><p className="music-translation">{musicSet.translation}</p><div className="music-practice-note"><Lightbulb size={16}/><span>Primeiro escute. Depois repita sem ler. Por fim, tente falar o verso inteiro no seu ritmo.</span></div></section>
          <section className="panel music-vocab-panel"><span className="eyebrow muted">VOCABULÁRIO DO VERSO</span><h3>Palavras para levar com você</h3>{musicSet.words.map(([word,meaning])=><div className="music-word-row" key={word}><div><strong>{word}</strong><small>{meaning}</small></div><button className="sound-button" onClick={()=>speakText(word,profile.accent)}><Volume2 size={15}/></button><button className="icon-button" onClick={()=>saveWord(word)} aria-label={'Salvar '+word}><Plus size={15}/></button></div>)}</section></div>
          <section className="panel music-quiz-panel"><div><span className="eyebrow muted">RECUPERAÇÃO ATIVA · MINI DESAFIO</span><h3>Complete o verso sem olhar.</h3><p>“{musicSet.lyrics.find(line=>line.toLowerCase().includes(musicSet.gap))?.replace(new RegExp(musicSet.gap,'i'),'_____')}”</p></div><div className="music-gap-options">{musicSet.options.map(option=><button className={musicAnswer===option?'selected':''} key={option} onClick={()=>{setMusicAnswer(option);setMusicFeedback(option===musicSet.gap?'Correto. Agora ouça a linha completa e repita sem ler.':'Ainda não. Ouça o verso devagar e tente outra vez.');if(option===musicSet.gap&&supabase){const backend=supabase;void backend.auth.getUser().then(({data})=>{if(data.user)return backend.from('learning_sessions').insert({user_id:data.user.id,activity_type:'listening',duration_seconds:180,details:{source:'music_lab',title:musicSet.title}})})}}}>{option}</button>)}</div>{musicFeedback&&<div className="soft-note"><Sparkles size={15}/>{musicFeedback}</div>}<button className="text-link" onClick={()=>{setMusicAnswer('');setMusicFeedback('')}}>Refazer desafio <RotateCcw size={14}/></button></section>
          <div className="music-disclaimer">Este laboratório usa versos originais do FALA. Você pode estudar também textos que tenha autorização para usar. A fala sintetizada ajuda a praticar ritmo e entonação, mas não é canto humano e o sistema não atribui nota de afinação.</div>
        </>}

        {page === 'write' && <>
          <div className="page-intro"><span className="eyebrow muted">ESCREVER · WRITING</span><h1>Transforme ideias em <em>inglês claro.</em></h1><p>Escreva sem medo. O objetivo é entender o erro e aprender a próxima vez.</p></div><div className="writing-grid"><section className="panel writing-panel"><div className="panel-heading"><div><span className="eyebrow muted">DESAFIO DE HOJE</span><h3>Escreva sobre {profile.customInterest || interestOptions.find(item=>item.id===profile.interests[0])?.title || 'seus interesses'}</h3></div><span className="level-pill">5 min</span></div><div className="writing-prompt"><strong>Write about it:</strong><p>Write 2–4 sentences about {profile.customInterest || interestOptions.find(item=>item.id===profile.interests[0])?.title || 'something you enjoy'}. Connect it to your goal: {scenarioOptions.find(item=>item.id===profile.scenario)?.title || 'everyday life'}.</p><button className="sound-button" onClick={() => speakText('Write a few sentences about something you enjoy.',profile.accent)}><Volume2 size={17}/></button></div><textarea className="writing-area" value={writingText} onChange={e => setWritingText(e.target.value)} placeholder="I enjoy... because..." rows={6}/><div className="writing-actions"><span>{writingText.trim().split(/\s+/).filter(Boolean).length} palavras</span><button className="primary-button" onClick={() => void checkWriting()} disabled={!writingText.trim()}>Analisar meu texto <WandSparkles size={16}/></button></div>{writingFeedback && <div className="writing-feedback"><span className="eyebrow muted">FEEDBACK</span><p>{writingFeedback}</p></div>}
            <div className="writing-photo-divider"><span>OU USE A CÂMERA</span></div>
            <div className="writing-photo-tool"><div><span className="eyebrow muted">ESCRITA NO PAPEL</span><h3>Fotografe seu exercício</h3><p>Envie uma foto legível do caderno ou folha. A Lumi tenta transcrever, corrigir e explicar os pontos importantes.</p></div><label className="photo-upload-button" htmlFor="writing-photo-input"><Camera size={17}/> Tirar foto ou escolher arquivo</label><input id="writing-photo-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>{const file=e.target.files?.[0]??null;if(writingPhotoPreview)URL.revokeObjectURL(writingPhotoPreview);setWritingPhoto(file);setWritingPhotoPreview(file?URL.createObjectURL(file):null);setWritingPhotoFeedback('')}}/>{writingPhotoPreview&&<div className="writing-photo-preview"><img src={writingPhotoPreview} alt="Prévia da foto do exercício"/><button className="secondary-button" onClick={()=>{URL.revokeObjectURL(writingPhotoPreview);setWritingPhoto(null);setWritingPhotoPreview(null);setWritingPhotoFeedback('')}}>Remover foto</button><button className="primary-button" onClick={()=>void analyzeWritingPhoto()} disabled={photoBusy}>{photoBusy?'Analisando foto...':'Enviar para a Lumi'} <WandSparkles size={15}/></button></div>}{writingPhotoFeedback&&<div className="writing-feedback photo-feedback"><span className="eyebrow muted">ANÁLISE DA FOTO</span><p>{writingPhotoFeedback}</p></div>}<p className="photo-privacy-note"><LockKeyhole size={13}/> A imagem é enviada para análise com sua sessão autenticada e não fica salva no álbum do FALA. A transcrição pode errar em fotos desfocadas ou com letra pequena.</p></div>}</section><aside className="panel writing-side"><span className="eyebrow muted">DICA DE ESCRITA</span><h3>Uma ideia por frase.</h3><p>Comece com frases curtas. Depois conecte as ideias usando because, but, so e and.</p><div className="example-chip"><strong>because</strong><span>porque</span><button className="sound-button" onClick={() => speakText('because',profile.accent)}><Volume2 size={15}/></button></div><div className="example-chip"><strong>however</strong><span>no entanto</span><button className="sound-button" onClick={() => speakText('however',profile.accent)}><Volume2 size={15}/></button></div><div className="example-chip"><strong>also</strong><span>também</span><button className="sound-button" onClick={() => speakText('also',profile.accent)}><Volume2 size={15}/></button></div></aside></div>
        </>}

        {page === 'vocabulary' && <>
          <div className="page-intro"><span className="eyebrow muted">VOCABULÁRIO · YOUR WORD BANK</span><h1>Palavras que <em>ficam com você.</em></h1><p>Guarde expressões úteis e volte nelas até conseguir usar sem pensar.</p></div><section className="panel vocabulary-panel"><div className="panel-heading"><div><span className="eyebrow muted">SEU CADERNO</span><h3>{words.length} expressões salvas</h3></div><span className="review-count">{words.length.toString().padStart(2,'0')}</span></div>{words.map((word,index)=><div className="vocab-row" key={word}><span className="vocab-index">{String(index+1).padStart(2,'0')}</span><div><strong>{word}</strong><small>{word === 'actually' ? 'na verdade · de fato' : word === 'figure out' ? 'descobrir · entender' : word === 'I am looking forward to' ? 'estou ansioso por' : 'Expressão salva por você'}</small></div><button className="sound-button" onClick={() => speakText(word,profile.accent)}><Volume2 size={17}/></button></div>)}<div className="add-word-row"><input id="new-word" placeholder="Adicionar nova palavra ou expressão" onKeyDown={e => { if(e.key === 'Enter') { const value=(e.target as HTMLInputElement).value.trim(); if(value){saveWord(value);(e.target as HTMLInputElement).value=''} }}}/><button className="primary-button" onClick={() => {const el=document.getElementById('new-word') as HTMLInputElement; if(el.value.trim()){saveWord(el.value.trim());el.value=''}}}><Plus size={16}/> Adicionar</button></div></section>
        </>}

        {page === 'progress' && <>
          <div className="page-intro"><span className="eyebrow muted">EVOLUÇÃO · YOUR PROGRESS</span><h1>Pequenos passos. <em>Progresso real.</em></h1><p>Veja o que já está construindo e o que merece atenção na próxima semana.</p></div><div className="progress-metrics"><div className="panel metric-card"><span className="metric-label">TEMPO DE PRÁTICA</span><strong>{learnerStats.totalMinutes} <small>min</small></strong><span className="metric-caption">Últimos 7 dias</span></div><div className="panel metric-card"><span className="metric-label">SEQUÊNCIA ATUAL</span><strong>{learnerStats.activeDays} <small>dias</small></strong><span className="metric-caption">Com atividade nos últimos 7 dias</span></div><div className="panel metric-card"><span className="metric-label">VOCABULÁRIO</span><strong>{words.length} <small>itens</small></strong><span className="metric-caption">No seu caderno</span></div></div><section className="panel progress-breakdown"><div className="panel-heading"><div><span className="eyebrow muted">HABILIDADES</span><h3>Seu mapa de aprendizagem</h3></div><span className="level-pill">Em construção</span></div>{[{n:'Compreensão',k:'listening'},{n:'Vocabulário',k:'vocabulary'},{n:'Conversação',k:'speaking'},{n:'Escrita',k:'writing'}].map(item=>({...item,v:learnerStats.skillScores[item.k] ?? 0})).map(item=><div className="breakdown-row" key={item.n}><span>{item.n}</span><div><i style={{width:`${item.v}%`}}/></div><strong>{item.v}%</strong></div>)}<div className="soft-note"><CircleHelp size={15}/> Os indicadores aparecem conforme você conclui atividades. A média considera apenas tentativas registradas e não substitui uma avaliação formal de proficiência.</div></section>
        </>}
      </div>
      <footer className="app-footer"><span>FALA ENGLISH · APRENDER COM INTENÇÃO</span><span>FALA · Lumi adaptive tutor · 0.2</span></footer>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">{mobileNavItems.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon size={19}/><span>{item.label}</span></button> })}</nav>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow muted">SEU PERFIL</span><h2>Preferências de estudo</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={18}/></button></div><div className="settings-profile"><span className="avatar large-avatar">{firstName.slice(0,1).toUpperCase()}</span><div><strong>{profile.name || 'Estudante'}</strong><small>{goalOptions.find(item=>item.id===profile.goal)?.title} · Lumi personalizada</small></div></div><div className="settings-row"><div><strong>Tema do aplicativo</strong><span>Escolha uma aparência para estudar</span></div><button className="theme-switch" onClick={()=>setDarkTheme(value=>!value)}>{darkTheme?<Sun size={16}/>:<Moon size={16}/>} {darkTheme?'Tema claro':'Tema escuro'}</button></div><div className="settings-row"><div><strong>Tempo por dia</strong><span>Sua meta de estudo</span></div><select className="select-input" value={profile.minutes} onChange={e=>{const updated={...profile,minutes:Number(e.target.value)};updateLearnerProfile(updated)}}>{[5,10,15,20,30].map(v=><option key={v} value={v}>{v} minutos</option>)}</select></div><div className="settings-row"><div><strong>Sotaque de referência</strong><span>Modelo de áudio</span></div><div className="segmented"><button className={profile.accent==='us'?'active':''} onClick={()=>{const updated={...profile,accent:'us' as const};updateLearnerProfile(updated)}}>EUA</button><button className={profile.accent==='uk'?'active':''} onClick={()=>{const updated={...profile,accent:'uk' as const};updateLearnerProfile(updated)}}>Reino Unido</button></div></div><div className="account-section"><span className="eyebrow muted">CONTA E SINCRONIZAÇÃO</span>{!supabase ? <p>Configure as variáveis do Supabase no arquivo <code>.env.local</code> para ativar login, sincronização e tutor com IA.</p> : userEmail ? <><div className="signed-in"><CheckCircle2 size={17}/><span><strong>Conta conectada</strong><small>{userEmail}</small></span></div><button className="secondary-button" onClick={() => void handleSignOut()}>Sair da conta</button></> : <><p>Entre ou crie uma conta para salvar seu perfil e liberar o tutor com IA.</p><input className="auth-input" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Seu e-mail"/><input className="auth-input" type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Senha (mínimo 8 caracteres)"/><div className="auth-actions"><button className="secondary-button" disabled={authBusy} onClick={() => void handleAuth('signin')}>Entrar</button><button className="primary-button" disabled={authBusy} onClick={() => void handleAuth('signup')}>Criar conta</button></div></>}{authMessage && <p className="auth-message">{authMessage}</p>}</div><button className="reset-profile" onClick={resetProfile}>Refazer personalização <ArrowRight size={15}/></button><p className="settings-data-note">Isso reinicia as preferências locais e mantém a conta. O histórico sincronizado não é apagado.</p></section></div>}
  </div>
}

function demoReply(message: string, profile: Profile | null) {
  const normalized = message.toLowerCase()
  const interest = profile?.customInterest || interestOptions.find(item => item.id === profile?.interests?.[0])?.title || 'your interests'
  if (normalized.includes('today')) return `Nice! You could say: “I had a busy day, but it was good.” Let's connect English with ${interest}: what did you do related to it today?`
  if (normalized.includes('work') || normalized.includes('job')) return "A useful structure is: “I work with…” or “I'm responsible for…”. Try to complete one of these sentences with your own information."
  if (normalized.includes('because')) return "Good use of “because”! You gave a reason. Now add one detail connected to something you enjoy, such as ${interest}."
  return `I understood your idea. Let's build a complete sentence, one step at a time. Can you tell me a little more about ${interest}?`
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
  interface SpeechRecognition extends EventTarget {
    lang: string
    interimResults: boolean
    maxAlternatives: number
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: (() => void) | null
    onend: (() => void) | null
    start(): void
    stop(): void
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
}

export default App
