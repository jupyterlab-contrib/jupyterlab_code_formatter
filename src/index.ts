import {
  JupyterLab, JupyterLabPlugin,
} from "@jupyterlab/application";

import "../style/index.css";

/**
 * Initialization data for the jupyterlab_code_formatter extension.
 */
const extension: JupyterLabPlugin<void> = {
  activate: (app: JupyterLab) => {
    // tslint:disable-next-line:no-console
    console.log("JupyterLab extension jupyterlab_code_formatter is activated!");
  },
  autoStart: true,
  id: "jupyterlab_code_formatter",
};

export default extension;
