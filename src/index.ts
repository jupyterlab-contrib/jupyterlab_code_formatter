import {
  DocumentRegistry,
  DocumentWidget,
  DocumentModel
} from '@jupyterlab/docregistry';
import {
  INotebookModel,
  INotebookTracker,
  NotebookPanel
} from '@jupyterlab/notebook';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, ToolbarButton } from '@jupyterlab/apputils';
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
import { Widget } from '@lumino/widgets';

class JupyterLabCodeFormatter
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  private app: JupyterFrontEnd;
  private readonly tracker: INotebookTracker;
  private palette: ICommandPalette;
  private settingRegistry: ISettingRegistry;
  private menu: IMainMenu;
  private config: any;
  private readonly editorTracker: IEditorTracker;
  private readonly client: JupyterlabCodeFormatterClient;
  private readonly notebookCodeFormatter: JupyterlabNotebookCodeFormatter;
  private readonly fileEditorCodeFormatter: JupyterlabFileEditorCodeFormatter;

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

    this.setupSettings().then(() => {
      this.setupAllCommands();
      this.setupContextMenu();
      this.setupWidgetExtension();
    });
  }

  public createNew(
    nb: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const button = new ToolbarButton({
      tooltip: 'Format notebook',
      icon: new LabIcon({
        name: Constants.FORMAT_ALL_COMMAND,
        svgstr: Constants.ICON_FORMAT_ALL_SVG
      }),
      onClick: async () => {
        await this.notebookCodeFormatter.formatAllCodeCells(
          this.config,
          { saving: false },
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
      await context.sessionContext.ready;
      await this.notebookCodeFormatter.formatAllCodeCells(
        this.config,
        { saving: true },
        undefined,
        undefined
      );
    }
  }

  private createNewEditor(
    widget: DocumentWidget,
    context: DocumentRegistry.IContext<DocumentModel>
  ): IDisposable {
    // Connect to save(State) signal, to be able to detect document save event
    context.saveState.connect(this.onSaveEditor, this);
    // Return an empty disposable, because we don't create any object
    return new DisposableDelegate(() => {});
  }

  private async onSaveEditor(
    context: DocumentRegistry.IContext<DocumentModel>,
    state: DocumentRegistry.SaveState
  ) {
    if (state === 'started' && this.config.formatOnSave) {
      this.fileEditorCodeFormatter.formatEditor(
        this.config,
        { saving: true },
        undefined
      );
    }
  }

  private setupWidgetExtension() {
    this.app.docRegistry.addWidgetExtension('Notebook', this);
    this.app.docRegistry.addWidgetExtension('editor', {
      createNew: (
        widget: DocumentWidget,
        context: DocumentRegistry.IContext<DocumentModel>
      ): IDisposable => {
        return this.createNewEditor(widget, context);
      }
    });
  }

  private setupContextMenu() {
    this.app.contextMenu.addItem({
      command: Constants.FORMAT_COMMAND,
      selector: '.jp-Notebook'
    });
  }

  private setupAllCommands() {
    this.client
      .getAvailableFormatters(this.config.cacheFormatters)
      .then(data => {
        const formatters = JSON.parse(data).formatters;
        const menuGroup: Array<{ command: string }> = [];
        Object.keys(formatters).forEach(formatter => {
          if (formatters[formatter].enabled) {
            const command = `${Constants.PLUGIN_NAME}:${formatter}`;
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
        await this.notebookCodeFormatter.formatAllCodeCells(this.config, {
          saving: false
        });
      },
      iconClass: Constants.ICON_FORMAT_ALL,
      iconLabel: 'Format notebook'
      // TODO: Add back isVisible
    });
  }

  private async setupSettings() {
    const settings = await this.settingRegistry.load(
      Constants.SETTINGS_SECTION
    );
    const onSettingsUpdated = (jsettings: ISettingRegistry.ISettings) => {
      this.config = jsettings.composite;
    };
    settings.changed.connect(onSettingsUpdated);
    onSettingsUpdated(settings);
  }

  private setupCommand(name: string, label: string, command: string) {
    this.app.commands.addCommand(command, {
      execute: async () => {
        for (const formatter of [
          this.notebookCodeFormatter,
          this.fileEditorCodeFormatter
        ]) {
          if (
            formatter.applicable(name, <Widget>this.app.shell.currentWidget)
          ) {
            await formatter.formatAction(this.config, name);
          }
        }
      },
      isVisible: () => {
        for (const formatter of [
          this.notebookCodeFormatter,
          this.fileEditorCodeFormatter
        ]) {
          if (
            formatter.applicable(name, <Widget>this.app.shell.currentWidget)
          ) {
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
const plugin: JupyterFrontEndPlugin<void> = {
  id: Constants.PLUGIN_NAME,
  autoStart: true,
  requires: [
    ICommandPalette,
    INotebookTracker,
    ISettingRegistry,
    IMainMenu,
    IEditorTracker
  ],
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
    console.log('JupyterLab extension jupyterlab_code_formatter is activated!');
  }
};

export default plugin;
