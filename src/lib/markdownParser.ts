import { Node, Edge } from '@xyflow/react';
import { CustomNodeData } from '../components/flow/CustomNode';
import dagre from 'dagre';

export type ViewMode =
  | 'software-architecture-tech-stack'
  | 'overview-function-protocol'
  | 'system-architecture'
  | 'data-schema-to-database'
  | 'software-design-logic';

export const VIEW_MODES: Array<{ id: ViewMode; label: string; description: string }> = [
  {
    id: 'system-architecture',
    label: 'System Architecture',
    description: 'ภาพรวมระบบทั้งหมด: Hardware, Network, Software และ Data — ออกแบบการทำงานร่วมกันระหว่าง Hardware และ Software (IoT, เซนเซอร์, อุปกรณ์)',
  },
  {
    id: 'software-architecture-tech-stack',
    label: 'Software Architecture with Tech Stack',
    description: 'Shows the major software layers and highlights likely technologies used in each component.',
  },
  {
    id: 'overview-function-protocol',
    label: 'Overview Function with Protocol',
    description: 'Summarizes the main business flow and emphasizes request or integration protocols.',
  },
  {
    id: 'data-schema-to-database',
    label: 'Data & Schema to Database',
    description: 'แสดงว่าแต่ละ component ส่งข้อมูลชุดไหน (Data Type / Schema) ไปหา Database — เช่น INSERT user{id, email}, SELECT orders WHERE userId, UPDATE inventory{qty}',
  },
  {
    id: 'software-design-logic',
    label: 'Software Design / Logic',
    description: 'ระดับล่างสุดของโปรแกรมเมอร์: Algorithm, Flow Control (If-Else, Loops), Unit Testing และการส่งผ่านข้อมูล (Parameters) ระหว่างฟังก์ชัน',
  },
];

export type Scenario = {
  id: string;
  name: string;
  path: string[];
};

export type ParsedData = {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  scenarios: Scenario[];
};

const COLOR_MAP: Record<string, string> = {
  green: '#16a34a',
  blue: '#2563eb',
  purple: '#9333ea',
  orange: '#f59e0b',
  red: '#dc2626',
  gray: '#4b5563',
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'onto', 'that', 'this', 'then', 'than', 'when', 'where', 'over',
  'into', 'via', 'using', 'through', 'process', 'flow', 'detailed', 'detail', 'overview', 'protocol', 'database',
  'function', 'functions', 'system', 'software', 'architecture', 'user', 'action', 'actions', 'step', 'steps',
]);

export function parseMarkdown(md: string, viewMode: ViewMode = 'software-architecture-tech-stack'): ParsedData {
  const baseParsed = hasStructuredSections(md) ? parseStructuredMarkdown(md) : parseFreeformMarkdown(md);
  return transformParsedDataForView(baseParsed, viewMode);
}

function hasStructuredSections(md: string) {
  const lower = md.toLowerCase();
  return lower.includes('# nodes') || lower.includes('# edges') || lower.includes('# scenarios');
}

function parseStructuredMarkdown(md: string): ParsedData {
  const lines = md.split('\n').map((line) => line.trim()).filter(Boolean);

  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];
  const scenarios: Scenario[] = [];
  let currentSection = '';

  lines.forEach((line) => {
    if (line.startsWith('#')) {
      currentSection = line.replace(/#/g, '').trim().toLowerCase();
      return;
    }

    let content = line.trim();
    if (content.startsWith('-') || content.startsWith('*')) {
      content = content.substring(1).trim();
    }

    if (!content) {
      return;
    }

    if (currentSection === 'nodes') {
      const match = content.match(/\[(.*?)\]\s*([^\(]+?)(?:\s*\((.*?)\))?$/);
      if (match) {
        const id = match[1].trim();
        const label = match[2].trim();
        const props = match[3] ? match[3].split(',').map((item) => item.trim()) : [];
        const colorName = props[0] || 'gray';
        const icon = props[1] || inferNodeData(label).icon;

        nodes.push({
          id,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: inferNodeData(label, {
            color: COLOR_MAP[colorName.toLowerCase()] || '#4b5563',
            colorName,
            icon,
            subLabel: extractTechKeywords(`${label} ${content}`),
          }),
        });
      }
    } else if (currentSection === 'edges') {
      const mainParts = content.split(':');
      const edgeParts = mainParts[0].split('->').map((part) => part.trim()).filter(Boolean);
      const label = mainParts.length > 1 ? mainParts.slice(1).join(':').trim() : undefined;

      if (edgeParts.length >= 2) {
        for (let i = 0; i < edgeParts.length - 1; i += 1) {
          edges.push({
            id: `e-${edgeParts[i]}-${edgeParts[i + 1]}-${edges.length}`,
            source: edgeParts[i],
            target: edgeParts[i + 1],
            type: 'animated',
            data: { isAnimating: false, label: i === 0 ? label : undefined },
          });
        }
      }
    } else if (currentSection === 'scenarios') {
      const parts = content.split(':').map((part) => part.trim());
      const name = parts.length >= 2 ? parts[0] : `Scenario ${scenarios.length + 1}`;
      const pathString = parts.length >= 2 ? parts.slice(1).join(':') : content;
      const path = pathString.split('->').map((part) => part.trim()).filter(Boolean);

      if (path.length > 0) {
        scenarios.push({
          id: `s-${scenarios.length + 1}`,
          name,
          path,
        });
      }
    }
  });

  return finalizeParsedData(nodes, edges, scenarios);
}

function parseFreeformMarkdown(md: string): ParsedData {
  const lines = md.split('\n').map((line) => line.trim()).filter(Boolean);
  const nodeMap = new Map<string, Node<CustomNodeData>>();
  const edgeMap = new Map<string, Edge>();
  const scenarios: Scenario[] = [];

  const addNode = (entityName: string) => {
    const normalized = normalizeEntityName(entityName);
    const id = slugify(normalized);
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: inferNodeData(normalized),
      });
    }
    return id;
  };

  const addEdge = (source: string, target: string, label?: string) => {
    if (!source || !target || source === target) {
      return;
    }
    const key = `${source}->${target}->${label || ''}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        id: `e-${source}-${target}-${edgeMap.size}`,
        source,
        target,
        type: 'animated',
        data: { isAnimating: false, label },
      });
    }
  };

  lines.forEach((rawLine, index) => {
    const content = rawLine
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .trim();

    if (!content) {
      return;
    }

    const entities = extractEntitiesFromLine(content);
    const uniqueEntities = Array.from(new Set(entities)).slice(0, 6);
    const ids = uniqueEntities.map(addNode);
    const protocol = extractProtocol(content);

    if (ids.length >= 2) {
      for (let i = 0; i < ids.length - 1; i += 1) {
        addEdge(ids[i], ids[i + 1], protocol);
      }
    }

    const isScenarioLine = /^[-*]/.test(rawLine) || /^\d+[.)]/.test(rawLine) || /flow|scenario|process|request|action/i.test(content);
    if (isScenarioLine && ids.length > 1) {
      scenarios.push({
        id: `s-freeform-${index + 1}`,
        name: buildScenarioName(content, scenarios.length + 1),
        path: ids,
      });
    }
  });

  let nodes = Array.from(nodeMap.values());
  let edges = Array.from(edgeMap.values());

  if (nodes.length === 0) {
    const title = extractDocumentTitle(md) || 'System Overview';
    nodes = [{
      id: slugify(title),
      type: 'custom',
      position: { x: 0, y: 0 },
      data: inferNodeData(title),
    }];
  }

  if (edges.length === 0 && nodes.length > 1) {
    edges = nodes.slice(0, -1).map((node, index) => ({
      id: `e-seq-${node.id}-${nodes[index + 1].id}`,
      source: node.id,
      target: nodes[index + 1].id,
      type: 'animated',
      data: { isAnimating: false, label: 'Flow' },
    }));
  }

  if (scenarios.length === 0 && edges.length > 0) {
    edges.slice(0, 5).forEach((edge, index) => {
      scenarios.push({
        id: `s-auto-${index + 1}`,
        name: edge.data?.label ? `Flow: ${String(edge.data.label)}` : `Flow ${index + 1}`,
        path: [edge.source, edge.target],
      });
    });
  }

  return finalizeParsedData(nodes, edges, scenarios);
}

function finalizeParsedData(nodes: Node<CustomNodeData>[], edges: Edge[], scenarios: Scenario[]): ParsedData {
  const normalizedNodes = nodes.map((node) => ({
    ...node,
    data: { ...node.data },
  }));

  const normalizedEdges = dedupeEdges(edges).map((edge, index) => ({
    ...edge,
    id: edge.id || `e-${edge.source}-${edge.target}-${index}`,
    type: 'animated',
    data: {
      isAnimating: false,
      ...(edge.data || {}),
    },
  }));

  scenarios.forEach((scenario) => {
    for (let i = 0; i < scenario.path.length - 1; i += 1) {
      const source = scenario.path[i];
      const target = scenario.path[i + 1];
      const exists = normalizedEdges.some((edge) => edge.source === source && edge.target === target);
      if (!exists) {
        normalizedEdges.push({
          id: `e-auto-${source}-${target}-${normalizedEdges.length}`,
          source,
          target,
          type: 'animated',
          data: { isAnimating: false },
        });
      }
    }
  });

  const nodeIds = new Set(normalizedNodes.map((node) => node.id));
  normalizedEdges.forEach((edge) => {
    if (!nodeIds.has(edge.source)) {
      normalizedNodes.push({
        id: edge.source,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: inferNodeData(edge.source),
      });
      nodeIds.add(edge.source);
    }

    if (!nodeIds.has(edge.target)) {
      normalizedNodes.push({
        id: edge.target,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: inferNodeData(edge.target),
      });
      nodeIds.add(edge.target);
    }
  });

  applyAutoLayout(normalizedNodes, normalizedEdges);
  return { nodes: normalizedNodes, edges: normalizedEdges, scenarios };
}

function transformParsedDataForView(baseParsed: ParsedData, viewMode: ViewMode): ParsedData {
  let nodes = baseParsed.nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      subLabel: node.data.subLabel || inferRoleSummary(node.data.label),
    },
  }));

  let edges = dedupeEdges(baseParsed.edges).map((edge, index) => ({
    ...edge,
    id: edge.id || `e-${index}`,
    data: {
      isAnimating: false,
      ...(edge.data || {}),
    },
  }));

  let scenarios = baseParsed.scenarios.map((scenario) => ({
    ...scenario,
    path: [...scenario.path],
  }));

  let layoutDirection: 'LR' | 'TB' = 'LR';

  if (viewMode === 'software-architecture-tech-stack') {
    return buildArchitectureTechStackView(baseParsed);
  }

  if (viewMode === 'overview-function-protocol') {
    nodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        subLabel: inferRoleSummary(node.data.label),
      },
    }));

    edges = edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        label: normalizeProtocolLabel(String(getEdgeLabel(edge) || 'Request / Response')),
      },
    }));

    scenarios = ensureScenarioCoverage(scenarios, edges, 'Protocol Path');
  }

  if (viewMode === 'system-architecture') {
    return buildSystemArchitectureView(baseParsed);
  }

  if (viewMode === 'data-schema-to-database') {
    nodes = nodes.map((node) => {
      const fields = inferSchemaFields(node.data.label);
      const isDB = isDatabaseLike(node.data.label);
      const isCache = isStorageLike(node.data.label);
      return {
        ...node,
        style: { width: 210 },
        data: {
          ...node.data,
          variant: 'schema-table' as const,
          fields,
          subLabel: isDB ? 'READ / WRITE' : isCache ? 'CACHE / QUEUE' : inferDataSchemaOperation(node.data.label),
          color: isDB ? COLOR_MAP.red : isCache ? COLOR_MAP.orange : node.data.color,
          colorName: isDB ? 'red' : isCache ? 'orange' : node.data.colorName,
          icon: isDB ? 'Database' : isCache ? 'HardDrive' : node.data.icon,
        },
      };
    });

    const dbNodeIds = new Set(
      nodes.filter((n) => isDatabaseLike(n.data.label) || isStorageLike(n.data.label)).map((n) => n.id),
    );

    edges = edges.map((edge) => ({
      ...edge,
      style: dbNodeIds.has(edge.target) || dbNodeIds.has(edge.source)
        ? { stroke: '#b91c1c', strokeWidth: 2 }
        : { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 4' },
      data: {
        ...edge.data,
        label: inferDataFlowLabel(
          getNodeLabel(nodes, edge.source),
          getNodeLabel(nodes, edge.target),
          String(getEdgeLabel(edge) || ''),
        ),
      },
    }));

    scenarios = ensureScenarioCoverage(scenarios, edges, 'Data Write Path');
  }

  if (viewMode === 'software-design-logic') {
    layoutDirection = 'TB';

    nodes = nodes.map((node) => {
      const flowData = inferFlowchartNodeData(node.data.label);
      const isTerminal = flowData.shape === 'start' || flowData.shape === 'end';
      return {
        ...node,
        style: isTerminal ? undefined : { width: 210 },
        data: {
          ...node.data,
          variant: 'flowchart' as const,
          ...flowData,
        },
      };
    });

    edges = edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        label: inferFlowchartEdgeLabel(
          getNodeLabel(nodes, edge.source),
          getNodeLabel(nodes, edge.target),
          String(getEdgeLabel(edge) || ''),
        ),
      },
    }));

    scenarios = ensureScenarioCoverage(scenarios, edges, 'Logic Flow');
  }

  applyAutoLayout(nodes, edges, layoutDirection);
  return { nodes, edges, scenarios };
}

function applyAutoLayout(nodes: Node<CustomNodeData>[], edges: Edge[], direction: 'LR' | 'TB' = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: direction === 'TB' ? 50 : 60, ranksep: direction === 'TB' ? 90 : 160 });

  nodes.forEach((node) => {
    const { w, h } = getNodeSize(node);
    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const positionedNode = dagreGraph.node(node.id);
    if (positionedNode) {
      const { w, h } = getNodeSize(node);
      node.position = {
        x: positionedNode.x - w / 2,
        y: positionedNode.y - h / 2,
      };
    }
  });
}

function getNodeSize(node: Node<CustomNodeData>): { w: number; h: number } {
  if (node.data.variant === 'schema-table') {
    const rows = node.data.fields?.length || 3;
    return { w: 215, h: 40 + rows * 26 + 22 };
  }
  if (node.data.variant === 'logic-block') {
    const rows = node.data.codeLines?.length || 4;
    return { w: 252, h: 40 + rows * 18 + 22 };
  }
  if (node.data.variant === 'flowchart') {
    const shape = node.data.shape || 'process';
    if (shape === 'start' || shape === 'end') return { w: 180, h: 44 };
    if (shape === 'decision') return { w: 214, h: 86 };
    const extra = (node.data.params ? 22 : 0) + (node.data.returns ? 22 : 0) + (!node.data.params && !node.data.returns ? 22 : 0);
    return { w: 214, h: 38 + extra };
  }
  return { w: 150, h: 150 };
}

function dedupeEdges(edges: Edge[]) {
  const edgeMap = new Map<string, Edge>();
  edges.forEach((edge) => {
    const key = `${edge.source}->${edge.target}->${String(edge.data?.label || '')}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, edge);
    }
  });
  return Array.from(edgeMap.values());
}

function ensureScenarioCoverage(scenarios: Scenario[], edges: Edge[], prefix: string) {
  if (scenarios.length > 0) {
    return scenarios.slice(0, 6);
  }

  return edges.slice(0, 6).map((edge, index) => ({
    id: `s-generated-${index + 1}`,
    name: `${prefix} ${index + 1}`,
    path: [edge.source, edge.target],
  }));
}

function buildArchitectureTechStackView(baseParsed: ParsedData): ParsedData {
  const topConfigs2 = [
    { id: 'section-frontend', label: 'Frontend', color: '#2563eb', icon: 'Globe',
      placeholder: { label: 'Web / Mobile', subLabel: 'React • JavaScript\nSwift • Kotlin' } },
    { id: 'section-backend', label: 'Backend', color: '#15803d', icon: 'Server',
      placeholder: { label: 'Services', subLabel: 'Node.js • Spring Boot\nREST / GraphQL' } },
    { id: 'section-cicd', label: 'CI/CD', color: '#1d4ed8', icon: 'Settings',
      placeholder: { label: 'Automation', subLabel: 'Jenkins • GitHub Actions\nDocker • Deployments' } },
    { id: 'section-ai', label: 'AI / ML', color: '#7c3aed', icon: 'Layers',
      placeholder: { label: 'AI Services', subLabel: 'OpenAI • TensorFlow\nLLM • ML Pipeline' } },
  ] as const;

  const cloudCfg = {
    id: 'section-cloud' as const, label: 'Cloud', color: '#0891b2', icon: 'Cloud',
    placeholder: { label: 'Cloud Services', subLabel: 'AWS • Azure • GCP\nServerless • CDN • S3' },
  };
  const dbCfg = {
    id: 'section-database' as const, label: 'Database', color: '#b91c1c', icon: 'Database',
    placeholder: { label: 'Data Platform', subLabel: 'PostgreSQL • MySQL\nRedis • Cassandra' },
  };

  const groups = new Map<string, Node<CustomNodeData>[]>();
  [...topConfigs2, cloudCfg, dbCfg].forEach((s) => groups.set(s.id, []));

  baseParsed.nodes.forEach((node) => {
    const sid = inferArchitectureCategory(node.data.label, node.data.subLabel);
    (groups.get(sid) ?? groups.get('section-backend'))?.push({
      ...node,
      data: { ...node.data, variant: 'tech-stack', subLabel: inferArchitectureSubLabel(node.data.label, node.data.subLabel) },
    });
  });

  const sectionWidth = 460;
  const cardWidth = 175;
  const rowHeight = 152;
  const columnGap = 28;
  const sectionGapX = 50;
  const sectionGapY = 50;
  const originX = 30;
  const originY = 20;
  const sectionPadX = 20;
  const sectionHeaderH = 82;
  const fullWidth = sectionWidth * 2 + sectionGapX;
  const cloudTopPad = 10;
  const subSectionWidth = 450;
  const subSectionHeaderH = 52;
  const subSectionPadX = 16;

  function getMembers2(id: string, ph: { label: string; subLabel: string }, color: string, icon: string): Node<CustomNodeData>[] {
    const m = groups.get(id) ?? [];
    if (m.length > 0) return m;
    return [{ id: `${id}-placeholder`, type: 'custom', position: { x: 0, y: 0 }, draggable: false,
      data: { label: ph.label, color, colorName: 'blue', icon, subLabel: ph.subLabel, variant: 'tech-stack' } } as Node<CustomNodeData>];
  }

  const topSections = topConfigs2.map((cfg) => {
    const members = getMembers2(cfg.id, cfg.placeholder, cfg.color, cfg.icon);
    const rows = Math.max(1, Math.ceil(members.length / 2));
    return { ...cfg, members, height: 76 + rows * rowHeight + 28 };
  });

  const row1H = Math.max(topSections[0].height, topSections[1].height);
  const row2H = Math.max(topSections[2].height, topSections[3].height);
  const rowYs = [
    originY,
    originY + row1H + sectionGapY,
    originY + row1H + sectionGapY + row2H + sectionGapY,
  ];

  const dbMembers = getMembers2(dbCfg.id, dbCfg.placeholder, dbCfg.color, dbCfg.icon);
  const cloudMembers = getMembers2(cloudCfg.id, cloudCfg.placeholder, cloudCfg.color, cloudCfg.icon);
  const dbRows = Math.max(1, Math.ceil(dbMembers.length / 2));
  const dbSubH = subSectionHeaderH + dbRows * rowHeight + 16;
  const cloudCardStartX = sectionPadX + subSectionWidth + 30;
  const cloudCardRows = Math.max(1, Math.ceil(cloudMembers.length / 2));
  const cloudH = sectionHeaderH + cloudTopPad + Math.max(dbSubH, cloudCardRows * rowHeight) + 24;

  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  topSections.forEach((section, idx) => {
    const pos = {
      x: idx % 2 === 1 ? originX + sectionWidth + sectionGapX : originX,
      y: idx >= 2 ? rowYs[1] : rowYs[0],
    };
    nodes.push({
      id: section.id, type: 'custom', position: pos, draggable: false, selectable: true,
      style: { width: sectionWidth, height: section.height, zIndex: 0 },
      data: { label: section.label, color: section.color, colorName: 'blue', icon: section.icon,
               subLabel: 'Tech stack', variant: 'section' },
    });
    section.members.forEach((member, i) => {
      nodes.push({
        ...member, parentId: section.id, extent: 'parent', draggable: false, selectable: true,
        position: { x: sectionPadX + (i % 2) * (cardWidth + columnGap), y: sectionHeaderH + Math.floor(i / 2) * rowHeight },
        style: { width: cardWidth, zIndex: 1 },
        data: { ...member.data, variant: 'tech-stack', subLabel: inferArchitectureSubLabel(member.data.label, member.data.subLabel) },
      });
    });
  });

  nodes.push({
    id: cloudCfg.id, type: 'custom', position: { x: originX, y: rowYs[2] }, draggable: false, selectable: true,
    style: { width: fullWidth, height: cloudH, zIndex: 0 },
    data: { label: cloudCfg.label, color: cloudCfg.color, colorName: 'blue', icon: cloudCfg.icon,
             subLabel: 'Cloud infra', variant: 'section' },
  });

  nodes.push({
    id: dbCfg.id, type: 'custom', parentId: cloudCfg.id, extent: 'parent',
    position: { x: sectionPadX, y: sectionHeaderH + cloudTopPad },
    draggable: false, selectable: true,
    style: { width: subSectionWidth, height: dbSubH, zIndex: 1 },
    data: { label: dbCfg.label, color: dbCfg.color, colorName: 'blue', icon: dbCfg.icon,
             subLabel: 'Data storage', variant: 'section' },
  });

  dbMembers.forEach((m, i) => {
    nodes.push({
      ...m, parentId: dbCfg.id, extent: 'parent', draggable: false, selectable: true,
      position: { x: subSectionPadX + (i % 2) * (cardWidth + columnGap), y: subSectionHeaderH + Math.floor(i / 2) * rowHeight },
      style: { width: cardWidth, zIndex: 2 },
      data: { ...m.data, variant: 'tech-stack', subLabel: inferArchitectureSubLabel(m.data.label, m.data.subLabel) },
    });
  });

  cloudMembers.forEach((m, i) => {
    nodes.push({
      ...m, parentId: cloudCfg.id, extent: 'parent', draggable: false, selectable: true,
      position: { x: cloudCardStartX + (i % 2) * (cardWidth + columnGap), y: sectionHeaderH + cloudTopPad + Math.floor(i / 2) * rowHeight },
      style: { width: cardWidth, zIndex: 1 },
      data: { ...m.data, variant: 'tech-stack', subLabel: inferArchitectureSubLabel(m.data.label, m.data.subLabel) },
    });
  });

  edges.push(
    { id: 'arch-link-frontend-backend', source: 'section-frontend', target: 'section-backend', type: 'animated', data: { isAnimating: false, label: 'API / Requests' } },
    { id: 'arch-link-backend-db', source: 'section-backend', target: 'section-database', type: 'animated', data: { isAnimating: false, label: 'Queries / Persistence' } },
    { id: 'arch-link-cicd-backend', source: 'section-cicd', target: 'section-backend', type: 'animated', data: { isAnimating: false, label: 'Build / Deploy' } },
    { id: 'arch-link-backend-cloud', source: 'section-backend', target: 'section-cloud', type: 'animated', data: { isAnimating: false, label: 'Cloud Services / S3' } },
    { id: 'arch-link-backend-ai', source: 'section-backend', target: 'section-ai', type: 'animated', data: { isAnimating: false, label: 'AI Inference / LLM API' } },
  );

  const scenarios = [
    { id: 'arch-1', name: 'Frontend to Backend', path: ['section-frontend', 'section-backend'] },
    { id: 'arch-2', name: 'Backend to Database', path: ['section-backend', 'section-database'] },
    { id: 'arch-3', name: 'CI/CD Release Flow', path: ['section-cicd', 'section-backend'] },
    { id: 'arch-4', name: 'AI Inference Flow', path: ['section-backend', 'section-ai'] },
    { id: 'arch-5', name: 'Cloud Storage Flow', path: ['section-backend', 'section-cloud'] },
  ];

  return { nodes, edges, scenarios };
}

function buildSystemArchitectureView(baseParsed: ParsedData): ParsedData {
  const topConfigs = [
    { id: 'sys-hardware', label: 'Hardware', color: '#c2410c', icon: 'Cpu',
      placeholder: { label: 'Sensors / Devices', subLabel: 'IoT \u2022 Sensors \u2022 Actuators\nControllers \u2022 Cameras' } },
    { id: 'sys-network', label: 'Network', color: '#7c3aed', icon: 'Wifi',
      placeholder: { label: 'Connectivity Layer', subLabel: 'MQTT \u2022 Gateway \u2022 Router\nMessage Broker \u2022 VPN' } },
    { id: 'sys-software', label: 'Software', color: '#0369a1', icon: 'Code',
      placeholder: { label: 'Processing / Services', subLabel: 'APIs \u2022 Microservices\nEdge Computing \u2022 Logic' } },
    { id: 'sys-ai', label: 'AI / ML', color: '#059669', icon: 'Layers',
      placeholder: { label: 'AI Processing', subLabel: 'ML Models \u2022 Inference\nNeural Networks \u2022 LLM' } },
  ] as const;

  const cloudCfg = {
    id: 'sys-cloud' as const, label: 'Cloud', color: '#0891b2', icon: 'Cloud',
    placeholder: { label: 'Cloud Platform', subLabel: 'AWS \u2022 Azure \u2022 GCP\nLambda \u2022 CDN \u2022 IoT Hub' },
  };
  const dataCfg = {
    id: 'sys-data' as const, label: 'Data', color: '#b91c1c', icon: 'Database',
    placeholder: { label: 'Storage / Analytics', subLabel: 'PostgreSQL \u2022 InfluxDB\nWarehouse \u2022 Dashboard' },
  };

  const groups = new Map<string, Node<CustomNodeData>[]>();
  [...topConfigs, cloudCfg, dataCfg].forEach((s) => groups.set(s.id, []));

  baseParsed.nodes.forEach((node) => {
    const sid = inferSystemArchitectureCategory(node.data.label, node.data.subLabel);
    (groups.get(sid) ?? groups.get('sys-software'))?.push({
      ...node,
      data: { ...node.data, variant: 'tech-stack', subLabel: inferSystemArchitectureSubLabel(node.data.label, node.data.subLabel) },
    });
  });

  const sectionWidth = 460;
  const cardWidth = 175;
  const rowHeight = 152;
  const columnGap = 28;
  const sectionGapX = 50;
  const sectionGapY = 50;
  const originX = 30;
  const originY = 20;
  const sectionPadX = 20;
  const sectionHeaderH = 82;
  const fullWidth = sectionWidth * 2 + sectionGapX;
  const cloudTopPad = 10;
  const subSectionWidth = 450;
  const subSectionHeaderH = 52;
  const subSectionPadX = 16;

  function getMembers(id: string, ph: { label: string; subLabel: string }, color: string, icon: string): Node<CustomNodeData>[] {
    const m = groups.get(id) ?? [];
    if (m.length > 0) return m;
    return [{ id: `${id}-placeholder`, type: 'custom', position: { x: 0, y: 0 }, draggable: false,
      data: { label: ph.label, color, colorName: 'blue', icon, subLabel: ph.subLabel, variant: 'tech-stack' } } as Node<CustomNodeData>];
  }

  const topSections = topConfigs.map((cfg) => {
    const members = getMembers(cfg.id, cfg.placeholder, cfg.color, cfg.icon);
    const rows = Math.max(1, Math.ceil(members.length / 2));
    return { ...cfg, members, height: 76 + rows * rowHeight + 28 };
  });

  const row1H = Math.max(topSections[0].height, topSections[1].height);
  const row2H = Math.max(topSections[2].height, topSections[3].height);
  const rowYs = [
    originY,
    originY + row1H + sectionGapY,
    originY + row1H + sectionGapY + row2H + sectionGapY,
  ];

  const dataMembers = getMembers(dataCfg.id, dataCfg.placeholder, dataCfg.color, dataCfg.icon);
  const cloudMembers = getMembers(cloudCfg.id, cloudCfg.placeholder, cloudCfg.color, cloudCfg.icon);
  const dataRows = Math.max(1, Math.ceil(dataMembers.length / 2));
  const dataSubH = subSectionHeaderH + dataRows * rowHeight + 16;
  const cloudCardStartX = sectionPadX + subSectionWidth + 30;
  const cloudCardRows = Math.max(1, Math.ceil(cloudMembers.length / 2));
  const cloudH = sectionHeaderH + cloudTopPad + Math.max(dataSubH, cloudCardRows * rowHeight) + 24;

  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  topSections.forEach((section, idx) => {
    const pos = {
      x: idx % 2 === 1 ? originX + sectionWidth + sectionGapX : originX,
      y: idx >= 2 ? rowYs[1] : rowYs[0],
    };
    nodes.push({
      id: section.id, type: 'custom', position: pos, draggable: false, selectable: true,
      style: { width: sectionWidth, height: section.height, zIndex: 0 },
      data: { label: section.label, color: section.color, colorName: 'blue', icon: section.icon,
               subLabel: 'System layers', variant: 'section' },
    });
    section.members.forEach((member, i) => {
      nodes.push({
        ...member, parentId: section.id, extent: 'parent', draggable: false, selectable: true,
        position: { x: sectionPadX + (i % 2) * (cardWidth + columnGap), y: sectionHeaderH + Math.floor(i / 2) * rowHeight },
        style: { width: cardWidth, zIndex: 1 },
        data: { ...member.data, variant: 'tech-stack', subLabel: inferSystemArchitectureSubLabel(member.data.label, member.data.subLabel) },
      });
    });
  });

  nodes.push({
    id: cloudCfg.id, type: 'custom', position: { x: originX, y: rowYs[2] }, draggable: false, selectable: true,
    style: { width: fullWidth, height: cloudH, zIndex: 0 },
    data: { label: cloudCfg.label, color: cloudCfg.color, colorName: 'blue', icon: cloudCfg.icon,
             subLabel: 'Cloud infra', variant: 'section' },
  });

  nodes.push({
    id: dataCfg.id, type: 'custom', parentId: cloudCfg.id, extent: 'parent',
    position: { x: sectionPadX, y: sectionHeaderH + cloudTopPad },
    draggable: false, selectable: true,
    style: { width: subSectionWidth, height: dataSubH, zIndex: 1 },
    data: { label: dataCfg.label, color: dataCfg.color, colorName: 'blue', icon: dataCfg.icon,
             subLabel: 'Time-series & storage', variant: 'section' },
  });

  dataMembers.forEach((m, i) => {
    nodes.push({
      ...m, parentId: dataCfg.id, extent: 'parent', draggable: false, selectable: true,
      position: { x: subSectionPadX + (i % 2) * (cardWidth + columnGap), y: subSectionHeaderH + Math.floor(i / 2) * rowHeight },
      style: { width: cardWidth, zIndex: 2 },
      data: { ...m.data, variant: 'tech-stack', subLabel: inferSystemArchitectureSubLabel(m.data.label, m.data.subLabel) },
    });
  });

  cloudMembers.forEach((m, i) => {
    nodes.push({
      ...m, parentId: cloudCfg.id, extent: 'parent', draggable: false, selectable: true,
      position: { x: cloudCardStartX + (i % 2) * (cardWidth + columnGap), y: sectionHeaderH + cloudTopPad + Math.floor(i / 2) * rowHeight },
      style: { width: cardWidth, zIndex: 1 },
      data: { ...m.data, variant: 'tech-stack', subLabel: inferSystemArchitectureSubLabel(m.data.label, m.data.subLabel) },
    });
  });

  edges.push(
    { id: 'sys-link-hw-net', source: 'sys-hardware', target: 'sys-network', type: 'animated', data: { isAnimating: false, label: 'Sensor Data / Signal' } },
    { id: 'sys-link-net-sw', source: 'sys-network', target: 'sys-software', type: 'animated', data: { isAnimating: false, label: 'MQTT / HTTP Stream' } },
    { id: 'sys-link-sw-data', source: 'sys-software', target: 'sys-data', type: 'animated', data: { isAnimating: false, label: 'Store / Query' } },
    { id: 'sys-link-sw-hw', source: 'sys-software', target: 'sys-hardware', type: 'animated', data: { isAnimating: false, label: 'Control / Actuate' } },
    { id: 'sys-link-sw-cloud', source: 'sys-software', target: 'sys-cloud', type: 'animated', data: { isAnimating: false, label: 'Cloud API / Push Data' } },
    { id: 'sys-link-sw-ai', source: 'sys-software', target: 'sys-ai', type: 'animated', data: { isAnimating: false, label: 'ML Inference / Prediction' } },
  );

  const scenarios = [
    { id: 'sys-1', name: 'Sensor to Processing', path: ['sys-hardware', 'sys-network', 'sys-software'] },
    { id: 'sys-2', name: 'Processing to Storage', path: ['sys-software', 'sys-data'] },
    { id: 'sys-3', name: 'Control Actuator', path: ['sys-software', 'sys-hardware'] },
    { id: 'sys-4', name: 'Cloud Sync Flow', path: ['sys-software', 'sys-cloud'] },
    { id: 'sys-5', name: 'AI Prediction Flow', path: ['sys-software', 'sys-ai'] },
  ];

  return { nodes, edges, scenarios };
}

function inferSystemArchitectureCategory(label: string, subLabel?: string): string {
  const text = `${label} ${subLabel || ''}`.toLowerCase();

  if (/(sensor|iot|actuator|controller|camera|gps|lidar|radar|ecu|obd|motor|battery|charger|hardware|device|embedded|microcontroller|arduino|raspberry|gpio)/i.test(text)) {
    return 'sys-hardware';
  }

  if (/(mqtt|gateway|router|broker|bus|socket|vpn|firewall|load.?balancer|queue|message|network|wifi|zigbee|lora|can.?bus|protocol|proxy)/i.test(text)) {
    return 'sys-network';
  }

  if (/(openai|gpt|llm|\bai\b|machine.?learning|\bml\b|tensorflow|pytorch|neural|inference|prediction|embedding|mistral|claude|gemini)/i.test(text)) {
    return 'sys-ai';
  }

  if (/(cloud|aws|azure|gcp|lambda|ec2|cloudfront|heroku|vercel|netlify|iot.hub|iot.core|sagemaker)/i.test(text)) {
    return 'sys-cloud';
  }

  if (/(database|postgres|mysql|mongo|redis|influx|cassandra|warehouse|timeseries|analytics|grafana|dashboard|filesystem)/i.test(text)) {
    return 'sys-data';
  }

  return 'sys-software';
}

function inferSystemArchitectureSubLabel(label: string, subLabel?: string): string {
  const combined = `${label} ${subLabel || ''}`;

  if (/(sensor|iot|camera|gps|lidar)/i.test(combined)) return 'Hardware Sensor\nData acquisition';
  if (/(actuator|motor|relay|servo)/i.test(combined)) return 'Actuator\nControl output';
  if (/(controller|ecu|embedded|arduino|raspberry)/i.test(combined)) return 'Embedded System\nEdge controller';
  if (/(mqtt|broker|message|queue)/i.test(combined)) return 'Message Broker\nPub/Sub protocol';
  if (/(gateway|router|proxy)/i.test(combined)) return 'Network Gateway\nTraffic routing';
  if (/(api|service|server|backend)/i.test(combined)) return 'Service Layer\nBusiness logic';
  if (/(database|postgres|mysql|mongo|redis|influx)/i.test(combined)) return extractTechKeywords(combined) || 'Data Store';
  if (/(dashboard|grafana|analytics)/i.test(combined)) return 'Visualization\nMonitoring';
  if (/(openai|gpt|llm|\bai\b|machine.?learning|\bml\b|tensorflow|pytorch|inference)/i.test(combined)) return 'AI / ML Inference\nModel Serving';
  if (/(cloud|aws|azure|gcp|lambda|ec2|cloudfront)/i.test(combined)) return extractTechKeywords(combined) || 'Cloud Service\nManaged Infrastructure';

  return extractTechKeywords(combined) || inferRoleSummary(label);
}

function inferLogicRole(label: string): string {
  const lower = label.toLowerCase();
  if (/(validate|validation|check|guard)/i.test(lower)) return 'Validation\nIf-Else logic';
  if (/(calculate|compute|process|algorithm)/i.test(lower)) return 'Algorithm\nCore computation';
  if (/(fetch|load|read|query|get)/i.test(lower)) return 'Data retrieval\nAsync / Await';
  if (/(save|write|persist|insert|update|delete)/i.test(lower)) return 'Data mutation\nTransaction';
  if (/(transform|map|filter|reduce|parse)/i.test(lower)) return 'Data transform\nFunctional ops';
  if (/(test|spec|mock|stub|assert)/i.test(lower)) return 'Unit test\nAssertions';
  if (/(loop|iterate|retry|batch)/i.test(lower)) return 'Iteration\nLoop / Retry';
  if (/(dispatch|emit|trigger|event)/i.test(lower)) return 'Event dispatch\nObserver pattern';
  if (/(middleware|handler|interceptor)/i.test(lower)) return 'Middleware\nPipeline step';
  return inferRoleSummary(label);
}

function inferLogicEdgeLabel(sourceLabel: string, targetLabel: string, existingLabel: string): string {
  if (existingLabel && existingLabel.length > 2) return existingLabel;
  const combined = `${sourceLabel} ${targetLabel}`.toLowerCase();
  if (/(validate|check|guard)/i.test(combined)) return 'params(input): bool';
  if (/(fetch|load|query|get)/i.test(combined)) return 'await getData(id)';
  if (/(save|write|persist|insert)/i.test(combined)) return 'saveRecord(data)';
  if (/(transform|map|parse)/i.test(combined)) return 'transform(payload)';
  if (/(test|assert|mock)/i.test(combined)) return 'assert(result)';
  if (/(dispatch|emit|event)/i.test(combined)) return 'emit(event, payload)';
  return 'call(params) → result';
}

function inferFlowchartNodeData(label: string): {
  shape: 'start' | 'end' | 'process' | 'decision' | 'io';
  params?: string;
  returns?: string;
  subLabel?: string;
} {
  const lower = label.toLowerCase();

  if (
    /(user|customer|mobile|client|browser|frontend|portal|app)/i.test(lower) &&
    !/(service|handler|api|gateway|backend)/i.test(lower)
  ) {
    return { shape: 'start', subLabel: 'Entry / User input' };
  }

  if (/(response|result|receipt|success|complete|output|done|display)/i.test(lower)) {
    return { shape: 'end', subLabel: 'Output / Response' };
  }

  if (/(validate|check|guard|verify|authorize|isvalid)/i.test(lower)) {
    return {
      shape: 'decision',
      params: inferDecisionCondition(label),
      returns: 'bool',
      subLabel: 'Branch condition',
    };
  }

  if (isDatabaseLike(lower) || isStorageLike(lower) || /(orm|prisma|repository|repo)/i.test(lower)) {
    return {
      shape: 'io',
      params: inferDbParams(label),
      returns: inferDbReturn(label),
      subLabel: 'Data layer',
    };
  }

  return {
    shape: 'process',
    params: inferFunctionParams(label),
    returns: inferFunctionReturn(label),
    subLabel: inferLogicRole(label),
  };
}

function inferDecisionCondition(label: string): string {
  const lower = label.toLowerCase();
  if (/(validate|valid)/i.test(lower)) return 'input.isValid()';
  if (/(auth|authorized|permission)/i.test(lower)) return 'user.hasPermission()';
  if (/(exist|found|null)/i.test(lower)) return 'record !== null';
  if (/(stock|available|inventory)/i.test(lower)) return 'stock.qty > 0';
  if (/(payment|paid|charge)/i.test(lower)) return 'charge.status === \'ok\'';
  if (/(retry|limit|threshold)/i.test(lower)) return 'attempts < maxRetries';
  return 'condition === true';
}

function inferDbParams(label: string): string {
  const lower = label.toLowerCase();
  if (/(create|insert|save|add)/i.test(lower)) return 'dto: CreateDTO';
  if (/(update|edit|patch)/i.test(lower)) return 'id, data: UpdateDTO';
  if (/(delete|remove)/i.test(lower)) return 'id: string';
  return 'query: WhereClause';
}

function inferDbReturn(label: string): string {
  const lower = label.toLowerCase();
  if (/(create|insert|save|add)/i.test(lower)) return 'Promise<Entity>';
  if (/(delete|remove)/i.test(lower)) return 'Promise<void>';
  if (/(list|all|many)/i.test(lower)) return 'Promise<Entity[]>';
  return 'Promise<Entity>';
}

function inferFunctionParams(label: string): string {
  const lower = label.toLowerCase();
  if (/(order|booking|reservation)/i.test(lower)) return 'req: OrderDTO';
  if (/(payment|billing|charge)/i.test(lower)) return 'dto: PaymentDTO';
  if (/(auth|login|sign)/i.test(lower)) return 'creds: AuthDTO';
  if (/(user|account|register|profile)/i.test(lower)) return 'data: UserDTO';
  if (/(search|filter)/i.test(lower)) return 'query: string';
  if (/(save|create|insert|write)/i.test(lower)) return 'data: DTO';
  if (/(update|edit|patch)/i.test(lower)) return 'id, patch: DTO';
  if (/(delete|remove)/i.test(lower)) return 'id: string';
  if (/(notify|send|emit|dispatch)/i.test(lower)) return 'event: Event';
  if (/(transform|parse|map|convert)/i.test(lower)) return 'raw: unknown';
  if (/(api|endpoint|route|handler)/i.test(lower)) return 'req: Request';
  return 'params: object';
}

function inferFunctionReturn(label: string): string {
  const lower = label.toLowerCase();
  if (/(get|fetch|find|load|select|search|read)/i.test(lower)) return 'Promise<T[]>';
  if (/(create|insert|save|add|register)/i.test(lower)) return 'Promise<T>';
  if (/(validate|check|verify|guard)/i.test(lower)) return 'bool';
  if (/(auth|login|token|sign)/i.test(lower)) return 'Promise<Token>';
  if (/(delete|remove)/i.test(lower)) return 'Promise<void>';
  if (/(update|patch|edit)/i.test(lower)) return 'Promise<T>';
  if (/(notify|send|emit|dispatch)/i.test(lower)) return 'Promise<void>';
  if (/(transform|parse|map|convert)/i.test(lower)) return 'DTO';
  if (/(payment|charge|invoice)/i.test(lower)) return 'Promise<Receipt>';
  return 'Promise<Result>';
}

function inferFlowchartEdgeLabel(sourceLabel: string, targetLabel: string, existingLabel: string): string {
  if (existingLabel.trim().length > 2) return existingLabel;
  const srcLow = sourceLabel.toLowerCase();
  const tgtLow = targetLabel.toLowerCase();

  if (/(validate|check|guard)/i.test(srcLow)) return '✓ valid';
  if (/(validate|check|guard)/i.test(tgtLow)) return 'validate(dto)';

  if (isDatabaseLike(tgtLow) || isStorageLike(tgtLow) || /(orm|prisma)/i.test(tgtLow)) {
    if (/(create|save|insert|add)/i.test(srcLow)) return 'INSERT(dto)';
    if (/(update|edit|patch)/i.test(srcLow)) return 'UPDATE(id, data)';
    if (/(delete|remove)/i.test(srcLow)) return 'DELETE(id)';
    return 'SELECT(query)';
  }

  if (isDatabaseLike(srcLow) || isStorageLike(srcLow) || /(orm|prisma)/i.test(srcLow)) {
    return '→ Entity[]';
  }

  if (/(user|client|mobile|browser|frontend)/i.test(srcLow)) return 'HTTP POST(body)';
  if (/(auth|login|token)/i.test(tgtLow)) return 'authenticate(creds)';
  if (/(notify|send|email)/i.test(tgtLow)) return 'notify(event)';
  if (/(transform|parse|map)/i.test(tgtLow)) return 'map(raw)';

  const fnName = tgtLow.replace(/\s+/g, '').replace(/[^a-z]/g, '').slice(0, 10);
  return `${fnName || 'call'}(dto)`;
}

function inferArchitectureCategory(label: string, subLabel?: string) {
  const text = `${label} ${subLabel || ''}`.toLowerCase();

  if (/(openai|gpt|llm|\bai\b|machine.?learning|\bml\b|tensorflow|pytorch|neural|inference|prediction|embedding|mistral|claude|gemini)/i.test(text)) {
    return 'section-ai';
  }

  if (/(cloud|aws|azure|gcp|lambda|ec2|cloudfront|heroku|vercel|netlify|sagemaker|ecs|eks|fargate|cloudwatch)/i.test(text)) {
    return 'section-cloud';
  }

  if (/(database|postgres|mysql|mongo|redis|prisma|orm|cassandra|cockroach|warehouse|storage)/i.test(text)) {
    return 'section-database';
  }

  if (/(ci\/cd|devops|jenkins|spinnaker|pagerduty|gradle|github actions|gitlab|deployment|release|pipeline)/i.test(text)) {
    return 'section-cicd';
  }

  if (/(frontend|mobile|web|react|swift|kotlin|ios|android|browser|ui|client|portal)/i.test(text)) {
    return 'section-frontend';
  }

  return 'section-backend';
}

function inferArchitectureSubLabel(label: string, subLabel?: string) {
  const combined = `${label} ${subLabel || ''}`;

  if (/(openai|gpt|llm|\bai\b|machine.?learning|\bml\b|tensorflow|pytorch|neural|inference|prediction|embedding)/i.test(combined)) {
    return extractTechKeywords(combined) || 'AI / ML Model\nInference Pipeline';
  }

  if (/(cloud|aws|azure|gcp|lambda|ec2|cloudfront|heroku|vercel|netlify)/i.test(combined)) {
    return extractTechKeywords(combined) || 'Cloud Functions\nManaged Services';
  }

  if (/(mobile|ios|android|swift|kotlin)/i.test(combined)) {
    return 'Swift • Kotlin\nMobile apps';
  }

  if (/(web|frontend|browser|portal|react|javascript|typescript)/i.test(combined)) {
    return 'React • JavaScript\nWeb UI';
  }

  if (/(api|backend|service|server|node|spring|graphql|grpc)/i.test(combined)) {
    return 'Node.js • APIs\nService layer';
  }

  if (/(database|postgres|mysql|mongo|redis|prisma|orm|cassandra|cockroach)/i.test(combined)) {
    return extractTechKeywords(combined) || 'SQL • Storage';
  }

  if (/(ci\/cd|devops|jenkins|spinnaker|gradle|pagerduty|deploy|pipeline)/i.test(combined)) {
    return 'Jenkins • Deploy\nAutomation';
  }

  return extractTechKeywords(combined) || inferRoleSummary(label);
}

function extractEntitiesFromLine(line: string): string[] {
  const entities: string[] = [];

  Array.from(line.matchAll(/`([^`]+)`/g)).forEach((match) => entities.push(match[1]));
  Array.from(line.matchAll(/\[(.*?)\]/g)).forEach((match) => entities.push(match[1]));

  const normalized = line
    .replace(/→|=>|-->/g, ' -> ')
    .replace(/\b(via|through|using|into|from|to)\b/gi, ' -> ');

  if (normalized.includes('->')) {
    normalized.split('->').forEach((segment) => {
      const guess = pickEntityFromSegment(segment);
      if (guess) {
        entities.push(guess);
      }
    });
  }

  const keywordMatches = normalized.match(
    /mobile app|web portal|web app|frontend|backend|api gateway|gateway|central api|auth service|payment service|notification service|database|postgresql|mysql|mongodb|redis|prisma orm|prisma|orm|queue|broker|dashboard|server|service|client|browser|admin|branch|hq|customer|user/gi,
  );
  keywordMatches?.forEach((match) => entities.push(match));

  return Array.from(new Set(entities.map(normalizeEntityName))).filter(Boolean);
}

function pickEntityFromSegment(segment: string): string | null {
  const cleaned = segment.replace(/[`*_#>()[\]{}]/g, ' ').replace(/[,:;]+/g, ' ');
  const normalized = normalizeWhitespace(cleaned);
  if (!normalized) {
    return null;
  }

  const keywordMatch = normalized.match(
    /(mobile app|web portal|web app|frontend|backend|api gateway|gateway|central api|auth service|payment service|notification service|database|postgresql|mysql|mongodb|redis|prisma orm|prisma|orm|queue|broker|dashboard|server|service|client|browser|admin|branch|hq|customer|user)/i,
  );
  if (keywordMatch) {
    return keywordMatch[1];
  }

  const words = normalized.split(' ').filter((word) => {
    const lower = word.toLowerCase();
    return word.length > 1 && !STOP_WORDS.has(lower) && !/^\d+$/.test(word);
  });

  if (words.length === 0) {
    return null;
  }

  return words.slice(0, 3).join(' ');
}

function inferNodeData(label: string, overrides: Partial<CustomNodeData> = {}): CustomNodeData {
  const normalizedLabel = normalizeEntityName(label);
  const lower = normalizedLabel.toLowerCase();

  let colorName = 'gray';
  let color = COLOR_MAP.gray;
  let icon = 'Circle';

  if (/(user|customer|admin|staff|branch|hq)/i.test(lower)) {
    colorName = 'green';
    color = COLOR_MAP.green;
    icon = 'User';
  } else if (/(mobile|ios|android|phone|app)/i.test(lower)) {
    colorName = 'green';
    color = COLOR_MAP.green;
    icon = 'Smartphone';
  } else if (/(web|frontend|portal|browser|ui|dashboard)/i.test(lower)) {
    colorName = 'purple';
    color = COLOR_MAP.purple;
    icon = 'Globe';
  } else if (/(api|backend|service|server|lambda|function|gateway)/i.test(lower)) {
    colorName = 'blue';
    color = COLOR_MAP.blue;
    icon = 'Code';
  } else if (/(database|postgres|mysql|mongo|redis|prisma|orm|storage|warehouse)/i.test(lower)) {
    colorName = 'red';
    color = COLOR_MAP.red;
    icon = 'Database';
  } else if (/(ci\/cd|devops|jenkins|spinnaker|github actions|gitlab|gradle|pagerduty|argo|helm|deployment|release|pipeline)/i.test(lower)) {
    colorName = 'blue';
    color = COLOR_MAP.blue;
    icon = 'Settings';
  } else if (/(queue|broker|event|message|notification|kafka|flink)/i.test(lower)) {
    colorName = 'orange';
    color = COLOR_MAP.orange;
    icon = 'MessageSquare';
  }

  return {
    label: normalizedLabel,
    color: overrides.color || color,
    colorName: overrides.colorName || colorName,
    icon: overrides.icon || icon,
    subLabel: overrides.subLabel || extractTechKeywords(normalizedLabel) || inferRoleSummary(normalizedLabel),
  };
}

function extractTechKeywords(text: string): string | undefined {
  const matches = new Set<string>();
  const patterns: Array<[RegExp, string]> = [
    [/react/i, 'React'],
    [/javascript|\bjs\b/i, 'JavaScript'],
    [/typescript/i, 'TypeScript'],
    [/swift/i, 'Swift'],
    [/kotlin/i, 'Kotlin'],
    [/node\.?js/i, 'Node.js'],
    [/spring\s*boot/i, 'Spring Boot'],
    [/graphql/i, 'GraphQL'],
    [/grpc/i, 'gRPC'],
    [/kafka/i, 'Kafka'],
    [/flink/i, 'Flink'],
    [/spark/i, 'Spark'],
    [/postgres(?:ql)?/i, 'PostgreSQL'],
    [/mysql/i, 'MySQL'],
    [/mongodb/i, 'MongoDB'],
    [/redis|evcache/i, 'Redis'],
    [/cassandra/i, 'Cassandra'],
    [/cockroach/i, 'CockroachDB'],
    [/prisma/i, 'Prisma'],
    [/jenkins/i, 'Jenkins'],
    [/spinnaker/i, 'Spinnaker'],
    [/pagerduty/i, 'PagerDuty'],
    [/docker/i, 'Docker'],
    [/rest|https?/i, 'HTTP/REST'],
    [/tcp\/ip/i, 'TCP/IP'],
  ];

  patterns.forEach(([pattern, label]) => {
    if (pattern.test(text)) {
      matches.add(label);
    }
  });

  const values = Array.from(matches);
  return values.length > 0 ? values.slice(0, 2).join(' • ') : undefined;
}

function extractProtocol(text: string): string | undefined {
  const routeMatch = text.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+([/\w:-]+)/i);
  if (routeMatch) {
    return `${routeMatch[1].toUpperCase()} ${routeMatch[2]}`;
  }
  if (/graphql/i.test(text)) return 'GraphQL';
  if (/grpc/i.test(text)) return 'gRPC';
  if (/websocket|socket/i.test(text)) return 'WebSocket';
  if (/tcp\/ip|tcp/i.test(text)) return 'TCP/IP';
  if (/rest|https?/i.test(text)) return 'HTTP/REST';
  if (/sql|query|select|insert|update|delete|write|read/i.test(text)) return 'SQL/Data';
  if (/event|queue|message|kafka|rabbitmq|amqp|mqtt/i.test(text)) return 'Event / Queue';
  return undefined;
}

function normalizeProtocolLabel(label: string) {
  return extractProtocol(label) || label;
}

function inferRoleSummary(label: string) {
  if (isDatabaseLike(label)) return 'Data layer';
  if (isUserLike(label)) return 'User / channel';
  if (/(api|backend|service|server|gateway)/i.test(label)) return 'Application service';
  if (/(queue|broker|event|message)/i.test(label)) return 'Async messaging';
  return 'System component';
}

function isUserLike(label: string) {
  return /(user|customer|admin|branch|hq|mobile|web|portal|client|browser|frontend)/i.test(label);
}

function isDatabaseLike(label: string) {
  return /(database|postgres|mysql|mongo|redis|prisma|orm|storage|warehouse)/i.test(label);
}

function isStorageLike(label: string) {
  return /(cache|s3|blob|filesystem|queue|kafka|rabbitmq|influx|cassandra|elasticsearch|elastic)/i.test(label);
}

function inferDataSchemaOperation(label: string): string {
  const lower = label.toLowerCase();
  if (/(user|member|account|customer)/i.test(lower)) return 'INSERT / UPDATE users';
  if (/(order|booking|reservation)/i.test(lower)) return 'INSERT orders';
  if (/(product|inventory|stock)/i.test(lower)) return 'UPDATE products';
  if (/(payment|billing|invoice)/i.test(lower)) return 'INSERT payments';
  if (/(session|token|auth)/i.test(lower)) return 'SET / GET session';
  if (/(log|event|audit)/i.test(lower)) return 'INSERT events';
  if (/(api|service|backend|server)/i.test(lower)) return 'POST / GET request';
  if (/(mobile|frontend|web|client)/i.test(lower)) return 'Sends payload';
  return 'SELECT / INSERT';
}

function inferSchemaFields(label: string): Array<{ name: string; type: string; key?: 'PK' | 'FK' }> {
  const lower = label.toLowerCase();

  if (/(user|member|account|customer|profile|staff)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'email', type: 'VARCHAR(255)' },
    { name: 'name', type: 'VARCHAR(100)' },
    { name: 'role', type: 'ENUM' },
    { name: 'created_at', type: 'TIMESTAMP' },
  ];

  if (/(order|booking|reservation|purchase)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'user_id', type: 'INT', key: 'FK' },
    { name: 'items', type: 'JSON' },
    { name: 'total', type: 'DECIMAL(10,2)' },
    { name: 'status', type: 'VARCHAR(20)' },
    { name: 'created_at', type: 'TIMESTAMP' },
  ];

  if (/(product|item|inventory|stock|catalogue)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'name', type: 'VARCHAR(200)' },
    { name: 'price', type: 'DECIMAL(10,2)' },
    { name: 'qty', type: 'INT' },
    { name: 'category_id', type: 'INT', key: 'FK' },
  ];

  if (/(payment|invoice|billing|charge|receipt)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'order_id', type: 'INT', key: 'FK' },
    { name: 'amount', type: 'DECIMAL(10,2)' },
    { name: 'method', type: 'VARCHAR(50)' },
    { name: 'paid_at', type: 'TIMESTAMP' },
  ];

  if (/(session|token|auth|credential|jwt|login)/i.test(lower)) return [
    { name: 'token', type: 'VARCHAR(512)', key: 'PK' },
    { name: 'user_id', type: 'INT', key: 'FK' },
    { name: 'expires_at', type: 'TIMESTAMP' },
    { name: 'ip_address', type: 'VARCHAR(45)' },
  ];

  if (/(notification|alert|message|email|sms|push)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'user_id', type: 'INT', key: 'FK' },
    { name: 'type', type: 'VARCHAR(50)' },
    { name: 'content', type: 'TEXT' },
    { name: 'read', type: 'BOOLEAN' },
  ];

  if (/(log|event|audit|activity|history|track)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'type', type: 'VARCHAR(100)' },
    { name: 'payload', type: 'JSON' },
    { name: 'user_id', type: 'INT', key: 'FK' },
    { name: 'timestamp', type: 'TIMESTAMP' },
  ];

  if (/(report|analytics|metric|stat|dashboard)/i.test(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'name', type: 'VARCHAR(100)' },
    { name: 'value', type: 'DECIMAL' },
    { name: 'period', type: 'VARCHAR(20)' },
    { name: 'recorded_at', type: 'TIMESTAMP' },
  ];

  if (/(orm|prisma|sequelize|typeorm|mongoose)/i.test(lower)) return [
    { name: 'model', type: 'Class' },
    { name: 'query', type: 'SQL / NoSQL' },
    { name: 'relations', type: 'FK[] Join' },
    { name: 'result', type: 'Promise<T>' },
  ];

  if (isDatabaseLike(lower)) return [
    { name: 'id', type: 'INT', key: 'PK' },
    { name: 'data', type: 'JSON' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' },
  ];

  if (isStorageLike(lower)) return [
    { name: 'key', type: 'string' },
    { name: 'value', type: 'bytes / JSON' },
    { name: 'ttl', type: 'INT (seconds)' },
  ];

  if (/(api|service|server|backend|gateway|handler)/i.test(lower)) return [
    { name: 'method', type: 'HTTP verb' },
    { name: 'path', type: 'string' },
    { name: 'body', type: 'JSON' },
    { name: 'auth', type: 'Bearer token' },
  ];

  if (/(mobile|frontend|web|portal|browser|client|app)/i.test(lower)) return [
    { name: 'user_id', type: 'string' },
    { name: 'payload', type: 'object' },
    { name: 'device_id', type: 'string' },
    { name: 'timestamp', type: 'ISO 8601' },
  ];

  return [
    { name: 'id', type: 'string' },
    { name: 'data', type: 'object' },
    { name: 'created_at', type: 'DATETIME' },
  ];
}

function inferCodeLines(label: string): string[] {
  const lower = label.toLowerCase();

  if (/(validate|check|guard|verify)/i.test(lower)) return [
    'fn validate(input: DTO): bool {',
    '  if (!input.required) throw 400',
    '  if (!regex.test(input.email)) throw 422',
    '  if (input.amount < 0) throw 400',
    '  return true',
    '}',
  ];

  if (/(auth|login|token|session|credential)/i.test(lower)) return [
    'async fn authenticate(creds: AuthDTO) {',
    '  user = await db.findOne({ email })',
    '  if (!user) throw 401',
    '  ok = bcrypt.verify(creds.pw, user.hash)',
    '  if (!ok) throw 403',
    '  return jwt.sign({ userId, role })',
    '}',
  ];

  if (/(order|booking|reservation|purchase)/i.test(lower)) return [
    'async fn createOrder(req: OrderDTO) {',
    '  tx = await db.beginTransaction()',
    '  await validate(req.items)',
    '  await checkStock(req.items)',
    '  order = await tx.insert(Order, req)',
    '  await tx.commit()',
    '  return order',
    '}',
  ];

  if (/(payment|billing|charge|invoice)/i.test(lower)) return [
    'async fn processPayment(dto: PayDTO) {',
    '  if (dto.amount <= 0) throw 400',
    '  charge = await stripe.create(dto)',
    '  if (!charge.ok) throw 402',
    '  await db.insert(Payment, { ...dto })',
    '  emit("payment.completed", charge)',
    '  return receipt',
    '}',
  ];

  if (/(notify|notification|alert|email|sms|push)/i.test(lower)) return [
    'async fn sendNotification(evt: Event) {',
    '  targets = await resolveTargets(evt)',
    '  for (user of targets) {',
    '    msg = buildMessage(evt, user)',
    '    await queue.push({ user, msg })',
    '  }',
    '  return { sent: targets.length }',
    '}',
  ];

  if (/(fetch|load|read|get|query|select)/i.test(lower)) return [
    'async fn fetchData(id: string): T {',
    '  cached = await redis.get(`key:${id}`)',
    '  if (cached) return JSON.parse(cached)',
    '  data = await db.query({ id })',
    '  if (!data) throw 404',
    '  await redis.set(key, data, 300)',
    '  return data',
    '}',
  ];

  if (/(save|write|persist|insert|update|delete)/i.test(lower)) return [
    'async fn saveRecord(data: DTO): Record {',
    '  tx = await db.transaction()',
    '  existing = await tx.findOne(data.id)',
    '  if (existing) return tx.update(data)',
    '  record = await tx.insert(data)',
    '  await tx.commit()',
    '  return record',
    '}',
  ];

  if (/(transform|map|parse|convert|format)/i.test(lower)) return [
    'fn transform(raw: unknown): DTO {',
    '  validated = schema.safeParse(raw)',
    '  if (!validated.ok) throw 422',
    '  mapped = mapKeys(validated.data)',
    '  return sanitize(mapped)',
    '}',
  ];

  if (/(api|service|backend|server|handler)/i.test(lower)) return [
    'router.post("/api/v1/resource", async (req, res) => {',
    '  data = await validate(req.body)',
    '  if (!req.auth) return res.status(401)',
    '  result = await service.process(data)',
    '  if (!result) return res.status(404)',
    '  res.status(200).json(result)',
    '})',
  ];

  if (/(mobile|frontend|web|portal|browser|client)/i.test(lower)) return [
    'async fn submitForm(form: FormData) {',
    '  errors = validate(form)',
    '  if (errors.length) return showErrors(errors)',
    '  setLoading(true)',
    '  res = await api.post("/endpoint", form)',
    '  if (res.ok) navigate("/success")',
    '  else toast.error(res.message)',
    '}',
  ];

  if (/(database|postgres|mysql|mongo|redis|orm)/i.test(lower)) return [
    '-- Query examples',
    'SELECT * FROM table WHERE id = $1',
    'INSERT INTO table (col) VALUES ($1)',
    'UPDATE table SET col = $1 WHERE id = $2',
    'BEGIN / COMMIT / ROLLBACK',
    'CREATE INDEX ON table(col)',
  ];

  const fnName = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  return [
    `async fn ${fnName}(params: object) {`,
    '  input = await validate(params)',
    '  if (!input.ok) throw new Error(input.msg)',
    '  result = await process(input.data)',
    '  log("completed", { result })',
    '  return result',
    '}',
  ];
}

function inferDataFlowLabel(sourceLabel: string, targetLabel: string, existingLabel: string): string {
  const combined = `${sourceLabel} ${targetLabel}`.toLowerCase();
  const hasExisting = existingLabel.trim().length > 2;

  if (isDatabaseLike(targetLabel) || isStorageLike(targetLabel)) {
    if (hasExisting) return existingLabel;
    if (/(user|member|account|profile)/i.test(combined)) return 'INSERT / UPDATE users{}';
    if (/(order|booking|reservation)/i.test(combined)) return 'INSERT orders{userId, items[]}';
    if (/(product|inventory|stock)/i.test(combined)) return 'UPDATE products{qty: int}';
    if (/(payment|invoice|billing)/i.test(combined)) return 'INSERT payments{amount: float}';
    if (/(session|token|auth)/i.test(combined)) return 'SET session{token: string}';
    if (/(log|event|audit)/i.test(combined)) return 'INSERT events{type, payload: JSON}';
    return 'INSERT / UPDATE {data: object}';
  }

  if (isDatabaseLike(sourceLabel) || isStorageLike(sourceLabel)) {
    if (hasExisting) return existingLabel;
    if (/(user|member|account|profile)/i.test(combined)) return 'SELECT users[] → User[]';
    if (/(order|booking)/i.test(combined)) return 'SELECT orders WHERE id → Order';
    if (/(product|inventory)/i.test(combined)) return 'SELECT products WHERE id → Product[]';
    return 'SELECT rows → typed result';
  }

  if (hasExisting) return existingLabel;
  if (/(validate|check)/i.test(combined)) return 'payload: RequestDTO';
  if (/(transform|map|parse)/i.test(combined)) return 'raw → typed DTO';
  if (/(api|service)/i.test(combined)) return 'POST body: JSON';
  return 'data: object';
}

function getNodeLabel(nodes: Node<CustomNodeData>[], nodeId: string) {
  return nodes.find((node) => node.id === nodeId)?.data.label || nodeId;
}

function getEdgeLabel(edge: Edge) {
  const data = edge.data as { label?: string } | undefined;
  return data?.label;
}

function normalizeEntityName(value: string) {
  const cleaned = normalizeWhitespace(value.replace(/[_-]+/g, ' ').replace(/\s*\([^)]*\)/g, ''));
  if (!cleaned) {
    return 'Component';
  }
  return cleaned
    .split(' ')
    .map((part) => (part.length > 1 ? part.charAt(0).toUpperCase() + part.slice(1) : part.toUpperCase()))
    .join(' ');
}

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'component';
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildScenarioName(content: string, index: number) {
  const normalized = normalizeWhitespace(content.replace(/[`#>*_-]/g, ' '));
  if (!normalized) {
    return `Flow ${index}`;
  }
  return normalized.length > 56 ? `${normalized.slice(0, 56)}…` : normalized;
}

function extractDocumentTitle(md: string) {
  const heading = md.split('\n').find((line) => line.trim().startsWith('#'));
  return heading ? heading.replace(/^#+/, '').trim() : undefined;
}

export function generateMarkdown(nodes: Node<CustomNodeData>[], edges: Edge[], scenarios: Scenario[]): string {
  let md = '# Nodes\n';
  nodes.forEach((node) => {
    md += `- [${node.id}] ${node.data.label} (${node.data.colorName || node.data.color}, ${node.data.icon})\n`;
  });

  md += '\n# Edges\n';
  edges.forEach((edge) => {
    const labelString = edge.data?.label ? ` : ${edge.data.label}` : '';
    md += `- ${edge.source} -> ${edge.target}${labelString}\n`;
  });

  md += '\n# Scenarios\n';
  scenarios.forEach((scenario) => {
    md += `- ${scenario.name}: ${scenario.path.join(' -> ')}\n`;
  });

  return md;
}
