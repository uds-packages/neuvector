# Deploying Standalone NeuVector with UDS Core

This guide explains how to deploy NeuVector as a standalone package alongside UDS Core. It covers fresh installs, upgrades from existing Core deployments, and running NeuVector together with Falco.

## Fresh install alongside Core (no Falco)
Use this path when you want NeuVector and do not want Falco.

1. Build your bundle using functional layers and omit the `core-runtime-security` package.
   ```yaml
   kind: UDSBundle
   metadata:
     name: my-uds-bundle
     description: Core with standalone NeuVector (no Falco)
     version: 0.1.0

   packages:
    - name: core-base
      repository: ghcr.io/defenseunicorns/packages/uds/core-base
      ref: <uds-core-version>
      overrides:
        pepr-uds-core:
          module:
            values:
              - path: additionalIgnoredNamespaces
                value:
                  - uds-dev-stack

    - name: core-identity-authorization
      repository: ghcr.io/defenseunicorns/packages/uds/core-identity-authorization
      ref: <uds-core-version>

     # Intentionally omit 'core-runtime-security'

     - name: neuvector
       repository: ghcr.io/uds-packages/neuvector
       ref: <neuvector-version>
   ```
1. Build and deploy your bundle. Examples:
   - Build from a bundle directory (produces a .tar.zst artifact):
     ```bash
     # Example: build a bundle at bundles/my-env
     uds create bundles/my-env --confirm --no-progress --architecture=${ZARF_ARCHITECTURE}
     ```
   - Deploy the built bundle artifact:
     ```bash
     # Generic artifact path pattern shown; adjust to your bundle name/version
     uds deploy bundles/my-env/uds-bundle-<name>-<arch>-<version>.tar.zst --confirm --no-progress
     ```
1. Validate NeuVector is healthy (namespace, pods, UI, policies).

## Upgrade existing Core and add standalone NeuVector
Use this path when upgrading from a Core version that previously managed NeuVector or when you are switching from Falco-only to NeuVector.

1. Upgrade UDS Core
  - Deploy the standalone NeuVector package either via bundle (see fresh install bundle example)
  - Or directly with zarf:
    ```bash
    # Example direct install (adjust ref/registry as needed)
    zarf package deploy oci://ghcr.io/uds-packages/neuvector:<neuvector-version>
    ```
1. Validate NeuVector workloads, UI availability, alert forwarding, and policies.

## Running NeuVector together with Falco
Running both is permitted. If you choose to run both:

1. Keep `core-runtime-security` (Falco) in your Core deployment and do NOT enable the Falco cleanup gate.
    ```yaml
    kind: UDSBundle
    metadata:
      name: my-uds-bundle
      description: Core with standalone NeuVector (no Falco)
      version: 0.1.0

    packages:
      - name: core-base
        repository: ghcr.io/defenseunicorns/packages/uds/core-base
        ref: <uds-core-version>
        overrides:
          pepr-uds-core:
            module:
              values:
                - path: additionalIgnoredNamespaces
                  value:
                    - uds-dev-stack

      - name: core-identity-authorization
        repository: ghcr.io/defenseunicorns/packages/uds/core-identity-authorization
        ref: <uds-core-version>

      - name: core-runtime-security
        repository: ghcr.io/defenseunicorns/packages/uds/core-runtime-security
        ref: <uds-core-version>

      - name: neuvector
        repository: ghcr.io/uds-packages/neuvector
        ref: <neuvector-version>
    ```
1. Deploy the standalone NeuVector package (bundle or direct) and validate.
1. Review policies, ports, and alerting destinations to avoid duplicate events and noise.

## Networking example (optional)
If NeuVector needs to send alerts to an external destination or an in‑cluster service, add network rules in the NeuVector package values using the UDS Package `allow` constructs. Example pattern:

```yaml
# Example pattern for UDS package values (inside the NeuVector package)
values:
  - path: additionalNetworkAllow
    value:
      - direction: Egress
        selector:
          app: neuvector-manager-pod
        remoteGenerated: Anywhere
        port: 443
        description: "Send alerts to external destination"
```

See the UDS Package `allow` [spec](https://uds.defenseunicorns.com/reference/configuration/custom-resources/packages-v1alpha1-cr/#allow)
