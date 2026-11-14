export type MusicSet = {
  title: string
  theme: string
  lyrics: string[]
  translation: string
  words: [string, string][]
  gap: string
  options: string[]
}

export function readMusicSet(profile: { customInterest: string; interests: string[] }) {
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
