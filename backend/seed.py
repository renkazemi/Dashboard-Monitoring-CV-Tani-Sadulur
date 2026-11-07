"""Data contoh enam minggu (PRD 12.4), dibuat relatif terhadap tanggal hari ini.

Seluruh stok berasal dari transaksi yang dijalankan lewat logika server yang
sama (FIFO, validasi), jadi angka batch selalu konsisten dengan daftar nota.
"""
from datetime import timedelta

PENGGUNA = [
    # nama pengguna, nama, kata sandi demo, peran
    ('admin', 'Admin Gudang', 'admin123', 'admin'),
    ('pemilik', 'Pemilik Pabrik', 'pemilik123', 'pemilik'),
]

PRODUK = [
    # id, nama, kemasan, kode, jenis, berat per satuan (kg), harga satuan
    ('tt50', 'Tepung Tapioka', 'Karung 50 kg', '50', 'tepung', 50, 750_000),
    ('tt25', 'Tepung Tapioka', 'Karung 25 kg', '25', 'tepung', 25, 375_000),
    ('tt10', 'Tepung Tapioka', 'Dus 10 kg', '10', 'tepung', 10, 180_000),
    ('bahan-baku', 'Bahan Baku Kasar', 'Curah (kg)', 'BB', 'bahan-baku', 1, 0),
]

# Batch lama sebelum periode enam minggu: (produk, umur hari, berat kg).
# Batch tua dus 10 kg sengaja tersisa agar status Waspada dan Lewat batas
# ikut terlihat saat demo.
PRODUKSI_LAMA = [
    ('tt50', 94, 30_000), ('tt25', 72, 20_000),
    ('tt10', 380, 2_500), ('tt10', 336, 20_000), ('tt10', 291, 3_000),
    ('tt10', 147, 4_000),
]

# Produksi per minggu (Senin pagi): karung 50 kg, karung 25 kg, dus 10 kg (kg).
PRODUKSI_MINGGUAN = [
    [15_000, 8_000, 4_000],
    [14_000, 7_500, 3_500],
    [16_000, 9_000, 4_500],
    [15_000, 8_000, 4_000],
    [16_000, 9_000, 4_000],
    [12_000, 6_000, 3_000],
]

MASUK_MINGGUAN = [34_000, 29_500, 31_000, 36_500, 28_000, 22_500]

# Per minggu: karung 50 kg, karung 25 kg, dus 10 kg (kg).
KELUAR_MINGGUAN = [
    [14_000, 7_600, 3_800],
    [13_200, 7_200, 3_500],
    [15_000, 8_200, 4_000],
    [13_600, 7_400, 3_600],
    [15_600, 8_500, 4_200],
    [10_900, 6_000, 2_900],
]

PEMASOK = ['CV Sumber Tapioka', 'UD Makmur Sejahtera', 'Koperasi Tani Jaya']
PEMBELI = [
    'Toko Berkah Jaya', 'CV Aneka Pangan', 'UD Sinar Bakery', 'Toko Maju Bersama',
    'PT Pangan Nusantara', 'Toko Sumber Rezeki', 'UD Kue Sekar', 'CV Roti Ceria',
]


def ddmm(tanggal):
    return tanggal.strftime('%d%m')


def transaksi_awal(hari):
    """Daftar transaksi awal, urut kronologis, untuk dijalankan lewat simpan_transaksi."""
    berat_satuan = {p[0]: p[5] for p in PRODUK}
    harga = {p[0]: p[6] for p in PRODUK}
    hasil = []

    senin = hari - timedelta(days=hari.weekday())
    produksi = [(produk_id, hari - timedelta(days=umur), berat) for produk_id, umur, berat in PRODUKSI_LAMA]
    for i, per_produk in enumerate(PRODUKSI_MINGGUAN):
        awal = senin - timedelta(weeks=5 - i)
        produksi += [(produk_id, awal, berat) for produk_id, berat in zip(['tt50', 'tt25', 'tt10'], per_produk)]
    produksi.sort(key=lambda item: item[1])
    for nomor, (produk_id, tanggal, berat) in enumerate(produksi, 1):
        hasil.append({
            'jenis': 'produksi', 'tanggal': tanggal.isoformat(), 'jam': '07:30',
            'nomorDokumen': f'PRD-{ddmm(tanggal)}-{nomor:02}', 'pihak': 'Gudang produksi',
            'produkId': produk_id, 'jumlah': berat // berat_satuan[produk_id],
            'keterangan': 'Hasil produksi',
        })

    nomor_masuk = nomor_keluar = 0
    for i in range(6):
        awal = senin - timedelta(weeks=5 - i)
        berjalan = i == 5
        total = MASUK_MINGGUAN[i]
        pertama = round(total * 0.6 / 100) * 100
        for urutan, (berat, geser, jam) in enumerate(
            [(pertama, 1 if berjalan else 2, '08:40'), (total - pertama, 3 if berjalan else 4, '15:10')]
        ):
            nomor_masuk += 1
            tanggal = min(awal + timedelta(days=geser), hari)
            hasil.append({
                'jenis': 'masuk', 'tanggal': tanggal.isoformat(), 'jam': jam,
                'nomorDokumen': f'BM-{ddmm(tanggal)}-{nomor_masuk:02}',
                'pihak': PEMASOK[(i + urutan) % len(PEMASOK)],
                'produkId': 'bahan-baku', 'beratKg': berat, 'keterangan': 'Bahan baku masuk',
            })

        hari_keluar = [2, 3, 4] if berjalan else [2, 4, 5]
        for urutan, (produk_id, jam) in enumerate(
            zip(['tt50', 'tt25', 'tt10'], ['10:05', '13:15', '14:20'])
        ):
            nomor_keluar += 1
            tanggal = min(awal + timedelta(days=hari_keluar[urutan]), hari)
            hasil.append({
                'jenis': 'keluar', 'tanggal': tanggal.isoformat(), 'jam': jam,
                'nomorDokumen': f'KLR-{ddmm(tanggal)}-{nomor_keluar:02}',
                'pihak': PEMBELI[(i * 3 + urutan) % len(PEMBELI)],
                'produkId': produk_id,
                'jumlah': round(KELUAR_MINGGUAN[i][urutan] / berat_satuan[produk_id]),
                'hargaSatuan': harga[produk_id], 'keterangan': 'Penjualan tepung',
            })

    retur = hari - timedelta(days=2)
    hasil.append({
        'jenis': 'retur', 'tanggal': retur.isoformat(), 'jam': '09:00',
        'nomorDokumen': f'RTR-{ddmm(retur)}-01', 'pihak': 'Toko Berkah Jaya',
        'produkId': 'tt25', 'jumlah': 3, 'keterangan': 'Kemasan rusak saat pengiriman',
        # Batch tt25 tertua: pasti sudah habis terjual lewat FIFO sebelum tanggal retur.
        'batchId': f"batch-tt25-{(hari - timedelta(days=PRODUKSI_LAMA[1][1])).isoformat()}",
    })
    koreksi = hari - timedelta(days=1)
    hasil.append({
        'jenis': 'koreksi', 'arah': 'kurang', 'tanggal': koreksi.isoformat(), 'jam': '16:10',
        'nomorDokumen': f'KOR-{ddmm(koreksi)}-01', 'pihak': 'Stock opname',
        'produkId': 'tt50', 'jumlah': 1, 'keterangan': 'Selisih stock opname (kurang 1 karung)',
    })

    return sorted(hasil, key=lambda item: (item['tanggal'], item['jam']))
