with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "jupyterlab_code_formatter";

  buildInputs = [
    python37Packages.pip
    python37Packages.poetry
    python37Packages.virtualenv
    python37Packages.rpy2
    python37Packages.sphinx
    python37Packages.sphinx_rtd_theme
    python37Full
    R
    rPackages.styler
    rPackages.formatR
    nodejs-12_x
    gnumake
    inotify-tools
  ];

  shellHook = ''
    export NIX_ENV="jupyterlab_code_formatter"  # Purely for my zsh prompt to work

    SOURCE_DATE_EPOCH=$(date +%s)  # so that we can use python wheels
    YELLOW='\033[1;33m'
    NC="$(printf '\033[0m')"

    if [ ! -d venv ]; then
      echo -e "''${YELLOW}Creating python environment...''${NC}"
      virtualenv venv
    fi
    export PATH=$PWD/venv/bin:$PATH
    echo -e "''${YELLOW}Installing poetry...''${NC}"
    curl -sSL https://raw.githubusercontent.com/sdispater/poetry/master/get-poetry.py | python

    export LABEXTENSION_PATH=$PWD/labextension
    export PATH=$LABEXTENSION_PATH/node_modules/.bin/:$LABEXTENSION_TESTS_PATH/node_modules/.bin/:$PATH
  '';
}
