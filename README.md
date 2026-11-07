# Dashboard Monitoring Stok dan Transaksi Tepung Tapioka

Prototipe dashboard gudang berbasis web untuk CV Tani Sadulur, produsen tepung tapioka di Kabupaten Bogor. Aplikasi ini mencatat bahan baku masuk, hasil produksi, dan barang keluar di satu tempat, lalu menampilkan stok tepung dalam kilogram, nilai transaksi, dan status umur setiap batch. Barang keluar diambil dari batch tertua lebih dulu (FIFO).

Prototipe ini dibuat untuk Capstone Project STSI4440 Universitas Terbuka. Semua data di dalamnya adalah data contoh, bukan data operasional perusahaan.

## Teknologi

- Frontend: Vue 3 (Composition API, `<script setup>`), Vue Router 4, dan Vite 8. Tampilan memakai CSS biasa tanpa framework UI.
- Backend: Python dengan Flask.
- Basis data: SQLite, tersimpan di `backend/gudang.db`.

## Menjalankan

Siapkan Node.js dan Python 3.10 atau lebih baru, lalu pasang dependensinya:

```bash
npm install
python -m pip install -r backend/requirements.txt
```

Backend dan frontend dijalankan di dua terminal terpisah:

```bash
python backend/app.py
```

```bash
npm run dev
```

Buka alamat yang muncul di terminal Vite, biasanya `http://localhost:5173`. Vite meneruskan setiap permintaan `/api` ke Flask di port 5000.

Basis data dan data contoh dibuat otomatis saat backend pertama kali dijalankan. Untuk mengulang dari awal, hapus `backend/gudang.db` atau pakai tombol reset di halaman Pengaturan.

Untuk membuka dari ponsel, sambungkan ponsel ke Wi-Fi yang sama dengan laptop, jalankan `npm run dev -- --host`, lalu buka alamat IP laptop dengan port 5173.

## Akun demo

| Peran | Nama pengguna | Kata sandi | Akses |
| --- | --- | --- | --- |
| Admin gudang | `admin` | `admin123` | Semua halaman, termasuk Catat informasi dan Pengaturan |
| Pemilik | `pemilik` | `pemilik123` | Dashboard, Riwayat gudang, Batch dan stok, Laporan bulanan (hanya baca) |

Kartu akun demo di halaman login mengisi formulir secara otomatis. Kata sandi disimpan sebagai hash Werkzeug dan diperiksa di server. Pemilik yang membuka halaman khusus admin diarahkan kembali ke dashboard, dan server menolak setiap perubahan data dari akun pemilik dengan kode `403`.

## Halaman

Aplikasi punya tujuh halaman. Semua halaman menyesuaikan lebar layar: di ponsel, sidebar berubah menjadi drawer dan tabel berubah menjadi kartu.

### Login (`/login`)

Pengguna masuk dengan nama pengguna dan kata sandi. Sesi disimpan di cookie HttpOnly, jadi pengguna tetap masuk setelah halaman dimuat ulang. Pengguna yang belum masuk akan diarahkan ke halaman ini lalu dikembalikan ke halaman tujuannya setelah login.

### Dashboard (`/`)

- Kartu ringkasan berisi stok tepung (kg), nilai stok, serta bahan baku masuk, hasil produksi, dan penjualan bulan berjalan.
- Peringatan muncul bila ada batch berstatus waspada atau lewat batas.
- Grafik arus barang enam minggu terakhir menampilkan bahan baku masuk, produksi, dan tepung keluar. Batang setiap minggu bisa diklik untuk membuka rekap minggu itu, lengkap dengan jumlah karung atau dus dan beratnya.
- Stok per produk, diagram hasil produksi dan penjualan per produk, daftar batch beserta status umurnya, serta enam transaksi terakhir. Untuk retur, barang ditolak, dan koreksi, alasannya ikut tampil.

### Catat informasi (`/catat-informasi`, khusus admin)

- Enam jenis pencatatan: bahan baku masuk, hasil produksi, barang keluar, retur, barang ditolak, dan koreksi stok. Isian formulir menyesuaikan jenis yang dipilih.
- Nomor dokumen terisi otomatis dan boleh diubah agar sama dengan nomor di nota asli.
- Formulir produksi menampilkan kode batch yang akan terbentuk, misalnya `B-50-0411`. Produksi pada tanggal yang sama digabung ke batch yang sudah ada.
- Formulir barang keluar menampilkan rencana pengambilan batch FIFO sebelum disimpan, beserta berat dari tiap batch dan nilai transaksinya.
- Formulir retur meminta batch asal barang. Pilihannya hanya batch produk itu yang pernah terjual, dan setiap pilihan mencantumkan jumlah maksimal yang boleh dikembalikan.
- Retur, barang ditolak, dan koreksi wajib disertai alasan.

### Riwayat gudang (`/riwayat-gudang`)

Daftar semua transaksi dengan pencarian, penyaring jenis, produk, dan rentang tanggal, serta tombol cepat 7 hari, 30 hari, bulan ini, dan semua periode. Ringkasan di atas daftar ikut berubah sesuai penyaring. Setiap nota bisa dibuka untuk melihat rinciannya, termasuk batch yang diambil. Transaksi tidak bisa diedit atau dihapus; kesalahan dicatat sebagai koreksi stok supaya jejaknya tetap utuh.

### Batch dan stok (`/batch-stok`)

Stok aktif per produk dan daftar batch yang diurutkan dari yang tertua. Setiap batch menampilkan tanggal produksi, umur, jumlah masuk, jumlah terpakai, sisa stok, nilai, dan status. Awalnya hanya batch aktif yang tampil. Batch yang sudah habis bisa dimunculkan lewat penyaring status "Habis". Rincian setiap batch memuat riwayat mutasinya.

### Laporan bulanan (`/laporan-bulanan`)

Halaman pertama berisi ringkasan bulan terpilih: bahan baku masuk dan jumlah pemasok, total produksi, barang terjual dan jumlah pembeli, jumlah nota, nilai penjualan, dan arus bersih stok. Di bawahnya ada retur, barang ditolak, dan koreksi, tabel rekap per produk, serta kolom tanda tangan admin gudang dan pemilik. Rincian semua transaksi bulan itu dicetak mulai halaman baru. Tombol "Cetak / simpan PDF" membuka dialog cetak browser untuk menyimpan laporan sebagai PDF ukuran A4.

### Pengaturan (`/pengaturan`, khusus admin)

Admin dapat mengubah batas peringatan umur (bawaan 6 bulan), batas maksimal mutu (bawaan 10 bulan), dan harga satuan tiap produk. Batas yang baru langsung dipakai dashboard dan daftar batch. Tombol reset mengembalikan data contoh ke kondisi awal dan menghapus semua transaksi yang sudah dicatat.

## API

| Metode | Rute | Akses | Fungsi |
| --- | --- | --- | --- |
| POST | `/api/login` | Semua | Masuk |
| POST | `/api/logout` | Semua | Keluar |
| GET | `/api/sesi` | Semua | Pengguna yang sedang masuk, atau `null` |
| GET | `/api/data` | Admin, pemilik | Produk, batch, transaksi beserta alokasinya, pengaturan |
| POST | `/api/transaksi` | Admin | Menyimpan transaksi setelah validasi dan alokasi batch di server |
| PUT | `/api/pengaturan` | Admin | Mengubah batas umur batch |
| PUT | `/api/produk/<id>` | Admin | Mengubah harga satuan |
| POST | `/api/reset` | Admin | Mengembalikan data contoh |

Permintaan tanpa sesi mendapat `401`, dan akun pemilik yang memanggil rute admin mendapat `403`.

## Basis data dan aturan stok

Skema ada di `backend/schema.sql` dan terdiri atas lima tabel: `pengguna`, `produk`, `transaksi`, `alokasi_batch`, dan `pengaturan`.

Semua kejadian di gudang disimpan di tabel `transaksi` dan dibedakan oleh kolom `jenis`. Batch tidak punya tabel sendiri. Satu batch adalah gabungan produk dan tanggal produksinya, dan sisa stoknya dihitung dari transaksi setiap kali data diminta. Tabel `alokasi_batch` mencatat berapa kilogram yang diambil dari atau dikembalikan ke setiap batch. Server menghitung ulang berat dan nilai dari jumlah kemasan, jadi angka dari browser tidak langsung dipercaya.

| Aturan | Nilai |
| --- | --- |
| Satuan stok | Kilogram |
| Produk | Karung 50 kg (Rp750.000), karung 25 kg (Rp375.000), dus 10 kg berisi 10 kemasan 1 kg (Rp180.000) |
| Batch | Produk dan tanggal produksi; produksi pada tanggal yang sama digabung |
| Status umur | Aman di bawah 6 bulan, waspada 6 sampai 10 bulan, lewat batas di atas 10 bulan, habis bila sisa 0 kg |
| Nilai transaksi | Jumlah kemasan dikali harga satuan |

| Jenis transaksi | Efek pada stok | Batch yang dipakai |
| --- | --- | --- |
| Barang keluar | Berkurang | Batch tertua lebih dulu (FIFO) |
| Barang ditolak | Berkurang | Batch tertua lebih dulu (FIFO) |
| Koreksi kurang | Berkurang | Batch tertua lebih dulu (FIFO) |
| Retur | Bertambah | Batch asal yang dipilih admin, paling banyak sejumlah barang yang pernah keluar dari batch itu dikurangi retur sebelumnya |
| Koreksi tambah | Bertambah | Batch terbaru produk tersebut |

Data contoh di `backend/seed.py` berisi transaksi selama enam minggu dengan barang keluar 20 sampai 30 ton per minggu. Beberapa batch dus 10 kg yang sudah berumur sengaja disisakan supaya status waspada dan lewat batas terlihat saat demo.

## Pengujian

Uji Black Box otomatis dijalankan lewat API pada basis data sementara, jadi `gudang.db` tidak ikut berubah:

```bash
python -m unittest backend/test_app.py -v
```

Kesesuaian angka laporan PDF dengan dashboard diperiksa manual dengan mencetak laporan lalu membandingkannya dengan kartu di dashboard.

## Batasan prototipe

Prototipe ini dibuat untuk uji coba di jaringan lokal dengan data contoh. Sebelum diisi data asli, beberapa hal berikut perlu dibenahi:

- Akses masih lewat HTTP biasa, belum HTTPS.
- Akun demo dan kata sandinya masih tampil di halaman login.
- Kunci sesi masih memakai nilai bawaan `dev-cv-tani-sadulur`. Isi variabel lingkungan `SECRET_KEY` bila aplikasi dihosting.
- Sesi disimpan di cookie bertanda tangan, sehingga cookie yang tersalin tetap berlaku setelah logout.
- Belum ada pembatasan percobaan login dan belum ada cadangan basis data otomatis.
- Server bawaan Flask berjalan dalam mode debug dan hanya cocok untuk demo.

## Struktur proyek

```text
backend/
├─ app.py                      # Flask: login, validasi, FIFO, API
├─ schema.sql                  # tabel SQLite
├─ seed.py                     # akun demo dan data contoh enam minggu
├─ test_app.py                 # uji Black Box lewat API
└─ requirements.txt
src/
├─ components/
│  ├─ AppSidebar.vue           # navigasi dan drawer di ponsel
│  ├─ AppTopbar.vue            # breadcrumb, tanggal, tombol keluar
│  ├─ IconApp.vue              # ikon SVG
│  ├─ StatCard.vue             # kartu ringkasan
│  ├─ StatusBadge.vue          # label Aman, Waspada, Lewat batas, Habis
│  ├─ batch/DetailBatch.vue    # rincian batch dan riwayat mutasi
│  ├─ dashboard/               # grafik, rekap mingguan, stok, batch, aktivitas
│  ├─ input/                   # pratinjau FIFO, ringkasan stok, hasil simpan
│  └─ transaksi/               # rincian nota dan label jenis transaksi
├─ composables/                # perhitungan dashboard, batch, dan menu
├─ data/                       # kartu akun demo dan aturan jenis transaksi
├─ router/index.js             # rute, pengecekan login, dan pembatasan peran
├─ stores/                     # sesi pengguna dan data gudang dari API
├─ utils/                      # pemanggil API, format angka, aturan umur batch
├─ views/                      # tujuh halaman aplikasi
├─ App.vue
├─ main.js
└─ style.css
```

## Rencana lanjutan

1. Menyederhanakan penyaring di halaman Riwayat gudang. Pencarian dan tombol rentang tanggal tampil lebih dulu, sedangkan penyaring lain dibuka bila perlu.
2. Memindahkan aplikasi ke layanan hosting dengan basis data yang mendukung banyak pengguna, supaya pemilik bisa memantau gudang dari luar jaringan pabrik.
3. Menutup batasan keamanan di atas, lalu menjalankan pengujian keamanan tersendiri sebelum aplikasi diisi data asli.
4. Menjalankan aplikasi dengan nota asli paling sedikit satu bulan, lalu membandingkan stok di aplikasi dengan hasil stock opname.
