# WARNING: This is only meant to be used in dev, you have been warned.
FROM python:3.9.12-bullseye

# Install common stuff and R
RUN apt update && \
    apt install -y r-base curl jq gawk inotify-tools libgbm-dev libnss3 libasound2 cmake && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# Install NodeJS
ENV NODE_VERSION=16.13.0
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
RUN cargo install evcxr_jupyter evcxr_repl

# Install R packages
COPY dev/install-r-packages.sh /tmp/install-r-packages.sh
RUN /tmp/install-r-packages.sh && rm /tmp/install-r-packages.sh

# Make venv
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install pip-tool
RUN pip install pip-tools

# Compile requirements
COPY dev/requirements.in /app/requirements.in
RUN pip-compile /app/requirements.in
# Install requirements
RUN pip install -r /app/requirements.txt

# Install rust notebook
RUN evcxr_jupyter --install

# Copy scripts
COPY dev/lint.sh dev/test.sh dev/format.sh /scripts/

# Copy repo into image...
COPY . /host

WORKDIR /host

# Install package in dev mode
RUN pip install -e /host
RUN jupyter labextension develop /host --overwrite
RUN jlpm run build

