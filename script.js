const $=s=>document.querySelector(s);
let els=[],W=0,H=0,base='foto',xmlAll='',fsize=0;
const MAXEL=350,MAXTHUMB=150,SC=5;

function handle(f){
  if(!f||!f.type.startsWith('image/'))return;
  fsize=f.size;base=f.name.replace(/\.[^.]+$/,'')||'foto';
  const u=URL.createObjectURL(f),im=new Image();
  $('#drop').classList.add('busy');$('#dt').textContent='Memisahkan elemen…';$('#ds').textContent=f.name;
  im.onload=()=>{$('#orig').src=u;setTimeout(()=>{try{run(im)}catch(e){$('#dt').textContent='Gagal memproses foto';$('#ds').textContent='Coba foto lain'}
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

const hex=c=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');

function run(img){
  const sc=200/Math.max(img.width,img.height,1),s=Math.min(1,sc>1?1:sc)||1;
  W=Math.max(8,Math.round(img.width*(sc>1?sc:s)));H=Math.max(8,Math.round(img.height*(sc>1?sc:s)));
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,W,H);
  const px=cx.getImageData(0,0,W,H).data,N=W*H,K=14;
  const idx=[];for(let i=0;i<N;i++)if(px[i*4+3]>32)idx.push(i);
  if(!idx.length)throw 0;
  const lum=i=>px[i*4]*.3+px[i*4+1]*.59+px[i*4+2]*.11;
  idx.sort((a,b)=>lum(a)-lum(b));
  let cen=[];for(let j=0;j<K;j++){const i=idx[Math.floor((j+.5)*idx.length/K)];cen.push([px[i*4],px[i*4+1],px[i*4+2]])}
  const lab=new Int16Array(N).fill(-1);
  for(let it=0;it<7;it++){
    const sm=cen.map(()=>[0,0,0,0]);
    for(const i of idx){
      const r=px[i*4],g=px[i*4+1],b=px[i*4+2];let best=0,bd=1e9;
      for(let j=0;j<K;j++){const c=cen[j],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<bd){bd=d;best=j}}
      lab[i]=best;const q=sm[best];q[0]+=r;q[1]+=g;q[2]+=b;q[3]++;
    }
    cen=cen.map((c,j)=>sm[j][3]?[sm[j][0]/sm[j][3],sm[j][1]/sm[j][3],sm[j][2]/sm[j][3]]:c);
  }
  // komponen terhubung = satu elemen
  const cid=new Int32Array(N);
  const stack=new Int32Array(N);
  function comps(){
    cid.fill(-1);const out=[];
    for(let i=0;i<N;i++){
      if(lab[i]<0||cid[i]>=0)continue;
      const id=out.length,L=lab[i];let sp=0,size=0,x0=W,y0=H,x1=0,y1=0;
      stack[sp++]=i;cid[i]=id;
      while(sp){
        const p=stack[--sp],x=p%W,y=(p/W)|0;size++;
        if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
        if(x>0&&cid[p-1]<0&&lab[p-1]===L){cid[p-1]=id;stack[sp++]=p-1}
        if(x<W-1&&cid[p+1]<0&&lab[p+1]===L){cid[p+1]=id;stack[sp++]=p+1}
        if(y>0&&cid[p-W]<0&&lab[p-W]===L){cid[p-W]=id;stack[sp++]=p-W}
        if(y<H-1&&cid[p+W]<0&&lab[p+W]===L){cid[p+W]=id;stack[sp++]=p+W}
      }
      out.push({id,label:L,size,x0,y0,x1,y1});
    }
    return out;
  }
  // serpihan kecil digabung ke tetangga agar elemen tidak berantakan
  let min=4,list;
  for(let pass=0;pass<16;pass++){
    list=comps();
    const small=list.filter(c=>c.size<min).sort((a,b)=>a.size-b.size);
    if(!small.length&&list.length<=MAXEL)break;
    if(!small.length){min=Math.ceil(min*1.6);continue}
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
    if(pass>2)min=Math.ceil(min*1.25);
  }
  list=comps().sort((a,b)=>b.size-a.size);
  els=list.map((c,n)=>{
    let r=0,g=0,b=0,cnt=0;const E=new Map(),ed=[];
    const inC=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&cid[y*W+x]===c.id;
    const add=(sx,sy,ex,ey)=>{const k=sy*(W+1)+sx;ed.push([sx,sy,ex,ey,0]);let l=E.get(k);if(!l){l=[];E.set(k,l)}l.push(ed.length-1)};
    for(let y=c.y0;y<=c.y1;y++)for(let x=c.x0;x<=c.x1;x++){
      if(!inC(x,y))continue;
      const p=(y*W+x)*4;r+=px[p];g+=px[p+1];b+=px[p+2];cnt++;
      if(!inC(x,y-1))add(x,y,x+1,y);
      if(!inC(x+1,y))add(x+1,y,x+1,y+1);
      if(!inC(x,y+1))add(x+1,y+1,x,y+1);
      if(!inC(x-1,y))add(x,y+1,x,y);
    }
    // telusuri tepi menjadi kontur tertutup (luar + lubang), lalu haluskan jadi kurva
    const f=v=>Math.round(v*SC*10)/10;let d='';
    for(let s=0;s<ed.length;s++){
      if(ed[s][4])continue;
      const pts=[];let e=ed[s],dxp=0,dyp=0;
      while(e&&!e[4]){
        e[4]=1;const dx=e[2]-e[0],dy=e[3]-e[1];
        if(dx!==dxp||dy!==dyp)pts.push([e[0],e[1]]);
        dxp=dx;dyp=dy;
        let nxt=null;
        for(const i of (E.get(e[3]*(W+1)+e[2])||[])){const q=ed[i];if(q[4])continue;if(q[2]-q[0]===-dy&&q[3]-q[1]===dx){nxt=q;break}if(!nxt)nxt=q}
        e=nxt;
      }
      const m=pts.length;if(m<3)continue;
      const mid=i=>{const a=pts[i%m],b2=pts[(i+1)%m];return[(a[0]+b2[0])/2,(a[1]+b2[1])/2]};
      const m0=mid(0);d+=`M${f(m0[0])} ${f(m0[1])}`;
      for(let i=1;i<=m;i++){const q=pts[i%m],mm=mid(i);d+=`Q${f(q[0])} ${f(q[1])} ${f(mm[0])} ${f(mm[1])}`}
      d+='Z';
    }
    return{n:n+1,color:hex([r/cnt,g/cnt,b/cnt]),d,x0:c.x0,y0:c.y0,w:c.x1-c.x0+1,h:c.y1-c.y0+1};
  });
  render();
}

const head=`<svg xmlns="http://www.w3.org/2000/svg" `;
const pad=n=>String(n).padStart(3,'0');
const pth=(e,cls)=>`<path id="elemen-${pad(e.n)}" fill="${e.color}" fill-rule="evenodd" stroke="${e.color}" stroke-width="0.6" stroke-linejoin="round" d="${e.d}"${cls||''}/>`;
const svgWith=(list,cls)=>`${head}viewBox="0 0 ${W*SC} ${H*SC}" width="${W*SC}" height="${H*SC}">\n${list.map(e=>'  '+pth(e,cls)).join('\n')}\n</svg>`;
const fileOf=e=>`<?xml version="1.0" encoding="UTF-8"?>\n${svgWith([e])}\n`;

function render(){
  xmlAll=`<?xml version="1.0" encoding="UTF-8"?>\n${svgWith(els)}\n`;
  $('#res').classList.remove('hide');
  const pv=$('#pv');pv.className='fr';
  pv.innerHTML=svgWith(els,'').replace(/<path id="elemen-(\d+)"/g,'<path data-i="$1" id="elemen-$1"');
  const fmt=b=>b>1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB';
  $('#st').innerHTML=`<span>Elemen: <b>${els.length}</b></span><span>Ukuran: <b>${W*SC}×${H*SC}</b></span><span>Foto: <b>${fmt(fsize)}</b></span><span>XML: <b>${fmt(new Blob([xmlAll]).size)}</b></span>`;
  const gr=$('#grid');gr.innerHTML='';
  els.slice(0,MAXTHUMB).forEach(e=>{
    const b=document.createElement('button');b.className='th';b.title='Elemen '+pad(e.n)+' - unduh';
    b.innerHTML=`<svg viewBox="${(e.x0-1)*SC} ${(e.y0-1)*SC} ${(e.w+2)*SC} ${(e.h+2)*SC}">${pth(e)}</svg>`;
    const on=()=>{pv.classList.add('dim');const t=pv.querySelector('#elemen-'+pad(e.n));t&&t.classList.add('hl')};
    const off=()=>{pv.classList.remove('dim');pv.querySelectorAll('.hl').forEach(x=>x.classList.remove('hl'))};
    b.onmouseenter=on;b.onfocus=on;b.onmouseleave=off;b.onblur=off;
    b.onclick=()=>save(`${base}-elemen-${pad(e.n)}.svg`,new Blob([fileOf(e)],{type:'image/svg+xml'}));
    gr.appendChild(b);
  });
  if(els.length>MAXTHUMB){const p=document.createElement('div');p.className='hint';p.style.gridColumn='1/-1';p.textContent=`+${els.length-MAXTHUMB} elemen lain ada di file XML dan ZIP`;gr.appendChild(p)}
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
    const nb=enc.encode(f.name),d=enc.encode(f.text),c=crc(d);
    const l=new DataView(new ArrayBuffer(30));
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(8,0,true);l.setUint16(10,0,true);l.setUint16(12,33,true);
    l.setUint32(14,c,true);l.setUint32(18,d.length,true);l.setUint32(22,d.length,true);l.setUint16(26,nb.length,true);l.setUint16(28,0,true);
    parts.push(l.buffer,nb,d);
    const h=new DataView(new ArrayBuffer(46));
    h.setUint32(0,0x02014b50,true);h.setUint16(4,20,true);h.setUint16(6,20,true);h.setUint16(8,0x0800,true);h.setUint16(10,0,true);h.setUint16(12,0,true);h.setUint16(14,33,true);
    h.setUint32(16,c,true);h.setUint32(20,d.length,true);h.setUint32(24,d.length,true);h.setUint16(28,nb.length,true);h.setUint32(42,off,true);
    cen.push(h.buffer,nb);cs+=46+nb.length;off+=30+nb.length+d.length;
  }
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:'application/zip'});
}
$('#bz').onclick=()=>{if(!els.length)return;
  const files=[{name:'semua-elemen.xml',text:xmlAll},...els.map(e=>({name:`elemen/${pad(e.n)}.svg`,text:fileOf(e)}))];
  save(base+'-elemen.zip',zip(files));
};
