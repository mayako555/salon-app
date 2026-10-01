import {test} from 'node:test';
import assert from 'node:assert/strict';
import {menuCategory,groupMenuCategories} from '../menu-category';
test('menu category gives combined named treatments priority and preserves unknowns',()=>{
 assert.equal(menuCategory('アンドヘルシー フラットラッシュ＋パーマ'),'アンドヘルシー');
 assert.equal(menuCategory('&Healthy 120本'),'アンドヘルシー');
 assert.equal(menuCategory('まつ毛エクステ 100本'),'まつ毛エクステ');
 assert.equal(menuCategory('まつげパーマ'),'まつ毛パーマ');
 assert.equal(menuCategory('パリジェンヌラッシュリフト'),'まつ毛パーマ');
 assert.equal(menuCategory('エクステ＋パーマ'),'複合メニュー');
 assert.equal(menuCategory('メニュー未設定'),'その他・未分類');
});
test('category grouping preserves counts and revenue without mutating source records',()=>{
 const rows=[{menu:'エクステ100本',count:2,revenue:14000},{menu:'フラットラッシュ',count:3,revenue:24000},{menu:'パーマ',count:1,revenue:6500}];
 const grouped=groupMenuCategories(rows);
 assert.deepEqual(grouped[0],{menu:'まつ毛エクステ',count:5,revenue:38000});
 assert.equal(grouped.reduce((s,r)=>s+r.count,0),6);
 assert.equal(grouped.reduce((s,r)=>s+r.revenue,0),44500);
 assert.equal(rows[0].menu,'エクステ100本');
});
