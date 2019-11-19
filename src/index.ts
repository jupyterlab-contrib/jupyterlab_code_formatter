/* tslint:disable:no-console */
import {
  CommandToolbarButton, ICommandPalette,
} from "@jupyterlab/apputils";

import {
  IMainMenu,
} from "@jupyterlab/mainmenu";

import {
  Cell,
  CodeCell,
} from "@jupyterlab/cells";
import {
    INotebookModel, INotebookTracker, NotebookPanel,
} from "@jupyterlab/notebook";

import {
  ISettingRegistry, PathExt, URLExt,
} from "@jupyterlab/coreutils";

import {
  ServerConnection,
} from "@jupyterlab/services";

import {
  JupyterFrontEnd, JupyterFrontEndPlugin,
} from "@jupyterlab/application";

import {
    DocumentRegistry,
} from "@jupyterlab/docregistry";
import {
  IEditorTracker,
} from "@jupyterlab/fileeditor";
import {
    DisposableDelegate, IDisposable,
} from "@phosphor/disposable";

import "../style/index.css";

const PLUGIN_NAME = "jupyterlab_code_formatter";
const FORMAT_COMMAND = "jupyterlab_code_foramtter:format";
const FORMAT_ALL_COMMAND = "jupyterlab_code_foramtter:format_all";
const ICON_FORMAT_ALL = 'fa fa-superpowers';

function request(
  path: string,
  method: string,
  body: any,
  settings: ServerConnection.ISettings,
): Promise<any> {
  const fullUrl = URLExt.join(settings.baseUrl, PLUGIN_NAME, path);

  return ServerConnection.makeRequest(fullUrl, { body, method }, settings).then((response) => {
    if (response.status !== 200) {
      return response.text().then((data) => {
        throw new ServerConnection.ResponseError(response, data);
      });
    }
    return response.text();
  });
}

class JupyterLabCodeFormatter implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  private app: JupyterFrontEnd;
  private tracker: INotebookTracker;
  private palette: ICommandPalette;
  private settingRegistry: ISettingRegistry;
  private menu: IMainMenu;
  private config: any;
  private editorTracker: IEditorTracker;

  private working = false;
  private pythonCommands = ["black", "yapf", "autopep8", "isort"].map((name) => `${PLUGIN_NAME}:${name}`);
  private rCommands = ["formatR", "styler"].map((name) => `${PLUGIN_NAME}:${name}`);

  constructor(
    app: JupyterFrontEnd, tracker: INotebookTracker,
    palette: ICommandPalette, settingRegistry: ISettingRegistry,
    menu: IMainMenu, editorTracker: IEditorTracker,
  ) {
      this.app = app;
      this.tracker = tracker;
      this.editorTracker = editorTracker;
      this.palette = palette;
      this.settingRegistry = settingRegistry;
      this.menu = menu;
      this.setupSettings();
      request("formatters", "GET", null, ServerConnection.defaultSettings).then(
          (data) => {
              const formatters = JSON.parse(data).formatters;
              const menuGroup: Array<{ command: string }> = [];
              Object.keys(formatters).forEach(
                  (formatter) => {
                      if (formatters[formatter].enabled) {
                          const command = `${PLUGIN_NAME}:${formatter}`;
                          this.setupButton(formatter, formatters[formatter].label, command);
                          menuGroup.push({command});
                      }
                  },
              );
              this.menu.editMenu.addGroup(menuGroup);
          },
      );
  }

    public createNew(nb: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
        const btn = new CommandToolbarButton({
            commands: this.app.commands,
            id: FORMAT_ALL_COMMAND,
        });
        nb.toolbar.insertAfter("cellType", this.app.commands.label(FORMAT_ALL_COMMAND), btn);
        return new DisposableDelegate(() => {
            btn.dispose();
        });
    }

  public getCodeCells(selectedOnly = true) {
      if (!this.tracker.currentWidget) {
          return [];
      }
      const cells: CodeCell[] = [];

      const notebook = this.tracker.currentWidget.content;
      notebook.widgets.forEach((cell: Cell) => {
          if (cell.model.type === "code") {
              if (!selectedOnly || notebook.isSelectedOrActive(cell) ) {
                  cells.push(cell as CodeCell);
              }
         }
      });
      return cells;
  }

  public async formatSelectedCodeCells() {
      return this._formatCells(true);
  }

  public async formatAllCodeCells() {
      return this._formatCells(false);
  }

  public getDefaultFormatter() {
      const notebookType = this.getNotebookType();
      if (notebookType) {
          return this.config.preferences.default_formatter[notebookType];
      }
      return null;
  }

  private async _formatCells(selectedOnly: boolean) {
      if (this.working) {
          return;
      }
      try {
          this.working = true;
          const selectedCells =  this.getCodeCells(selectedOnly);
          if (selectedCells.length === 0) {
              this.working = false;
              return;
          }
          const currentTexts = selectedCells.map((cell) => cell.model.value.text);
          const formatter = this.getDefaultFormatter();
          const formattedTexts = await this.formatCode(currentTexts, formatter);
          for (let i = 0; i < selectedCells.length; ++i) {
              const cell = selectedCells[i];
              const currentText = currentTexts[i];
              const formattedText = formattedTexts.code[i];
              if (cell.model.value.text === currentText) {
                  if (formattedText.code) {
                      cell.model.value.text = formattedText.code;
                  } else {
                      console.error("Could not format cell: %s due to:\n%o", currentText, formattedText.error);
                  }
              } else {
                  console.error("Value changed since we formatted - skipping: %s", cell.model.value.text);
              }
          }

      } catch (err) {
          console.error("Something went wrong :(\n%o", err);
      }
      this.working = false;
  }

  private getNotebookType() {
      if (this.tracker.currentWidget) {
          const metadata = this.tracker.currentWidget.content.model.metadata.toJSON();
          if (metadata && metadata.kernelspec) {
              // @ts-ignore
              return metadata.kernelspec.language;
          }
      }
      return null;
  }

  private setupSettings() {
    const self = this;
    Promise.all([this.settingRegistry.load(`@ryantam626/${PLUGIN_NAME}:settings`)]).then(
      ([settings]) => {
        function onSettingsUpdated(jsettings: ISettingRegistry.ISettings) {
          self.config = jsettings.composite;
        }
        settings.changed.connect(onSettingsUpdated);
        onSettingsUpdated(settings);
      },
    ).catch((reason: Error) => console.error(reason.message));
  }

  private maybeFormatCodecell(formatterName: string) {
    // TODO: Check current kernel is of appropriate kernel
    const editorWidget = this.editorTracker.currentWidget;
    if (this.working) {
      return;
    }
    if (editorWidget && editorWidget.content !== null &&  editorWidget.content.isVisible) {
        this.working = true;
        const editor = editorWidget.content.editor;
        const code = editor.model.value.text;
        this.formatCode([code], formatterName).then(
            (data) => {
                if (data.code[0].error) {
                    throw data.code[0].error;
                }
                this.editorTracker.currentWidget.content.editor.model.value.text = data.code[0].code;
                this.working = false;
            },
        ).catch(
          (err) => {
            this.working = false;
            console.error("Something went wrong :(:\n%o", err);
          },
        );
    } else if (this.tracker.activeCell instanceof CodeCell) {
        this.working = true;
        const code = this.tracker.activeCell.model.value.text;
        this.formatCode([code], formatterName).then(
            (data) => {
                if (data.code[0].error) {
                    throw data.code[0].error;
                }
                this.tracker.activeCell.model.value.text = data.code[0].code;
                this.working = false;
            },
        ).catch(
          (err) => {
            this.working = false;
            console.error("Something went wrong :(:\n%o", err);
          },
        );
      }
  }

  private formatCode(code: string[], formatter: string) {
      return request(
          "format", "POST", JSON.stringify(
              {
                  code,
                  formatter,
                  options: this.config[formatter],
              },
          ), ServerConnection.defaultSettings,
      ).then((resp) => JSON.parse(resp));
  }

  private setupButton(name: string, label: string, command: string) {
    this.app.commands.addCommand(command, {
      execute: () => {
        this.maybeFormatCodecell(name);
      },
      isVisible: () => {
        const widget = this.app.shell.currentWidget;
        // TODO: handle other languages other than Python
        const editorWidget = this.editorTracker.currentWidget;
        const notebookWidget = this.tracker.currentWidget;

        return widget && (
          (this.pythonCommands.some((cmd) => cmd === command) && editorWidget && widget === editorWidget &&
              PathExt.extname(editorWidget.context.path).toLowerCase() === ".py") ||
          (this.rCommands.some((cmd) => cmd === command) && editorWidget && widget === editorWidget &&
              PathExt.extname(editorWidget.context.path).toLowerCase() === ".r") ||
          (notebookWidget && widget === notebookWidget)
        );
      },
      label,
    });
    this.palette.addItem({ command, category: "JupyterLab Code Formatter" });
  }
}

/**
 * Initialization data for the jupyterlab_code_formatter extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  activate: (
    app: JupyterFrontEnd, palette: ICommandPalette,
    tracker: INotebookTracker, settingRegistry: ISettingRegistry,
    menu: IMainMenu, editorTracker: IEditorTracker,
  ) => {
    const jlcf = new JupyterLabCodeFormatter(app, tracker, palette, settingRegistry, menu, editorTracker);
    app.docRegistry.addWidgetExtension("Notebook", jlcf);

    app.commands.addCommand(FORMAT_COMMAND, {
          execute: async () => {
              await jlcf.formatSelectedCodeCells();
          },
          isVisible: () => jlcf.getDefaultFormatter() && jlcf.getCodeCells().length > 0,
          label: "Format cell",
      });
    app.commands.addCommand(FORMAT_ALL_COMMAND, {
          execute: async () => {
              await jlcf.formatAllCodeCells();
          },
          isVisible: () => jlcf.getDefaultFormatter(),
          iconClass: ICON_FORMAT_ALL,
          iconLabel: "Format notebook",
      });
    app.contextMenu.addItem({ command: FORMAT_COMMAND, selector: ".jp-Notebook" });
  },
  autoStart: true,
  id: PLUGIN_NAME,
  requires: [ICommandPalette, INotebookTracker, ISettingRegistry, IMainMenu, IEditorTracker],
};

export default extension;
