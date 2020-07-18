import { Cell, CodeCell } from '@jupyterlab/cells';
import { INotebookTracker, Notebook } from '@jupyterlab/notebook';
import JupyterlabCodeFormatterClient from './client';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { Widget } from '@lumino/widgets';
import { showErrorMessage } from '@jupyterlab/apputils';

class JupyterlabCodeFormatter {
  protected client: JupyterlabCodeFormatterClient;
  protected working: boolean;
  constructor(client: JupyterlabCodeFormatterClient) {
    this.client = client;
  }

  protected formatCode(
    code: string[],
    formatter: string,
    options: any,
    notebook: boolean
  ) {
    return this.client
      .request(
        'format',
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
    return this.formatCells(true, config, formatter);
  }

  public async formatSelectedCodeCells(
    config: any,
    formatter?: string,
    notebook?: Notebook
  ) {
    return this.formatCells(true, config, formatter, notebook);
  }

  public async formatAllCodeCells(
    config: any,
    formatter?: string,
    notebook?: Notebook
  ) {
    return this.formatCells(false, config, formatter, notebook);
  }

  private getCodeCells(selectedOnly = true, notebook?: Notebook): CodeCell[] {
    if (!this.notebookTracker.currentWidget) {
      return [];
    }
    const codeCells: CodeCell[] = [];
    notebook = notebook || this.notebookTracker.currentWidget.content;
    notebook.widgets.forEach((cell: Cell) => {
      if (cell.model.type === 'code') {
        if (!selectedOnly || notebook.isSelectedOrActive(cell)) {
          codeCells.push(cell as CodeCell);
        }
      }
    });
    return codeCells;
  }

  private getNotebookType() {
    if (!this.notebookTracker.currentWidget) {
      return null;
    }

    const metadata = this.notebookTracker.currentWidget.content.model.metadata.toJSON();

    if (!metadata) {
      return null;
    }

    // prefer kernelspec language
    // @ts-ignore
    if (metadata.kernelspec && metadata.kernelspec.language) {
      // @ts-ignore
      return metadata.kernelspec.language.toLowerCase();
    }

    // otherwise, check language info code mirror mode
    // @ts-ignore
    if (metadata.language_info && metadata.language_info.codemirror_mode) {
      // @ts-ignore
      return metadata.language_info.codemirror_mode.name.toLowerCase();
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

  private async formatCells(
    selectedOnly: boolean,
    config: any,
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
      const defaultFormatters = this.getDefaultFormatters(config);
      const formattersToUse =
        formatter !== undefined ? [formatter] : defaultFormatters;

      if (formattersToUse.length === 0) {
        await showErrorMessage(
          'Jupyterlab Code Formatter Error',
          `Unable to find default formatters to use, please file an issue on GitHub.`
        );
      }

      for (let formatterToUse of formattersToUse) {
        const currentTexts = selectedCells.map(cell => cell.model.value.text);
        const formattedTexts = await this.formatCode(
          currentTexts,
          formatterToUse,
          config[formatterToUse],
          true
        );
        for (let i = 0; i < selectedCells.length; ++i) {
          const cell = selectedCells[i];
          const currentText = currentTexts[i];
          const formattedText = formattedTexts.code[i];
          if (cell.model.value.text === currentText) {
            if (formattedText.error) {
              await showErrorMessage(
                'Jupyterlab Code Formatter Error',
                formattedText.error
              );
            } else {
              cell.model.value.text = formattedText.code;
            }
          } else {
            await showErrorMessage(
              'Jupyterlab Code Formatter Error',
              `Cell value changed since format request was sent, formatting for cell ${i} skipped.`
            );
          }
        }
      }
    } catch (error) {
      await showErrorMessage('Jupyterlab Code Formatter Error', error);
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
    if (this.working) {
      return;
    }
    const editorWidget = this.editorTracker.currentWidget;
    this.working = true;
    const editor = editorWidget.content.editor;
    const code = editor.model.value.text;
    this.formatCode([code], formatter, config[formatter], false)
      .then(data => {
        if (data.code[0].error) {
          void showErrorMessage(
            'Jupyterlab Code Formatter Error',
            data.code[0].error
          );
          this.working = false;
          return;
        }
        this.editorTracker.currentWidget.content.editor.model.value.text =
          data.code[0].code;
        this.working = false;
      })
      .catch(error => {
        this.working = false;
        void showErrorMessage('Jupyterlab Code Formatter Error', error);
      });
  }

  applicable(formatter: string, currentWidget: Widget) {
    const currentEditorWidget = this.editorTracker.currentWidget;
    // TODO: Handle showing just the correct formatter for the language later
    return currentEditorWidget && currentWidget === currentEditorWidget;
  }
}
