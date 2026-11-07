/**
 * Akun demo yang ditampilkan di halaman masuk untuk mengisi formulir otomatis.
 * Kata sandi disimpan sebagai hash di basis data server (backend/seed.py).
 */
export const AKUN_DEMO = [
  {
    id: 'admin',
    identitas: 'admin',
    labelPeran: 'Admin Gudang',
    inisial: 'AG',
    sandiDemo: 'admin123',
  },
  {
    id: 'pemilik',
    identitas: 'pemilik',
    labelPeran: 'Pemilik Pabrik',
    inisial: 'PP',
    sandiDemo: 'pemilik123',
  },
]
