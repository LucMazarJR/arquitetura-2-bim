# Ajustes no documento Word

O código foi alinhado ao documento: eventos com os nomes da seção 2 (`leitura.validada`, `alerta.gerado`, `meta.atualizada`, e `previsao.atualizada` no mesmo padrão), meta mensal, regra de consumo anormal na madrugada, autenticação da API por token e publicação MQTT com QoS 1 no firmware. Abaixo está o que muda no texto.

---

## A) Seções 1, 3 e 5 (Luciano)

O jeito mais simples é recopiar as três seções de `docs/secoes-luciano.md`. Se preferir editar no Word, as mudanças são:

**Seção 1**
- Lista de itens: o item de alertas passa a ser "alertas automáticos quando algo foge do normal (potência muito alta, tensão fora da faixa, consumo elevado na madrugada, meta mensal em risco);" e o último passa a ser "uma previsão do consumo e do valor da conta até o fim do mês, comparada com a meta mensal definida pelo morador."
- Quadro 1: nova linha **RF07 – Permitir ao morador definir uma meta mensal de consumo e avisá-lo quando ela estiver em risco ou for excedida.**
- 1.3: trocar o parágrafo pelo da nova versão (cita o app web, o Wokwi e o token de acesso; "autenticação de usuários" vira "cadastro e login de usuários").

**Seção 3**
- 1º parágrafo: depois de "Monitoramento", acrescentar "(este último é a “API” dos diagramas da seção 2)".
- 2º parágrafo: "uma leitura foi registrada" → "uma leitura foi validada".
- Quadro 2: trocar os nomes dos eventos (`reading.recorded` → `leitura.validada`, `alert.raised` → `alerta.gerado`, `forecast.updated` → `previsao.atualizada`). Linha da Análise: consome também `previsao.atualizada` e `meta.atualizada`; dados próprios ganham `analysis.goals`. Linha do Monitoramento: nome "Monitoramento (API)", responsabilidade "… e receber a meta mensal do morador", publica `meta.atualizada`, cache "da última leitura, da previsão e da meta".
- 3.1 e 3.3: trocar os nomes dos eventos.
- 3.2 e 3.5: trocar os parágrafos pelos da nova versão (regras novas e meta; autenticação por token). O título 3.5 vira "Monitoramento (API)".
- 3.6: "No protótipo, é substituído por um simulador e por um ESP32 simulado no Wokwi." e o cache guarda "a última leitura, a última previsão e a meta".

**Seção 5**
- Quadro 3: contracts **A 0,92 / D 0,08**; modules/analysis **D 0,07**; modules/monitoring **A 0,20 / D 0,13**. O resto não mudou.
- Quadro 4: trocar os nomes dos eventos; `previsao.atualizada` passa a ser consumido por "Monitoramento, Análise"; nova linha **`meta.atualizada` (stream `goals`) | Monitoramento | Análise | assíncrono (Redis Streams)**; a última linha vira "consultas, meta e tempo real". Depois do quadro, acrescentar a frase sobre a meta não ser uma chamada síncrona.
- 5.2: no envelope, o comentário vira `"leitura.validada"`; o item c) cita a meta e o token; no trecho do `AnalysisService`, o construtor ganha `alerts` e `goals` (copiar da nova versão).
- 5.3: item 3 `ReadingRecorded` → `ReadingValidated`; item 4 ganha a frase sobre a meta guardada duas vezes.
- Quadro 5: o exemplo de regra nova vira "aparelho esquecido ligado" (o consumo anormal na madrugada agora já existe) e `reading.recorded` → `leitura.validada`.

---

## B) Seção 2 (Igor): só três toques

1. No parágrafo depois do segundo diagrama, trocar uma palavra:
   - Antes: "Três módulos assinam esse evento de forma independente: Análise e regras, **Notificações** e API com WebSocket."
   - Depois: "Três módulos assinam esse evento de forma independente: Análise e regras, **Previsão** e API com WebSocket."

   Motivo: a Notificação só recebe `alerta.gerado`. Se recebesse as leituras, teria de decidir sozinha quais importam, duplicando a lógica da Análise e contradizendo a própria seção 4 ("Notificações: isola o conhecimento sobre canais de envio"). A frase seguinte, que diz que a Notificação consome `alerta.gerado`, continua certa. O diagrama não precisa mudar, porque a seta do barramento para Notificações representa justamente o `alerta.gerado`.

2. Na lista de eventos, acrescentar um item:
   - `previsao.atualizada`: publicado pela Previsão com a projeção de consumo e do valor da conta do mês; consumido pela API, para mostrar na tela, e pela Análise, para comparar com a meta mensal.

3. No passo 3 do fluxo, corrigir "**válida** a leitura" → "**valida** a leitura".

---

## C) Seção 4 (Igor): complemento para acrescentar ao final

> Sugestão de texto, a ser colado depois do último parágrafo da seção 4, sem mexer no que já está escrito.

**4.1 Previsão e Monitoramento**

- **Previsão:** concentra o cálculo da projeção do consumo e do valor da conta do mês. Não conhece regras de alerta nem canais de envio; se o modelo de previsão mudar (por exemplo, para considerar bandeiras tarifárias), só este módulo é alterado.
- **Monitoramento:** é o módulo que nos diagramas aparece como "API". Reúne tudo o que o aplicativo precisa: consultas, tempo real, recebimento da meta mensal e autenticação do acesso. Não calcula consumo nem decide alertas: apenas lê o modelo de leitura que monta a partir dos eventos.

**4.2 Evidências da coesão no código**

Richards e Ford ordenam os tipos de coesão do melhor para o pior: funcional, sequencial, comunicacional, procedural, temporal, lógica e coincidental. No protótipo, cada módulo é um módulo NestJS em uma pasta própria (`backend/src/modules/<nome>`), e os elementos internos de cada um colaboram para uma única responsabilidade:

- **Ingestão** (`ingestion.controller`, `validator`, `translator`, `reading.repository`, `ingestion.service`): coesão funcional, com encadeamento sequencial. A mensagem chega pelo controller MQTT, o resultado do validador alimenta o tradutor, o tradutor alimenta o repositório e, por fim, o serviço publica `leitura.validada`. Todos os elementos existem para tornar uma leitura confiável.
- **Análise** (`rules`, `alert.repository`, `goal.repository`, `analysis.service`): coesão funcional. Todas as regras (`PowerAboveLimit`, `VoltageOutOfRange`, `HighNightConsumption` e a verificação da meta mensal) respondem à mesma pergunta, "isso merece um alerta?", e as três primeiras implementam a mesma interface `Rule`.
- **Previsão** (`projection`, `forecast.repository`, `forecast.service`): coesão funcional. O cálculo fica isolado em funções puras (`projection.ts`), testadas sem banco nem barramento.
- **Notificação** (`channels`, `delivery.repository`, `notification.service`): coesão funcional. Todos os canais implementam a interface `Channel` e só sabem entregar mensagens.
- **Monitoramento** (`monitoring.controller`, `health.controller`, `live.gateway`, `api-token.guard`, `read-model`, `monitoring.service`): coesão comunicacional. Todos os elementos operam sobre o mesmo modelo de leitura para atender o aplicativo.

Três sinais concretos dessa coesão no código:

1. **Uma mudança de responsabilidade cabe em um arquivo:** uma regra nova entra em `rules.ts` da Análise; um canal novo, em `channels.ts` da Notificação; um sensor novo, em `translator.ts` da Ingestão.
2. **Cada módulo é testado sozinho:** os testes de um módulo (`backend/test/analysis.test.ts`, `forecast.test.ts`, `ingestion.test.ts` etc.) não precisam dos outros módulos, só de versões em memória do barramento e do banco.
3. **A coesão é protegida automaticamente:** o teste de arquitetura (`backend/test/architecture.test.ts`) falha se um módulo importar arquivos internos de outro. Isso impede que, com o tempo, responsabilidades vazem de um módulo para outro.

---

## D) Opcional

- Referências: o enunciado cita a edição em português, *Fundamentos da Arquitetura de Software* (Richards e Ford). Vale trocar a referência em inglês por ela, conferindo ano e editora no exemplar usado.
