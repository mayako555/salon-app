import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDemoData,demoSummary,demoAiReply,DEMO_MONTH} from '../demo/data';
import {isDemoPath} from '../demo/route';
import {isPublicAuthPath} from '../auth-transition';
test('demo path boundary never makes production authentication optional',()=>{
 for(const p of ['/demo','/demo/'])assert.equal(isDemoPath(p),true);
 for(const p of ['/dashboard','/demo-admin','/demographics','/api/demo','/sales?demo=true'])assert.equal(isDemoPath(p),false);
 assert.equal(isPublicAuthPath('/dashboard'),false);assert.equal(isPublicAuthPath('/demo'),false);
});
test('fixtures contain a full year, reconcile every month, and reset independently',()=>{
 const a=createDemoData(),b=createDemoData();
 assert.equal(new Set(a.reservations.map(r=>r.date.slice(0,7))).size,12);assert.ok(a.customers.length>=1000);assert.ok(a.reservations.length>3000);
 assert.deepEqual(a,b);a.customers[0].name='changed';assert.notEqual(a.customers[0].name,b.customers[0].name);
 assert.ok(b.customers.every(c=>c.phone.includes('XXXX')&&!('line_user_id' in c)));
 const now=demoSummary(b.reservations,b.expenses),prev=demoSummary(b.reservations,b.expenses,'2026-08');
 assert.equal(now.revenue,2420000);assert.equal(prev.revenue,2500000);assert.equal(now.cost,1362800);assert.equal(now.profit,1057200);assert.equal(now.visits,310);assert.equal(prev.visits,320);assert.equal(now.newVisits,100);assert.equal(prev.newVisits,100);
 for(const m of new Set(b.reservations.map(r=>r.date.slice(0,7)))) {
  const rows=b.reservations.filter(r=>r.date.startsWith(m));const summary=demoSummary(b.reservations,b.expenses,m);
  assert.equal(rows.reduce((s,r)=>s+r.amount,0),summary.revenue);assert.ok(rows.every(r=>r.amount>0&&b.customers.some(c=>c.id===r.customerId)));
 }
});
test('demo edits affect local summaries without touching the original fixture',()=>{
 const data=createDemoData();const current=data.reservations.find(r=>r.date.startsWith(DEMO_MONTH))!;const before=demoSummary(data.reservations,data.expenses);current.status='キャンセル';assert.equal(demoSummary(data.reservations,data.expenses).visits,before.visits-1);assert.equal(demoSummary(createDemoData().reservations,data.expenses).visits,before.visits);
 assert.match(demoAiReply('なぜ売上が下がった？'),/3.2%/);assert.match(demoAiReply('LINE'),/実際のLINE送信は行いません/);
});
test('demo modules contain no production service imports or network clients',()=>{
 for(const file of ['src/lib/demo/data.ts','src/components/demo/DemoApp.tsx','src/app/demo/page.tsx','src/lib/demo/evaluations.ts','src/components/demo/DemoEvaluations.tsx','src/components/demo/DemoAnalytics.tsx','src/components/demo/DemoPayroll.tsx','src/app/evaluations/shared.ts']) {
  const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/from\s+['"][^'"]*(?:firebase|auth-context|actions|line-delivery|accounting)/);assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage)\b/);
 }
 const boundary=readFileSync('src/components/layout/RuntimeShell.tsx','utf8');assert.match(boundary,/dynamic\(\(\)=>import/);assert.match(boundary,/isDemoPath\(pathname\)/);
 const config=readFileSync('next.config.ts','utf8');assert.match(config,/source: '\/demo\/:path\*'/);assert.match(config,/connect-src 'none'/);assert.match(config,/form-action 'none'/);
});


test('demo evaluations reuse production scoring and reset without shared mutations',async()=>{
 const {createDemoEvaluations}=await import('../demo/evaluations');
 const {calculateDynamicScore}=await import('../../app/evaluations/shared');
 const data=createDemoData();const records=createDemoEvaluations(data.staff);
 assert.equal(records.length,9);
 for(const row of records){
  const calculated=calculateDynamicScore(row.snapshot!.template,row.auto_metrics,row.manager_raw_scores);
  assert.deepEqual(row.calculated_scores,calculated.calculated_scores);
  assert.equal(row.rank,calculated.rank);
  assert.ok(data.staff.some(s=>s.id===row.staff_id));
 }
 const first=records[0];first.comments='changed';first.manager_raw_scores[first.snapshot!.template.managerItems[0].id]=1;
 const reset=createDemoEvaluations(data.staff);
 assert.notEqual(reset[0].comments,'changed');
 assert.notDeepEqual(reset[0].manager_raw_scores,first.manager_raw_scores);
});
