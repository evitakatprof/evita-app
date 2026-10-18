# Spesifikasi awal EVITA KATPROF

Status: rancangan berdasarkan informasi client; belum merupakan persetujuan aturan operasional. Instrumen resmi dan logo Korpolairud belum diterima. Pertanyaan, bobot, ambang kelulusan, dan jadwal tidak boleh dianggap sudah ditetapkan.

## Tujuan

Mengelola evaluasi peserta Diklat mulai dari kemampuan awal, peningkatan hasil belajar, penerapan kompetensi di satuan kerja, sampai dampak pada kinerja. Urmin Bagkatprof mengadministrasikan, memeriksa, mengolah, dan mendokumentasikan hasil untuk dilaporkan kepada Kabagkatprof sebagai dasar rekomendasi.

## Program dan instrumen

| Prodi | Pre Test | Post Test | Pasca Diklat | Kinerja |
|---|---|---|---|---|
| DPDKN / Deck | Paket tersendiri | Paket tersendiri | Paket tersendiri | Paket tersendiri |
| DPMKN / Mesin | Paket tersendiri | Paket tersendiri | Paket tersendiri | Paket tersendiri |

Setiap instrumen mempunyai versi, status draf/aktif/arsip, indikator kompetensi, dan aturan penilaian. Jawaban yang sudah masuk tetap terikat pada versi instrumen saat pengisian. Pre Test dan Post Test harus memetakan kompetensi yang sepadan; kesamaan pertanyaan mengikuti instrumen resmi.

## Pengguna dan akses

- Peserta/alumni: mengisi identitas, evaluasi yang ditugaskan, serta bukti penerapan dan kinerja sesuai instrumen.
- Atasan langsung: mengisi identitas, hubungan dengan alumni, dan penilaian terpisah sesuai penugasan.
- Admin Urmin Bagkatprof: mengelola prodi, angkatan/Diklat, peserta, atasan, instrumen, jadwal, tautan QR, pemeriksaan, rekap, laporan, dan dokumentasi.
- Kabagkatprof: membaca laporan dan memberikan rekomendasi. Rancangan awal menyediakan akses akun; mekanisme persetujuan final perlu disepakati.

QR merupakan pintu masuk ke evaluasi, bukan bukti identitas. Rancangan akses menggunakan undangan bertoken dengan masa berlaku, terkait Diklat, responden, dan jenis evaluasi. Hak akses peserta, atasan, dan admin diperiksa di server. Bentuk verifikasi identitas responden perlu diputuskan sebelum produksi.

## Alur operasional

1. Admin membuat Diklat/angkatan, memilih prodi, peserta, dan instrumen resmi.
2. Admin mengaktifkan periode evaluasi dan menghasilkan tautan serta QR peserta/atasan.
3. Responden membuka QR melalui kamera ponsel, memverifikasi identitas, dan mengisi formulir yang ditugaskan.
4. Isian dapat disimpan sebagai draf. Pengiriman final memvalidasi kelengkapan; perubahan setelah pengiriman harus tercatat dan mengikuti kebijakan admin.
5. Sistem menilai komponen objektif menurut kunci yang ditetapkan. Jawaban uraian dan bukti diperiksa petugas sesuai rubrik.
6. Admin memeriksa kelengkapan, mengolah hasil, serta menyusun kesimpulan dan usulan tindak lanjut.
7. Admin menerbitkan laporan kepada Kabagkatprof; rekomendasi dicatat dan diarsipkan bersama hasil evaluasi.

## Data dan perhitungan

### Pre Test dan Post Test

Simpan identitas peserta, prodi, Diklat/angkatan, kompetensi, jawaban, versi instrumen, waktu pengiriman, pemeriksa, dan nilai. Perbandingan dipasangkan berdasarkan peserta dan Diklat/angkatan yang sama.

`ΔN = nilai Post Test − nilai Pre Test`

Jika salah satu nilai belum tersedia, delta berstatus belum lengkap, bukan nol. Nilai nol tetap nilai yang sah. Ambang kelulusan dan rentang kategori peningkatan harus diatur berdasarkan kebijakan resmi. Nilai peserta yang belum diperiksa tidak dimasukkan sebagai nol dalam rata-rata.

### Pasca Diklat

Simpan identitas alumni dan atasan, jabatan saat evaluasi, satuan kerja, kesesuaian Diklat dengan tugas, penerapan pengetahuan/keterampilan, perubahan perilaku, kemandirian, serta bukti administrasi/penugasan.

`Rata-rata = jumlah skor valid / jumlah butir valid`

Penilaian alumni dan atasan dihitung dan ditampilkan secara terpisah. Tidak menggabungkan keduanya tanpa ketentuan bobot resmi. Butir tidak berlaku dan jawaban kosong tidak otomatis diberi skor nol. Apabila belum ada skor valid, rata-rata belum tersedia.

### Kinerja

Simpan uraian tugas, indikator terkait kompetensi, satuan ukuran, target, realisasi, periode, bukti, penilaian kontribusi kompetensi, dan analisis manfaat.

Untuk indikator kuantitatif: `C = (realisasi / target) × 100%` dengan target lebih besar dari nol. Target nol/kosong tidak menghasilkan persentase dan harus diklarifikasi. Capaian dapat melebihi 100%; pembatasan hanya jika ada kebijakan resmi. Indikator yang arahnya semakin kecil semakin baik memerlukan aturan khusus sebelum dinilai.

Indikator tanpa target numerik dinilai secara kualitatif berdasarkan bukti dan rubrik resmi. Jangan membuat persentase atau mencampurnya ke rata-rata persentase tanpa metode yang disetujui.

## Tampilan dan halaman

- Header: simbol/logo EVITA di kiri, tulisan EVITA KATPROF beserta kepanjangan di kanan simbol, logo Korpolairud di ujung kanan. Lampiran saat ini berupa komposisi logo dan tulisan bertumpuk; diperlukan aset terpisah atau penataan ulang yang disetujui.
- Halaman masuk: akses peserta/atasan melalui undangan, pilihan DPDKN/Deck dan DPMKN/Mesin bila sesuai konteks undangan, serta pintu masuk petugas.
- Formulir ponsel: identitas, petunjuk, butir instrumen, unggah bukti, ringkasan sebelum kirim, dan tanda terima.
- Dashboard admin: status pengisian, evaluasi menunggu pemeriksaan, pasangan Pre/Post belum lengkap, dan laporan per prodi/angkatan.
- Pengelolaan instrumen: delapan paket, indikator, kunci/rubrik, versi, dan aktivasi.
- Rekap: nilai awal/akhir/delta, rata-rata alumni dan atasan terpisah, capaian kinerja, kelengkapan bukti, serta rekomendasi.
- Laporan pimpinan: filter prodi/angkatan/periode, kesimpulan, rekomendasi, dan ekspor. Format PDF/Excel disepakati berdasarkan administrasi client.

## Penyimpanan dan pengamanan

Gunakan basis data terpusat untuk penggunaan banyak perangkat. Penyimpanan browser saja tidak cukup untuk mengirim hasil ke Urmin. Bukti unggahan disimpan dengan akses terbatas, validasi ukuran/jenis file, dan pencatatan pemilik. Catat jejak perubahan nilai, instrumen, pemeriksaan, dan rekomendasi. Sediakan cadangan serta prosedur pemulihan; masa retensi ditetapkan instansi.

Entitas utama: pengguna/peran, prodi, Diklat/angkatan, peserta, keikutsertaan, hubungan atasan, instrumen/versi, butir/indikator, undangan, pengisian/jawaban, nilai/pemeriksaan, bukti, indikator kinerja, laporan, rekomendasi, dan audit.

## Batas versi awal yang disarankan

Versi awal mencakup dua prodi, empat jenis evaluasi, formulir peserta dan atasan, admin Urmin, laporan Kabagkatprof, QR undangan, penghitungan, unggah bukti, dan ekspor. Integrasi sistem kepegawaian, tanda tangan elektronik, notifikasi WhatsApp, dan migrasi data historis memerlukan cakupan terpisah jika diminta.

## Bahan yang perlu dipastikan

1. Delapan instrumen terbaru beserta kunci jawaban/rubrik, skala, bobot, dan ambang kelulusan.
2. Logo Korpolairud dan aset EVITA yang boleh digunakan.
3. Format identitas peserta, daftar angkatan, dan cara verifikasi responden.
4. Jadwal evaluasi pasca Diklat/kinerja, ketentuan pengulangan, dan koreksi jawaban.
5. Format laporan serta apakah rekomendasi Kabagkatprof harus melalui persetujuan elektronik.
6. Hosting, domain, lokasi penyimpanan data, pengguna serentak, retensi, dan penanggung jawab operasional.

## Kriteria penerimaan utama

- Instrumen dan jawaban DPDKN tidak tertukar dengan DPMKN.
- QR mengarahkan responden ke penugasan yang benar; tautan kedaluwarsa ditolak.
- Peserta/atasan tidak dapat melihat jawaban pihak lain atau mengakses fungsi petugas.
- Delta hanya dihitung dari pasangan nilai yang lengkap dalam Diklat yang sama.
- Skor nol dibedakan dari jawaban belum tersedia; target nol tidak menyebabkan pembagian nol.
- Penilaian alumni dan atasan tetap terpisah dan bukti dapat ditelusuri.
- Hasil dari ponsel responden tersedia bagi Urmin melalui server.
- Laporan dan rekomendasi dapat ditelusuri ke data serta versi instrumen asal.
