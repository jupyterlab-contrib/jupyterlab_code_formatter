# Development

Prerequisites:

- Install [task](https://taskfile.dev);
- Install docker, with buildkit;

1. Spin up docker compose based dev env - `task dev:up`
2. Run `jlpm watch` inside dev container - `task dev:jlpm-watch`
3. In another terminal, run `jupyter lab` inside dev container - `task dev:jupyter-lab`

This watches the source directory and run JupyterLab at the same time in different terminals to watch for changes in the
extension's source and automatically rebuild the extension inside the dev docker container.

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).
