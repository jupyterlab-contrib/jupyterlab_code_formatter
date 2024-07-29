# Frequently Asked Questions

## Error When Writing Grammar Tables

It is possible that black will fail when trying to create local cache directory, you can resovle this by creating the directory yourself (elevated permissions might be required):-

```bash
python -c "import black; black.CACHE_DIR.mkdir(parents=True, exist_ok=True)"
```

For more information, see [issue #10](https://github.com/jupyterlab-contrib/jupyterlab_code_formatter/issues/10).

## JupyterLab Commands Not Showing Up

Make sure you really have one of the formatters properly installed in the Jupyter Server's environment.

The plugin is also configured to only show commands when a suitable notebook/script is opened, it's worth checking if you have opened one such notebook/script.

##
