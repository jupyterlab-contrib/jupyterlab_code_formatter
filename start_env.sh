conda activate jupyterlab_code_formatter
export SERVEREXTENSION_PATH=$PWD
export PATH=$SERVEREXTENSION_PATH/.venv/bin:$PATH
export LABEXTENSION_PATH=$PWD/src
export PATH=$LABEXTENSION_PATH/node_modules/.bin/:$LABEXTENSION_TESTS_PATH/node_modules/.bin/:$PATH
