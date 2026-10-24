require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { Server } = require('socket.io');

const webRoutes = require('./src/routes/webRoutes');
const { attachUniversalCrudRoutes } = require('./src/services/UniversalCrudBinder');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Simpan instance Socket.io agar dapat diakses dari seluruh controller
app.set('io', io);

// View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware Body Parser & Static Files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Pasang rute CRUD & Penilaian Universal terlebih dahulu
attachUniversalCrudRoutes(app, io);

// Pasang rute utama aplikasi
app.use('/', webRoutes);

// Socket.io Real-time Connection
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('==========================================================');
  console.log(`🐎🏹 STHAC 2026 Server aktif di : http://localhost:${PORT}`);
  console.log(`🛡️  Panel Panitia (CRUD & Skor) : http://localhost:${PORT}/panitia`);
  console.log('==========================================================');
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});