// broker.js
// Wrapper tipis di atas RabbitMQ (amqplib) untuk komunikasi event-driven
// antar microservice (lihat SRS 6.4 - Message Broker dan Sinkronisasi Data).
//
// Desain sengaja "fail-soft": jika broker sedang down, service TIDAK ikut
// down (NFR-03 - fault isolation). Publish/consume yang gagal hanya
// dicatat sebagai warning, service utama tetap melayani request REST.

const amqp = require('amqplib');

const BROKER_URL = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'mypesantren.events';

let channelPromise = null;

async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const conn = await amqp.connect(BROKER_URL);
      const ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      conn.on('error', (err) => {
        console.warn('[broker] connection error:', err.message);
        channelPromise = null;
      });
      conn.on('close', () => {
        console.warn('[broker] connection closed');
        channelPromise = null;
      });
      return ch;
    })().catch((err) => {
      console.warn('[broker] gagal konek ke message broker:', err.message);
      channelPromise = null;
      throw err;
    });
  }
  return channelPromise;
}

/**
 * Publish event ke message broker secara asinkron & non-blocking.
 * routingKey contoh: "presensi.tidak_hadir", "pembayaran.berhasil",
 * "perizinan.status_diubah".
 */
async function publishEvent(routingKey, payload) {
  try {
    const ch = await getChannel();
    const body = Buffer.from(JSON.stringify({
      routingKey,
      payload,
      timestamp: new Date().toISOString(),
    }));
    ch.publish(EXCHANGE, routingKey, body, { persistent: true });
    console.log(`[broker] event published: ${routingKey}`);
  } catch (err) {
    // Non-blocking: layanan utama tidak boleh terganggu jika broker down.
    console.warn(`[broker] gagal publish event "${routingKey}":`, err.message);
  }
}

/**
 * Subscribe ke satu atau beberapa routing key (dipakai oleh notifikasi-service).
 */
async function subscribeEvents(bindingKeys, onMessage) {
  try {
    const ch = await getChannel();
    const q = await ch.assertQueue('', { exclusive: true });
    for (const key of bindingKeys) {
      await ch.bindQueue(q.queue, EXCHANGE, key);
    }
    ch.consume(q.queue, (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        onMessage(data);
        ch.ack(msg);
      } catch (err) {
        console.error('[broker] gagal proses pesan:', err.message);
        ch.nack(msg, false, false);
      }
    });
    console.log(`[broker] subscribed to: ${bindingKeys.join(', ')}`);
  } catch (err) {
    console.warn('[broker] gagal subscribe, retry dalam 5 detik:', err.message);
    setTimeout(() => subscribeEvents(bindingKeys, onMessage), 5000);
  }
}

module.exports = { publishEvent, subscribeEvents };
