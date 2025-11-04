# Configuration

NeuVector in this package is configured through [NeuVector UDS package](https://github.com/uds-packages/neuvector#) as well as a UDS configuration chart that supports the following:

## Additional Configuration Info Follows

### Cgroup v2

NeuVector historically has functioned best when the host is using cgroup v2. Cgroup v2 is enabled by default on many modern Linux distributions, but you may need to enable it depending on your operating system. Enabling this tends to be OS specific, so you will need to evaluate this for your specific hosts.

### SSO Config

Neuvector [maps the groups](https://github.com/defenseunicorns/uds-core/blob/main/src/neuvector/chart/templates/uds-package.yaml#L31-L35) from Keycloak to its internal `admin` and `reader` groups.

| Keycloak Group | Mapped Neuvector Group |
|----------------|------------------------|
| `Admin`        | `admin`                |
| `Auditor`      | `reader`               |

##### Overriding Neuvector Groups

To override the Keycloak -> Neuvector group mapping you can provide the following bundle overrides:

```yaml
neuvector:
  uds-neuvector-config:
    values:
        # Sets this as an allowed group for the Keycloak Client and maps to Neuvector admin group
        - path: sso.adminGroups
          value:
            - KEYCLOAK_ADMIN_GROUP # name of an existing Keycloak group
        # Sets this as an allowed group for the Keycloak Client and maps to Neuvector reader group
        - path: sso.readerGroups
          value:
            - KEYCLOAK_AUDITOR_GROUP # name of an existing Keycloak group
```

### External Alerts
It may be desired send alerts from NeuVector to locations in or outside of the cluster. To facilitate this, you can provide a bundle override as follows:

```yaml
  neuvector:
    uds-neuvector-config:
      values:
        - direction: Egress
          selector:
            app: neuvector-manager-pod
            ports:
              - 443
            remoteHost: your.remotehost.com # set to the hostname where you want to send events
            remoteProtocol: TLS
            description: "Allow egress Neuvector to your.remotehost.com" # update description as needed
```

The example above allows NeuVector to send alerts to your specific remote host alerting destination. Alternatively, you could use the remoteNamespace key to specify another namespace within the Kubernetes cluster (i.e. Mattermost) or a remoteCidr.
