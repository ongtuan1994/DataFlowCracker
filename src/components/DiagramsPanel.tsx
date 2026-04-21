import React, { useEffect, useState } from 'react';
import { FolderOpen, Save, Trash2, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import { listDiagrams, getDiagram, saveDiagram, deleteDiagram, DiagramSummary } from '../lib/api';
import { ViewMode } from '../lib/markdownParser';

type Props = {
  currentName: string;
  currentContent: string;
  currentViewMode: ViewMode;
  activeDiagramId: string | null;
  onLoad: (id: string, name: string, content: string, viewMode: ViewMode) => void;
  onSaved: (id: string, name: string) => void;
  onClose: () => void;
};

export function DiagramsPanel({ currentName, currentContent, currentViewMode, activeDiagramId, onLoad, onSaved, onClose }: Props) {
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveName, setSaveName] = useState(currentName || 'My Diagram');

  // Keep save name in sync with filename changes (upload new .md)
  useEffect(() => {
    if (currentName) setSaveName(currentName);
  }, [currentName]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setDiagrams(await listDiagrams());
    } catch {
      setError('Cannot connect to API server. Make sure the server is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // Always create a new save — never overwrite
      const d = await saveDiagram(saveName, currentContent, currentViewMode);
      onSaved(d.id, d.name);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
      await load();
    } catch {
      setError('Failed to save diagram.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string) => {
    setError(null);
    try {
      const d = await getDiagram(id);
      onLoad(d.id, d.name, d.content, d.viewMode as ViewMode);
    } catch {
      setError('Failed to load diagram.');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteDiagram(id);
      setConfirmDelete(null);
      if (activeDiagramId === id) onSaved('', '');
      await load();
    } catch {
      setError('Failed to delete diagram.');
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-blue-500" />
            <span className="font-semibold text-gray-800">My Diagrams</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Save section */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-600 font-medium mb-2">Save current diagram</p>
          <div className="flex gap-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Diagram name..."
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleSave}
              disabled={saving || !saveName.trim()}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savedFeedback ? <Check size={14} /> : <Save size={14} />}
              {savedFeedback ? 'Saved!' : saving ? 'Saving...' : 'Save as New'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">Saved diagrams ({diagrams.length})</p>
            <button onClick={load} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <RefreshCw size={13} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
              <RefreshCw size={16} className="animate-spin" /> Loading...
            </div>
          ) : diagrams.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No saved diagrams yet</div>
          ) : (
            <ul className="space-y-2">
              {diagrams.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    activeDiagramId === d.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <button className="flex-1 text-left" onClick={() => handleLoad(d.id)}>
                    <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.viewMode} · {fmt(d.updatedAt)}</p>
                  </button>

                  {confirmDelete === d.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-500 mr-1">Delete?</span>
                      <button onClick={() => handleDelete(d.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
