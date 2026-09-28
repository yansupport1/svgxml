# Foto ke Elemen

Masukkan satu foto, semua objeknya dipotong jadi bagian terpisah dari foto asli (piksel tidak diubah). Hasil: satu file XML berisi semua elemen, plus PNG transparan tiap elemen di ZIP. Semua proses di browser, tanpa build.

Isi: `index.html`, `style.css`, `script.js`

Format XML: tiap `<elemen>` punya `x`, `y`, `lebar`, `tinggi` (posisi di foto) dan isi PNG base64.

Push ke GitHub:
```bash
git init
git add .
git commit -m "Foto ke Elemen"
git branch -M main
git remote add origin https://github.com/USERNAME/foto-ke-elemen.git
git push -u origin main
```
Deploy: import repo di Vercel, Framework Preset **Other**, tanpa build command.
