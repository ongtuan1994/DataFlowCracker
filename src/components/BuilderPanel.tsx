import React, { useState } from 'react';
import { Node } from '@xyflow/react';
import { Plus, X } from 'lucide-react';

interface BuilderPanelProps {
  nodes: Node[];
  onAddNode: (id: string, label: string, color: string, icon: string) => void;
  onAddEdge: (source: string, target: string, label: string) => void;
  onAddScenario: (name: string, path: string[]) => void;
  onClose: () => void;
}

const COLORS = ['blue', 'green', 'purple', 'orange', 'red', 'gray'];
const ICONS = ['Smartphone', 'Store', 'BarChart', 'Code', 'Database', 'Server', 'Globe', 'User', 'Laptop', 'Circle', 'Cloud', 'Lock', 'Mail', 'MessageSquare', 'Activity'];

export function BuilderPanel({ nodes, onAddNode, onAddEdge, onAddScenario, onClose }: BuilderPanelProps) {
  const [nodeId, setNodeId] = useState('');
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeColor, setNodeColor] = useState('blue');
  const [nodeIcon, setNodeIcon] = useState('Circle');

  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');

  const [scenarioName, setScenarioName] = useState('');
  const [scenarioPath, setScenarioPath] = useState('');

  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 flex flex-col max-h-[90vh] overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center z-10">
        <h3 className="font-semibold text-gray-700">Visual Builder</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>
      
      <div className="p-4 flex flex-col gap-6 overflow-y-auto">
        {/* Add Node */}
        <div className="flex flex-col gap-3">
          <h4 className="font-medium text-sm text-gray-800 border-b pb-1">Add Node</h4>
          <input className="text-sm border rounded px-3 py-2" placeholder="ID (e.g. web)" value={nodeId} onChange={e => setNodeId(e.target.value)} />
          <input className="text-sm border rounded px-3 py-2" placeholder="Label (e.g. Web Server)" value={nodeLabel} onChange={e => setNodeLabel(e.target.value)} />
          <div className="flex gap-2">
            <select className="text-sm border rounded px-3 py-2 flex-1" value={nodeColor} onChange={e => setNodeColor(e.target.value)}>
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="text-sm border rounded px-3 py-2 flex-1" value={nodeIcon} onChange={e => setNodeIcon(e.target.value)}>
              {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <button 
            className="bg-blue-50 text-blue-600 text-sm font-medium py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
            onClick={() => {
              if(nodeId && nodeLabel) {
                onAddNode(nodeId, nodeLabel, nodeColor, nodeIcon);
                setNodeId(''); setNodeLabel('');
              }
            }}
          >
            <Plus size={16} /> Add Node
          </button>
        </div>

        {/* Add Edge */}
        <div className="flex flex-col gap-3">
          <h4 className="font-medium text-sm text-gray-800 border-b pb-1">Add Edge</h4>
          <div className="flex gap-2">
            <select className="text-sm border rounded px-3 py-2 flex-1 w-1/2" value={edgeSource} onChange={e => setEdgeSource(e.target.value)}>
              <option value="">Source...</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.data.label as string} ({n.id})</option>)}
            </select>
            <select className="text-sm border rounded px-3 py-2 flex-1 w-1/2" value={edgeTarget} onChange={e => setEdgeTarget(e.target.value)}>
              <option value="">Target...</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.data.label as string} ({n.id})</option>)}
            </select>
          </div>
          <input className="text-sm border rounded px-3 py-2" placeholder="Method/Data (e.g. POST /api)" value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)} />
          <button 
            className="bg-blue-50 text-blue-600 text-sm font-medium py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
            onClick={() => {
              if(edgeSource && edgeTarget) {
                onAddEdge(edgeSource, edgeTarget, edgeLabel);
                setEdgeSource(''); setEdgeTarget(''); setEdgeLabel('');
              }
            }}
          >
            <Plus size={16} /> Add Edge
          </button>
        </div>

        {/* Add Scenario */}
        <div className="flex flex-col gap-3">
          <h4 className="font-medium text-sm text-gray-800 border-b pb-1">Add Scenario</h4>
          <input className="text-sm border rounded px-3 py-2" placeholder="Name (e.g. User Login)" value={scenarioName} onChange={e => setScenarioName(e.target.value)} />
          <input className="text-sm border rounded px-3 py-2" placeholder="Path (e.g. mobile,api,db)" value={scenarioPath} onChange={e => setScenarioPath(e.target.value)} />
          <p className="text-[10px] text-gray-500 leading-tight">Comma-separated Node IDs</p>
          <button 
            className="bg-blue-50 text-blue-600 text-sm font-medium py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
            onClick={() => {
              if(scenarioName && scenarioPath) {
                onAddScenario(scenarioName, scenarioPath.split(',').map(s => s.trim()));
                setScenarioName(''); setScenarioPath('');
              }
            }}
          >
            <Plus size={16} /> Add Scenario
          </button>
        </div>
      </div>
    </div>
  );
}
