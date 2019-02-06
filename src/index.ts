import {
  ICommandPalette,
} from "@jupyterlab/apputils";

import {
  IMainMenu
} from "@jupyterlab/mainmenu";

import {
  INotebookTracker,
} from "@jupyterlab/notebook";

import {
  CodeCell,
} from "@jupyterlab/cells";

import {
  ISettingRegistry, URLExt,
} from "@jupyterlab/coreutils";

import {
  ServerConnection,
} from "@jupyterlab/services";

import {
  JupyterLab, JupyterLabPlugin,
} from "@jupyterlab/application";

import {
  IEditorTracker,
} from '@jupyterlab/fileeditor';

import "../style/index.css";

function request(
  path: string,
  method: string,
  body: any,
  settings: ServerConnection.ISettings,
): Promise<any> {
  const fullUrl = URLExt.join(settings.baseUrl, "jupyterlab_code_formatter", path);

  return ServerConnection.makeRequest(fullUrl, { body, method }, settings).then((response) => {
    if (response.status !== 200) {
      return response.text().then((data) => {
        throw new ServerConnection.ResponseError(response, data);
      });
    }
    return response.text();
  });
}

class JupyterLabCodeFormatter {
  private app: JupyterLab;
  private tracker: INotebookTracker;
  private palette: ICommandPalette;
  private settingRegistry: ISettingRegistry;
  private menu: IMainMenu;
  private config: any;
  private editorTracker: IEditorTracker;

  private working = false;

  constructor(
    app: JupyterLab, tracker: INotebookTracker,
    palette: ICommandPalette, settingRegistry: ISettingRegistry,
    menu: IMainMenu, editorTracker: IEditorTracker
  ) {
    this.app = app;
    this.tracker = tracker;
    this.editorTracker = editorTracker;
    this.palette = palette;
    this.settingRegistry = settingRegistry;
    this.menu = menu;
    this.setupSettings();
    // tslint:disable-next-line:no-console
    request("formatters", "GET", null, ServerConnection.defaultSettings).then(
      (data) => {
        const formatters = JSON.parse(data).formatters;
        let menuGroup: {command: string}[] = [];
        Object.keys(formatters).forEach(
          (formatter) => {
            if (formatters[formatter].enabled) {
              const command = "jupyterlab_code_formatter:" + formatter;
              this.setupButton(formatter, formatters[formatter].label, command);
              menuGroup.push({ command });
            }
          },
        );
        this.menu.editMenu.addGroup(menuGroup);
      },
    );
  }

  private setupSettings() {
    const self = this;
    Promise.all([this.settingRegistry.load("@ryantam626/jupyterlab_code_formatter:settings")]).then(
      ([settings]) => {
        function onSettingsUpdated(jsettings: ISettingRegistry.ISettings) {
          self.config = jsettings.composite;
        }
        settings.changed.connect(onSettingsUpdated);
        onSettingsUpdated(settings);
      },
      // tslint:disable-next-line:no-console
    ).catch((reason: Error) => console.error(reason.message));
  }

  private maybeFormatCodecell(formatterName: string) {
    // TODO: Check current kernel is of appropriate kernel
    console.log("Formatting something!");
    const editorWidget = this.editorTracker.currentWidget.content;
    if (this.working) {
      // tslint:disable-next-line:no-console
      console.log("Already working on something!! CHILL.");
    } else if (editorWidget.isVisible){
        console.log("Formatting a file");
        this.working = true;
        const editor = editorWidget.editor;
        const code = editor.model.value.text;
        request(
          "format", "POST", JSON.stringify(
            {
              code: code,
              formatter: formatterName,
              options: this.config[formatterName],
            },
          ), ServerConnection.defaultSettings,
        ).then(
            (data) => {
              this.editorTracker.currentWidget.content.editor.model.value.text = JSON.parse(data);
              this.working = false;
            },
        ).catch(
          () => {
            this.working = false;
            // tslint:disable-next-line:no-console
            console.error("Something went wrong :(");
          },
        );    
    } else if (this.tracker.activeCell instanceof CodeCell) {
        console.log("Formatting a notebook cell");
        this.working = true;
        request(
          "format", "POST", JSON.stringify(
            {
              code: this.tracker.activeCell.model.value.text,
              formatter: formatterName,
              options: this.config[formatterName],
            },
          ), ServerConnection.defaultSettings,
        ).then(
            (data) => {
              this.tracker.activeCell.model.value.text = JSON.parse(data);
              this.working = false;
            },
        ).catch(
          () => {
            this.working = false;
            // tslint:disable-next-line:no-console
            console.error("Something went wrong :(");
          },
        );
      } else {
        // tslint:disable-next-line:no-console
        console.log("This doesn't seem like a code cell or a file...");
      }
  }

  private setupButton(name: string, label: string, command: string) {
    this.app.commands.addCommand(command, {
      execute: () => {
        this.maybeFormatCodecell(name);
      },
      label,
    });
    this.palette.addItem({ command, category: "JupyterLab Code Formatter" });
  }

}

/**
 * Initialization data for the jupyterlab_code_formatter extension.
 */
const extension: JupyterLabPlugin<void> = {
  activate: (
    app: JupyterLab, palette: ICommandPalette,
    tracker: INotebookTracker, settingRegistry: ISettingRegistry,
    menu: IMainMenu, editorTracker: IEditorTracker
  ) => {
    // tslint:disable-next-line:no-console
    console.log("Hello! JupyterLab extension jupyterlab_code_formatter is activated!");
    // tslint:disable-next-line:no-unused-expression
    new JupyterLabCodeFormatter(app, tracker, palette, settingRegistry, menu, editorTracker);
  },
  autoStart: true,
  id: "jupyterlab_code_formatter",
  requires: [ICommandPalette, INotebookTracker, ISettingRegistry, IMainMenu, IEditorTracker],
};

export default extension;
