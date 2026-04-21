import React, { useEffect, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { FlowCanvas, FlowCanvasHandle } from './components/flow/FlowCanvas';
import { CustomNodeData } from './components/flow/CustomNode';
import { BuilderPanel } from './components/BuilderPanel';
import { parseMarkdown, generateMarkdown, Scenario, VIEW_MODES, ViewMode } from './lib/markdownParser';
import { Play, Upload, FileText, LayoutGrid, RotateCcw, FolderOpen, Network, ChevronDown, ChevronUp, Sparkles, Copy, Check, BookMarked, ImageDown } from 'lucide-react';
import { DiagramsPanel } from './components/DiagramsPanel';

const initialMarkdown = `# Nodes
- [mobile] Mobile App (green, Smartphone)
- [branch] Web Tier 3 (Branch) (blue, Store)
- [hq] Web Tier 1 (HQ) (purple, BarChart)
- [api] Central API (Node.js) (blue, Code)
- [orm] Prisma ORM (orange, Database)
- [db] PostgreSQL (red, Database)

# Edges
- mobile -> api : POST /booking
- branch -> api : POST /booking
- hq -> api : GET /reports
- api -> orm : Prisma Client
- orm -> db : TCP/IP (5432)

# Scenarios
- Mobile booking flow: mobile -> api -> orm -> db
- Branch walk-in flow: branch -> api -> orm -> db
- HQ reporting flow: hq -> api -> orm -> db
`;

const defaultViewMode: ViewMode = 'system-architecture';
const initialParsed = parseMarkdown(initialMarkdown, defaultViewMode);

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flowRef = useRef<FlowCanvasHandle>(null);

  const [nodes, setNodes] = useState<Node<CustomNodeData>[]>(initialParsed.nodes);
  const [edges, setEdges] = useState<Edge[]>(initialParsed.edges);
  const [scenarios, setScenarios] = useState<Scenario[]>(initialParsed.scenarios);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(1.5);
  const [markdownInput, setMarkdownInput] = useState(initialMarkdown);
  const [rightPanel, setRightPanel] = useState<'none' | 'markdown' | 'builder'>('none');
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [documentName, setDocumentName] = useState('sample-architecture.md');
  const [showModeDetails, setShowModeDetails] = useState(false);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showTopPanel, setShowTopPanel] = useState(true);
  const [showFlowsPanel, setShowFlowsPanel] = useState(true);
  const [showDiagramsPanel, setShowDiagramsPanel] = useState(false);

  // Keep all overlays mutually exclusive
  const openPrompt = () => { setShowPromptPanel(true); setRightPanel('none'); };
  const openRightPanel = (panel: 'markdown' | 'builder') => { setRightPanel(panel); setShowPromptPanel(false); };
  const handleExportImage = () => {
    const name = documentName.replace(/\.md$/i, '') || 'diagram';
    flowRef.current?.exportPng(`${name}.png`);
  };
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
  const [activeDiagramName, setActiveDiagramName] = useState('');

  const applyParsedContent = (content: string, mode: ViewMode = viewMode) => {
    const parsed = parseMarkdown(content, mode);
    setNodes(parsed.nodes);
    setEdges(parsed.edges);
    setScenarios(parsed.scenarios);
    setActiveScenario(null);
  };

  useEffect(() => {
    applyParsedContent(markdownInput, viewMode);
  }, [viewMode]);

  const handleApplyMarkdown = () => {
    applyParsedContent(markdownInput, viewMode);
    setRightPanel('none');
  };

  const handleReset = () => {
    setMarkdownInput(initialMarkdown);
    setDocumentName('sample-architecture.md');
    setViewMode(defaultViewMode);
    applyParsedContent(initialMarkdown, defaultViewMode);
    setRightPanel('none');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        setDocumentName(file.name);
        setMarkdownInput(content);
        applyParsedContent(content, viewMode);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleAddNode = (id: string, label: string, colorName: string, icon: string) => {
    const colorMap: Record<string, string> = {
      green: '#16a34a',
      blue: '#2563eb',
      purple: '#9333ea',
      orange: '#f59e0b',
      red: '#dc2626',
      gray: '#4b5563',
    };
    const color = colorMap[colorName.toLowerCase()] || '#000000';

    const newNode: Node<CustomNodeData> = {
      id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { label, color, colorName, icon },
    };
    const newNodes = [...nodes, newNode];

    const md = generateMarkdown(newNodes, edges, scenarios);
    setMarkdownInput(md);
    applyParsedContent(md, viewMode);
  };

  const handleAddEdge = (source: string, target: string, label: string) => {
    const newEdge: Edge = {
      id: `e-${source}-${target}-${Date.now()}`,
      source,
      target,
      type: 'animated',
      data: { isAnimating: false, label },
    };
    const newEdges = [...edges, newEdge];

    const md = generateMarkdown(nodes, newEdges, scenarios);
    setMarkdownInput(md);
    applyParsedContent(md, viewMode);
  };

  const handleAddScenario = (name: string, path: string[]) => {
    const newScenario: Scenario = {
      id: `s-${Date.now()}`,
      name,
      path,
    };
    const newScenarios = [...scenarios, newScenario];

    const md = generateMarkdown(nodes, edges, newScenarios);
    setMarkdownInput(md);
    applyParsedContent(md, viewMode);
  };

  const currentMode = VIEW_MODES.find((mode) => mode.id === viewMode) ?? VIEW_MODES[0];

  const generatedPrompt = `You are a software architecture documentation assistant.

Analyze the source code provided and generate a single Markdown (.md) file describing the system architecture. The file will be loaded into "Data Flow Cracker" — a visualization app that renders the SAME file across 5 view modes simultaneously. Write node labels so every mode renders correctly.

════════════════════════════════════════
FILE FORMAT
════════════════════════════════════════

# Nodes
- [id] Label (color, icon)

# Edges
- sourceId -> targetId : Label

# Scenarios
- Scenario name: nodeId1 -> nodeId2 -> nodeId3

════════════════════════════════════════
FIELD RULES
════════════════════════════════════════

Node IDs  : lowercase + hyphens only, no spaces  (e.g. order-service)
Colors    : green | blue | purple | orange | red | gray
Icons     : Smartphone, Globe, Code, Server, Database, MessageSquare, User,
            Cloud, Lock, Settings, BarChart, Wifi, Cpu, Activity, Store, Layers
Edge label: use hybrid format → "HTTP POST /orders | validate(dto)"
            works for both Mode 3 (protocol) and Mode 5 (function call)
Scenarios : comma-separated nodeId chains used as animated demo flows

Color guide (recommended)
  green  = client / entry point      blue   = service / network
  purple = auth / AI                 orange = logic / processing
  red    = data / payment            gray   = infrastructure / ORM

════════════════════════════════════════
VIEW MODE KEYWORD RULES
════════════════════════════════════════

The app has 5 modes. Each re-interprets the same nodes differently.
Write labels so ALL keyword rules below are satisfied at once.

──────────────────────────────────────
MODE 1 — System Architecture
Layout: 4 top sections (Hardware | Network | Software | AI/ML) in a 2×2 grid
        + full-width Cloud section with nested Data section inside it
──────────────────────────────────────
Priority order (first match wins):

  Hardware → sensor, iot, actuator, controller, camera, gps, lidar, radar,
             ecu, obd, motor, battery, charger, hardware, device, embedded,
             microcontroller, arduino, raspberry, gpio
  Network  → mqtt, gateway, router, broker, bus, socket, vpn, firewall,
             load balancer, queue, message, network, wifi, zigbee, lora,
             can bus, protocol, proxy
  AI/ML    → openai, gpt, llm, ai, machine learning, ml, tensorflow, pytorch,
             neural, inference, prediction, embedding, mistral, claude, gemini
  Cloud    → cloud, aws, azure, gcp, lambda, ec2, cloudfront, heroku, vercel,
             netlify, iot hub, iot core, sagemaker
  Data     → database, postgres, mysql, mongo, redis, influx, cassandra,
             warehouse, timeseries, analytics, grafana, dashboard, filesystem
             ⟶ rendered NESTED inside the Cloud section
  Software → everything else (api, service, backend, app, auth, etc.)

──────────────────────────────────────
MODE 2 — Software Architecture with Tech Stack
Layout: 4 top sections (Frontend | Backend | CI/CD | AI/ML) in a 2×2 grid
        + full-width Cloud section with nested Database section inside it
──────────────────────────────────────
Priority order (first match wins):

  AI/ML    → openai, gpt, llm, ai, machine learning, ml, tensorflow, pytorch,
             neural, inference, prediction, embedding, mistral, claude, gemini
  Cloud    → cloud, aws, azure, gcp, lambda, ec2, cloudfront, heroku, vercel,
             netlify, sagemaker, ecs, eks, fargate, cloudwatch
  Database → database, postgres, mysql, mongo, redis, prisma, orm, cassandra,
             cockroach, warehouse, storage
             ⟶ rendered NESTED inside the Cloud section
  CI/CD    → ci/cd, devops, jenkins, spinnaker, pagerduty, gradle,
             github actions, gitlab, deployment, release, pipeline
  Frontend → frontend, mobile, web, react, swift, kotlin, ios, android,
             browser, ui, client, portal
  Backend  → everything else (api, service, server, gateway, auth, etc.)

──────────────────────────────────────
MODE 3 — Overview Function with Protocol
Displays the big-picture data flow; edge labels become protocol badges.
──────────────────────────────────────
Edge labels should be recognizable protocol / integration names:
  HTTP POST /orders  |  MQTT publish  |  gRPC  |  WebSocket  |  SQL SELECT
  JWT validate  |  Kafka topic  |  S3 PUT  |  GraphQL query  |  TCP/IP  |  CoAP

──────────────────────────────────────
MODE 4 — Data & Schema to Database
Each node renders as a typed schema table. Template chosen by first match:
──────────────────────────────────────
  user / member / account / customer / profile / staff
      → id PK · email · name · role · created_at
  order / booking / reservation / purchase
      → id PK · user_id FK · items · total · status · created_at
  product / item / inventory / stock / catalogue
      → id PK · name · price · qty · category_id FK
  payment / invoice / billing / charge / receipt
      → id PK · order_id FK · amount · method · paid_at
  session / token / auth / credential / jwt / login
      → token PK · user_id FK · expires_at · ip_address
  notification / alert / message / email / sms / push
      → id PK · user_id FK · type · content · read
  log / event / audit / activity / history / track
      → id PK · type · payload · user_id FK · timestamp
  report / analytics / metric / stat / dashboard
      → id PK · name · value · period · recorded_at
  orm / prisma / sequelize / typeorm / mongoose
      → model · query · relations · result: Promise<T>
  api / service / server / backend / gateway / handler
      → method (HTTP verb) · path · body (JSON) · auth (Bearer)
  mobile / frontend / web / portal / browser / client / app
      → user_id · payload (object) · device_id · timestamp (ISO 8601)

Edge labels for Mode 4 → DB operation syntax:
  INSERT user{id,email,role}  |  SELECT orders WHERE user_id
  UPDATE inventory SET qty    |  DELETE session WHERE expires < now

──────────────────────────────────────
MODE 5 — Software Design / Logic (Flowchart)
Each node renders as a flowchart shape inferred from the label:
──────────────────────────────────────
  START (pill)    → user, customer, mobile, client, browser, frontend, portal, app
                    — NOT if label also contains: service, handler, api, gateway, backend
  END   (pill)    → response, result, receipt, success, complete, output, done, display
  DECISION (◇)   → validate, check, guard, verify, authorize, isvalid
  IO (parallelogram) → database, storage, orm, prisma, repository, repo,
                       postgres, mysql, mongo, redis, influx, cassandra
  PROCESS (rect)  → everything else

Edge labels for Mode 5 → function call notation:
  validate(dto)  |  INSERT(dto)  |  authenticate(creds)  |  HTTP POST(body)
  ✓ valid  |  → Entity[]  |  notify(event)  |  map(raw)

════════════════════════════════════════
COMPLETE EXAMPLE
════════════════════════════════════════

\`\`\`
# Nodes
- [mobile-client]       Mobile Client App (green, Smartphone)
- [api-gateway]         API Gateway Service (blue, Server)
- [auth-service]        Auth Validate Service (purple, Lock)
- [order-service]       Order Handler Service (orange, Store)
- [inventory-check]     Inventory Check Guard (orange, BarChart)
- [payment-service]     Payment Billing Invoice Service (red, Activity)
- [prisma-orm]          Prisma ORM Repository (gray, Database)
- [postgres-db]         PostgreSQL Database (red, Database)
- [mqtt-broker]         MQTT Message Broker (blue, Wifi)
- [iot-sensor]          IoT Temperature Sensor (orange, Cpu)
- [notification-service] Notification Alert Service (blue, MessageSquare)
- [openai-service]      OpenAI GPT Inference Service (purple, Layers)
- [aws-lambda]          AWS Lambda Cloud Function (blue, Cloud)
- [response-result]     Response Result Success (green, Activity)

# Edges
- mobile-client       -> api-gateway         : HTTP POST /orders | call(request)
- api-gateway         -> auth-service        : JWT validate | authenticate(token)
- auth-service        -> order-service       : ✓ valid | authorize(userId)
- order-service       -> inventory-check     : HTTP GET /stock | validate(qty)
- inventory-check     -> payment-service     : ✓ available | charge(orderDto)
- payment-service     -> prisma-orm          : INSERT payment{id,order_id,amount} | save(payment)
- prisma-orm          -> postgres-db         : SQL INSERT | execute(query)
- postgres-db         -> prisma-orm          : → Entity | return(row)
- prisma-orm          -> order-service       : → Order | resolve(entity)
- order-service       -> notification-service: notify(event) | MQTT publish
- notification-service-> mqtt-broker         : MQTT publish | emit(event)
- mqtt-broker         -> iot-sensor          : CoAP SET | trigger(cmd)
- order-service       -> openai-service      : HTTP POST /v1/chat | predict(context)
- order-service       -> aws-lambda          : S3 PUT receipt | invoke(payload)
- order-service       -> response-result     : HTTP 200 OK | return(response)

# Scenarios
- Happy order flow: mobile-client -> api-gateway -> auth-service -> order-service -> payment-service -> prisma-orm -> postgres-db -> response-result
- AI recommendation: order-service -> openai-service -> response-result
- IoT trigger flow: iot-sensor -> mqtt-broker -> order-service -> response-result
- Auth failure path: mobile-client -> api-gateway -> auth-service
\`\`\`

════════════════════════════════════════
YOUR TASK
════════════════════════════════════════

Analyze the source code below and generate a complete .md file using the format above.

Requirements:
1. 12–20 nodes covering all layers — at least 1 node per section for Mode 1 & 2
   (Hardware/IoT · Network/broker · AI/ML · Cloud · Database · core services)
2. Labels must satisfy keyword rules for all 5 modes simultaneously
3. Edge labels use hybrid format: "HTTP VERB /path | functionCall(param)"
4. 3–5 scenarios: main success flow, AI/ML path, IoT/notification path, error path
5. Colors follow the guide: green=entry, blue=service/network, purple=auth/AI,
   orange=logic, red=data/payment, gray=infrastructure

[PASTE YOUR SOURCE CODE HERE]`;



  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Data Flow Cracker</h1>
          <p className="text-sm text-gray-500">Upload a Markdown file and switch between architecture, protocol, and database views.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            title="Reset to Default"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors font-medium text-sm">
            <Upload size={16} />
            Upload .md
            <input ref={fileInputRef} type="file" accept=".md" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => { rightPanel === 'builder' ? setRightPanel('none') : openRightPanel('builder'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${rightPanel === 'builder' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <LayoutGrid size={16} />
            Visual Builder
          </button>
          <button
            onClick={() => { rightPanel === 'markdown' ? setRightPanel('none') : openRightPanel('markdown'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${rightPanel === 'markdown' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <FileText size={16} />
            Edit Markdown
          </button>
          <button
            onClick={handleExportImage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <ImageDown size={16} />
            Export Image
          </button>
          <button
            onClick={() => setShowDiagramsPanel((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${showDiagramsPanel ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
          >
            <BookMarked size={16} />
            My Diagrams
          </button>
          <button
            onClick={() => { showPromptPanel ? setShowPromptPanel(false) : openPrompt(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${showPromptPanel ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}
          >
            <Sparkles size={16} />
            Generate Prompt
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col p-4 gap-4 relative min-h-0">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <FolderOpen size={14} />
                  <span className="truncate">{documentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Network size={16} className="text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-800">{currentMode.label}</h2>
                </div>
                {showTopPanel && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{currentMode.description}</p>}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {showTopPanel && (
                  <>
                    <button
                      onClick={() => setShowModeDetails((value) => !value)}
                      className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                      {showModeDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showModeDetails ? 'Hide modes' : 'Show modes'}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      Upload another Markdown file
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowTopPanel((v) => !v)}
                  title={showTopPanel ? 'Collapse panel' : 'Expand panel'}
                  className="px-2 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 flex items-center gap-1"
                >
                  {showTopPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {showTopPanel ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {showTopPanel && (
              <>
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {VIEW_MODES.map((mode, index) => (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id)}
                      className={`shrink-0 text-left rounded-lg border px-3 py-2 transition-all min-w-[180px] ${
                        viewMode === mode.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Mode {index + 1}</div>
                      <div className="text-sm font-semibold leading-snug mt-1">{mode.label}</div>
                    </button>
                  ))}
                </div>

                {showModeDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 mt-3">
                    {VIEW_MODES.map((mode) => (
                      <div key={`${mode.id}-detail`} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800 mb-1">{mode.label}</div>
                        <div>{mode.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {showPromptPanel && (
            <div className="absolute top-4 right-4 w-[36rem] bg-white rounded-xl shadow-2xl border border-violet-200 z-30 flex flex-col overflow-hidden max-w-[calc(100vw-2rem)]">
              <div className="bg-violet-50 px-4 py-3 border-b border-violet-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-600" />
                  <h3 className="font-semibold text-violet-800">Generate Markdown Prompt</h3>
                </div>
                <button onClick={() => setShowPromptPanel(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Copy this prompt and paste it into <span className="font-semibold">ChatGPT, Claude, Gemini</span> or any AI tool. Describe your system at the end, then paste the generated <code className="bg-gray-100 px-1 rounded text-xs">.md</code> file back here via <span className="font-semibold">Upload .md</span>.
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    className="w-full h-80 p-3 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none resize-none leading-relaxed"
                    value={generatedPrompt}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCopyPrompt}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${promptCopied ? 'bg-green-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                  >
                    {promptCopied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Prompt</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {rightPanel === 'markdown' && (
            <div className="absolute top-32 right-4 w-[28rem] bg-white rounded-xl shadow-xl border border-gray-200 z-20 flex flex-col overflow-hidden max-w-[calc(100vw-2rem)]">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Markdown Editor</h3>
                <button onClick={() => setRightPanel('none')} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <textarea
                className="w-full h-96 p-4 text-sm font-mono text-gray-700 focus:outline-none resize-none"
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
                spellCheck={false}
              />
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleApplyMarkdown}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          )}

          {rightPanel === 'builder' && (
            <BuilderPanel
              nodes={nodes}
              onAddNode={handleAddNode}
              onAddEdge={handleAddEdge}
              onAddScenario={handleAddScenario}
              onClose={() => setRightPanel('none')}
            />
          )}

          <div className="flex-1 min-h-0">
            <FlowCanvas
              ref={flowRef}
              initialNodes={nodes}
              initialEdges={edges}
              activeScenario={activeScenario}
              animationSpeed={animationSpeed}
              onNodesChange={(ns) => setNodes(ns as Node<CustomNodeData>[])}
              onEdgesChange={setEdges}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-0">
              <div>
                <h3 className="font-semibold text-gray-700">Interactive Flows</h3>
                {showFlowsPanel && <p className="text-sm text-gray-500">Preview the inferred paths for the selected view.</p>}
              </div>
              <button
                onClick={() => setShowFlowsPanel((v) => !v)}
                title={showFlowsPanel ? 'Collapse flows' : 'Expand flows'}
                className="px-2 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 flex items-center gap-1"
              >
                {showFlowsPanel ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                {showFlowsPanel ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showFlowsPanel && (
              <div className="flex flex-col gap-4 mt-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-500">Animation Speed</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-32"
                    style={{ direction: 'rtl' }}
                  />
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{animationSpeed}s</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => setActiveScenario(activeScenario?.id === scenario.id ? null : scenario)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeScenario?.id === scenario.id
                          ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {activeScenario?.id === scenario.id ? <Play size={16} className="fill-current" /> : <Play size={16} />}
                      <span className="truncate">{scenario.name}</span>
                    </button>
                  ))}
                  {scenarios.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-4 text-sm">
                      No flows were inferred yet. Try another mode or edit the Markdown content.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showDiagramsPanel && (
        <DiagramsPanel
          currentName={activeDiagramName || documentName.replace(/\.md$/, '')}
          currentContent={markdownInput}
          currentViewMode={viewMode}
          activeDiagramId={activeDiagramId}
          onLoad={(id, name, content, mode) => {
            setActiveDiagramId(id);
            setActiveDiagramName(name);
            setDocumentName(name + '.md');
            setMarkdownInput(content);
            setViewMode(mode);
            applyParsedContent(content, mode);
            setShowDiagramsPanel(false);
          }}
          onSaved={(id, name) => {
            setActiveDiagramId(id || null);
            setActiveDiagramName(name);
          }}
          onClose={() => setShowDiagramsPanel(false)}
        />
      )}
    </div>
  );
}

