/**
 * Simplified speaker-cable voltage divider, based on the approach in
 * L-Acoustics RS2015 Cable Effects (not a reproduction of measured drivers).
 * Pair loop R=2*rho*l/Aeff; pair X=2*pi*f*Lpair*l.
 * The skin-depth annulus model is an approximation for a solid round conductor.
 * Stranded cable, proximity effect, capacitance and changing speaker impedance
 * are NOT fully represented.
 */
export const DEFAULTS = Object.freeze({
  length:40, rho:1.72e-8, mur:1, inductance:0.5,
  amp:0, phase:0, fmin:20, fmax:20000, points:241
});
export const DEFAULT_PAIRS = [
  {name:"LF",size:4,ohms:8,count:2,enabled:true},
  {name:"HF",size:2.5,ohms:16,count:1,enabled:true},
  {name:"MF",size:2.5,ohms:8,count:1,enabled:true},
  {name:"SUB",size:4,ohms:4,count:1,enabled:true}
];
export const MU0=4*Math.PI*1e-7;
export function validate(settings,pair) {
  for (const key of ["length","rho","mur","fmin","fmax"]) {
    if (!Number.isFinite(settings[key]) || settings[key]<=0) throw Error(key+" must be positive.");
  }
  for (const key of ["inductance","amp"]) {
    if (!Number.isFinite(settings[key]) || settings[key]<0) throw Error(key+" cannot be negative.");
  }
  if(!Number.isFinite(settings.phase)||Math.abs(settings.phase)>=90) throw Error("Load phase must be between −89° and +89°.");
  if(settings.fmax<=settings.fmin) throw Error("Maximum frequency must exceed minimum.");
  if(!Number.isInteger(settings.points)||settings.points<20||settings.points>1000) throw Error("Sample points must be 20–1000.");
  if(!Number.isFinite(pair.size)||pair.size<=0||!Number.isFinite(pair.ohms)||pair.ohms<=0||!Number.isInteger(pair.count)||pair.count<1) throw Error("Driver impedance, size and count must be valid positive values.");
}
export function pointLoss(f,s,pair) {
  const radius=Math.sqrt(pair.size*1e-6/Math.PI);
  const depth=Math.sqrt(s.rho/(Math.PI*MU0*s.mur*f));
  const area=depth>=radius?Math.PI*radius*radius:Math.PI*(radius*radius-(radius-depth)**2);
  const resistance=2*s.rho*s.length/area;
  const reactance=2*Math.PI*f*s.inductance*1e-6*s.length;
  const z=pair.ohms/pair.count;
  const theta=s.phase*Math.PI/180;
  const real=z*Math.cos(theta), imag=z*Math.sin(theta);
  const voltageRatio=z/Math.hypot(real+resistance+s.amp,imag+reactance);
  return {f,db:20*Math.log10(voltageRatio),voltageRatio,resistance,reactance,load:z};
}
export function simulate(s,pair) {
  validate(s,pair);
  const samples=[];
  for(let i=0;i<s.points;i++){
    const f=s.fmin*Math.pow(s.fmax/s.fmin,i/(s.points-1));
    samples.push(pointLoss(f,s,pair));
  }
  // Pink noise: equal input power per logarithmic frequency interval.
  // Integrate power transmission ratio rather than averaging dB.
  let weighted=0;
  for(let i=1;i<samples.length;i++){
    weighted+=(samples[i-1].voltageRatio**2+samples[i].voltageRatio**2)/2;
  }
  weighted/=samples.length-1;
  const pinkDb=10*Math.log10(weighted);
  return {samples,pinkDb,at1k:pointLoss(1000,s,pair).db,at20k:pointLoss(20000,s,pair).db,
    loopOhms:2*s.rho*s.length/(pair.size*1e-6),load:pair.ohms/pair.count};
}
