// routes.js - Service Donasi
// FR-12, FR-13 (SRS 4.5)

const express = require('express');
const { createStore } = require('./db');

const router = express.Router();
const donasiStore = createStore('donasi.json');

// FR-12: catat donasi masuk beserta sumber dan peruntukannya
router.post('/', (req, res) => {
  const { nama_donatur, id_pesantren, nominal, peruntukan, anonim } = req.body;
  if (!nominal) {
    return res.status(400).json({ error: 'nominal wajib diisi' });
  }

  const donasi = donasiStore.insert({
    nama_donatur: anonim ? 'Hamba Allah' : (nama_donatur || 'Anonim'),
    id_pesantren: id_pesantren || 'default',
    nominal,
    peruntukan: peruntukan || 'operasional_umum',
    tanggal: new Date().toISOString(),
  });

  res.status(201).json(donasi);
});

// FR-13: laporan donasi transparan, dapat diakses publik/wali santri
router.get('/laporan', (req, res) => {
  const semua = donasiStore.all();
  const total = semua.reduce((sum, d) => sum + Number(d.nominal), 0);
  const per_peruntukan = semua.reduce((acc, d) => {
    acc[d.peruntukan] = (acc[d.peruntukan] || 0) + Number(d.nominal);
    return acc;
  }, {});

  res.json({
    total_donasi: total,
    jumlah_donatur: semua.length,
    rincian_per_peruntukan: per_peruntukan,
    daftar: semua,
  });
});

module.exports = router;
