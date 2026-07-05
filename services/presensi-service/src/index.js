const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'presensi-service' }));
app.use('/presensi', routes);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`[presensi-service] running on port ${PORT}`));
