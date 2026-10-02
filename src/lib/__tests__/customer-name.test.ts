import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanCustomerNameParts,joinedCustomerName} from '../customer-name';
import {validateIntakeSubmission} from '../intake-validation';
import {templateById} from '../industry-forms';
const parts={last_name:' 山田 ',first_name:' 花子 ',last_name_kana:'ヤマダ',first_name_kana:'ハナコ'};
test('separated names preserve each part and full names for existing screens',()=>{
 const clean=cleanCustomerNameParts(parts);
 assert.equal(clean.last_name,'山田');
 assert.deepEqual(joinedCustomerName(clean),{name:'山田 花子',name_kana:'ヤマダ ハナコ'});
 assert.throws(()=>cleanCustomerNameParts({...parts,first_name:' '}));
 assert.throws(()=>cleanCustomerNameParts({...parts,last_name:123}));
});
test('intake stores submitted name parts and uses them for respondent identity',()=>{
 const template=templateById('hair-counseling-v1','counseling');
 const base={name:'old display',phone:'09012345678',answers:{},consent:true};
 const result=validateIntakeSubmission(template,{...base,profile:parts});
 assert.equal(result.respondent.name,'山田 花子');
 assert.equal(result.submitted_profile.first_name_kana,'ハナコ');
 assert.equal(result.submitted_profile.name_kana,'ヤマダ ハナコ');
 assert.equal(validateIntakeSubmission(template,base).respondent.name,'old display');
 assert.throws(()=>validateIntakeSubmission(template,{...base,profile:{last_name:'山田'}}));
});
