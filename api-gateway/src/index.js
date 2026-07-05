// api-gateway
// Single entry point (SRS 3.3) yang meneruskan request ke setiap
// microservice sesuai domain fungsionalnya. Client (aplikasi wali santri
// & aplikasi pengurus) HANYA berbicara dengan gateway ini, tidak pernah
// langsung ke service backend.

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const services = {
  '/api/presensi': process.env.PRESENSI_URL || 'http://localhost:4001',
  '/api/pembayaran': process.env.PEMBAYARAN_URL || 'http://localhost:4002',
  '/api/perizinan': process.env.PERIZINAN_URL || 'http://localhost:4003',
  '/api/tahfidz': process.env.TAHFIDZ_URL || 'http://localhost:4004',
  '/api/donasi': process.env.DONASI_URL || 'http://localhost:4005',
  '/api/notifikasi': process.env.NOTIFIKASI_URL || 'http://localhost:4006',
};

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

for (const [routePrefix, target] of Object.entries(services)) {
  const serviceName = routePrefix.replace('/api/', '');
  app.use(
    routePrefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^${routePrefix}`]: `/${serviceName}` },
      onError: (err, req, res) => {
        // Fault isolation (NFR-03): kegagalan satu service tidak menjatuhkan gateway
        console.warn(`[api-gateway] ${serviceName}-service tidak dapat dihubungi:`, err.message);
        res.status(503).json({ error: `Layanan ${serviceName} sedang tidak tersedia` });
      },
    })
  );
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[api-gateway] running on port ${PORT}`));
