import assert from "node:assert/strict";
import test from "node:test";
import { canvasPoint, createCanvasDrawing } from "../canvas-drawing";

function fixture() {
  let from: number[] = [];
  const lines: number[][] = [];
  const captured = new Set<number>();
  const context = {
    beginPath() { from = []; },
    moveTo(x: number, y: number) { from = [x, y]; },
    lineTo(x: number, y: number) { lines.push([...from, x, y]); },
    stroke() {},
  };
  const canvas = {
    width: 600, height: 400,
    getBoundingClientRect: () => ({left: 20, top: 40, width: 300, height: 200}),
    getContext: () => context,
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => captured.delete(id),
  } as unknown as HTMLCanvasElement;
  return { canvas, lines, captured };
}
const pointer = (x: number, y: number, pointerId = 1) => ({ clientX: x, clientY: y, pointerId, button: 0, isPrimary: true });

test("two pen strokes never connect across the lifted interval", () => {
  const {canvas, lines} = fixture();
  const drawing = createCanvasDrawing();
  drawing.start(canvas, pointer(30, 50));
  drawing.move(canvas, pointer(40, 60));
  drawing.end(canvas, 1);
  drawing.move(canvas, pointer(90, 90)); // hovering after lift
  drawing.start(canvas, pointer(100, 100));
  drawing.move(canvas, pointer(110, 110));
  assert.deepEqual(lines, [[20,20,20,20], [20,20,40,40], [160,120,160,120], [160,120,180,140]]);
});

test("display-scaled canvas coordinates match finger and text positions", () => {
  assert.deepEqual(canvasPoint(fixture().canvas, pointer(170,140)), {x:300,y:200});
});

test("cancel or lost capture ends once; unrelated touch cannot move or end the pen", () => {
  const {canvas, lines, captured} = fixture();
  const drawing = createCanvasDrawing();
  drawing.start(canvas, pointer(30,50));
  drawing.start(canvas, {...pointer(80,90,2), isPrimary:false});
  drawing.move(canvas, pointer(90,100,2));
  assert.equal(drawing.end(canvas,2), false);
  assert.equal(captured.has(1), true);
  assert.equal(drawing.end(canvas,1), true);
  assert.equal(drawing.end(canvas,1), false);
  drawing.move(canvas,pointer(100,100));
  assert.equal(lines.length,1);
  assert.equal(captured.size,0);
});
