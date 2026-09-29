import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INDUSTRIES, readIndustryForms, defaultIndustryForms, validateIndustryForms, templateById, cleanFormAnswers } from '../industry-forms';
import { validateIntakeSubmission, validIntakeSession } from '../intake-validation';
import { appendDrawingHistory, type DrawingMark } from '../drawing-document';
test('existing tenants keep eyelash forms; every industry has separate record and intake forms', () => {
  assert.deepEqual(readIndustryForms(undefined), defaultIndustryForms('eyelash'));
  for (const i of INDUSTRIES) {
    const config = validateIndustryForms(defaultIndustryForms(i.id));
    assert.equal(templateById(config.karteTemplateId, 'karte').industry, i.id);
    assert.equal(templateById(config.counselingTemplateId, 'counseling').industry, i.id);
  }
});
test('invalid industry and wrong-kind template are rejected', () => {
  assert.throws(() => validateIndustryForms({ ...defaultIndustryForms(), industry: 'invalid' }));
  assert.throws(() => validateIndustryForms({ ...defaultIndustryForms(), karteTemplateId: 'hair-counseling-v1' }));
});
test('mixed salon selection works and snapshots do not mutate catalog', () => {
  const config = validateIndustryForms({ ...defaultIndustryForms('hair'), counselingTemplateId: 'general-counseling-v1' });
  assert.equal(config.industry, 'hair');
  const snapshot = templateById(config.karteTemplateId, 'karte'); snapshot.fields[0].label = 'old label';
  assert.notEqual(templateById(config.karteTemplateId, 'karte').fields[0].label, 'old label');
});
test('answers only preserve defined fields and reject oversized or object values', () => {
  const template = templateById('nail-karte-v1', 'karte');
  const answers = cleanFormAnswers(template, { field_1: '  gel  ', companyId: 'other', line_user_id: 'x' });
  assert.equal(answers.field_1, 'gel'); assert.equal(answers.companyId, undefined);
  assert.throws(() => cleanFormAnswers(template, { field_1: {} }));
  assert.throws(() => cleanFormAnswers(template, { field_1: 'x'.repeat(4001) }));
});
test('intake expires at boundary and requires bound tenant/customer', () => {
  assert.equal(validIntakeSession({ companyId: 'a', customerId: 'b', expiresAt: 100 }, 99), true);
  assert.equal(validIntakeSession({ companyId: 'a', customerId: 'b', expiresAt: 100 }, 100), false);
  assert.equal(validIntakeSession({ customerId: 'b', expiresAt: 100 }, 99), false);
});
test('public submission requires consent and never accepts injected identity fields', () => {
  const template = templateById('hair-counseling-v1', 'counseling');
  const input = { name: 'Test', phone: '09012345678', consent: true, answers: { field_1: 'cut' }, companyId: 'attacker', customer_id: 'other', line_user_id: 'fake' };
  const clean = validateIntakeSubmission(template, input);
  assert.deepEqual(Object.keys(clean).sort(), ['answers','respondent','service_types','signature_url','submitted_profile']);
  assert.throws(() => validateIntakeSubmission(template, { ...input, consent: false }));
});
test('undo followed by a stroke discards redo branch and copies points', () => {
  const mark: DrawingMark = { kind: 'pen', color: '#000', width: 3, points: [{ x: 1, y: 2 }] };
  const a = appendDrawingHistory([[]], 0, [mark]);
  mark.points[0].x = 50;
  assert.equal((a.history[1][0] as typeof mark).points[0].x, 1);
  const b = appendDrawingHistory(a.history, 0, []);
  assert.equal(b.history.length, 2); assert.deepEqual(b.history[1], []);
});
