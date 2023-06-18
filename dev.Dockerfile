# WARNING: This is only meant to be used in dev, you have been warned.
FROM python:3.10.11-buster

# Install common stuff and R
RUN --mount=type=cache,target=/var/cache/apt \
    apt update && \
    apt install -y r-base curl jq gawk inotify-tools libgbm-dev libnss3 libasound2 cmake \
        # Install random bullshit needed by browser libs
        gconf-service libasound2 libatk1.0-0 libc6 \
        libcairo2 libcups2 libdbus-1-3 libexpat1 \
        libfontconfig1 libgcc1 libgconf-2-4 \
        libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
        libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
        libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
        libxcomposite1 libxcursor1 libxdamage1 libxext6 \
        libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
        libxtst6 ca-certificates fonts-liberation \
        libappindicator1 libnss3 lsb-release xdg-utils wget \
        libdrm-dev libgbm-dev

# Install NodeJS
ENV NODE_VERSION=19.2.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN npm install --global yarn

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
# TODO: Figrue out how to cache this.
RUN cargo install evcxr_jupyter evcxr_repl

## Install R packages
RUN R --vanilla -e 'install.packages("formatR", repos = "http://cran.us.r-project.org")'
RUN R --vanilla -e 'install.packages("styler", repos = "http://cran.us.r-project.org")'

# Install hatch for dependency management and build process
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install hatch hatch-pip-deepfreeze

# Make venv
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy all requirements.txt in
COPY requirements* /
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r /requirements.txt -r /requirements-dev.txt -r /requirements-test.txt

# Install rust jupyter kernel
RUN evcxr_jupyter --install

# Copy repo into image...
COPY . /plugin

WORKDIR /plugin

# Developement install of plugin
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -e ".[test]"
RUN jupyter labextension develop . --overwrite
RUN jupyter server extension enable jupyterlab_code_formatter
RUN jlpm install
RUN jlpm build
