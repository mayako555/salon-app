// Entirely fabricated, deterministic fixtures. No user, database, environment or service imports.
export const DEMO_STORE='SALON AGENT DEMO 神戸店';
export const DEMO_DATE='2026-09-30';
export const DEMO_MONTH='2026-09';
export const DEMO_TARGET=2600000;
export type DemoCustomer={id:string;name:string;phone:string;visits:number;total:number;lastVisit:string;line:boolean};
export type DemoStaff={id:string;name:string;role:string;color:string};
export type DemoReservation={id:string;date:string;time:string;customerId:string;customerName:string;staffId:string;menu:string;amount:number;isNew:boolean;status:'予約済み'|'来店済み'|'キャンセル'};
export type DemoExpense={id:string;date:string;category:string;amount:number;memo:string};
export const DEMO_STAFF:DemoStaff[]=[{id:'demo-staff-1',name:'山田 花子',role:'店長',color:'#6366f1'},{id:'demo-staff-2',name:'佐藤 美咲',role:'スタイリスト',color:'#10b981'},{id:'demo-staff-3',name:'田中 彩',role:'スタイリスト',color:'#f59e0b'}];
export const DEMO_MENUS=[{name:'まつげパーマ',price:6500},{name:'まつエク 100本',price:7800},{name:'眉スタイリング',price:5500},{name:'まつげ＋眉セット',price:11000}];
const surnames=['青空','花咲','月野','星原','春川','森丘','朝陽','桜庭','若葉','風見','水野','藤森','白川','小春','橘','中村','松田','井上','西村','木村'];
const given=['あかり','美月','結衣','葵','さくら','真央','遥','七海','紬','美緒','優花','莉子','琴音','陽菜','杏','和花','心春','楓','沙織','恵'];
const totals=[1810000,1980000,2270000,1890000,2010000,2230000,2180000,2350000,2290000,2440000,2500000,2420000];
const counts=[240,255,285,245,258,285,278,300,293,312,320,310];
export function createDemoData() {
 const customers:DemoCustomer[]=[], reservations:DemoReservation[]=[],expenses:DemoExpense[]=[];
 for(let month=0;month<12;month++) {
  const d=new Date(Date.UTC(2025,9+month,1));const key=d.toISOString().slice(0,7);const days=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  const newCount=month===0 ? counts[month] : 100;const oldCount=customers.length;
  for(let c=0;c<newCount;c++) {const i=customers.length;customers.push({id:`demo-customer-${i+1}`,name:`${surnames[i%surnames.length]} ${given[Math.floor(i/surnames.length)%given.length]}`,phone:`090-XXXX-${String(i+1).padStart(4,'0')}`,visits:0,total:0,lastVisit:'',line:i%4!==0});}
  const raw=Array.from({length:counts[month]},(_,i)=>DEMO_MENUS[i%4].price);const sum=raw.reduce((a,b)=>a+b,0);let allocated=0;
  for(let i=0;i<counts[month];i++) {
   const customer=customers[i<newCount ? oldCount+i : (i*17)%Math.max(1,oldCount)];
   const day=1+Math.floor(i*days/counts[month]);const amount=i===counts[month]-1 ? totals[month]-allocated : Math.round(raw[i]/sum*totals[month]);allocated+=amount;
   const date=`${key}-${String(day).padStart(2,'0')}`;const hour=9+Math.floor((i%12)/3)*2;
   reservations.push({id:`demo-res-${month}-${i}`,date,time:`${String(hour).padStart(2,'0')}:00`,customerId:customer.id,customerName:customer.name,staffId:DEMO_STAFF[i%3].id,menu:DEMO_MENUS[i%4].name,amount,isNew:i<newCount,status:date===DEMO_DATE ? '予約済み':'来店済み'});
   customer.visits++;customer.total+=amount;customer.lastVisit=date;
  }
  const costs=[['人件費',720000],['家賃',220000],['材料費',Math.round(totals[month]*.09)],['広告費',125000],['水道光熱費',38000],['通信費',14000],['その他',28000]] as const;
  costs.forEach(([category,amount],i)=>expenses.push({id:`demo-exp-${month}-${i}`,date:`${key}-25`,category,amount,memo:`${category}（サンプル）`}));
 }
 return {customers,reservations,expenses,staff:DEMO_STAFF.map(s=>({...s}))};
}
export function demoSummary(reservations:DemoReservation[],expenses:DemoExpense[],month=DEMO_MONTH) {
 const rows=reservations.filter(r=>r.date.startsWith(month)&&r.status!=='キャンセル');const revenue=rows.reduce((s,r)=>s+r.amount,0);const cost=expenses.filter(e=>e.date.startsWith(month)).reduce((s,e)=>s+e.amount,0);
 return {revenue,cost,profit:revenue-cost,visits:rows.length,newVisits:rows.filter(r=>r.isNew).length,repeatVisits:rows.filter(r=>!r.isNew).length,average:rows.length?Math.round(revenue/rows.length):0};
}
export function demoAiReply(question:string) {
 if(/LINE|フォロー|改善|提案|対策/.test(question)) return '来店後7日以内のLINEフォローをご提案します。特に新規のお客様に、施術後のお手入れと次回来店の目安をお伝えするとよいでしょう。対象リスト作成・配信の操作体験もできます。デモのため実際のLINE送信は行いません。';
 if(/スタッフ|担当/.test(question)) return 'スタッフ別の売上・担当件数は「スタッフ分析」で確認できます。指名数だけでなく、新規のお客様への次回提案やフォロー状況も一緒に見ることをおすすめします。';
 if(/経費|利益/.test(question)) return '経費は家賃や人件費などの固定費と、材料費などの変動費に分けて確認できます。デモの9月は売上242万円、経費136万2,800円、差額は105万7,200円です。これは税金等を含まない概算です。';
 return 'デモの9月売上は242万円で、前月250万円から3.2%減少しています。来店数は320件から310件へ減少しました。新規来店は両月100件で変わらず、再来のお客様の来店数が220件から210件に減っています。分析シナリオでは、新規客の30日以内再来率も42%から34%へ8ポイント低下しています。来店後7日以内のフォローをおすすめします。';
}
