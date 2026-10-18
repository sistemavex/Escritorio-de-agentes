# Sistema VEX para os agentes (somente leitura)

Servidor MCP sem dependências que dá aos agentes as ferramentas de **leitura** do Sistema VEX:
`quem_sou`, `obras`, `rdos`, `atividades`, `pendencias`, `suprimentos`, `custos`, `alertas`.
Cada agente só enxerga as ferramentas e as obras liberadas na chave dele.

## Como liga
1. No Sistema VEX (Supabase → SQL Editor): rode `X01` e depois `X02`. O X02 mostra as chaves **uma única vez**.
2. Crie a pasta e o arquivo de segredos **fora do repositório**:
   `C:\Users\<você>\.vex-agentes\segredos.env`
   ```
   VEX_TOKEN_01=vexag_...
   VEX_TOKEN_02=vexag_...
   VEX_TOKEN_03=vexag_...
   VEX_TOKEN_04=vexag_...
   VEX_TOKEN_05=vexag_...
   VEX_TOKEN_06=vexag_...
   VEX_TOKEN_09=vexag_...
   ```
   (Outro caminho: defina a variável de ambiente `VEX_SEGREDOS` com o caminho do arquivo.)
3. Teste uma chave sem o Claude: na pasta `agentes-vex\mcp-vex`, rode
   `set VEX_AGENTE_TOKEN=vexag_...` e depois `node servidor.js --teste`.
4. Reinicie o escritório (`npm start`) e mande um comando rápido, por exemplo `AUDITAR RDOs` no agente 03.

## Como funciona
- `agente.json` → `integracoes` → `"Sistema VEX": conectado true` liga o servidor para aquele agente.
- `integracoes.js` (raiz) passa ao Claude Code `--mcp-config` (só o servidor `vex`), `--strict-mcp-config`
  e `--allowedTools mcp__vex`. A chave vai pelo ambiente (`${VEX_TOKEN_NN}`), nunca pela linha de comando.
- Vale nos dois modos (Investigar e Resolver) e na reunião, porque as ferramentas só leem.
- Trocar uma chave: rode o X02 de novo (todas mudam) ou `select vex_agente_criar_token('03-controller-operacional', array['obras','rdos'])` para uma só.
- Desligar um agente: `conectado: false` no agente.json, ou no banco `update agente_tokens set ativo=false where agente='...'`.
- Cada consulta fica registrada no Sistema VEX (tabela `agente_acessos`).

## Segurança
- Nunca coloque chave no repositório (ele é público), no CLAUDE.md, no agente.json ou no sistemas.json.
- As chaves são só de leitura. Gravação no sistema virá numa etapa separada, com confirmação.
