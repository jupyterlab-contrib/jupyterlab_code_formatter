# Development

1. Get Task - A Go task runner

```bash
sudo sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin
```

2. Build docker image for dev

```bash
task dev:build
```

3. Obtain a shell

```bash
task dev:shell
# NOTE: If you have a running container already, use the following instead
task dev:shell-reuse
```

4. Live compilation of Lab Extension

Assume you have a shell in dev container, do

```bash
jlpm run build
jlpm run watch
```

5. Start JupyterLab

Do this in another terminal.

Assume you have a shell in dev container, do

```bash
# NOTE: This might take a little while...
./dev/start-jupyterlab.sh
```
