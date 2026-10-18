# Deploy EVITA KATPROF ke Vercel

Kode sudah disiapkan untuk static frontend dan satu Node.js Function. Jalankan Node.js **24.x**. Repository: https://github.com/evitakatprof/evita-app. Deployment Vercel dan koneksi database cloud perlu dikonfigurasi sesuai panduan berikut.

## Database dan akun

Buat **database libSQL** pada Turso (pilih libSQL yang kompatibel dengan `@libsql/client`, bukan engine Turso baru). Dapatkan URL database serta token baca/tulis. Isi melalui Vercel Project → Settings → Environment Variables, jangan masukkan ke repository/chat.

| Variabel | Nilai |
|---|---|
| `TURSO_DATABASE_URL` | URL libsql database staging |
| `TURSO_AUTH_TOKEN` | Token baca/tulis database staging |
| `ADMIN_PASSWORD` | Kata sandi admin awal, minimal 12 karakter |
| `LEADER_PASSWORD` | Kata sandi pimpinan awal, minimal 12 karakter dan berbeda dari admin |
| `COOKIE_SECURE` | `1` |
| `PUBLIC_URL` | URL HTTPS Vercel/domain yang stabil, tanpa `/` di akhir; dapat diisi setelah deployment pertama |

Gunakan database kosong terpisah untuk staging. Pada startup pertama, tabel, akun `admin`/`pimpinan`, dan delapan instrumen contoh dibuat otomatis. Password environment hanya untuk inisialisasi akun baru: mengubahnya tidak mereset akun yang sudah ada. Kredensial lokal lama tidak disalin ke cloud.

Data peserta, sesi, hasil, dan bukti disimpan di database online. Versi awal menyimpan bukti kecil di database (maksimal 2 file × 1 MB); penyimpanan objek dapat ditambahkan ketika kebutuhan unggahan meningkat. Batas ini menjaga permintaan formulir di bawah batas payload Vercel setelah encoding.

## Pilihan A — GitHub dan pembaruan otomatis

1. Buat repository privat, lalu push kode proyek. `.gitignore` mengecualikan data lokal, kata sandi, dan dependensi.
2. Di Vercel, **Add New → Project → Import** repository tersebut.
3. Pilih **Framework Preset: Other** dan Root Directory folder proyek ini. `vercel.json` sudah menetapkan build dan output `public`.
4. Tambahkan environment variables di atas untuk environment deployment yang digunakan; atur Node.js 24.x.
5. Deploy. Setelah memperoleh URL, isi `PUBLIC_URL` dan redeploy sebelum membagikan QR.
6. Push pembaruan pada branch yang terhubung untuk deployment berikutnya. URL proyek yang stabil tetap sama; URL preview per deployment dapat berbeda.

Pisahkan database Preview dan Production jika memakai keduanya, agar pengujian branch tidak mengubah data pada URL review utama. Jangan menyetel `TURSO_DATABASE_URL` pada komputer lokal kecuali memang ingin menggunakan database online itu.

## Pilihan B — CLI, tanpa repository dahulu

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
npx.cmd vercel login
npx.cmd vercel link
```

Set environment variables lewat dashboard atau `npx.cmd vercel env add NAMA_VARIABEL`. Setelah terisi:

```powershell
npx.cmd vercel --prod
```

`--prod` menunjuk URL utama proyek Vercel; lingkungan aplikasi ini tetap merupakan staging/review. Tidak ada reset database pada redeploy.

## Verifikasi setelah publikasi

- Buka URL, masuk dengan akun environment cloud.
- Tambahkan angkatan dan peserta uji, buat undangan QR; tautan harus memakai URL HTTPS yang dapat dibuka di ponsel.
- Kirim evaluasi, periksa rekap, dan uji lampiran kecil.
- Deploy ulang perubahan; pastikan akun dan data uji tetap ada.
- Uji akun pimpinan hanya mendapat haknya.

Jangan membagikan password admin untuk review biasa. Akun pimpinan dapat dipakai untuk peninjauan laporan; jika client perlu mencoba administrasi, gunakan akun staging dengan data uji. Verifikasi OTP responden dan pengaturan produksi penuh masih di luar versi awal ini.

## Keterbatasan verifikasi saat ini

Tes lokal memeriksa alur aplikasi, adapter async, dan konfigurasi build. Koneksi database cloud serta deployment Vercel harus diverifikasi setelah akses akun dan environment tersedia. Data/instrumen lokal tidak dimigrasikan otomatis; aplikasi cloud baru memulai instrumen contoh.
