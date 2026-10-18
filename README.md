# Escritório de Agentes

Um escritório isométrico no navegador, estilo Habbo, para acompanhar e operar
os seus agentes de IA. Cada agente é um boneco com mesa e computador próprios;
clicar no computador dele abre o **sistema daquele agente** ali dentro, com
botões para ligar, desligar, ver o log e conversar com ele pelo Claude Code.

- Diretoria, sala de serviço com 18 estações, lounge, sala de reunião e recepção.
- Os bonecos trabalham na própria mesa, descansam no lounge no horário que você
  definir e se juntam na sala de reunião quando há reunião.
- O escritório sobe os sistemas locais, vigia quem caiu e religa sozinho.
- Nenhuma dependência: só Node.js.

## Começar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
git clone <url-deste-repositório> escritorio-de-agentes
cd escritorio-de-agentes
npm start
```

Abra **http://localhost:4321** (escritório isométrico) ou
**http://localhost:4321/sede** (sede 3D do Grupo VEX). Os 9 agentes do Grupo
VEX já vêm cadastrados e ligados. O agente de exemplo (pasta `exemplo-agente`)
continua no registro como molde.

No Windows:
- **`INICIAR ESCRITORIO.cmd`** sobe o escritório e o religa se ele cair.
- **`CRIAR ATALHO.ps1`** cria um atalho na área de trabalho. Para rodar: botão
  direito no arquivo e depois **Executar com o PowerShell**. O atalho liga o
  escritório, se estiver desligado, e abre o navegador.

## Os 9 agentes do Grupo VEX

Já vêm cadastrados e ligam sozinhos no primeiro minuto em que o escritório sobe.
Cada um tem uma pasta em `agentes-vex/` com:

- `CLAUDE.md`: o prompt completo do agente (missão, rotina, regras, formato e
  primeira resposta) e as regras de operação no escritório. O Claude Code lê
  esse arquivo em toda conversa e reunião.
- `agente.json`: missão, sistema principal, comandos rápidos e a situação de
  cada integração. Hoje todas estão `conectado: false`; troque para `true`
  quando ligar o Sistema VEX, o GoBuilder ou outra fonte ao agente.
- `server.js`: o painel do agente (porta 4411 a 4419), com a ficha, as
  integrações, a memória, as entregas e as tarefas dele.
- `memoria/` e `entregas/`: o que o agente aprende e entrega. Ficam fora do git.

| Nº | Agente | Função | Porta |
| --- | --- | --- | --- |
| 01 | Sheldon | Diretor de Operações e Portfólio | 4411 |
| 02 | Rito | Planejamento e Controle de Obras | 4412 |
| 03 | Otto | Controller Operacional | 4413 |
| 04 | Benício | Coordenador de Obras | 4414 |
| 05 | Luíza | Suprimentos e Compras | 4415 |
| 06 | Lúcia | Financeiro, Custos e Performance | 4416 |
| 07 | Analú | Comercial, Propostas e Contratos | 4417 |
| 08 | Ana Luíza | Marketing e Conteúdo | 4418 |
| 09 | Enrico | Atendimento, Pós-obra e Assistência | 4419 |

Em **💬 Conversar**, os cinco comandos rápidos do agente aparecem como
botões. Use **Investigar** para ele só ler e responder, e **Resolver** para ele
gravar a memória, as entregas e o quadro de tarefas entre agentes
(`agentes-vex/compartilhado/`). Na primeira conversa cada agente se apresenta e
faz o onboarding. Para mudar um agente, edite o `CLAUDE.md` e o `agente.json` da pasta dele.

## Colocar os seus agentes

Na aba **Contratar**, clique em **+ Cadastrar agente** e escolha:

| Sistema do agente | O que preencher |
| --- | --- |
| **Roda nesta máquina** | pasta do projeto, comando (`npm`, `node`, `python`…), argumentos (`run dev`) e uma porta livre |
| **Site / URL** | o endereço. Se o site recusar abrir em iframe, marque "usar o espelho" |
| **Nenhum** | só o boneco, sem sistema |

O escritório sobe o sistema local com a variável `PORT` igual à porta
informada. Se o seu projeto escolhe a porta de outro jeito, passe nos
argumentos (ex.: `run dev -- --port 4402`).

Tudo fica em `data/sistemas.json`, que também pode ser editado à mão. Os campos
estão explicados no topo de `data/sistemas.exemplo.json`.

Por segurança, o escritório escuta só em `127.0.0.1`, executa só o que está no
registro e recusa comando com `& | ; < > $` e crase. Ele também ignora pedido
vindo de outro site aberto no navegador.

## Conversar com um agente

No monitor, **💬 Conversar** abre uma sessão do [Claude Code](https://claude.com/claude-code)
dentro da pasta do sistema:

- **Investigar** só lê e explica.
- **Resolver** pode editar o projeto.

Precisa do Claude Code instalado e logado nesta máquina.

## Reunião dos agentes

Na sala de reunião, **▶ Reunir agora** junta os agentes que têm sistema local.
Cada um lê o próprio projeto e diz três coisas:

1. um número real;
2. uma melhoria;
3. o que precisa de outro agente.

No fim, um briefing junta tudo.

Cada fala é uma chamada ao Claude e consome a cota do seu plano. Por isso o
horário automático vem **desligado**. Para ligar, e para dar uma meta à
reunião, use `data/config.json` (veja abaixo).

## Configuração

Copie `data/config.exemplo.json` para `data/config.json` e ajuste:

- `nome`, `subtitulo`: o topo da tela e o letreiro das paredes.
- `dono`: o seu nome no boneco da Diretoria.
- `empresa`: uma frase sobre o negócio, que vira contexto na reunião.
- `porta`: a porta do escritório (padrão 4321).
- `reuniao.automatica`, `dias`, `hora`: a reunião em horário fixo.
- `reuniao.meta`: `descricao`, `alvo`, `feito`, `unidade` e `ate` aparecem no
  placar e orientam a conversa.

Para mudar as cores, edite as variáveis no topo de `css/style.css`.

## Avisos no celular

**🔔 Avisos** manda notificação pelo app gratuito [ntfy](https://ntfy.sh) ou
pelo WhatsApp via CallMeBot. O escritório avisa quando:

- um sistema caiu e não voltou;
- a reunião terminou;
- uma ação da agenda rodou.

Seus sistemas também podem pedir um aviso:

```http
POST http://localhost:4321/api/avisar
{ "titulo": "Meu agente", "texto": "3 pedidos esperando", "prioridade": "normal" }
```

## Rotinas dos agentes

Cada agente pode ter tarefas com dia e hora, por exemplo "Otto, seg a sáb às
7h30: AUDITAR RDOs". Elas ficam na ficha do agente, no escritório 3D (seção
**Rotinas**): comando, horário, dias, ativa/desligada, **▶ Rodar agora** e o
resultado da última execução.

- Na hora marcada o escritório manda o comando ao agente em modo somente
  leitura; a resposta vira uma entrega em `agentes-vex/<pasta>/entregas/`, que
  aparece no painel dele, e um aviso vai para o celular se os avisos estiverem
  ligados.
- Uma de cada vez. Se o escritório estava desligado, a rotina roda quando ele
  voltar, até 12 horas depois; nunca duas vezes para o mesmo horário. Rotina
  nova ou com horário mudado só vale dali para frente.
- Ficam em `data/rotinas.json` (fora do git); na primeira vez nascem de
  `data/rotinas.exemplo.json`.
- Cada execução é uma chamada ao Claude e consome a cota do plano.

## WhatsApp e reunião semanal

**Resultados no grupo.** Com `whatsapp.ativo` em `data/config.json`, cada
rotina termina com uma mensagem no grupo da equipe: emoji e nome do agente,
comando e um resumo de até 10 linhas que o próprio agente escreve. O escritório
manda um POST para um webhook do Make (cenário "ESCRITÓRIO VEX - AGENTES →
WHATSAPP"), que repassa pela Z-API. O webhook e a chave ficam só no
`data/config.json`; a chave precisa ser igual à do filtro do cenário. Teste:
`POST /api/whatsapp/teste`.

**Reunião semanal.** `reuniao` em `data/config.json`: sexta às 17h30, com os
agentes marcados "participa da reunião" na ficha. Rodada 1: cada um traz os 3
problemas da semana com dados do Sistema VEX. Rodada 2 (`rodada2: true`): cada
um responde aos outros com soluções e compromissos. Fechamento: o Diretor de
Operações (01) escreve a ata com o plano da semana, que fica nas entregas
dele, na aba Reunião e no grupo do WhatsApp.

## Agenda

`data/agenda.json` liga ou desliga um sistema numa data marcada. O exemplo está
no comentário da seção AGENDA em `server.js`.

## O que fica fora do git

Configuração, equipe, avisos (com a chave do CallMeBot), atas e estado ficam em
`data/` e são ignorados pelo git. Só os dois arquivos `*.exemplo.json` são
versionados.

## Estrutura

```
server.js          servidor: arquivos da tela, API, sobe/vigia sistemas, espelho
reuniao.js         reunião dos agentes (Claude Code em cada pasta)
avisos.js          ntfy e CallMeBot
index.html         a tela
js/                motor isométrico, salas, móveis, bonecos, painéis
css/style.css      tema
exemplo-agente/    o menor sistema que o escritório sabe operar
data/              seus dados (fora do git, menos os exemplos)
```

## Licença

MIT. Veja [LICENSE](LICENSE).
