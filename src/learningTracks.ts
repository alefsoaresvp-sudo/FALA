import { Map, Utensils, BriefcaseBusiness, Users, ShoppingBag, Car, type LucideIcon } from 'lucide-react'

export type TrackKind = 'choice' | 'write' | 'speak'
export type TrackLesson = {
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
export type TrackQuestion = { question: string; options: string[]; correct_index: number; explanation: string }
export type LearningTrack = {
  id: string
  title: string
  category: string
  description: string
  level: string
  minutes: number
  icon: LucideIcon
  goals: string[]
  interests: string[]
  lessons: TrackLesson[]
  exam: TrackQuestion[]
}
export type TrackProgress = { completed_lessons: number[]; exam_score: number | null; exam_passed: boolean }

export const learningTracks: LearningTrack[] = [
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
