import {DEFAULTS,DEFAULT_PAIRS,simulate} from "./physics.mjs";
const $=id=>document.getElementById(id);
const keys=["length","rho","mur","inductance","amp","phase","fmin","fmax","points"];
const colors=["#49e6c6","#ffae65","#95b8ff","#ee83db","#f7df79","#f07880","#74dbec","#b6a4ee","#a2df8a","#e6a5a5"];
let memory=[],active=[],lastError="",graphData=[];
const pairs=structuredClone(DEFAULT_PAIRS);
const numberField=(id)=>Number($(id).value);
function settings(){return Object.fromEntries(keys.map(k=>[k,numberField(k)]));}
function pairCount(){return Number($("connector").value);}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function labelInput(label,type,value,callback,options={}){
  const wrap=el("label");wrap.append(el("span",null,label));
  const node=el(type==="select"?"select":"input");
  if(type==="select"){options.values.forEach(v=>{const o=el("option",null,v.label);o.value=v.value;node.append(o);});node.value=String(value);}
  else {node.type=type;node.value=String(value);if(type==="number"){node.step="any";node.min="0.000001";}}
  node.addEventListener("input",()=>callback(node.value));wrap.append(node);return wrap;
}
function renderPairs(){
  const target=$("pairs");target.replaceChildren();
  for(let i=0;i<pairCount();i++){
    const pair=pairs[i],root=el("div","pair"),head=el("div","pair-head");
    head.append(el("span","pin",`${i+1}+ / ${i+1}−`));
    const state=el("label","pair-state"),toggle=el("input");toggle.type="checkbox";toggle.checked=pair.enabled;
    toggle.addEventListener("change",()=>{pair.enabled=toggle.checked;body.hidden=!pair.enabled;update();});
    state.append(toggle,document.createTextNode("Enabled"));head.append(state);root.append(head);
    const body=el("div","pair-grid");body.hidden=!pair.enabled;
    const change=(key,value)=>{pairs[i][key]=value;update();};
    const driver=labelInput("Driver / channel name","text",pair.name,v=>change("name",v));driver.classList.add("driver");body.append(driver);
    body.append(labelInput("Conductor · mm²","number",pair.size,v=>change("size",Number(v))));
    body.append(labelInput("Driver · Ω","number",pair.ohms,v=>change("ohms",Number(v))));
    body.append(labelInput("Parallel drivers","number",pair.count,v=>change("count",Number(v))));
    root.append(body);target.append(root);
  }
}
function compute(){
  const s=settings();
  return pairs.slice(0,pairCount()).map((p,i)=>p.enabled?{id:i,label:p.name||`Pair ${i+1}`,info:`${s.length}m · ${p.size}mm² · ${p.count}×${p.ohms}Ω`,result:simulate(s,p)}:null).filter(Boolean);
}
function update(){
  try{active=compute();lastError="";$("error").hidden=true;}
  catch(e){active=[];lastError=e.message;$("error").textContent=lastError;$("error").hidden=false;}
  renderStats();renderLegend();draw();
  $("capture").disabled=!active.length||memory.length+active.length>6;
}
const fixed=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):"—";
function renderStats(){
  const target=$("stats");target.replaceChildren();
  if(!active.length){target.append(el("p","empty",lastError||"Enable a valid pair to calculate."));return;}
  const values=[
    ["Pink noise overall",a=>fixed(a.result.pinkDb)+" dB","Equal energy per octave"],
    ["Loss at 1 kHz",a=>fixed(a.result.at1k)+" dB","Voltage attenuation"],
    ["Loss at 20 kHz",a=>fixed(a.result.at20k)+" dB","Voltage attenuation"]
  ];
  for(const [name,fn,sub] of values){
    const card=el("div","stat");
    card.append(el("div","name",name+(active.length>1?" · Pair 1":"")),el("div","value",fn(active[0])),el("div","sub",sub));
    target.append(card);
  }
}
function traces(){
  return [...active.map((a,i)=>({label:`${i+1}+/${i+1}− ${a.label} · live`,samples:a.result.samples,color:colors[i],live:true})),
    ...memory.map((m,i)=>({label:m.label,samples:m.samples,color:colors[4+i],live:false}))];
}
function renderLegend(){
  const node=$("legend");node.replaceChildren();
  for(const trace of traces()){
    const item=el("span","legend-item"),sw=el("span","swatch");sw.style.background=trace.color;
    item.append(sw,document.createTextNode(trace.label));node.append(item);
  }
}
function draw(){
  const canvas=$("chart");const box=canvas.getBoundingClientRect();
  if(box.width<1||box.height<1)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);
  const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
  const w=box.width,h=box.height,l=52,r=18,t=17,b=35,gw=w-l-r,gh=h-t-b;
  ctx.clearRect(0,0,w,h);
  const data=traces(),s=settings(),fmin=s.fmin>0?s.fmin:20,fmax=s.fmax>fmin?s.fmax:20000;
  const losses=data.flatMap(tr=>tr.samples.map(p=>p.db)).filter(Number.isFinite);
  const bottom=Math.min(-1,Math.floor((Math.min(0,...losses)-0.3)/2)*2),top=Math.max(0,Math.ceil((Math.max(0,...losses)+0.3)/2)*2);
  const y=db=>t+(top-db)/(top-bottom)*gh;
  const x=f=>l+Math.log(f/fmin)/Math.log(fmax/fmin)*gw;
  ctx.font="11px system-ui";ctx.textBaseline="middle";ctx.lineWidth=1;
  for(let i=0;i<=5;i++){
    const db=bottom+(top-bottom)*i/5,yy=y(db);ctx.strokeStyle="#244457";ctx.beginPath();ctx.moveTo(l,yy);ctx.lineTo(w-r,yy);ctx.stroke();
    ctx.fillStyle="#89acba";ctx.textAlign="right";ctx.fillText(fixed(db,1),l-9,yy);
  }
  const ticks=[20,50,100,200,500,1000,2000,5000,10000,20000,50000,100000].filter(f=>f>=fmin&&f<=fmax);
  for(const f of ticks){
    const xx=x(f);if(!Number.isFinite(xx))continue;
    ctx.strokeStyle="#18384a";ctx.beginPath();ctx.moveTo(xx,t);ctx.lineTo(xx,h-b);ctx.stroke();
    ctx.fillStyle="#89acba";ctx.textAlign="center";ctx.fillText(f>=1000?`${f/1000}k`:`${f}`,xx,h-17);
  }
  ctx.save();ctx.beginPath();ctx.rect(l,t,gw,gh);ctx.clip();
  for(const trace of data){
    ctx.strokeStyle=trace.color;ctx.lineWidth=trace.live?2.6:1.8;ctx.setLineDash(trace.live?[]:[6,4]);ctx.beginPath();
    let first=true;
    for(const p of trace.samples){
      if(!(p.f>0)||!Number.isFinite(p.db))continue;
      const xx=x(p.f),yy=y(p.db);
      if(first){ctx.moveTo(xx,yy);first=false;}else ctx.lineTo(xx,yy);
    }
    ctx.stroke();
  }
  ctx.restore();ctx.setLineDash([]);
}
function showMemories(){
  const target=$("memories");target.replaceChildren();$("memory-count").textContent=`${memory.length} / 6`;
  if(!memory.length){target.append(el("p","empty","Capture a trace, change your cable settings, and compare the curves."));return;}
  memory.forEach((m,i)=>{
    const row=el("div","memory-row"),sw=el("span","swatch");sw.style.background=colors[4+i];
    const info=el("div","memory-name",m.label);info.append(el("small",null,m.info));
    const button=el("button","remove","Remove");button.type="button";button.setAttribute("aria-label","Remove "+m.label);
    button.onclick=()=>{memory.splice(i,1);showMemories();update();};row.append(sw,info,button);target.append(row);
  });
}
function reset(){
  for(const k of keys)$(k).value=DEFAULTS[k];
  $("connector").value="2";DEFAULT_PAIRS.forEach((p,i)=>Object.assign(pairs[i],p));
  memory=[];renderPairs();showMemories();update();
}
$("connector").addEventListener("change",()=>{renderPairs();update();});
keys.forEach(k=>$(k).addEventListener("input",update));
$("capture").addEventListener("click",()=>{
  if(!active.length||memory.length+active.length>6)return;
  active.forEach(a=>memory.push({label:`Memory ${memory.length+1} · ${a.label}`,info:a.info,samples:a.result.samples.map(p=>({...p}))}));
  showMemories();update();
});
$("clear").addEventListener("click",()=>{memory=[];showMemories();update();});
$("reset").addEventListener("click",reset);
window.addEventListener("resize",draw);
if("ResizeObserver" in window)new ResizeObserver(draw).observe($("chart"));
renderPairs();showMemories();update();
