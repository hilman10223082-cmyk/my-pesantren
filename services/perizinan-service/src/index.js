const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'perizinan-service' }));
app.use('/perizinan', routes);

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`[perizinan-service] running on port ${PORT}`));
