'use client';
import { useEffect, useRef, useState } from 'react';
import { canvasPoint } from '@/lib/canvas-drawing';
import { appendDrawingHistory, type DrawingDocument, type DrawingMark } from '@/lib/drawing-document';
import { Button } from '@/components/ui/button';
const WIDTH = 900, HEIGHT = 600;
export default function KarteDrawingCanvas({ bgImage, initialDataUrl, initialDocument, onSave }: {
  bgImage?: string; initialDataUrl?: string; initialDocument?: DrawingDocument;
  onSave: (url: string, document: DrawingDocument) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const [history, setHistory] = useState<DrawingMark[][]>([initialDocument?.marks || []]);
  const [position, setPosition] = useState(0);
  const [mode, setMode] = useState<'pen' | 'eraser' | 'text' | 'hand'>('pen');
  const [color, setColor] = useState('#e11d48');
  const [width, setWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [textAt, setTextAt] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState('');
  const active = useRef<{ id: number; mark: Extract<DrawingMark, { points: unknown }> } | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState(false);
  const [savedBackground] = useState(initialDocument?.background ?? initialDataUrl ?? '');
  const background = bgImage ?? savedBackground;
  const marks = history[position];
  function render(list: DrawingMark[], save = false) {
    const target = canvas.current, ctx = target?.getContext('2d'); if (!target || !ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0, WIDTH, HEIGHT);
    const layer = document.createElement('canvas'); layer.width = WIDTH; layer.height = HEIGHT;
    const ink = layer.getContext('2d')!;
    for (const mark of list) {
      ink.globalCompositeOperation = mark.kind === 'eraser' ? 'destination-out' : 'source-over';
      ink.fillStyle = mark.color;
      if (mark.kind === 'text') { ink.font = `${mark.size}px sans-serif`; ink.fillText(mark.text, mark.point.x, mark.point.y); continue; }
      ink.lineWidth = mark.width; ink.strokeStyle = mark.color; ink.lineCap = 'round'; ink.lineJoin = 'round';
      ink.beginPath(); const first = mark.points[0]; if (!first) continue;
      ink.moveTo(first.x, first.y); for (const point of mark.points) ink.lineTo(point.x, point.y);
      if (mark.points.length === 1) { ink.arc(first.x, first.y, mark.width / 2, 0, Math.PI * 2); ink.fill(); } else ink.stroke();
    }
    ctx.drawImage(layer, 0, 0);
    if (save && !imageError && (!background || backgroundImage)) {
      try { onSaveRef.current(target.toDataURL('image/png'), { version: 1, background, marks: list }); }
      catch { setImageError(true); }
    }
  }
  useEffect(() => {
    let live = true; setImageError(false); setBackgroundImage(null);
    if (background) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { if (live) setBackgroundImage(img); }; img.onerror = () => { if (live) setImageError(true); }; img.src = background; }
    return () => { live = false; };
  }, [background]);
  useEffect(() => { render(marks, true); }, [marks, backgroundImage, background]);
  function commit(next: DrawingMark[]) { const result = appendDrawingHistory(history, position, next); setHistory(result.history); setPosition(result.position); }
  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (active.current?.id !== event.pointerId) return;
    const mark = active.current.mark; active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    commit([...marks, mark]);
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2 items-center" aria-label="手書きツール">
      {(['pen', 'eraser', 'text', 'hand'] as const).map((tool, i) => <Button key={tool} type="button" size="sm" variant={mode === tool ? 'default' : 'outline'} onClick={() => setMode(tool)}>{['ペン', '消しゴム', '文字', '移動'][i]}</Button>)}
      <label className="text-xs">色<input aria-label="ペンの色" type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-8 block" /></label>
      <label className="text-xs">太さ<select aria-label="ペンの太さ" className="block border p-1" value={width} onChange={e => setWidth(Number(e.target.value))}>{[2,3,5,8,12].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <Button type="button" size="sm" variant="outline" disabled={position === 0} onClick={() => setPosition(p => p - 1)}>元に戻す</Button>
      <Button type="button" size="sm" variant="outline" disabled={position === history.length - 1} onClick={() => setPosition(p => p + 1)}>やり直す</Button>
      <label className="text-xs">表示倍率<select aria-label="表示倍率" className="block border p-1" value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[1,1.5,2].map(n => <option key={n} value={n}>{n * 100}%</option>)}</select></label>
      <Button type="button" size="sm" variant="outline" onClick={() => { if (confirm('手書きと文字をすべて消去しますか？背景は残ります。')) commit([]); }}>全消去</Button>
    </div>
    {textAt && <div className="flex gap-2"><input autoFocus aria-label="追加する文字" className="border rounded p-2 flex-1 min-w-0" maxLength={200} value={text} onChange={e => setText(e.target.value)} /><Button type="button" onClick={() => { if (text.trim()) commit([...marks, { kind: 'text', point: textAt, text: text.trim(), color, size: 24 }]); setTextAt(null); setText(''); }}>文字を追加</Button><Button type="button" variant="outline" onClick={() => setTextAt(null)}>取消</Button></div>}
    {imageError && <p role="alert" className="text-red-600">背景画像を読み込めません。画像を確認してから保存してください。</p>}
    <div className="overflow-auto max-h-[650px] rounded-2xl border bg-slate-50">
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} style={{ width: `${zoom * 100}%`, maxWidth: 'none', touchAction: mode === 'hand' ? 'auto' : 'none' }}
        onPointerDown={e => { if (!e.isPrimary || e.button !== 0 || mode === 'hand' || active.current) return; e.preventDefault(); const point = canvasPoint(e.currentTarget, e); if (mode === 'text') { setTextAt(point); return; } e.currentTarget.setPointerCapture(e.pointerId); active.current = { id: e.pointerId, mark: { kind: mode, color, width: mode === 'eraser' ? width * 5 : width, points: [point] } }; render([...marks, active.current.mark]); }}
        onPointerMove={e => { if (active.current?.id !== e.pointerId) return; active.current.mark.points.push(canvasPoint(e.currentTarget, e)); render([...marks, active.current.mark]); }}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
    </div>
    <p className="text-xs text-slate-500">ペンを離すと線が区切られます。拡大時は「移動」でスクロールできます。消しゴムは手書き部分だけを消します。{!initialDocument && initialDataUrl ? " 旧形式で保存した画像は背景として扱うため、元の線は消去できません。" : ""}</p>
  </div>;
}
