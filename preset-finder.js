const $=s=>document.querySelector(s);
const URL_RE=/https?:\/\/[^\s"'<>\)\]]+/g;

function linkRow(l){
  const div=document.createElement('div');
  div.className='lk'+(l.preset?' preset':'');
  const safe=document.createElement('span');safe.textContent=l.url;
  div.innerHTML=`<div class="u"><b>${l.source}</b></div>`;
  div.querySelector('.u').appendChild(safe);
  const a=document.createElement('a');a.className='open';a.href=l.url;a.target='_blank';a.rel='noopener noreferrer nofollow';a.textContent='Buka Link';
  div.appendChild(a);
  return div;
}

function renderLinks(container,list){
  container.innerHTML='';
  if(!list.length){const p=document.createElement('p');p.className='empty';p.textContent='Tidak ada link ditemukan.';container.appendChild(p);return}
  list.sort((a,b)=>(b.preset?1:0)-(a.preset?1:0));
  list.forEach(l=>container.appendChild(linkRow(l)));
}

async function go(){
  const url=$('#link').value.trim();
  $('#err').textContent='';
  if(!/tiktok\.com/i.test(url)){$('#err').textContent='Masukkan link TikTok yang valid.';return}
  $('#result').classList.add('hide');
  $('#loading').classList.remove('hide');
  $('#go').disabled=true;
  try{
    const r=await fetch('/api/tiktok?url='+encodeURIComponent(url));
    const data=await r.json();
    if(!data.ok) throw new Error(data.error||'Gagal memindai');
    $('#rname').textContent=data.authorName||'(tanpa nama)';
    $('#rurl').textContent=data.tiktokUrl||url;
    $('#checked').innerHTML=['caption','bio akun','link di bio'].map(k=>{
      const on = k==='caption'?!!data.caption:k==='bio akun'?!!data.bio:!!data.bioLink;
      return `<span class="badge${on?' on':''}">${on?'✓ ':''}${k}</span>`;
    }).join('')+'<span class="badge">komentar: tempel manual ↓</span>';
    renderLinks($('#links'),data.links||[]);
    $('#note').textContent=data.note||'';
    $('#result').classList.remove('hide');
  }catch(e){
    $('#err').textContent=e.message||'Terjadi kesalahan saat memindai.';
  }finally{
    $('#loading').classList.add('hide');
    $('#go').disabled=false;
  }
}
$('#go').onclick=go;
$('#link').addEventListener('keydown',e=>{if(e.key==='Enter')go()});

$('#scanManual').onclick=()=>{
  const text=$('#manual').value;
  const found=(text.match(URL_RE)||[]).map(url=>({url:url.replace(/[.,;!?]+$/,''),source:'komentar (tempel manual)',preset:/\.xml|\.zip|drive\.google|mega\.nz|mediafire|dropbox\.com|preset/i.test(url)}));
  renderLinks($('#manualLinks'),found);
};
