with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "jupyterlab_code_formatter";
  NIX_ENV="jupyterlab_code_formatter";
  # NOTE: To fix R shared object not found issue when install rpy2 via poetry instead of nix
  LD_LIBRARY_PATH="${R}/lib/R/lib";

  buildInputs = [
    python37Packages.poetry
    python37Packages.sphinx
    python37Packages.sphinx_rtd_theme
    python37Full
    R
    rPackages.styler
    rPackages.formatR
    nodejs-12_x
    gnumake
    inotify-tools
    jq
    gawk
  ];

  shellHook = ''
    poetry config settings.virtualenvs.in-project true
    export SERVEREXTENSION_PATH=$PWD/serverextension
    export PATH=$SERVEREXTENSION_PATH/.venv/bin:$PATH
    export LABEXTENSION_PATH=$PWD/labextension
    export PATH=$LABEXTENSION_PATH/node_modules/.bin/:$LABEXTENSION_TESTS_PATH/node_modules/.bin/:$PATH
  '';
}
