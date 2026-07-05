const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'pembayaran-service' }));
app.use('/pembayaran', routes);

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`[pembayaran-service] running on port ${PORT}`));
