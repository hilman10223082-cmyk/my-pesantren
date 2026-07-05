const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'tahfidz-service' }));
app.use('/tahfidz', routes);

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`[tahfidz-service] running on port ${PORT}`));
