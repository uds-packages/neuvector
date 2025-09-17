# UDS Package NeuVector

This package is designed to be deployed on [UDS Core](https://github.com/defenseunicorns/uds-core) and is based on the upstream [NeuVector](https://neuvector.github.io/neuvector-helm/) chart.

NeuVector is a comprehensive container security platform that provides runtime protection, vulnerability management, and compliance monitoring for Kubernetes environments. It offers full-lifecycle container security including network segmentation, behavior monitoring, and threat detection for cloud-native applications.

## Pre-requisites

The NeuVector Package expects to be deployed on top of [UDS Core](https://github.com/defenseunicorns/uds-core) with the dependencies listed below being configured prior to deployment.

#### Dependency information

Add any dependency information here

## Flavors

| Flavor | Description | Example Creation |
| ------ | ----------- | ---------------- |
| `upstream` | Uses upstream images within the package. | `zarf package create . -f upstream` |
| `registry1` | Uses images from registry1.dso.mil within the package | `zarf package create . -f registry1` |
| `unicorn` | Uses images from chainguard within the package | `zarf package create . -f unicorn` |

## Releases

The released packages can be found in [ghcr](https://github.com/uds-packages/neuvector/pkgs/container/neuvector).

## UDS Tasks (for local dev and CI)

*For local dev, this requires you install [uds-cli](https://github.com/defenseunicorns/uds-cli?tab=readme-ov-file#install)

> [!TIP]
> To get a list of tasks to run you can use `uds run --list`!

## Contributing

Please see the [CONTRIBUTING.md](./CONTRIBUTING.md)
