import { Cell, CodeCell } from '@jupyterlab/cells';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ServerConnection } from '@jupyterlab/services';
import JupyterlabCodeFormatterClient from './client';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { Widget } from '@phosphor/widgets';

class JupyterlabCodeFormatter {
  protected client: JupyterlabCodeFormatterClient;
  protected working: boolean;
  constructor(client: JupyterlabCodeFormatterClient) {
    this.client = client;
  }

  protected formatCode(code: string[], formatter: string, options: any) {
    return this.client
      .request(
        'format',
        'POST',
        JSON.stringify({
          code,
          formatter,
          options
        }),
        ServerConnection.defaultSettings
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

  public async formatSelectedCodeCells(config: any, formatter?: string) {
    return this.formatCells(true, config, formatter);
  }

  public async formatAllCodeCells(config: any, formatter?: string) {
    return this.formatCells(false, config, formatter);
  }

  private getCodeCells(selectedOnly = true): CodeCell[] {
    if (!this.notebookTracker.currentWidget) {
      return [];
    }
    const codeCells: CodeCell[] = [];
    const notebook = this.notebookTracker.currentWidget.content;
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
    if (this.notebookTracker.currentWidget) {
      const metadata = this.notebookTracker.currentWidget.content.model.metadata.toJSON();
      if (metadata && metadata.kernelspec) {
        // @ts-ignore
        return metadata.kernelspec.language;
      }
    }
    return null;
  }

  private getDefaultFormatter(config: any): string {
    const notebookType = this.getNotebookType();
    if (notebookType) {
      return config.preferences.default_formatter[notebookType];
    }
    return null;
  }

  private async formatCells(
    selectedOnly: boolean,
    config: any,
    formatter?: string
  ) {
    if (this.working) {
      return;
    }
    try {
      this.working = true;
      const selectedCells = this.getCodeCells(selectedOnly);
      if (selectedCells.length === 0) {
        this.working = false;
        return;
      }
      const currentTexts = selectedCells.map(cell => cell.model.value.text);
      const defaultFormatter = this.getDefaultFormatter(config);
      const formatterToUse = formatter || defaultFormatter;
      const formattedTexts = await this.formatCode(
        currentTexts,
        formatterToUse,
        config[formatterToUse]
      );
      for (let i = 0; i < selectedCells.length; ++i) {
        const cell = selectedCells[i];
        const currentText = currentTexts[i];
        const formattedText = formattedTexts.code[i];
        if (cell.model.value.text === currentText) {
          if (formattedText.code) {
            cell.model.value.text = formattedText.code;
          } else {
            console.error(
              'Could not format cell: %s due to:\n%o',
              currentText,
              formattedText.error
            );
          }
        } else {
          console.error(
            'Value changed since we formatted - skipping: %s',
            cell.model.value.text
          );
        }
      }
    } catch (err) {
      console.error('Something went wrong :(\n%o', err);
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
    this.formatCode([code], formatter, config[formatter])
      .then(data => {
        if (data.code[0].error) {
          throw data.code[0].error;
        }
        this.editorTracker.currentWidget.content.editor.model.value.text =
          data.code[0].code;
        this.working = false;
      })
      .catch(err => {
        this.working = false;
        console.error('Something went wrong :(:\n%o', err);
      });
  }

  applicable(formatter: string, currentWidget: Widget) {
    const currentEditorWidget = this.editorTracker.currentWidget;
    // TODO: Handle showing just the correct formatter for the language later
    return currentEditorWidget && currentWidget === currentEditorWidget;
  }
}
