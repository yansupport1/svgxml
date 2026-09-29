# Foto ke Elemen (Auto Trace)

Masukkan satu foto, semua objeknya ditelusuri (auto trace) jadi shape vektor terpisah, ditulis sebagai XML proyek Alight Motion yang bisa langsung diunggah lewat "Unggah file XML" di app tersebut.

Cara kerja: warna foto dikelompokkan (color quantization), lalu tiap area warna ditelusuri konturnya dan dihaluskan jadi kurva - pakai algoritma dari [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) (Unlicense/domain publik), divendor langsung di `vendor_imagetracer.js` supaya tidak perlu koneksi internet.

Isi:
- `index.html`
- `style.css`
- `script.js` - logika aplikasi
- `vendor_imagetracer.js` - pustaka auto-trace (pihak ketiga, domain publik)

Jalankan: buka `index.html` di browser.

Format XML: dokumen `<scene>` Alight Motion, tiap objek jadi `<shape>` dengan `<parameter><contour d="..."/></parameter>` (path SVG) dan `<fillColor>`.

Push ke GitHub:
```bash
git init
git add .
git commit -m "Foto ke Elemen - Auto Trace"
git branch -M main
git remote add origin https://github.com/USERNAME/foto-ke-elemen.git
git push -u origin main
```
Deploy: import repo di Vercel, Framework Preset **Other**, tanpa build command.
