# Seções do Luciano (1, 3 e 5)

> Texto pronto para o documento Word, com a mesma numeração de quadros do Word. Os nomes entre crases são os nomes reais no código do protótipo (`backend/src`). As mudanças em relação à versão já colada no Word estão listadas em `docs/ajustes-no-word.md`.

---

## 1 DESCRIÇÃO DO PROBLEMA

No modelo atual de faturamento de energia elétrica residencial, o consumidor só toma conhecimento do próprio consumo uma vez por mês, quando recebe a fatura da distribuidora. Essa informação chega atrasada e agregada: a conta informa quantos quilowatts-hora (kWh) foram consumidos no período, mas não mostra em quais horários, em quais dias nem com quais equipamentos o consumo aconteceu. Assim, o morador descobre um gasto excessivo apenas depois que ele já ocorreu e não dispõe de dados para mudar hábitos, como perceber que o chuveiro elétrico responde por boa parte da conta ou que existe um consumo de fundo elevado durante a madrugada. Problemas na própria instalação, como tensão fora da faixa adequada, também passam despercebidos, embora possam danificar equipamentos.

O sistema proposto, um **Aplicativo de Monitoramento de Consumo de Energia Residencial baseado em IoT e eventos**, aproxima a medição do consumidor e a torna contínua. Um medidor instalado no quadro de energia da residência (microcontrolador ESP32 com o sensor PZEM-004T) mede tensão, corrente, potência, energia acumulada, frequência e fator de potência e envia essas leituras, pelo protocolo MQTT, ao backend da aplicação. O backend processa cada leitura e disponibiliza ao morador, em um aplicativo web e mobile:

- o consumo instantâneo (potência em watts), atualizado em tempo real;
- o histórico de consumo por minuto;
- alertas automáticos quando algo foge do normal (potência muito alta, tensão fora da faixa, consumo elevado na madrugada, meta mensal em risco);
- notificações desses alertas por e-mail e push;
- uma previsão do consumo e do valor da conta até o fim do mês, comparada com a meta mensal definida pelo morador.

### 1.1 Requisitos funcionais

Quadro 1 – Requisitos funcionais

| Código | Requisito |
|---|---|
| RF01 | Receber as leituras elétricas enviadas pelos medidores em intervalos regulares. |
| RF02 | Validar e armazenar o histórico das leituras. |
| RF03 | Exibir ao morador o consumo instantâneo e o histórico. |
| RF04 | Gerar alertas a partir de regras configuráveis. |
| RF05 | Notificar o morador sobre os alertas por e-mail e push. |
| RF06 | Estimar o consumo e o valor da fatura do mês corrente. |
| RF07 | Permitir ao morador definir uma meta mensal de consumo e avisá-lo quando ela estiver em risco ou for excedida. |

Fonte: elaborado pelos autores (2026).

### 1.2 Características arquiteturais

Richards e Ford distinguem os requisitos funcionais (o que o sistema faz) das **características arquiteturais**, isto é, as qualidades que o sistema precisa ter para que a solução funcione. Para este problema, as características que mais influenciam a arquitetura são:

- **Escalabilidade:** o volume de dados é contínuo e cresce com o número de residências. Com uma leitura a cada 5 segundos, cada medidor gera 17.280 leituras por dia; mil residências geram mais de 17 milhões de leituras por dia. A arquitetura precisa absorver esse fluxo sem que o crescimento de uma parte (por exemplo, a gravação das leituras) prejudique as demais.
- **Disponibilidade e tolerância a falhas:** uma leitura perdida é um dado de consumo que não volta. Se uma parte do backend ficar fora do ar, as leituras não podem se perder; devem ser processadas quando ela voltar.
- **Evolutividade:** o sistema deve aceitar novas funcionalidades (novas regras de alerta, novos canais de notificação, novos modelos de sensor, novos módulos) sem exigir alterações nos módulos existentes.
- **Desempenho (baixa latência):** o consumo exibido no aplicativo deve refletir a leitura mais recente em poucos segundos, para que o morador perceba o efeito de ligar ou desligar um aparelho.
- **Segurança e privacidade:** o perfil de consumo revela a rotina da família (por exemplo, os horários em que a casa fica vazia). A comunicação deve ser criptografada (MQTT sobre TLS) e o acesso aos dados restrito ao morador, em conformidade com a LGPD.

Essas características, e não a tecnologia escolhida, orientam as decisões das próximas seções: a divisão em módulos com responsabilidades bem definidas (seções 3 e 4), a comunicação assíncrona orientada a eventos (seção 5) e o controle da forma das dependências (seção 6).

### 1.3 Escopo do protótipo

O protótipo implementa os cinco módulos do backend (em NestJS), o barramento de eventos, o banco de séries temporais, o aplicativo web (React, PWA) e duas formas de substituir o medidor físico: um simulador, que gera leituras realistas de residências (consumo de fundo, geladeira, picos de chuveiro e quedas de tensão), e um firmware para ESP32 executado no simulador de hardware Wokwi. Ficam fora do escopo: cadastro e login de usuários (a API é protegida por um token de acesso simples), cadastro de dispositivos e o envio real de notificações push (simulado por um canal que apenas registra o envio).

---

## 3 IDENTIFICAÇÃO DOS MÓDULOS

O backend foi dividido em cinco módulos, cada um responsável por uma parte bem delimitada do domínio: **Ingestão, Análise, Previsão, Notificação e Monitoramento** (este último é a "API" dos diagramas da seção 2). No protótipo, cada um é um módulo NestJS próprio (`IngestionModule`, `AnalysisModule`, `ForecastModule`, `NotificationModule` e `MonitoringModule`), em uma pasta própria dentro de `src/modules`.

Os módulos **não se chamam diretamente**. Toda a comunicação entre eles passa por um barramento de eventos (Redis Streams): um módulo publica um evento informando que algo aconteceu (por exemplo, "uma leitura foi validada" ou "um alerta foi gerado"), e os módulos interessados reagem a ele.

Quadro 2 – Módulos do backend

| Módulo | Responsabilidade | Consome | Publica | Dados próprios |
|---|---|---|---|---|
| Ingestão | Receber, validar, traduzir e armazenar as leituras brutas | mensagens MQTT do medidor | `leitura.validada` | `ingestion.readings` |
| Análise | Avaliar regras sobre cada leitura e sobre a previsão do mês e gerar alertas | `leitura.validada`, `previsao.atualizada`, `meta.atualizada` | `alerta.gerado` | `analysis.alerts`, `analysis.goals` |
| Previsão | Projetar o consumo e o valor da conta do mês | `leitura.validada` | `previsao.atualizada` | `forecast.month_start`, `forecast.forecasts` |
| Notificação | Entregar os alertas ao morador pelos canais (e-mail, push) | `alerta.gerado` | nenhum evento | `notification.deliveries` |
| Monitoramento (API) | Disponibilizar os dados ao aplicativo (consultas e tempo real) e receber a meta mensal do morador | `leitura.validada`, `alerta.gerado`, `previsao.atualizada` | `meta.atualizada` | `monitoring.consumption_per_minute`, `monitoring.alerts`, cache da última leitura, da previsão e da meta |

Fonte: elaborado pelos autores (2026).

### 3.1 Ingestão

É a porta de entrada dos dados. Assina o tópico MQTT `energy/{casa}/{medidor}/reading`, valida cada mensagem (campos presentes, valores dentro de faixas físicas plausíveis, horário coerente), traduz o formato do dispositivo para o formato interno, grava a leitura bruta e publica o evento `leitura.validada`. É o **único módulo que conhece o formato enviado pelo firmware**: o ESP32 envia nomes curtos (`v`, `i`, `p`…), energia em Wh e horário em segundos, para economizar banda, e a Ingestão converte isso em um evento com nomes explícitos e unidades padronizadas (kWh, data ISO). Leituras inválidas são descartadas e registradas em log.

### 3.2 Análise

Concentra toda a decisão sobre o que merece alerta e publica `alerta.gerado` quando algo foge do normal. Sobre cada leitura (`leitura.validada`) aplica regras que implementam a interface `Rule`: potência acima do limite, o pico (`PowerAboveLimit`); tensão fora da faixa (`VoltageOutOfRange`); e consumo elevado na madrugada, o consumo anormal (`HighNightConsumption`). Sobre cada previsão (`previsao.atualizada`) compara o consumo do mês com a meta mensal do morador, que recebe pelo evento `meta.atualizada`, e avisa quando a meta está em risco ou foi excedida. Para evitar uma enxurrada de alertas iguais (o chuveiro ligado por dez minutos, por exemplo), a mesma regra fica em silêncio por um intervalo configurável depois de disparar. A Análise não sabe como o alerta chegará ao morador nem como será exibido.

### 3.3 Previsão

Estima, para cada medidor, o consumo (kWh) e o valor da conta (R$) ao fim do mês: soma o que já foi consumido no mês à média recente de potência projetada para as horas restantes e multiplica pela tarifa. Publica `previsao.atualizada` a intervalos regulares. Esse módulo foi acrescentado depois da primeira versão do diagrama e entrou **sem nenhuma alteração na Ingestão**: bastou assinar o fluxo de leituras.

### 3.4 Notificação

Recebe os alertas e os entrega ao morador por meio de canais. Cada canal implementa a interface `Channel`; o protótipo tem e-mail (SMTP) e push (simulado). Um canal fora do ar não impede os demais, e o histórico de envios impede que o mesmo alerta seja enviado duas vezes pelo mesmo canal. A Notificação não conhece as regras: recebe o alerta já decidido.

### 3.5 Monitoramento (API)

É a **única porta de entrada do aplicativo**. Oferece uma API REST para consultas (medidores, última leitura, consumo por minuto, alertas, previsão e meta) e um canal WebSocket que empurra leituras, alertas e previsões em tempo real. Também recebe a meta mensal definida pelo morador e a publica no evento `meta.atualizada`. O acesso é autenticado por um token (cabeçalho `Authorization` no REST e parâmetro na conexão WebSocket). Em vez de consultar as tabelas dos outros módulos, mantém um **modelo de leitura próprio**, montado a partir dos eventos e já agregado por minuto, na forma de que a tela precisa.

### 3.6 Componentes de infraestrutura

Além dos módulos, a solução usa os seguintes componentes:

- **Medidor IoT:** ESP32 com sensor PZEM-004T, que publica uma leitura a cada poucos segundos. No protótipo, é substituído por um simulador e por um ESP32 simulado no Wokwi.
- **Broker MQTT (EMQX):** recebe as publicações dos medidores e as entrega ao backend.
- **Barramento de eventos (Redis Streams):** transporta os eventos entre os módulos de forma persistente.
- **Banco de séries temporais (TimescaleDB, extensão do PostgreSQL):** guarda as leituras e os dados de cada módulo; as tabelas de leituras são *hypertables*, particionadas por tempo, com política de retenção.
- **Cache (Redis):** guarda a última leitura, a última previsão e a meta de cada medidor e controla o intervalo de silêncio dos alertas.
- **Aplicativo (React, PWA):** interface web e mobile do morador.

Duas regras valem para todos os módulos: (1) **cada módulo é dono dos próprios dados**, ou seja, tem um *schema* próprio no banco (`ingestion`, `analysis`, `forecast`, `notification`, `monitoring`) e nenhum módulo lê ou escreve no *schema* de outro; (2) **os módulos só compartilham os contratos dos eventos** (`src/contracts`) e as interfaces da plataforma (`src/platform/ports.ts`), como detalhado na seção 5.

---

## 5 ANÁLISE DO ACOPLAMENTO

Richards e Ford medem o acoplamento de um componente por duas grandezas: o **acoplamento aferente (Ca)**, que é o número de componentes que dependem dele, e o **acoplamento eferente (Ce)**, que é o número de componentes dos quais ele depende. A partir delas derivam três métricas:

- **Instabilidade:** I = Ce / (Ca + Ce). Vale 0 para um componente estável (muitos dependem dele, então mudá-lo é caro) e 1 para um instável (ele depende de outros e ninguém depende dele, então mudá-lo é barato).
- **Abstração:** A = elementos abstratos / total de elementos (interfaces e classes abstratas sobre o total).
- **Distância da sequência principal:** D = |A + I − 1|. Quanto mais perto de 0, mais equilibrado é o componente. Componentes estáveis e concretos caem na "zona de dor" (difíceis de mudar e muito usados); componentes abstratos e instáveis caem na "zona de inutilidade".

O objetivo da arquitetura proposta é fazer as dependências apontarem para o que é **estável e abstrato** (contratos e interfaces) e manter **instável e concreto** aquilo que muda com frequência (as regras de negócio de cada módulo), garantindo que ninguém dependa dessas partes voláteis.

### 5.1 Mapeamento das dependências

Analisamos o acoplamento em duas dimensões, como propõem Richards e Ford: o **acoplamento estático**, que é como os componentes estão ligados no código, e o **acoplamento dinâmico**, que é como se comunicam em tempo de execução.

#### 5.1.1 Acoplamento estático (código)

A regra de dependência adotada é:

- um módulo (`src/modules/*`) só pode importar os **contratos** (`src/contracts`) e as **portas** da plataforma (`src/platform/ports.ts`), nunca outro módulo nem uma implementação concreta;
- as **portas** (`EventBus`, `Cache`, `Database`) são classes abstratas; as implementações concretas (Redis, PostgreSQL) ficam em `src/platform/adapters`;
- apenas o `AppModule` conhece as implementações concretas e todos os módulos, pois ele é a **raiz de composição**, que monta o sistema.

```
modules/*          ──> contracts, platform/ports
platform/ports     ──> contracts
platform/adapters  ──> platform/ports, contracts
app.module         ──> modules/*, platform/adapters
contracts          ──> (nada)
```

As métricas do Quadro 3 foram **calculadas a partir do código-fonte** do protótipo pelo script `npm run metrics`, que lê as importações de cada arquivo.

Quadro 3 – Métricas de acoplamento dos componentes do backend

| Componente | Ca | Ce | I | A | D |
|---|---|---|---|---|---|
| contracts (contratos de eventos) | 7 | 0 | 0,00 | 0,92 | 0,08 |
| platform/ports (interfaces) | 6 | 1 | 0,14 | 1,00 | 0,14 |
| platform/adapters (Redis, PostgreSQL) | 1 | 2 | 0,67 | 0,00 | 0,33 |
| modules/ingestion | 1 | 2 | 0,67 | 0,33 | 0,00 |
| modules/analysis | 1 | 2 | 0,67 | 0,27 | 0,07 |
| modules/forecast | 1 | 2 | 0,67 | 0,27 | 0,06 |
| modules/notification | 1 | 2 | 0,67 | 0,20 | 0,13 |
| modules/monitoring | 1 | 2 | 0,67 | 0,20 | 0,13 |
| app.module (raiz de composição) | 1 | 6 | 0,86 | 0,00 | 0,14 |

Fonte: elaborado pelos autores (2026), a partir do script `backend/scripts/metrics.ts`.

A leitura do quadro mostra que:

- **Os contratos e as portas são estáveis e abstratos** (I próximo de 0, A próximo de 1). Todos os módulos dependem deles, por isso precisam mudar pouco; e, por serem só tipos e interfaces, têm pouco motivo para mudar.
- **Cada módulo tem Ca = 1**: o único componente que depende dele é a raiz de composição. Nenhum módulo depende de outro. Uma mudança interna em um módulo, portanto, não se propaga para os demais.
- **Todos os componentes ficam próximos da sequência principal** (D ≤ 0,33). O maior valor é o dos adaptadores (concretos e com I = 0,67), o que é aceitável: eles concentram os detalhes de infraestrutura, e apenas a raiz de composição depende deles.

Essa regra de dependência não depende apenas da disciplina da equipe: ela é verificada por **funções de aptidão** (*fitness functions*, no termo de Richards e Ford) no arquivo `test/architecture.test.ts`. Se alguém fizer, por exemplo, a Notificação importar a Análise, a suíte de testes falha e aponta o arquivo e a importação proibida.

#### 5.1.2 Acoplamento dinâmico (comunicação em execução)

Quadro 4 – Quem publica e quem consome cada evento

| Evento (stream) | Publicado por | Consumido por | Tipo |
|---|---|---|---|
| leitura do medidor (tópico MQTT `energy/{casa}/{medidor}/reading`) | Medidor IoT | Ingestão | assíncrono (MQTT) |
| `leitura.validada` (stream `readings`) | Ingestão | Análise, Previsão, Monitoramento | assíncrono (Redis Streams) |
| `alerta.gerado` (stream `alerts`) | Análise | Notificação, Monitoramento | assíncrono (Redis Streams) |
| `previsao.atualizada` (stream `forecasts`) | Previsão | Monitoramento, Análise | assíncrono (Redis Streams) |
| `meta.atualizada` (stream `goals`) | Monitoramento | Análise | assíncrono (Redis Streams) |
| consultas, meta e tempo real | Aplicativo | Monitoramento | síncrono (REST) e push (WebSocket) |

Fonte: elaborado pelos autores (2026).

**Não existe nenhuma chamada síncrona entre os módulos do backend.** A única comunicação síncrona é entre o aplicativo e o Monitoramento. Mesmo quando o morador altera a meta, o Monitoramento não chama a Análise: publica `meta.atualizada`, e a Análise passa a usar o novo valor quando processa o evento.

### 5.2 Como a comunicação ocorre

**a) Medidor → Ingestão: MQTT.** O MQTT é um protocolo publicar/assinar leve, feito para microcontroladores. O medidor publica no broker com QoS 1 (entrega garantida pelo menos uma vez) e, em produção, sobre TLS. O dispositivo conhece apenas o endereço do broker e o nome do tópico: não sabe que existe um backend, quantas instâncias ele tem nem onde estão. Isso desacopla o hardware, que é difícil de atualizar depois de instalado, do software, que muda com frequência. A Ingestão assina o tópico como *assinatura compartilhada* (`$share/ingestion/...`), de modo que várias instâncias dela dividem as mensagens entre si.

**b) Entre os módulos: eventos no Redis Streams.** Cada evento é anexado a um *stream*, um registro persistente e ordenado. Cada módulo consumidor forma um **grupo de consumidores**: todos os grupos recebem todos os eventos, e cada grupo guarda até onde já leu. O módulo só confirma o evento (`XACK`) depois de processá-lo; se cair antes disso, o evento fica pendente e é reprocessado quando o módulo volta. Quem publica não sabe quem consome. Todo evento segue o mesmo envelope:

```ts
interface Envelope<TType, TData> {
  id: string;
  type: TType;            // ex.: "leitura.validada"
  version: number;
  occurredAt: string;
  correlationId: string;  // o mesmo em toda a cadeia leitura → alerta → notificação
  source: string;
  data: TData;
}
```

**c) Aplicativo → Monitoramento: REST e WebSocket.** O aplicativo usa REST para consultas e para enviar a meta mensal, e WebSocket para receber atualizações em tempo real, sempre com o token de acesso. Ele conhece apenas o Monitoramento, de modo que reorganizar os módulos internos do backend não afeta o front-end.

**d) Dentro de cada módulo: injeção de dependências.** Os serviços recebem pelo construtor as **abstrações** de que precisam, e o NestJS injeta a implementação concreta definida no `PlatformModule`:

```ts
@Injectable()
export class AnalysisService {
  constructor(
    private readonly bus: EventBus,
    private readonly cache: Cache,
    private readonly alerts: AlertRepository,
    private readonly goals: GoalRepository,
    @Inject(analysisConfig.KEY) private readonly config: AnalysisConfig,
    @Inject(RULES) private readonly rules: Rule[],
  ) {}
}
```

```ts
@Global()
@Module({
  providers: [
    RedisConnection,
    { provide: EventBus, useClass: RedisEventBus },
    { provide: Cache, useClass: RedisCache },
    { provide: Database, useClass: PostgresDatabase },
  ],
  exports: [EventBus, Cache, Database],
})
export class PlatformModule {}
```

O `AnalysisService` não sabe que existe Redis. Nos testes, os mesmos módulos rodam com um barramento e um cache em memória, sem nenhuma alteração no código deles (`test/full-flow.test.ts`).

### 5.3 Estratégias adotadas para reduzir o acoplamento

**1. Comunicação assíncrona por eventos, em vez de chamadas diretas.** A Ingestão não espera a Análise, a Previsão nem o Monitoramento: grava a leitura, publica o evento e segue. Se a Notificação ficar fora do ar (por exemplo, com o servidor de e-mail indisponível), as leituras continuam sendo registradas, e os alertas pendentes são entregues quando ela voltar. Cada módulo também pode ser escalado separadamente, acrescentando instâncias ao seu grupo de consumidores.
*Custos aceitos:* (i) **consistência eventual**, já que o alerta pode aparecer na tela alguns milissegundos depois da leitura; (ii) **rastreabilidade** mais difícil, mitigada pelo `correlationId`, que segue toda a cadeia de eventos; (iii) **entrega "pelo menos uma vez"**, ou seja, um mesmo evento pode chegar duas vezes, por isso todos os consumidores são **idempotentes** (a leitura tem chave única medidor + instante; o modelo de leitura do Monitoramento usa operações que não mudam o resultado se repetidas; a Notificação consulta o histórico antes de enviar).

**2. Contrato de evento explícito e versionado como único ponto de acoplamento.** O componente `contracts` é a única coisa que publicador e consumidores compartilham. Os tipos TypeScript dos eventos são verificados pelo compilador em ambos os lados, e cada evento tem um campo `version`. Acrescentar um campo opcional é compatível; remover, renomear ou mudar a unidade de um campo exige uma nova versão, publicada em paralelo até todos os consumidores migrarem. A forma desse acoplamento (nomes, tipos e convenções de unidade) é analisada em detalhe na seção 6, Análise da Conascência.

**3. Camada anticorrupção na Ingestão.** O formato do firmware é traduzido uma única vez, na entrada (`translator.ts`). O restante do sistema nunca vê `{v, i, p, e, f, pf, ts}`, e sim `ReadingValidated`, com nomes explícitos e unidades padronizadas. *Custo:* uma etapa a mais de tradução, desprezível frente ao benefício.

**4. Cada módulo é dono dos próprios dados.** Um banco compartilhado entre módulos é um acoplamento escondido: mudar uma coluna quebra outro módulo sem que o compilador perceba. Por isso cada módulo tem seu *schema*, e o Monitoramento monta um modelo de leitura próprio a partir dos eventos, em vez de consultar as tabelas da Ingestão e da Análise. Pelo mesmo motivo, a meta mensal é guardada duas vezes: o Monitoramento guarda a que mostra na tela, e a Análise guarda a cópia que usa nas regras, recebida pelo evento. *Custo:* duplicação de dados, aceitável porque o volume duplicado é pequeno (o agregado por minuto é bem menor que o dado bruto, e a meta é um único número por medidor).

**5. Inversão de dependência com portas e adaptadores.** Os módulos dependem de abstrações (`EventBus`, `Cache`, `Database`); as implementações ficam isoladas em `platform/adapters` e são escolhidas em um único lugar. O diagrama da arquitetura cita "Redis Streams ou NATS" para o barramento: trocar um pelo outro significa escrever um novo adaptador e mudar uma linha no `PlatformModule`, sem tocar em nenhum módulo.

**6. Pontos de extensão injetáveis.** As regras de alerta (`RULES`) e os canais de notificação (`CHANNELS`) são listas injetadas pelo NestJS. Uma regra ou um canal novo é uma classe nova registrada no próprio módulo; o serviço que as executa não muda.

**7. Ponto único de entrada para o aplicativo.** O front-end fala apenas com o Monitoramento, e por isso a organização interna do backend fica invisível para ele.

### 5.4 Acoplamentos que permanecem e por que foram aceitos

- **Todos os módulos dependem de `contracts`.** É inevitável que publicador e consumidor concordem sobre o formato do evento. Centralizar esse acordo em um único componente, estável e abstrato, o torna explícito e verificável pelo compilador, em vez de espalhado em strings pelo código.
- **Dependência da infraestrutura compartilhada (Redis e banco).** Se o Redis cair, a comunicação entre os módulos para. Em produção, isso se mitiga com persistência (AOF, já habilitada no protótipo) e réplica. Além disso, como os módulos compartilham o mesmo servidor de banco e o mesmo Redis, eles ainda formam, pela definição de Richards e Ford, um único **quantum arquitetural**. A separação em *schemas* e a comunicação exclusiva por eventos foram escolhidas justamente para permitir separar esses quanta no futuro, sem reescrever os módulos.
- **A raiz de composição conhece todos os módulos.** Isso é proposital: é o único ponto em que o sistema é montado. A variável `MODULES` permite escolher quais módulos cada processo executa (por exemplo, `MODULES=ingestion` em um contêiner e `MODULES=analysis,notification` em outro), sem alterar o código.

### 5.5 Impacto de mudanças futuras

Quadro 5 – O que muda em cada cenário de evolução

| Mudança | O que é alterado | O que não é afetado |
|---|---|---|
| Trocar o sensor PZEM-004T ou o formato do firmware | `translator.ts` da Ingestão | todos os demais módulos |
| Nova regra de alerta (ex.: aparelho esquecido ligado) | uma nova classe `Rule` na Análise | todos os demais módulos |
| Novo canal de notificação (WhatsApp, Telegram) | uma nova classe `Channel` na Notificação | todos os demais módulos |
| Novo cálculo de tarifa (bandeiras tarifárias) | `projection.ts` da Previsão | todos os demais módulos |
| Trocar Redis Streams por NATS ou Kafka | um novo adaptador e uma linha no `PlatformModule` | nenhum módulo |
| Novo módulo (ex.: comparação com residências vizinhas) | um novo consumidor de `leitura.validada` | nenhum módulo existente |
| Escalar só a Ingestão | configuração (`MODULES=ingestion` em mais contêineres) | nenhum código |

Fonte: elaborado pelos autores (2026).

Em todos os cenários, a mudança fica contida em um único módulo ou em um único adaptador. Esse é o efeito prático do baixo acoplamento: o custo de evoluir o sistema não cresce à medida que novas funcionalidades são acrescentadas.
