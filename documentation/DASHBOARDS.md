# Dashboard Guide

Guide to understanding and creating dashboards in Grafana for your monitoring infrastructure.

## Available Dashboards

### System Overview
- **CPU Usage**: System-wide and per-core CPU utilization
- **Memory Usage**: RAM usage and available memory
- **Disk Usage**: Filesystem usage and I/O statistics
- **Network Traffic**: Inbound and outbound network traffic

## Common PromQL Queries

### CPU Metrics
```promql
# Overall CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU usage by mode
sum by(mode) (irate(node_cpu_seconds_total[5m]))
```

### Memory Metrics
```promql
# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Available memory
node_memory_MemAvailable_bytes
```

### Disk Metrics
```promql
# Disk usage percentage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100

# Disk I/O
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])
```

### Network Metrics
```promql
# Network traffic
rate(node_network_receive_bytes_total[5m])
rate(node_network_transmit_bytes_total[5m])
```

### Container Metrics
```promql
# Container CPU
rate(container_cpu_usage_seconds_total[5m])

# Container memory
container_memory_usage_bytes
```

## Best Practices

1. **Use appropriate time ranges** - Match refresh rate to data granularity
2. **Set up variables** - Make dashboards flexible and reusable
3. **Group related metrics** - Use rows to organize panels
4. **Add documentation** - Include panel descriptions
5. **Test queries** - Verify in Prometheus before adding to dashboard

## Importing Community Dashboards

Grafana has thousands of pre-built dashboards at https://grafana.com/grafana/dashboards/

Popular dashboard IDs:
- Node Exporter Full: 1860
- Docker Monitoring: 893
- Prometheus Stats: 3662
