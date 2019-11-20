with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "jupyterlab_code_formatter";

  buildInputs = [
    python37Packages.pip
    python37Packages.poetry
    python37Packages.virtualenv
    python37Full
    nodejs-12_x
    gnumake
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

    export PATH=$PWD/labextension/node_modules/.bin/:$PATH
  '';
}
