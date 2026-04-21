import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/diagrams — list all
router.get('/', async (_req: Request, res: Response) => {
  try {
    const diagrams = await prisma.diagram.findMany({
      select: { id: true, name: true, viewMode: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(diagrams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch diagrams' });
  }
});

// GET /api/diagrams/:id — get one with content
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const diagram = await prisma.diagram.findUnique({ where: { id: req.params.id } });
    if (!diagram) return res.status(404).json({ error: 'Not found' });
    res.json(diagram);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch diagram' });
  }
});

// POST /api/diagrams — create new
router.post('/', async (req: Request, res: Response) => {
  const { name, content, viewMode } = req.body as { name: string; content: string; viewMode?: string };
  if (!name || !content) return res.status(400).json({ error: 'name and content are required' });
  try {
    const diagram = await prisma.diagram.create({
      data: { name, content, viewMode: viewMode ?? 'system-architecture' },
    });
    res.status(201).json(diagram);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

// PUT /api/diagrams/:id — update
router.put('/:id', async (req: Request, res: Response) => {
  const { name, content, viewMode } = req.body as { name?: string; content?: string; viewMode?: string };
  try {
    const diagram = await prisma.diagram.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(content && { content }), ...(viewMode && { viewMode }) },
    });
    res.json(diagram);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update diagram' });
  }
});

// DELETE /api/diagrams/:id — delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.diagram.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete diagram' });
  }
});

export default router;
