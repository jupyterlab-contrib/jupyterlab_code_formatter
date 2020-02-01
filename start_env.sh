conda activate jupyterlab-code-formatter
export SERVEREXTENSION_PATH=$PWD/serverextension
export PATH=$SERVEREXTENSION_PATH/.venv/bin:$PATH
export LABEXTENSION_PATH=$PWD/labextension
export PATH=$LABEXTENSION_PATH/node_modules/.bin/:$LABEXTENSION_TESTS_PATH/node_modules/.bin/:$PATH
