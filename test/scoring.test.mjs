import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mean,delta,achievement,score} from '../scoring.mjs';
test('missing scores remain missing while zero is valid',()=>{assert.equal(delta(null,80),null);assert.equal(delta(0,80),80);assert.equal(mean([]),null);assert.equal(mean([0,4]),2)});
test('achievement rejects zero target and preserves overachievement',()=>{assert.equal(achievement(10,0),null);assert.equal(achievement(120,100),120);assert.equal(achievement(-1,100),null)});
test('objective test scoring uses the instrument key',()=>assert.equal(score({type:'pre',questions:[{key:1},{key:0}]},[1,1]),50));
