import {EVALUATION_TEMPLATES,calculateDynamicScore,type EvaluationRole,type StaffEvaluation} from '@/app/evaluations/shared';
import type {DemoStaff} from './data';
export function demoEvaluation(staff:DemoStaff,index:number,quarter:number):StaffEvaluation {
 const role:EvaluationRole=index===0?'manager':index===1?'educator':'general';
 const template=EVALUATION_TEMPLATES[role];
 const auto_metrics=Object.fromEntries(template.autoItems.map(item=>[item.id,item.thresholds[Math.min(quarter===3?0:1,item.thresholds.length-1)].min]));
 const manager_raw_scores=Object.fromEntries(template.managerItems.map((item,i)=>[item.id,Math.min(5,2+quarter+(i+index)%2)]));
 return {id:`demo-eval-${staff.id}-${quarter}`,staff_id:staff.id,evaluator_id:'demo-owner',target_year:2026,target_quarter:quarter,template_id:template.id,auto_metrics,manager_raw_scores,...calculateDynamicScore(template,auto_metrics,manager_raw_scores),status:'finalized',comments:'カウンセリングの提案力が伸びています。次の四半期は再来につながるフォローを習慣化しましょう。',snapshot:{template}};
}
export function createDemoEvaluations(staff:DemoStaff[]) {return staff.flatMap((s,i)=>[1,2,3].map(q=>demoEvaluation(s,i,q)));}
