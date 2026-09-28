const $=s=>document.querySelector(s);
let els=[],W=0,H=0,base='foto',xmlAll='',fsize=0;
const MAXEL=200,SEG=1280;
const pad=n=>String(n).padStart(3,'0');
const tick=()=>new Promise(r=>setTimeout(r,0));

function handle(f){
  if(!f||!f.type.startsWith('image/'))return;
  fsize=f.size;base=f.name.replace(/\.[^.]+$/,'')||'foto';
  const u=URL.createObjectURL(f),im=new Image();
  $('#drop').classList.add('busy');$('#dt').textContent='Memotong objek…';$('#ds').textContent=f.name;
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

async function run(img){
  els.forEach(e=>URL.revokeObjectURL(e.url));els=[];
  const sc=Math.min(1,SEG/Math.max(img.width,img.height));
  W=Math.max(8,Math.round(img.width*sc));H=Math.max(8,Math.round(img.height*sc));
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,W,H);
  const px=cx.getImageData(0,0,W,H).data; // piksel asli, tidak pernah diubah
  // salinan yang diperhalus HANYA untuk menentukan batas objek
  const cs=document.createElement('canvas');cs.width=W;cs.height=H;
  const cc=cs.getContext('2d',{willReadFrequently:true});
  cc.filter='blur(2px)';cc.drawImage(img,0,0,W,H);cc.filter='none';
  const sp=cc.getImageData(0,0,W,H).data;
  const N=W*H,K=10,lab=new Int16Array(N).fill(-1),st=Math.max(1,Math.floor(N/50000)),idx=[];
  for(let i=0;i<N;i+=st)if(px[i*4+3]>32)idx.push(i);
  if(!idx.length)throw new Error('kosong');
  const lum=i=>sp[i*4]*.3+sp[i*4+1]*.59+sp[i*4+2]*.11;
  idx.sort((a,b)=>lum(a)-lum(b));
  let cen=[];for(let j=0;j<K;j++){const i=idx[Math.floor((j+.5)*idx.length/K)];cen.push([sp[i*4],sp[i*4+1],sp[i*4+2]])}
  const nearest=i=>{const r=sp[i*4],g=sp[i*4+1],b=sp[i*4+2];let best=0,bd=1e9;for(let j=0;j<K;j++){const c=cen[j],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<bd){bd=d;best=j}}return best};
  for(let it=0;it<8;it++){
    const sm=cen.map(()=>[0,0,0,0]);
    for(const i of idx){const j=nearest(i),q=sm[j];q[0]+=sp[i*4];q[1]+=sp[i*4+1];q[2]+=sp[i*4+2];q[3]++}
    cen=cen.map((c,j)=>sm[j][3]?[sm[j][0]/sm[j][3],sm[j][1]/sm[j][3],sm[j][2]/sm[j][3]]:c);
  }
  await tick();
  for(let i=0;i<N;i++)if(px[i*4+3]>32)lab[i]=nearest(i);
  {const nl=lab.slice(),cn=new Uint16Array(K);
    for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
      const i=y*W+x;if(lab[i]<0)continue;cn.fill(0);
      for(let dy=-2;dy<=2;dy++){let p=(y+dy)*W+x-2;for(let dx=-2;dx<=2;dx++,p++){const l=lab[p];if(l>=0)cn[l]++}}
      let b=lab[i],bc=cn[b];for(let j=0;j<K;j++)if(cn[j]>bc){bc=cn[j];b=j}nl[i]=b;
    }
    lab.set(nl);await tick();}
  // wilayah terhubung = satu elemen
  const cid=new Int32Array(N),stack=new Int32Array(N);
  function comps(){
    cid.fill(-1);const out=[];
    for(let i=0;i<N;i++){
      if(lab[i]<0||cid[i]>=0)continue;
      const id=out.length,L=lab[i];let sp2=0,size=0,x0=W,y0=H,x1=0,y1=0;
      stack[sp2++]=i;cid[i]=id;
      while(sp2){
        const p=stack[--sp2],x=p%W,y=(p/W)|0;size++;
        if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
        if(x>0&&cid[p-1]<0&&lab[p-1]===L){cid[p-1]=id;stack[sp2++]=p-1}
        if(x<W-1&&cid[p+1]<0&&lab[p+1]===L){cid[p+1]=id;stack[sp2++]=p+1}
        if(y>0&&cid[p-W]<0&&lab[p-W]===L){cid[p-W]=id;stack[sp2++]=p-W}
        if(y<H-1&&cid[p+W]<0&&lab[p+W]===L){cid[p+W]=id;stack[sp2++]=p+W}
      }
      out.push({id,label:L,size,x0,y0,x1,y1});
    }
    return out;
  }
  // potongan kecil digabung ke tetangga terdekat supaya hasilnya berupa objek utuh
  let min=Math.max(30,Math.round(N/2500)),list;
  for(let pass=0;pass<20;pass++){
    list=comps();
    const small=list.filter(c=>c.size<min||c.size<0.03*(c.x1-c.x0+1)*(c.y1-c.y0+1)).sort((a,b)=>a.size-b.size);
    if(!small.length&&list.length<=MAXEL)break;
    if(!small.length){min=Math.ceil(min*1.5);continue}
    for(const c of small){
      const cnt={};
      for(let y=c.y0;y<=c.y1;y++)for(let x=c.x0;x<=c.x1;x++){
        const p=y*W+x;if(cid[p]!==c.id)continue;
        for(const q of [x>0?p-1:-1,x<W-1?p+1:-1,y>0?p-W:-1,y<H-1?p+W:-1]){
          if(q<0||lab[q]<0||cid[q]===c.id)continue;cnt[lab[q]]=(cnt[lab[q]]||0)+1;
        }
      }
      let best=-1,bc=0;for(const k in cnt)if(cnt[k]>bc){bc=cnt[k];best=+k}
      if(best<0)continue;
      for(let y=c.y0;y<=c.y1;y++)for(let x=c.x0;x<=c.x1;x++){const p=y*W+x;if(cid[p]===c.id)lab[p]=best}
    }
    if(list.length>MAXEL)min=Math.ceil(min*1.3);
    await tick();
  }
  list=comps().sort((a,b)=>b.size-a.size);
  // potong dari foto asli: piksel disalin apa adanya
  for(let n=0;n<list.length;n++){
    const c=list[n],w=c.x1-c.x0+1,h=c.y1-c.y0+1;
    const oc=document.createElement('canvas');oc.width=w;oc.height=h;
    const octx=oc.getContext('2d'),im=octx.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=(c.y0+y)*W+c.x0+x;if(cid[p]!==c.id)continue;
      const o=(y*w+x)*4,q=p*4;im.data[o]=px[q];im.data[o+1]=px[q+1];im.data[o+2]=px[q+2];im.data[o+3]=px[q+3];
    }
    octx.putImageData(im,0,0);
    const blob=await new Promise(r=>oc.toBlob(r,'image/png'));
    els.push({n:n+1,x:c.x0,y:c.y0,w,h,blob,url:URL.createObjectURL(blob)});
    if(n%10===9)await tick();
  }
  await render();
}

async function b64(blob){const u=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
async function buildXml(){
  let o=`<?xml version="1.0" encoding="UTF-8"?>\n<foto lebar="${W}" tinggi="${H}" jumlah="${els.length}">\n`;
  for(const e of els)o+=`  <elemen id="${pad(e.n)}" x="${e.x}" y="${e.y}" lebar="${e.w}" tinggi="${e.h}" format="png" encoding="base64">${await b64(e.blob)}</elemen>\n`;
  return o+'</foto>\n';
}

async function render(){
  xmlAll=await buildXml();
  $('#res').classList.remove('hide');
  const pv=$('#pv');pv.style.setProperty('--ar',W/H);pv.className='stk';pv.innerHTML='';
  const pc=document.createElement('canvas');pc.width=W;pc.height=H;pc.style.cssText='width:100%;height:100%;display:block';pv.appendChild(pc);
  const pctx=pc.getContext('2d');
  await Promise.all(els.map(e=>{e.img=new Image();e.img.src=e.url;return e.img.decode().catch(()=>{})}));
  const draw=h=>{pctx.clearRect(0,0,W,H);for(const e of els){pctx.globalAlpha=h==null||h===e.n?1:.1;pctx.drawImage(e.img,e.x,e.y)}pctx.globalAlpha=1};
  draw(null);
  const fmt=b=>b>1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB';
  $('#st').innerHTML=`<span>Elemen: <b>${els.length}</b></span><span>Ukuran: <b>${W}×${H}</b></span><span>Foto: <b>${fmt(fsize)}</b></span><span>XML: <b>${fmt(new Blob([xmlAll]).size)}</b></span>`;
  const gr=$('#grid');gr.innerHTML='';
  els.forEach(e=>{
    const b=document.createElement('button');b.className='th';b.title='Elemen '+pad(e.n)+' - unduh PNG';
    b.innerHTML=`<img src="${e.url}" alt="Elemen ${pad(e.n)}">`;
    const on=()=>draw(e.n),off=()=>draw(null);
    b.onmouseenter=on;b.onfocus=on;b.onmouseleave=off;b.onblur=off;
    b.onclick=()=>save(`${base}-elemen-${pad(e.n)}.png`,e.blob);
    gr.appendChild(b);
  });
  $('#dt').textContent='Selesai. Ketuk untuk ganti foto';
  $('#res').scrollIntoView({behavior:'smooth',block:'start'});
}

function save(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
$('#bx').onclick=()=>xmlAll&&save(base+'-elemen.xml',new Blob([xmlAll],{type:'application/xml'}));

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
$('#bz').onclick=async()=>{if(!els.length)return;
  const files=[{name:'semua-elemen.xml',data:new TextEncoder().encode(xmlAll)}];
  for(const e of els)files.push({name:`elemen/${pad(e.n)}.png`,data:new Uint8Array(await e.blob.arrayBuffer())});
  save(base+'-elemen.zip',zip(files));
};
