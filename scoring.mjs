export function mean(values) { const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v)); return valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : null; }
export function delta(pre,post) { return pre == null || post == null ? null : post-pre; }
export function achievement(actual,target) { return Number.isFinite(actual) && Number.isFinite(target) && actual >= 0 && target > 0 ? actual/target*100 : null; }
export function score(instrument, answers) {
  if (['pre','post'].includes(instrument.type)) return answers.filter((v,i)=>v===instrument.questions[i].key).length/instrument.questions.length*100;
  if(instrument.type==='followup') return mean(answers.map(Number));
  return null;
}
