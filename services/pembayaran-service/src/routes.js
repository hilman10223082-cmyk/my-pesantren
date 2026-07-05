// routes.js - Service Pembayaran
// FR-04, FR-05, FR-06 (SRS 4.2)
// Menggunakan strong consistency: setiap transaksi ditulis ke store utama
// DAN direplikasi secara sinkron ke store backup sebelum response dikirim.

const express = require('express');
const { createStore } = require('./db');
const { publishEvent } = require('./broker');

const router = express.Router();
const pembayaranStore = createStore('pembayaran.json');
const pembayaranBackupStore = createStore('pembayaran.backup.json');

// FR-04 & FR-05: catat transaksi (strong consistency) + replikasi ke node backup
router.post('/', (req, res) => {
  const { id_santri, id_pesantren, nominal, metode } = req.body;
  if (!id_santri || !nominal) {
    return res.status(400).json({ error: 'id_santri dan nominal wajib diisi' });
  }

  const transaksi = {
    id_santri,
    id_pesantren: id_pesantren || 'default',
    nominal,
    metode: metode || 'payment_gateway',
    status_bayar: 'berhasil',
    tanggal: new Date().toISOString(),
  };

  // Tulis ke store utama
  const saved = pembayaranStore.insert(transaksi);
  // Replikasi sinkron ke node backup (strong consistency, durability - FR-05)
  pembayaranBackupStore.insert(saved);

  publishEvent('pembayaran.berhasil', {
    id_santri,
    id_transaksi: saved.id,
    nominal,
    pesan: `Pembayaran santri ${id_santri} sebesar ${nominal} berhasil dikonfirmasi`,
  });

  res.status(201).json(saved);
});

// FR-06: riwayat transaksi pembayaran per santri
router.get('/riwayat/:id_santri', (req, res) => {
  const { id_santri } = req.params;
  const riwayat = pembayaranStore.findBy((r) => r.id_santri === id_santri);
  res.json(riwayat);
});

router.get('/', (req, res) => res.json(pembayaranStore.all()));

module.exports = router;
