# UDS Package NeuVector

## Exemptions

Neuvector requires elevated privileges to perform its container security functions.

## Metrics

NeuVector does not have a way to expose any metrics to Prometheus without it being behind  a login.  Therefore we can not scrape metrics for NeuVector at this time.
ref:
- https://github.com/neuvector/prometheus-exporter/issues/41
- https://github.com/neuvector/neuvector-helm/issues/435
