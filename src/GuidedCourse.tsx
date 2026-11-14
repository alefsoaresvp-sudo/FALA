import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BookOpen, Check, CheckCircle2, CircleHelp, Headphones,
  LockKeyhole, MessageCircle, Mic, Play, RotateCcw, Sparkles, Star, Volume2,
  X, Zap,
} from 'lucide-react'
import './GuidedCourse.css'

type ExerciseKind = 'choice' | 'build' | 'type' | 'listen' | 'repeat'
type CourseSpeechResult = { 0?: { transcript: string } }
type CourseSpeechEvent = { results: ArrayLike<CourseSpeechResult> }
type CourseSpeechInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: CourseSpeechEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => CourseSpeechInstance
  webkitSpeechRecognition?: new () => CourseSpeechInstance
}
type Exercise = {
  kind: ExerciseKind
  prompt: string
  options?: string[]
  tokens?: string[]
  answer: string
  explanation: string
  hint?: string
}
type Lesson = {
  id: string
  title: string
  subtitle: string
  objective: string
  pattern: string
  teach: { term: string; meaning: string; example: string }[]
  exercises: Exercise[]
}
type Unit = { id: string; title: string; subtitle: string; lessons: Lesson[] }
type SavedProgress = { completedLessonIds: string[]; xp: number; introDone: boolean; activeLessonId: string | null }
type Props = {
  accent?: 'us' | 'uk'
  goalLabel?: string
  onAskTutor: (question: string) => void
  onLessonComplete: (score: number) => void
}

const STORAGE_KEY = 'fala-course-progress-v1'
const initialProgress: SavedProgress = { completedLessonIds: [], xp: 0, introDone: false, activeLessonId: null }

const units: Unit[] = [
  {
    id: 'first-words',
    title: 'Começando do zero',
    subtitle: 'Primeiras palavras, apresentações, números e objetos.',
    lessons: [
      {
        id: 'greetings',
        title: 'Diga olá e se apresente',
        subtitle: 'Cumprimentos e seu nome',
        objective: 'Cumprimentar alguém e dizer seu nome.',
        pattern: 'My name is... = Meu nome é...  |  I am... = Eu sou / estou...',
        teach: [
          { term: 'Hello / Hi', meaning: 'Olá / Oi', example: 'Hello! = Olá!' },
          { term: 'Good morning', meaning: 'Bom dia', example: 'Good morning, Ana.' },
          { term: 'My name is...', meaning: 'Meu nome é...', example: 'My name is Ana.' },
          { term: 'I am...', meaning: 'Eu sou / estou...', example: 'I am Pedro.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como se diz “Olá” em inglês?', options: ['Goodbye', 'Hello', 'Please'], answer: 'Hello', explanation: 'Hello significa “olá”. Hi também significa “oi” e é mais informal.' },
          { kind: 'build', prompt: 'Monte: “Meu nome é Ana.”', tokens: ['Ana.', 'is', 'My', 'name'], answer: 'My name is Ana.', explanation: 'A ordem é My + name + is + nome. Em inglês, não dizemos “My is name”.' },
          { kind: 'type', prompt: 'Escreva em inglês: “Eu sou Pedro.”', answer: 'I am Pedro.', explanation: 'I significa “eu” e am é a forma do verbo be usada com I.' },
          { kind: 'listen', prompt: 'Ouça e escreva exatamente o que escutar.', answer: 'Good morning.', explanation: 'Good morning significa “bom dia”. Ouça o som das duas palavras juntas.' },
          { kind: 'repeat', prompt: 'Ouça e repita em voz alta: “Nice to meet you.”', answer: 'Nice to meet you.', explanation: 'A expressão significa “prazer em conhecer você”. Repita em voz alta; este exercício não mede fonética automaticamente.' },
        ],
      },
      {
        id: 'numbers-colors',
        title: 'Números, cores e coisas',
        subtitle: 'Vocabulário essencial',
        objective: 'Reconhecer números de 1 a 10, cores e objetos comuns.',
        pattern: 'A blue book = Um livro azul  |  I have two pens = Eu tenho duas canetas',
        teach: [
          { term: 'one, two, three', meaning: 'um, dois, três', example: 'One apple = Uma maçã' },
          { term: 'four, five, six', meaning: 'quatro, cinco, seis', example: 'Five books = Cinco livros' },
          { term: 'red, blue, green', meaning: 'vermelho, azul, verde', example: 'A red car = Um carro vermelho' },
          { term: 'book / phone / water', meaning: 'livro / telefone / água', example: 'My phone = Meu telefone' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual palavra significa “sete”?', options: ['Six', 'Seven', 'Ten'], answer: 'Seven', explanation: 'Seven = sete. Six = seis e ten = dez.' },
          { kind: 'choice', prompt: 'O que significa “blue”?', options: ['Azul', 'Verde', 'Vermelho'], answer: 'Azul', explanation: 'Blue = azul. Green = verde e red = vermelho.' },
          { kind: 'build', prompt: 'Monte: “Um livro azul.”', tokens: ['book.', 'A', 'blue'], answer: 'A blue book.', explanation: 'Em inglês, a cor vem antes do objeto: blue book.' },
          { kind: 'type', prompt: 'Escreva em inglês: “dois telefones”.', answer: 'Two phones.', explanation: 'Two significa dois. Para a maioria dos substantivos contáveis, acrescentamos -s no plural: phone → phones.' },
          { kind: 'listen', prompt: 'Ouça e escreva o número que escutar por extenso.', answer: 'Eight.', explanation: 'Eight significa oito. Não confunda eight /eɪt/ com ate /eɪt/, que é uma palavra diferente pelo contexto.' },
        ],
      },
      {
        id: 'pronouns-be',
        title: 'Quem é quem: I, you, he, she',
        subtitle: 'Pronomes e verbo to be',
        objective: 'Formar frases simples com pessoas.',
        pattern: 'I am  |  You are  |  He is  |  She is',
        teach: [
          { term: 'I', meaning: 'eu', example: 'I am Ana. = Eu sou Ana.' },
          { term: 'You', meaning: 'você / vocês', example: 'You are here. = Você está aqui.' },
          { term: 'He / She', meaning: 'ele / ela', example: 'She is happy. = Ela está feliz.' },
          { term: 'am / are / is', meaning: 'formas do verbo ser / estar', example: 'I am, you are, he is.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “I ___ Brazilian.”', options: ['is', 'are', 'am'], answer: 'am', explanation: 'Com I, usamos am: I am Brazilian.' },
          { kind: 'choice', prompt: 'Qual pronome significa “ela”?', options: ['He', 'She', 'You'], answer: 'She', explanation: 'She = ela. He = ele. You = você ou vocês.' },
          { kind: 'build', prompt: 'Monte: “Ele está feliz.”', tokens: ['happy.', 'He', 'is'], answer: 'He is happy.', explanation: 'He pede is. A estrutura básica é pessoa + be + característica.' },
          { kind: 'type', prompt: 'Escreva: “Você é estudante.”', answer: 'You are a student.', explanation: 'You are = você é. Usamos a antes de student, porque é um substantivo contável no singular.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “She is my friend.”', answer: 'She is my friend.', explanation: 'She is = ela é/está. My friend = minha amiga ou meu amigo.' },
        ],
      },
    ],
  },
  {
    id: 'first-sentences',
    title: 'Monte suas primeiras frases',
    subtitle: 'Aprenda a combinar palavras e verbos.',
    lessons: [
      {
        id: 'i-want',
        title: 'Diga o que você quer',
        subtitle: 'I want + alguma coisa',
        objective: 'Pedir coisas usando uma estrutura que pode ser reutilizada.',
        pattern: 'I want + substantivo = Eu quero + alguma coisa',
        teach: [
          { term: 'I', meaning: 'eu', example: 'I = eu' },
          { term: 'want', meaning: 'quero / deseja', example: 'I want = Eu quero' },
          { term: 'water / juice / coffee', meaning: 'água / suco / café', example: 'I want water. = Eu quero água.' },
          { term: 'please', meaning: 'por favor', example: 'Water, please. = Água, por favor.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'O que significa “I want”?', options: ['Eu tenho', 'Eu quero', 'Eu gosto'], answer: 'Eu quero', explanation: 'I = eu; want = quero. Juntas: I want = eu quero.' },
          { kind: 'build', prompt: 'Monte: “Eu quero suco.”', tokens: ['juice.', 'want', 'I'], answer: 'I want juice.', explanation: 'A estrutura é I + want + o que você quer. Troque juice por water, coffee ou food.' },
          { kind: 'type', prompt: 'Escreva em inglês: “Eu quero água.”', answer: 'I want water.', explanation: 'I want water = Eu quero água. Water normalmente não recebe plural quando falamos da bebida.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'I want coffee.', explanation: 'I want coffee = Eu quero café. Perceba que want vem antes da coisa desejada.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I want the juice, please.”', answer: 'I want the juice, please.', explanation: 'The especifica um suco conhecido: “o suco”. Please deixa o pedido mais educado.' },
        ],
      },
      {
        id: 'i-have-like',
        title: 'Fale do que tem e gosta',
        subtitle: 'I have e I like',
        objective: 'Dizer o que você possui e suas preferências.',
        pattern: 'I have = Eu tenho  |  I like = Eu gosto de',
        teach: [
          { term: 'have', meaning: 'ter', example: 'I have a car. = Eu tenho um carro.' },
          { term: 'like', meaning: 'gostar', example: 'I like music. = Eu gosto de música.' },
          { term: 'a / an', meaning: 'um / uma', example: 'a book; an apple. Use an antes de som de vogal.' },
          { term: 'also', meaning: 'também', example: 'I also like coffee. = Eu também gosto de café.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como dizer “Eu tenho um carro”?', options: ['I am a car.', 'I have a car.', 'I like a car.'], answer: 'I have a car.', explanation: 'Have significa ter. I have a car = Eu tenho um carro.' },
          { kind: 'build', prompt: 'Monte: “Eu gosto de música.”', tokens: ['music.', 'I', 'like'], answer: 'I like music.', explanation: 'Depois de I like, colocamos aquilo de que gostamos.' },
          { kind: 'type', prompt: 'Escreva: “Eu tenho uma maçã.”', answer: 'I have an apple.', explanation: 'Usamos an antes de apple porque começa com som de vogal.' },
          { kind: 'choice', prompt: 'Complete: “I ___ coffee.” (Eu gosto de café.)', options: ['like', 'am', 'are'], answer: 'like', explanation: 'I like coffee = Eu gosto de café. Não usamos am antes do verbo like.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I have a phone and I like music.”', answer: 'I have a phone and I like music.', explanation: 'A frase combina duas ideias com and = e.' },
        ],
      },
      {
        id: 'questions-do',
        title: 'Faça perguntas simples',
        subtitle: 'Do you...? e respostas curtas',
        objective: 'Perguntar sobre gostos e responder de forma simples.',
        pattern: 'Do you like...? = Você gosta de...?  |  Yes, I do. / No, I do not.',
        teach: [
          { term: 'Do you...?', meaning: 'Você...? (pergunta)', example: 'Do you work? = Você trabalha?' },
          { term: 'Do you like...?', meaning: 'Você gosta de...?', example: 'Do you like music? = Você gosta de música?' },
          { term: 'Yes, I do.', meaning: 'Sim.', example: 'Yes, I do. = Sim, eu gosto / faço.' },
          { term: 'No, I do not.', meaning: 'Não.', example: 'No, I do not. = Não, eu não gosto / faço.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual pergunta significa “Você gosta de café?”', options: ['You like coffee?', 'Do you like coffee?', 'Are you like coffee?'], answer: 'Do you like coffee?', explanation: 'No presente simples, usamos Do + you + verbo na pergunta.' },
          { kind: 'build', prompt: 'Monte a pergunta: “Você trabalha?”', tokens: ['work?', 'Do', 'you'], answer: 'Do you work?', explanation: 'Do inicia a pergunta; you é o sujeito; work é o verbo na forma base.' },
          { kind: 'choice', prompt: 'Qual resposta curta é correta para “Yes”?', options: ['Yes, I do.', 'Yes, I am.', 'Yes, I have.'], answer: 'Yes, I do.', explanation: 'A pergunta começou com Do, então a resposta curta usa do.' },
          { kind: 'type', prompt: 'Escreva: “Você gosta de música?”', answer: 'Do you like music?', explanation: 'Do you like + assunto? é uma estrutura muito útil para iniciar conversas.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Do you speak English?”', answer: 'Do you speak English?', explanation: 'A frase significa “Você fala inglês?”. Speak = falar.' },
        ],
      },
    ],
  },
  {
    id: 'daily-life',
    title: 'Inglês do dia a dia',
    subtitle: 'Horários, rotina e situações comuns.',
    lessons: [
      {
        id: 'daily-routine',
        title: 'Fale da sua rotina',
        subtitle: 'Verbos comuns no presente',
        objective: 'Descrever hábitos com frases curtas.',
        pattern: 'I + verbo = Eu...  |  every day = todos os dias',
        teach: [
          { term: 'work', meaning: 'trabalhar', example: 'I work every day. = Eu trabalho todos os dias.' },
          { term: 'study', meaning: 'estudar', example: 'I study English. = Eu estudo inglês.' },
          { term: 'live', meaning: 'morar / viver', example: 'I live in Brazil. = Eu moro no Brasil.' },
          { term: 'every day', meaning: 'todos os dias', example: 'I study every day.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'O que significa “I study English”?', options: ['Eu ensino inglês.', 'Eu estudo inglês.', 'Eu trabalho em inglês.'], answer: 'Eu estudo inglês.', explanation: 'Study significa estudar. I study English = Eu estudo inglês.' },
          { kind: 'build', prompt: 'Monte: “Eu moro no Brasil.”', tokens: ['Brazil.', 'in', 'I', 'live'], answer: 'I live in Brazil.', explanation: 'Live in + lugar significa morar em determinado lugar.' },
          { kind: 'type', prompt: 'Escreva: “Eu trabalho todos os dias.”', answer: 'I work every day.', explanation: 'Every day são duas palavras e significa “todos os dias”.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'I study at night.', explanation: 'At night = à noite. I study at night = Eu estudo à noite.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I work and study English.”', answer: 'I work and study English.', explanation: 'And conecta duas ações: trabalho e estudo inglês.' },
        ],
      },
      {
        id: 'food-order',
        title: 'Peça comida com educação',
        subtitle: 'I would like...',
        objective: 'Fazer um pedido simples em um restaurante.',
        pattern: 'I would like... = Eu gostaria de...  |  Could I have...? = Poderia me trazer...?',
        teach: [
          { term: 'I would like', meaning: 'Eu gostaria', example: 'I would like a sandwich.' },
          { term: 'Could I have...?', meaning: 'Poderia me trazer...?', example: 'Could I have some water, please?' },
          { term: 'the menu', meaning: 'o cardápio', example: 'Can I see the menu? = Posso ver o cardápio?' },
          { term: 'the bill', meaning: 'a conta', example: 'Could we have the bill? = Poderia trazer a conta?' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual frase é mais educada para pedir um café?', options: ['Coffee now!', 'I would like a coffee, please.', 'Give coffee.'], answer: 'I would like a coffee, please.', explanation: 'I would like... é uma forma educada de pedir algo.' },
          { kind: 'build', prompt: 'Monte: “Eu gostaria de água, por favor.”', tokens: ['please.', 'water,', 'I', 'would', 'like'], answer: 'I would like water, please.', explanation: 'I would like + item + please. A vírgula é apenas pontuação; a ordem das palavras importa.' },
          { kind: 'type', prompt: 'Escreva: “Poderia me trazer o cardápio?”', answer: 'Could I have the menu?', explanation: 'Could I have...? é um pedido educado. The menu = o cardápio.' },
          { kind: 'listen', prompt: 'Ouça e escreva o pedido.', answer: 'Could I have the bill, please?', explanation: 'Bill é a conta do restaurante. Não confunda com a palavra menu.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I would like a table for two.”', answer: 'I would like a table for two.', explanation: 'A frase significa “Eu gostaria de uma mesa para duas pessoas”.' },
        ],
      },
    ],
  },
  {
    id: 'travel',
    title: 'Use o inglês em uma viagem',
    subtitle: 'Aplique o que aprendeu no aeroporto, hotel e cidade.',
    lessons: [
      {
        id: 'directions',
        title: 'Peça e entenda direções',
        subtitle: 'Where is...? e lugares',
        objective: 'Perguntar onde fica um lugar.',
        pattern: 'Where is...? = Onde fica...?  |  next to = ao lado de',
        teach: [
          { term: 'Where is...?', meaning: 'Onde fica...?', example: 'Where is the airport? = Onde fica o aeroporto?' },
          { term: 'the station', meaning: 'a estação', example: 'Where is the station?' },
          { term: 'near / far', meaning: 'perto / longe', example: 'Is it near? = Fica perto?' },
          { term: 'next to', meaning: 'ao lado de', example: 'It is next to the hotel.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como perguntar “Onde fica o banheiro?”', options: ['Where is the bathroom?', 'Bathroom where?', 'What bathroom is?'], answer: 'Where is the bathroom?', explanation: 'Use Where is + the + lugar para perguntar onde algo fica.' },
          { kind: 'build', prompt: 'Monte: “Onde fica a estação?”', tokens: ['station?', 'the', 'Where', 'is'], answer: 'Where is the station?', explanation: 'Where vem primeiro, depois is, the e o nome do lugar.' },
          { kind: 'type', prompt: 'Escreva: “O hotel fica perto.”', answer: 'The hotel is near.', explanation: 'The hotel = o hotel; is near = fica perto.' },
          { kind: 'listen', prompt: 'Ouça e escreva a pergunta.', answer: 'Where is the airport?', explanation: 'Airport = aeroporto. A pergunta pode ser reutilizada trocando apenas o lugar.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Could you show me on the map?”', answer: 'Could you show me on the map?', explanation: 'A frase significa “Você poderia me mostrar no mapa?”.' },
        ],
      },
      {
        id: 'airport-hotel',
        title: 'Aeroporto e hotel',
        subtitle: 'Frases práticas de viagem',
        objective: 'Dizer que tem uma reserva e pedir informação básica.',
        pattern: 'I have a reservation = Tenho uma reserva  |  What time...? = A que horas...?',
        teach: [
          { term: 'I have a reservation', meaning: 'Tenho uma reserva', example: 'I have a reservation under Silva.' },
          { term: 'passport', meaning: 'passaporte', example: 'Here is my passport. = Aqui está meu passaporte.' },
          { term: 'What time...?', meaning: 'A que horas...?', example: 'What time is breakfast?' },
          { term: 'check-in desk', meaning: 'balcão de check-in', example: 'Where is the check-in desk?' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como informar que você tem uma reserva?', options: ['I am a reservation.', 'I have a reservation.', 'I has reservation.'], answer: 'I have a reservation.', explanation: 'Have significa ter. Com I, usamos have, não has.' },
          { kind: 'build', prompt: 'Monte: “Aqui está meu passaporte.”', tokens: ['passport.', 'my', 'Here', 'is'], answer: 'Here is my passport.', explanation: 'Here is... significa “aqui está...”.' },
          { kind: 'type', prompt: 'Escreva: “A que horas é o café da manhã?”', answer: 'What time is breakfast?', explanation: 'What time pergunta horário. Breakfast significa café da manhã.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'Where is the check-in desk?', explanation: 'Check-in desk é o balcão de check-in do aeroporto.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I have a reservation under the name Silva.”', answer: 'I have a reservation under the name Silva.', explanation: 'Under the name significa “em nome de”. Troque Silva pelo seu sobrenome ao usar a frase.' },
        ],
      },
    ],
  },
]

function loadProgress(): SavedProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProgress
    return { ...initialProgress, ...JSON.parse(raw) as Partial<SavedProgress> }
  } catch {
    return initialProgress
  }
}
function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[.!?,]/g, '').replace(/\s+/g, ' ')
}
function speakEnglish(text: string, accent: 'us' | 'uk') {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US'
  utterance.rate = 0.86
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(voice => voice.lang.toLowerCase() === utterance.lang.toLowerCase())
  if (preferred) utterance.voice = preferred
  window.speechSynthesis.speak(utterance)
  return true
}

export default function GuidedCourse({ accent = 'us', goalLabel = 'seu objetivo', onAskTutor, onLessonComplete }: Props) {
  const [progress, setProgress] = useState<SavedProgress>(loadProgress)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => loadProgress().activeLessonId)
  const [step, setStep] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState('')
  const [builtWords, setBuiltWords] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [checked, setChecked] = useState<boolean | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [audioNotice, setAudioNotice] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)
  const recognitionRef = useRef<CourseSpeechInstance | null>(null)
  const [introShown, setIntroShown] = useState(() => !loadProgress().introDone)

  const allLessons = useMemo(() => units.flatMap(unit => unit.lessons), [])
  const currentLesson = allLessons.find(lesson => lesson.id === activeLessonId) ?? null
  const currentExercise = currentLesson?.exercises[step] ?? null
  const completedCount = progress.completedLessonIds.length
  const percentage = Math.round(completedCount / allLessons.length * 100)
  const nextLesson = allLessons.find((lesson, index) =>
    !progress.completedLessonIds.includes(lesson.id) &&
    (index === 0 || progress.completedLessonIds.includes(allLessons[index - 1].id))
  ) ?? null

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, activeLessonId })) } catch { /* Local progress remains available in this session. */ }
  }, [progress, activeLessonId])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const resetExercise = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setVoiceListening(false)
    setVoiceTranscript('')
    setSelectedChoice('')
    setBuiltWords([])
    setTypedAnswer('')
    setChecked(null)
    setAudioNotice('')
  }
  const beginLesson = (lessonId: string) => {
    setActiveLessonId(lessonId)
    setStep(0)
    setMistakes(0)
    resetExercise()
    setProgress(current => ({ ...current, activeLessonId: lessonId }))
  }
  const finishIntro = () => {
    setProgress(current => ({ ...current, introDone: true }))
    setIntroShown(false)
  }
  const currentAnswer = () => {
    if (!currentExercise) return ''
    if (currentExercise.kind === 'choice') return selectedChoice
    if (currentExercise.kind === 'build') return builtWords.join(' ')
    if (currentExercise.kind === 'repeat') return checked === true ? currentExercise.answer : ''
    return typedAnswer
  }
  const verify = () => {
    if (!currentExercise || checked !== null) return
    const correct = currentExercise.kind === 'repeat' || normalize(currentAnswer()) === normalize(currentExercise.answer)
    setChecked(correct)
    if (!correct) setMistakes(value => value + 1)
  }
  const retry = () => {
    resetExercise()
  }
  const nextStep = () => {
    if (!currentLesson || !currentExercise) return
    if (step < currentLesson.exercises.length - 1) {
      setStep(value => value + 1)
      resetExercise()
      return
    }
    const score = Math.max(50, Math.round((currentLesson.exercises.length - mistakes) / currentLesson.exercises.length * 100))
    setProgress(current => ({
      ...current,
      completedLessonIds: current.completedLessonIds.includes(currentLesson.id)
        ? current.completedLessonIds
        : [...current.completedLessonIds, currentLesson.id],
      xp: current.xp + (current.completedLessonIds.includes(currentLesson.id) ? 0 : 10),
      activeLessonId: null,
    }))
    setActiveLessonId(null)
    onLessonComplete(score)
  }
  const startSpeechCapture = () => {
    if (!currentExercise || currentExercise.kind !== 'repeat' || checked !== null) return
    const browserWindow = window as BrowserSpeechWindow
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition
    if (!Recognition) {
      setAudioNotice('Este navegador não oferece reconhecimento de fala nesta tela. Use “Marcar como praticado” depois de repetir.')
      return
    }
    try {
      setVoiceTranscript('')
      setAudioNotice('')
      const recognition = new Recognition()
      recognition.lang = accent === 'uk' ? 'en-GB' : 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() || ''
        setVoiceTranscript(transcript)
        const matched = normalize(transcript) === normalize(currentExercise.answer)
        setChecked(matched)
        if (!matched) setMistakes(value => value + 1)
        setAudioNotice(matched ? 'A transcrição reconheceu a frase esperada.' : 'A transcrição ficou diferente da frase-modelo. Ouça novamente e tente mais uma vez.')
      }
      recognition.onerror = event => {
        setAudioNotice('Não foi possível acessar o microfone (' + (event.error || 'erro') + '). Verifique a permissão e tente novamente.')
      }
      recognition.onend = () => {
        setVoiceListening(false)
        recognitionRef.current = null
      }
      recognitionRef.current = recognition
      setVoiceListening(true)
      recognition.start()
    } catch {
      setVoiceListening(false)
      setAudioNotice('Não foi possível iniciar o microfone. Verifique a permissão do navegador.')
    }
  }
  const playModel = (text: string) => {
    const played = speakEnglish(text, accent)
    setAudioNotice(played ? '' : 'A leitura em voz alta não está disponível neste navegador.')
  }
  const chooseWord = (word: string) => {
    if (checked !== null) return
    setBuiltWords(current => [...current, word])
  }
  const removeBuiltWord = (index: number) => {
    if (checked !== null) return
    setBuiltWords(current => current.filter((_, wordIndex) => wordIndex !== index))
  }

  if (introShown) return (
    <section className="guided-course">
      <div className="course-intro-card">
        <div className="course-brand-mark"><BookOpen size={25}/></div>
        <span className="course-eyebrow">BEM-VINDO AO CURSO FALA</span>
        <h1>Vamos começar <em>do zero.</em></h1>
        <p>Você não precisa saber nenhuma palavra. O curso vai ensinar primeiro, explicar cada parte e só depois pedir que você pratique.</p>
        <div className="course-intro-steps">
          <article><span>01</span><div><strong>Aprenda</strong><small>Veja palavras, tradução, exemplos e a regra por trás da frase.</small></div></article>
          <article><span>02</span><div><strong>Pratique</strong><small>Escolha, monte frases, escreva, escute e repita em voz alta.</small></div></article>
          <article><span>03</span><div><strong>Revise e avance</strong><small>As lições são liberadas em sequência e seu progresso fica salvo.</small></div></article>
        </div>
        <button className="course-primary-button" onClick={finishIntro}>Começar minha primeira aula <ArrowRight size={17}/></button>
        <small className="course-intro-note">Sem teste de entrada. A primeira lição começa com cumprimentos.</small>
      </div>
    </section>
  )

  if (currentLesson && currentExercise) {
    const progressPercent = Math.round(((step + 1) / currentLesson.exercises.length) * 100)
    const canCheck = currentExercise.kind === 'choice' ? !!selectedChoice
      : currentExercise.kind === 'build' ? builtWords.length > 0
        : currentExercise.kind === 'repeat' ? checked === true
          : !!typedAnswer.trim()
    return (
      <section className="guided-course guided-lesson-view">
        <div className="lesson-topbar">
          <button className="course-icon-button" onClick={() => { setActiveLessonId(null); setProgress(current => ({ ...current, activeLessonId: null })) }} aria-label="Sair da aula"><X size={19}/></button>
          <div className="lesson-progress-track"><i style={{ width: progressPercent + '%' }}/></div>
          <span>{step + 1}/{currentLesson.exercises.length}</span>
        </div>
        <div className="lesson-context">
          <span className="course-eyebrow">AULA GUIADA · {currentLesson.subtitle.toUpperCase()}</span>
          <h1>{currentLesson.title}</h1>
          <p>{currentLesson.objective}</p>
        </div>
        <article className="lesson-teaching-card">
          <div className="teaching-card-heading"><span><BookOpen size={17}/> Primeiro, entenda</span><span className="lesson-step-chip">LIÇÃO {allLessons.findIndex(item => item.id === currentLesson.id) + 1}</span></div>
          <div className="teaching-word-grid">
            {currentLesson.teach.map(item => <div className="teaching-word" key={item.term}>
              <strong>{item.term}</strong><span>{item.meaning}</span><small>{item.example}</small>
              <button onClick={() => playModel(item.term)} aria-label={'Ouvir ' + item.term}><Volume2 size={15}/> Ouvir</button>
            </div>)}
          </div>
          <div className="grammar-pattern"><Sparkles size={16}/><span>{currentLesson.pattern}</span></div>
        </article>
        <article className="lesson-exercise-card">
          <div className="exercise-card-topline"><span>AGORA É SUA VEZ</span><span>{currentExercise.kind === 'choice' ? 'ESCOLHA' : currentExercise.kind === 'build' ? 'MONTE A FRASE' : currentExercise.kind === 'type' ? 'ESCRITA' : currentExercise.kind === 'listen' ? 'ESCUTA' : 'FALA'}</span></div>
          <h2>{currentExercise.prompt}</h2>
          {(currentExercise.kind === 'listen' || currentExercise.kind === 'repeat') && <button className="listen-model-button" onClick={() => playModel(currentExercise.answer)}><Volume2 size={20}/> Ouvir modelo em inglês</button>}
          {currentExercise.kind === 'choice' && <div className="course-choice-list">
            {currentExercise.options?.map(option => <button key={option} disabled={checked !== null} className={selectedChoice === option ? 'selected' : ''} onClick={() => setSelectedChoice(option)}>{option}{selectedChoice === option && <CheckCircle2 size={17}/>}</button>)}
          </div>}
          {currentExercise.kind === 'build' && <div className="word-builder">
            <div className="word-answer-zone">{builtWords.length ? builtWords.map((word, index) => <button key={index} disabled={checked !== null} onClick={() => removeBuiltWord(index)}>{word}</button>) : <span>Toque nas palavras abaixo para montar a frase.</span>}</div>
            <div className="word-bank">{currentExercise.tokens?.map((word, index) => <button key={index} disabled={checked !== null || builtWords.filter(item => item === word).length >= (currentExercise.tokens?.filter(item => item === word).length ?? 1)} onClick={() => chooseWord(word)}>{word}</button>)}</div>
          </div>}
          {(currentExercise.kind === 'type' || currentExercise.kind === 'listen') && <input className="course-answer-input" value={typedAnswer} onChange={event => setTypedAnswer(event.target.value)} disabled={checked !== null} placeholder={currentExercise.kind === 'listen' ? 'Digite o que você ouviu...' : 'Escreva sua resposta em inglês...'} onKeyDown={event => { if (event.key === 'Enter' && checked === null) verify() }}/>}
          {currentExercise.kind === 'repeat' && <div className="repeat-practice-box"><Mic size={20}/><div><strong>Repita em voz alta</strong><small>Grave sua repetição. O navegador compara a transcrição com a frase-modelo; isso verifica as palavras reconhecidas, não a qualidade fonética.</small></div><button disabled={checked !== null || voiceListening} onClick={startSpeechCapture}>{voiceListening ? 'Ouvindo...' : 'Gravar voz'}</button></div>}
          {currentExercise.kind === 'repeat' && <button className="manual-repeat-button" disabled={checked !== null || voiceListening} onClick={() => { setChecked(true); setAudioNotice('Prática marcada manualmente. Nenhuma avaliação de fala foi realizada.') }}>Marcar como praticado sem gravação</button>}
          {voiceTranscript && <p className="course-voice-transcript">Transcrição reconhecida: “{voiceTranscript}”</p>}
          {audioNotice && <p className="course-audio-notice">{audioNotice}</p>}
          {checked !== null && <div className={checked ? 'course-feedback correct' : 'course-feedback incorrect'}>
            <strong>{checked ? currentExercise.kind === 'repeat' && !voiceTranscript ? 'Prática registrada.' : 'Muito bem. Resposta correta.' : 'Ainda não. Vamos corrigir.'}</strong>
            <p>{currentExercise.explanation}</p>
            {!checked && <small>Resposta esperada: {currentExercise.answer}</small>}
          </div>}
          <div className="lesson-action-row">
            <button className="course-secondary-button" onClick={() => onAskTutor('Estou na aula "' + currentLesson.title + '". Me explique de outra forma: ' + currentExercise.prompt + ' Minha dúvida é sobre: ' + currentExercise.answer)}><CircleHelp size={16}/> Tirar dúvida com a Lumi</button>
            {checked === true ? <button className="course-primary-button" onClick={nextStep}>{step === currentLesson.exercises.length - 1 ? 'Concluir aula' : 'Continuar'} <ArrowRight size={16}/></button>
              : checked === false ? <button className="course-primary-button" onClick={retry}><RotateCcw size={16}/> Tentar novamente</button>
                : <button className="course-primary-button" disabled={!canCheck} onClick={verify}>Conferir resposta <Check size={16}/></button>}
          </div>
        </article>
        <p className="lesson-footnote">Dica: não decore só a resposta. Entenda a ordem das palavras; depois tente criar uma frase parecida com algo da sua rotina.</p>
      </section>
    )
  }

  const allUnitsCompleted = completedCount === allLessons.length
  return (
    <section className="guided-course">
      <div className="course-hero">
        <div>
          <span className="course-eyebrow">SEU CURSO DE INGLÊS · PASSO A PASSO</span>
          <h1>Aprenda inglês <em>desde o começo.</em></h1>
          <p>Primeiro você entende. Depois pratica. Só então avança para frases e conversas mais completas, sempre conectando exemplos ao seu objetivo: {goalLabel}.</p>
          <div className="course-hero-actions">
            <button className="course-primary-button" onClick={() => nextLesson ? beginLesson(nextLesson.id) : setActiveLessonId(allLessons[allLessons.length - 1].id)}>{allUnitsCompleted ? 'Revisar última aula' : progress.activeLessonId ? 'Continuar estudando' : completedCount ? 'Continuar curso' : 'Começar do zero'} <ArrowRight size={16}/></button>
            <span><Zap size={15}/> {progress.xp} pontos de prática</span>
          </div>
        </div>
        <div className="course-progress-orb"><strong>{percentage}%</strong><span>do curso</span><div><i style={{ width: percentage + '%' }}/></div></div>
      </div>
      <div className="course-overview-stats">
        <article><BookOpen size={18}/><strong>{completedCount}/{allLessons.length}</strong><span>aulas concluídas</span></article>
        <article><Star size={18}/><strong>{progress.xp}</strong><span>pontos conquistados</span></article>
        <article><Headphones size={18}/><strong>5 tipos</strong><span>de prática por aula</span></article>
      </div>
      <div className="course-path-heading"><div><span className="course-eyebrow">SUA TRILHA</span><h2>Uma etapa de cada vez</h2></div><span className="course-level-label">Iniciante absoluto → viagem</span></div>
      {units.map((unit, unitIndex) => {
        const firstLessonIndex = allLessons.findIndex(lesson => lesson.id === unit.lessons[0].id)
        const unitDone = unit.lessons.every(lesson => progress.completedLessonIds.includes(lesson.id))
        const unitUnlocked = firstLessonIndex === 0 || progress.completedLessonIds.includes(allLessons[firstLessonIndex - 1].id)
        return <article className={unitUnlocked ? 'course-unit-card' : 'course-unit-card locked'} key={unit.id}>
          <div className="course-unit-heading"><span className="course-unit-number">{String(unitIndex + 1).padStart(2, '0')}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div>{unitDone ? <span className="unit-complete-pill"><CheckCircle2 size={14}/> Concluída</span> : !unitUnlocked ? <LockKeyhole size={18}/> : <span className="unit-open-pill">EM ANDAMENTO</span>}</div>
          <div className="course-lesson-list">
            {unit.lessons.map(lesson => {
              const globalIndex = allLessons.findIndex(item => item.id === lesson.id)
              const done = progress.completedLessonIds.includes(lesson.id)
              const unlocked = globalIndex === 0 || progress.completedLessonIds.includes(allLessons[globalIndex - 1].id)
              return <button className={done ? 'course-lesson-row done' : unlocked ? 'course-lesson-row' : 'course-lesson-row locked'} key={lesson.id} disabled={!unlocked} onClick={() => beginLesson(lesson.id)}>
                <span className="lesson-status-icon">{done ? <Check size={17}/> : unlocked ? <Play size={15}/> : <LockKeyhole size={15}/>}</span>
                <span className="course-lesson-copy"><strong>{lesson.title}</strong><small>{lesson.subtitle} · {lesson.exercises.length} exercícios</small></span>
                {done ? <span className="lesson-done-label">Revisar</span> : unlocked ? <ArrowRight size={17}/> : null}
              </button>
            })}
          </div>
        </article>
      })}
      <div className="course-help-panel"><MessageCircle size={20}/><div><strong>A Lumi acompanha seu aprendizado.</strong><p>Quando uma explicação não ficar clara, peça outro exemplo. A tutora deve respeitar o nível desta trilha.</p></div><button className="course-secondary-button" onClick={() => onAskTutor('Estou começando inglês do zero. Explique os conceitos com palavras simples, tradução e exemplos curtos.')}>Perguntar à Lumi <ArrowRight size={15}/></button></div>
      <p className="course-storage-note">Seu andamento fica salvo neste aparelho. Para levar o progresso a outro dispositivo, entre na sua conta; a sincronização deste novo curso ainda será adicionada.</p>
    </section>
  )
}
