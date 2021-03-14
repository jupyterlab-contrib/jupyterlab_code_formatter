import { DocumentRegistry } from '@jupyterlab/docregistry';
import {
  INotebookModel,
  INotebookTracker,
  NotebookPanel
} from '@jupyterlab/notebook';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ICommandPalette,
  showErrorMessage,
  ToolbarButton
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import JupyterlabCodeFormatterClient from './client';
import {
  JupyterlabFileEditorCodeFormatter,
  JupyterlabNotebookCodeFormatter
} from './formatter';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Constants } from './constants';
import { LabIcon } from '@jupyterlab/ui-components';

class JupyterLabCodeFormatter
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  private app: JupyterFrontEnd;
  private tracker: INotebookTracker;
  private palette: ICommandPalette;
  private settingRegistry: ISettingRegistry;
  private menu: IMainMenu;
  private config: any;
  private editorTracker: IEditorTracker;
  private client: JupyterlabCodeFormatterClient;
  private notebookCodeFormatter: JupyterlabNotebookCodeFormatter;
  private fileEditorCodeFormatter: JupyterlabFileEditorCodeFormatter;

  constructor(
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry,
    menu: IMainMenu,
    editorTracker: IEditorTracker
  ) {
    this.app = app;
    this.tracker = tracker;
    this.editorTracker = editorTracker;
    this.palette = palette;
    this.settingRegistry = settingRegistry;
    this.menu = menu;
    this.client = new JupyterlabCodeFormatterClient();
    this.notebookCodeFormatter = new JupyterlabNotebookCodeFormatter(
      this.client,
      this.tracker
    );
    this.fileEditorCodeFormatter = new JupyterlabFileEditorCodeFormatter(
      this.client,
      this.editorTracker
    );

    this.checkVersion().then(versionMatches => {
      if (versionMatches) {
        this.setupSettings();
        this.setupAllCommands();
        this.setupContextMenu();
        this.setupWidgetExtension();
      }
    });
  }

  public createNew(
    nb: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const self = this;
    const button = new ToolbarButton({
      tooltip: 'Format notebook',
      icon: new LabIcon({
        name: Constants.FORMAT_ALL_COMMAND,
        svgstr: Constants.ICON_FORMAT_ALL_SVG
      }),
      onClick: async () => {
        await self.notebookCodeFormatter.formatAllCodeCells(
          this.config,
          undefined,
          nb.content
        );
      }
    });
    nb.toolbar.insertAfter(
      'cellType',
      this.app.commands.label(Constants.FORMAT_ALL_COMMAND),
      button
    );

    context.saveState.connect(this.onSave, this);

    return new DisposableDelegate(() => {
      button.dispose();
    });
  }

  private async onSave(
    context: DocumentRegistry.IContext<INotebookModel>,
    state: DocumentRegistry.SaveState
  ) {
    if (state === 'started' && this.config.formatOnSave) {
      await this.notebookCodeFormatter.formatAllCodeCells(this.config);
    }
  }

  private setupWidgetExtension() {
    this.app.docRegistry.addWidgetExtension('Notebook', this);
  }

  private setupContextMenu() {
    this.app.contextMenu.addItem({
      command: Constants.FORMAT_COMMAND,
      selector: '.jp-Notebook'
    });
  }

  private setupAllCommands() {
    this.client.getAvailableFormatters().then(data => {
      const formatters = JSON.parse(data).formatters;
      const menuGroup: Array<{ command: string }> = [];
      Object.keys(formatters).forEach(formatter => {
        if (formatters[formatter].enabled) {
          const command = `${Constants.SHORT_PLUGIN_NAME}:${formatter}`;
          this.setupCommand(formatter, formatters[formatter].label, command);
          menuGroup.push({ command });
        }
      });
      this.menu.editMenu.addGroup(menuGroup);
    });

    this.app.commands.addCommand(Constants.FORMAT_COMMAND, {
      execute: async () => {
        await this.notebookCodeFormatter.formatSelectedCodeCells(this.config);
      },
      // TODO: Add back isVisible
      label: 'Format cell'
    });
    this.app.commands.addCommand(Constants.FORMAT_ALL_COMMAND, {
      execute: async () => {
        await this.notebookCodeFormatter.formatAllCodeCells(this.config);
      },
      iconClass: Constants.ICON_FORMAT_ALL,
      iconLabel: 'Format notebook'
      // TODO: Add back isVisible
    });
  }

  private setupSettings() {
    const self = this;
    Promise.all([this.settingRegistry.load(Constants.SETTINGS_SECTION)])
      .then(([settings]) => {
        function onSettingsUpdated(jsettings: ISettingRegistry.ISettings) {
          self.config = jsettings.composite;
        }
        settings.changed.connect(onSettingsUpdated);
        onSettingsUpdated(settings);
      })
      .catch((error: Error) => {
        void showErrorMessage('Jupyterlab Code Formatter Error', error);
      });
  }

  private setupCommand(name: string, label: string, command: string) {
    this.app.commands.addCommand(command, {
      execute: async () => {
        for (let formatter of [
          this.notebookCodeFormatter,
          this.fileEditorCodeFormatter
        ]) {
          if (formatter.applicable(name, this.app.shell.currentWidget)) {
            await formatter.formatAction(this.config, name);
          }
        }
      },
      isVisible: () => {
        for (let formatter of [
          this.notebookCodeFormatter,
          this.fileEditorCodeFormatter
        ]) {
          if (formatter.applicable(name, this.app.shell.currentWidget)) {
            return true;
          }
        }
        return false;
      },
      label
    });
    this.palette.addItem({ command, category: Constants.COMMAND_SECTION_NAME });
  }

  private async checkVersion() {
    return this.client
      .getVersion()
      .then(data => {
        let serverPluginVersion = JSON.parse(data).version;
        let versionMatches = serverPluginVersion === Constants.PLUGIN_VERSION;
        if (!versionMatches) {
          void showErrorMessage(
            'Jupyterlab Code Formatter Version Mismatch',
            `Lab plugin version: ${Constants.PLUGIN_VERSION}. ` +
              `Server plugin version: ${serverPluginVersion}. ` +
              `Please re-install the plugin with the latest instruction.`
          );
        }
        return versionMatches;
      })
      .catch(error => {
        void showErrorMessage(
          'Jupyterlab Code Formatter Error',
          'Unable to find server plugin version, this should be impossible,' +
            'open a GitHub issue if you cannot figure this issue out yourself.'
        );
        return false;
      });
  }
}

/**
 * Initialization data for the jupyterlab_code_formatter extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    tracker: INotebookTracker,
    settingRegistry: ISettingRegistry,
    menu: IMainMenu,
    editorTracker: IEditorTracker
  ) => {
    new JupyterLabCodeFormatter(
      app,
      tracker,
      palette,
      settingRegistry,
      menu,
      editorTracker
    );
  },
  autoStart: true,
  id: Constants.SHORT_PLUGIN_NAME,
  requires: [
    ICommandPalette,
    INotebookTracker,
    ISettingRegistry,
    IMainMenu,
    IEditorTracker
  ]
};

export default extension;
