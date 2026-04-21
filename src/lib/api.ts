const BASE = '/api';

export type DiagramSummary = {
  id: string;
  name: string;
  viewMode: string;
  createdAt: string;
  updatedAt: string;
};

export type Diagram = DiagramSummary & { content: string };

export async function listDiagrams(): Promise<DiagramSummary[]> {
  const res = await fetch(`${BASE}/diagrams`);
  if (!res.ok) throw new Error('Failed to fetch diagrams');
  return res.json();
}

export async function getDiagram(id: string): Promise<Diagram> {
  const res = await fetch(`${BASE}/diagrams/${id}`);
  if (!res.ok) throw new Error('Diagram not found');
  return res.json();
}

export async function saveDiagram(name: string, content: string, viewMode: string): Promise<Diagram> {
  const res = await fetch(`${BASE}/diagrams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content, viewMode }),
  });
  if (!res.ok) throw new Error('Failed to save diagram');
  return res.json();
}

export async function updateDiagram(id: string, patch: Partial<{ name: string; content: string; viewMode: string }>): Promise<Diagram> {
  const res = await fetch(`${BASE}/diagrams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update diagram');
  return res.json();
}

export async function deleteDiagram(id: string): Promise<void> {
  const res = await fetch(`${BASE}/diagrams/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete diagram');
}
