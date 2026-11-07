/**
 * Panggil API Flask. Respons gagal dilempar sebagai Error berisi pesan server
 * agar formulir bisa menampilkannya apa adanya.
 */
export async function api(path, { method = 'GET', body } = {}) {
  let respons
  try {
    respons = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Server tidak dapat dihubungi. Pastikan backend sedang berjalan.')
  }

  if (respons.status === 204) return null
  const data = await respons.json().catch(() => ({}))
  if (!respons.ok) {
    throw new Error(data.pesan || `Permintaan gagal (${respons.status}).`)
  }
  return data
}
