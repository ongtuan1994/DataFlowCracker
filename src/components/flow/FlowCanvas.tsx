import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  Connection,
  addEdge,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';

import { CustomNode } from './CustomNode';
import { AnimatedEdge } from './AnimatedEdge';
import { Scenario } from '../../lib/markdownParser';

const nodeTypes = { custom: CustomNode };
const edgeTypes = { animated: AnimatedEdge };

const EXPORT_PADDING = 48;

export type FlowCanvasHandle = { exportPng: (filename?: string) => void };

interface FlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  activeScenario: Scenario | null;
  animationSpeed: number;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  exportFnRef?: React.MutableRefObject<((filename: string) => void) | null>;
}

function FlowCanvasInner({
  initialNodes,
  initialEdges,
  activeScenario,
  animationSpeed,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  containerRef,
  exportFnRef,
}: FlowCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { fitView, getNodes, getViewport, setViewport } = useReactFlow();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 100);
  }, [initialNodes, initialEdges, fitView]);

  useEffect(() => {
    if (!activeScenario) {
      setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isAnimating: false } })));
      return;
    }
    const pathEdges = new Set<string>();
    for (let i = 0; i < activeScenario.path.length - 1; i++) {
      pathEdges.add(`${activeScenario.path[i]}-${activeScenario.path[i + 1]}`);
    }
    setEdges(eds => eds.map(e => {
      const isPathEdge = pathEdges.has(`${e.source}-${e.target}`);
      return { ...e, data: { ...e.data, isAnimating: isPathEdge, animationSpeed, particleColor: isPathEdge ? '#3b82f6' : '#e5e7eb' } };
    }));
  }, [activeScenario, animationSpeed]);

  // Register full-diagram export function into the ref so outer forwardRef can call it
  useEffect(() => {
    if (!exportFnRef) return;
    exportFnRef.current = (filename: string) => {
      const el = containerRef?.current;
      if (!el) return;

      const allNodes = getNodes();
      if (!allNodes.length) return;

      // Compute bounding box in flow coordinates
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      allNodes.forEach(n => {
        const w = (n.measured?.width ?? 220);
        const h = (n.measured?.height ?? 60);
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      });

      const contentW = Math.ceil(maxX - minX + EXPORT_PADDING * 2);
      const contentH = Math.ceil(maxY - minY + EXPORT_PADDING * 2);

      // Save original viewport and container styles
      const savedViewport = getViewport();
      const savedW = el.style.width;
      const savedH = el.style.height;
      const savedOverflow = el.style.overflow;
      const savedPosition = el.style.position;

      // Hide UI chrome
      const controls = el.querySelector('.react-flow__controls') as HTMLElement | null;
      const attribution = el.querySelector('.react-flow__attribution') as HTMLElement | null;
      const minimap = el.querySelector('.react-flow__minimap') as HTMLElement | null;
      [controls, attribution, minimap].forEach(e => { if (e) e.style.visibility = 'hidden'; });

      // Expand container to full content dimensions and set viewport so all nodes are visible
      el.style.width = contentW + 'px';
      el.style.height = contentH + 'px';
      el.style.overflow = 'visible';
      el.style.position = 'relative';

      setViewport({ x: EXPORT_PADDING - minX, y: EXPORT_PADDING - minY, zoom: 1 }, { duration: 0 });

      // Wait two frames: one for setViewport to apply, one for paint
      requestAnimationFrame(() => requestAnimationFrame(() => {
        toPng(el, {
          backgroundColor: '#f8fafc',
          pixelRatio: 2,
          width: contentW,
          height: contentH,
          style: { overflow: 'visible' },
        })
          .then(dataUrl => {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            a.click();
          })
          .finally(() => {
            // Restore everything
            el.style.width = savedW;
            el.style.height = savedH;
            el.style.overflow = savedOverflow;
            el.style.position = savedPosition;
            setViewport(savedViewport, { duration: 0 });
            [controls, attribution, minimap].forEach(e => { if (e) e.style.visibility = ''; });
          });
      }));
    };
  }, [getNodes, getViewport, setViewport, containerRef, exportFnRef]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const newNodes = applyNodeChanges(changes, nodes);
    setNodes(newNodes);
    onNodesChangeProp?.(newNodes);
  }, [nodes, onNodesChangeProp]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const newEdges = applyEdgeChanges(changes, edges);
    setEdges(newEdges);
    onEdgesChangeProp?.(newEdges);
  }, [edges, onEdgesChangeProp]);

  const onConnect = useCallback((params: Connection) => {
    const newEdges = addEdge({ ...params, type: 'animated', data: { isAnimating: false } }, edges);
    setEdges(newEdges);
    onEdgesChangeProp?.(newEdges);
  }, [edges, onEdgesChangeProp]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        attributionPosition="bottom-right"
      >
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const exportFnRef = useRef<((filename: string) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    exportPng: (filename = 'diagram.png') => {
      exportFnRef.current?.(filename);
    },
  }));

  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} containerRef={containerRef} exportFnRef={exportFnRef} />
    </ReactFlowProvider>
  );
});
