// tslint:disable:no-string-literal
import {
  ICommandPalette,
} from "@jupyterlab/apputils";

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
  private config: any;

  private working = false;

  constructor(
    app: JupyterLab, tracker: INotebookTracker,
    palette: ICommandPalette, settingRegistry: ISettingRegistry,
  ) {
    this.app = app;
    this.tracker = tracker;
    this.palette = palette;
    this.settingRegistry = settingRegistry;
    this.setupSettings();
    // tslint:disable-next-line:no-console
    request("formatters", "GET", null, ServerConnection.defaultSettings).then(
      (data) => {
        const formatters = JSON.parse(data)["formatters"];
        Object.keys(formatters).map(
          (formatter) => {
            if (formatters[formatter]["enabled"]) {
              this.setupButton(formatter, formatters[formatter]["label"]);
            }
          },
        );
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
    if (this.working) {
      // tslint:disable-next-line:no-console
      console.log("Already working on something!! CHILL.");
    } else {
      if (this.tracker.activeCell instanceof CodeCell) {
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
        console.log("This doesn't seem like a code cell...");
      }
    }
  }

  private setupButton(name: string, label: string) {
    const command = "jupyterlab_black:" + name;
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
  ) => {
    // tslint:disable-next-line:no-console
    console.log("JupyterLab extension jupyterlab_code_formatter is activated!");
    // tslint:disable-next-line:no-unused-expression
    new JupyterLabCodeFormatter(app, tracker, palette, settingRegistry);
  },
  autoStart: true,
  id: "jupyterlab_code_formatter",
  requires: [ICommandPalette, INotebookTracker, ISettingRegistry],
};

export default extension;
