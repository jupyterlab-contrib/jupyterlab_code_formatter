import { Cell, CodeCell } from '@jupyterlab/cells';
import { INotebookTracker, Notebook } from '@jupyterlab/notebook';
import JupyterlabCodeFormatterClient from './client';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { Widget } from '@lumino/widgets';
import { showErrorMessage, Dialog, showDialog } from '@jupyterlab/apputils';

type Context = {
  saving: boolean;
};

class JupyterlabCodeFormatter {
  working = false;
  protected client: JupyterlabCodeFormatterClient;
  constructor(client: JupyterlabCodeFormatterClient) {
    this.client = client;
  }

  protected formatCode(
    code: string[],
    formatter: string,
    options: any,
    notebook: boolean,
    cache: boolean
  ) {
    return this.client
      .request(
        'format' + (cache ? '?cached' : ''),
        'POST',
        JSON.stringify({
          code,
          notebook,
          formatter,
          options
        })
      )
      .then(resp => JSON.parse(resp));
  }
}

export class JupyterlabNotebookCodeFormatter extends JupyterlabCodeFormatter {
  protected notebookTracker: INotebookTracker;

  constructor(
    client: JupyterlabCodeFormatterClient,
    notebookTracker: INotebookTracker
  ) {
    super(client);
    this.notebookTracker = notebookTracker;
  }

  public async formatAction(config: any, formatter?: string) {
    return this.formatCells(true, config, { saving: false }, formatter);
  }

  public async formatSelectedCodeCells(
    config: any,
    formatter?: string,
    notebook?: Notebook
  ) {
    return this.formatCells(
      true,
      config,
      { saving: false },
      formatter,
      notebook
    );
  }

  public async formatAllCodeCells(
    config: any,
    context: Context,
    formatter?: string,
    notebook?: Notebook
  ) {
    return this.formatCells(false, config, context, formatter, notebook);
  }

  private getCodeCells(selectedOnly = true, notebook?: Notebook): CodeCell[] {
    if (!this.notebookTracker.currentWidget) {
      return [];
    }
    const codeCells: CodeCell[] = [];
    notebook = notebook || this.notebookTracker.currentWidget.content;
    notebook.widgets.forEach((cell: Cell) => {
      if (cell.model.type === 'code') {
        if (!selectedOnly || (<Notebook>notebook).isSelectedOrActive(cell)) {
          codeCells.push(cell as CodeCell);
        }
      }
    });
    return codeCells;
  }

  private getNotebookType(): string | null {
    // If there is no current notebook, there is nothing to do
    if (!this.notebookTracker.currentWidget) {
      return null;
    }

    // first, check the notebook's metadata for language info
    const metadata =
      this.notebookTracker.currentWidget.content.model?.sharedModel?.metadata;

    if (metadata) {
      // prefer kernelspec language
      if (
        metadata.kernelspec &&
        metadata.kernelspec.language &&
        typeof metadata.kernelspec.language === 'string'
      ) {
        return metadata.kernelspec.language.toLowerCase();
      }

      // otherwise, check language info code mirror mode
      if (metadata.language_info && metadata.language_info.codemirror_mode) {
        const mode = metadata.language_info.codemirror_mode;
        if (typeof mode === 'string') {
          return mode.toLowerCase();
        } else if (typeof mode.name === 'string') {
          return mode.name.toLowerCase();
        }
      }
    }

    // in the absence of metadata, look in the current session's kernel spec
    const sessionContext = this.notebookTracker.currentWidget.sessionContext;
    const kernelName = sessionContext?.session?.kernel?.name;
    if (kernelName) {
      const specs = sessionContext.specsManager.specs?.kernelspecs;
      if (specs && kernelName in specs) {
        return specs[kernelName]!.language;
      }
    }

    return null;
  }

  private getDefaultFormatters(config: any): Array<string> {
    const notebookType = this.getNotebookType();
    if (notebookType) {
      const defaultFormatter =
        config.preferences.default_formatter[notebookType];
      if (defaultFormatter instanceof Array) {
        return defaultFormatter;
      } else if (defaultFormatter !== undefined) {
        return [defaultFormatter];
      }
    }
    return [];
  }

  private async getFormattersToUse(config: any, formatter?: string) {
    const defaultFormatters = this.getDefaultFormatters(config);
    const formattersToUse =
      formatter !== undefined ? [formatter] : defaultFormatters;

    if (formattersToUse.length === 0) {
      await showErrorMessage(
        'Jupyterlab Code Formatter Error',
        'Unable to find default formatters to use, please file an issue on GitHub.'
      );
    }

    return formattersToUse;
  }

  private async applyFormatters(
    selectedCells: CodeCell[],
    formattersToUse: string[],
    config: any,
    context: Context
  ) {
    for (const formatterToUse of formattersToUse) {
      if (formatterToUse === 'noop' || formatterToUse === 'skip') {
        continue;
      }
      const currentTexts = selectedCells.map(
        cell => cell.model.sharedModel.source
      );
      const formattedTexts = await this.formatCode(
        currentTexts,
        formatterToUse,
        config[formatterToUse],
        true,
        config.cacheFormatters
      );
      console.log(
        config.suppressFormatterErrorsIFFAutoFormatOnSave,
        context.saving
      );

      const showErrors =
        !(config.suppressFormatterErrors ?? false) &&
        !(
          (config.suppressFormatterErrorsIFFAutoFormatOnSave ?? false) &&
          context.saving
        );
      for (let i = 0; i < selectedCells.length; ++i) {
        const cell = selectedCells[i];
        const currentText = currentTexts[i];
        const formattedText = formattedTexts.code[i];
        const cellValueHasNotChanged =
          cell.model.sharedModel.source === currentText;
        if (cellValueHasNotChanged) {
          if (formattedText.error) {
            if (showErrors) {
              const result = await showDialog({
                title: 'Jupyterlab Code Formatter Error',
                body: formattedText.error,
                buttons: [
                  Dialog.createButton({
                    label: 'Go to cell',
                    actions: ['revealError']
                  }),
                  Dialog.okButton({ label: 'Dismiss' })
                ]
              });
              if (result.button.actions.indexOf('revealError') !== -1) {
                this.notebookTracker.currentWidget!.content.scrollToCell(cell);
                break;
              }
            }
          } else {
            cell.model.sharedModel.source = formattedText.code;
          }
        } else {
          if (showErrors) {
            await showErrorMessage(
              'Jupyterlab Code Formatter Error',
              `Cell value changed since format request was sent, formatting for cell ${i} skipped.`
            );
          }
        }
      }
    }
  }

  private async formatCells(
    selectedOnly: boolean,
    config: any,
    context: Context,
    formatter?: string,
    notebook?: Notebook
  ) {
    if (this.working) {
      return;
    }
    try {
      this.working = true;
      const selectedCells = this.getCodeCells(selectedOnly, notebook);
      if (selectedCells.length === 0) {
        this.working = false;
        return;
      }

      const formattersToUse = await this.getFormattersToUse(config, formatter);
      await this.applyFormatters(
        selectedCells,
        formattersToUse,
        config,
        context
      );
    } catch (error) {
      await showErrorMessage('Jupyterlab Code Formatter Error', `${error}`);
    }
    this.working = false;
  }

  applicable(formatter: string, currentWidget: Widget) {
    const currentNotebookWidget = this.notebookTracker.currentWidget;
    // TODO: Handle showing just the correct formatter for the language later
    return currentNotebookWidget && currentWidget === currentNotebookWidget;
  }
}

export class JupyterlabFileEditorCodeFormatter extends JupyterlabCodeFormatter {
  protected editorTracker: IEditorTracker;

  constructor(
    client: JupyterlabCodeFormatterClient,
    editorTracker: IEditorTracker
  ) {
    super(client);
    this.editorTracker = editorTracker;
  }

  formatAction(config: any, formatter: string) {
    return this.formatEditor(config, { saving: false }, formatter);
  }

  public async formatEditor(config: any, context: Context, formatter?: string) {
    if (this.working) {
      return;
    }
    try {
      this.working = true;

      const formattersToUse = await this.getFormattersToUse(config, formatter);
      await this.applyFormatters(formattersToUse, config, context);
    } catch (error) {
      const msg = error instanceof Error ? error : `${error}`;
      await showErrorMessage('Jupyterlab Code Formatter Error', msg);
    }
    this.working = false;
  }

  private getEditorType() {
    if (!this.editorTracker.currentWidget) {
      return null;
    }

    const mimeType = this.editorTracker.currentWidget.content.model!.mimeType;

    const mimeTypes = new Map([
      ['text/x-python', 'python'],
      ['application/x-rsrc', 'r'],
      ['application/x-scala', 'scala'],
      ['application/x-rustsrc', 'rust'],
      ['application/x-c++src', 'cpp'] // Not sure that this is right, whatever.
      // Add more MIME types and corresponding programming languages here
    ]);

    return mimeTypes.get(mimeType);
  }

  private getDefaultFormatters(config: any): Array<string> {
    const editorType = this.getEditorType();
    if (editorType) {
      const defaultFormatter = config.preferences.default_formatter[editorType];
      if (defaultFormatter instanceof Array) {
        return defaultFormatter;
      } else if (defaultFormatter !== undefined) {
        return [defaultFormatter];
      }
    }
    return [];
  }

  private async getFormattersToUse(config: any, formatter?: string) {
    const defaultFormatters = this.getDefaultFormatters(config);
    const formattersToUse =
      formatter !== undefined ? [formatter] : defaultFormatters;

    if (formattersToUse.length === 0) {
      await showErrorMessage(
        'Jupyterlab Code Formatter Error',
        'Unable to find default formatters to use, please file an issue on GitHub.'
      );
    }

    return formattersToUse;
  }

  private async applyFormatters(
    formattersToUse: string[],
    config: any,
    context: Context
  ) {
    for (const formatterToUse of formattersToUse) {
      if (formatterToUse === 'noop' || formatterToUse === 'skip') {
        continue;
      }
      const showErrors =
        !(config.suppressFormatterErrors ?? false) &&
        !(
          (config.suppressFormatterErrorsIFFAutoFormatOnSave ?? false) &&
          context.saving
        );

      const editorWidget = this.editorTracker.currentWidget;
      this.working = true;
      const editor = editorWidget!.content.editor;
      const code = editor.model.sharedModel.source;
      this.formatCode(
        [code],
        formatterToUse,
        config[formatterToUse],
        false,
        config.cacheFormatters
      )
        .then(data => {
          if (data.code[0].error) {
            if (showErrors) {
              void showErrorMessage(
                'Jupyterlab Code Formatter Error',
                data.code[0].error
              );
            }
            this.working = false;
            return;
          }
          this.editorTracker.currentWidget!.content.editor.model.sharedModel.source =
            data.code[0].code;
          this.working = false;
        })
        .catch(error => {
          const msg = error instanceof Error ? error : `${error}`;
          void showErrorMessage('Jupyterlab Code Formatter Error', msg);
        });
    }
  }

  applicable(formatter: string, currentWidget: Widget) {
    const currentEditorWidget = this.editorTracker.currentWidget;
    // TODO: Handle showing just the correct formatter for the language later
    return currentEditorWidget && currentWidget === currentEditorWidget;
  }
}
