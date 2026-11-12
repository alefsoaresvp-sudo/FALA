import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, AudioLines, Award, BookOpen, Bookmark,
  Check, CheckCircle2, ChevronRight, CircleHelp, Clock3,
  Flame, Headphones, Home, Languages, Lightbulb, LockKeyhole, MessageCircle,
  Mic, MicOff, Plus, RotateCcw, Send, Settings2, Sparkles, Target,
  Volume2, WandSparkles, X,
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

type Page = 'home' | 'learn' | 'speak' | 'write' | 'vocabulary' | 'progress'
type ChatMessage = { role: 'assistant' | 'user'; text: string; note?: string }

const profileKey = 'fala-profile-v2'
const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'learn', label: 'Aprender', icon: BookOpen },
  { id: 'speak', label: 'Falar', icon: AudioLines },
  { id: 'write', label: 'Escrever', icon: Languages },
  { id: 'vocabulary', label: 'Meu vocabulário', icon: Bookmark },
  { id: 'progress', label: 'Meu progresso', icon: Award },
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
function speakText(text: string, accent: 'us' | 'uk' = 'us') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US'
  utterance.rate = 0.88
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

  const generateActivity = async (learner: Profile) => {
    const interest = learner.customInterest || interestOptions.find(item => item.id === learner.interests[0])?.title || 'cotidiano'
    const demo: PersonalizedActivity = {
      activity_type: 'multiple_choice',
      title: `Inglês aplicado a ${interest}`,
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
      const { data, error } = await supabase.functions.invoke('tutor', { body: { mode: 'activity', profile: learner, learningEvidence: { skillScores: learnerStats.skillScores, recentMistakes, previousInsights: learnerInsights.map(item => `${item.skill}: ${item.observation} → ${item.recommendation}`) } } })
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
      <header className="topbar"><div className="mobile-brand brand"><span className="brand-mark">f.</span><span>fala<span className="brand-light">english</span></span></div><div className="breadcrumb">FALA <ChevronRight size={13} /> <span>{navItems.find(item => item.id === page)?.label}</span></div><div className="topbar-right"><span className="level-pill"><span className="level-dot" /> {levelLabels[profile.level]}</span><button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Configurações"><Settings2 size={18} /></button></div></header>
      <div className="content-wrap">
        {page === 'home' && <>
          <div className="welcome-row"><div><div className="eyebrow muted">{todayLabel} · SUA ROTINA DE INGLÊS</div><h1>Olá, {firstName}. <em>Vamos praticar?</em></h1><p>Um passo de cada vez. Hoje, foque no que você quer conseguir falar.</p></div><div className="daily-target"><span className="target-icon"><Target size={19} /></span><span><small>SUA META DIÁRIA</small><strong>{profile.minutes} minutos</strong></span></div></div>
          <section className="hero-practice"><div className="hero-copy"><div className="hero-tag"><Sparkles size={13} /> SUGERIDO PARA VOCÊ</div><h2>Seu inglês precisa<br />sair do papel.</h2><p>A Lumi transforma seus interesses em situações reais, acompanha suas dificuldades e adapta o próximo passo.</p><div className="hero-actions"><button className="primary-button" onClick={() => setPage('learn')}>Começar prática <ArrowRight size={17} /></button><span className="duration"><Clock3 size={14} /> {profile.minutes} min</span></div></div><div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="chat-bubble bubble-a">How was your day?</div><div className="voice-visual"><AudioLines size={48} strokeWidth={1.2} /></div><div className="chat-bubble bubble-b">Pretty good, thanks!</div><span className="visual-caption">SPEAK · LISTEN · LEARN</span></div></section>
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

        {page === 'learn' && <>
          <div className="page-intro"><span className="eyebrow muted">APRENDER · ATIVIDADE PERSONALIZADA</span><h1>Inglês no seu <em>universo.</em></h1><p>A Lumi usa seus interesses e seu objetivo para criar situações novas, não só repetir exercícios.</p></div>
          <div className="lesson-layout"><section className="panel lesson-panel"><div className="lesson-progress-row"><span>{dailyActivity?.skill?.toUpperCase() || 'PRÁTICA'} · CONTEXTO REAL</span><span>{activityBusy ? 'CRIANDO...' : 'PERSONALIZADO'}</span></div><div className="lesson-progress"><i style={{width: lessonDone ? '100%' : '35%'}} /></div><div className="lesson-content"><span className="lesson-kicker">{dailyActivity?.title || 'Atividade da Lumi'}</span><div className="phrase-row"><h2>{dailyActivity?.target_phrase || 'How can I help you today?'}</h2><button className="sound-button large" onClick={() => speakText(dailyActivity?.target_phrase || 'How can I help you today?', profile.accent)}><Volume2 size={20}/></button></div><p className="translation">{dailyActivity?.translation || 'Como posso ajudar você hoje?'}</p><div className="explanation"><Lightbulb size={17}/><div><strong>Por que isso é útil</strong><span>{dailyActivity?.explanation || 'Observe a estrutura, ouça a frase e tente reutilizá-la com suas próprias palavras.'}</span></div></div><div className="field-label">{dailyActivity?.question || 'Escolha a resposta que mantém a conversa:'}</div>{dailyActivity?.activity_type === 'complete_sentence' || dailyActivity?.activity_type === 'roleplay' || dailyActivity?.activity_type === 'translation' ? <div className="open-activity"><textarea value={openAnswer} onChange={e=>{setOpenAnswer(e.target.value);setActivityEvaluation(null);setLessonDone(false)}} placeholder={dailyActivity.input_hint || 'Escreva sua resposta em inglês...'} rows={3} disabled={!!activityEvaluation?.is_acceptable}/><div className="open-activity-actions"><span>{openAnswer.trim().split(/\s+/).filter(Boolean).length} palavras · responda com suas próprias palavras</span><button className="primary-button" onClick={() => void evaluateOpenActivity()} disabled={!openAnswer.trim() || evaluationBusy || !!activityEvaluation?.is_acceptable}>{evaluationBusy ? 'Lumi está analisando...' : 'Enviar para a Lumi'} <ArrowRight size={15}/></button></div>{activityEvaluation && <div className={`answer-feedback ${activityEvaluation.is_acceptable ? 'success' : 'try-again'}`}><strong>{activityEvaluation.is_acceptable ? 'Boa construção' : 'Vamos melhorar um ponto'}</strong><p>{activityEvaluation.strengths}</p><p><b>Uma versão mais natural:</b> {activityEvaluation.improved_answer}</p><p><b>Correção:</b> {activityEvaluation.correction}</p><p><b>Próximo passo:</b> {activityEvaluation.next_step}</p><span className="muted">Avaliação orientativa: {activityEvaluation.score}/100</span></div>}</div> : <><div className="answer-options">{(dailyActivity?.options || ['Could you tell me more?', 'I am agree.', 'I like very much.']).map((answer,index)=><button key={`${answer}-${index}`} className={`answer-option ${quizAnswer === answer ? (index === (dailyActivity?.correct_index ?? 0) ? 'correct' : 'incorrect') : ''}`} onClick={() => {setQuizAnswer(answer);const correct=index === (dailyActivity?.correct_index ?? 0);if(correct) setLessonDone(true);void recordAttempt(answer,index,correct)}} disabled={lessonDone || !!quizAnswer}><span>{String.fromCharCode(65+index)}</span>{answer}{quizAnswer === answer && (index === (dailyActivity?.correct_index ?? 0) ? <CheckCircle2 size={17}/> : <X size={17}/>)}</button>)}</div>{quizAnswer && <div className={`answer-feedback ${quizAnswer === (dailyActivity?.options?.[dailyActivity?.correct_index ?? 0] ?? '') ? 'success' : 'try-again'}`}>{quizAnswer === (dailyActivity?.options?.[dailyActivity?.correct_index ?? 0] ?? '') ? (dailyActivity?.feedback || 'Boa resposta. Agora tente usar a estrutura em uma frase sua.') : 'Ainda não. Compare as opções e pense em qual delas soa mais natural neste contexto. ' + (dailyActivity?.feedback || '')}</div>}</>}<div className="lesson-bottom"><span><Clock3 size={14}/> 4–6 min</span><button className="primary-button" disabled={dailyActivity?.activity_type === 'complete_sentence' || dailyActivity?.activity_type === 'roleplay' || dailyActivity?.activity_type === 'translation' ? !activityEvaluation?.is_acceptable : !quizAnswer} onClick={() => {if(lessonDone || !!activityEvaluation?.is_acceptable){const backend=supabase;if(backend) void backend.auth.getUser().then(({data})=>{if(data.user) return backend.from('learning_sessions').insert({user_id:data.user.id,activity_type:'lesson',duration_seconds:300,score:100,details:{title:dailyActivity?.title,skill:dailyActivity?.skill,interest:profile.interests}})});setPage('speak');setQuizAnswer(null)}else setQuizAnswer(null)}}>{(lessonDone || activityEvaluation?.is_acceptable) ? 'Praticar falando' : (dailyActivity?.activity_type === 'complete_sentence' || dailyActivity?.activity_type === 'roleplay' || dailyActivity?.activity_type === 'translation') ? (activityEvaluation ? 'Continue a atividade' : 'Escreva sua resposta acima') : quizAnswer ? 'Tentar novamente' : 'Escolha uma resposta'} <ArrowRight size={16}/></button></div></div></section><aside className="panel lesson-side"><span className="eyebrow muted">SUA PERSONALIZAÇÃO</span><h3>{profile.customInterest || interestOptions.find(item=>item.id===profile.interests[0])?.title || goalOptions.find(item=>item.id===profile.goal)?.title}</h3><p>A Lumi conecta o assunto aos seus interesses e faz você reutilizar a mesma estrutura em situações diferentes.</p><div className="side-divider"/><span className="eyebrow muted">PRÓXIMO PASSO</span><div className="path-item active"><span>01</span><div><strong>Entender a expressão</strong><small>Você está aqui</small></div></div><div className="path-item"><span>02</span><div><strong>Responder com suas palavras</strong><small>Prática ativa</small></div></div><div className="path-item"><span>03</span><div><strong>Usar em uma conversa</strong><small>Transferir para a vida real</small></div></div><button className="text-link" disabled={activityBusy} onClick={()=>void generateActivity(profile)}>{activityBusy?'Criando outra atividade...':'Criar nova atividade'} <WandSparkles size={14}/></button></aside></div>
        </>}

        {page === 'speak' && <>
          <div className="page-intro"><span className="eyebrow muted">FALAR · SPEAKING LAB</span><h1>Solte a voz. <em>Sem medo de errar.</em></h1><p>Treine uma frase e depois converse sobre um assunto real.</p></div>
          <div className="speak-grid"><section className="panel pronunciation-panel"><div className="panel-heading"><div><span className="eyebrow muted">TREINO DE FALA</span><h3>Repita em voz alta</h3></div><span className="level-pill">{profile.accent === 'us' ? 'Inglês americano' : 'Inglês britânico'}</span></div><div className="speak-prompt"><span className="prompt-label">DIGA ESTA FRASE</span><h2>I'd like to improve my English.</h2><p>Eu gostaria de melhorar meu inglês.</p><button className="listen-button" onClick={() => speakText("I'd like to improve my English.", profile.accent)}><Volume2 size={16}/> Ouvir exemplo</button></div><button className={`record-button ${recording ? 'recording' : ''}`} onClick={recording ? stopRecording : () => { void startRecording() }}>{recording ? <MicOff size={23}/> : <Mic size={23}/>}<span>{recording ? 'Parar gravação' : 'Toque para falar'}</span></button><p className="record-hint">{recording ? 'Estou ouvindo. Fale a frase com calma.' : 'O reconhecimento depende do navegador. O FALA não salva gravações nesta versão.'}</p>{transcript && <div className="transcript-result"><span className="eyebrow muted">O QUE FOI RECONHECIDO</span><p>“{transcript}”</p><div className="soft-note"><Lightbulb size={15}/> Esta é uma comparação de transcrição, não uma nota fonética. A avaliação detalhada de sons será conectada ao serviço de pronúncia.</div></div>}</section><section className="panel conversation-panel"><div className="panel-heading"><div><span className="eyebrow muted">CONVERSA GUIADA</span><h3>Converse com a Lumi</h3></div><span className="online-status"><i/> EM PRÁTICA</span></div><div className="chat-topic"><span className="topic-avatar lumi-face">L</span><div><strong>Lumi · sua parceira de inglês</strong><small>Tema adaptado aos seus interesses</small></div><button className="icon-button" onClick={() => setChat([{ role: 'assistant', text: `Vamos recomeçar, ${firstName}. Escolha um tema que você gosta e vamos conversar em inglês: ${profile.customInterest || profile.interests.join(', ') || 'seu dia a dia'}.` }])} aria-label="Reiniciar conversa"><RotateCcw size={16}/></button></div><div className="chat-messages">{chat.map((item,index)=><div className={`chat-message ${item.role}`} key={index}><div className="message-avatar">{item.role === 'assistant' ? 'L' : firstName.slice(0,1).toUpperCase()}</div><div><p>{item.text}</p>{item.note && <small>{item.note}</small>}</div></div>)}{chatLoading && <div className="chat-message assistant"><div className="message-avatar">L</div><div className="typing-indicator"><i/><i/><i/></div></div>}<div ref={chatEndRef}/></div><form className="chat-compose" onSubmit={e => {e.preventDefault(); void sendMessage()}}><input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Responda em inglês ou peça ajuda em português..."/><button type="submit" disabled={!chatInput.trim() || chatLoading}><Send size={17}/></button></form>{apiNotice && <p className="api-notice">{apiNotice}</p>}<div className="chat-footnote"><Sparkles size={13}/> Erros fazem parte do aprendizado. Tente responder em inglês.</div></section></div>
        </>}

        {page === 'write' && <>
          <div className="page-intro"><span className="eyebrow muted">ESCREVER · WRITING</span><h1>Transforme ideias em <em>inglês claro.</em></h1><p>Escreva sem medo. O objetivo é entender o erro e aprender a próxima vez.</p></div><div className="writing-grid"><section className="panel writing-panel"><div className="panel-heading"><div><span className="eyebrow muted">DESAFIO DE HOJE</span><h3>Escreva sobre {profile.customInterest || interestOptions.find(item=>item.id===profile.interests[0])?.title || 'seus interesses'}</h3></div><span className="level-pill">5 min</span></div><div className="writing-prompt"><strong>Write about it:</strong><p>Write 2–4 sentences about {profile.customInterest || interestOptions.find(item=>item.id===profile.interests[0])?.title || 'something you enjoy'}. Connect it to your goal: {scenarioOptions.find(item=>item.id===profile.scenario)?.title || 'everyday life'}.</p><button className="sound-button" onClick={() => speakText('Write a few sentences about something you enjoy.',profile.accent)}><Volume2 size={17}/></button></div><textarea className="writing-area" value={writingText} onChange={e => setWritingText(e.target.value)} placeholder="I enjoy... because..." rows={6}/><div className="writing-actions"><span>{writingText.trim().split(/\s+/).filter(Boolean).length} palavras</span><button className="primary-button" onClick={() => void checkWriting()} disabled={!writingText.trim()}>Analisar meu texto <WandSparkles size={16}/></button></div>{writingFeedback && <div className="writing-feedback"><span className="eyebrow muted">FEEDBACK</span><p>{writingFeedback}</p></div>}</section><aside className="panel writing-side"><span className="eyebrow muted">DICA DE ESCRITA</span><h3>Uma ideia por frase.</h3><p>Comece com frases curtas. Depois conecte as ideias usando because, but, so e and.</p><div className="example-chip"><strong>because</strong><span>porque</span><button className="sound-button" onClick={() => speakText('because',profile.accent)}><Volume2 size={15}/></button></div><div className="example-chip"><strong>however</strong><span>no entanto</span><button className="sound-button" onClick={() => speakText('however',profile.accent)}><Volume2 size={15}/></button></div><div className="example-chip"><strong>also</strong><span>também</span><button className="sound-button" onClick={() => speakText('also',profile.accent)}><Volume2 size={15}/></button></div></aside></div>
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
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon size={19}/><span>{item.id === 'vocabulary' ? 'Palavras' : item.label}</span></button> })}<button onClick={() => setShowSettings(true)}><Settings2 size={19}/><span>Conta</span></button></nav>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow muted">SEU PERFIL</span><h2>Preferências de estudo</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={18}/></button></div><div className="settings-profile"><span className="avatar large-avatar">{firstName.slice(0,1).toUpperCase()}</span><div><strong>{profile.name || 'Estudante'}</strong><small>{goalOptions.find(item=>item.id===profile.goal)?.title} · Lumi personalizada</small></div></div><div className="settings-row"><div><strong>Tempo por dia</strong><span>Sua meta de estudo</span></div><select className="select-input" value={profile.minutes} onChange={e=>{const updated={...profile,minutes:Number(e.target.value)};updateLearnerProfile(updated)}}>{[5,10,15,20,30].map(v=><option key={v} value={v}>{v} minutos</option>)}</select></div><div className="settings-row"><div><strong>Sotaque de referência</strong><span>Modelo de áudio</span></div><div className="segmented"><button className={profile.accent==='us'?'active':''} onClick={()=>{const updated={...profile,accent:'us' as const};updateLearnerProfile(updated)}}>EUA</button><button className={profile.accent==='uk'?'active':''} onClick={()=>{const updated={...profile,accent:'uk' as const};updateLearnerProfile(updated)}}>Reino Unido</button></div></div><div className="account-section"><span className="eyebrow muted">CONTA E SINCRONIZAÇÃO</span>{!supabase ? <p>Configure as variáveis do Supabase no arquivo <code>.env.local</code> para ativar login, sincronização e tutor com IA.</p> : userEmail ? <><div className="signed-in"><CheckCircle2 size={17}/><span><strong>Conta conectada</strong><small>{userEmail}</small></span></div><button className="secondary-button" onClick={() => void handleSignOut()}>Sair da conta</button></> : <><p>Entre ou crie uma conta para salvar seu perfil e liberar o tutor com IA.</p><input className="auth-input" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Seu e-mail"/><input className="auth-input" type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Senha (mínimo 8 caracteres)"/><div className="auth-actions"><button className="secondary-button" disabled={authBusy} onClick={() => void handleAuth('signin')}>Entrar</button><button className="primary-button" disabled={authBusy} onClick={() => void handleAuth('signup')}>Criar conta</button></div></>}{authMessage && <p className="auth-message">{authMessage}</p>}</div><button className="reset-profile" onClick={resetProfile}>Refazer personalização <ArrowRight size={15}/></button><p className="settings-data-note">Isso reinicia as preferências locais e mantém a conta. O histórico sincronizado não é apagado.</p></section></div>}
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
