import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAccountingText, parseYayoiImport } from '../yayoi-import';
function row(account='通信費', flag='2000') {
 const cells=Array(27).fill(''); Object.assign(cells,{0:flag,3:'2026/01/01',4:account,8:'2090',10:'普通預金',14:'2090',16:'月額サービス'});
 return cells.map(c=>`"${c}"`).join(',');
}
test('CP932 Japanese survives decoding; UTF-8/BOM also supported',()=>{
 assert.equal(decodeAccountingText(Uint8Array.from([0x92,0xca,0x90,0x4d,0x94,0xef])),'通信費');
 assert.equal(decodeAccountingText(new TextEncoder().encode('\uFEFF通信費')),'通信費');
 assert.throws(()=>decodeAccountingText(Uint8Array.from([0x81])));
});
test('expenses are candidates, deposits excluded, unknown/payroll/compound rows held',()=>{
 const rows=parseYayoiImport([row(),row('普通預金'),row('給料賃金'),row('独自科目'),row('通信費','2110')].join('\n'))!;
 assert.deepEqual(rows.map(r=>r.classification),['経費','対象外','要確認','要確認','要確認']);
 assert.equal(rows[0].description,'月額サービス');assert.equal(rows[0].source,'yayoi');
});
test('damaged Japanese, invalid dates/amounts, malformed columns fail closed',()=>{
 assert.throws(()=>parseYayoiImport(row('\uFFFD')));
 assert.throws(()=>parseYayoiImport(row().replace('2026/01/01','2026/02/30')));
 assert.throws(()=>parseYayoiImport(row().replace('2090','oops')));
 assert.throws(()=>parseYayoiImport(row()+',extra'));
 assert.equal(parseYayoiImport('日付,金額\n2026-01-01,100'),null);
});

test('re-upload keeps row identities across line endings; identical transactions within a file stay distinct',()=>{
 const first=parseYayoiImport([row(),row()].join('\n'))!;
 const again=parseYayoiImport([row(),row()].join('\r\n')+'\r\n')!;
 assert.deepEqual(first.map(r=>r.import_key),again.map(r=>r.import_key));
 assert.notEqual(first[0].import_key,first[1].import_key);
});
