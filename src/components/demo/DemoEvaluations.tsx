'use client';
import {useState} from 'react';
import {Award,ArrowLeft,Plus,ArrowRight} from 'lucide-react';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from 'recharts';
import {calculateDynamicScore,EVALUATION_CATEGORIES_JP,type StaffEvaluation} from '@/app/evaluations/shared';
import {createDemoEvaluations,demoEvaluation} from '@/lib/demo/evaluations';
import type {DemoStaff} from '@/lib/demo/data';
export default function DemoEvaluations({staff}:{staff:DemoStaff[]}) {
 const [records,setRecords]=useState(()=>createDemoEvaluations(staff));
 const [selected,setSelected]=useState<string|null>(null),[edit,setEdit]=useState<StaffEvaluation|null>(null),[notice,setNotice]=useState('');
 const [quarter,setQuarter]=useState(3);
 const rows=selected?records.filter(r=>r.staff_id===selected).sort((a,b)=>a.target_quarter-b.target_quarter):[];
 function open(id:string){const index=staff.findIndex(s=>s.id===id);setEdit(structuredClone(records.find(r=>r.staff_id===id&&r.target_quarter===quarter)||{...demoEvaluation(staff[index],index,quarter),status:'draft'}));}
 return <section className="space-y-6">
  <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-black flex items-center gap-2"><Award className="text-emerald-500"/>スタッフ評価・育成</h2><p className="text-sm text-slate-500 mt-2">キャリアマップに基づく年4回の評価と育成状況の可視化</p></div><label className="text-sm">評価期間<select aria-label="評価期間" value={quarter} onChange={e=>setQuarter(Number(e.target.value))} className="block border rounded-lg p-2 bg-white">{[1,2,3,4].map(q=><option key={q} value={q}>2026年 Q{q}</option>)}</select></label></div>
  <p className="text-xs text-slate-500">架空スタッフの評価サンプルです。本番と同じ評価テンプレート・採点基準を使用し、変更はこのデモ内だけに保持します。</p>
  {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
  {selected?<><Button variant="outline" onClick={()=>setSelected(null)}><ArrowLeft size={16}/>評価一覧へ</Button><Card><CardHeader><CardTitle>{staff.find(s=>s.id===selected)?.name}の成長カルテ</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%" initialDimension={{width:600,height:256}}><LineChart data={rows.map(r=>({name:`Q${r.target_quarter}`,score:r.calculated_scores.total}))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey="score" name="総合点" stroke="#10b981" strokeWidth={3}/></LineChart></ResponsiveContainer></div></CardContent></Card><div className="grid md:grid-cols-3 gap-4">{rows.map(r=><Card key={r.id}><CardHeader><CardTitle>2026年 Q{r.target_quarter}・{r.rank}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-2xl font-bold">{r.calculated_scores.total}点</p><p className="text-sm">自動評価 {r.calculated_scores.auto_total}点 ／ 上長評価 {r.calculated_scores.manager_total}点</p><Badge variant="outline">{r.status==='finalized'?'確定':r.status==='draft'?'下書き':'承認待ち'}</Badge><p className="text-sm text-slate-600">{r.comments}</p><Button variant="outline" onClick={()=>setEdit(structuredClone(r))}>評価詳細を開く</Button></CardContent></Card>)}</div></>:<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{staff.map((s,i)=>{const r=records.find(r=>r.staff_id===s.id&&r.target_quarter===quarter);return <Card key={s.id}><CardContent className="p-5 space-y-5"><div className="flex justify-between gap-2"><h3 className="font-bold text-lg">{s.name}</h3><Badge variant="outline" className="bg-emerald-50 text-emerald-700">{r?`${r.rank} (${r.calculated_scores.total}点)`:'未評価'}</Badge></div><div><p className="text-xs text-slate-400 border-b pb-2 mb-2">キャリアコース</p><div className="flex gap-2"><Badge variant="outline">{i===0?'M1 マネジメント':i===1?'P2 プロフェッショナル':'J2 ジュニア'}</Badge><Badge variant="outline">{r?.snapshot?.template.roleName||s.role}</Badge></div></div><div className="flex gap-2"><Button className="flex-1 bg-slate-900" onClick={()=>open(s.id)}><Plus size={14}/>評価入力</Button><Button variant="outline" className="flex-1" onClick={()=>setSelected(s.id)}>成長カルテ<ArrowRight size={14}/></Button></div></CardContent></Card>;})}</div>}
  <Dialog open={!!edit} onOpenChange={v=>{if(!v)setEdit(null);}}><DialogContent className="sm:max-w-4xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{staff.find(s=>s.id===edit?.staff_id)?.name}・評価入力</DialogTitle><DialogDescription>2026年 Q{edit?.target_quarter} ／ デモ専用。給与・本番評価には反映されません。</DialogDescription></DialogHeader>{edit&&<EvaluationEditor key={edit.id} initial={edit} onSave={row=>{setRecords(old=>[...old.filter(r=>r.id!==row.id),row]);setEdit(null);setNotice('評価を保存しました（デモ）。リロードまたはデモのリセットで初期状態に戻ります。');}}/>}</DialogContent></Dialog>
 </section>;
}
function EvaluationEditor({initial,onSave}:{initial:StaffEvaluation;onSave:(r:StaffEvaluation)=>void}) {
 const [metrics,setMetrics]=useState(initial.auto_metrics),[manager,setManager]=useState(initial.manager_raw_scores),[comments,setComments]=useState(initial.comments);
 const template=initial.snapshot!.template, result=calculateDynamicScore(template,metrics,manager);
 return <form onSubmit={e=>{e.preventDefault();onSave({...initial,auto_metrics:metrics,manager_raw_scores:manager,comments,...result,status:'finalized'});}} className="space-y-5">
  <div className="sticky top-0 bg-emerald-50 border rounded-xl p-4 z-10 flex flex-wrap justify-between gap-3"><strong>総合 {result.rank} ／ {result.calculated_scores.total}点</strong><span className="text-sm">自動評価 {result.calculated_scores.auto_total}点 ＋ 上長評価 {result.calculated_scores.manager_total}点</span></div>
  <h3 className="font-bold">自動評価・定量指標（サンプル値）</h3><div className="grid sm:grid-cols-2 gap-3">{template.autoItems.map(item=><label key={item.id} className="text-sm">{item.label}（{item.unit}）<Input type="number" min={0} step="0.1" required value={metrics[item.id]??0} onChange={e=>{const n=Number(e.target.value);setMetrics(v=>({...v,[item.id]:n}));}}/><span className="text-xs text-slate-500">{result.auto_scores[item.id]}点</span></label>)}</div>
  <h3 className="font-bold">上長評価</h3><div className="grid sm:grid-cols-2 gap-3">{template.managerItems.map(item=><label key={item.id} className="text-sm">{item.label}<span className="block text-xs text-slate-400">{EVALUATION_CATEGORIES_JP[item.category]}</span><select className="border rounded-lg p-2 w-full" value={manager[item.id]??3} onChange={e=>{const n=Number(e.target.value);setManager(v=>({...v,[item.id]:n}));}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}点</option>)}</select></label>)}</div>
  <label className="block text-sm font-bold">育成コメント・次期目標<Textarea value={comments} maxLength={1000} onChange={e=>setComments(e.target.value)} className="mt-2"/></label><div className="flex gap-3"><Button type="button" variant="outline" onClick={()=>onSave({...initial,auto_metrics:metrics,manager_raw_scores:manager,comments,...result,status:'draft'})}>下書き保存（デモ）</Button><Button type="submit">評価を確定（デモ）</Button></div>
 </form>;
}
