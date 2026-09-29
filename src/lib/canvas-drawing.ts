export type CanvasPointer = { pointerId: number; clientX: number; clientY: number; button: number; isPrimary: boolean };

export function canvasPoint(canvas: HTMLCanvasElement, pointer: Pick<CanvasPointer, "clientX" | "clientY">) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (pointer.clientX - rect.left) * canvas.width / rect.width,
    y: (pointer.clientY - rect.top) * canvas.height / rect.height,
  };
}

/** One pointer owns each stroke; lifting or cancelling never joins the next stroke. */
export function createCanvasDrawing() {
  let active: { id: number; x: number; y: number } | null = null;
  return {
    start(canvas: HTMLCanvasElement, pointer: CanvasPointer) {
      if (!pointer.isPrimary || pointer.button !== 0 || active) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const point = canvasPoint(canvas, pointer);
      active = { id: pointer.pointerId, ...point };
      canvas.setPointerCapture(pointer.pointerId);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#e11d48";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    move(canvas: HTMLCanvasElement, pointer: CanvasPointer) {
      if (!active || active.id !== pointer.pointerId) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const point = canvasPoint(canvas, pointer);
      ctx.beginPath();
      ctx.moveTo(active.x, active.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      active = { id: pointer.pointerId, ...point };
    },
    end(canvas: HTMLCanvasElement, pointerId: number) {
      if (!active || active.id !== pointerId) return false;
      active = null;
      canvas.getContext("2d")?.beginPath();
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      return true;
    },
  };
}
