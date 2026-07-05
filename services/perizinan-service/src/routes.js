// routes.js - Service Perizinan
// FR-07, FR-08, FR-09 (SRS 4.3)

const express = require('express');
const { createStore } = require('./db');
const { publishEvent } = require('./broker');

const router = express.Router();
const perizinanStore = createStore('perizinan.json');

// FR-07: pengajuan izin digital oleh wali santri/santri
router.post('/', (req, res) => {
  const { id_santri, id_pesantren, jenis_izin, keterangan } = req.body;
  if (!id_santri || !jenis_izin) {
    return res.status(400).json({ error: 'id_santri dan jenis_izin wajib diisi' });
  }

  const izin = perizinanStore.insert({
    id_santri,
    id_pesantren: id_pesantren || 'default',
    jenis_izin, // 'pulang' | 'sakit' | 'lainnya'
    keterangan: keterangan || null,
    status_approval: 'menunggu',
    tanggal: new Date().toISOString(),
  });

  publishEvent('perizinan.diajukan', {
    id_izin: izin.id,
    id_santri,
    pesan: `Pengajuan izin baru dari santri ${id_santri} (${jenis_izin})`,
  });

  res.status(201).json(izin);
});

// FR-08: pengurus menyetujui/menolak pengajuan izin
router.put('/:id/keputusan', (req, res) => {
  const { id } = req.params;
  const { keputusan } = req.body; // 'disetujui' | 'ditolak'

  if (!['disetujui', 'ditolak'].includes(keputusan)) {
    return res.status(400).json({ error: "keputusan harus 'disetujui' atau 'ditolak'" });
  }

  const updated = perizinanStore.update(id, { status_approval: keputusan });
  if (!updated) return res.status(404).json({ error: 'Data izin tidak ditemukan' });

  // FR-09: sinkronisasi status ke node wali santri via broker (eventual consistency)
  publishEvent('perizinan.status_diubah', {
    id_izin: id,
    id_santri: updated.id_santri,
    status_approval: keputusan,
    pesan: `Status izin santri ${updated.id_santri} diperbarui menjadi ${keputusan}`,
  });

  res.json(updated);
});

router.get('/', (req, res) => {
  const { id_santri } = req.query;
  const data = id_santri
    ? perizinanStore.findBy((r) => r.id_santri === id_santri)
    : perizinanStore.all();
  res.json(data);
});

module.exports = router;
