"""
Example Python application with Prometheus metrics.

This application demonstrates how to instrument a Python web service
with Prometheus metrics for monitoring.
"""

from flask import Flask, jsonify, request
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
import time
import random
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Prometheus metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

active_requests = Gauge(
    'http_requests_active',
    'Number of active HTTP requests'
)

business_metric = Counter(
    'business_events_total',
    'Total business events',
    ['event_type']
)

error_count = Counter(
    'application_errors_total',
    'Total application errors',
    ['error_type']
)


@app.before_request
def before_request():
    """Track active requests and start timer."""
    active_requests.inc()
    request.start_time = time.time()


@app.after_request
def after_request(response):
    """Record metrics after request completion."""
    active_requests.dec()

    # Calculate request duration
    request_duration.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown'
    ).observe(time.time() - request.start_time)

    # Count requests by status code
    request_count.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown',
        status=response.status_code
    ).inc()

    return response


@app.route('/')
def home():
    """Home endpoint."""
    logger.info("Home endpoint accessed")
    return jsonify({
        'message': 'Welcome to the monitored Python application',
        'endpoints': ['/metrics', '/health', '/api/data', '/api/slow', '/api/error']
    })


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'timestamp': time.time()})


@app.route('/api/data')
def get_data():
    """Sample API endpoint that returns data."""
    business_metric.labels(event_type='data_request').inc()

    # Simulate some processing
    time.sleep(random.uniform(0.01, 0.1))

    return jsonify({
        'data': [{'id': i, 'value': random.randint(1, 100)} for i in range(10)]
    })


@app.route('/api/slow')
def slow_endpoint():
    """Endpoint that simulates slow processing."""
    business_metric.labels(event_type='slow_request').inc()

    # Simulate slow processing
    duration = random.uniform(0.5, 2.0)
    time.sleep(duration)

    return jsonify({'processed': True, 'duration': duration})


@app.route('/api/error')
def error_endpoint():
    """Endpoint that randomly returns errors."""
    business_metric.labels(event_type='error_test').inc()

    if random.random() < 0.3:  # 30% error rate
        error_count.labels(error_type='random_error').inc()
        logger.error("Random error occurred")
        return jsonify({'error': 'Random error occurred'}), 500

    return jsonify({'success': True})


@app.route('/metrics')
def metrics():
    """Prometheus metrics endpoint."""
    return generate_latest(REGISTRY), 200, {'Content-Type': 'text/plain; charset=utf-8'}


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    error_count.labels(error_type='not_found').inc()
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    error_count.labels(error_type='internal_error').inc()
    logger.error(f"Internal error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info("Starting Python application with Prometheus metrics")
    app.run(host='0.0.0.0', port=8000, debug=False)
