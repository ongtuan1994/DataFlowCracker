import { useCallback, useEffect, useState } from 'react';
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

import { CustomNode } from './CustomNode';
import { AnimatedEdge } from './AnimatedEdge';
import { Scenario } from '../../lib/markdownParser';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

interface FlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  activeScenario: Scenario | null;
  animationSpeed: number;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

function FlowCanvasInner({ 
  initialNodes, 
  initialEdges, 
  activeScenario,
  animationSpeed,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp
}: FlowCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { fitView } = useReactFlow();

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

    // Determine which edges are part of the scenario path
    const pathEdges = new Set<string>();
    for (let i = 0; i < activeScenario.path.length - 1; i++) {
      const source = activeScenario.path[i];
      const target = activeScenario.path[i + 1];
      pathEdges.add(`${source}-${target}`);
    }

    setEdges(eds => eds.map(e => {
      const isPathEdge = pathEdges.has(`${e.source}-${e.target}`);
      return {
        ...e,
        data: {
          ...e.data,
          isAnimating: isPathEdge,
          animationSpeed,
          particleColor: isPathEdge ? '#3b82f6' : '#e5e7eb'
        }
      };
    }));
  }, [activeScenario, animationSpeed]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const newNodes = applyNodeChanges(changes, nodes);
      setNodes(newNodes);
      onNodesChangeProp?.(newNodes);
    },
    [nodes, onNodesChangeProp]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const newEdges = applyEdgeChanges(changes, edges);
      setEdges(newEdges);
      onEdgesChangeProp?.(newEdges);
    },
    [edges, onEdgesChangeProp]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge({ ...params, type: 'animated', data: { isAnimating: false } }, edges);
      setEdges(newEdges);
      onEdgesChangeProp?.(newEdges);
    },
    [edges, onEdgesChangeProp]
  );

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
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

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
