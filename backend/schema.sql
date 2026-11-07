-- Rancangan basis data PRD bagian 9, ditambah tabel pengaturan untuk batas umur (K8).
-- Stok tidak disimpan sebagai angka tetap: dihitung dari transaksi produksi + alokasi_batch.

CREATE TABLE IF NOT EXISTS pengguna (
  id INTEGER PRIMARY KEY,
  nama_pengguna TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  kata_sandi TEXT NOT NULL, -- hash werkzeug, bukan teks biasa
  peran TEXT NOT NULL CHECK (peran IN ('admin', 'pemilik'))
);

CREATE TABLE IF NOT EXISTS produk (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kemasan TEXT NOT NULL,
  kode TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('tepung', 'bahan-baku')),
  berat_per_satuan REAL NOT NULL,
  harga_satuan INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transaksi (
  id INTEGER PRIMARY KEY,
  jenis TEXT NOT NULL
    CHECK (jenis IN ('masuk', 'produksi', 'keluar', 'retur', 'ditolak', 'koreksi')),
  tanggal TEXT NOT NULL,
  jam TEXT NOT NULL,
  nomor_dokumen TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pihak TEXT NOT NULL DEFAULT '',
  produk_id TEXT NOT NULL REFERENCES produk (id),
  jumlah REAL NOT NULL,
  berat_kg REAL NOT NULL CHECK (berat_kg > 0),
  nilai INTEGER NOT NULL DEFAULT 0,
  tanggal_produksi TEXT, -- diisi untuk produksi (batch = produk + tanggal produksi)
  arah TEXT CHECK (arah IN ('tambah', 'kurang')), -- hanya koreksi
  keterangan TEXT NOT NULL DEFAULT ''
);

-- Positif = stok ditambahkan ke batch (retur, koreksi tambah),
-- negatif = stok diambil dari batch (keluar, ditolak, koreksi kurang).
CREATE TABLE IF NOT EXISTS alokasi_batch (
  id INTEGER PRIMARY KEY,
  transaksi_id INTEGER NOT NULL REFERENCES transaksi (id),
  tanggal_produksi TEXT NOT NULL,
  berat_kg REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transaksi_produk ON transaksi (produk_id, jenis);
CREATE INDEX IF NOT EXISTS idx_alokasi_transaksi ON alokasi_batch (transaksi_id);
