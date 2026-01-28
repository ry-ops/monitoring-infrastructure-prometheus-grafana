# Troubleshooting Guide

Common issues and solutions for the Prometheus and Grafana monitoring stack.

## Table of Contents

- [Service Issues](#service-issues)
- [Prometheus Issues](#prometheus-issues)
- [Grafana Issues](#grafana-issues)
- [Metrics Collection Issues](#metrics-collection-issues)
- [Alert Issues](#alert-issues)
- [Performance Issues](#performance-issues)

## Service Issues

### Services Won't Start

**Problem**: `docker-compose up` fails or services crash immediately.

**Solutions**:

1. Check Docker daemon is running:
```bash
docker info
```

2. Check for port conflicts:
```bash
# Check if ports are already in use
lsof -i :3000  # Grafana
lsof -i :9090  # Prometheus
lsof -i :9093  # AlertManager
```

3. View service logs:
```bash
docker-compose logs prometheus
docker-compose logs grafana
```

4. Ensure sufficient resources:
```bash
docker stats
```

### Container Keeps Restarting

**Problem**: Container enters a restart loop.

**Solutions**:

1. Check container logs:
```bash
docker logs <container-name>
```

2. Inspect container status:
```bash
docker inspect <container-name>
```

3. Common causes:
   - Configuration file syntax errors
   - Permission issues with mounted volumes
   - Out of memory

4. Fix and restart:
```bash
docker-compose down
docker-compose up -d
```

## Prometheus Issues

### Prometheus Can't Scrape Targets

**Problem**: Targets show as "DOWN" in Prometheus UI.

**Solutions**:

1. Check target is reachable:
```bash
docker-compose exec prometheus wget -O- http://node-exporter:9100/metrics
```

2. Verify network connectivity:
```bash
docker network inspect monitoring-infrastructure-prometheus-grafana_monitoring
```

3. Check Prometheus config syntax:
```bash
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

4. Ensure target exposes metrics:
```bash
curl http://localhost:9100/metrics
```

### High Prometheus Memory Usage

**Problem**: Prometheus consuming too much memory.

**Solutions**:

1. Reduce retention period:
```yaml
# In docker-compose.yml
command:
  - '--storage.tsdb.retention.time=7d'  # Reduce from 15d
```

2. Reduce scrape frequency:
```yaml
# In prometheus.yml
global:
  scrape_interval: 30s  # Increase from 15s
```

3. Use recording rules for expensive queries:
```yaml
groups:
  - name: recordings
    interval: 30s
    rules:
      - record: instance:cpu:avg
        expr: avg by(instance) (irate(node_cpu_seconds_total[5m]))
```

### Missing Metrics

**Problem**: Expected metrics don't appear in Prometheus.

**Solutions**:

1. Verify target is being scraped:
   - Go to http://localhost:9090/targets
   - Check "Last Scrape" timestamp

2. Query for the metric:
   - Go to http://localhost:9090/graph
   - Enter metric name and execute

3. Check metric naming:
   - Metrics must follow naming conventions
   - Use `{__name__=~".*"}` to see all metrics

4. Verify scrape configuration:
```bash
# View active configuration
curl http://localhost:9090/api/v1/status/config
```

## Grafana Issues

### Can't Login to Grafana

**Problem**: Unable to access Grafana or login fails.

**Solutions**:

1. Reset admin password:
```bash
docker-compose exec grafana grafana-cli admin reset-admin-password newpassword
```

2. Check Grafana logs:
```bash
docker-compose logs grafana
```

3. Verify Grafana is running:
```bash
curl http://localhost:3000/api/health
```

### Dashboards Not Loading

**Problem**: Dashboards are blank or don't display data.

**Solutions**:

1. Check data source connection:
   - Go to Configuration → Data Sources
   - Test connection to Prometheus

2. Verify time range:
   - Check dashboard time picker (top right)
   - Ensure time range has data

3. Check query syntax:
   - Edit panel
   - Verify PromQL query is valid
   - Use Prometheus UI to test query

4. Review Grafana logs:
```bash
docker-compose logs grafana | grep ERROR
```

### Dashboards Not Provisioned

**Problem**: Dashboards from provisioning directory don't appear.

**Solutions**:

1. Check provisioning config:
```yaml
# grafana/provisioning/dashboards/default.yml
providers:
  - name: 'Default'
    options:
      path: /var/lib/grafana/dashboards
```

2. Verify dashboard JSON is valid:
```bash
cat grafana/dashboards/system-overview.json | jq .
```

3. Check file permissions:
```bash
ls -la grafana/dashboards/
```

4. Restart Grafana:
```bash
docker-compose restart grafana
```

## Metrics Collection Issues

### Node Exporter Not Working

**Problem**: System metrics not available.

**Solutions**:

1. Verify Node Exporter is running:
```bash
curl http://localhost:9100/metrics
```

2. Check volume mounts (required for host metrics):
```yaml
volumes:
  - /proc:/host/proc:ro
  - /sys:/host/sys:ro
  - /:/rootfs:ro
```

3. On macOS/Windows, Node Exporter provides limited metrics
   - Some metrics only work on Linux hosts
   - This is expected behavior

### cAdvisor Not Showing Container Metrics

**Problem**: Container metrics missing.

**Solutions**:

1. Ensure cAdvisor has Docker socket access:
```yaml
volumes:
  - /var/lib/docker/:/var/lib/docker:ro
```

2. Check cAdvisor is running:
```bash
curl http://localhost:8080/metrics
```

3. Verify privileged mode (required for full metrics):
```yaml
privileged: true
```

### Application Metrics Not Appearing

**Problem**: Custom application metrics not in Prometheus.

**Solutions**:

1. Verify app exposes /metrics endpoint:
```bash
curl http://localhost:8000/metrics
```

2. Add app to Prometheus scrape config:
```yaml
scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8000']
```

3. Reload Prometheus configuration:
```bash
curl -X POST http://localhost:9090/-/reload
```

4. Check Prometheus targets page:
   - http://localhost:9090/targets

## Alert Issues

### Alerts Not Firing

**Problem**: Expected alerts don't trigger.

**Solutions**:

1. Check alert rules syntax:
```bash
docker-compose exec prometheus promtool check rules /etc/prometheus/alerts.yml
```

2. Verify alert condition:
   - Go to http://localhost:9090/alerts
   - Check "State" and "Value"

3. Check evaluation interval:
```yaml
# alerts.yml
groups:
  - name: my_alerts
    interval: 30s  # How often to evaluate
```

4. Verify `for` duration:
```yaml
- alert: HighCPU
  expr: cpu > 80
  for: 10m  # Must be true for 10 minutes
```

### Alerts Not Sending Notifications

**Problem**: Alerts fire but notifications don't arrive.

**Solutions**:

1. Check AlertManager is running:
```bash
curl http://localhost:9093/api/v2/status
```

2. View AlertManager configuration:
```bash
curl http://localhost:9093/api/v2/status | jq .config
```

3. Check AlertManager logs:
```bash
docker-compose logs alertmanager
```

4. Test receiver configuration:
   - For email: verify SMTP settings
   - For Slack: test webhook URL
   - For PagerDuty: verify service key

5. Check routing rules:
```yaml
# alertmanager/config.yml
route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
```

### Too Many Alerts (Alert Fatigue)

**Problem**: Overwhelming number of alerts.

**Solutions**:

1. Adjust alert thresholds:
```yaml
- alert: HighCPU
  expr: cpu > 90  # Increase threshold
  for: 30m  # Increase duration
```

2. Use inhibition rules:
```yaml
# Inhibit warning if critical is firing
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['instance']
```

3. Group related alerts:
```yaml
route:
  group_by: ['alertname', 'instance']
  group_interval: 10m
```

4. Set appropriate repeat intervals:
```yaml
route:
  repeat_interval: 4h  # Don't re-send for 4 hours
```

## Performance Issues

### Slow Queries

**Problem**: Grafana dashboards or Prometheus queries are slow.

**Solutions**:

1. Use recording rules for expensive queries:
```yaml
groups:
  - name: recordings
    interval: 1m
    rules:
      - record: job:http_requests:rate5m
        expr: sum by(job) (rate(http_requests_total[5m]))
```

2. Reduce query time range in dashboards

3. Optimize PromQL queries:
```promql
# Inefficient
sum(rate(http_requests_total[5m]))

# Better - more specific
sum by(job) (rate(http_requests_total{job="api"}[5m]))
```

4. Increase Prometheus resources:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

### High Disk Usage

**Problem**: Prometheus using too much disk space.

**Solutions**:

1. Reduce retention period:
```yaml
command:
  - '--storage.tsdb.retention.time=7d'
```

2. Manually clean old data:
```bash
docker-compose exec prometheus rm -rf /prometheus/data/old-blocks
```

3. Monitor disk usage:
```promql
node_filesystem_avail_bytes{mountpoint="/"}
```

### High Network Traffic

**Problem**: Excessive network usage between services.

**Solutions**:

1. Increase scrape intervals:
```yaml
global:
  scrape_interval: 60s
```

2. Use service discovery instead of static targets

3. Deploy Prometheus closer to targets (same network/host)

4. Filter unnecessary metrics:
```yaml
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'unwanted_metric_.*'
    action: drop
```

## Getting Help

If you're still experiencing issues:

1. Check Prometheus documentation: https://prometheus.io/docs/
2. Check Grafana documentation: https://grafana.com/docs/
3. Search existing GitHub issues
4. Open a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Relevant logs
   - Configuration files (sanitized)
   - Docker and system information

### Collecting Diagnostic Information

```bash
# System info
docker version
docker-compose version
uname -a

# Service status
docker-compose ps

# Service logs
docker-compose logs > full-logs.txt

# Resource usage
docker stats --no-stream
```
