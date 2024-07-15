# JupyterHub

[//]: # 'TODO: Double check this in another container'

This plugin should work under a JupyterHub environment, however due to the difference in how JupyterHub starts the JupyterLab instance, one would need to enable the server extension with the `--sys-prefix` flag, that is:

```bash
jupyter serverextension enable --py jupyterlab_code_formatter --sys-prefix
```
