// Vercel Serverless Function - jalan di server, bukan di browser (supaya tidak kena blokir CORS TikTok)
// Endpoint: /api/tiktok?url=<link_tiktok>

const URL_RE = /https?:\/\/[^\s"'<>\)\]]+/g;
const PRESET_HINT = /(\.xml|\.zip|drive\.google|mega\.nz|mediafire|dropbox\.com|drv\.tw|linktr\.ee|bit\.ly|s\.id|preset|5\s?mb)/i;

function uniq(arr){ return [...new Map(arr.map(x=>[x.url,x])).values()]; }

function extractLinks(text, source){
  if(!text) return [];
  const found = text.match(URL_RE) || [];
  return found.map(url => ({
    url: url.replace(/[.,;!?]+$/,''),
    source,
    preset: PRESET_HINT.test(url) || PRESET_HINT.test(text.slice(Math.max(0,text.indexOf(url)-40), text.indexOf(url)+40))
  }));
}

async function resolveAndFetch(tiktokUrl){
  const res = await fetch(tiktokUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
    }
  });
  const finalUrl = res.url;
  const html = await res.text();
  return { finalUrl, html };
}

function parseEmbeddedData(html){
  // TikTok menyimpan data halaman di salah satu script tag berikut tergantung versi
  const patterns = [
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
  ];
  for(const re of patterns){
    const m = html.match(re);
    if(m){
      try{ return JSON.parse(m[1]); }catch(e){ /* lanjut coba pola lain */ }
    }
  }
  return null;
}

function digForFields(data){
  // Struktur TikTok berubah-ubah; coba beberapa jalur umum, dengan fallback aman
  let caption = '', authorName = '', bio = '', bioLink = '';
  try{
    const scope = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
      || Object.values(data?.ItemModule || {})[0];
    if(scope){
      caption = scope.desc || '';
      const author = scope.author;
      if(author && typeof author === 'object'){
        authorName = author.nickname || author.uniqueId || '';
        bio = author.signature || '';
        bioLink = author?.bioLink?.link || '';
      }
    }
    if(!authorName){
      const user = Object.values(data?.UserModule?.users || {})[0];
      if(user){
        authorName = user.nickname || user.uniqueId || authorName;
        bio = user.signature || bio;
        bioLink = user?.bioLink?.link || bioLink;
      }
    }
  }catch(e){ /* biarkan apa adanya, fallback regex global tetap jalan */ }
  return { caption, authorName, bio, bioLink };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const tiktokUrl = (req.query && req.query.url) || '';
  if(!tiktokUrl || !/tiktok\.com/i.test(tiktokUrl)){
    res.status(400).json({ ok:false, error: 'Link TikTok tidak valid' });
    return;
  }
  try{
    const { finalUrl, html } = await resolveAndFetch(tiktokUrl);
    const data = parseEmbeddedData(html);
    const { caption, authorName, bio, bioLink } = data ? digForFields(data) : {caption:'',authorName:'',bio:'',bioLink:''};

    let links = [
      ...extractLinks(caption, 'caption'),
      ...extractLinks(bio, 'bio akun'),
      ...(bioLink ? [{ url: bioLink, source: 'link di bio', preset: true }] : []),
    ];
    // fallback: kalau parsing JSON gagal/kosong, scan seluruh HTML cari link mentah (lebih berisik, tapi tetap berguna)
    if(!caption && !bio && !bioLink){
      links = extractLinks(html, 'halaman (fallback)').filter(l => PRESET_HINT.test(l.url));
    }
    links = uniq(links).filter(l => !/tiktok\.com|tiktokcdn|byteoversea|ibyteimg/i.test(l.url));

    res.status(200).json({
      ok: true,
      tiktokUrl: finalUrl,
      caption, authorName, bio, bioLink,
      links,
      note: 'Komentar & balasan tidak bisa dibaca otomatis (dibatasi TikTok) - tempel manual di kotak komentar.'
    });
  }catch(e){
    res.status(500).json({ ok:false, error: 'Gagal mengambil data TikTok: ' + (e && e.message ? e.message : 'unknown') });
  }
};
