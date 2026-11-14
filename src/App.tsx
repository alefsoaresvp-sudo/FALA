import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Conversation } from '@elevenlabs/client'
import {
  Activity, ArrowRight, AudioLines, BookOpen, Bookmark, Check, CheckCircle2,
  ChevronRight, Clock3, Flame, Headphones, Home, LogIn, LogOut,
  MessageCircle, Mic, MoreHorizontal, PenLine, Play, Plus, Send, Sparkles,
  Target, Trash2, Trophy, UserRound, Volume2, X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Page = 'home' | 'learn' | 'lumi' | 'speak' | 'write' | 'vocabulary' | 'progress'
type Goal = 'conversation' | 'work' | 'travel' | 'study' | 'life'
type Level = 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'unsure'
type Profile = {
  name: string
  goal: Goal
  level: Level
  interests: string[]
  customInterest: string
  focuses: string[]
  minutes: number
  accent: 'us' | 'uk'
  style: 'conversation' | 'guided' | 'mixed'
  barriers: string[]
  scenario: string
  timeHorizon: string
  feedbackStyle: 'gentle' | 'balanced' | 'direct'
}
type ChatMessage = { role: 'user' | 'assistant'; text: string; note?: string }
type SessionRow = { id?: string; activity_type: string; duration_seconds: number; score: number | null; completed_at?: string }
type LearningActivity = {
  title: string
  skill: string
  context: string
  phrase: string
  translation: string
  prompt: string
  options: string[]
  correct: number
  explanation: string
}

const PROFILE_KEY = 'fala-profile-v3'
const WORDS_KEY = 'fala-words-v3'
const SESSIONS_KEY = 'fala-local-sessions-v1'
const initialProfile: Profile = {
  name: '', goal: 'conversation', level: 'unsure', interests: [], customInterest: '',
  focuses: ['speaking', 'listening'], minutes: 10, accent: 'us', style: 'mixed',
  barriers: [], scenario: 'daily', timeHorizon: 'flexible', feedbackStyle: 'balanced',
}
const initialChat: ChatMessage[] = [
  { role: 'assistant', text: 'Hi! I am Lumi, your English practice partner. Tell me what you would like to talk about today.' },
]
const interestOptions = ['Tecnologia e IA', 'Carros e automobilismo', 'Games', 'Negócios', 'Música', 'Filmes e séries', 'Viagens', 'Esportes', 'Ciência', 'Programação']
const activityBank: LearningActivity[] = [
  {
    title: 'Uma conversa que continua', skill: 'speaking', context: 'Você conheceu alguém em um evento e quer manter a conversa.',
    phrase: 'What do you like to do in your free time?', translation: 'O que você gosta de fazer no seu tempo livre?',
    prompt: 'Qual pergunta soa natural para conhecer melhor alguém?',
    options: ['What you do free time?', 'What do you like to do in your free time?', 'You like do what?'], correct: 1,
    explanation: 'Use “What do you like to do...?” para perguntar sobre preferências. A estrutura é natural e reutilizável.',
  },
  {
    title: 'Inglês para o trabalho', skill: 'writing', context: 'Você precisa explicar que está trabalhando em uma tarefa.',
    phrase: 'I am working on it right now.', translation: 'Estou trabalhando nisso agora.',
    prompt: 'Qual frase descreve uma atividade acontecendo neste momento?',
    options: ['I working on it now.', 'I am work it now.', 'I am working on it right now.'], correct: 2,
    explanation: 'Present continuous usa am/is/are + verbo com -ing. “Right now” reforça que a ação está acontecendo agora.',
  },
  {
    title: 'Pedir ajuda em uma viagem', skill: 'listening', context: 'Você está em uma cidade nova e precisa de orientação.',
    phrase: 'Could you show me the way to the station?', translation: 'Você poderia me mostrar o caminho até a estação?',
    prompt: 'Qual é a forma mais educada de pedir orientação?',
    options: ['Could you show me the way to the station?', 'Show station where.', 'You can tell station?'], correct: 0,
    explanation: '“Could you...?” é uma forma educada de fazer pedidos. “The way to” significa o caminho para.',
  },
]

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}
function greeting(name: string) {
  return name.trim().split(/\s+/)[0] || 'estudante'
}
function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir esta ação. Tente novamente.'
}
function demoAnswer(message: string, profile: Profile) {
  const text = message.toLowerCase()
  const topic = profile.customInterest || profile.interests[0] || 'your daily life'
  if (text.includes('hello') || text.includes('hi')) return 'Hello! Good to see you. Try telling me one thing you did today. You can start with “Today, I…”.'
  if (text.includes('work') || text.includes('job')) return 'A useful expression is “I am responsible for…”. Complete the sentence with one real task from your routine.'
  if (text.includes('because')) return 'Good use of “because”. You connected an idea to a reason. Now add one specific example related to ' + topic + '.'
  return 'I understood your idea. A useful next step is to add one detail. Try again with a complete sentence about ' + topic + '.'
}

const navItems = [
  { id: 'home' as Page, label: 'Início', icon: Home },
  { id: 'learn' as Page, label: 'Aprender', icon: BookOpen },
  { id: 'lumi' as Page, label: 'Lumi IA', icon: MessageCircle },
  { id: 'speak' as Page, label: 'Falar', icon: AudioLines },
  { id: 'write' as Page, label: 'Escrever', icon: PenLine },
  { id: 'vocabulary' as Page, label: 'Vocabulário', icon: Bookmark },
  { id: 'progress' as Page, label: 'Progresso', icon: Activity },
]

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [profile, setProfile] = useState<Profile>(() => {
    const currentProfile = readLocal<Profile | null>(PROFILE_KEY, null)
    if (currentProfile) return { ...initialProfile, ...currentProfile }
    // Preserve guest preferences saved by the previous FALA version.
    const legacyProfile = readLocal<Partial<Profile> | null>('fala-profile-v2', null)
    return legacyProfile ? { ...initialProfile, ...legacyProfile } : initialProfile
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.name)
  const [goalDraft, setGoalDraft] = useState<Goal>(profile.goal)
  const [levelDraft, setLevelDraft] = useState<Level>(profile.level)
  const [interestsDraft, setInterestsDraft] = useState<string[]>(profile.interests)
  const [customInterestDraft, setCustomInterestDraft] = useState(profile.customInterest)
  const [chat, setChat] = useState<ChatMessage[]>(initialChat)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatNotice, setChatNotice] = useState('')
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [voiceMessage, setVoiceMessage] = useState('')
  const [activityIndex, setActivityIndex] = useState(0)
  const [answerIndex, setAnswerIndex] = useState<number | null>(null)
  const [activityFeedback, setActivityFeedback] = useState('')
  const [activityCorrect, setActivityCorrect] = useState<boolean | null>(null)
  const [words, setWords] = useState<string[]>(() => readLocal(WORDS_KEY, ['actually', 'figure out', 'I am looking forward to']))
  const [newWord, setNewWord] = useState('')
  const [writingText, setWritingText] = useState('')
  const [writingFeedback, setWritingFeedback] = useState('')
  const [writingBusy, setWritingBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingNotice, setRecordingNotice] = useState('')
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [sessions, setSessions] = useState<SessionRow[]>(() => readLocal(SESSIONS_KEY, []))
  const [cloudLoading, setCloudLoading] = useState(false)
  const [mobileMore, setMobileMore] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDemoHint, setShowDemoHint] = useState(true)
  const [toast, setToast] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const voiceConversationRef = useRef<{ endSession: () => Promise<void> } | null>(null)

  const activity = activityBank[activityIndex % activityBank.length]
  const isConnected = !!user
  const totalMinutes = useMemo(() => Math.round(sessions.reduce((sum, item) => sum + (item.duration_seconds || 0), 0) / 60), [sessions])
  const completedSessions = sessions.length
  const averageScore = useMemo(() => {
    const scores = sessions.map(item => item.score).filter((value): value is number => typeof value === 'number')
    return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null
  }, [sessions])
  const titleByPage: Record<Page, string> = {
    home: 'Visão geral', learn: 'Prática guiada', lumi: 'Converse com a Lumi',
    speak: 'Treino de fala', write: 'Laboratório de escrita', vocabulary: 'Meu vocabulário', progress: 'Meu progresso',
  }

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null)
        setAuthReady(true)
      }
    }).catch(() => { if (active) setAuthReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      setCloudLoading(false)
      setSessions(readLocal(SESSIONS_KEY, []))
      setChat(initialChat)
      return
    }
    let active = true
    setCloudLoading(true)
    void (async () => {
      try {
        const [profileResult, vocabularyResult, sessionsResult, messagesResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('vocabulary_items').select('term').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('learning_sessions').select('id,activity_type,duration_seconds,score,completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(100),
          supabase.from('chat_messages').select('role,content,metadata').eq('user_id', user.id).order('created_at', { ascending: true }).limit(40),
        ])
        if (!active) return
        if (profileResult.data) {
          const row = profileResult.data
          const restored: Profile = {
            name: row.display_name || '', goal: row.goal || 'conversation', level: row.estimated_level || 'unsure',
            interests: row.interests || [], customInterest: row.custom_interest || '',
            focuses: row.focus_areas || ['speaking', 'listening'], minutes: row.daily_minutes || 10,
            accent: row.accent || 'us', style: row.learning_style || 'mixed', barriers: row.barriers || [],
            scenario: row.learning_context || 'daily', timeHorizon: row.time_horizon || 'flexible',
            feedbackStyle: row.feedback_style || 'balanced',
          }
          setProfile(restored)
          setNameDraft(restored.name)
          setGoalDraft(restored.goal)
          setLevelDraft(restored.level)
          setInterestsDraft(restored.interests)
          setCustomInterestDraft(restored.customInterest)
          try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(restored)) } catch { /* local cache is optional */ }
        }
        if (vocabularyResult.data) {
          const restoredWords = vocabularyResult.data.map(item => item.term)
          setWords(restoredWords)
          try { window.localStorage.setItem(WORDS_KEY, JSON.stringify(restoredWords)) } catch { /* local cache is optional */ }
        }
        if (sessionsResult.data) setSessions(sessionsResult.data as SessionRow[])
        if (messagesResult.data?.length) {
          setChat(messagesResult.data.map(item => ({
            role: item.role as 'user' | 'assistant',
            text: item.content,
            note: typeof item.metadata?.correction === 'string' ? item.metadata.correction : undefined,
          })))
        }
      } catch (error) {
        console.error('FALA account sync failed', error)
        setToast('Não foi possível carregar todos os dados sincronizados.')
      } finally {
        if (active) setCloudLoading(false)
      }
    })()
    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat, chatBusy])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      streamRef.current?.getTracks().forEach(track => track.stop())
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      window.speechSynthesis?.cancel()
    }
  }, [audioUrl])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    const nextProfile: Profile = {
      ...profile, name: nameDraft.trim(), goal: goalDraft, level: levelDraft,
      interests: interestsDraft, customInterest: customInterestDraft.trim(),
    }
    setProfile(nextProfile)
    try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)) } catch { /* local cache is optional */ }
    if (supabase && user) {
      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id, display_name: nextProfile.name, goal: nextProfile.goal,
        estimated_level: nextProfile.level, focus_areas: nextProfile.focuses,
        daily_minutes: nextProfile.minutes, accent: nextProfile.accent,
        learning_style: nextProfile.style, interests: nextProfile.interests,
        custom_interest: nextProfile.customInterest, barriers: nextProfile.barriers,
        learning_context: nextProfile.scenario, time_horizon: nextProfile.timeHorizon,
        feedback_style: nextProfile.feedbackStyle,
      }, { onConflict: 'user_id' })
      if (error) setToast('Perfil salvo neste aparelho. A sincronização falhou: ' + error.message)
      else setToast('Seu perfil foi sincronizado.')
    } else {
      setToast('Preferências salvas neste aparelho.')
    }
    setProfileOpen(false)
  }

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) {
      setAuthMessage('A conexão com o Supabase não está configurada neste build.')
      return
    }
    if (!authEmail.trim()) {
      setAuthMessage('Informe seu e-mail.')
      return
    }
    if (authMode !== 'reset' && authPassword.length < 8) {
      setAuthMessage('Use uma senha com pelo menos 8 caracteres.')
      return
    }
    setAuthBusy(true)
    setAuthMessage('')
    try {
      if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
          redirectTo: new URL('/FALA/', window.location.origin).toString(),
        })
        if (error) throw error
        setAuthMessage('Solicitação enviada. Confira sua caixa de entrada e o spam.')
      } else if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { emailRedirectTo: new URL('/FALA/', window.location.origin).toString() },
        })
        if (error) throw error
        if (data.session) setAuthOpen(false)
        else setAuthMessage('Cadastro iniciado. Quando a confirmação por e-mail estiver ativa, confirme o endereço e depois entre. Você pode continuar explorando no modo gratuito de demonstração.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        if (error) throw error
        setAuthOpen(false)
        setAuthMessage('')
      }
    } catch (error) {
      setAuthMessage(friendlyError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    try { await voiceConversationRef.current?.endSession() } catch { /* Continue sign-out even if voice shutdown fails. */ }
    voiceConversationRef.current = null
    setVoiceStatus('idle')
    const { error } = await supabase.auth.signOut()
    if (error) setToast('Não foi possível sair: ' + error.message)
    else {
      setUser(null)
      setSessions([])
      setChat(initialChat)
      setToast('Você saiu da conta. O modo demonstração continua disponível.')
    }
  }

  const recordSession = async (type: string, seconds: number, score: number | null = null, details: Record<string, unknown> = {}) => {
    if (!supabase || !user) {
      const localEntry: SessionRow = { id: 'local-' + Date.now(), activity_type: type, duration_seconds: seconds, score, completed_at: new Date().toISOString() }
      setSessions(current => {
        const updated = [localEntry, ...current].slice(0, 100)
        try { window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)) } catch { /* local progress is optional */ }
        return updated
      })
      return
    }
    const { data, error } = await supabase.from('learning_sessions').insert({
      user_id: user.id, activity_type: type, duration_seconds: seconds, score, details,
    }).select('id,activity_type,duration_seconds,score,completed_at').single()
    if (error) {
      console.error('FALA session record failed', error)
      return
    }
    if (data) setSessions(current => [data as SessionRow, ...current])
  }

  const appendVoiceLine = (role: 'user' | 'assistant', rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    setChat(current => [...current, { role, text }])
    if (supabase && user) {
      void supabase.from('chat_messages').insert({ user_id: user.id, role, content: text, metadata: { source: 'elevenlabs_voice' } })
        .then(({ error }) => { if (error) console.error('Lumi voice transcript sync failed', error) })
    }
  }

  const endLumiVoice = async () => {
    const conversation = voiceConversationRef.current
    voiceConversationRef.current = null
    try {
      await conversation?.endSession()
      setVoiceStatus('idle')
      setVoiceMessage('Conversa encerrada. Seu treino de texto continua disponível.')
    } catch (error) {
      setVoiceStatus('error')
      setVoiceMessage('Não consegui encerrar a sessão de voz corretamente: ' + friendlyError(error))
    }
  }

  const startLumiVoice = async () => {
    if (voiceStatus === 'connected') {
      await endLumiVoice()
      return
    }
    if (!supabase || !user) {
      setAuthMode('signin')
      setAuthOpen(true)
      setAuthMessage('Entre na sua conta para iniciar uma conversa de voz privada com a Lumi.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setVoiceStatus('error')
      setVoiceMessage('A conversa por voz exige HTTPS e um navegador com acesso ao microfone. Abra o FALA no Safari ou Chrome atualizado.')
      return
    }
    setVoiceStatus('connecting')
    setVoiceMessage('Solicitando acesso ao microfone e preparando a sessão segura…')
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      permissionStream.getTracks().forEach(track => track.stop())
      const { data, error } = await supabase.functions.invoke('lumi-session', { body: {} })
      if (error) throw error
      if (typeof data?.conversation_token !== 'string' || !data.conversation_token) {
        throw new Error('O servidor não retornou um token válido. Verifique ELEVENLABS_API_KEY nos secrets do Supabase.')
      }
      const conversation = await Conversation.startSession({
        conversationToken: data.conversation_token,
        connectionType: 'webrtc',
        userId: user.id,
        onConnect: () => {
          setVoiceStatus('connected')
          setVoiceMessage('Lumi está ouvindo. Fale naturalmente em inglês ou peça uma explicação em português.')
        },
        onDisconnect: () => {
          voiceConversationRef.current = null
          setVoiceStatus('idle')
        },
        onMessage: (event: { message?: string; source?: string }) => {
          const text = typeof event?.message === 'string' ? event.message : ''
          appendVoiceLine(event?.source === 'user' ? 'user' : 'assistant', text)
        },
        onError: (error: unknown) => {
          setVoiceStatus('error')
          setVoiceMessage('A conversa por voz encontrou um erro: ' + friendlyError(error))
        },
      })
      voiceConversationRef.current = conversation
      setVoiceStatus('connected')
      setVoiceMessage('Conectado. Converse com a Lumi e use o botão Encerrar quando terminar.')
    } catch (error) {
      voiceConversationRef.current = null
      setVoiceStatus('error')
      const name = error instanceof DOMException ? error.name : ''
      setVoiceMessage(name === 'NotAllowedError'
        ? 'O acesso ao microfone foi negado. Libere a permissão do microfone no navegador e tente novamente.'
        : 'Não foi possível iniciar a Lumi por voz: ' + friendlyError(error))
    }
  }

  const sendChat = async (event: FormEvent) => {
    event.preventDefault()
    const message = chatInput.trim()
    if (!message || chatBusy) return
    const history = chat.slice(-8)
    setChat(current => [...current, { role: 'user', text: message }])
    setChatInput('')
    setChatNotice('')
    setChatBusy(true)
    try {
      if (supabase && user) {
        const { data, error } = await supabase.functions.invoke('tutor', {
          body: {
            mode: 'conversation', message, history, profile,
            learningEvidence: { skillScores: {}, recentMistakes: [], previousInsights: [] },
          },
        })
        if (error) throw error
        const reply = typeof data?.reply === 'string' ? data.reply : ''
        if (!reply) throw new Error('A Lumi não retornou uma resposta.')
        setChat(current => [...current, { role: 'assistant', text: reply, note: data?.correction }])
        await supabase.from('chat_messages').insert([
          { user_id: user.id, role: 'user', content: message },
          { user_id: user.id, role: 'assistant', content: reply, metadata: data?.correction ? { correction: data.correction } : {} },
        ])
        if (data?.learning_insight?.observation && data?.learning_insight?.recommendation) {
          await supabase.from('learner_insights').insert({
            user_id: user.id, skill: data.learning_insight.skill || 'speaking',
            observation: data.learning_insight.observation, recommendation: data.learning_insight.recommendation,
            confidence: Math.max(0, Math.min(1, Number(data.learning_insight.confidence) || 0)),
            evidence: { source: 'conversation' },
          })
        }
      } else {
        await new Promise(resolve => window.setTimeout(resolve, 500))
        setChat(current => [...current, { role: 'assistant', text: demoAnswer(message, profile) }])
        setChatNotice('Modo demonstração: respostas de IA personalizadas e histórico entre dispositivos exigem uma conta conectada.')
      }
    } catch (error) {
      setChat(current => [...current, { role: 'assistant', text: 'I could not connect just now. Please try again in a moment.' }])
      setChatNotice('Falha ao conectar à Lumi: ' + friendlyError(error))
    } finally {
      setChatBusy(false)
    }
  }

  const submitActivity = async () => {
    if (answerIndex === null) {
      setActivityFeedback('Selecione uma resposta antes de conferir.')
      return
    }
    const correct = answerIndex === activity.correct
    setActivityCorrect(correct)
    setActivityFeedback(correct ? 'Correto. ' + activity.explanation : 'Ainda não. Resposta correta: ' + activity.options[activity.correct] + '. ' + activity.explanation)
    if (supabase && user) {
      const { error } = await supabase.from('activity_attempts').insert({
        user_id: user.id, activity_type: 'multiple_choice', skill: activity.skill,
        interest_context: profile.customInterest || profile.interests.join(', '),
        prompt: activity.prompt, learner_answer: activity.options[answerIndex],
        correction: { correct_answer: activity.options[activity.correct], explanation: activity.explanation },
        score: correct ? 100 : 0,
      })
      if (error) console.error('FALA activity attempt failed', error)
    }
    await recordSession('lesson', 180, correct ? 100 : 0, { title: activity.title, skill: activity.skill })
  }

  const nextActivity = () => {
    setActivityIndex(value => (value + 1) % activityBank.length)
    setAnswerIndex(null)
    setActivityFeedback('')
    setActivityCorrect(null)
  }

  const saveWord = async (event: FormEvent) => {
    event.preventDefault()
    const term = newWord.trim()
    if (!term) return
    const updated = [term, ...words.filter(word => word.toLowerCase() !== term.toLowerCase())].slice(0, 100)
    setWords(updated)
    setNewWord('')
    try { window.localStorage.setItem(WORDS_KEY, JSON.stringify(updated)) } catch { /* local cache is optional */ }
    if (supabase && user) {
      const { error } = await supabase.from('vocabulary_items').upsert({ user_id: user.id, term, meaning: '' }, { onConflict: 'user_id,term' })
      if (error) setToast('A palavra foi salva localmente, mas não sincronizou: ' + error.message)
    }
  }

  const deleteWord = async (term: string) => {
    const updated = words.filter(word => word !== term)
    setWords(updated)
    try { window.localStorage.setItem(WORDS_KEY, JSON.stringify(updated)) } catch { /* local cache is optional */ }
    if (supabase && user) {
      const { error } = await supabase.from('vocabulary_items').delete().eq('user_id', user.id).eq('term', term)
      if (error) setToast('A palavra foi removida localmente, mas não sincronizou.')
    }
  }

  const analyzeWriting = async (event: FormEvent) => {
    event.preventDefault()
    if (!writingText.trim() || writingBusy) return
    setWritingBusy(true)
    setWritingFeedback('')
    try {
      if (supabase && user) {
        const { data, error } = await supabase.functions.invoke('tutor', {
          body: { mode: 'writing', message: writingText.trim(), profile },
        })
        if (error) throw error
        if (typeof data?.reply !== 'string' || !data.reply) throw new Error('A Lumi não retornou uma análise.')
        setWritingFeedback(data.reply)
      } else {
        const count = writingText.trim().split(/\s+/).filter(Boolean).length
        setWritingFeedback('Você escreveu ' + count + ' palavras. Revise se cada frase tem sujeito, verbo e pontuação. No modo demonstração, esta tela não atribui nota nem inventa correções; entre para receber a análise da Lumi.')
      }
      await recordSession('writing', 240, null, { word_count: writingText.trim().split(/\s+/).length })
    } catch (error) {
      setWritingFeedback('Não foi possível analisar: ' + friendlyError(error))
    } finally {
      setWritingBusy(false)
    }
  }

  const startRecording = async () => {
    if (recording) return
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setRecordingNotice('A gravação exige HTTPS e permissão do microfone. Abra o FALA no Chrome ou Safari atualizado.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onerror = () => {
        setRecording(false)
        setRecordingNotice('O navegador interrompeu a gravação. Tente novamente.')
        stream.getTracks().forEach(track => track.stop())
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(previous => {
          if (previous) URL.revokeObjectURL(previous)
          return url
        })
        setRecording(false)
        if (!blob.size) {
          setRecordingNotice('O áudio ficou vazio. Grave novamente por pelo menos 2 segundos.')
          return
        }
        if (!supabase || !user) {
          setRecordingNotice('Gravação disponível neste aparelho. Entre na conta para solicitar a transcrição com a Lumi.')
          await recordSession('speaking', 30, null, { source: 'local_recording' })
          return
        }
        setRecordingNotice('Enviando o áudio para transcrição...')
        try {
          const form = new FormData()
          form.append('file', new File([blob], 'fala-practice.webm', { type: blob.type || 'audio/webm' }))
          const { data, error } = await supabase.functions.invoke('transcribe', { body: form })
          if (error) throw error
          const text = typeof data?.text === 'string' ? data.text.trim() : ''
          if (!text) {
            setRecordingNotice('Não identificamos palavras. Grave em um ambiente silencioso e tente novamente.')
            return
          }
          setTranscript(text)
          setRecordingNotice('Transcrição concluída. Ela identifica palavras, mas não mede pronúncia fonética.')
          await recordSession('speaking', 30, null, { transcript: text, source: 'media_recorder' })
        } catch (error) {
          setRecordingNotice('A transcrição falhou: ' + friendlyError(error))
        }
      }
      recorder.start(500)
      setRecording(true)
      setRecordingNotice('Gravando. Fale uma ou duas frases em inglês e depois pare.')
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permissão do microfone negada. Libere o acesso nas configurações do navegador.'
        : 'Não foi possível iniciar o microfone. Verifique se outro aplicativo está usando o dispositivo.'
      setRecordingNotice(message)
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setToast('Este navegador não oferece leitura de texto por voz.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = profile.accent === 'uk' ? 'en-GB' : 'en-US'
    utterance.rate = 0.88
    window.speechSynthesis.speak(utterance)
  }

  const beginProfileEdit = () => {
    setNameDraft(profile.name)
    setGoalDraft(profile.goal)
    setLevelDraft(profile.level)
    setInterestsDraft(profile.interests)
    setCustomInterestDraft(profile.customInterest)
    setProfileOpen(true)
  }

  if (!authReady) {
    return <div className="boot-screen"><div className="brand-mark">f.</div><strong>FALA English</strong><span>Preparando seu espaço de aprendizagem…</span></div>
  }

  return (
    <div className="fala-app">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">f.</div>
          <div><strong>fala<span>english</span></strong><small>APRENDIZAGEM COM IA</small></div>
        </div>
        <div className="side-label">SEU ESPAÇO</div>
        <nav className="side-nav" aria-label="Navegação principal">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={page === item.id ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(item.id); setMenuOpen(false) }}>
              <Icon size={18}/><span>{item.label}</span>{item.id === 'lumi' && <i className="nav-ai-dot"/>}
            </button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-box"><div><Flame size={17}/><strong>Seu ritmo</strong></div><p>Um pouco de inglês todos os dias vale mais que estudar só de vez em quando.</p></div>
          <button className="profile-mini" onClick={beginProfileEdit}>
            <span className="profile-avatar">{(profile.name || user?.email || 'F').slice(0,1).toUpperCase()}</span>
            <span><strong>{profile.name || (user ? 'Sua conta' : 'Modo demonstração')}</strong><small>{user ? 'Conta sincronizada' : 'Dados neste aparelho'}</small></span>
            <ChevronRight size={16}/>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-title">
            <button className="mobile-menu-button" onClick={() => setMenuOpen(value => !value)} aria-label="Abrir menu"><MoreHorizontal size={20}/></button>
            <span>FALA / <strong>{titleByPage[page]}</strong></span>
          </div>
          <div className="topbar-actions">
            <span className={isConnected ? 'connection-pill connected' : 'connection-pill'}><i/>{isConnected ? 'Conta conectada' : 'Modo gratuito'}</span>
            {user ? <button className="topbar-button" onClick={() => void signOut()}><LogOut size={16}/> Sair</button> : <button className="topbar-button sign-in-button" onClick={() => { setAuthMode('signin'); setAuthOpen(true); setAuthMessage('') }}><LogIn size={16}/> Entrar</button>}
          </div>
        </header>

        {menuOpen && <div className="mobile-menu">{navItems.map(item => <button key={item.id} onClick={() => { setPage(item.id); setMenuOpen(false) }}>{item.label}</button>)}</div>}

        <main className="page-content">
          {page === 'home' && <>
            <section className="welcome-strip">
              <div>
                <span className="eyebrow">SEU INGLÊS, NO SEU RITMO</span>
                <h1>{profile.name ? 'Olá, ' + greeting(profile.name) + '.' : 'Inglês que acompanha sua vida.'}<br/><em>Aprenda para usar.</em></h1>
                <p>Prática objetiva, situações reais e uma rotina adaptada ao que você quer conquistar.</p>
                <div className="welcome-actions">
                  <button className="button primary" onClick={() => setPage('learn')}>Começar a estudar <ArrowRight size={16}/></button>
                  <button className="button ghost" onClick={() => setPage('lumi')}><MessageCircle size={16}/> Conversar com a Lumi</button>
                </div>
              </div>
              <div className="welcome-art" aria-hidden="true">
                <div className="art-ring ring-one"/><div className="art-ring ring-two"/>
                <div className="art-core"><Sparkles size={34}/><strong>L</strong></div>
                <span className="art-note note-one">Practice</span><span className="art-note note-two">Progress</span>
              </div>
            </section>

            {!profile.name && <section className="profile-nudge">
              <div className="nudge-icon"><UserRound size={20}/></div>
              <div><strong>Personalize sua experiência</strong><p>Defina seu objetivo, nível e interesses para adaptar exemplos e exercícios.</p></div>
              <button className="button small-button" onClick={beginProfileEdit}>Configurar perfil <ArrowRight size={15}/></button>
            </section>}

            {showDemoHint && !user && <div className="demo-banner"><Sparkles size={17}/><span>Você está explorando gratuitamente. Suas atividades básicas funcionam sem cadastro; a Lumi com IA e a sincronização exigem uma conta.</span><button onClick={() => setShowDemoHint(false)} aria-label="Fechar aviso"><X size={15}/></button></div>}

            <div className="metrics-row">
              <article className="metric-card"><span className="metric-icon green"><Clock3 size={18}/></span><div><small>TEMPO DE PRÁTICA</small><strong>{totalMinutes} <i>min</i></strong><span>no seu histórico</span></div></article>
              <article className="metric-card"><span className="metric-icon amber"><Target size={18}/></span><div><small>SESSÕES</small><strong>{completedSessions}</strong><span>atividades concluídas</span></div></article>
              <article className="metric-card"><span className="metric-icon lilac"><Trophy size={18}/></span><div><small>APROVEITAMENTO</small><strong>{averageScore === null ? '—' : averageScore + '%'}</strong><span>{averageScore === null ? 'ainda sem dados suficientes' : 'média das tentativas'}</span></div></article>
            </div>

            <div className="section-heading"><div><span className="eyebrow">PLANO DE HOJE</span><h2>Um passo de cada vez</h2></div><span className="muted-caption">{profile.minutes} minutos sugeridos</span></div>
            <section className="today-card">
              <div className="today-copy"><span className="today-tag"><Sparkles size={13}/> RECOMENDADO PARA VOCÊ</span><h3>{activity.title}</h3><p>{activity.context} Comece com uma atividade curta e pratique uma expressão que poderá usar fora do aplicativo.</p><div className="today-meta"><span><Clock3 size={14}/> 3 minutos</span><span><BookOpen size={14}/> {activity.skill === 'speaking' ? 'Conversação' : activity.skill === 'writing' ? 'Estrutura de frases' : 'Compreensão'}</span></div><button className="button light-button" onClick={() => setPage('learn')}>Abrir atividade <ArrowRight size={16}/></button></div>
              <div className="today-visual"><div className="visual-circle"><BookOpen size={34}/></div><span>LESSON 01</span></div>
            </section>

            <div className="section-heading"><div><span className="eyebrow">SUAS FERRAMENTAS</span><h2>Escolha como praticar</h2></div></div>
            <div className="tool-grid">
              <button className="tool-card" onClick={() => setPage('lumi')}><span className="tool-icon violet"><MessageCircle size={20}/></span><strong>Conversa com a Lumi</strong><small>Pratique diálogos e receba correções pontuais.</small><ArrowRight size={16}/></button>
              <button className="tool-card" onClick={() => setPage('speak')}><span className="tool-icon mint"><Mic size={20}/></span><strong>Treino de fala</strong><small>Grave uma resposta e veja a transcrição.</small><ArrowRight size={16}/></button>
              <button className="tool-card" onClick={() => setPage('write')}><span className="tool-icon peach"><PenLine size={20}/></span><strong>Laboratório de escrita</strong><small>Construa frases e melhore seus textos.</small><ArrowRight size={16}/></button>
              <button className="tool-card" onClick={() => setPage('vocabulary')}><span className="tool-icon blue"><Bookmark size={20}/></span><strong>Meu vocabulário</strong><small>Guarde expressões que quer usar de verdade.</small><ArrowRight size={16}/></button>
            </div>
          </>}

          {page === 'learn' && <section className="learning-layout">
            <div className="page-heading"><span className="eyebrow">PRÁTICA GUIADA · 3 MINUTOS</span><h1>Aprenda fazendo.</h1><p>Uma situação, uma estrutura útil e uma tentativa sua. Sem excesso de teoria.</p></div>
            <article className="exercise-card">
              <div className="exercise-top"><span className="exercise-index">ATIVIDADE {String(activityIndex + 1).padStart(2,'0')}</span><span className="skill-chip">{activity.skill === 'speaking' ? 'CONVERSAÇÃO' : activity.skill === 'writing' ? 'GRAMÁTICA EM CONTEXTO' : 'COMPREENSÃO'}</span></div>
              <h2>{activity.title}</h2><p className="exercise-context">{activity.context}</p>
              <div className="phrase-box"><div><span>EXPRESSÃO-CHAVE</span><strong>{activity.phrase}</strong><small>{activity.translation}</small></div><button className="round-action" onClick={() => speak(activity.phrase)} aria-label="Ouvir expressão"><Volume2 size={19}/></button></div>
              <h3>{activity.prompt}</h3>
              <div className="answer-options">{activity.options.map((option,index) => <button key={option} className={answerIndex === index ? 'answer-option selected' : 'answer-option'} onClick={() => { setAnswerIndex(index); setActivityFeedback(''); setActivityCorrect(null) }}><span>{String.fromCharCode(65+index)}</span>{option}{answerIndex === index && <CheckCircle2 size={18}/>}</button>)}</div>
              {activityFeedback && <div className={activityCorrect ? 'feedback-panel good' : 'feedback-panel'}><strong>{activityCorrect ? 'Resposta correta' : 'Vamos ajustar'}</strong><p>{activityFeedback}</p></div>}
              <div className="exercise-footer">{activityFeedback ? <button className="button primary" onClick={nextActivity}>Próxima atividade <ArrowRight size={16}/></button> : <button className="button primary" onClick={() => void submitActivity()}>Conferir resposta <Check size={16}/></button>}</div>
            </article>
            <aside className="learning-aside"><div className="aside-tip"><Sparkles size={19}/><strong>Aprender para usar</strong><p>Não memorize só a resposta. Leia a expressão em voz alta e imagine uma situação em que ela seria útil.</p></div><div className="aside-card"><span className="eyebrow">SEU PERFIL</span><strong>{profile.goal === 'work' ? 'Inglês para trabalho' : profile.goal === 'travel' ? 'Inglês para viagens' : profile.goal === 'study' ? 'Inglês para estudos' : 'Inglês para o dia a dia'}</strong><p>{profile.level === 'beginner' ? 'Começando do zero' : profile.level === 'basic' ? 'Básico' : profile.level === 'intermediate' ? 'Intermediário' : profile.level === 'advanced' ? 'Avançado' : 'Nível a descobrir'}</p><button className="text-button" onClick={beginProfileEdit}>Editar perfil <ArrowRight size={14}/></button></div></aside>
          </section>}

          {page === 'lumi' && <section className="lumi-layout">
            <div className="page-heading"><span className="eyebrow">TUTORA DE INGLÊS · LUMI</span><h1>Converse para evoluir.</h1><p>Use o inglês no seu nível. A Lumi prioriza comunicação e corrige um ponto importante por vez.</p></div>
            <section className="voice-session-card">
              <div className={'voice-lumi-orb ' + voiceStatus}><span>L</span><i/></div>
              <div className="voice-session-copy">
                <span className="eyebrow">PERSONAGEM DE VOZ · ELEVENLABS</span>
                <h2>Converse com a Lumi.</h2>
                <p>Uma tutora com voz própria, imersão em inglês e explicações curtas em português quando você precisar.</p>
                <small className={'voice-state ' + voiceStatus}>{voiceStatus === 'connected' ? 'AO VIVO · MICROFONE ATIVO' : voiceStatus === 'connecting' ? 'CONECTANDO…' : voiceStatus === 'error' ? 'CONEXÃO NÃO INICIADA' : 'PRONTA PARA CONVERSAR'}</small>
              </div>
              <div className="voice-session-actions">
                <button className={voiceStatus === 'connected' ? 'button voice-stop' : 'button primary'} onClick={() => void startLumiVoice()} disabled={voiceStatus === 'connecting'}>
                  {voiceStatus === 'connected' ? <><X size={16}/> Encerrar</> : <><Mic size={16}/> {voiceStatus === 'connecting' ? 'Conectando…' : user ? 'Conversar por voz' : 'Entrar para falar'}</>}
                </button>
                <small>{user ? 'Acesso autenticado · sem gravação de áudio' : 'A voz exige uma conta; o chat de texto funciona em demonstração.'}</small>
              </div>
            </section>
            {voiceMessage && <p className={'voice-session-notice ' + voiceStatus}>{voiceMessage}</p>}
            <div className="chat-panel">
              <div className="chat-header"><div className="lumi-avatar">L<span/></div><div><strong>Lumi</strong><small>{user ? 'Tutora conectada · perfil personalizado' : 'Parceira de prática · modo demonstração'}</small></div><span className={user ? 'online-state' : 'demo-state'}>{user ? 'ONLINE' : 'DEMO'}</span></div>
              <div className="chat-body">
                {chat.map((item,index) => <div key={index} className={'chat-row ' + item.role}><div className="chat-avatar">{item.role === 'assistant' ? 'L' : (profile.name || 'V').slice(0,1).toUpperCase()}</div><div className="chat-bubble"><p>{item.text}</p>{item.note && <small className="correction-note">{item.note}</small>}</div></div>)}
                {chatBusy && <div className="chat-row assistant"><div className="chat-avatar">L</div><div className="chat-bubble typing"><i/><i/><i/></div></div>}
                <div ref={chatEndRef}/>
              </div>
              <form className="chat-compose" onSubmit={sendChat}><input value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder="Escreva em inglês ou peça ajuda em português…" aria-label="Mensagem para a Lumi"/><button type="submit" disabled={!chatInput.trim() || chatBusy} aria-label="Enviar mensagem"><Send size={18}/></button></form>
              {chatNotice && <p className="inline-notice">{chatNotice}</p>}
              <div className="chat-foot"><Sparkles size={14}/> Dica: tente escrever em inglês, mesmo que a frase ainda não esteja perfeita.</div>
            </div>
          </section>}

          {page === 'speak' && <section className="practice-layout">
            <div className="page-heading"><span className="eyebrow">SPEAKING LAB · FALA</span><h1>Use sua voz.</h1><p>Grave uma resposta curta, ouça e observe o que conseguiu comunicar.</p></div>
            <div className="practice-grid">
              <article className="practice-card mic-card"><span className="eyebrow">DESAFIO DE HOJE</span><h2>Tell me about something you enjoy.</h2><p>Conte em inglês sobre um interesse seu. Tente falar por 10 a 20 segundos.</p><div className="prompt-translation">Conte sobre algo de que você gosta. Por que isso interessa a você?</div><button className={recording ? 'record-button recording' : 'record-button'} onClick={() => recording ? stopRecording() : void startRecording()}>{recording ? <span className="stop-square"/> : <Mic size={25}/>}<strong>{recording ? 'Parar gravação' : 'Começar gravação'}</strong></button><small className="record-hint">{recording ? 'Gravando agora. Fale naturalmente.' : 'O áudio fica no aparelho até você sair desta tela.'}</small>{recordingNotice && <p className="inline-notice">{recordingNotice}</p>}{audioUrl && <div className="audio-preview"><span><Play size={15}/> Sua gravação</span><audio controls src={audioUrl}/></div>}</article>
              <article className="practice-card phrase-card"><span className="eyebrow">ESTRUTURAS PARA COMEÇAR</span><h3>Você pode usar:</h3>{['I really enjoy…','I have been interested in…','One thing I like about it is…'].map(phrase => <div className="starter-phrase" key={phrase}><span>{phrase}</span><button className="round-action" onClick={() => speak(phrase)} aria-label={'Ouvir ' + phrase}><Volume2 size={17}/></button></div>)}<div className="aside-tip compact"><Headphones size={17}/><p>Ouvir a própria gravação ajuda a perceber pausas e clareza. A transcrição não é uma nota de pronúncia.</p></div></article>
            </div>
            {transcript && <article className="transcript-card"><span className="eyebrow">TRANSCRIÇÃO RECONHECIDA</span><p>{transcript}</p><button className="text-button" onClick={() => setPage('lumi')}>Conversar sobre minha resposta <ArrowRight size={14}/></button></article>}
          </section>}

          {page === 'write' && <section className="writing-layout">
            <div className="page-heading"><span className="eyebrow">WRITING LAB · ESCRITA</span><h1>Transforme ideias em frases.</h1><p>Escreva sem medo de errar. O importante é construir uma mensagem clara.</p></div>
            <div className="writing-grid">
              <form className="writing-card" onSubmit={analyzeWriting}><div className="writing-prompt"><span className="eyebrow">PROMPT</span><h2>Write about something you want to learn.</h2><p>Escreva de 3 a 5 frases sobre algo que deseja aprender, por que isso interessa a você e como pretende praticar.</p></div><textarea value={writingText} onChange={event => setWritingText(event.target.value)} rows={8} placeholder="I want to learn…"/><div className="writing-actions"><span>{writingText.trim() ? writingText.trim().split(/\s+/).length : 0} palavras</span><button className="button primary" type="submit" disabled={!writingText.trim() || writingBusy}>{writingBusy ? 'Analisando…' : 'Analisar com a Lumi'} <Sparkles size={15}/></button></div>{writingFeedback && <div className="writing-result"><span className="eyebrow">FEEDBACK</span><p>{writingFeedback}</p></div>}</form>
              <aside className="practice-card writing-tips"><span className="eyebrow">CONECTORES ÚTEIS</span><h3>Conecte suas ideias.</h3>{[['because','porque'],['but','mas'],['so','então / por isso'],['also','também']].map(item => <div className="connector-row" key={item[0]}><strong>{item[0]}</strong><span>{item[1]}</span><button className="round-action" onClick={() => speak(item[0])}><Volume2 size={16}/></button></div>)}</aside>
            </div>
          </section>}

          {page === 'vocabulary' && <section className="vocabulary-layout">
            <div className="page-heading"><span className="eyebrow">YOUR WORD BANK · VOCABULÁRIO</span><h1>Palavras que ficam.</h1><p>Guarde expressões úteis para revisar e usar em conversas reais.</p></div>
            <form className="add-word-form" onSubmit={saveWord}><input value={newWord} onChange={event => setNewWord(event.target.value)} placeholder="Adicionar uma palavra ou expressão…"/><button className="button primary" type="submit" disabled={!newWord.trim()}><Plus size={17}/> Salvar palavra</button></form>
            <div className="vocab-count"><strong>{words.length}</strong><span>expressões no seu caderno</span></div>
            <div className="vocab-list">{words.map((word,index) => <article className="vocab-item" key={word}><span className="vocab-number">{String(index+1).padStart(2,'0')}</span><div><strong>{word}</strong><small>{word === 'actually' ? 'na verdade · de fato' : word === 'figure out' ? 'descobrir · entender' : word === 'I am looking forward to' ? 'estou ansioso por' : 'Expressão salva por você'}</small></div><button className="round-action" onClick={() => speak(word)} aria-label={'Ouvir ' + word}><Volume2 size={17}/></button><button className="remove-word" onClick={() => void deleteWord(word)} aria-label={'Remover ' + word}><Trash2 size={16}/></button></article>)}</div>
          </section>}

          {page === 'progress' && <section className="progress-layout">
            <div className="page-heading"><span className="eyebrow">SEU HISTÓRICO</span><h1>Progresso baseado em prática.</h1><p>Os indicadores refletem sessões e tentativas registradas. Não são uma certificação de proficiência.</p></div>
            <div className="progress-summary"><article className="progress-stat"><Clock3 size={20}/><span>Tempo registrado</span><strong>{totalMinutes} min</strong></article><article className="progress-stat"><Activity size={20}/><span>Sessões concluídas</span><strong>{completedSessions}</strong></article><article className="progress-stat"><Trophy size={20}/><span>Média das tentativas</span><strong>{averageScore === null ? '—' : averageScore + '%'}</strong></article></div>
            <article className="history-card"><div className="section-heading"><div><span className="eyebrow">ATIVIDADE RECENTE</span><h2>Seu histórico</h2></div>{cloudLoading && <span className="muted-caption">Sincronizando…</span>}</div>{sessions.length ? sessions.slice(0,12).map((session,index) => <div className="history-row" key={session.id || index}><span className="history-icon"><CheckCircle2 size={17}/></span><div><strong>{session.activity_type === 'speaking' ? 'Prática de fala' : session.activity_type === 'writing' ? 'Prática de escrita' : session.activity_type === 'lesson' ? 'Atividade guiada' : 'Sessão de estudo'}</strong><small>{session.completed_at ? new Date(session.completed_at).toLocaleDateString('pt-BR') : 'Registrada nesta sessão'}</small></div><span>{Math.round(session.duration_seconds / 60)} min</span>{session.score !== null && <b>{Math.round(session.score)}%</b>}</div>) : <div className="empty-state"><Activity size={26}/><strong>Seu histórico começa com a prática.</strong><p>Conclua uma atividade para começar a construir seu histórico neste aparelho.</p><button className="button primary" onClick={() => setPage('learn')}>Fazer primeira atividade <ArrowRight size={15}/></button></div>}</article>
          </section>}
        </main>

        <footer className="app-footer"><span>FALA ENGLISH</span><span>Prática com intenção. Progresso com evidência.</span></footer>
      </div>

      <nav className="mobile-dock" aria-label="Navegação no celular">
        {navItems.slice(0,4).map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon size={19}/><span>{item.id === 'home' ? 'Início' : item.id === 'learn' ? 'Aprender' : item.id === 'lumi' ? 'Lumi' : 'Falar'}</span></button> })}
        <button className={mobileMore ? 'active' : ''} onClick={() => setMobileMore(value => !value)}><MoreHorizontal size={19}/><span>Mais</span></button>
      </nav>
      {mobileMore && <div className="mobile-more-backdrop" onClick={() => setMobileMore(false)}><div className="mobile-more-sheet" onClick={event => event.stopPropagation()}><div className="sheet-heading"><strong>Mais ferramentas</strong><button onClick={() => setMobileMore(false)}><X size={18}/></button></div>{navItems.slice(4).map(item => <button key={item.id} onClick={() => { setPage(item.id); setMobileMore(false) }}>{item.label}<ChevronRight size={16}/></button>)}</div></div>}

      {authOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAuthOpen(false) }}><section className="dialog-card auth-dialog"><button className="dialog-close" onClick={() => setAuthOpen(false)} aria-label="Fechar"><X size={18}/></button><div className="dialog-brand"><div className="brand-mark">f.</div><strong>FALA <span>ENGLISH</span></strong></div><span className="eyebrow">SUA CONTA</span><h2>{authMode === 'signup' ? 'Crie sua conta.' : authMode === 'reset' ? 'Recuperar acesso.' : 'Continue sua jornada.'}</h2><p>{authMode === 'signup' ? 'Salve seu progresso e tenha seu espaço disponível em outros dispositivos.' : authMode === 'reset' ? 'Informe seu e-mail para receber o link de recuperação.' : 'Entre para sincronizar seus dados e usar a Lumi com IA.'}</p><form onSubmit={submitAuth}><label>E-mail<input type="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="voce@email.com" required autoComplete="email"/></label>{authMode !== 'reset' && <label>Senha<input type="password" value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} required autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}/></label>}<button className="button primary dialog-submit" type="submit" disabled={authBusy}>{authBusy ? 'Processando…' : authMode === 'signup' ? 'Criar conta' : authMode === 'reset' ? 'Enviar link de recuperação' : 'Entrar'} <ArrowRight size={16}/></button></form>{authMessage && <p className="dialog-message">{authMessage}</p>}<div className="auth-switch">{authMode === 'signin' ? <><button onClick={() => { setAuthMode('signup'); setAuthMessage('') }}>Criar uma conta</button><button onClick={() => { setAuthMode('reset'); setAuthMessage('') }}>Esqueci minha senha</button></> : <button onClick={() => { setAuthMode('signin'); setAuthMessage('') }}>Voltar para entrar</button>}</div><small className="privacy-note"><span><CheckCircle2 size={14}/></span> O modo de demonstração continua disponível sem cadastro. Seus dados sincronizados ficam protegidos pela conta e pelas políticas do Supabase.</small></section></div>}

      {profileOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setProfileOpen(false) }}><section className="dialog-card profile-dialog"><button className="dialog-close" onClick={() => setProfileOpen(false)} aria-label="Fechar"><X size={18}/></button><span className="eyebrow">PERSONALIZAÇÃO</span><h2>Seu inglês começa com você.</h2><p>Essas preferências ajudam a escolher contextos e exemplos mais relevantes.</p><form onSubmit={saveProfile}><label>Como podemos chamar você?<input value={nameDraft} onChange={event => setNameDraft(event.target.value)} placeholder="Seu primeiro nome"/></label><label>Objetivo principal<select value={goalDraft} onChange={event => setGoalDraft(event.target.value as Goal)}><option value="conversation">Conversar com confiança</option><option value="work">Trabalho e carreira</option><option value="travel">Viagens</option><option value="study">Estudos</option><option value="life">Um pouco de tudo</option></select></label><label>Nível atual<select value={levelDraft} onChange={event => setLevelDraft(event.target.value as Level)}><option value="unsure">Ainda não sei</option><option value="beginner">Começando do zero</option><option value="basic">Básico</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option></select></label><div className="form-label">Seus interesses</div><div className="interest-pills">{interestOptions.map(item => <button type="button" key={item} className={interestsDraft.includes(item) ? 'chosen' : ''} onClick={() => setInterestsDraft(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])}>{interestsDraft.includes(item) && <Check size={13}/>} {item}</button>)}</div><label>Outro interesse (opcional)<input value={customInterestDraft} onChange={event => setCustomInterestDraft(event.target.value)} placeholder="Ex.: Fórmula 1, Python, empreendedorismo…"/></label><button className="button primary dialog-submit" type="submit">Salvar preferências <Check size={16}/></button></form></section></div>}

      {toast && <div className="toast-message" role="status">{toast}</div>}
    </div>
  )
}
