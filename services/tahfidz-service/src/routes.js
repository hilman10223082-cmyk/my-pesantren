// routes.js - Service Tahfidz
// FR-10, FR-11 (SRS 4.4)

const express = require('express');
const { createStore } = require('./db');

const router = express.Router();
const tahfidzStore = createStore('tahfidz.json');

// FR-10: catat setoran hafalan santri secara sistematis
router.post('/', (req, res) => {
  const { id_santri, id_pesantren, surah, jumlah_ayat, verified_by } = req.body;
  if (!id_santri || !surah || !jumlah_ayat) {
    return res.status(400).json({ error: 'id_santri, surah, dan jumlah_ayat wajib diisi' });
  }

  const setoran = tahfidzStore.insert({
    id_santri,
    id_pesantren: id_pesantren || 'default',
    surah,
    jumlah_ayat,
    tanggal_setor: new Date().toISOString(),
    // Business rule (SRS 5.5): hanya data terverifikasi pengurus yang bisa
    // dipakai untuk rekap pendaftaran beasiswa.
    verified: Boolean(verified_by),
    verified_by: verified_by || null,
  });

  res.status(201).json(setoran);
});

// FR-11: laporan rekap hafalan (untuk beasiswa/seleksi akademik)
router.get('/rekap/:id_santri', (req, res) => {
  const { id_santri } = req.params;
  const { hanya_terverifikasi } = req.query;

  let setoran = tahfidzStore.findBy((r) => r.id_santri === id_santri);
  if (hanya_terverifikasi === 'true') {
    setoran = setoran.filter((r) => r.verified);
  }

  const total_ayat = setoran.reduce((sum, r) => sum + Number(r.jumlah_ayat), 0);
  const surah_unik = [...new Set(setoran.map((r) => r.surah))];

  res.json({
    id_santri,
    total_setoran: setoran.length,
    total_ayat,
    surah_dihafal: surah_unik,
    detail: setoran,
  });
});

router.get('/', (req, res) => res.json(tahfidzStore.all()));

module.exports = router;
