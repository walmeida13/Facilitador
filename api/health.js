// /api/health.js - Health check endpoint para Railway
module.exports = async (req, res) => {
  try {
    // Verifica se o servidor está respondendo
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'facilitador',
      version: '2.0.0'
    };
    
    return res.status(200).json(status);
  } catch (e) {
    return res.status(503).json({ 
      status: 'error', 
      message: 'Service unavailable' 
    });
  }
};
