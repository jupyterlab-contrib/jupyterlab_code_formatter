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
  FormattingInProgressError,
  JupyterlabFileEditorCodeFormatter,
  JupyterlabNotebookCodeFormatter
} from './formatter';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { Constants } from './constants';
import {
  FORMAT_ARGUMENTS_SCHEMA,
  IConfig,
  IFormatArguments,
  IFormatResult
} from './tokens';
import { LabIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

class JupyterLabCodeFormatter implements DocumentRegistry.IWidgetExtension<
  NotebookPanel,
  INotebookModel
> {
  private app: JupyterFrontEnd;
  private readonly tracker: INotebookTracker;
  private palette: ICommandPalette;
  private settingRegistry: ISettingRegistry;
  private menu: IMainMenu;
  private config!: IConfig;
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
        // Errors are reported to the user by `_runFormatting`.
        await this._runFormatting(() =>
          this.notebookCodeFormatter.formatAllCodeCells(
            this.config,
            { saving: false },
            undefined,
            nb
          )
        ).catch(() => undefined);
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
      await this._runFormatting(() =>
        this.notebookCodeFormatter.formatAllCodeCells(
          this.config,
          { saving: true },
          undefined,
          context.path
        )
      ).catch(() => undefined);
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
      await this._runFormatting(() =>
        this.fileEditorCodeFormatter.formatEditor(
          this.config,
          { saving: true },
          undefined,
          context.path
        )
      ).catch(() => undefined);
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
      execute: args => {
        const { path, showDialogs } = Private.getArguments(args);
        return this._runFormatting(
          () =>
            this.notebookCodeFormatter.formatSelectedCodeCells(
              this.config,
              undefined,
              path,
              { showDialogs }
            ),
          showDialogs
        );
      },
      describedBy: { args: FORMAT_ARGUMENTS_SCHEMA },
      // TODO: Add back isVisible
      label: 'Format cell'
    });
    this.app.commands.addCommand(Constants.FORMAT_ALL_COMMAND, {
      execute: args => {
        const { path, showDialogs } = Private.getArguments(args);
        return this._runFormatting(
          () =>
            this.notebookCodeFormatter.formatAllCodeCells(
              this.config,
              { saving: false },
              undefined,
              path,
              { showDialogs }
            ),
          showDialogs
        );
      },
      describedBy: { args: FORMAT_ARGUMENTS_SCHEMA },
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
      this.config = jsettings.composite as IConfig;
    };
    settings.changed.connect(onSettingsUpdated);
    onSettingsUpdated(settings);
  }

  private setupCommand(name: string, label: string, command: string) {
    this.app.commands.addCommand(command, {
      execute: args => {
        const { path, showDialogs } = Private.getArguments(args);
        return this._runFormatting(
          () => this._formatWithFormatter(name, { path, showDialogs }),
          showDialogs
        );
      },
      describedBy: { args: FORMAT_ARGUMENTS_SCHEMA },
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

  /**
   * Format a specific document (or the active one) with a specific formatter.
   */
  private async _formatWithFormatter(
    formatter: string,
    { path, showDialogs }: IFormatArguments
  ): Promise<IFormatResult> {
    const options = { showDialogs };
    if (path !== undefined) {
      if (this.notebookCodeFormatter.findPanel(path)) {
        return this.notebookCodeFormatter.formatAction(
          this.config,
          formatter,
          path,
          options
        );
      }
      if (this.fileEditorCodeFormatter.findWidget(path)) {
        return this.fileEditorCodeFormatter.formatAction(
          this.config,
          formatter,
          path,
          options
        );
      }
      throw new Error(
        `Could not find an open notebook nor file with path: ${path}`
      );
    }
    const currentWidget = <Widget>this.app.shell.currentWidget;
    if (this.notebookCodeFormatter.applicable(formatter, currentWidget)) {
      return this.notebookCodeFormatter.formatAction(
        this.config,
        formatter,
        undefined,
        options
      );
    }
    if (this.fileEditorCodeFormatter.applicable(formatter, currentWidget)) {
      return this.fileEditorCodeFormatter.formatAction(
        this.config,
        formatter,
        undefined,
        options
      );
    }
    throw new Error(
      'There is no active notebook nor file editor; please pass a `path` of an open document'
    );
  }

  /**
   * Run a formatting operation, reporting any error to the user (unless
   * `showDialogs` is `false`) and re-raising it so that programmatic callers
   * can handle it too.
   */
  private async _runFormatting(
    operation: () => Promise<IFormatResult>,
    showDialogs?: boolean
  ): Promise<IFormatResult> {
    try {
      return await operation();
    } catch (error) {
      // Formatting requests which overlap with an ongoing one are expected
      // to happen (e.g. on a double click) and are not worth a dialog.
      if (
        showDialogs !== false &&
        !(error instanceof FormattingInProgressError)
      ) {
        // The dialog is intentionally not awaited, so that programmatic
        // callers do not have to wait for the user to dismiss it.
        void showErrorMessage(
          'Jupyterlab Code Formatter Error',
          error instanceof Error ? error : `${error}`
        );
      }
      throw error;
    }
  }
}

namespace Private {
  const getArgument = <T extends string | boolean>(
    args: ReadonlyPartialJSONObject,
    name: keyof IFormatArguments,
    type: 'string' | 'boolean'
  ): T | undefined => {
    const value = args[name];
    if (value === undefined) {
      return undefined;
    }
    // `null` is rejected too: it is not allowed by `FORMAT_ARGUMENTS_SCHEMA`,
    // and silently formatting the active document instead of the intended one
    // would be worse than telling the caller about it.
    if (typeof value !== type) {
      throw new Error(`The \`${name}\` argument has to be a ${type}`);
    }
    return value as T;
  };

  /**
   * Extract and validate the arguments of a formatting command.
   */
  export function getArguments(
    args: ReadonlyPartialJSONObject
  ): IFormatArguments {
    return {
      path: getArgument<string>(args, 'path', 'string'),
      showDialogs: getArgument<boolean>(args, 'showDialogs', 'boolean')
    };
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
export * from './tokens';
