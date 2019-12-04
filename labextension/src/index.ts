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
import { CommandToolbarButton, ICommandPalette } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import JupyterlabCodeFormatterClient from './client';
import {
  JupyterlabFileEditorCodeFormatter,
  JupyterlabNotebookCodeFormatter
} from './formatter';
import { DisposableDelegate, IDisposable } from '@phosphor/disposable';
import { Constants } from './constants';

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

    this.setupSettings();
    this.setupAllCommands();
    this.setupContentMenu();
    this.setupWidgetExtension();
  }

  public createNew(
    nb: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const btn = new CommandToolbarButton({
      commands: this.app.commands,
      id: Constants.FORMAT_ALL_COMMAND
    });
    nb.toolbar.insertAfter(
      'cellType',
      this.app.commands.label(Constants.FORMAT_ALL_COMMAND),
      btn
    );
    return new DisposableDelegate(() => {
      btn.dispose();
    });
  }

  private setupWidgetExtension() {
    this.app.docRegistry.addWidgetExtension('Notebook', this);
  }

  private setupContentMenu() {
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
      .catch((reason: Error) => console.error(reason.message));
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
