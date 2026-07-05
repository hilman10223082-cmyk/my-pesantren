// routes.js - Service Presensi
// FR-01, FR-02, FR-03 (SRS 4.1)

const express = require('express');
const { createStore } = require('./db');
const { publishEvent } = require('./broker');

const router = express.Router();
const presensiStore = createStore('presensi.json');

// FR-01: mencatat kehadiran santri per hari, tersimpan di DB service ini
router.post('/', (req, res) => {
  const { id_santri, id_pesantren, tanggal, status, kelas } = req.body;
  if (!id_santri || !tanggal || !status) {
    return res.status(400).json({ error: 'id_santri, tanggal, dan status wajib diisi' });
  }
  const record = presensiStore.insert({
    id_santri,
    id_pesantren: id_pesantren || 'default',
    kelas: kelas || null,
    tanggal,
    status, // 'hadir' | 'sakit' | 'izin' | 'tanpa_keterangan'
    created_at: new Date().toISOString(),
  });

  // FR-02: notifikasi asinkron ke wali santri jika tidak hadir tanpa keterangan
  if (status === 'tanpa_keterangan') {
    publishEvent('presensi.tidak_hadir', {
      id_santri,
      tanggal,
      pesan: `Santri ${id_santri} tidak hadir tanpa keterangan pada ${tanggal}`,
    });
  }

  res.status(201).json(record);
});

// GET semua presensi (opsional filter by id_santri)
router.get('/', (req, res) => {
  const { id_santri } = req.query;
  const data = id_santri
    ? presensiStore.findBy((r) => r.id_santri === id_santri)
    : presensiStore.all();
  res.json(data);
});

// FR-03: rekap kehadiran bulanan
router.get('/rekap/:bulan', (req, res) => {
  const { bulan } = req.params; // format YYYY-MM
  const { id_santri } = req.query;
  const records = presensiStore
    .all()
    .filter((r) => r.tanggal.startsWith(bulan))
    .filter((r) => (id_santri ? r.id_santri === id_santri : true));

  const rekap = records.reduce((acc, r) => {
    acc[r.id_santri] = acc[r.id_santri] || { hadir: 0, sakit: 0, izin: 0, tanpa_keterangan: 0 };
    if (acc[r.id_santri][r.status] !== undefined) acc[r.id_santri][r.status] += 1;
    return acc;
  }, {});

  res.json({ bulan, rekap });
});

module.exports = router;
