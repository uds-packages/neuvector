# Deploying Standalone NeuVector with UDS Core

This guide explains how to deploy NeuVector as a standalone package alongside UDS Core. It covers fresh installs, upgrades from existing Core deployments, and running NeuVector together with Falco.

## NeuVector with UDS Core without Falco
Use this path when you want NeuVector and do not want Falco.

1. Build your bundle using [functional layers](https://uds.defenseunicorns.com/reference/uds-core/functional-layers/) and omit the `core-runtime-security` package.
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
       repository: oci://registry.defenseunicorns.com/public/neuvector # Registry requires authentication to pull, alternatively use ghcr.io/uds-packages/neuvector
       ref: <neuvector-version>

    # Include other functional layers here (logging, monitoring, etc)
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
1. Alternatively, create a Zarf package and deploy that package individually:
    ```bash
    # Example direct install (adjust ref/registry as needed); Registry requires authentication to pull, alternatively use ghcr.io/uds-packages/neuvector
    zarf package deploy oci://registry.defenseunicorns.com/public/neuvector:<neuvector-version>
    ```
1. Validate NeuVector is healthy (namespace, pods, UI, policies).

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
      - name: core
        repository: ghcr.io/defenseunicorns/packages/uds/core
        ref: <uds-core-version>

      - name: neuvector
        repository: oci://registry.defenseunicorns.com/public/neuvector # Registry requires authentication to pull, alternatively use ghcr.io/uds-packages/neuvector
        ref: <neuvector-version>
    ```
1. Deploy the standalone NeuVector package (bundle or direct) and validate.
1. Review policies, ports, and alerting destinations to avoid duplicate events and noise.
