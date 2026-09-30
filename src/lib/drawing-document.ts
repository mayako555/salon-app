export type DrawPoint = { x: number; y: number };
export type DrawingMark = { kind: 'pen' | 'eraser'; points: DrawPoint[]; color: string; width: number } | { kind: 'text'; point: DrawPoint; text: string; color: string; size: number };
export type DrawingDocument = { version: 1; background: string; marks: DrawingMark[] };
export function appendDrawingHistory(history: DrawingMark[][], position: number, marks: DrawingMark[]) {
  const next = [...history.slice(0, position + 1), structuredClone(marks)].slice(-60);
  return { history: next, position: next.length - 1 };
}
