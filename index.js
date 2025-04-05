const express = require('express');
const cors = require('cors');
const serverConfig = require('./src/config/server');
const frontendConfig = require('./src/config/frontend');
const userRoutes = require('./src/routes/userRoutes.js'); // Rute za registraciju korisnika
const adminUserRoutes = require('./src/routes/routes.js'); // Nove rute za admin funkcionalnosti (approve, delete, suspende)

const app = express();

app.use(cors({
    origin: frontendConfig.frontendUrl
}));

app.use(express.json());

// Povezivanje svih ruta
app.use('/api', userRoutes); 
app.use('/api', adminUserRoutes); 

app.listen(serverConfig.port, () => {
    console.log(`Server is running on port ${serverConfig.port}`);
    console.log(`API endpoints dostupni na:
    - POST /api/user/register - Register user
    - PATCH /api/users/:id/approve - Approve user
    - PATCH /api/users/:id/suspend - Suspend user  
    - DELETE /api/users/:id - Delete user`);
});