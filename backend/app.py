"""Backend Flask + SQLite dashboard gudang CV Tani Sadulur.

Jalankan: python backend/app.py  (API di http://127.0.0.1:5000/api)
"""
import math
import os
import re
import sqlite3
from collections import defaultdict
from datetime import date, datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

import seed

FOLDER = Path(__file__).parent
DB_PATH = os.environ.get('DB_PATH', str(FOLDER / 'gudang.db'))

app = Flask(__name__)
# Catatan: kunci sesi bawaan untuk server lokal, isi SECRET_KEY saat dihosting.
# Catatan: sesi disimpan di cookie bertanda tangan, jadi cookie yang tersalin tetap
# berlaku setelah logout; pindah ke sesi sisi server bila dipakai operasional.
app.secret_key = os.environ.get('SECRET_KEY', 'dev-cv-tani-sadulur')
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax')

JENIS = {'masuk', 'produksi', 'keluar', 'retur', 'ditolak', 'koreksi'}
JENIS_ALASAN = {'retur', 'ditolak', 'koreksi'}
JENIS_PIHAK = {'masuk', 'keluar', 'retur', 'ditolak'}
LABEL_PERAN = {'admin': 'Admin Gudang', 'pemilik': 'Pemilik Pabrik'}
BATAS_DEFAULT = {'peringatanBulan': 6, 'maksimalBulan': 10}


class Tolak(Exception):
    """Input ditolak; pesannya ditampilkan apa adanya di formulir."""


@app.errorhandler(Tolak)
def tangani_tolak(error):
    return jsonify(pesan=str(error)), 400


def db():
    if 'db' not in g:
        # isolation_level=None: transaksi diatur manual dengan BEGIN IMMEDIATE.
        g.db = sqlite3.connect(DB_PATH, isolation_level=None)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def tutup_db(_):
    conn = g.pop('db', None)
    if conn is not None:
        conn.close()


def dalam_transaksi(conn, fungsi, *args):
    """Jalankan fungsi dalam satu transaksi tulis; batal seluruhnya bila gagal."""
    conn.execute('BEGIN IMMEDIATE')
    try:
        hasil = fungsi(conn, *args)
    except Exception:
        conn.execute('ROLLBACK')
        raise
    conn.execute('COMMIT')
    return hasil


# ---------- Autentikasi dan peran (K1) ----------

def pengguna_aktif():
    uid = session.get('uid')
    if uid is None:
        return None
    return db().execute('SELECT * FROM pengguna WHERE id = ?', (uid,)).fetchone()


def ke_pengguna(row):
    kata = row['nama'].replace('.', ' ').split()
    return {
        'id': row['nama_pengguna'],
        'identitas': row['nama_pengguna'],
        'nama': row['nama'],
        'peran': row['peran'],
        'labelPeran': LABEL_PERAN[row['peran']],
        'inisial': ''.join(k[0] for k in kata[-2:]).upper(),
    }


def perlu(peran=None):
    def dekorator(fungsi):
        @wraps(fungsi)
        def bungkus(*args, **kwargs):
            pengguna = pengguna_aktif()
            if pengguna is None:
                return jsonify(pesan='Sesi berakhir. Silakan masuk kembali.'), 401
            if peran and pengguna['peran'] != peran:
                return jsonify(pesan='Akun pemilik hanya dapat melihat data.'), 403
            return fungsi(*args, **kwargs)
        return bungkus
    return dekorator


# ---------- Batch, stok, dan FIFO (K5, K6) ----------

def kode_batch(kode_produk, tanggal_produksi):
    _, bulan, hari = tanggal_produksi.split('-')
    return f'B-{kode_produk}-{hari}{bulan}'


def daftar_batch(conn, produk_id=None):
    """Batch = produk + tanggal produksi. Sisa dihitung dari transaksi, bukan angka tetap."""
    rows = conn.execute(
        '''
        WITH prod AS (
          SELECT produk_id, tanggal_produksi, SUM(berat_kg) AS produksi
          FROM transaksi WHERE jenis = 'produksi' GROUP BY produk_id, tanggal_produksi
        ), alok AS (
          SELECT t.produk_id, a.tanggal_produksi,
                 SUM(CASE WHEN a.berat_kg < 0 THEN -a.berat_kg ELSE 0 END) AS terpakai,
                 SUM(CASE WHEN a.berat_kg > 0 THEN a.berat_kg ELSE 0 END) AS penyesuaian
          FROM alokasi_batch a JOIN transaksi t ON t.id = a.transaksi_id
          GROUP BY t.produk_id, a.tanggal_produksi
        )
        SELECT prod.produk_id, prod.tanggal_produksi, prod.produksi,
               COALESCE(alok.terpakai, 0) AS terpakai,
               COALESCE(alok.penyesuaian, 0) AS penyesuaian
        FROM prod LEFT JOIN alok USING (produk_id, tanggal_produksi)
        WHERE :produk IS NULL OR prod.produk_id = :produk
        ORDER BY prod.tanggal_produksi, prod.produk_id
        ''',
        {'produk': produk_id},
    ).fetchall()
    return [
        {**dict(row), 'sisa': max(0, row['produksi'] + row['penyesuaian'] - row['terpakai'])}
        for row in rows
    ]


def stok_produk(conn, produk_id):
    return sum(batch['sisa'] for batch in daftar_batch(conn, produk_id))


def ambil_fifo(conn, produk, berat):
    """Ambil dari batch tertua yang masih punya stok, lalu batch berikutnya (K5)."""
    sisa = berat
    alokasi = []
    for batch in daftar_batch(conn, produk['id']):
        if sisa <= 0:
            break
        ambil = min(sisa, batch['sisa'])
        if ambil > 0:
            alokasi.append((batch['tanggal_produksi'], -ambil))
            sisa -= ambil
    if sisa > 1e-9:
        raise Tolak(f"Stok {produk['kemasan']} tidak cukup. Kurang {sisa:g} kg.")
    return alokasi


def tambah_ke_batch_terbaru(conn, produk, berat):
    daftar = daftar_batch(conn, produk['id'])
    if not daftar:
        raise Tolak(f"Belum ada batch {produk['kemasan']}. Catat hasil produksi terlebih dahulu.")
    return [(daftar[-1]['tanggal_produksi'], berat)]


def kembalikan_ke_batch_asal(conn, produk, berat, batch_id):
    """Retur masuk ke batch asalnya, jadi umurnya tetap dihitung dari tanggal produksi batch itu."""
    batch = next(
        (b for b in daftar_batch(conn) if f"batch-{b['produk_id']}-{b['tanggal_produksi']}" == batch_id),
        None,
    )
    if batch is None:
        raise Tolak('Pilih batch asal retur.')
    if batch['produk_id'] != produk['id']:
        raise Tolak(f"Batch asal bukan batch {produk['kemasan']}.")
    tgl = batch['tanggal_produksi']
    # Yang bisa diretur = total penjualan dari batch ini dikurangi retur sebelumnya.
    bisa = -conn.execute(
        '''SELECT COALESCE(SUM(a.berat_kg), 0) FROM alokasi_batch a JOIN transaksi t ON t.id = a.transaksi_id
           WHERE t.produk_id = ? AND a.tanggal_produksi = ? AND t.jenis IN ('keluar', 'retur')''',
        (produk['id'], tgl),
    ).fetchone()[0]
    if berat > bisa + 1e-9:
        raise Tolak(
            f"Retur melebihi barang yang keluar dari batch {kode_batch(produk['kode'], tgl)}. "
            f"Maksimal {max(0, bisa):g} kg."
        )
    return [(tgl, berat)]


# ---------- Transaksi (K2, K3, K4, K9) ----------

def angka(nilai, pesan):
    try:
        hasil = float(nilai)
    except (TypeError, ValueError):
        raise Tolak(pesan) from None
    if not math.isfinite(hasil):
        raise Tolak(pesan)
    return hasil


def simpan_transaksi(conn, data, hari_ini):
    """Validasi lalu simpan satu transaksi beserta alokasi batch-nya.

    Server tidak mempercayai berat dan nilai dari klien: keduanya dihitung ulang
    dari jumlah × berat per satuan dan jumlah × harga satuan.
    """
    jenis = data.get('jenis')
    if jenis not in JENIS:
        raise Tolak('Jenis transaksi tidak dikenal.')

    try:
        tanggal = date.fromisoformat(str(data.get('tanggal') or ''))
    except ValueError:
        raise Tolak('Tanggal tidak valid.') from None
    if tanggal > hari_ini:
        raise Tolak('Tanggal tidak boleh melewati hari ini.')

    nomor = str(data.get('nomorDokumen') or '').strip()
    if not nomor:
        raise Tolak('Nomor dokumen wajib diisi.')
    if conn.execute('SELECT 1 FROM transaksi WHERE nomor_dokumen = ?', (nomor,)).fetchone():
        raise Tolak('Nomor dokumen sudah dipakai transaksi lain.')

    pihak = str(data.get('pihak') or '').strip()
    if jenis in JENIS_PIHAK and not pihak:
        raise Tolak('Nama pemasok atau pembeli wajib diisi.')

    keterangan = str(data.get('keterangan') or '').strip()
    if jenis in JENIS_ALASAN and not keterangan:
        raise Tolak('Alasan wajib diisi untuk transaksi ini.')

    arah = data.get('arah') if jenis == 'koreksi' else None
    if jenis == 'koreksi' and arah not in ('tambah', 'kurang'):
        raise Tolak('Arah koreksi harus tambah atau kurang.')

    jam = str(data.get('jam') or datetime.now().strftime('%H:%M'))
    if not re.fullmatch(r'\d{2}:\d{2}', jam):
        raise Tolak('Jam tidak valid.')

    produk_id = 'bahan-baku' if jenis == 'masuk' else data.get('produkId')
    produk = conn.execute('SELECT * FROM produk WHERE id = ?', (produk_id,)).fetchone()
    jenis_produk = 'bahan-baku' if jenis == 'masuk' else 'tepung'
    if produk is None or produk['jenis'] != jenis_produk:
        raise Tolak('Pilih produk tepung.')

    if jenis == 'masuk':
        berat = angka(data.get('beratKg'), 'Berat harus lebih dari 0 kg.')
        jumlah = berat
    else:
        jumlah = angka(data.get('jumlah'), 'Jumlah harus bilangan bulat lebih dari 0.')
        if jumlah <= 0 or not jumlah.is_integer():
            raise Tolak('Jumlah harus bilangan bulat lebih dari 0.')
        berat = jumlah * produk['berat_per_satuan']
    if berat <= 0:
        raise Tolak('Berat harus lebih dari 0 kg.')

    nilai = 0
    if jenis == 'keluar':
        harga = angka(data.get('hargaSatuan'), 'Harga satuan wajib diisi dan tidak boleh negatif.')
        if harga < 0:
            raise Tolak('Harga satuan wajib diisi dan tidak boleh negatif.')
        nilai = round(jumlah * harga)
    elif jenis in ('retur', 'ditolak'):
        nilai = round(jumlah * produk['harga_satuan'])

    stok_sebelum = stok_produk(conn, produk_id) if jenis != 'masuk' else 0
    tanggal_iso = tanggal.isoformat()
    batch_baru = None
    if jenis == 'produksi':
        batch_baru = not any(b['tanggal_produksi'] == tanggal_iso for b in daftar_batch(conn, produk_id))
        alokasi = []
    elif jenis in ('keluar', 'ditolak') or arah == 'kurang':
        alokasi = ambil_fifo(conn, produk, berat)
    elif jenis == 'retur':
        alokasi = kembalikan_ke_batch_asal(conn, produk, berat, data.get('batchId'))
    elif jenis == 'koreksi':
        alokasi = tambah_ke_batch_terbaru(conn, produk, berat)
    else:
        alokasi = []

    transaksi_id = conn.execute(
        '''INSERT INTO transaksi (jenis, tanggal, jam, nomor_dokumen, pihak, produk_id, jumlah,
             berat_kg, nilai, tanggal_produksi, arah, keterangan)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (jenis, tanggal_iso, jam, nomor, pihak, produk_id, jumlah, berat, nilai,
         tanggal_iso if jenis == 'produksi' else None, arah, keterangan),
    ).lastrowid
    conn.executemany(
        'INSERT INTO alokasi_batch (transaksi_id, tanggal_produksi, berat_kg) VALUES (?, ?, ?)',
        [(transaksi_id, tgl, kg) for tgl, kg in alokasi],
    )

    row = conn.execute('SELECT * FROM transaksi WHERE id = ?', (transaksi_id,)).fetchone()
    transaksi = ke_transaksi(row, produk['kode'], [(produk_id, tgl, kg) for tgl, kg in alokasi])
    return {
        'transaksi': transaksi,
        'alokasi': transaksi.get('alokasi', []),
        'batchBaru': batch_baru,
        'stokSebelum': stok_sebelum,
        'stokSesudah': stok_produk(conn, produk_id) if jenis != 'masuk' else 0,
    }


# ---------- Bentuk data untuk frontend ----------

def ke_produk(row):
    return {
        'id': row['id'],
        'nama': row['nama'],
        'kemasan': row['kemasan'],
        'kode': row['kode'],
        'jenis': row['jenis'],
        'beratPerSatuan': row['berat_per_satuan'],
        'hargaSatuan': row['harga_satuan'],
        'hargaPerKg': row['harga_satuan'] / row['berat_per_satuan'] if row['berat_per_satuan'] else 0,
    }


def ke_transaksi(row, kode_produk, alokasi):
    hasil = {
        'id': row['id'],
        'jenis': row['jenis'],
        'tanggal': row['tanggal'],
        'jam': row['jam'],
        'nomorDokumen': row['nomor_dokumen'],
        'pihak': row['pihak'],
        'produkId': row['produk_id'],
        'jumlah': row['jumlah'],
        'beratKg': row['berat_kg'],
        'nilai': row['nilai'],
        'keterangan': row['keterangan'],
        'dibuat': row['id'],
    }
    if row['arah']:
        hasil['arah'] = row['arah']
    if row['jenis'] == 'produksi':
        hasil['tanggalProduksi'] = row['tanggal_produksi']
        hasil['batchKode'] = kode_batch(kode_produk, row['tanggal_produksi'])
    if alokasi:
        hasil['alokasi'] = [
            {
                'batchId': f'batch-{produk_id}-{tgl}',
                'kode': kode_batch(kode_produk, tgl),
                'tanggalProduksi': tgl,
                'beratKg': abs(kg),
            }
            for produk_id, tgl, kg in alokasi
        ]
    return hasil


def ambil_data(conn, hari_ini):
    produk = [ke_produk(row) for row in conn.execute('SELECT * FROM produk ORDER BY rowid')]
    kode = {item['id']: item['kode'] for item in produk}

    alokasi = defaultdict(list)
    for row in conn.execute(
        '''SELECT a.transaksi_id, t.produk_id, a.tanggal_produksi, a.berat_kg
           FROM alokasi_batch a JOIN transaksi t ON t.id = a.transaksi_id ORDER BY a.id'''
    ):
        alokasi[row['transaksi_id']].append((row['produk_id'], row['tanggal_produksi'], row['berat_kg']))

    transaksi = [
        ke_transaksi(row, kode[row['produk_id']], alokasi[row['id']])
        for row in conn.execute('SELECT * FROM transaksi ORDER BY id')
    ]
    batch = [
        {
            'id': f"batch-{b['produk_id']}-{b['tanggal_produksi']}",
            'kode': kode_batch(kode[b['produk_id']], b['tanggal_produksi']),
            'produkId': b['produk_id'],
            'tanggalProduksi': b['tanggal_produksi'],
            'produksiKg': b['produksi'],
            'terpakaiKg': b['terpakai'],
            'penyesuaianKg': b['penyesuaian'],
        }
        for b in daftar_batch(conn)
    ]
    pengaturan = {**BATAS_DEFAULT, **{
        row['kunci']: row['nilai'] for row in conn.execute('SELECT * FROM pengaturan')
    }}
    senin = hari_ini - timedelta(days=hari_ini.weekday())
    return {
        'hariIni': hari_ini.isoformat(),
        'produk': produk,
        'batch': batch,
        'transaksi': transaksi,
        'pengaturan': pengaturan,
        'periodeMinggu': [(senin - timedelta(weeks=5 - i)).isoformat() for i in range(6)],
    }


# ---------- Data awal ----------

def isi_data_awal(conn, hari_ini):
    """Kosongkan data gudang lalu isi ulang dengan data contoh (pengguna tetap)."""
    for tabel in ('alokasi_batch', 'transaksi', 'produk', 'pengaturan'):
        conn.execute(f'DELETE FROM {tabel}')
    conn.executemany('INSERT INTO produk VALUES (?, ?, ?, ?, ?, ?, ?)', seed.PRODUK)
    conn.executemany('INSERT INTO pengaturan VALUES (?, ?)', BATAS_DEFAULT.items())
    for data in seed.transaksi_awal(hari_ini):
        simpan_transaksi(conn, data, hari_ini)


def siapkan_db():
    conn = sqlite3.connect(DB_PATH, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.executescript((FOLDER / 'schema.sql').read_text(encoding='utf-8'))
    if conn.execute('SELECT COUNT(*) FROM pengguna').fetchone()[0] == 0:
        conn.execute('BEGIN IMMEDIATE')
        conn.executemany(
            'INSERT INTO pengguna (nama_pengguna, nama, kata_sandi, peran) VALUES (?, ?, ?, ?)',
            [(u, nama, generate_password_hash(sandi), peran) for u, nama, sandi, peran in seed.PENGGUNA],
        )
        isi_data_awal(conn, date.today())
        conn.execute('COMMIT')
    # Samakan nama tampilan akun lama dengan seed (nama pribadi diganti nama peran).
    conn.executemany(
        'UPDATE pengguna SET nama = ? WHERE nama_pengguna = ?',
        [(nama, u) for u, nama, _, _ in seed.PENGGUNA],
    )
    conn.close()


# ---------- Rute API ----------

@app.post('/api/login')
def login():
    data = request.get_json(silent=True) or {}
    nama = str(data.get('identitas') or '').strip().lower()
    row = db().execute('SELECT * FROM pengguna WHERE nama_pengguna = ?', (nama,)).fetchone()
    if row is None or not check_password_hash(row['kata_sandi'], str(data.get('sandi') or '')):
        return jsonify(pesan='Nama pengguna atau kata sandi salah.'), 401
    session.clear()
    session['uid'] = row['id']
    return jsonify(ke_pengguna(row))


@app.post('/api/logout')
def logout():
    session.clear()
    return '', 204


@app.get('/api/sesi')
def sesi():
    pengguna = pengguna_aktif()
    return jsonify(pengguna=ke_pengguna(pengguna) if pengguna else None)


@app.get('/api/data')
@perlu()
def data_gudang():
    return jsonify(ambil_data(db(), date.today()))


@app.post('/api/transaksi')
@perlu('admin')
def tambah_transaksi():
    data = request.get_json(silent=True) or {}
    return jsonify(dalam_transaksi(db(), simpan_transaksi, data, date.today())), 201


@app.put('/api/pengaturan')
@perlu('admin')
def ubah_pengaturan():
    data = request.get_json(silent=True) or {}
    peringatan = angka(data.get('peringatanBulan'), 'Batas umur harus berupa angka lebih dari nol.')
    maksimal = angka(data.get('maksimalBulan'), 'Batas umur harus berupa angka lebih dari nol.')
    if peringatan <= 0 or maksimal <= 0:
        raise Tolak('Batas umur harus berupa angka lebih dari nol.')
    if peringatan >= maksimal:
        raise Tolak('Batas peringatan harus lebih kecil dari batas maksimal.')
    db().executemany(
        'INSERT OR REPLACE INTO pengaturan VALUES (?, ?)',
        [('peringatanBulan', peringatan), ('maksimalBulan', maksimal)],
    )
    return jsonify(peringatanBulan=peringatan, maksimalBulan=maksimal)


@app.put('/api/produk/<produk_id>')
@perlu('admin')
def ubah_harga(produk_id):
    data = request.get_json(silent=True) or {}
    harga = angka(data.get('hargaSatuan'), 'Harga satuan tidak boleh negatif.')
    if harga < 0:
        raise Tolak('Harga satuan tidak boleh negatif.')
    conn = db()
    if conn.execute('UPDATE produk SET harga_satuan = ? WHERE id = ?', (round(harga), produk_id)).rowcount == 0:
        return jsonify(pesan='Produk tidak ditemukan.'), 404
    return jsonify(ke_produk(conn.execute('SELECT * FROM produk WHERE id = ?', (produk_id,)).fetchone()))


@app.post('/api/reset')
@perlu('admin')
def reset_data():
    dalam_transaksi(db(), isi_data_awal, date.today())
    return jsonify(ambil_data(db(), date.today()))


siapkan_db()

if __name__ == '__main__':
    app.run(port=5000, debug=True)
