# FALA English

**Pratique inglês de forma ativa: aprender, falar, escrever e revisar vocabulário.**

O FALA é um MVP de aprendizagem de inglês com interface responsiva. Esta primeira publicação é uma versão web estática que funciona diretamente no navegador, sem instalação ou conta.

## Abrir o aplicativo

Para publicar pela primeira vez, abra **Settings → Pages** neste repositório e, em **Build and deployment → Source**, selecione **GitHub Actions**. O workflow `.github/workflows/deploy.yml` já está no repositório e fará a publicação automática nos próximos pushes.

Depois que a execução do workflow terminar com sucesso, acesse:

https://alefsoaresvp-sudo.github.io/FALA/

## Funcionalidades desta versão

- Painel com plano diário e métricas locais.
- Mini-lições interativas com alternativas e explicações.
- Laboratório de fala com leitura em voz alta e reconhecimento de voz do navegador, quando suportado.
- Exercício de escrita com revisão básica por regras.
- Caderno de vocabulário com inclusão e remoção de expressões.
- Tela de progresso semanal.

## Executar localmente

1. Baixe ou clone este repositório.
2. Abra a pasta do projeto.
3. Abra `index.html` no navegador.

Para testar o microfone, use um navegador compatível e permita acesso ao microfone. O reconhecimento de voz costuma exigir HTTPS ou localhost.

## Dados e limitações

- O progresso e o vocabulário ficam no `localStorage` do navegador. Não há sincronização entre dispositivos nesta versão.
- A fala usa APIs do navegador. A comparação de palavras reconhecidas com a frase-alvo **não** é uma avaliação fonética nem mede qualidade de pronúncia.
- A revisão de escrita usa regras simples no próprio navegador. Ainda não chama um modelo de IA.
- A versão estática não está conectada ao Supabase nem à API da OpenAI.

## Próxima etapa técnica

A versão ampliada do MVP está planejada em React + TypeScript, com Supabase para autenticação e persistência e funções de backend para chamadas de IA. Essas integrações precisam ser configuradas e testadas antes de produção.

## Segurança

Nunca coloque chaves privadas da OpenAI, Supabase service role ou outros segredos no HTML/JavaScript público. Segredos devem permanecer no backend e ser configurados como secrets do ambiente de deploy.
