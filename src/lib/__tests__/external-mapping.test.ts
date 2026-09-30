import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizedExternalName,resolveExternalStaff,externalStaffName} from '../external-mapping/model';
import {isDuplicateImportedSale} from '../sales-import-normalization';
const staff=[{id:'rumi',name:'佐藤 瑠美'},{id:'other',name:'山田 花子'}];
const aliases=[{externalName:'RUMI',staffId:'rumi'}];
test('explicit staff aliases handle full-width, spaces and case without guessing names',()=>{
 assert.equal(normalizedExternalName(' Ｒｕｍｉ '),'rumi');
 assert.equal(resolveExternalStaff(' rumi ',staff,aliases)?.id,'rumi');
 assert.equal(resolveExternalStaff('RUMI',staff,[]),null);
 assert.equal(resolveExternalStaff('佐藤瑠美',staff,[])?.id,'rumi');
});
test('existing staff IDs win and aliases cannot resolve outside the supplied tenant staff',()=>{
 assert.equal(resolveExternalStaff('RUMI',staff,aliases,'other')?.id,'other');
 assert.equal(resolveExternalStaff('RUMI',[staff[1]],aliases),null);
 assert.equal(resolveExternalStaff('unknown',staff,aliases),null);
 assert.equal(resolveExternalStaff('指名なし',staff,aliases),null);
 assert.equal(resolveExternalStaff('同姓同名',[{id:'a',name:'同姓同名'},{id:'b',name:'同姓 同名'}],[]),null);
});
test('backfilled sales retain import identity when staff display names change',()=>{
 const row={store_name:'Lefite 岡本',date:'2026-09-30',time:'10:00',tech_sales:5000,staff_name:'佐藤 瑠美',external_staff_name:'RUMI',customer_name:'旧表記'};
 assert.equal(externalStaffName(row),'RUMI');
 assert.equal(isDuplicateImportedSale([row],{storeName:'Lefite 岡本',date:row.date,time:row.time,total:5000,staffName:'RUMI',customerName:'別表記'}),true);
});
