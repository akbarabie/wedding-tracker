# Product Requirements Document: Wedding Tracker

**Versi:** 1.0
**Pemilik Produk:** Muhammad Akbar Suharbi
**Status:** Draft untuk pengembangan MVP
**Terakhir diperbarui:** 29 September 2026

---

## 1. Ringkasan Eksekutif

Wedding Tracker adalah aplikasi web pribadi untuk mengelola seluruh proses persiapan pernikahan, mulai dari perencanaan budget, pelacakan vendor dan venue, jadwal dan checklist persiapan, daftar tamu, sampai pelaporan keuangan otomatis lewat pemindaian nota belanja berbasis AI. Aplikasi ini dibangun dengan dua tujuan sekaligus. Tujuan pertama adalah kebutuhan praktis, menjadi satu sumber kebenaran untuk seluruh persiapan pernikahan pemilik produk sendiri, menggantikan kombinasi spreadsheet, catatan HP, dan chat WhatsApp yang biasanya tercecer. Tujuan kedua adalah portofolio, aplikasi ini dirancang sebagai proyek full stack yang production ready, layak ditunjukkan ke hiring manager maupun calon klien, dengan arsitektur yang defensible saat ditanya di wawancara teknis.

Karena tujuan kedua ini, sejak awal aplikasi dirancang multi tenant, bukan sekadar tool single user. Siapa pun bisa mendaftar dan mengelola pernikahan mereka sendiri, sementara data milik pemilik produk menjadi instance pertama sekaligus demo hidup dari produk ini.

## 2. Latar Belakang dan Masalah

Proses persiapan pernikahan melibatkan banyak variabel yang bergerak bersamaan, budget yang harus dipantau ketat, puluhan vendor dengan status negosiasi berbeda-beda, timeline dengan deadline yang saling bergantung, dan daftar tamu yang jumlahnya bisa mencapai ratusan orang. Pendekatan umum menggunakan spreadsheet punya keterbatasan nyata, tidak ada reminder otomatis, tidak ada dashboard ringkas, dan pencatatan pengeluaran manual sangat rentan tertunda atau terlupakan, terutama saat nota belanja menumpuk dari berbagai vendor dalam waktu berdekatan.

Masalah spesifik yang ingin diselesaikan aplikasi ini ada empat. Pertama, tidak ada visibilitas real time terhadap sisa budget per kategori. Kedua, informasi vendor yang sudah disurvei tersebar di banyak tempat dan sulit dibandingkan. Ketiga, tidak ada mekanisme pengingat otomatis untuk deadline pembayaran atau tugas persiapan. Keempat, pencatatan pengeluaran manual memakan waktu dan sering tertunda sampai akhirnya lupa dicatat sama sekali.

## 3. Tujuan dan Metrik Keberhasilan

Tujuan fungsional aplikasi ini adalah menyediakan satu dashboard yang menjawab tiga pertanyaan kapan saja diperlukan, berapa sisa budget, apa yang harus dikerjakan minggu ini, dan siapa saja tamu yang sudah konfirmasi kehadiran. Keberhasilan dari sisi fungsional diukur dari apakah aplikasi ini benar-benar dipakai secara konsisten oleh pemilik produk dari sekarang sampai hari H, bukan ditinggalkan setelah dua minggu seperti kebanyakan tracker pribadi.

Tujuan portofolio diukur dari kelengkapan dokumentasi teknis di README GitHub, ketersediaan demo yang bisa diakses langsung, kejelasan justifikasi arsitektur di setiap keputusan teknis, dan kemampuan pemilik produk menjelaskan trade off desain sistem ini secara meyakinkan dalam wawancara kerja.

## 4. Target Pengguna

Pengguna utama adalah pasangan yang sedang mempersiapkan pernikahan, dengan pemilik produk dan calon pasangannya sebagai pengguna pertama. Karena sistem dirancang multi tenant, target pengguna sekunder adalah pasangan lain yang berpotensi memakai aplikasi ini di kemudian hari, meskipun ini bukan prioritas akuisisi pengguna di versi pertama, melainkan validasi bahwa arsitekturnya memang siap untuk skenario itu.

Ada juga pengguna tidak langsung, yaitu reviewer teknis, hiring manager, atau calon klien yang mengevaluasi proyek ini sebagai bagian dari portofolio. Kebutuhan mereka berbeda, mereka butuh kejelasan arsitektur dan kualitas kode, bukan fitur baru.

## 5. Ruang Lingkup

### Termasuk di Versi 1 (MVP)

Modul budgeting dan laporan keuangan lengkap dengan kategori custom dan pelacakan cicilan per vendor. Modul manajemen vendor dan venue dengan status kandidat. Modul timeline dan checklist berbasis fase persiapan. Modul daftar tamu dengan status RSVP. Dashboard ringkasan tunggal. Sistem reminder otomatis untuk deadline tugas dan pembayaran. Fitur unggah foto nota belanja dengan ekstraksi otomatis berbasis AI vision, hasil ekstraksi masuk sebagai draf yang perlu dikonfirmasi pengguna sebelum tercatat final. Autentikasi dan struktur data multi tenant.

### Tidak Termasuk di Versi 1

Integrasi pembayaran langsung ke vendor. Notifikasi lewat WhatsApp atau SMS, versi pertama cukup notifikasi in app dan email. Kolaborasi real time multi pengguna dalam satu sesi, cukup satu pasangan berbagi akses ke satu ruang kerja pernikahan tanpa live cursor atau semacamnya. Preprocessing gambar dengan microservice Python terpisah, ini masuk daftar pengembangan lanjutan. Aplikasi mobile native, versi pertama cukup web responsif.

## 6. Kebutuhan Fungsional

### 6.1 Budgeting dan Laporan Keuangan

Pengguna dapat membuat kategori pengeluaran custom, dengan kategori bawaan mengikuti struktur yang sudah dipakai di perencanaan aktual, venue dan catering, dekorasi, rias dan busana, dokumentasi, MC dan hiburan, undangan dan souvenir, dana darurat, serta kategori terpisah untuk cincin, seserahan, dan mahar yang di luar budget resepsi. Setiap kategori punya nilai budget rencana dan menampilkan total actual spending secara real time.

Setiap entri pengeluaran terhubung ke satu vendor, punya status pembayaran, DP terjadwal, dicicil, atau lunas, dan riwayat pembayaran per cicilan. Sistem menghitung otomatis sisa budget per kategori dan total keseluruhan, serta menampilkan peringatan visual ketika satu kategori mendekati atau melewati budget rencananya.

Laporan keuangan bisa difilter per kategori, per vendor, atau per rentang tanggal, dan bisa diekspor ke format CSV untuk kebutuhan arsip atau dibagikan ke keluarga.

### 6.2 Manajemen Vendor dan Venue

Setiap kandidat vendor tersimpan sebagai satu record dengan nama, kategori, lokasi, harga per pax atau harga paket, kapasitas jika relevan, kontak, catatan hasil survei, dan status, sedang disurvei, sudah dihubungi, negosiasi, deal, atau ditolak. Pengguna bisa membandingkan beberapa kandidat vendor dalam satu kategori berdampingan.

Ketika status vendor berubah menjadi deal, sistem menawarkan untuk otomatis membuat entri pengeluaran terkait di modul budgeting, supaya tidak ada duplikasi input data antara modul vendor dan modul keuangan.

### 6.3 Timeline dan Checklist

Timeline terbagi menjadi fase berdasarkan jarak waktu ke hari H, fase dua belas sampai sembilan bulan, delapan sampai enam bulan, lima sampai tiga bulan, dua bulan sampai satu bulan, dan dua minggu terakhir sampai hari H. Setiap fase berisi daftar tugas dengan deadline, status selesai atau belum, dan opsi menetapkan siapa yang bertanggung jawab jika lebih dari satu orang mengakses ruang kerja yang sama.

Tugas yang mendekati deadline memicu reminder otomatis sesuai modul 6.6.

### 6.4 Daftar Tamu dan RSVP

Setiap tamu tersimpan dengan nama, kategori, keluarga, teman, kolega, kontak, dan status kehadiran, belum dikonfirmasi, hadir, tidak hadir, atau masih ragu. Dashboard menampilkan ringkasan jumlah tamu per status, dan sistem menghitung otomatis estimasi jumlah konsumsi berdasarkan jumlah yang sudah konfirmasi hadir dibanding total undangan, karena seperti sudah kita bahas di sesi perencanaan sebelumnya, jumlah kehadiran aktual biasanya jauh dari seratus persen jumlah undangan.

### 6.5 Fitur Ekstraksi Nota Otomatis

Pengguna dapat mengunggah foto nota atau kuitansi belanja langsung dari browser, baik lewat kamera di perangkat mobile maupun unggah file di desktop. Gambar dikirim ke layanan AI vision untuk diekstrak menjadi data terstruktur, nama vendor, tanggal transaksi, nominal, dan perkiraan kategori pengeluaran.

Hasil ekstraksi masuk ke antrian dengan status menunggu konfirmasi, bukan langsung tercatat final, dan ditampilkan berdampingan dengan gambar nota aslinya supaya pengguna bisa memverifikasi dengan cepat sebelum menekan konfirmasi. Pengguna bisa mengedit field apa pun sebelum konfirmasi, atau menolak hasil ekstraksi jika sama sekali salah baca.

### 6.6 Sistem Reminder

Reminder dipicu oleh dua sumber, tugas di modul timeline yang mendekati deadline, dan cicilan pembayaran vendor yang mendekati jatuh tempo. Ambang waktu reminder bisa dikonfigurasi, standarnya tujuh hari dan satu hari sebelum deadline. Reminder muncul sebagai notifikasi in app dan email, versi pertama tidak mencakup WhatsApp atau SMS.

### 6.7 Dashboard

Satu halaman ringkasan menampilkan sisa budget total dan per kategori dalam bentuk visual sederhana, progress checklist keseluruhan dalam persentase, jumlah tamu terkonfirmasi dibanding total undangan, serta daftar tugas dan pembayaran yang jatuh tempo dalam tujuh hari ke depan.

### 6.8 Autentikasi dan Multi Tenant

Setiap akun pengguna bisa memiliki atau bergabung ke satu atau lebih ruang kerja pernikahan. Data setiap ruang kerja terisolasi penuh dari ruang kerja lain di level database. Pasangan bisa mengundang satu pengguna lain untuk berbagi akses penuh ke ruang kerja yang sama.

## 7. Kebutuhan Non-Fungsional

Aplikasi harus tetap responsif dengan waktu muat halaman utama di bawah dua detik pada koneksi normal, dengan pengecualian saat layanan backend gratis baru bangun dari kondisi idle, ini dijelaskan lebih detail di bagian delapan. Semua data finansial dan gambar nota harus terenkripsi saat transit lewat HTTPS, dan akses ke storage gambar nota harus dibatasi hanya untuk pemilik ruang kerja terkait, tidak boleh ada URL publik yang bisa diakses tanpa autentikasi. Seluruh infrastruktur harus berjalan di tingkat gratis dari masing-masing penyedia layanan, tanpa biaya bulanan tetap, meskipun ini berarti menerima trade off tertentu seperti cold start yang dijelaskan di bagian arsitektur. Aplikasi harus dapat diakses dengan baik dari perangkat mobile karena banyak input, terutama unggah foto nota, kemungkinan besar dilakukan langsung dari HP saat berada di lokasi belanja.

## 8. Arsitektur Sistem

Sistem terdiri dari empat komponen utama yang saling terhubung lewat API, bukan satu backend monolitik.

Next.js menangani seluruh antarmuka pengguna dan sebagian besar operasi CRUD, membaca dan menulis data budget, vendor, timeline, dan tamu langsung ke database lewat API routes bawaan Next.js. Ini sengaja dipisahkan dari layanan Go, karena operasi CRUD sederhana ini tidak butuh proses background dan lebih efisien ditangani langsung oleh frontend framework yang sama.

Golang worker service menangani dua tanggung jawab spesifik yang butuh proses di luar siklus request-response biasa. Pertama, pemrosesan gambar nota, menerima referensi gambar yang sudah diunggah ke storage, memanggil API AI vision eksternal, mem-parsing hasilnya, dan menyimpan draf hasil ekstraksi ke database. Kedua, pengecekan terjadwal untuk reminder, berjalan secara berkala memeriksa tugas dan pembayaran yang mendekati deadline lalu mengirim notifikasi.

Database dan storage ditangani oleh Supabase, yang menyediakan Postgres untuk seluruh data terstruktur, sistem autentikasi bawaan yang mendukung Row Level Security untuk isolasi data multi tenant di level database itu sendiri, bukan hanya di level aplikasi, dan object storage untuk gambar nota dan dokumen vendor.

Layanan AI eksternal menangani ekstraksi data dari gambar nota, dijelaskan detail di bagian sepuluh.

Satu hal penting yang perlu dipahami sejak awal, karena layanan Go berjalan di tingkat gratis yang otomatis nonaktif setelah periode tidak ada trafik, proses reminder terjadwal tidak bisa mengandalkan goroutine internal yang berjalan terus menerus, karena goroutine itu akan mati saat layanan idle dan tidak akan otomatis menyala sendiri untuk memicu pengecekan berikutnya. Solusinya, pengecekan reminder dipicu dari luar lewat layanan cron gratis seperti GitHub Actions terjadwal atau cron-job.org, yang memanggil endpoint HTTP di layanan Go pada interval tertentu, misalnya setiap satu jam. Panggilan ini sekaligus berfungsi membangunkan layanan dari kondisi idle. Ini keputusan arsitektur yang perlu didokumentasikan jelas di README, karena ini contoh bagus bagaimana batasan infrastruktur gratis memengaruhi desain sistem, dan ini justru poin menarik untuk dijelaskan saat wawancara teknis.

## 9. Tech Stack dan Justifikasi

| Komponen | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js, App Router | Server Components mengurangi beban client fetching, deploy gratis dan mudah di Vercel |
| Backend CRUD | Next.js API Routes | Operasi sederhana tidak butuh proses background, lebih efisien satu bahasa dengan frontend |
| Worker Service | Golang | Cocok untuk proses terjadwal dan pemanggilan API eksternal, standard library cukup tanpa dependency berat |
| Database | Postgres via Supabase | Relational, mendukung Row Level Security native untuk isolasi data multi tenant |
| Auth | Supabase Auth | Terintegrasi langsung dengan Row Level Security di Postgres, mengurangi kode auth custom |
| Storage | Supabase Storage | Satu vendor untuk database, auth, dan storage, mengurangi kompleksitas integrasi |
| AI Vision untuk OCR | Gemini API, model kelas Flash | Tingkat gratis nyata dengan kuota harian memadai untuk pemakaian personal, mendukung input gambar dan output terstruktur |
| Hosting Frontend | Vercel | Standar industri untuk Next.js, tingkat gratis generous |
| Hosting Worker Service | Render | Tingkat gratis tanpa kartu kredit, cocok untuk web service kecil, meski perlu strategi cron eksternal karena ada spin down saat idle |
| Cron Trigger | GitHub Actions terjadwal | Gratis, terintegrasi langsung dengan repository yang sama, tidak perlu layanan pihak ketiga tambahan |

## 10. Alur Ekstraksi Nota Berbasis AI

Pengguna mengambil atau mengunggah foto nota dari antarmuka Next.js. Next.js API route menerima file, melakukan validasi ukuran dan format, lalu menyimpannya ke Supabase Storage dan mencatat referensinya di database dengan status menunggu proses. Next.js memanggil endpoint di layanan Go untuk memicu pemrosesan.

Layanan Go mengambil gambar dari storage, mengonversinya ke base64, dan mengirim permintaan ke Gemini API dengan prompt yang meminta output terstruktur dalam format JSON berisi nama vendor, tanggal, nominal, dan perkiraan kategori. Hasil JSON diparsing dan disimpan sebagai entri pengeluaran berstatus draf, terhubung ke gambar nota aslinya.

Pengguna melihat notifikasi ada draf baru menunggu konfirmasi di dashboard, membuka detail yang menampilkan gambar nota berdampingan dengan hasil ekstraksi dalam bentuk form yang bisa diedit, mengoreksi jika perlu, lalu mengonfirmasi. Setelah dikonfirmasi, entri berubah status menjadi final dan masuk perhitungan laporan keuangan.

Perlu dicatat, data yang dikirim ke Gemini API lewat tingkat gratis berpotensi dipakai Google untuk peningkatan model mereka, ini konsekuensi wajar dari layanan gratis dan sudah dibahas di sesi sebelumnya, dan perlu disebutkan secara eksplisit di kebijakan privasi aplikasi jika nanti dipakai pengguna lain di luar pemilik produk.

## 11. Model Data

| Entitas | Field Utama | Catatan |
|---|---|---|
| User | id, email, nama | Dikelola Supabase Auth |
| Wedding | id, nama pasangan, tanggal hari H, budget total resepsi | Unit multi tenant utama, semua entitas lain terhubung ke sini |
| WeddingMember | wedding_id, user_id, peran | Menghubungkan user ke satu atau lebih wedding, mendukung akses berbagi pasangan |
| BudgetCategory | id, wedding_id, nama, nilai rencana | Kategori custom per wedding |
| Expense | id, wedding_id, category_id, vendor_id, nominal, tanggal, status pembayaran, sumber (manual atau ekstraksi AI), status draf atau final | Entitas inti laporan keuangan |
| Receipt | id, expense_id, url gambar, hasil ekstraksi mentah | Menyimpan gambar asli dan output AI sebelum konfirmasi |
| Vendor | id, wedding_id, nama, kategori, lokasi, harga, kapasitas, kontak, status | Manajemen vendor dan venue |
| TimelineTask | id, wedding_id, judul, fase, deadline, status selesai | Timeline dan checklist |
| Guest | id, wedding_id, nama, kategori, kontak, status RSVP | Daftar tamu |
| Reminder | id, wedding_id, referensi_entitas, jenis, waktu_kirim, status_terkirim | Dipicu proses terjadwal Go |

## 12. Desain API Tingkat Tinggi

| Endpoint | Metode | Ditangani Oleh | Deskripsi |
|---|---|---|---|
| /api/expenses | GET, POST | Next.js | CRUD entri pengeluaran manual |
| /api/vendors | GET, POST, PATCH | Next.js | CRUD data vendor |
| /api/timeline | GET, POST, PATCH | Next.js | CRUD tugas timeline |
| /api/guests | GET, POST, PATCH | Next.js | CRUD daftar tamu |
| /api/receipts/upload | POST | Next.js | Menyimpan gambar dan mencatat status menunggu |
| /worker/process-receipt | POST | Golang | Dipanggil Next.js setelah upload, memproses gambar lewat Gemini API |
| /worker/check-reminders | POST | Golang | Dipanggil cron eksternal secara berkala |

## 13. Keamanan dan Privasi

Row Level Security di Postgres memastikan satu wedding tidak bisa mengakses data wedding lain, aturan ini didefinisikan di level database, bukan hanya dicek di kode aplikasi, sehingga tetap aman meskipun ada bug di layer aplikasi. Endpoint layanan Go yang dipanggil dari Next.js maupun dari cron eksternal harus dilindungi token rahasia, bukan endpoint publik terbuka, supaya tidak bisa dipicu sembarangan oleh pihak luar. Gambar nota di storage tidak boleh punya URL yang bisa diakses publik tanpa autentikasi, harus lewat signed URL bermasa berlaku singkat. Data finansial dan gambar nota tergolong data sensitif pengguna, kebijakan retensi dan penghapusan data perlu didokumentasikan meskipun aplikasi ini awalnya untuk pemakaian pribadi, karena ini bagian dari praktik yang akan dinilai di portofolio.

## 14. Roadmap Pengembangan

Fase satu berfokus pada fondasi, setup Next.js, Supabase, autentikasi, dan struktur data multi tenant, tanpa fitur AI dulu. Fase dua membangun modul budgeting, vendor, timeline, dan guest list dengan operasi CRUD penuh lewat Next.js. Fase tiga membangun dashboard yang menggabungkan data dari seluruh modul. Fase empat membangun layanan Go, mulai dari worker pemrosesan nota terintegrasi Gemini API, baru kemudian sistem reminder terjadwal. Fase lima adalah pengerasan sebelum dipakai nyata, penanganan error, pengujian alur ekstraksi nota dengan berbagai kondisi nota, dan penulisan dokumentasi portofolio.

## 15. Risiko dan Asumsi

Risiko terbesar ada di akurasi ekstraksi AI untuk nota berkualitas rendah, dimitigasi lewat mekanisme konfirmasi manual wajib sebelum data masuk final. Risiko kedua ada di batasan layanan gratis, terutama cold start di Render yang bisa membuat proses reminder telat beberapa menit dari waktu seharusnya, ini diterima sebagai trade off yang wajar untuk skala penggunaan personal dan didokumentasikan secara eksplisit. Asumsi utama dokumen ini adalah volume data tetap kecil, skala satu sampai beberapa puluh wedding di masa awal, cukup jauh dari batas tingkat gratis Supabase maupun Gemini API.

## 16. Pengembangan Lanjutan di Luar Versi 1

Microservice Python untuk preprocessing gambar nota sebelum dikirim ke Gemini API, meningkatkan akurasi untuk nota buram atau miring, sekaligus jadi kesempatan menambahkan portofolio skill data science. Integrasi notifikasi WhatsApp lewat API resmi. Fitur kolaborasi lebih dari dua pengguna dalam satu wedding dengan peran berbeda. Mode publik terbatas untuk berbagi progress persiapan ke keluarga tanpa akses edit.
