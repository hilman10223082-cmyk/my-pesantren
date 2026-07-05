// notifikasi-service
// Consumer asinkron untuk event dari Presensi, Pembayaran, dan Perizinan
// (SRS 6.4 - Message Broker dan Sinkronisasi Data).
//
// Pada implementasi produksi, kirimPushNotification() diganti dengan
// panggilan ke Firebase Cloud Messaging / WhatsApp Business API
// (SRS 3.3 - Software Interfaces). Di sini disimulasikan lewat log +
// file notifications.json agar bisa diverifikasi tanpa API key eksternal.

const fs = require('fs');
const path = require('path');
const express = require('express');
const { subscribeEvents } = require('./broker');

const NOTIF_FILE = path.join(__dirname, '..', '..', '..', 'data', 'notifikasi.json');

function kirimPushNotification(event) {
  if (!fs.existsSync(NOTIF_FILE)) fs.writeFileSync(NOTIF_FILE, '[]');
  const notifs = JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf-8'));
  notifs.push({ ...event, sent_at: new Date().toISOString() });
  fs.writeFileSync(NOTIF_FILE, JSON.stringify(notifs, null, 2));
  console.log(`[notifikasi-service] >> ${event.routingKey}: ${event.payload.pesan}`);
}

subscribeEvents(
  ['presensi.tidak_hadir', 'pembayaran.berhasil', 'perizinan.diajukan', 'perizinan.status_diubah'],
  kirimPushNotification
);

// Endpoint kecil untuk memantau notifikasi yang sudah terkirim (debugging/demo)
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifikasi-service' }));
app.get('/notifikasi', (req, res) => {
  if (!fs.existsSync(NOTIF_FILE)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf-8')));
});

const PORT = process.env.PORT || 4006;
app.listen(PORT, () => console.log(`[notifikasi-service] running on port ${PORT}`));
