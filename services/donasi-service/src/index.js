const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'donasi-service' }));
app.use('/donasi', routes);

const PORT = process.env.PORT || 4005;
app.listen(PORT, () => console.log(`[donasi-service] running on port ${PORT}`));
