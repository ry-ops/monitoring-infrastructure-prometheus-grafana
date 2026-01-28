/**
 * Example Node.js application with Prometheus metrics.
 *
 * This application demonstrates how to instrument a Node.js web service
 * with Prometheus metrics for monitoring.
 */

const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = 8001;

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const activeRequests = new client.Gauge({
  name: 'http_requests_active',
  help: 'Number of active HTTP requests',
  registers: [register]
});

const businessEvents = new client.Counter({
  name: 'business_events_total',
  help: 'Total number of business events',
  labelNames: ['event_type'],
  registers: [register]
});

const errorCounter = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type'],
  registers: [register]
});

// Middleware to track request metrics
app.use((req, res, next) => {
  const start = Date.now();
  activeRequests.inc();

  // Track when response is finished
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    activeRequests.dec();

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path)
      .observe(duration);

    httpRequestCounter
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });

  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the monitored Node.js application',
    endpoints: ['/metrics', '/health', '/api/data', '/api/slow', '/api/error']
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

app.get('/api/data', (req, res) => {
  businessEvents.labels('data_request').inc();

  // Simulate some processing
  setTimeout(() => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      value: Math.floor(Math.random() * 100)
    }));

    res.json({ data });
  }, Math.random() * 100);
});

app.get('/api/slow', (req, res) => {
  businessEvents.labels('slow_request').inc();

  // Simulate slow processing
  const duration = 500 + Math.random() * 1500;

  setTimeout(() => {
    res.json({
      processed: true,
      duration: duration / 1000
    });
  }, duration);
});

app.get('/api/error', (req, res) => {
  businessEvents.labels('error_test').inc();

  // 30% chance of error
  if (Math.random() < 0.3) {
    errorCounter.labels('random_error').inc();
    console.error('Random error occurred');
    return res.status(500).json({ error: 'Random error occurred' });
  }

  res.json({ success: true });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
});

// 404 handler
app.use((req, res) => {
  errorCounter.labels('not_found').inc();
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  errorCounter.labels('internal_error').inc();
  console.error('Internal error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node.js application with Prometheus metrics listening on port ${PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
