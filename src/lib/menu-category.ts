/** Display-only suggestions. Existing menu records are never rewritten. */
export function menuCategory(name:string):string {
 const n=name.normalize('NFKC').toLowerCase();
 if(/アンドヘルシー|&healthy|＆healthy|and\s*healthy/.test(n))return 'アンドヘルシー';
 const extensions=/エクステ|エクステンション|まつエク|マツエク|フラットラッシュ|ボリュームラッシュ|バインドロック/.test(n);
 const perm=/パーマ|パリジェンヌ|ラッシュリフト|カール/.test(n);
 if(extensions&&perm)return '複合メニュー';
 if(extensions)return 'まつ毛エクステ';
 if(perm)return 'まつ毛パーマ';
 if(/眉|アイブロウ|ブロウ/.test(n))return '眉・アイブロウ';
 return 'その他・未分類';
}
export function groupMenuCategories(rows:{menu:string;count:number;revenue:number}[]) {
 const groups=new Map<string,{menu:string;count:number;revenue:number}>();
 for(const row of rows){const name=menuCategory(row.menu),g=groups.get(name)||{menu:name,count:0,revenue:0};g.count+=row.count;g.revenue+=row.revenue;groups.set(name,g);}
 return [...groups.values()].sort((a,b)=>b.count-a.count);
}
