import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab_code_formatter extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_code_formatter',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab_code_formatter is activated!');
  }
};

export default extension;
