# EVITA KATPROF — versi awal lokal

Aplikasi web dengan Node.js 24 dan SQLite, untuk dua prodi (DPDKN/Deck dan DPMKN/Mesin) dan empat jenis evaluasi. Tidak membutuhkan instalasi database terpisah.

Untuk hosting review progres di Vercel, lihat [panduan deployment](DEPLOY-VERCEL.md). Mode cloud memakai database libSQL/Turso; mode lokal tetap memakai SQLite. Konfigurasi Vercel dan konektor database sudah tersedia, tetapi deployment serta koneksi cloud belum diverifikasi sampai akun dan database disiapkan.

## Menjalankan

```powershell
npm.cmd install
npm.cmd start
```

Buka **http://127.0.0.1:3010**. Biarkan terminal server tetap berjalan. Alternatif Windows: klik dua kali `JALANKAN.cmd` setelah Node.js dan dependensi tersedia.

Akun awal dibuat saat server pertama dijalankan. Username `admin` untuk Urmin dan `pimpinan` untuk Kabagkatprof; kata sandi acak ada di `data/akses-awal.txt`. Ganti melalui **Akun & aktivitas**. Berkas akses awal tidak otomatis diperbarui setelah pergantian kata sandi. Jangan membagikan berkas tersebut.

Untuk menentukan kata sandi sebelum database pertama kali dibuat, gunakan `ADMIN_PASSWORD` dan `LEADER_PASSWORD` pada environment. Mengubah environment ini tidak mengubah akun pada database yang sudah ada.

## Uji alur

1. Masuk sebagai admin. Buka **Peserta & angkatan**, tambahkan angkatan untuk salah satu prodi, lalu tambahkan peserta beserta identitas atasan.
2. Klik **Undang**, pilih Pre Test dan pengisi peserta, lalu buat tautan/QR. Buka tautan di tab baru.
3. Isi jawaban, periksa ringkasan pengiriman, lalu kirim final. Nomor tanda terima ditampilkan. Draf dapat disimpan di browser, tetapi berkas perlu dipilih ulang.
4. Buat undangan Post Test. Hasil dan delta terlihat pada **Hasil evaluasi**. Muat ulang halaman admin untuk mengambil kiriman terbaru.
5. Buat undangan Pasca Diklat untuk peserta dan atasan secara terpisah. Nilai masing-masing ditampilkan terpisah dengan skala contoh 1–5.
6. Coba evaluasi Kinerja: uraian, indikator kuantitatif opsional, dan unggahan bukti. Berkas yang didukung: PDF/PNG/JPEG, maksimal 2 berkas × 1 MB. Evaluasi Kinerja tidak diberi skor numerik keseluruhan secara otomatis.
7. Admin membuka detail hasil, membaca pertanyaan, jawaban, dan bukti lalu menulis catatan pemeriksaan.
8. Admin menerbitkan kesimpulan pada **Laporan & rekomendasi**. Keluar dan masuk sebagai pimpinan untuk memberi rekomendasi.

## Instrumen

Delapan instrumen bawaan adalah **CONTOH**, bukan instrumen resmi client. Jangan menggunakan hasil contoh untuk menentukan kelulusan sebenarnya.

Admin dapat mengubah judul dan daftar pertanyaan lewat **Instrumen evaluasi** menggunakan formulir. Tambahkan atau hapus pertanyaan, atur urutannya dengan tombol panah, isi pilihan jawaban, dan tandai jawaban yang benar. Pratinjau tersedia sebelum penyimpanan. Setiap soal pilihan ganda memiliki 2–6 pilihan; setiap instrumen maksimal 100 pertanyaan. Pasca Diklat menggunakan skala 1–5, sedangkan Kinerja menggunakan jawaban uraian. Pengguna tidak perlu mengisi kode atau JSON.

Setiap perubahan menghasilkan versi baru. Undangan lama tetap memakai versi saat dibuat. Tanda instrumen resmi merupakan pernyataan admin, bukan verifikasi eksternal. Skala Pasca Diklat masih tetap 1–5; rubrik lain, bobot, soal uraian Pre/Post, ambang kelulusan, kategori peningkatan, dan penanganan butir tidak berlaku perlu disesuaikan setelah instrumen resmi diterima.

Pre/Post dinilai 0–100 dengan bobot sama per soal. Delta hanya dihitung apabila pasangan nilai tersedia pada keikutsertaan yang sama. Capaian indikator kinerja adalah realisasi/target × 100%; target wajib positif. Tidak ada pembatasan otomatis pada 100%. Indikator semakin-kecil-semakin-baik belum mempunyai metode khusus.

## Mengakses dari ponsel melalui QR

Secara bawaan server hanya menerima koneksi dari komputer ini. `localhost` atau `127.0.0.1` pada ponsel merujuk ponsel itu sendiri.

Untuk uji pada jaringan lokal tepercaya, hentikan server terlebih dahulu lalu atur IP komputer yang sebenarnya:

```powershell
$env:HOST='0.0.0.0'
$env:PUBLIC_URL='http://IP-KOMPUTER:3010'
npm.cmd start
```

Ganti `IP-KOMPUTER` dengan IPv4 komputer pada jaringan Wi-Fi yang sama. Izinkan firewall hanya pada jaringan yang dibutuhkan. Buat ulang tampilan QR setelah mengubah PUBLIC_URL; jangan gunakan contoh alamat sebagai URL sebenarnya.

Undangan menggunakan token acak, berlaku 7 hari, dan hanya menerima satu pengiriman. Pemegang tautan dapat mengisi penugasan tersebut; **versi ini belum memverifikasi identitas dengan OTP/akun peserta**. Jangan sebarkan QR secara publik. Kontrol jadwal pembelajaran, pencabutan undangan, pembukaan ulang pengiriman, serta koreksi jawaban belum tersedia melalui antarmuka.

## Data, laporan, dan batas versi awal

- Seluruh data dan bukti berada dalam `data/evita.sqlite`; data persisten setelah server dimatikan.
- Untuk cadangan sederhana, hentikan server dengan benar lalu salin seluruh folder `data` ke lokasi cadangan yang aman. Jangan menghapus folder tersebut untuk memperbarui kode.
- Ekspor CSV pada **Hasil evaluasi** mencakup perbandingan Pre/Post dan dapat dibuka di Excel. Ekspor bukti dan seluruh jawaban secara massal belum tersedia.
- **Cetak / Simpan PDF** memakai dialog cetak browser. Laporan berisi kesimpulan Urmin dan rekomendasi pimpinan; tabel rekap menampilkan nilai terkini, belum berupa snapshot bertanda tangan elektronik.
- Header menggunakan simbol EVITA dari lampiran di kiri, teks di kanan simbol. Logo Korpolairud belum tersedia dan diganti penanda teks sementara.
- Admin dapat menghapus angkatan dan peserta pada **Peserta & angkatan**, jawaban pada **Hasil evaluasi**, serta laporan pada **Laporan & rekomendasi**. Konfirmasi menampilkan dampaknya dan meminta mengetik HAPUS. Data dipindahkan ke **Akun & aktivitas → Data terhapus** dan dapat dipulihkan. Menghapus angkatan juga menghapus data terkait; menghapus peserta tetap mempertahankan laporan angkatan sehingga kesimpulannya perlu diperiksa ulang. Menghapus hasil evaluasi membatalkan undangan untuk penilaian itu. Tidak ada penghapusan permanen melalui antarmuka ini.
- Pemulihan dilakukan sekaligus beserta data terkait. Bila identitas/nomor internal sudah dipakai oleh data baru atau data induknya belum dipulihkan, pemulihan dibatalkan tanpa menimpa data yang ada. Edit profil dan impor massal belum tersedia.
- Aplikasi ini untuk uji lokal/pilot. Sebelum produksi diperlukan HTTPS, verifikasi responden, aturan penilaian resmi, kebijakan bukti/retensi, pemulihan akun, dan pengujian operasional instansi. Bila memakai reverse proxy HTTPS, atur `COOKIE_SECURE=1` dan teruskan Host publik dengan benar.

## Pengujian

```powershell
npm.cmd test
```

Pengujian integrasi menjalankan server pada port 3019 menggunakan database sementara, bukan data aplikasi. Mencakup pembatasan peran, penilaian, pasangan nilai, pemisahan alumni/atasan, pengiriman ganda, versi instrumen, laporan, dan rekomendasi.

Variabel opsional: `PORT` (3010), `HOST` (127.0.0.1), `PUBLIC_URL` (alamat undangan), `DATA_DIR` (lokasi database), `COOKIE_SECURE` (1 untuk HTTPS).

