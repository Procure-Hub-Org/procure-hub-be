const express = require('express');
const cors = require('cors');
const serverConfig = require('./src/config/server');
const frontendConfig = require('./src/config/frontend');
const userRoutes = require('./src/routes/userRoutes.js');

const app = express();

app.use(cors({
    origin: frontendConfig.frontendUrl
}));

app.use(express.json());

app.use('/api', userRoutes);

app.listen(serverConfig.port, () => {
    console.log(`Server is running on port ${serverConfig.port}`);
});