# Foto ke Elemen (Auto Trace) + AM Preset Finder

Dua alat untuk Alight Motion dalam satu proyek.

## 1. Foto ke Elemen (`index.html`)

Masukkan satu foto, semua objeknya ditelusuri (auto trace) jadi shape vektor terpisah, ditulis sebagai XML proyek Alight Motion yang bisa langsung diunggah lewat "Unggah file XML" di app tersebut.

Cara kerja: warna foto dikelompokkan (color quantization), lalu tiap area warna ditelusuri konturnya dan dihaluskan - pakai algoritma dari [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) (Unlicense/domain publik), divendor langsung di `vendor_imagetracer.js` supaya tidak perlu koneksi internet.

Format XML: dokumen `<scene>` Alight Motion, tiap objek jadi `<shape>` dengan `<path d="...">` langsung (dikonfirmasi dari file export asli Alight Motion). Tiap shape punya `location` di pusat bounding box-nya sendiri dan path relatif ke titik itu, kurva diratakan jadi garis lurus karena dukungan kurva "Q" di Alight Motion belum terkonfirmasi. Sudah divalidasi: render ulang dari XML identik dengan foto aslinya. Kualitas tracing dinaikkan supaya warna dan bentuk setia ke foto asli - jumlah elemen dibatasi longgar (maks ~700) hanya untuk mencegah file terlalu besar.

File: `index.html`, `style.css`, `script.js`, `vendor_imagetracer.js` (pustaka pihak ketiga, domain publik).

## 2. AM Preset Finder (`preset-finder.html`)

Tempel link TikTok yang berisi preset Alight Motion - caption video, bio akun, dan link di bio dipindai otomatis cari link preset (Drive, Mega, Mediafire, .xml, dsb). Tampilan gelap ("glass morph hitam kaca") permanen, tidak ikut tema perangkat.

**Batasan penting:** TikTok tidak mengizinkan komentar & balasan dibaca otomatis tanpa API resmi/login. Komentar harus ditempel manual di kotak "Tempel komentar" - tetap dipindai otomatis cari link-nya, hanya langkah salin-tempelnya manual.

Fitur ini **butuh server** (tidak bisa 100% di browser seperti alat Foto ke Elemen), karena TikTok memblokir pengambilan data langsung dari JavaScript browser (CORS). Solusinya pakai **Vercel Serverless Function** di folder `api/tiktok.js` - otomatis aktif begitu di-deploy ke Vercel, tidak perlu setup tambahan (asal bukan di-deploy sebagai situs statis murni semacam GitHub Pages, yang tidak mendukung fungsi server).

File: `api/tiktok.js` (fungsi server - ambil halaman TikTok, baca caption+bio, cari link), `preset-finder.html`, `preset-finder.css`, `preset-finder.js`.

**Belum diuji ke TikTok asli** (sandbox pengembangan ini tidak punya akses internet keluar) - kodenya ditulis berdasarkan struktur halaman TikTok yang diketahui publik (`__UNIVERSAL_DATA_FOR_REHYDRATION__` / `SIGI_STATE`), dengan fallback pemindaian teks mentah kalau strukturnya berubah. Coba setelah deploy, kabari kalau ada error.

## Push ke GitHub

```bash
git init
git add .
git commit -m "Foto ke Elemen + AM Preset Finder"
git branch -M main
git remote add origin https://github.com/USERNAME/foto-ke-elemen.git
git push -u origin main
```

## Deploy ke Vercel

Import repo di Vercel, Framework Preset **Other**, tanpa build command. Folder `api/` otomatis dikenali Vercel sebagai serverless function, tidak perlu konfigurasi tambahan.
