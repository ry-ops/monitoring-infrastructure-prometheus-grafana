# Monitoring Infrastructure with Prometheus & Grafana

A production-ready monitoring stack using Prometheus for metrics collection and Grafana for visualization. This project provides a complete setup for monitoring your infrastructure, applications, and services.

## Features

- **Prometheus**: Time-series database and monitoring system
- **Grafana**: Powerful visualization and analytics platform
- **Node Exporter**: Hardware and OS metrics collector
- **cAdvisor**: Container metrics analyzer
- **Alert Manager**: Alert handling and routing
- **Pre-configured Dashboards**: Ready-to-use monitoring dashboards

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of monitoring concepts
- At least 2GB of available RAM

## Quick Start

1. Clone this repository:
```bash
git clone https://github.com/ry-ops/monitoring-infrastructure-prometheus-grafana.git
cd monitoring-infrastructure-prometheus-grafana
```

2. Start the monitoring stack:
```bash
docker-compose up -d
```

3. Access the services:
   - Grafana: http://localhost:3000 (default credentials: admin/admin)
   - Prometheus: http://localhost:9090
   - AlertManager: http://localhost:9093

## Project Structure

```
.
├── README.md
├── LICENSE
├── docker-compose.yml
├── prometheus/
│   ├── prometheus.yml          # Prometheus configuration
│   ├── alerts.yml              # Alert rules
│   └── targets/                # Service discovery configs
├── grafana/
│   ├── provisioning/
│   │   ├── dashboards/         # Dashboard definitions
│   │   └── datasources/        # Data source configs
│   └── dashboards/             # JSON dashboard files
├── alertmanager/
│   └── config.yml              # AlertManager configuration
├── examples/
│   ├── python-app/             # Example Python app with metrics
│   └── node-app/               # Example Node.js app with metrics
└── documentation/
    ├── SETUP.md                # Detailed setup guide
    ├── DASHBOARDS.md           # Dashboard documentation
    └── TROUBLESHOOTING.md      # Common issues and solutions
```

## Configuration

### Prometheus Targets

Edit `prometheus/prometheus.yml` to add your services for monitoring. The default configuration monitors:
- Prometheus itself
- Node Exporter (system metrics)
- cAdvisor (container metrics)

### Grafana Dashboards

Dashboards are automatically provisioned on startup. To add custom dashboards:
1. Create your dashboard in Grafana UI
2. Export as JSON
3. Save to `grafana/dashboards/`
4. Restart Grafana

### Alert Rules

Configure alerts in `prometheus/alerts.yml`. Example alerts are included for:
- High CPU usage
- High memory usage
- Service down
- Disk space low

## Example Applications

Two example applications with Prometheus metrics are included:

### Python Application
```bash
cd examples/python-app
docker-compose up -d
```

### Node.js Application
```bash
cd examples/node-app
docker-compose up -d
```

Both apps expose metrics at `/metrics` endpoint and demonstrate best practices for application instrumentation.

## Monitoring Your Own Applications

### Python (using prometheus-client)
```python
from prometheus_client import Counter, Histogram, generate_latest

request_count = Counter('app_requests_total', 'Total requests')
request_duration = Histogram('app_request_duration_seconds', 'Request duration')
```

### Node.js (using prom-client)
```javascript
const client = require('prom-client');
const counter = new client.Counter({
  name: 'app_requests_total',
  help: 'Total requests'
});
```

## Data Retention

Default retention period is 15 days. To modify:
1. Edit `docker-compose.yml`
2. Update Prometheus command args: `--storage.tsdb.retention.time=30d`

## Security Considerations

For production deployments:
- Change default Grafana credentials immediately
- Enable HTTPS/TLS
- Configure authentication (LDAP, OAuth, etc.)
- Set up proper network isolation
- Use secrets management for sensitive configs
- Enable Grafana authentication and authorization

## Troubleshooting

See [documentation/TROUBLESHOOTING.md](documentation/TROUBLESHOOTING.md) for common issues and solutions.

## Documentation

- [Detailed Setup Guide](documentation/SETUP.md)
- [Dashboard Guide](documentation/DASHBOARDS.md)
- [Troubleshooting](documentation/TROUBLESHOOTING.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Best Practices](https://prometheus.io/docs/practices/)

## Support

For issues and questions:
- Check the [Troubleshooting Guide](documentation/TROUBLESHOOTING.md)
- Open an issue on GitHub
- Review the official Prometheus and Grafana documentation
