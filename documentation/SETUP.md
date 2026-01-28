# Detailed Setup Guide

This guide provides step-by-step instructions for setting up and configuring your Prometheus and Grafana monitoring infrastructure.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Adding Monitoring Targets](#adding-monitoring-targets)
- [Configuring Alerts](#configuring-alerts)
- [Customizing Dashboards](#customizing-dashboards)
- [Production Deployment](#production-deployment)

## Prerequisites

Before you begin, ensure you have:

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later
- At least 2GB of available RAM
- Basic knowledge of Docker and containerization
- Understanding of metrics and monitoring concepts

### Verify Docker Installation

```bash
docker --version
docker-compose --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ry-ops/monitoring-infrastructure-prometheus-grafana.git
cd monitoring-infrastructure-prometheus-grafana
```

### 2. Review Configuration Files

Before starting, review the following files:

- `docker-compose.yml` - Service definitions
- `prometheus/prometheus.yml` - Prometheus configuration
- `prometheus/alerts.yml` - Alert rules
- `alertmanager/config.yml` - Alert routing configuration

### 3. Start the Stack

```bash
docker-compose up -d
```

This will start:
- Prometheus (port 9090)
- Grafana (port 3000)
- Node Exporter (port 9100)
- cAdvisor (port 8080)
- AlertManager (port 9093)

### 4. Verify Services

Check that all services are running:

```bash
docker-compose ps
```

All services should show status "Up".

### 5. Access Grafana

1. Open http://localhost:3000
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin`
3. You'll be prompted to change the password - **do this immediately**

## Configuration

### Prometheus Configuration

The main Prometheus configuration is in `prometheus/prometheus.yml`.

#### Scrape Interval

Adjust how often Prometheus collects metrics:

```yaml
global:
  scrape_interval: 15s  # Default is 15s
  evaluation_interval: 15s  # How often to evaluate rules
```

#### Adding Static Targets

To monitor a new service, add a scrape config:

```yaml
scrape_configs:
  - job_name: 'my-application'
    static_configs:
      - targets: ['my-app:8080']
        labels:
          service: 'my-application'
          environment: 'production'
```

#### File-based Service Discovery

For dynamic targets, use file-based discovery:

1. Create a targets file: `prometheus/targets/my-services.yml`

```yaml
- targets:
    - 'service1:9090'
    - 'service2:9090'
  labels:
    job: 'my-services'
    environment: 'production'
```

2. Configure Prometheus to read it:

```yaml
scrape_configs:
  - job_name: 'file-based'
    file_sd_configs:
      - files:
          - '/etc/prometheus/targets/*.yml'
        refresh_interval: 5m
```

### Grafana Configuration

#### Data Sources

Prometheus is configured automatically via provisioning. To add additional data sources:

1. Create a new file in `grafana/provisioning/datasources/`
2. Follow this format:

```yaml
apiVersion: 1
datasources:
  - name: My-Prometheus
    type: prometheus
    url: http://my-prometheus:9090
    access: proxy
    isDefault: false
```

#### User Management

For production, configure proper authentication:

1. Edit `docker-compose.yml` Grafana environment variables:

```yaml
environment:
  - GF_AUTH_ANONYMOUS_ENABLED=false
  - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
  - GF_AUTH_BASIC_ENABLED=true
```

## Adding Monitoring Targets

### Monitoring Applications

#### Python Application

Add to your Python app:

```python
from prometheus_client import start_http_server, Counter

REQUEST_COUNT = Counter('app_requests', 'Application Request Count')

# Start metrics server
start_http_server(8000)
```

Then add to Prometheus config:

```yaml
scrape_configs:
  - job_name: 'python-app'
    static_configs:
      - targets: ['python-app:8000']
```

#### Node.js Application

Add to your Node.js app:

```javascript
const client = require('prom-client');
const register = new client.Registry();

client.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

### Monitoring Docker Containers

cAdvisor is included and automatically monitors all containers. Access metrics at:

```
http://localhost:8080/metrics
```

### Monitoring System Metrics

Node Exporter provides system-level metrics:

- CPU usage
- Memory usage
- Disk I/O
- Network statistics
- Filesystem usage

Access at: `http://localhost:9100/metrics`

## Configuring Alerts

### Creating Alert Rules

Alert rules are defined in `prometheus/alerts.yml`.

#### Basic Alert Structure

```yaml
groups:
  - name: my_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"
```

#### Alert Evaluation

- `expr`: PromQL query that triggers the alert
- `for`: Duration condition must be true before firing
- `labels`: Metadata for routing and grouping
- `annotations`: Human-readable information

### Configuring Alert Notifications

Edit `alertmanager/config.yml` to configure notifications.

#### Email Notifications

```yaml
receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'ops@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

#### Slack Notifications

```yaml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
```

#### PagerDuty Integration

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your-pagerduty-key'
        description: '{{ .GroupLabels.alertname }}'
```

## Customizing Dashboards

### Creating New Dashboards

1. In Grafana UI, click "+" → "Dashboard"
2. Add panels with queries
3. Save dashboard
4. Export as JSON: Dashboard Settings → JSON Model
5. Save to `grafana/dashboards/my-dashboard.json`

### Dashboard Best Practices

- **Use variables** for dynamic filtering
- **Set appropriate refresh rates** (30s - 1m for most dashboards)
- **Use consistent color schemes**
- **Group related metrics** in rows
- **Add annotations** for deployments and incidents

### Example Panel Query

```promql
# CPU Usage by Instance
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## Production Deployment

### Security Hardening

1. **Change all default passwords**

```bash
# Generate secure password
openssl rand -base64 32
```

2. **Enable HTTPS**

Add reverse proxy (nginx/traefik) with TLS:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

3. **Configure authentication**

Enable OAuth or LDAP in Grafana:

```yaml
environment:
  - GF_AUTH_GOOGLE_ENABLED=true
  - GF_AUTH_GOOGLE_CLIENT_ID=your-client-id
  - GF_AUTH_GOOGLE_CLIENT_SECRET=your-client-secret
```

### Resource Limits

Add resource constraints to docker-compose.yml:

```yaml
services:
  prometheus:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Data Persistence

Ensure volumes are properly backed up:

```bash
# Backup Prometheus data
docker run --rm -v prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data

# Backup Grafana data
docker run --rm -v grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /data
```

### High Availability

For production HA setup:

1. **Run multiple Prometheus instances** with identical config
2. **Use Thanos** for long-term storage and querying
3. **Deploy AlertManager** in cluster mode
4. **Use external database** for Grafana (PostgreSQL/MySQL)

### Monitoring the Monitoring

Set up meta-monitoring:

```yaml
# Alert when Prometheus is down
- alert: PrometheusDown
  expr: up{job="prometheus"} == 0
  for: 5m
  labels:
    severity: critical
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Next Steps

- Explore pre-built dashboards at [Grafana Dashboard Repository](https://grafana.com/grafana/dashboards/)
- Learn PromQL: [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- Set up recording rules for frequently used queries
- Implement service discovery for dynamic environments
- Configure long-term storage with Thanos or Cortex
