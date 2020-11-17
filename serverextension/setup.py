import setuptools

setuptools.setup(
    name="jupyterlab_code_formatter",
    version="1.3.8",
    packages=setuptools.find_packages(),
    description="Server extension to power `@ryantam626/jupyterlab_code_formatter` npm package.",
    url="https://github.com/ryantam626/jupyterlab_code_formatter",
    author="Ryan Tam",
    author_email="ryantam626@gmail.com",
    license="MIT",
    install_requires=["notebook", "packaging"],
)
