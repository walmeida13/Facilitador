// server.js - Servidor Express para Railway
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'facilitador',
    version: '2.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Facilitador API',
    version: '2.0.0',
    description: 'Conversor PDF/DOCX para Markdown com OCR',
    endpoints: {
      health: '/health',
      convert: '/api (POST)',
      docs: '/api/public/index.html'
    }
  });
});

// Serve static files
app.use('/api/public', express.static(path.join(__dirname, 'api/public')));

// API endpoint - importa o handler existente
app.post('/api', async (req, res) => {
  const handler = require('./api/index.js');
  return handler(req, res);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Facilitador rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando graciosamente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, encerrando graciosamente...');
  process.exit(0);
});
