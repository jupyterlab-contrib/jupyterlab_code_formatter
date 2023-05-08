![](docs/logo.png)

*A JupyterLab plugin to facilitate invocation of code formatters.*

PSA: This plugin is currently undergoing a major refactor, bear with me while I work on this.

----

Documentation: [Hosted on GitHub Pages](https://ryantam626.github.io/jupyterlab_code_formatter/index.html)

This is currently out of date. I will be updating that shortly.

----

## Demo

![](docs/_static/format-all.gif)

----

## Quick Start

I recommend you going to the [documentation site](https://ryantam626.github.io/jupyterlab_code_formatter/index.html#quick-start), but this should work too.

1. **Install the package**
```bash
pip install jupyterlab-code-formatter
```

2. **Install some supported formatters** (isort+black are default for Python)
```bash
# NOTE: Install black and isort,
#       JL code formatter is configured to invoke isort and black by default
pip install black isort
```

3. **Restart JupyterLab**

This plugin includes a server plugin, restart JupyterLab if you have followed the above steps while it's running.

4. **Configure plugin**

To configure which/how formatters are invoked, see [configuration](https://ryantam626.github.io/jupyterlab_code_formatter/configuration.html).

----

## Your Support

I could really use your support in giving me a star on GitHub, recommending features, fixing bugs or maybe even providing monetary support!

- [Recommending features via GitHub Issues](https://github.com/ryantam626/jupyterlab_code_formatter/issues)
- [Sumitting your PR on GitHub](https://github.com/ryantam626/jupyterlab_code_formatter/pulls)
- [Buy me a coffee](https://www.buymeacoffee.com/ryantam626)
- [Donating Via Solana](https://solana.com/): 6K7aK5RpskJkhEkwZi1ZQr68LhaVdfnTfWjZEQV3VbbD

----

## Contributors

Massive thanks to the below list of people who made past contributions to the project!

<a href="https://github.com/ryantam626/jupyterlab_code_formatter/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ryantam626/jupyterlab_code_formatter" />
</a>

## License

This project is licensed under the terms of the [MIT LICENSE](LICENSE) .
