const $=s=>document.querySelector(s);
let els=[],CW=0,CH=0,base='foto',bg='#ffffff',fsize=0,xmlAll='';
const CAN=1080,SEG=800,DUR=5000;
const pad=n=>String(n).padStart(3,'0');
const esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const tick=()=>new Promise(r=>setTimeout(r,0));

function handle(f){
  if(!f||!f.type.startsWith('image/'))return;
  fsize=f.size;base=f.name.replace(/\.[^.]+$/,'')||'foto';
  const u=URL.createObjectURL(f),im=new Image();
  $('#drop').classList.add('busy');$('#dt').textContent='Auto trace…';$('#ds').textContent=f.name;
  im.onload=()=>{$('#orig').src=u;setTimeout(async()=>{
    try{await run(im)}catch(e){console.error(e);$('#dt').textContent='Gagal memproses foto';$('#ds').textContent='Coba foto lain'}
    $('#drop').classList.remove('busy')},40)};
  im.onerror=()=>{$('#drop').classList.remove('busy');$('#dt').textContent='File bukan foto yang valid';$('#ds').textContent='Pilih JPG, PNG, atau WebP'};
  im.src=u;
}
$('#file').onchange=e=>{handle(e.target.files[0]);e.target.value=''};
const dz=$('#drop');
['dragover','dragenter'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('over')}));
['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('over')}));
dz.addEventListener('drop',e=>handle(e.dataTransfer.files[0]));
dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#file').click()}});

function rgbToHex(r,g,b){return '#'+[r,g,b].map(v=>(+v).toString(16).padStart(2,'0')).join('')}

// ---- auto trace: kuantisasi warna + telusuri kontur + kurva (ImageTracer.js) ----
async function run(img){
  const sc=Math.min(1,SEG/Math.max(img.width,img.height));
  const W=Math.max(8,Math.round(img.width*sc)),H=Math.max(8,Math.round(img.height*sc));
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,W,H);
  const imgd=cx.getImageData(0,0,W,H);
  await tick();
  const CAP=260; // batas jumlah elemen supaya tidak lag di Alight Motion
  const presets=[
    {ltres:1,qtres:1,pathomit:6,rightangleenhance:true,colorsampling:2,numberofcolors:16,mincolorratio:0.004,colorquantcycles:3,layering:0,strokewidth:0,linefilter:false,roundcoords:2,viewbox:false,desc:false,blurradius:1,blurdelta:20},
    {ltres:1,qtres:1,pathomit:10,rightangleenhance:true,colorsampling:2,numberofcolors:12,mincolorratio:0.01,colorquantcycles:3,layering:0,strokewidth:0,linefilter:false,roundcoords:2,viewbox:false,desc:false,blurradius:1,blurdelta:20},
    {ltres:1.5,qtres:1.5,pathomit:16,rightangleenhance:true,colorsampling:2,numberofcolors:10,mincolorratio:0.02,colorquantcycles:3,layering:0,strokewidth:0,linefilter:false,roundcoords:2,viewbox:false,desc:false,blurradius:2,blurdelta:24},
    {ltres:2,qtres:2,pathomit:24,rightangleenhance:true,colorsampling:2,numberofcolors:8,mincolorratio:0.03,colorquantcycles:3,layering:0,strokewidth:0,linefilter:false,roundcoords:2,viewbox:false,desc:false,blurradius:2,blurdelta:24},
  ];
  const re=/<path[^>]*?fill="rgb\((\d+),(\d+),(\d+)\)"[^>]*?opacity="([^"]+)"[^>]*?d="([^"]*)"/g;
  let SC=1,options=presets[0];
  for(let p=0;p<presets.length;p++){
    options=presets[p];
    const tracedata=ImageTracer.imagedataToTracedata(imgd,options);
    await tick();
    SC=CAN/Math.max(tracedata.width,tracedata.height);
    CW=Math.round(tracedata.width*SC);CH=Math.round(tracedata.height*SC);
    const svgStr=ImageTracer.getsvgstring(tracedata,{...options,scale:SC,roundcoords:2,viewbox:false});
    els=[];re.lastIndex=0;let m,n=0;
    while((m=re.exec(svgStr))){
      n++;
      els.push({n,color:rgbToHex(m[1],m[2],m[3]),alpha:Math.round(parseFloat(m[4])*255),d:toAmPath(m[5])});
    }
    if(els.length<=CAP||p===presets.length-1)break;
    await tick();
  }
  if(!els.length)throw new Error('kosong');
  bg=els[0].color;
  await render();
}

// path ImageTracer ("M x y L x y Q x y x y Z") -> format Alight Motion ("Mx,y Lx,y Qx,y x,y Z")
function toAmPath(d){
  const tok=d.match(/[MLQZ]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];
  let out=[],i=0;
  while(i<tok.length){
    const c=tok[i];
    if(c==='Z'){out.push('Z');i++;continue}
    if(c==='M'||c==='L'){out.push(c+tok[i+1]+','+tok[i+2]);i+=3;continue}
    if(c==='Q'){out.push('Q'+tok[i+1]+','+tok[i+2]+' '+tok[i+3]+','+tok[i+4]);i+=5;continue}
    i++;
  }
  return out.join(' ');
}

const hx8=(c,a)=>'#'+(a==null?255:a).toString(16).padStart(2,'0').toUpperCase()+c.slice(1).toUpperCase();
const shapeXml=(e,id,parent)=>`  <shape id="${id}"${parent?` parent="${parent}"`:``} label="Elemen ${pad(e.n)}" startTime="0" endTime="${DUR}" fillType="color" mediaFillMode="stretch">
    <transform>
      <location value="0.000000,0.000000,0.000000"/>
    </transform>
    <fillColor value="${hx8(e.color,e.alpha)}"/>
    <parameter>
      <contour d="${e.d}"/>
    </parameter>
  </shape>
`;
const groupXml=(gid,label)=>`  <nullobj id="${gid}" label="${esc(label)}" startTime="0" endTime="${DUR}">
    <transform>
      <location value="0.000000,0.000000,0.000000"/>
    </transform>
  </nullobj>
`;
const sceneXml=(list,title,group)=>{
  const gid=group?1:0,off=group?1:0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<scene title="${esc(title)}" width="${CW}" height="${CH}" exportWidth="${CW}" exportHeight="${CH}" bgcolor="${hx8(bg)}" totalTime="${DUR}" fps="30" modifiedTime="${Date.now()}" amver="1028425" ffver="106" am="com.alightcreative.motion/5.0.273.1028425" amplatform="android">
${group?groupXml(gid,title):''}${list.map((e,i)=>shapeXml(e,i+1+off,group?gid:null)).join('')}</scene>
`;};

async function render(){
  xmlAll=sceneXml(els,base,true);
  $('#res').classList.remove('hide');
  const pv=$('#pv');pv.style.setProperty('--ar',CW/CH);pv.className='stk';
  pv.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}"><rect width="${CW}" height="${CH}" fill="${bg}"/>${els.map(e=>`<path data-n="${e.n}" fill="${e.color}" fill-opacity="${(e.alpha/255).toFixed(3)}" d="${e.d}"/>`).join('')}</svg>`;
  const fmt=b=>b>1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB';
  $('#st').innerHTML=`<span>Elemen: <b>${els.length}</b></span><span>Kanvas: <b>${CW}×${CH}</b></span><span>Foto: <b>${fmt(fsize)}</b></span><span>XML: <b>${fmt(new Blob([xmlAll]).size)}</b></span>`;
  const gr=$('#grid');gr.innerHTML='';
  els.forEach(e=>{
    const b=document.createElement('button');b.className='th';b.title='Elemen '+pad(e.n)+' - unduh XML';
    b.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}"><path fill="${e.color}" fill-opacity="${(e.alpha/255).toFixed(3)}" d="${e.d}"/></svg>`;
    const on=()=>{pv.classList.add('dim');const t=pv.querySelector(`path[data-n="${e.n}"]`);t&&t.classList.add('hl')};
    const off=()=>{pv.classList.remove('dim');pv.querySelectorAll('.hl').forEach(x=>x.classList.remove('hl'))};
    b.onmouseenter=on;b.onfocus=on;b.onmouseleave=off;b.onblur=off;
    b.onclick=()=>save(`${base}-elemen-${pad(e.n)}.xml`,new Blob([sceneXml([e],base+' '+pad(e.n),false)],{type:'application/xml'}));
    gr.appendChild(b);
  });
  $('#dt').textContent='Selesai. Ketuk untuk ganti foto';
  $('#res').scrollIntoView({behavior:'smooth',block:'start'});
}

function save(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
const randName=()=>`xml_yantrace_${Math.floor(10000+Math.random()*90000)}.xml`;
$('#bx').onclick=()=>xmlAll&&save(randName(),new Blob([xmlAll],{type:'application/xml'}));

// ZIP tanpa kompresi (tanpa library)
const T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=u=>{let c=-1;for(let i=0;i<u.length;i++)c=T[(c^u[i])&255]^(c>>>8);return(c^-1)>>>0};
function zip(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0,cs=0;
  for(const f of files){
    const nb=enc.encode(f.name),d=f.data,c=crc(d);
    const l=new DataView(new ArrayBuffer(30));
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(12,33,true);
    l.setUint32(14,c,true);l.setUint32(18,d.length,true);l.setUint32(22,d.length,true);l.setUint16(26,nb.length,true);
    parts.push(l.buffer,nb,d);
    const h=new DataView(new ArrayBuffer(46));
    h.setUint32(0,0x02014b50,true);h.setUint16(4,20,true);h.setUint16(6,20,true);h.setUint16(8,0x0800,true);h.setUint16(14,33,true);
    h.setUint32(16,c,true);h.setUint32(20,d.length,true);h.setUint32(24,d.length,true);h.setUint16(28,nb.length,true);h.setUint32(42,off,true);
    cen.push(h.buffer,nb);cs+=46+nb.length;off+=30+nb.length+d.length;
  }
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:'application/zip'});
}
$('#bz').onclick=()=>{if(!els.length)return;
  const enc=new TextEncoder();
  const files=[{name:'semua-elemen.xml',data:enc.encode(xmlAll)},...els.map(e=>({name:`elemen/${pad(e.n)}.xml`,data:enc.encode(sceneXml([e],base+' '+pad(e.n),false))}))];
  save(base+'-elemen.zip',zip(files));
};
