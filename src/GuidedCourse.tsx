import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BookOpen, Check, CheckCircle2, CircleHelp,
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
  isRetry?: boolean
}
type Lesson = {
  id: string
  title: string
  subtitle: string
  objective: string
  lessonTip?: string
  pattern: string
  teach: { term: string; meaning: string; example: string }[]
  exercises: Exercise[]
  isReview?: boolean
  isCheckpoint?: boolean
}
type Unit = { id: string; title: string; subtitle: string; level: string; lessons: Lesson[] }
export type SavedProgress = { completedLessonIds: string[]; xp: number; introDone: boolean; activeLessonId: string | null; streakDays?: number; lastStudyDate?: string | null }
type CourseAttemptPayload = {
  activityType: string
  skill: 'listening' | 'speaking' | 'writing' | 'grammar' | 'vocabulary'
  prompt: string
  answer: string
  expected: string
  explanation: string
  correct: boolean
}
type Props = {
  accent?: 'us' | 'uk'
  goalLabel?: string
  onAskTutor: (question: string) => void
  onLessonComplete: (score: number, lessonId?: string) => void
  initialProgress?: SavedProgress | null
  onProgressChange?: (progress: SavedProgress) => void
  onExerciseAttempt?: (attempt: CourseAttemptPayload) => void
}

const STORAGE_KEY = 'fala-course-progress-v1'
const initialProgress: SavedProgress = { completedLessonIds: [], xp: 0, introDone: false, activeLessonId: null, streakDays: 0, lastStudyDate: null }

const units: Unit[] = [
  {
    id: 'first-words',
    level: 'A0 · Iniciante absoluto',
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
          { term: 'one to ten', meaning: 'um a dez', example: 'one, two, three, four, five, six, seven, eight, nine, ten' },
          { term: 'eleven to twenty', meaning: 'onze a vinte', example: 'eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty' },
          { term: 'red / blue / green / yellow', meaning: 'vermelho / azul / verde / amarelo', example: 'A yellow bus = Um ônibus amarelo' },
          { term: 'black / white / orange / pink / purple', meaning: 'preto / branco / laranja / rosa / roxo', example: 'A black phone = Um telefone preto' },
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
      {
        id: 'alphabet-sounds',
        title: 'Conheça o alfabeto em inglês',
        subtitle: 'Letras e soletração',
        objective: 'Reconhecer as letras em inglês e soletrar seu nome.',
        lessonTip: 'O alfabeto inglês tem 26 letras. Algumas têm nomes diferentes do português: A se chama “ei”, E se chama “i” e I se chama “ai”. Ao soletrar, diga o nome de cada letra, não o som que ela faz dentro de uma palavra.',
        pattern: 'How do you spell it? = Como se soletra?  |  A-N-A = “ei – en – ei”',
        teach: [
          { term: 'A / E / I', meaning: 'nomes: ei / i / ai', example: 'A is for apple. = A de apple (maçã).' },
          { term: 'B / C / D', meaning: 'nomes: bi / si / di', example: 'B is for book. = B de book (livro).' },
          { term: 'J / G', meaning: 'nomes: djei / dji', example: 'J and G têm nomes parecidos, mas sons diferentes nas palavras.' },
          { term: 'How do you spell...?', meaning: 'Como se soletra...?', example: 'How do you spell Ana? A-N-A.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como se chama a letra A em inglês?', options: ['Ah', 'Ei', 'Ai'], answer: 'Ei', explanation: 'O nome da letra A em inglês é “ei”, como o som inicial de “ей”.' },
          { kind: 'choice', prompt: 'Qual letra tem o nome “ai”?', options: ['E', 'I', 'A'], answer: 'I', explanation: 'I se chama “ai”. E se chama “i” e A se chama “ei”.' },
          { kind: 'build', prompt: 'Monte a pergunta “Como se soletra?”', tokens: ['spell?', 'you', 'do', 'How'], answer: 'How do you spell?', explanation: 'How do you spell...? é a pergunta usada para pedir a soletração.' },
          { kind: 'type', prompt: 'Complete a soletração do nome Ana: A-N-___', answer: 'A', explanation: 'Ana é soletrado A-N-A. Diga o nome das letras em inglês: ei – en – ei.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “How do you spell your name?”', answer: 'How do you spell your name?', explanation: 'A frase significa “Como você soletra seu nome?”. Ouça, repita e depois tente soletrar seu próprio nome.' },
        ],
      },
      {
        id: 'articles-plurals',
        title: 'Use a, an e o plural',
        subtitle: 'Um, uma e mais de um',
        objective: 'Dizer o nome de objetos no singular e no plural.',
        lessonTip: 'Em inglês, a e an significam “um/uma” antes de um substantivo contável no singular. Use a antes de som de consoante (a book) e an antes de som de vogal (an apple). Para falar de mais de um objeto, normalmente acrescentamos -s: book → books.',
        pattern: 'a + som de consoante  |  an + som de vogal  |  plural: palavra + s',
        teach: [
          { term: 'a book', meaning: 'um livro', example: 'I have a book. = Eu tenho um livro.' },
          { term: 'an apple', meaning: 'uma maçã', example: 'I have an apple. = Eu tenho uma maçã.' },
          { term: 'one / two', meaning: 'um / dois', example: 'one pen → two pens = uma caneta → duas canetas' },
          { term: 'this / these', meaning: 'este / estes', example: 'This is a pen. These are pens.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “___ apple” (uma maçã).', options: ['A', 'An', 'The'], answer: 'An', explanation: 'Apple começa com som de vogal; por isso usamos an: an apple.' },
          { kind: 'choice', prompt: 'Qual é o plural de “book”?', options: ['bookes', 'books', 'book'], answer: 'books', explanation: 'Na maioria dos substantivos, acrescentamos -s: book → books.' },
          { kind: 'build', prompt: 'Monte: “Eu tenho um telefone.”', tokens: ['phone.', 'a', 'have', 'I'], answer: 'I have a phone.', explanation: 'I (eu) + have (tenho) + a (um) + phone (telefone).' },
          { kind: 'type', prompt: 'Escreva “duas maçãs” em inglês.', answer: 'Two apples.', explanation: 'Two = duas. Apple recebe -s no plural: apples.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I have an apple and two books.”', answer: 'I have an apple and two books.', explanation: 'An apple está no singular; two books está no plural.' },
        ],
      },
      {
        id: 'a0-review',
        title: 'Revise sua primeira base',
        subtitle: 'Alfabeto, números, cores e frases',
        objective: 'Recuperar os fundamentos antes do teste da unidade.',
        lessonTip: 'Nesta revisão, tente responder sem olhar as explicações. Se errar, leia o feedback, volte à aula correspondente e tente novamente. Errar durante o treino faz parte do aprendizado.',
        pattern: 'Palavra → significado → frase curta → uso em contexto',
        teach: [
          { term: 'Hello', meaning: 'olá', example: 'Hello, my name is Ana.' },
          { term: 'blue', meaning: 'azul', example: 'A blue book.' },
          { term: 'I am', meaning: 'eu sou / estou', example: 'I am a student.' },
          { term: 'an apple', meaning: 'uma maçã', example: 'I have an apple.' },
        ],
        isReview: true,
        exercises: [
          { kind: 'choice', prompt: 'Qual frase significa “Eu sou estudante”?', options: ['I student.', 'I am a student.', 'I have student.'], answer: 'I am a student.', explanation: 'I am = eu sou/estou. A frase precisa do artigo a antes de student.' },
          { kind: 'choice', prompt: 'Qual cor é “green”?', options: ['Verde', 'Vermelho', 'Roxo'], answer: 'Verde', explanation: 'Green = verde; red = vermelho; purple = roxo.' },
          { kind: 'build', prompt: 'Monte: “Meu nome é Ana.”', tokens: ['Ana.', 'name', 'is', 'My'], answer: 'My name is Ana.', explanation: 'My name is... é a estrutura para dizer seu nome.' },
          { kind: 'type', prompt: 'Escreva o número “doze”.', answer: 'Twelve.', explanation: 'Twelve = doze. Eleven = onze e thirteen = treze.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I have a blue book.”', answer: 'I have a blue book.', explanation: 'I have = eu tenho; a blue book = um livro azul.' },
        ],
      },
      {
        id: 'a0-checkpoint',
        title: 'Teste: fundamentos do inglês',
        subtitle: 'Verifique o que aprendeu',
        objective: 'Demonstrar domínio dos primeiros fundamentos.',
        lessonTip: 'Faça o teste sem consultar as respostas. Você precisa acertar pelo menos 70% para liberar a próxima unidade. Se não atingir a nota, poderá tentar novamente depois de revisar.',
        pattern: 'Meta de aprovação: 70% de acertos',
        teach: [
          { term: 'Hello', meaning: 'olá', example: 'Hello! = Olá!' },
          { term: 'five', meaning: 'cinco', example: 'Five books = Cinco livros.' },
          { term: 'she is', meaning: 'ela é / está', example: 'She is happy. = Ela está feliz.' },
          { term: 'an orange', meaning: 'uma laranja', example: 'An orange is a fruit. = Uma laranja é uma fruta.' },
        ],
        isCheckpoint: true,
        exercises: [
          { kind: 'choice', prompt: 'Como se diz “bom dia”?', options: ['Good morning', 'Good night', 'Goodbye'], answer: 'Good morning', explanation: 'Good morning = bom dia.' },
          { kind: 'choice', prompt: 'Qual é a tradução de “five”?', options: ['Quatro', 'Cinco', 'Seis'], answer: 'Cinco', explanation: 'Five = cinco.' },
          { kind: 'choice', prompt: 'O que significa “purple”?', options: ['Laranja', 'Roxo', 'Preto'], answer: 'Roxo', explanation: 'Purple = roxo.' },
          { kind: 'choice', prompt: 'Complete: “She ___ happy.”', options: ['am', 'are', 'is'], answer: 'is', explanation: 'Com she (ela), usamos is: She is happy.' },
          { kind: 'choice', prompt: 'Complete: “___ orange”.', options: ['A', 'An', 'These'], answer: 'An', explanation: 'Orange começa com som de vogal; usamos an.' },
          { kind: 'build', prompt: 'Monte: “Eu quero água.”', tokens: ['water.', 'I', 'want'], answer: 'I want water.', explanation: 'I = eu; want = quero; water = água.' },
          { kind: 'type', prompt: 'Escreva “três livros”.', answer: 'Three books.', explanation: 'Three = três; book no plural recebe -s.' },
          { kind: 'listen', prompt: 'Ouça e escreva: “Hello, my name is Ana.”', answer: 'Hello, my name is Ana.', explanation: 'Hello = olá; my name is = meu nome é.' },
        ],
      },
    ],
  },
  {
    id: 'first-sentences',
    level: 'A1 · Básico',
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
    level: 'A1 · Básico',
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
    level: 'A1 · Básico',
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

  {
    id: 'a1-everyday',
    level: 'A1 · Básico',
    title: 'Converse sobre sua vida',
    subtitle: 'Família, casa, habilidades e situações do cotidiano.',
    lessons: [
      {
        id: 'family-possessives',
        title: 'Fale sobre sua família',
        subtitle: 'Possessivos: my, your, his e her',
        objective: 'Apresentar familiares e dizer a quem algo pertence.',
        pattern: 'my = meu/minha · your = seu/sua · his = dele · her = dela',
        teach: [
          { term: 'mother / father', meaning: 'mãe / pai', example: 'My mother is kind. = Minha mãe é gentil.' },
          { term: 'brother / sister', meaning: 'irmão / irmã', example: 'I have one sister. = Eu tenho uma irmã.' },
          { term: 'my / your', meaning: 'meu/minha / seu/sua', example: 'Your name = seu nome.' },
          { term: 'his / her', meaning: 'dele / dela', example: 'Her phone = o telefone dela.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como dizer “minha irmã”?', options: ['I sister', 'My sister', 'Her sister'], answer: 'My sister', explanation: 'My indica posse ligada a quem fala: my sister = minha irmã.' },
          { kind: 'build', prompt: 'Monte: “O nome dela é Ana.”', tokens: ['Ana.', 'is', 'name', 'Her'], answer: 'Her name is Ana.', explanation: 'Her = dela; name = nome; is = é. A ordem é Her + name + is + nome.' },
          { kind: 'type', prompt: 'Escreva: “Meu pai é professor.”', answer: 'My father is a teacher.', explanation: 'My father = meu pai. Teacher = professor(a). Usamos a antes da profissão no singular.' },
          { kind: 'choice', prompt: 'Complete: “Pedro loves ___ dog.” (o cachorro dele)', options: ['her', 'his', 'your'], answer: 'his', explanation: 'His indica algo pertencente a ele. Her seria dela.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “My family lives in Brazil.”', answer: 'My family lives in Brazil.', explanation: 'My family = minha família. Lives recebe -s porque family é terceira pessoa do singular.' },
        ],
      },
      {
        id: 'there-is-are',
        title: 'Descreva sua casa',
        subtitle: 'There is / There are',
        objective: 'Dizer o que existe em um cômodo ou lugar.',
        pattern: 'There is + singular · There are + plural',
        teach: [
          { term: 'There is', meaning: 'Há / existe (singular)', example: 'There is a kitchen. = Há uma cozinha.' },
          { term: 'There are', meaning: 'Há / existem (plural)', example: 'There are two bedrooms. = Há dois quartos.' },
          { term: 'in the house', meaning: 'na casa', example: 'There is a table in the house.' },
          { term: 'next to', meaning: 'ao lado de', example: 'The sofa is next to the door.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “There ___ a bathroom.”', options: ['are', 'is', 'am'], answer: 'is', explanation: 'Bathroom está no singular. Use There is para uma coisa.' },
          { kind: 'choice', prompt: 'Complete: “There ___ three windows.”', options: ['is', 'are', 'am'], answer: 'are', explanation: 'Windows está no plural. Use There are para duas ou mais coisas.' },
          { kind: 'build', prompt: 'Monte: “Há dois quartos.”', tokens: ['bedrooms.', 'two', 'are', 'There'], answer: 'There are two bedrooms.', explanation: 'There are + quantidade + substantivo no plural.' },
          { kind: 'type', prompt: 'Escreva: “Há uma mesa na cozinha.”', answer: 'There is a table in the kitchen.', explanation: 'There is para uma mesa. In the kitchen = na cozinha.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'There are two chairs.', explanation: 'There are indica plural. Two chairs = duas cadeiras.' },
        ],
      },
      {
        id: 'can-cant',
        title: 'Diga o que você consegue fazer',
        subtitle: 'Can e can’t para habilidades e permissões',
        objective: 'Falar sobre habilidades e pedir permissão.',
        pattern: 'I can + verbo · I can’t + verbo · Can I...? = Posso...?',
        teach: [
          { term: 'can', meaning: 'poder / conseguir', example: 'I can swim. = Eu sei nadar.' },
          { term: 'cannot / can’t', meaning: 'não poder / não conseguir', example: 'I can’t drive. = Eu não sei dirigir.' },
          { term: 'Can you...?', meaning: 'Você consegue...?', example: 'Can you help me? = Você pode me ajudar?' },
          { term: 'Can I...?', meaning: 'Posso...?', example: 'Can I sit here? = Posso sentar aqui?' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Como dizer “Eu sei nadar”?', options: ['I can swim.', 'I am swim.', 'I do swim can.'], answer: 'I can swim.', explanation: 'Can vem antes do verbo na forma base: can swim. Não usamos to depois de can.' },
          { kind: 'build', prompt: 'Monte: “Eu não posso dirigir.”', tokens: ['drive.', 'can’t', 'I'], answer: 'I can’t drive.', explanation: 'I + can’t + verbo base. Can’t é a forma curta de cannot.' },
          { kind: 'type', prompt: 'Escreva: “Você pode me ajudar?”', answer: 'Can you help me?', explanation: 'Can you + verbo + complemento? é uma pergunta comum para pedir ajuda.' },
          { kind: 'choice', prompt: 'Qual frase pede permissão?', options: ['I can speak.', 'Can I sit here?', 'You can help.'], answer: 'Can I sit here?', explanation: 'Can I...? significa “Posso...?” e pode ser usado para pedir permissão.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I can understand a little English.”', answer: 'I can understand a little English.', explanation: 'A little = um pouco. Understand = entender.' },
        ],
      },
      {
        id: 'a1-review',
        title: 'Revisão: família, casa e habilidades',
        subtitle: 'Recupere o conteúdo sem olhar as explicações',
        objective: 'Consolidar possessivos, there is/are e can/can’t.',
        pattern: 'Pense na regra, tente responder e só depois confira.',
        isReview: true,
        teach: [
          { term: 'my / his / her', meaning: 'meu / dele / dela', example: 'Her brother = o irmão dela.' },
          { term: 'There is / are', meaning: 'existe / existem', example: 'There are two rooms.' },
          { term: 'can / can’t', meaning: 'consegue / não consegue', example: 'I can cook.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “___ mother is a doctor.” (a mãe dela)', options: ['His', 'Her', 'My'], answer: 'Her', explanation: 'Her mother = a mãe dela. O possessivo concorda com a pessoa que possui.' },
          { kind: 'type', prompt: 'Escreva: “Há três livros na mesa.”', answer: 'There are three books on the table.', explanation: 'There are porque books está no plural. On the table = sobre a mesa.' },
          { kind: 'build', prompt: 'Monte: “Ela consegue falar inglês.”', tokens: ['English.', 'speak', 'can', 'She'], answer: 'She can speak English.', explanation: 'She + can + verbo base. O verbo speak não recebe -s depois de can.' },
          { kind: 'choice', prompt: 'Qual frase está correta?', options: ['There is two cars.', 'There are two cars.', 'There am two cars.'], answer: 'There are two cars.', explanation: 'Two cars é plural, portanto usamos there are.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Can you show me your house?”', answer: 'Can you show me your house?', explanation: 'Show me = me mostrar. Your house = sua casa.' },
        ],
      },
      {
        id: 'a1-checkpoint',
        title: 'Desafio da unidade A1',
        subtitle: 'Avaliação da unidade · 8 questões',
        objective: 'Demonstrar que você consegue usar o conteúdo em novas frases.',
        pattern: 'Este teste mistura vocabulário, gramática, escuta e produção.',
        isCheckpoint: true,
        teach: [
          { term: 'Objetivo', meaning: 'Aplicar o que aprendeu', example: 'Leia com atenção e use as estruturas, não apenas a memória.' },
          { term: 'Aprovação', meaning: '70% de acerto', example: 'Se precisar, revise as aulas e tente novamente.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual frase significa “O nome dele é Lucas”?', options: ['Her name is Lucas.', 'His name is Lucas.', 'He name is Lucas.'], answer: 'His name is Lucas.', explanation: 'His = dele. His name is Lucas = O nome dele é Lucas.' },
          { kind: 'build', prompt: 'Monte: “Há uma sala na casa.”', tokens: ['house.', 'the', 'in', 'room', 'a', 'is', 'There'], answer: 'There is a room in the house.', explanation: 'There is + a room + in the house. Room está no singular.' },
          { kind: 'type', prompt: 'Escreva: “Eu consigo cozinhar.”', answer: 'I can cook.', explanation: 'Can é seguido pelo verbo base cook.' },
          { kind: 'choice', prompt: 'Complete: “My friends ___ speak Spanish.”', options: ['can', 'cans', 'are can'], answer: 'can', explanation: 'Can não muda com he, she, we ou they.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'There is a park near my house.', explanation: 'There is a park = há um parque. Near my house = perto da minha casa.' },
          { kind: 'type', prompt: 'Escreva: “A irmã dela mora aqui.”', answer: 'Her sister lives here.', explanation: 'Her sister = a irmã dela. Lives recebe -s com she/her sister.' },
          { kind: 'choice', prompt: 'Qual pergunta pede permissão?', options: ['Can I open the window?', 'I can open the window.', 'You can open the window.'], answer: 'Can I open the window?', explanation: 'Can I...? é uma forma de pedir permissão.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “There are four people in my family.”', answer: 'There are four people in my family.', explanation: 'There are indica plural. People significa pessoas.' },
        ],
      },
    ],
  },
  {
    id: 'a2-past-future',
    level: 'A2 · Pré-intermediário',
    title: 'Fale do passado e dos seus planos',
    subtitle: 'Conte experiências, fale de planos e compare opções.',
    lessons: [
      {
        id: 'past-simple',
        title: 'Conte o que você fez',
        subtitle: 'Passado simples: verbos regulares e irregulares',
        objective: 'Descrever acontecimentos concluídos no passado.',
        pattern: 'I worked yesterday · I went home · Did you...? · I didn’t...',
        teach: [
          { term: 'yesterday', meaning: 'ontem', example: 'I studied yesterday. = Estudei ontem.' },
          { term: 'worked / played', meaning: 'trabalhei / joguei', example: 'I worked on Monday.' },
          { term: 'went / had', meaning: 'fui / tive', example: 'I went to school. = Fui à escola.' },
          { term: 'did / didn’t', meaning: 'auxiliar do passado', example: 'Did you work? = Você trabalhou?' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual é o passado de “go”?', options: ['goed', 'went', 'gone'], answer: 'went', explanation: 'Went é o passado simples de go. Gone é o particípio usado em outros tempos.' },
          { kind: 'build', prompt: 'Monte: “Eu estudei ontem.”', tokens: ['yesterday.', 'studied', 'I'], answer: 'I studied yesterday.', explanation: 'Em verbos regulares, normalmente acrescentamos -ed. Study muda para studied.' },
          { kind: 'type', prompt: 'Escreva: “Ela foi ao mercado.”', answer: 'She went to the market.', explanation: 'Went é o passado de go. The market = o mercado.' },
          { kind: 'choice', prompt: 'Complete: “Did you ___ yesterday?”', options: ['worked', 'work', 'working'], answer: 'work', explanation: 'Depois de did, usamos o verbo na forma base, sem -ed.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I went to the beach last weekend.”', answer: 'I went to the beach last weekend.', explanation: 'Last weekend = no fim de semana passado. Went é o passado de go.' },
        ],
      },
      {
        id: 'future-plans',
        title: 'Fale dos seus planos',
        subtitle: 'Going to para intenções e planos',
        objective: 'Explicar o que pretende fazer no futuro.',
        pattern: 'I am going to + verbo · Are you going to...? ',
        teach: [
          { term: 'going to', meaning: 'vai / pretende', example: 'I am going to travel. = Vou viajar.' },
          { term: 'tonight', meaning: 'hoje à noite', example: 'I am going to study tonight.' },
          { term: 'next week', meaning: 'na próxima semana', example: 'We are going to work next week.' },
          { term: 'plan', meaning: 'plano / planejar', example: 'My plan is to learn English.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual frase significa “Vou viajar amanhã”?', options: ['I going travel tomorrow.', 'I am going to travel tomorrow.', 'I went travel tomorrow.'], answer: 'I am going to travel tomorrow.', explanation: 'Use sujeito + am/is/are + going to + verbo base.' },
          { kind: 'build', prompt: 'Monte: “Nós vamos estudar hoje à noite.”', tokens: ['tonight.', 'study', 'to', 'going', 'are', 'We'], answer: 'We are going to study tonight.', explanation: 'We are + going to + study + tonight.' },
          { kind: 'type', prompt: 'Escreva: “Ela vai comprar um carro.”', answer: 'She is going to buy a car.', explanation: 'She is going to + verbo base buy.' },
          { kind: 'choice', prompt: 'Complete: “Are you going to ___?”', options: ['travel', 'travels', 'traveling'], answer: 'travel', explanation: 'Depois de going to usamos o verbo base.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I am going to visit my family next month.”', answer: 'I am going to visit my family next month.', explanation: 'Next month = no próximo mês. Visit = visitar.' },
        ],
      },
      {
        id: 'comparatives',
        title: 'Compare pessoas e lugares',
        subtitle: 'Comparativos com -er e more',
        objective: 'Comparar opções, preços e características.',
        pattern: 'bigger than = maior que · more expensive than = mais caro que',
        teach: [
          { term: 'bigger / smaller', meaning: 'maior / menor', example: 'This room is bigger than mine.' },
          { term: 'cheaper', meaning: 'mais barato', example: 'The bus is cheaper than a taxi.' },
          { term: 'more expensive', meaning: 'mais caro', example: 'This hotel is more expensive.' },
          { term: 'better / worse', meaning: 'melhor / pior', example: 'This option is better.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “A car is ___ than a bike.” (mais rápido)', options: ['faster', 'fast', 'more fast'], answer: 'faster', explanation: 'Fast é um adjetivo curto; seu comparativo é faster.' },
          { kind: 'build', prompt: 'Monte: “Este hotel é mais barato.”', tokens: ['cheaper.', 'is', 'hotel', 'This'], answer: 'This hotel is cheaper.', explanation: 'This hotel + is + cheaper. O comparativo vem depois do verbo be.' },
          { kind: 'type', prompt: 'Escreva: “O trem é mais rápido que o ônibus.”', answer: 'The train is faster than the bus.', explanation: 'Faster than = mais rápido que.' },
          { kind: 'choice', prompt: 'Qual é o comparativo correto de “good”?', options: ['gooder', 'better', 'more good'], answer: 'better', explanation: 'Good é irregular: better = melhor.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “The train is more comfortable than the bus.”', answer: 'The train is more comfortable than the bus.', explanation: 'More comfortable than = mais confortável que.' },
        ],
      },
      {
        id: 'a2-review',
        title: 'Revisão: passado, futuro e comparações',
        subtitle: 'Recupere as estruturas principais',
        objective: 'Distinguir passado simples, planos futuros e comparativos.',
        pattern: 'Observe o marcador de tempo e a estrutura do verbo.',
        isReview: true,
        teach: [
          { term: 'Past', meaning: 'passado concluído', example: 'I went yesterday.' },
          { term: 'Going to', meaning: 'plano futuro', example: 'I am going to travel.' },
          { term: 'Comparative', meaning: 'comparação', example: 'This is cheaper.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “Last night, I ___ a movie.”', options: ['watch', 'watched', 'watching'], answer: 'watched', explanation: 'Last night indica passado; watched é o passado de watch.' },
          { kind: 'type', prompt: 'Escreva: “Nós vamos visitar Londres.”', answer: 'We are going to visit London.', explanation: 'We are going to + verbo base visit.' },
          { kind: 'build', prompt: 'Monte: “Este celular é melhor.”', tokens: ['better.', 'is', 'phone', 'This'], answer: 'This phone is better.', explanation: 'Better é o comparativo irregular de good.' },
          { kind: 'choice', prompt: 'Depois de did, usamos:', options: ['verbo base', 'verbo com -ed', 'verbo com -ing'], answer: 'verbo base', explanation: 'Did já marca o passado; o verbo principal fica na forma base.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I went there last year, and I am going again next year.”', answer: 'I went there last year, and I am going again next year.', explanation: 'Went descreve passado; am going descreve plano futuro.' },
        ],
      },
      {
        id: 'a2-checkpoint',
        title: 'Desafio da unidade A2',
        subtitle: 'Avaliação da unidade · 8 questões',
        objective: 'Usar passado, futuro e comparações sem depender de frases decoradas.',
        pattern: 'A meta é 70% de acerto. Revise e refaça se necessário.',
        isCheckpoint: true,
        teach: [
          { term: 'Passado', meaning: 'Acontecimento concluído', example: 'I visited my friend.' },
          { term: 'Futuro', meaning: 'Plano ou intenção', example: 'I am going to call her.' },
          { term: 'Comparar', meaning: 'Dizer o que é mais/menos', example: 'This one is cheaper.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual é o passado de “buy”?', options: ['buyed', 'bought', 'buys'], answer: 'bought', explanation: 'Bought é o passado irregular de buy.' },
          { kind: 'build', prompt: 'Monte: “Eu comprei um livro ontem.”', tokens: ['yesterday.', 'book', 'a', 'bought', 'I'], answer: 'I bought a book yesterday.', explanation: 'I + bought + a book + yesterday.' },
          { kind: 'type', prompt: 'Escreva: “Eles vão viajar no próximo mês.”', answer: 'They are going to travel next month.', explanation: 'They are going to + travel.' },
          { kind: 'choice', prompt: 'Complete: “This bag is ___ than that one.” (mais caro)', options: ['expensiver', 'more expensive', 'most expensive'], answer: 'more expensive', explanation: 'Adjetivos mais longos geralmente usam more antes do adjetivo.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'We visited our friends last weekend.', explanation: 'Visited é passado regular; last weekend indica o fim de semana passado.' },
          { kind: 'type', prompt: 'Escreva: “Você foi ao trabalho ontem?”', answer: 'Did you go to work yesterday?', explanation: 'Did + you + go (forma base) + complemento.' },
          { kind: 'choice', prompt: 'Qual frase está correta?', options: ['She is going to studies.', 'She going to study.', 'She is going to study.'], answer: 'She is going to study.', explanation: 'Depois de going to, use o verbo base: study.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “The new apartment is bigger but more expensive.”', answer: 'The new apartment is bigger but more expensive.', explanation: 'Bigger = maior; more expensive = mais caro.' },
        ],
      },
    ],
  },
  {
    id: 'b1-communication',
    level: 'B1 · Intermediário',
    title: 'Converse com mais naturalidade',
    subtitle: 'Experiências, opiniões, conselhos e explicações.',
    lessons: [
      {
        id: 'present-perfect',
        title: 'Fale sobre experiências',
        subtitle: 'Present perfect: have/has + particípio',
        objective: 'Falar de experiências sem especificar exatamente quando ocorreram.',
        pattern: 'I have visited... · Have you ever...? · I have never...',
        teach: [
          { term: 'have / has', meaning: 'auxiliar do present perfect', example: 'I have visited Rome.' },
          { term: 'ever', meaning: 'alguma vez', example: 'Have you ever traveled alone?' },
          { term: 'never', meaning: 'nunca', example: 'I have never flown.' },
          { term: 'already / yet', meaning: 'já / ainda', example: 'I have already eaten. / I haven’t eaten yet.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “She ___ visited Canada.”', options: ['have', 'has', 'is'], answer: 'has', explanation: 'Com he/she/it usamos has + particípio.' },
          { kind: 'build', prompt: 'Monte: “Você já visitou Londres?”', tokens: ['London?', 'visited', 'ever', 'you', 'Have'], answer: 'Have you ever visited London?', explanation: 'Have + sujeito + ever + particípio visited + lugar.' },
          { kind: 'type', prompt: 'Escreva: “Eu nunca comi sushi.”', answer: 'I have never eaten sushi.', explanation: 'Eaten é o particípio irregular de eat.' },
          { kind: 'choice', prompt: 'Qual expressão significa “ainda não”?', options: ['already', 'yet', 'ever'], answer: 'yet', explanation: 'Yet aparece frequentemente no fim de frases negativas e perguntas.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I have already finished my work.”', answer: 'I have already finished my work.', explanation: 'Already indica que algo já aconteceu.' },
        ],
      },
      {
        id: 'opinions-connectors',
        title: 'Dê opiniões e explique motivos',
        subtitle: 'I think, because, although e however',
        objective: 'Expressar opiniões com justificativas e contraste.',
        pattern: 'I think... because... · Although... · However,...',
        teach: [
          { term: 'I think', meaning: 'Eu acho / penso', example: 'I think English is useful.' },
          { term: 'because', meaning: 'porque', example: 'I study because I need English at work.' },
          { term: 'although', meaning: 'embora', example: 'Although it is difficult, I enjoy it.' },
          { term: 'however', meaning: 'no entanto', example: 'It is expensive. However, it is good.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual palavra introduz uma razão?', options: ['because', 'however', 'although'], answer: 'because', explanation: 'Because apresenta o motivo: I study because I need it.' },
          { kind: 'build', prompt: 'Monte: “Eu acho que inglês é útil.”', tokens: ['useful.', 'is', 'English', 'think', 'I'], answer: 'I think English is useful.', explanation: 'I think + oração. Dentro dela, English is useful mantém a ordem sujeito + verbo.' },
          { kind: 'type', prompt: 'Escreva: “Estou cansado, mas vou estudar.”', answer: 'I am tired, but I am going to study.', explanation: 'But = mas. Conecta duas ideias em contraste.' },
          { kind: 'choice', prompt: '“Although it is raining, we will go.” significa:', options: ['Porque está chovendo, iremos.', 'Embora esteja chovendo, iremos.', 'Depois que chover, iremos.'], answer: 'Embora esteja chovendo, iremos.', explanation: 'Although introduz uma concessão: algo acontece apesar de outra condição.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I believe practice is important because it builds confidence.”', answer: 'I believe practice is important because it builds confidence.', explanation: 'Believe = acreditar; builds confidence = desenvolve confiança.' },
        ],
      },
      {
        id: 'advice-should',
        title: 'Dê conselhos e fale de obrigações',
        subtitle: 'Should, must e have to',
        objective: 'Recomendar ações e explicar regras ou necessidades.',
        pattern: 'should = deveria · must = deve (forte) · have to = ter que',
        teach: [
          { term: 'should', meaning: 'deveria (conselho)', example: 'You should practice every day.' },
          { term: 'must', meaning: 'deve (obrigação forte)', example: 'You must wear a seat belt.' },
          { term: 'have to', meaning: 'ter que / precisar', example: 'I have to work tomorrow.' },
          { term: 'shouldn’t', meaning: 'não deveria', example: 'You shouldn’t worry too much.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual frase dá um conselho?', options: ['You should rest.', 'You rested.', 'You are rest.'], answer: 'You should rest.', explanation: 'Should + verbo base é usado para recomendar algo.' },
          { kind: 'build', prompt: 'Monte: “Você deveria praticar mais.”', tokens: ['more.', 'practice', 'should', 'You'], answer: 'You should practice more.', explanation: 'Sujeito + should + verbo base + complemento.' },
          { kind: 'type', prompt: 'Escreva: “Eu tenho que acordar cedo.”', answer: 'I have to wake up early.', explanation: 'Have to expressa necessidade ou obrigação. Wake up = acordar.' },
          { kind: 'choice', prompt: 'Complete: “You must ___ your passport.”', options: ['bring', 'brings', 'bringing'], answer: 'bring', explanation: 'Depois de must, o verbo fica na forma base.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “You should ask questions when you do not understand.”', answer: 'You should ask questions when you do not understand.', explanation: 'Ask questions = fazer perguntas. When = quando.' },
        ],
      },
      {
        id: 'b1-review',
        title: 'Revisão: experiências e opiniões',
        subtitle: 'Present perfect, conectores e conselhos',
        objective: 'Combinar tempos verbais e conectores em contexto.',
        pattern: 'Identifique a intenção: experiência, razão, contraste ou conselho.',
        isReview: true,
        teach: [
          { term: 'Have you ever...?', meaning: 'Você já... alguma vez?', example: 'Have you ever worked abroad?' },
          { term: 'because / although', meaning: 'porque / embora', example: 'I went because I had time.' },
          { term: 'should', meaning: 'deveria', example: 'You should try again.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “I have never ___ abroad.”', options: ['be', 'been', 'was'], answer: 'been', explanation: 'Been é o particípio de be, usado com have.' },
          { kind: 'type', prompt: 'Escreva: “Você já trabalhou aqui?”', answer: 'Have you ever worked here?', explanation: 'Have + you + ever + particípio worked.' },
          { kind: 'build', prompt: 'Monte: “Você deveria falar com ela.”', tokens: ['her.', 'to', 'talk', 'should', 'You'], answer: 'You should talk to her.', explanation: 'Should + verbo base talk. Talk to her = falar com ela.' },
          { kind: 'choice', prompt: 'Qual palavra significa “no entanto”?', options: ['because', 'however', 'although'], answer: 'however', explanation: 'However introduz contraste entre ideias.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Although I have made mistakes, I have learned a lot.”', answer: 'Although I have made mistakes, I have learned a lot.', explanation: 'Made é o particípio de make. Learned = aprendido.' },
        ],
      },
      {
        id: 'b1-checkpoint',
        title: 'Desafio da unidade B1',
        subtitle: 'Avaliação da unidade · 8 questões',
        objective: 'Usar inglês intermediário para explicar, aconselhar e falar de experiências.',
        pattern: 'Meta de aprovação: 70%. Leia o contexto antes de responder.',
        isCheckpoint: true,
        teach: [
          { term: 'Experiências', meaning: 'Present perfect', example: 'I have visited three countries.' },
          { term: 'Argumentação', meaning: 'Opinião e motivo', example: 'I think it helps because...' },
          { term: 'Conselho', meaning: 'Should / shouldn’t', example: 'You should practice.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “They ___ already finished.”', options: ['has', 'have', 'are'], answer: 'have', explanation: 'Com they usamos have + particípio.' },
          { kind: 'build', prompt: 'Monte: “Eu nunca estive em Nova York.”', tokens: ['York.', 'New', 'in', 'been', 'never', 'have', 'I'], answer: 'I have never been to New York.', explanation: 'I + have + never + been + in New York. Em muitos contextos, também se diz been to New York.' },
          { kind: 'type', prompt: 'Escreva: “Você deveria descansar porque está cansado.”', answer: 'You should rest because you are tired.', explanation: 'Should + verbo base; because introduz a razão.' },
          { kind: 'choice', prompt: 'Qual frase expressa contraste?', options: ['I stayed because it rained.', 'Although it rained, I went out.', 'I went out to buy food.'], answer: 'Although it rained, I went out.', explanation: 'Although indica que a segunda ação ocorreu apesar da primeira condição.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'Have you ever worked with an international team?', explanation: 'Have you ever + particípio forma uma pergunta sobre experiência.' },
          { kind: 'type', prompt: 'Escreva: “Eu já terminei o relatório.”', answer: 'I have already finished the report.', explanation: 'Already indica que a tarefa já foi concluída.' },
          { kind: 'choice', prompt: 'Complete: “You must ___ the instructions.”', options: ['follow', 'follows', 'following'], answer: 'follow', explanation: 'Must é seguido do verbo na forma base.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I think learning a language takes time, but it is worth it.”', answer: 'I think learning a language takes time, but it is worth it.', explanation: 'Worth it = vale a pena. But conecta ideias em contraste.' },
        ],
      },
    ],
  },
  {
    id: 'b1-plus-fluency',
    level: 'B1+ · Intermediário avançando',
    title: 'Ganhe autonomia para se comunicar',
    subtitle: 'Condições, expressões naturais, trabalho e conversas mais longas.',
    lessons: [
      {
        id: 'first-conditional',
        title: 'Fale sobre possibilidades',
        subtitle: 'First conditional: if + present, will',
        objective: 'Explicar consequências prováveis de uma condição.',
        pattern: 'If + presente simples, will + verbo base',
        teach: [
          { term: 'if', meaning: 'se', example: 'If it rains, I will stay home.' },
          { term: 'will', meaning: 'vai / irá (futuro)', example: 'I will call you later.' },
          { term: 'unless', meaning: 'a menos que', example: 'I will go unless it rains.' },
          { term: 'as soon as', meaning: 'assim que', example: 'I will call as soon as I arrive.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “If I study, I ___ pass.”', options: ['will', 'would', 'am'], answer: 'will', explanation: 'First conditional: If + presente, will + verbo base.' },
          { kind: 'build', prompt: 'Monte: “Se chover, ficarei em casa.”', tokens: ['home.', 'stay', 'will', 'I', 'rains,', 'it', 'If'], answer: 'If it rains, I will stay home.', explanation: 'Na condição usamos presente (rains); na consequência, will + stay.' },
          { kind: 'type', prompt: 'Escreva: “Eu te ligo assim que chegar.”', answer: 'I will call you as soon as I arrive.', explanation: 'Depois de as soon as, para falar do futuro, usamos presente simples: I arrive.' },
          { kind: 'choice', prompt: 'O que significa “unless”?', options: ['porque', 'a menos que', 'embora'], answer: 'a menos que', explanation: 'Unless equivale a if not em muitos contextos.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “If we leave early, we will avoid the traffic.”', answer: 'If we leave early, we will avoid the traffic.', explanation: 'Leave early = sair cedo. Avoid the traffic = evitar o trânsito.' },
        ],
      },
      {
        id: 'phrasal-verbs',
        title: 'Entenda expressões do inglês falado',
        subtitle: 'Phrasal verbs comuns',
        objective: 'Reconhecer verbos compostos frequentes em conversas.',
        pattern: 'verbo + partícula: get up, find out, look for, turn on',
        teach: [
          { term: 'get up', meaning: 'levantar-se', example: 'I get up at seven.' },
          { term: 'find out', meaning: 'descobrir', example: 'I need to find out the answer.' },
          { term: 'look for', meaning: 'procurar', example: 'I am looking for my keys.' },
          { term: 'turn on / off', meaning: 'ligar / desligar', example: 'Please turn off the light.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'O que significa “look for”?', options: ['olhar para', 'procurar', 'desligar'], answer: 'procurar', explanation: 'Look for significa procurar algo ou alguém.' },
          { kind: 'build', prompt: 'Monte: “Eu acordo às seis.”', tokens: ['six.', 'at', 'up', 'get', 'I'], answer: 'I get up at six.', explanation: 'Get up = levantar-se. At six = às seis.' },
          { kind: 'type', prompt: 'Escreva: “Estou procurando meu telefone.”', answer: 'I am looking for my phone.', explanation: 'Look for no presente contínuo vira am looking for.' },
          { kind: 'choice', prompt: 'Complete: “Please turn ___ the TV.” (desligue)', options: ['on', 'off', 'up'], answer: 'off', explanation: 'Turn off = desligar. Turn on = ligar.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I need to find out what time the store closes.”', answer: 'I need to find out what time the store closes.', explanation: 'Find out = descobrir. Closes recebe -s porque store é terceira pessoa do singular.' },
        ],
      },
      {
        id: 'work-communication',
        title: 'Comunique-se no trabalho',
        subtitle: 'Pedidos, atualizações e prazos',
        objective: 'Dar atualizações simples e pedir informações com clareza.',
        pattern: 'I’m working on... · Could you...? · I’ll send it by...',
        teach: [
          { term: 'I’m working on...', meaning: 'Estou trabalhando em...', example: 'I’m working on the report.' },
          { term: 'Could you...?', meaning: 'Você poderia...?', example: 'Could you send me the file?' },
          { term: 'deadline', meaning: 'prazo final', example: 'The deadline is Friday.' },
          { term: 'by Friday', meaning: 'até sexta-feira', example: 'I will finish it by Friday.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual pedido é mais educado?', options: ['Send me the file now.', 'Could you send me the file, please?', 'You send file.'], answer: 'Could you send me the file, please?', explanation: 'Could you...? é uma forma educada de fazer pedidos.' },
          { kind: 'build', prompt: 'Monte: “Estou trabalhando no relatório.”', tokens: ['report.', 'the', 'on', 'working', 'am', 'I'], answer: 'I am working on the report.', explanation: 'Present continuous: I am + working. Work on = trabalhar em.' },
          { kind: 'type', prompt: 'Escreva: “Vou enviar até sexta-feira.”', answer: 'I will send it by Friday.', explanation: 'Will + verbo base. By Friday indica prazo limite: até sexta.' },
          { kind: 'choice', prompt: 'O que significa “deadline”?', options: ['reunião', 'prazo final', 'arquivo'], answer: 'prazo final', explanation: 'Deadline é a data ou hora limite para concluir algo.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “I’m finishing the task and I’ll send an update this afternoon.”', answer: 'I’m finishing the task and I’ll send an update this afternoon.', explanation: 'Update = atualização. This afternoon = hoje à tarde.' },
        ],
      },
      {
        id: 'b1plus-review',
        title: 'Revisão: condições e comunicação',
        subtitle: 'Conecte estruturas em situações reais',
        objective: 'Combinar condicionais, phrasal verbs e comunicação profissional.',
        pattern: 'Produza frases completas e observe como as partes se conectam.',
        isReview: true,
        teach: [
          { term: 'If...', meaning: 'Se...', example: 'If I have time, I will help.' },
          { term: 'Phrasal verbs', meaning: 'Verbos compostos', example: 'I need to look for my bag.' },
          { term: 'Could you...?', meaning: 'Pedido educado', example: 'Could you check this file?' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “If she calls, I ___ answer.”', options: ['will', 'would', 'am'], answer: 'will', explanation: 'First conditional: condição no presente e resultado com will.' },
          { kind: 'type', prompt: 'Escreva: “Preciso procurar minhas chaves.”', answer: 'I need to look for my keys.', explanation: 'Need to = precisar. Look for = procurar.' },
          { kind: 'build', prompt: 'Monte: “Você poderia verificar o arquivo?”', tokens: ['file?', 'the', 'check', 'you', 'Could'], answer: 'Could you check the file?', explanation: 'Could + sujeito + verbo base + complemento.' },
          { kind: 'choice', prompt: 'Qual expressão indica prazo limite?', options: ['by Monday', 'on Monday morning only', 'from Monday'], answer: 'by Monday', explanation: 'By Monday significa até segunda-feira, como prazo final.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “If I finish early, I will send you the update.”', answer: 'If I finish early, I will send you the update.', explanation: 'Finish early = terminar cedo. Send you = enviar para você.' },
        ],
      },
      {
        id: 'b1plus-checkpoint',
        title: 'Desafio de autonomia B1+',
        subtitle: 'Avaliação da unidade · 8 questões',
        objective: 'Resolver situações práticas usando inglês conectado e mais natural.',
        pattern: 'Meta de aprovação: 70%. A avaliação mistura gramática e uso real.',
        isCheckpoint: true,
        teach: [
          { term: 'Condição', meaning: 'If + presente, will', example: 'If I can, I will join.' },
          { term: 'Expressões', meaning: 'Phrasal verbs', example: 'I will find out.' },
          { term: 'Trabalho', meaning: 'Pedidos e prazos', example: 'Could you send it by Friday?' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “If they arrive late, we ___ start without them.”', options: ['will', 'would', 'are'], answer: 'will', explanation: 'First conditional usa will para o resultado provável.' },
          { kind: 'build', prompt: 'Monte: “Vou descobrir a resposta.”', tokens: ['answer.', 'the', 'out', 'find', 'will', 'I'], answer: 'I will find out the answer.', explanation: 'Will + find out + the answer.' },
          { kind: 'type', prompt: 'Escreva: “Você poderia me enviar o relatório até amanhã?”', answer: 'Could you send me the report by tomorrow?', explanation: 'Could you + verbo base. By tomorrow indica o prazo.' },
          { kind: 'choice', prompt: '“Turn on the computer” significa:', options: ['Desligue o computador.', 'Ligue o computador.', 'Procure o computador.'], answer: 'Ligue o computador.', explanation: 'Turn on = ligar; turn off = desligar.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'If we leave now, we will get there on time.', explanation: 'On time = no horário. If + presente, will + verbo base.' },
          { kind: 'type', prompt: 'Escreva: “Estou trabalhando em uma nova ideia.”', answer: 'I am working on a new idea.', explanation: 'Am working on = estou trabalhando em.' },
          { kind: 'choice', prompt: 'Qual frase está correta?', options: ['If it will rain, I stay home.', 'If it rains, I will stay home.', 'If it raining, I will stay home.'], answer: 'If it rains, I will stay home.', explanation: 'Na oração com if do first conditional, usamos presente simples, não will.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Could you let me know if the meeting time changes?”', answer: 'Could you let me know if the meeting time changes?', explanation: 'Let me know = me avise. Meeting time = horário da reunião.' },
        ],
      },
    ],
  },

  {
    id: 'b2-advanced-structures',
    level: 'B2 · Intermediário superior',
    title: 'Use estruturas mais sofisticadas',
    subtitle: 'Voz passiva, discurso indireto e hipóteses.',
    lessons: [
      {
        id: 'passive-voice',
        title: 'Destaque o que aconteceu',
        subtitle: 'Voz passiva no presente e passado',
        objective: 'Explicar processos e acontecimentos quando a ação importa mais que quem a realizou.',
        pattern: 'be + particípio · The product is made here. · The bridge was built in 1990.',
        teach: [
          { term: 'is made', meaning: 'é feito / fabricado', example: 'This coffee is made in Brazil.' },
          { term: 'was built', meaning: 'foi construído', example: 'The bridge was built in 1990.' },
          { term: 'is used', meaning: 'é usado', example: 'English is used around the world.' },
          { term: 'by', meaning: 'por (agente da ação)', example: 'The book was written by Ana.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “The emails ___ every morning.”', options: ['are sent', 'send', 'is sending'], answer: 'are sent', explanation: 'Emails está no plural. A voz passiva usa be + particípio: are sent.' },
          { kind: 'build', prompt: 'Monte: “O prédio foi construído em 2005.”', tokens: ['2005.', 'in', 'built', 'was', 'building', 'The'], answer: 'The building was built in 2005.', explanation: 'Was built é a voz passiva no passado. Building aqui é o substantivo “prédio”.' },
          { kind: 'type', prompt: 'Escreva: “Este aplicativo é usado por milhões de pessoas.”', answer: 'This app is used by millions of people.', explanation: 'Is used = é usado; by millions of people = por milhões de pessoas.' },
          { kind: 'choice', prompt: 'Qual frase está na voz passiva?', options: ['The team finished the project.', 'The project was finished.', 'The team is finishing.'], answer: 'The project was finished.', explanation: 'O sujeito recebe a ação: the project was finished.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “The final decision was made by the manager.”', answer: 'The final decision was made by the manager.', explanation: 'Was made é o passado passivo de make. By the manager identifica quem tomou a decisão.' },
        ],
      },
      {
        id: 'reported-speech',
        title: 'Conte o que alguém disse',
        subtitle: 'Reported speech: said, told e mudanças de tempo',
        objective: 'Relatar falas de outras pessoas sem repetir exatamente as palavras.',
        pattern: '“I am busy.” → He said (that) he was busy.',
        teach: [
          { term: 'said', meaning: 'disse', example: 'She said she was tired.' },
          { term: 'told me', meaning: 'me disse / contou', example: 'He told me he was leaving.' },
          { term: 'was / were', meaning: 'era / estava (recuo de am/is/are)', example: '“I am ready.” → She said she was ready.' },
          { term: 'would', meaning: 'iria (recuo de will)', example: '“I will call.” → He said he would call.' },
        ],
        exercises: [
          { kind: 'choice', prompt: '“I am tired.” → She said she ___ tired.', options: ['is', 'was', 'will be'], answer: 'was', explanation: 'Ao relatar uma fala no passado, am geralmente recua para was.' },
          { kind: 'build', prompt: 'Transforme: “I will call you.” → He said he...', tokens: ['call.', 'would', 'you'], answer: 'would call you.', explanation: 'Will normalmente muda para would no discurso indireto com verbo introdutor no passado.' },
          { kind: 'type', prompt: 'Relate: “I like this city.” → He said he...', answer: 'He said he liked that city.', explanation: 'Like pode recuar para liked; this pode mudar para that conforme o contexto.' },
          { kind: 'choice', prompt: 'Qual construção está correta?', options: ['She told that she was busy.', 'She told me that she was busy.', 'She said me she was busy.'], answer: 'She told me that she was busy.', explanation: 'Tell normalmente pede objeto: told me. Say não usa objeto direto dessa forma.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “They told us that the meeting had been canceled.”', answer: 'They told us that the meeting had been canceled.', explanation: 'Told us = nos disseram. Had been canceled = tinha sido cancelada.' },
        ],
      },
      {
        id: 'second-conditional',
        title: 'Imagine situações hipotéticas',
        subtitle: 'Second conditional',
        objective: 'Falar sobre situações imaginárias ou improváveis no presente e suas consequências.',
        pattern: 'If + past simple, would + verbo base',
        teach: [
          { term: 'If I had...', meaning: 'Se eu tivesse...', example: 'If I had more time, I would travel.' },
          { term: 'would', meaning: 'iria / faria', example: 'I would study abroad.' },
          { term: 'If I were you', meaning: 'Se eu fosse você', example: 'If I were you, I would ask.' },
          { term: 'could', meaning: 'poderia', example: 'If I had a car, I could drive there.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “If I ___ rich, I would travel more.”', options: ['am', 'were', 'will be'], answer: 'were', explanation: 'No second conditional, usamos passado simples na condição. Were é comum com I em hipóteses.' },
          { kind: 'build', prompt: 'Monte: “Se eu tivesse tempo, aprenderia francês.”', tokens: ['French.', 'learn', 'would', 'I', 'time,', 'had', 'If'], answer: 'If I had time, I would learn French.', explanation: 'If + passado (had), would + verbo base (learn).' },
          { kind: 'type', prompt: 'Escreva: “Se eu fosse você, aceitaria o trabalho.”', answer: 'If I were you, I would accept the job.', explanation: 'If I were you é uma expressão fixa muito comum para dar conselho.' },
          { kind: 'choice', prompt: 'Depois de would, usamos:', options: ['verbo base', 'verbo com -ed', 'verbo com -s'], answer: 'verbo base', explanation: 'Would é modal e vem seguido do verbo na forma base: would go, would do.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “If we lived closer, we would see each other more often.”', answer: 'If we lived closer, we would see each other more often.', explanation: 'Lived closer = morássemos mais perto. More often = com mais frequência.' },
        ],
      },
      {
        id: 'b2-review',
        title: 'Revisão: estruturas B2',
        subtitle: 'Voz passiva, discurso indireto e hipóteses',
        objective: 'Escolher a estrutura correta de acordo com a intenção.',
        pattern: 'Observe quem recebe a ação, quem falou e se a situação é real ou hipotética.',
        isReview: true,
        teach: [
          { term: 'Passive', meaning: 'O sujeito recebe a ação', example: 'The report was completed.' },
          { term: 'Reported speech', meaning: 'Relatar uma fala', example: 'She said she was ready.' },
          { term: 'Second conditional', meaning: 'Hipótese', example: 'If I had time, I would help.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “The documents ___ yesterday.”', options: ['were signed', 'signed', 'are sign'], answer: 'were signed', explanation: 'Documentos recebem a ação; no passado plural usamos were + particípio.' },
          { kind: 'type', prompt: 'Relate: “I can help.” → She said she...', answer: 'She said she could help.', explanation: 'Can geralmente muda para could no discurso indireto.' },
          { kind: 'build', prompt: 'Monte: “Se eu morasse aqui, iria a pé.”', tokens: ['walk.', 'would', 'I', 'here,', 'lived', 'If'], answer: 'If I lived here, I would walk.', explanation: 'If + lived; resultado com would + walk.' },
          { kind: 'choice', prompt: 'Qual frase é uma hipótese?', options: ['If it rains, I will stay.', 'If I had wings, I would fly.', 'I have lived here for years.'], answer: 'If I had wings, I would fly.', explanation: 'A situação é imaginária: não tenho asas.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “The new policy was announced after the manager said it would improve safety.”', answer: 'The new policy was announced after the manager said it would improve safety.', explanation: 'Was announced é passiva; said it would improve é discurso indireto.' },
        ],
      },
      {
        id: 'b2-checkpoint',
        title: 'Desafio de estruturas B2',
        subtitle: 'Avaliação da unidade · 8 questões',
        objective: 'Aplicar estruturas intermediárias superiores em contextos novos.',
        pattern: 'Meta de aprovação: 70%.',
        isCheckpoint: true,
        teach: [
          { term: 'Voz passiva', meaning: 'be + particípio', example: 'The results were published.' },
          { term: 'Discurso indireto', meaning: 'Relatar falas', example: 'He said he needed help.' },
          { term: 'Hipótese', meaning: 'If + past, would', example: 'If I knew, I would tell you.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Complete: “The office ___ every evening.”', options: ['is cleaned', 'cleans', 'is clean'], answer: 'is cleaned', explanation: 'Voz passiva no presente: is + particípio cleaned.' },
          { kind: 'build', prompt: 'Monte: “O relatório foi enviado ontem.”', tokens: ['yesterday.', 'sent', 'was', 'report', 'The'], answer: 'The report was sent yesterday.', explanation: 'Was sent é a forma passiva no passado de send.' },
          { kind: 'type', prompt: 'Relate: “I will be late.” → He said he...', answer: 'He said he would be late.', explanation: 'Will muda para would no discurso indireto.' },
          { kind: 'choice', prompt: 'Complete: “If she ___ more confident, she would apply.”', options: ['is', 'were', 'will be'], answer: 'were', explanation: 'Second conditional usa passado simples na oração com if.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'The project was completed before the deadline.', explanation: 'Was completed = foi concluído. Before the deadline = antes do prazo.' },
          { kind: 'type', prompt: 'Escreva: “Se eu soubesse a resposta, contaria a você.”', answer: 'If I knew the answer, I would tell you.', explanation: 'If I knew + would tell: hipótese no presente.' },
          { kind: 'choice', prompt: 'Qual frase relata corretamente “I am working”?', options: ['She said she is working.', 'She said she was working.', 'She said she working.'], answer: 'She said she was working.', explanation: 'Am working normalmente recua para was working.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “If the information were available, it would be shared with everyone.”', answer: 'If the information were available, it would be shared with everyone.', explanation: 'Were available descreve a hipótese; would be shared é a consequência passiva.' },
        ],
      },
    ],
  },
  {
    id: 'c1-advanced-communication',
    level: 'C1 · Avançado',
    title: 'Refine seu inglês avançado',
    subtitle: 'Precisão, nuances, argumentação e combinações naturais de palavras.',
    lessons: [
      {
        id: 'hedging-nuance',
        title: 'Expresse certeza e cautela',
        subtitle: 'Hedging: might, appears to, tends to',
        objective: 'Apresentar opiniões e conclusões com o grau adequado de certeza.',
        pattern: 'It seems that... · This may suggest... · It is likely that...',
        teach: [
          { term: 'might / may', meaning: 'pode ser que', example: 'The change might improve results.' },
          { term: 'appears to', meaning: 'parece', example: 'The strategy appears to be effective.' },
          { term: 'tends to', meaning: 'tende a', example: 'Demand tends to increase in summer.' },
          { term: 'highly likely', meaning: 'muito provável', example: 'It is highly likely to happen.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual expressão comunica possibilidade sem afirmar certeza?', options: ['It definitely proves...', 'It might indicate...', 'It is impossible that...'], answer: 'It might indicate...', explanation: 'Might indica possibilidade. É útil quando a evidência não permite uma afirmação definitiva.' },
          { kind: 'build', prompt: 'Monte: “A tendência parece estar mudando.”', tokens: ['changing.', 'be', 'to', 'appears', 'trend', 'The'], answer: 'The trend appears to be changing.', explanation: 'Appears to be + -ing comunica uma observação com cautela.' },
          { kind: 'type', prompt: 'Escreva: “É provável que os custos aumentem.”', answer: 'Costs are likely to increase.', explanation: 'Be likely to + verbo base expressa probabilidade.' },
          { kind: 'choice', prompt: '“Tends to increase” significa:', options: ['sempre aumenta', 'tende a aumentar', 'parou de aumentar'], answer: 'tende a aumentar', explanation: 'Tends to descreve uma tendência, não uma regra sem exceções.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “The available evidence seems to support a more cautious approach.”', answer: 'The available evidence seems to support a more cautious approach.', explanation: 'Seems to support = parece apoiar. Cautious approach = abordagem cautelosa.' },
        ],
      },
      {
        id: 'advanced-connectors',
        title: 'Construa argumentos sofisticados',
        subtitle: 'Nevertheless, whereas, therefore e despite',
        objective: 'Organizar argumentos, contrastes e consequências com precisão.',
        pattern: 'Despite + substantivo/-ing · Whereas + oração · Therefore = portanto',
        teach: [
          { term: 'nevertheless', meaning: 'ainda assim / contudo', example: 'It was difficult. Nevertheless, we succeeded.' },
          { term: 'whereas', meaning: 'enquanto / ao passo que', example: 'Sales rose, whereas costs fell.' },
          { term: 'therefore', meaning: 'portanto', example: 'Demand increased; therefore, prices rose.' },
          { term: 'despite', meaning: 'apesar de', example: 'Despite the delay, we finished.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual palavra introduz uma consequência lógica?', options: ['therefore', 'whereas', 'despite'], answer: 'therefore', explanation: 'Therefore significa portanto e introduz uma conclusão ou consequência.' },
          { kind: 'build', prompt: 'Monte: “Apesar do atraso, terminamos.”', tokens: ['finished.', 'we', 'delay,', 'the', 'Despite'], answer: 'Despite the delay, we finished.', explanation: 'Despite é seguido por substantivo ou forma -ing, não por uma oração completa diretamente.' },
          { kind: 'type', prompt: 'Escreva: “As vendas aumentaram, enquanto os custos diminuíram.”', answer: 'Sales increased, whereas costs decreased.', explanation: 'Whereas contrasta duas informações.' },
          { kind: 'choice', prompt: 'Complete: “The plan was risky. ___, it worked.”', options: ['Therefore', 'Nevertheless', 'Because'], answer: 'Nevertheless', explanation: 'Nevertheless apresenta contraste: apesar do risco, funcionou.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Despite facing several challenges, the team delivered the project on time.”', answer: 'Despite facing several challenges, the team delivered the project on time.', explanation: 'Despite facing = apesar de enfrentar. Delivered on time = entregou no prazo.' },
        ],
      },
      {
        id: 'collocations-precision',
        title: 'Soar mais natural com collocations',
        subtitle: 'Combinações de palavras usadas por falantes fluentes',
        objective: 'Escolher combinações naturais em vez de traduzir palavra por palavra.',
        pattern: 'make a decision · take responsibility · meet a deadline · raise awareness',
        teach: [
          { term: 'make a decision', meaning: 'tomar uma decisão', example: 'We need to make a decision.' },
          { term: 'take responsibility', meaning: 'assumir responsabilidade', example: 'She took responsibility for the result.' },
          { term: 'meet a deadline', meaning: 'cumprir um prazo', example: 'We must meet the deadline.' },
          { term: 'raise awareness', meaning: 'conscientizar / aumentar a conscientização', example: 'The campaign raises awareness.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual combinação é natural em inglês?', options: ['do a decision', 'make a decision', 'create a decision'], answer: 'make a decision', explanation: 'A collocation padrão é make a decision, não do a decision.' },
          { kind: 'build', prompt: 'Monte: “Precisamos cumprir o prazo.”', tokens: ['deadline.', 'the', 'meet', 'to', 'need', 'We'], answer: 'We need to meet the deadline.', explanation: 'Meet a deadline = cumprir um prazo.' },
          { kind: 'type', prompt: 'Escreva: “Ela assumiu a responsabilidade.”', answer: 'She took responsibility.', explanation: 'Take responsibility é a combinação natural; no passado, took responsibility.' },
          { kind: 'choice', prompt: 'Complete: “The campaign aims to ___ awareness.”', options: ['raise', 'lift', 'grow'], answer: 'raise', explanation: 'Raise awareness é uma collocation comum para aumentar a conscientização.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “We need to weigh the options before making a final decision.”', answer: 'We need to weigh the options before making a final decision.', explanation: 'Weigh the options = ponderar as opções. Final decision = decisão final.' },
        ],
      },
      {
        id: 'c1-review',
        title: 'Revisão: precisão e fluência avançada',
        subtitle: 'Nuance, conectores e collocations',
        objective: 'Ajustar a linguagem ao nível de certeza, intenção e contexto.',
        pattern: 'Fluência avançada não é usar palavras difíceis: é escolher a expressão exata.',
        isReview: true,
        teach: [
          { term: 'Hedging', meaning: 'Ajustar o grau de certeza', example: 'The results may suggest...' },
          { term: 'Connectors', meaning: 'Organizar argumentos', example: 'Nevertheless, the evidence...' },
          { term: 'Collocations', meaning: 'Combinações naturais', example: 'Make a decision.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual frase evita afirmar algo sem evidência suficiente?', options: ['This proves everything.', 'This may indicate a pattern.', 'This is always true.'], answer: 'This may indicate a pattern.', explanation: 'May indica possibilidade e evita transformar uma hipótese em certeza.' },
          { kind: 'type', prompt: 'Escreva: “Apesar das dificuldades, cumprimos o prazo.”', answer: 'Despite the difficulties, we met the deadline.', explanation: 'Despite + substantivo; meet the deadline é a collocation correta.' },
          { kind: 'build', prompt: 'Monte: “Portanto, precisamos tomar uma decisão.”', tokens: ['decision.', 'a', 'make', 'to', 'need', 'we', 'Therefore,'], answer: 'Therefore, we need to make a decision.', explanation: 'Therefore introduz a conclusão; make a decision é a combinação natural.' },
          { kind: 'choice', prompt: 'Complete: “The data ___ to show a gradual increase.”', options: ['appears', 'appearing', 'appear to'], answer: 'appears', explanation: 'The data appears to show... apresenta uma interpretação cautelosa.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “The findings are likely to have significant implications for future research.”', answer: 'The findings are likely to have significant implications for future research.', explanation: 'Likely to = provável que. Implications = implicações.' },
        ],
      },
      {
        id: 'c1-checkpoint',
        title: 'Desafio final C1',
        subtitle: 'Avaliação avançada · 8 questões',
        objective: 'Demonstrar precisão na comunicação, argumentação e escolha de expressões.',
        pattern: 'Meta de aprovação: 70%. Este desafio fecha a trilha atual.',
        isCheckpoint: true,
        teach: [
          { term: 'Precisão', meaning: 'Dizer exatamente o que a evidência permite', example: 'The results appear to suggest...' },
          { term: 'Argumentação', meaning: 'Conectar ideias com lógica', example: 'Nevertheless, the evidence is limited.' },
          { term: 'Naturalidade', meaning: 'Usar combinações idiomáticas', example: 'Meet a deadline.' },
        ],
        exercises: [
          { kind: 'choice', prompt: 'Qual expressão é mais cautelosa?', options: ['This unquestionably proves...', 'This appears to suggest...', 'This can never be questioned.'], answer: 'This appears to suggest...', explanation: 'Appears to suggest comunica interpretação sem afirmar prova definitiva.' },
          { kind: 'build', prompt: 'Monte: “Ainda assim, precisamos considerar os riscos.”', tokens: ['risks.', 'the', 'consider', 'to', 'need', 'we', 'Nevertheless,'], answer: 'Nevertheless, we need to consider the risks.', explanation: 'Nevertheless introduz contraste; consider the risks = considerar os riscos.' },
          { kind: 'type', prompt: 'Escreva: “A equipe cumpriu o prazo apesar dos obstáculos.”', answer: 'The team met the deadline despite the obstacles.', explanation: 'Met the deadline é o passado de meet the deadline.' },
          { kind: 'choice', prompt: 'Qual collocation significa “assumir responsabilidade”?', options: ['make responsibility', 'take responsibility', 'do responsibility'], answer: 'take responsibility', explanation: 'Take responsibility é a combinação idiomática natural.' },
          { kind: 'listen', prompt: 'Ouça e escreva a frase.', answer: 'The evidence is limited; therefore, the conclusion should be cautious.', explanation: 'Therefore introduz consequência; cautious = cautelosa.' },
          { kind: 'type', prompt: 'Escreva: “É provável que a demanda aumente gradualmente.”', answer: 'Demand is likely to increase gradually.', explanation: 'Is likely to increase = é provável que aumente. Gradually = gradualmente.' },
          { kind: 'choice', prompt: 'Complete: “___ the high cost, the project was successful.”', options: ['Despite', 'Whereas', 'Therefore'], answer: 'Despite', explanation: 'Despite + substantivo: despite the high cost.' },
          { kind: 'repeat', prompt: 'Ouça e repita: “Although the proposal has limitations, it may provide a useful basis for further discussion.”', answer: 'Although the proposal has limitations, it may provide a useful basis for further discussion.', explanation: 'Although introduz concessão; may indica possibilidade; further discussion = discussão adicional.' },
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
function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function previousLocalDateKey() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return localDateKey(date)
}
function normalize(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[’‘]/g, "'")
    .replace(/\b(i'm)\b/g, 'i am').replace(/\b(you're)\b/g, 'you are')
    .replace(/\b(he's)\b/g, 'he is').replace(/\b(she's)\b/g, 'she is')
    .replace(/\b(we're)\b/g, 'we are').replace(/\b(they're)\b/g, 'they are')
    .replace(/\b(isn't)\b/g, 'is not').replace(/\b(aren't)\b/g, 'are not')
    .replace(/\b(don't)\b/g, 'do not').replace(/\b(doesn't)\b/g, 'does not')
    .replace(/\b(didn't)\b/g, 'did not').replace(/\b(can't)\b/g, 'cannot')
    .replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim()
}
function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1))
      diagonal = old
    }
  }
  return row[right.length]
}
function speechMatches(transcript: string, expected: string) {
  const heard = normalize(transcript).split(' ').filter(Boolean)
  const target = normalize(expected).split(' ').filter(Boolean)
  if (heard.join(' ') === target.join(' ')) return true
  if (!heard.length || !target.length || heard.length !== target.length) return false
  let mismatches = 0
  for (let index = 0; index < target.length; index += 1) {
    if (heard[index] === target[index]) continue
    if (target[index].length >= 5 && editDistance(heard[index], target[index]) <= 1) continue
    mismatches += 1
  }
  return mismatches <= 1
}
function speakEnglish(text: string, accent: 'us' | 'uk', rate = 1) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US'
  utterance.rate = Math.max(0.7, Math.min(1, rate))
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(voice => voice.lang.toLowerCase() === utterance.lang.toLowerCase())
  if (preferred) utterance.voice = preferred
  window.speechSynthesis.speak(utterance)
  return true
}

export default function GuidedCourse({ accent = 'us', goalLabel = 'seu objetivo', onAskTutor, onLessonComplete, initialProgress, onProgressChange, onExerciseAttempt }: Props) {
  const [progress, setProgress] = useState<SavedProgress>(loadProgress)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => loadProgress().activeLessonId)
  const [step, setStep] = useState(0)
  const [lessonPhase, setLessonPhase] = useState<'learn' | 'understand' | 'practice' | 'speak' | 'review'>('learn')
  const [showHint, setShowHint] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState('')
  const [builtWords, setBuiltWords] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [checked, setChecked] = useState<boolean | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [retryQueue, setRetryQueue] = useState<Exercise[]>([])
  const [checkpointNotice, setCheckpointNotice] = useState('')
  const [audioNotice, setAudioNotice] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [freeSpeechTranscript, setFreeSpeechTranscript] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)
  const recognitionRef = useRef<CourseSpeechInstance | null>(null)
  const [introShown, setIntroShown] = useState(() => !loadProgress().introDone)

  const allLessons = useMemo(() => units.flatMap(unit => unit.lessons), [])
  const currentLesson = allLessons.find(lesson => lesson.id === activeLessonId) ?? null
  const activeExercises = currentLesson ? [...currentLesson.exercises, ...retryQueue] : []
  const currentExercise = activeExercises[step] ?? null
  const completedCount = progress.completedLessonIds.length
  const percentage = Math.round(completedCount / allLessons.length * 100)
  const nextLesson = allLessons.find((lesson, index) =>
    !progress.completedLessonIds.includes(lesson.id) &&
    (index === 0 || progress.completedLessonIds.includes(allLessons[index - 1].id))
  ) ?? null

  useEffect(() => {
    const snapshot = { ...progress, activeLessonId }
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)) } catch { /* Local progress remains available in this session. */ }
    onProgressChange?.(snapshot)
  }, [progress, activeLessonId, onProgressChange])

  useEffect(() => {
    if (!initialProgress) return
    setProgress({
      ...initialProgress,
      completedLessonIds: Array.isArray(initialProgress.completedLessonIds) ? initialProgress.completedLessonIds : [],
    })
    setActiveLessonId(initialProgress.activeLessonId ?? null)
    setIntroShown(!initialProgress.introDone)
  }, [initialProgress])

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
    setShowHint(false)
  }
  const beginLesson = (lessonId: string) => {
    setRetryQueue([])
    setFreeSpeechTranscript('')
    setActiveLessonId(lessonId)
    setStep(0)
    setLessonPhase('learn')
    setShowHint(false)
    setMistakes(0)
    setCheckpointNotice('')
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
    const answer = currentAnswer()
    const correct = currentExercise.kind === 'repeat' || normalize(answer) === normalize(currentExercise.answer)
    setChecked(correct)
    onExerciseAttempt?.({
      activityType: currentExercise.kind === 'listen' ? 'listening' : currentExercise.kind === 'repeat' ? 'speaking' : 'course_exercise',
      skill: currentExercise.kind === 'listen' ? 'listening' : currentExercise.kind === 'repeat' ? 'speaking' : currentExercise.kind === 'type' || currentExercise.kind === 'build' ? 'writing' : 'grammar',
      prompt: currentExercise.prompt,
      answer,
      expected: currentExercise.answer,
      explanation: currentExercise.explanation,
      correct,
    })
    if (!correct) {
      setMistakes(value => value + 1)
      if (!currentExercise.isRetry) {
        const retry: Exercise = {
          ...currentExercise,
          kind: currentExercise.kind === 'choice' || currentExercise.kind === 'build' ? 'type' : currentExercise.kind,
          prompt: 'Revisão adaptativa: responda novamente sem consultar as opções. ' + currentExercise.prompt,
          options: undefined,
          tokens: undefined,
          isRetry: true,
          hint: 'Você errou esta estrutura antes. Relembre a explicação e formule a resposta com suas próprias palavras.',
        }
        setRetryQueue(current => [...current, retry])
      }
    }
  }
  const retry = () => {
    resetExercise()
  }
  const nextStep = () => {
    if (!currentLesson || !currentExercise) return
    if (step < activeExercises.length - 1) {
      setStep(value => value + 1)
      resetExercise()
      return
    }
    const score = Math.max(0, Math.round((activeExercises.length - mistakes) / Math.max(1, activeExercises.length) * 100))
    if (currentLesson.isCheckpoint && score < 70) {
      setCheckpointNotice('Você acertou ' + score + '%. Para concluir esta unidade, precisa de pelo menos 70%. Revise as explicações e tente novamente.')
      setStep(0)
      setMistakes(0)
      setRetryQueue([])
      setLessonPhase('practice')
      resetExercise()
      return
    }
    setCheckpointNotice('')
    setLessonPhase('speak')
    setFreeSpeechTranscript('')
    resetExercise()
    return
  }

  const finishLesson = () => {
    if (!currentLesson) return
    const score = Math.max(0, Math.round((activeExercises.length - mistakes) / Math.max(1, activeExercises.length) * 100))
    if (currentLesson.isCheckpoint && score < 70) {
      setCheckpointNotice('Você acertou ' + score + '%. Para concluir esta unidade, precisa de pelo menos 70%. Revise as explicações e tente novamente.')
      setLessonPhase('practice')
      setStep(0)
      setMistakes(0)
      setRetryQueue([])
      resetExercise()
      return
    }
    setCheckpointNotice('')
    setProgress(current => ({
      ...current,
      completedLessonIds: current.completedLessonIds.includes(currentLesson.id)
        ? current.completedLessonIds
        : [...current.completedLessonIds, currentLesson.id],
      xp: current.xp + (current.completedLessonIds.includes(currentLesson.id) ? 0 : currentLesson.isCheckpoint ? 30 : currentLesson.isReview ? 15 : 10),
      streakDays: current.lastStudyDate === localDateKey() ? (current.streakDays ?? 0) : current.lastStudyDate === previousLocalDateKey() ? (current.streakDays ?? 0) + 1 : 1,
      lastStudyDate: localDateKey(),
      activeLessonId: null,
    }))
    setActiveLessonId(null)
    onLessonComplete(score, currentLesson.id)
  }
  const startFreeSpeaking = () => {
    const browserWindow = window as BrowserSpeechWindow
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition
    if (!Recognition) {
      setAudioNotice('O reconhecimento de fala não está disponível neste navegador. Você ainda pode escrever uma resposta e avançar.')
      return
    }
    try {
      setAudioNotice('')
      setFreeSpeechTranscript('')
      const recognition = new Recognition()
      recognition.lang = accent === 'uk' ? 'en-GB' : 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 3
      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() || ''
        setFreeSpeechTranscript(transcript)
        setVoiceTranscript(transcript)
        setAudioNotice('Transcrição capturada. Ela registra as palavras reconhecidas; não é uma nota fonética.')
        onExerciseAttempt?.({
          activityType: 'speaking', skill: 'speaking',
          prompt: 'Produção oral livre: ' + (currentLesson?.pattern || 'estrutura da aula'),
          answer: transcript, expected: currentLesson?.pattern || '',
          explanation: 'Resposta oral transcrita pelo navegador, sem avaliação fonética automática.', correct: transcript.length > 0,
        })
      }
      recognition.onerror = event => setAudioNotice('Não foi possível acessar o microfone (' + (event.error || 'erro') + '). Verifique a permissão.')
      recognition.onend = () => { setVoiceListening(false); recognitionRef.current = null }
      recognitionRef.current = recognition
      setVoiceListening(true)
      recognition.start()
    } catch {
      setVoiceListening(false)
      setAudioNotice('Não foi possível iniciar o microfone. Verifique a permissão do navegador.')
    }
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
        const matched = speechMatches(transcript, currentExercise.answer)
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
  const playModel = (text: string, rate = 1) => {
    const played = speakEnglish(text, accent, rate)
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
    const progressPercent = Math.round(10 + ((step + 1) / Math.max(1, activeExercises.length)) * 90)
    const hintText = currentExercise.hint ?? (currentExercise.kind === 'choice'
      ? 'Traduza as opções e elimine as que não combinam com a pergunta.'
      : currentExercise.kind === 'build'
        ? 'Comece pelo sujeito (quem faz a ação). Depois encontre o verbo e complete a ideia.'
        : currentExercise.kind === 'type'
          ? 'Recupere a estrutura apresentada na explicação e escreva a frase completa, sem copiar.'
          : currentExercise.kind === 'listen'
            ? 'Ouça a frase inteira uma vez. Depois escute novamente e preste atenção em cada palavra.'
            : 'Ouça o modelo, identifique os grupos de palavras e repita em voz alta no seu ritmo.')
    const canCheck = currentExercise.kind === 'choice' ? !!selectedChoice
      : currentExercise.kind === 'build' ? builtWords.length > 0
        : currentExercise.kind === 'repeat' ? checked === true
          : !!typedAnswer.trim()

    if (lessonPhase === 'learn') return (
      <section className="guided-course guided-lesson-view">
        <div className="lesson-topbar">
          <button className="course-icon-button" onClick={() => { setActiveLessonId(null); setProgress(current => ({ ...current, activeLessonId: null })); resetExercise() }} aria-label="Sair da aula"><X size={19}/></button>
          <div className="lesson-progress-track"><i style={{ width: '10%' }}/></div>
          <span>ETAPA 1/5</span>
        </div>
        <div className="lesson-context">
          <span className="course-eyebrow">PRIMEIRO, APRENDA · {currentLesson.subtitle.toUpperCase()}</span>
          <h1>{currentLesson.title}</h1>
          <p>{currentLesson.objective}</p>
        </div>
        <article className="lesson-teaching-card">
          <div className="teaching-card-heading"><span><BookOpen size={17}/> Entenda antes de praticar</span><span className="lesson-step-chip">LIÇÃO {allLessons.findIndex(item => item.id === currentLesson.id) + 1}</span></div>
          <div className="teaching-word-grid">
            {currentLesson.teach.map(item => <div className="teaching-word" key={item.term}>
              <strong>{item.term}</strong><span>{item.meaning}</span><small>{item.example}</small>
              <button onClick={() => playModel(item.term)} aria-label={'Ouvir ' + item.term}><Volume2 size={15}/> Ouvir</button>
            </div>)}
          </div>
          <div className="grammar-pattern"><Sparkles size={16}/><span>{currentLesson.pattern}</span></div>
          {currentLesson.lessonTip && <div className="lesson-tip-box"><strong>Entenda a regra</strong><p>{currentLesson.lessonTip}</p></div>}
        </article>
        <div className="lesson-prep-actions">
          <button className="course-primary-button" onClick={() => { setLessonPhase('understand'); setShowHint(false) }}>Avançar para escuta <ArrowRight size={17}/></button>
          <p>Você já viu a explicação. Agora tente lembrar e usar o inglês sem olhar para os exemplos.</p>
        </div>
      </section>
    )

    if (lessonPhase === 'understand') return (
      <section className="guided-course guided-lesson-view">
        <div className="lesson-topbar">
          <button className="course-icon-button" onClick={() => setLessonPhase('learn')} aria-label="Voltar para aprender"><BookOpen size={18}/></button>
          <div className="lesson-progress-track"><i style={{ width: '40%' }}/></div>
          <span>ETAPA 2/5</span>
        </div>
        <div className="lesson-context">
          <span className="course-eyebrow">OUÇA E ENTENDA · SEM TRADUÇÃO IMEDIATA</span>
          <h1>{currentLesson.title}</h1>
          <p>Escute o exemplo completo. Primeiro em velocidade normal, depois mais devagar. Tente identificar a estrutura antes de revelar o significado.</p>
        </div>
        <article className="lesson-teaching-card">
          <div className="teaching-card-heading"><span><Volume2 size={17}/> Escuta guiada</span><span className="lesson-step-chip">1.0x / 0.75x</span></div>
          {currentLesson.teach.slice(0, 3).map(item => <div className="understand-audio-row" key={item.term}>
            <strong>{item.example}</strong>
            <div>
              <button className="course-secondary-button" onClick={() => playModel(item.example, 1)}><Play size={14}/> Normal 1.0x</button>
              <button className="course-secondary-button" onClick={() => playModel(item.example, .75)}><Play size={14}/> Lenta 0.75x</button>
            </div>
            <details><summary>Revelar contexto</summary><p>{item.meaning} · {item.term}</p></details>
          </div>)}
          <div className="grammar-pattern"><Sparkles size={16}/><span>{currentLesson.objective}</span></div>
        </article>
        <div className="lesson-prep-actions">
          <button className="course-primary-button" onClick={() => { setLessonPhase('practice'); setStep(0); resetExercise() }}>Entendi, começar prática <ArrowRight size={17}/></button>
          <p>A escuta é uma etapa própria. Você pode repetir os exemplos antes de responder.</p>
        </div>
      </section>
    )

    if (lessonPhase === 'speak') return (
      <section className="guided-course guided-lesson-view">
        <div className="lesson-topbar">
          <button className="course-icon-button" onClick={() => setLessonPhase('practice')} aria-label="Rever exercícios"><RotateCcw size={18}/></button>
          <div className="lesson-progress-track"><i style={{ width: '82%' }}/></div>
          <span>ETAPA 4/5</span>
        </div>
        <div className="lesson-context">
          <span className="course-eyebrow">PRODUÇÃO ORAL · SEM LER</span>
          <h1>Agora use o inglês.</h1>
          <p>Responda com suas próprias palavras usando a estrutura <strong>{currentLesson.pattern}</strong>. Não precisa repetir um modelo literalmente.</p>
        </div>
        <article className="lesson-exercise-card">
          <div className="exercise-card-topline"><span>FALAR SEM LER</span><span>SHADOWING / RESPOSTA LIVRE</span></div>
          <h2>Imagine uma situação real relacionada a: {currentLesson.objective}</h2>
          <p className="lesson-speaking-prompt">Tente dizer duas frases curtas. Use uma expressão aprendida e acrescente um detalhe sobre sua rotina.</p>
          <div className="repeat-practice-box">
            <Mic size={20}/><div><strong>{voiceListening ? 'Ouvindo sua resposta…' : 'Grave sua resposta aqui'}</strong><small>O navegador transcreve sua fala. A transcrição ajuda a revisar as palavras, mas não mede sotaque ou qualidade fonética.</small></div>
            <button disabled={voiceListening} onClick={startFreeSpeaking}>{voiceListening ? 'Ouvindo…' : 'Gravar resposta'}</button>
          </div>
          {freeSpeechTranscript && <div className="course-feedback correct"><strong>Resposta capturada</strong><p>{freeSpeechTranscript}</p></div>}
          {audioNotice && <p className="course-audio-notice">{audioNotice}</p>}
          <textarea className="course-answer-input course-speaking-textarea" value={freeSpeechTranscript} onChange={event => setFreeSpeechTranscript(event.target.value)} rows={3} placeholder="Ou digite a frase que você falou…"/>
          <div className="lesson-action-row">
            <button className="course-secondary-button" onClick={() => onAskTutor('Estou na etapa oral da aula "' + currentLesson.title + '". Minha estrutura-alvo é ' + currentLesson.pattern + '. Dê feedback breve sobre esta resposta: ' + freeSpeechTranscript)}>Perguntar à Lumi</button>
            <button className="course-primary-button" onClick={() => setLessonPhase('review')}>Concluir fala e revisar <ArrowRight size={16}/></button>
          </div>
        </article>
      </section>
    )

    if (lessonPhase === 'review') return (
      <section className="guided-course guided-lesson-view">
        <div className="lesson-topbar">
          <button className="course-icon-button" onClick={() => setLessonPhase('speak')} aria-label="Voltar para fala"><RotateCcw size={18}/></button>
          <div className="lesson-progress-track"><i style={{ width: '100%' }}/></div>
          <span>ETAPA 5/5</span>
        </div>
        <div className="lesson-context"><span className="course-eyebrow">RESUMO DA LIÇÃO</span><h1>O que você praticou.</h1><p>Revise a estrutura e conclua para salvar seu avanço.</p></div>
        <article className="lesson-teaching-card">
          <div className="teaching-card-heading"><span><CheckCircle2 size={17}/> Síntese</span><span className="lesson-step-chip">{Math.max(0, activeExercises.length - mistakes)}/{activeExercises.length} acertos sem ajuda</span></div>
          <div className="grammar-pattern"><Sparkles size={16}/><span>{currentLesson.pattern}</span></div>
          <div className="teaching-word-grid">{currentLesson.teach.slice(0, 4).map(item => <div className="teaching-word" key={item.term}><strong>{item.term}</strong><span>{item.meaning}</span><small>{item.example}</small></div>)}</div>
          {retryQueue.length > 0 && <p className="lesson-tip-box"><strong>Revisões adaptativas:</strong> {retryQueue.length} variação(ões) de estruturas que precisaram de mais uma tentativa foram incluídas nesta aula.</p>}
          {freeSpeechTranscript && <p className="course-feedback correct"><strong>Sua produção oral</strong><span>{freeSpeechTranscript}</span></p>}
        </article>
        <div className="lesson-prep-actions">
          <button className="course-primary-button" onClick={finishLesson}>Salvar progresso e concluir aula <CheckCircle2 size={17}/></button>
          <p>Seu avanço será sincronizado na conta quando estiver conectado; no modo visitante, fica salvo neste aparelho.</p>
        </div>
      </section>
    )

    return (
      <section className="guided-course guided-lesson-view">
        <div className="lesson-topbar">
          <button className="course-icon-button" onClick={() => { setActiveLessonId(null); setProgress(current => ({ ...current, activeLessonId: null })) }} aria-label="Sair da aula"><X size={19}/></button>
          <div className="lesson-progress-track"><i style={{ width: progressPercent + '%' }}/></div>
          <span>ETAPA 3/5 · EXERCÍCIO {step + 1}/{activeExercises.length}</span>
        </div>
        <div className="lesson-context">
          <span className="course-eyebrow">PRATIQUE · {currentLesson.subtitle.toUpperCase()}</span>
          <h1>{currentLesson.title}</h1>
          <p>{currentLesson.objective}</p>
          <button className="course-review-button" onClick={() => setLessonPhase('learn')}><BookOpen size={14}/> Rever explicação</button>
        </div>
        {checkpointNotice && <div className="checkpoint-retry-notice"><strong>Você ainda não passou no teste.</strong><span>{checkpointNotice}</span></div>}
        <article className="lesson-exercise-card">
          <div className="exercise-card-topline"><span>AGORA É SUA VEZ</span><span>{currentExercise.kind === 'choice' ? 'ESCOLHA' : currentExercise.kind === 'build' ? 'MONTE A FRASE' : currentExercise.kind === 'type' ? 'ESCRITA' : currentExercise.kind === 'listen' ? 'ESCUTA' : 'FALA'}</span></div>
          <h2>{currentExercise.prompt}</h2>
          <button className="exercise-hint-toggle" onClick={() => setShowHint(value => !value)} aria-expanded={showHint}>{showHint ? 'Ocultar dica' : 'Precisa de uma dica?'}</button>
          {showHint && <div className="exercise-hint-panel"><strong>Pense no caminho, não na resposta</strong><p>{hintText}</p><small>Padrão desta aula: {currentLesson.pattern}</small></div>}
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
            {checked === true ? <button className="course-primary-button" onClick={nextStep}>{step === activeExercises.length - 1 ? 'Ir para etapa oral' : 'Continuar'} <ArrowRight size={16}/></button>
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
        <article><Zap size={18}/><strong>{progress.streakDays ?? 0} dias</strong><span>sequência de estudo</span></article>
      </div>
      <div className="course-path-heading"><div><span className="course-eyebrow">SUA TRILHA</span><h2>Uma etapa de cada vez</h2></div><span className="course-level-label">A0 → C1 · {allLessons.length} aulas sequenciais</span></div>
      {units.map((unit, unitIndex) => {
        const firstLessonIndex = allLessons.findIndex(lesson => lesson.id === unit.lessons[0].id)
        const unitDone = unit.lessons.every(lesson => progress.completedLessonIds.includes(lesson.id))
        const unitUnlocked = firstLessonIndex === 0 || progress.completedLessonIds.includes(allLessons[firstLessonIndex - 1].id)
        return <article className={unitUnlocked ? 'course-unit-card' : 'course-unit-card locked'} key={unit.id}>
          <div className="course-unit-heading"><span className="course-unit-number">{String(unitIndex + 1).padStart(2, '0')}</span><div><span className="course-level-chip">{unit.level}</span><h3>{unit.title}</h3><p>{unit.subtitle}</p></div>{unitDone ? <span className="unit-complete-pill"><CheckCircle2 size={14}/> Concluída</span> : !unitUnlocked ? <LockKeyhole size={18}/> : <span className="unit-open-pill">EM ANDAMENTO</span>}</div>
          <div className="course-lesson-list">
            {unit.lessons.map(lesson => {
              const globalIndex = allLessons.findIndex(item => item.id === lesson.id)
              const done = progress.completedLessonIds.includes(lesson.id)
              const unlocked = globalIndex === 0 || progress.completedLessonIds.includes(allLessons[globalIndex - 1].id)
              return <button className={done ? 'course-lesson-row done' : unlocked ? 'course-lesson-row' : 'course-lesson-row locked'} key={lesson.id} disabled={!unlocked} onClick={() => beginLesson(lesson.id)}>
                <span className="lesson-status-icon">{done ? <Check size={17}/> : unlocked ? <Play size={15}/> : <LockKeyhole size={15}/>}</span>
                <span className="course-lesson-copy"><strong>{lesson.title}</strong><small>{lesson.isCheckpoint ? 'TESTE DE UNIDADE' : lesson.isReview ? 'AULA DE REVISÃO' : lesson.subtitle} · {lesson.exercises.length} exercícios</small></span>
                {done ? <span className="lesson-done-label">Revisar</span> : unlocked ? <ArrowRight size={17}/> : null}
              </button>
            })}
          </div>
        </article>
      })}
      <div className="course-help-panel"><MessageCircle size={20}/><div><strong>A Lumi acompanha seu aprendizado.</strong><p>Quando uma explicação não ficar clara, peça outro exemplo. A tutora deve respeitar o nível desta trilha.</p></div><button className="course-secondary-button" onClick={() => onAskTutor('Estou começando inglês do zero. Explique os conceitos com palavras simples, tradução e exemplos curtos.')}>Perguntar à Lumi <ArrowRight size={15}/></button></div>
      <p className="course-storage-note">Seu progresso é sincronizado com sua conta quando conectado. No modo visitante, fica salvo neste aparelho.</p>
    </section>
  )
}
