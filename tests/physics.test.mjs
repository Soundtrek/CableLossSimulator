import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULTS,DEFAULT_PAIRS,simulate,pointLoss} from "../physics.mjs";
const s={...DEFAULTS},p={...DEFAULT_PAIRS[0]};
test("loop resistance includes both conductors: 40m 4mm²",()=>{
  assert.ok(Math.abs(simulate(s,p).loopOhms-0.344)<1e-10);
});
test("zero-length ideal cable has 0 dB loss",()=>{
  const testSettings={...s,length:0.00000001};
  assert.ok(Math.abs(pointLoss(1000,testSettings,p).db)<1e-5);
});
test("higher frequency increases loss for inductive pair",()=>{
  const a=pointLoss(100,s,p).db,b=pointLoss(20000,s,p).db;
  assert.ok(b<a, `${a} / ${b}`);
});
test("thicker conductors reduce low-frequency loss",()=>{
  const thin=simulate(s,{...p,size:1.5}).at1k;
  const thick=simulate(s,{...p,size:10}).at1k;
  assert.ok(thick>thin);
});
test("more parallel drivers produce larger loss",()=>{
  assert.ok(simulate(s,{...p,count:4}).at1k<simulate(s,{...p,count:1}).at1k);
});
test("pink noise weighted summary is between curve extrema",()=>{
  const r=simulate(s,p),values=r.samples.map(v=>v.db);
  assert.ok(r.pinkDb>=Math.min(...values) && r.pinkDb<=Math.max(...values));
});
test("invalid inputs are rejected",()=>{
  assert.throws(()=>simulate({...s,rho:0},p));
  assert.throws(()=>simulate(s,{...p,count:1.5}));
  assert.throws(()=>simulate({...s,fmax:10},p));
});
