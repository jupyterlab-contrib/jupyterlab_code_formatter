import setuptools

setuptools.setup(
    name="jupyterlab_code_formatter",
    version="0.2.0",
    packages=setuptools.find_packages(),
    description="The server extension for jupyterlab_code_formatter.",
    url="https://github.com/ryantam626/jupyterlab_code_formatter",
    author="Ryan Tam",
    author_email="ryantam626@gmail.com",
    license="MIT",
    install_requires=["notebook"],
)
