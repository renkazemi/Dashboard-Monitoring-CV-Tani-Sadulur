"""Uji Black Box lewat API.  Jalankan: python -m unittest backend/test_app.py -v

Memakai basis data sementara; gudang.db tidak tersentuh.
"""
import os
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

os.environ['DB_PATH'] = os.path.join(tempfile.mkdtemp(), 'uji.db')
sys.path.insert(0, str(Path(__file__).parent))

import app as backend  # noqa: E402

HARI = date.today().isoformat()
_nomor = 0


def nomor(prefix):
    global _nomor
    _nomor += 1
    return f'{prefix}-UJI-{_nomor:03}'


class UjiBlackBox(unittest.TestCase):
    def setUp(self):
        self.klien = backend.app.test_client()
        self.masuk('admin', 'admin123')
        self.post('/api/reset')

    def masuk(self, nama, sandi):
        return self.klien.post('/api/login', json={'identitas': nama, 'sandi': sandi})

    def post(self, path, **data):
        return self.klien.post(path, json=data)

    def data(self):
        return self.klien.get('/api/data').get_json()

    def stok(self, produk_id):
        return sum(
            b['produksiKg'] + b['penyesuaianKg'] - b['terpakaiKg']
            for b in self.data()['batch'] if b['produkId'] == produk_id
        )

    def test_01_login_benar_dan_salah(self):
        self.klien.post('/api/logout')
        self.assertEqual(self.masuk('admin', 'salah').status_code, 401)
        self.assertEqual(self.masuk('tidakada', 'x').status_code, 401)
        self.assertEqual(self.klien.get('/api/data').status_code, 401)
        self.assertEqual(self.masuk('pemilik', 'pemilik123').get_json()['peran'], 'pemilik')
        self.assertEqual(self.masuk('ADMIN ', 'admin123').get_json()['peran'], 'admin')
        with backend.app.app_context():  # hash tersimpan, bukan teks biasa
            disimpan = backend.db().execute("SELECT kata_sandi FROM pengguna WHERE nama_pengguna='admin'").fetchone()[0]
        self.assertNotIn('admin123', disimpan)

    def test_02_bahan_baku_masuk(self):
        r = self.post('/api/transaksi', jenis='masuk', tanggal=HARI, nomorDokumen=nomor('BM'),
                      pihak='Uji', beratKg=1500)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.get_json()['transaksi']['produkId'], 'bahan-baku')
        for berat in (0, -5, 'abc'):
            r = self.post('/api/transaksi', jenis='masuk', tanggal=HARI, nomorDokumen=nomor('BM'),
                          pihak='Uji', beratKg=berat)
            self.assertEqual(r.status_code, 400, berat)
            self.assertIn('Berat', r.get_json()['pesan'])

    def test_03_produksi_batch_baru(self):
        sebelum = self.stok('tt10')
        # Hari terdekat sebelum hari ini yang belum punya batch dus 10 kg.
        terpakai = {b['tanggalProduksi'] for b in self.data()['batch'] if b['produkId'] == 'tt10'}
        kemarin = next(t for t in ((date.today() - timedelta(days=n)).isoformat() for n in range(1, 30))
                       if t not in terpakai)
        r = self.post('/api/transaksi', jenis='produksi', tanggal=kemarin, nomorDokumen=nomor('PRD'),
                      produkId='tt10', jumlah=20).get_json()
        self.assertTrue(r['batchBaru'])
        self.assertEqual(r['transaksi']['beratKg'], 200)  # jumlah × berat per satuan
        self.assertEqual(self.stok('tt10'), sebelum + 200)
        self.assertIn(f'batch-tt10-{kemarin}', [b['id'] for b in self.data()['batch']])

    def test_04_fifo_melewati_satu_batch(self):
        batch = sorted(
            (b for b in self.data()['batch']
             if b['produkId'] == 'tt25' and b['produksiKg'] + b['penyesuaianKg'] > b['terpakaiKg']),
            key=lambda b: b['tanggalProduksi'],
        )
        sisa_tertua = batch[0]['produksiKg'] + batch[0]['penyesuaianKg'] - batch[0]['terpakaiKg']
        jumlah = int(sisa_tertua // 25) + 2
        r = self.post('/api/transaksi', jenis='keluar', tanggal=HARI, nomorDokumen=nomor('KLR'),
                      pihak='Uji', produkId='tt25', jumlah=jumlah, hargaSatuan=375_000).get_json()
        alokasi = r['alokasi']
        self.assertEqual([a['batchId'] for a in alokasi], [batch[0]['id'], batch[1]['id']])
        self.assertEqual(alokasi[0]['beratKg'], sisa_tertua)
        self.assertEqual(sum(a['beratKg'] for a in alokasi), jumlah * 25)
        with backend.app.app_context():
            rows = backend.db().execute('SELECT COUNT(*) FROM alokasi_batch WHERE transaksi_id = ?',
                                        (r['transaksi']['id'],)).fetchone()[0]
        self.assertEqual(rows, 2)

    def test_05_keluar_melebihi_stok(self):
        stok = self.stok('tt50')
        r = self.post('/api/transaksi', jenis='keluar', tanggal=HARI, nomorDokumen=nomor('KLR'),
                      pihak='Uji', produkId='tt50', jumlah=int(stok // 50) + 1, hargaSatuan=750_000)
        self.assertEqual(r.status_code, 400)
        self.assertIn('tidak cukup', r.get_json()['pesan'])
        self.assertEqual(self.stok('tt50'), stok)

    def test_06_nilai_per_nota_minggu_bulan(self):
        r = self.post('/api/transaksi', jenis='keluar', tanggal=HARI, nomorDokumen=nomor('KLR'),
                      pihak='Uji', produkId='tt10', jumlah=7, hargaSatuan=175_000, nilai=1).get_json()
        self.assertEqual(r['transaksi']['nilai'], 7 * 175_000)  # nilai klien diabaikan
        data = self.data()
        harga = {p['id']: p['hargaSatuan'] for p in data['produk']}
        keluar = [t for t in data['transaksi'] if t['jenis'] == 'keluar']
        for t in keluar[:-1]:
            self.assertEqual(t['nilai'], t['jumlah'] * harga[t['produkId']], t['nomorDokumen'])
        bulan = sum(t['nilai'] for t in keluar if t['tanggal'][:7] == HARI[:7])
        mingguan = sum(
            sum(t['nilai'] for t in keluar
                if awal <= t['tanggal'] <= (date.fromisoformat(awal) + timedelta(days=6)).isoformat())
            for awal in data['periodeMinggu']
        )
        self.assertEqual(mingguan, sum(t['nilai'] for t in keluar if t['tanggal'] >= data['periodeMinggu'][0]))
        self.assertGreater(bulan, 0)

    def test_07_batas_umur_dapat_diatur(self):
        self.assertEqual(self.data()['pengaturan'], {'peringatanBulan': 6, 'maksimalBulan': 10})
        self.assertEqual(self.klien.put('/api/pengaturan', json={'peringatanBulan': 10, 'maksimalBulan': 6}).status_code, 400)
        self.assertEqual(self.klien.put('/api/pengaturan', json={'peringatanBulan': 4, 'maksimalBulan': 8}).status_code, 200)
        self.assertEqual(self.data()['pengaturan'], {'peringatanBulan': 4, 'maksimalBulan': 8})
        # Data awal menyediakan batch Aman, Waspada (6–10 bln), dan Lewat batas (> 10 bln).
        umur = sorted((date.today() - date.fromisoformat(b['tanggalProduksi'])).days / 30.4375
                      for b in self.data()['batch'] if b['produksiKg'] + b['penyesuaianKg'] > b['terpakaiKg'])
        self.assertTrue(umur[0] < 6 and any(6 <= u <= 10 for u in umur) and umur[-1] > 10)

    def bisa_retur(self, batch_id):
        """Berat yang pernah keluar dari batch dikurangi retur ke batch itu."""
        tanda = {'keluar': 1, 'retur': -1}
        return sum(tanda[t['jenis']] * a['beratKg'] for t in self.data()['transaksi'] if t['jenis'] in tanda
                   for a in t.get('alokasi', []) if a['batchId'] == batch_id)

    def test_08_retur_dan_koreksi(self):
        stok = self.stok('tt25')
        # Batch terlama yang pernah terjual, agar terbukti retur tidak masuk ke batch terbaru.
        asal = next(a for t in self.data()['transaksi'] if t['jenis'] == 'keluar' and t['produkId'] == 'tt25'
                    for a in t['alokasi'])
        sebelum = {b['id']: b['penyesuaianKg'] for b in self.data()['batch']}
        r = self.post('/api/transaksi', jenis='retur', tanggal=HARI, nomorDokumen=nomor('RTR'), pihak='Uji',
                      produkId='tt25', jumlah=2, batchId=asal['batchId'], keterangan='Kemasan sobek').get_json()
        self.assertEqual(r['transaksi']['keterangan'], 'Kemasan sobek')
        self.assertEqual(r['alokasi'], [{**asal, 'beratKg': 50}])
        self.assertEqual(self.stok('tt25'), stok + 50)
        sesudah = {b['id']: b['penyesuaianKg'] for b in self.data()['batch']}
        self.assertEqual({k: v - sebelum[k] for k, v in sesudah.items() if v != sebelum[k]}, {asal['batchId']: 50})

        retur = dict(jenis='retur', tanggal=HARI, pihak='Uji', produkId='tt25', keterangan='Kemasan sobek')
        lebih = self.bisa_retur(asal['batchId']) // 25 + 1
        r = self.post('/api/transaksi', nomorDokumen=nomor('RTR'), jumlah=lebih, batchId=asal['batchId'], **retur)
        self.assertEqual(r.status_code, 400)
        self.assertIn('Maksimal', r.get_json()['pesan'])
        batch_lain = next(b['id'] for b in self.data()['batch'] if b['produkId'] == 'tt50')
        for batch_id in (None, 'batch-tt25-1999-01-01', batch_lain):
            r = self.post('/api/transaksi', nomorDokumen=nomor('RTR'), jumlah=1, batchId=batch_id, **retur)
            self.assertEqual(r.status_code, 400, batch_id)
        self.assertEqual(self.stok('tt25'), stok + 50)
        self.post('/api/transaksi', jenis='koreksi', arah='kurang', tanggal=HARI, nomorDokumen=nomor('KOR'),
                  pihak='Stock opname', produkId='tt25', jumlah=1, keterangan='Selisih opname')
        self.assertEqual(self.stok('tt25'), stok + 25)
        for jenis in ('retur', 'ditolak', 'koreksi'):
            r = self.post('/api/transaksi', jenis=jenis, arah='tambah', tanggal=HARI, nomorDokumen=nomor('X'),
                          pihak='Uji', produkId='tt25', jumlah=1, keterangan='  ')
            self.assertEqual(r.status_code, 400, jenis)

    def test_10_pemilik_hanya_melihat(self):
        self.masuk('pemilik', 'pemilik123')
        self.assertEqual(self.klien.get('/api/data').status_code, 200)
        r = self.post('/api/transaksi', jenis='masuk', tanggal=HARI, nomorDokumen=nomor('BM'),
                      pihak='Uji', beratKg=10)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.klien.put('/api/pengaturan', json={'peringatanBulan': 5, 'maksimalBulan': 9}).status_code, 403)
        self.assertEqual(self.klien.put('/api/produk/tt50', json={'hargaSatuan': 1}).status_code, 403)
        self.assertEqual(self.post('/api/reset').status_code, 403)

    def test_validasi_lain(self):
        besok = (date.today() + timedelta(days=1)).isoformat()
        kasus = [
            dict(jenis='masuk', tanggal=besok, nomorDokumen=nomor('BM'), pihak='Uji', beratKg=5),
            dict(jenis='masuk', tanggal=HARI, nomorDokumen='', pihak='Uji', beratKg=5),
            dict(jenis='masuk', tanggal=HARI, nomorDokumen=nomor('BM'), pihak='', beratKg=5),
            dict(jenis='keluar', tanggal=HARI, nomorDokumen=nomor('KLR'), pihak='Uji', produkId='tt50', jumlah=1.5, hargaSatuan=1),
            dict(jenis='keluar', tanggal=HARI, nomorDokumen=nomor('KLR'), pihak='Uji', produkId='bahan-baku', jumlah=1, hargaSatuan=1),
            dict(jenis='hapus', tanggal=HARI, nomorDokumen=nomor('X')),
        ]
        for data in kasus:
            self.assertEqual(self.post('/api/transaksi', **data).status_code, 400, data)
        pertama = self.data()['transaksi'][0]['nomorDokumen']
        r = self.post('/api/transaksi', jenis='masuk', tanggal=HARI, nomorDokumen=pertama.lower(), pihak='Uji', beratKg=5)
        self.assertIn('sudah dipakai', r.get_json()['pesan'])

    def test_stok_dihitung_dari_transaksi(self):
        """Sisa per batch = produksi + alokasi tambah − alokasi ambil, tidak pernah negatif."""
        data = self.data()
        for b in data['batch']:
            self.assertGreaterEqual(b['produksiKg'] + b['penyesuaianKg'] - b['terpakaiKg'], 0, b['id'])
        produksi = sum(t['beratKg'] for t in data['transaksi'] if t['jenis'] == 'produksi')
        self.assertEqual(produksi, sum(b['produksiKg'] for b in data['batch']))

    def test_produksi_tercatat_tiap_minggu(self):
        """Arus mingguan dashboard menampilkan produksi; data contoh mengisi keenam minggu."""
        data = self.data()
        for awal in data['periodeMinggu']:
            akhir = (date.fromisoformat(awal) + timedelta(days=6)).isoformat()
            self.assertTrue(any(
                t['jenis'] == 'produksi' and awal <= t['tanggal'] <= akhir for t in data['transaksi']
            ), awal)


if __name__ == '__main__':
    unittest.main()
