const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import the database configuration to trigger connection test
const db = require('./configs/db');
const authRoutes = require('./routes/authRoutes'); // auth routes
const configRoutes = require('./routes/configRoutes');  //list of schools at registration
const schoolRoutes = require('./routes/schoolRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const seriesRoutes = require('./routes/seriesRoutes');
const fileRoutes = require('./routes/fileRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const registrationListRoutes = require('./routes/registrationListRoutes');
const teamRoutes = require('./routes/teamRoutes');
const studentHubRoutes = require('./routes/studentHubRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

app.use('/api/auth', authRoutes); // 2. Mount Routes
app.use('/api', configRoutes); // Mounts /api/schools
app.use('/api', schoolRoutes);
app.use('/api', ownerRoutes);
app.use('/api', categoryRoutes);
app.use('/api', seriesRoutes);
app.use('/api', fileRoutes);
app.use('/api', eventRoutes);
app.use('/api', registrationRoutes);
app.use('/api', registrationListRoutes);
app.use('/api', teamRoutes);
app.use('/api', studentHubRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', evaluationRoutes);



// Health Check 
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        message: 'College Event Management Portal Backend is running.'
    });
});






// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});

