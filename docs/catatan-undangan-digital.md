# Catatan Rancangan: Undangan Digital Tersinkron dengan Daftar Tamu

**Status:** ide, belum dikerjakan
**Dicatat:** 24 Oktober 2026
**Hubungan dengan PRD:** di luar cakupan PRD v1.0. Fitur ini baru boleh dikerjakan setelah ada persetujuan eksplisit dan PRD diperbarui.

## 1. Tujuan

Halaman Tamu saat ini mencatat daftar undangan dan status RSVP yang diisi pasangan secara manual. Gagasannya, setiap tamu mendapat tautan undangan digital pribadi. Tamu membuka tautan itu di ponselnya, melihat undangan dengan namanya sendiri, lalu mengisi RSVP langsung di sana. Jawabannya masuk ke halaman Tamu tanpa input ulang, sehingga ringkasan kehadiran dan estimasi konsumsi ikut diperbarui secara otomatis. Fitur ini sekaligus menjawab tren undangan digital dan menambah nilai portofolio, karena menghadirkan sistem dengan dua sisi, yaitu sisi pasangan yang memakai login dan sisi tamu yang hanya memakai tautan.

## 2. Titik temu dengan kode yang sudah ada

Kolom `guests.status_rsvp` sudah menjadi tempat alami untuk jawaban tamu, jadi sinkronisasi pada dasarnya berarti halaman publik menulis ke kolom yang sama dengan yang dibaca halaman Tamu.

Ada satu hal yang harus diselesaikan lebih dulu, yaitu makna `jumlah_orang`. Saat ini kolom itu berarti jumlah orang yang diundang lewat satu undangan, dan fungsi `estimasiKonsumsi` memakainya untuk semua status. Begitu tamu bisa menjawab sendiri, akan ada kasus diundang untuk empat orang tetapi hanya dua yang hadir. Tanpa pemisahan, estimasi konsumsi akan menghitung empat orang. Solusinya menambah kolom `jumlah_hadir` yang boleh kosong dan tidak boleh melebihi `jumlah_orang`, lalu mengubah view `ringkasan_tamu` dan `estimasiKonsumsi` supaya memakai `jumlah_hadir` bila terisi. Perubahan ini harus diuji bersama dan idealnya dikerjakan paling awal.

Perlu juga diputuskan siapa yang menang bila jawaban tamu bertabrakan dengan koreksi manual pasangan. Usulan awal adalah mencatat asal perubahan (`rsvp_via` dan `rsvp_pada`) dan menampilkannya di daftar, sehingga pasangan selalu bisa melihat mana yang diisi tamu dan mana yang dikoreksi sendiri.

## 3. Model data yang diperkirakan

Dibutuhkan tabel acara per pernikahan (akad, resepsi, dan sebagainya, dengan waktu, zona waktu, lokasi, dan tautan peta), tabel undangan per tamu (token, waktu pertama dibuka, waktu dicabut), dan pengaturan undangan per pernikahan seperti kalimat pembuka, batas waktu RSVP, serta status aktif atau tidak. Bila nanti ada buku tamu, ditambah tabel ucapan dengan status moderasi. Semua tabel memakai `wedding_id` dan RLS dengan pola yang sama seperti tabel lain.

## 4. Keamanan dan privasi

Ini bagian paling penting. Halaman undangan akan menjadi halaman publik pertama di aplikasi ini, padahal semua halaman lain berada di balik login, sehingga permukaan serangannya baru dan perlu pengujian tersendiri.

Akses tamu sebaiknya tidak pernah langsung ke tabel. Sebagai gantinya dibuat dua fungsi database dengan hak `security definer`, misalnya `ambil_undangan(token)` dan `kirim_rsvp(token, ...)`, yang hanya mengembalikan kolom yang memang boleh dilihat tamu, yaitu namanya sendiri dan detail acara. Daftar tamu lain, kontak, dan data keuangan tidak boleh ikut terbawa dalam keadaan apa pun. Token harus acak dengan entropi sedikitnya 128 bit dari generator acak yang aman secara kriptografis, dan pesan galat untuk token yang salah harus seragam supaya keberadaan token tidak bisa ditebak. Ada pertimbangan antara menyimpan token apa adanya, yang memungkinkan pasangan menyalin tautan kapan saja, dan menyimpan hash-nya, yang lebih aman bila tabel bocor tetapi menyulitkan penyalinan ulang. Karena dampak kebocoran satu token hanya terbatas pada undangan satu tamu, usulan awalnya menyimpan token apa adanya di tabel yang hanya bisa dibaca anggota pernikahan, namun ini perlu diputuskan secara sadar.

Endpoint RSVP dan ucapan perlu pembatasan laju agar tidak disalahgunakan, apalagi di layanan gratis. Halaman undangan perlu memakai `noindex` supaya tidak muncul di mesin pencari. Ucapan dari tamu harus dibatasi panjangnya, disanitasi, dan dimoderasi pasangan sebelum tampil. Kebijakan retensi dan penghapusan data tamu setelah acara juga perlu didokumentasikan, sejalan dengan bagian keamanan di PRD.

## 5. Tahapan yang diusulkan

Tahap A membangun fondasi sinkron: kolom `jumlah_hadir`, tabel acara, token per tamu, dua fungsi database, satu halaman publik dengan satu tema, dan RSVP yang tersinkron, lengkap dengan uji RLS dan uji penyalahgunaan. Tahap B melengkapi alat untuk pasangan: tombol salin tautan per tamu, tombol bagikan lewat tautan `wa.me` yang hanya membuka WhatsApp dengan teks siap pakai (bukan integrasi API, jadi tetap sesuai batasan PRD tentang WhatsApp), ekspor semua tautan ke CSV, dan penanda sudah dibuka serta sudah RSVP di halaman Tamu. Tahap C memperkaya pengalaman undangan: pilihan tema, hitung mundur, tautan peta, tombol tambah ke kalender, galeri foto lewat Supabase Storage, dan musik latar yang bawaannya mati. Tahap D menambah buku tamu dan ucapan dengan moderasi. Tahap E, bila masih relevan, menambah kode QR untuk check-in hari H sehingga kehadiran aktual tercatat dan bisa dibandingkan dengan RSVP.

## 6. Keputusan yang perlu diambil sebelum mulai

Pertama, satu tautan per tamu atau satu tautan umum. Rekomendasinya per tamu, karena memungkinkan sapaan personal dan RSVP tersinkron tanpa tamu mengetik namanya. Kedua, apakah tamu boleh mengubah jawabannya sampai batas waktu RSVP. Ketiga, bagaimana aturan bila jawaban tamu bertabrakan dengan koreksi pasangan, seperti dibahas di atas. Keempat, apakah undangan digital hanya untuk pemakaian pribadi atau juga menjadi fitur bagi pengguna lain, karena itu menentukan seberapa besar investasi pada tema yang aman dan kuota gambar. Kelima, perhitungan batas layanan gratis untuk galeri, karena trafik tamu cenderung memuncak menjelang acara.

## 7. Risiko

Risiko utamanya adalah cakupan yang cepat melebar. Disarankan tahap A diselesaikan dan distabilkan terlebih dahulu sebelum tahap lain dimulai. Risiko kedua adalah permukaan serangan publik yang baru, sehingga fase pengerasan dan uji keamanan khusus perlu dijadwalkan, bukan ditambahkan belakangan. Risiko ketiga adalah lonjakan trafik pada layanan gratis di hari-hari menjelang acara, yang harus dihitung sebelum galeri dan musik diaktifkan.
