const express = require('express');
const cors = require('cors');
const serverConfig = require('./src/config/server');
const frontendConfig = require('./src/config/frontend');

const app = express();

app.use(cors({
    origin: frontendConfig.frontendUrl
}));

app.listen(serverConfig.port, () => {
    console.log(`Server is running on port ${serverConfig.port}`);
});