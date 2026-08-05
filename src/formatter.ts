import { Cell, CodeCell } from '@jupyterlab/cells';
import {
  INotebookTracker,
  Notebook,
  NotebookPanel
} from '@jupyterlab/notebook';
import JupyterlabCodeFormatterClient from './client';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { Widget } from '@lumino/widgets';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import {
  IConfig,
  IFormatOptions,
  IFormatResult,
  IFormatterError
} from './tokens';

/**
 * A notebook to format: either a widget, or the path of an open notebook.
 */
export type NotebookTarget = NotebookPanel | Notebook | string;

/**
 * A file to format: either a file editor widget, or the path of an open file.
 */
export type EditorTarget = IDocumentWidget<FileEditor> | string;

/**
 * The pseudo-formatters which indicate that no formatting should be performed.
 */
const NOOP_FORMATTERS = ['noop', 'skip'];

/**
 * The error raised when a formatting operation is requested while another one
 * is still in progress.
 */
export class FormattingInProgressError extends Error {
  constructor() {
    super('A formatting operation is already in progress');
  }
}

class JupyterlabCodeFormatter {
  working = false;
  protected client: JupyterlabCodeFormatterClient;
  constructor(client: JupyterlabCodeFormatterClient) {
    this.client = client;
  }

  protected formatCode(
    code: string[],
    formatter: string,
    options: unknown,
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

  /**
   * Whether the errors raised by formatters should be shown to the user.
   */
  protected shouldShowErrors(options: IFormatOptions): boolean {
    if (options.showDialogs !== undefined) {
      return options.showDialogs;
    }
    const config = options.config;
    return (
      !config.suppressFormatterErrors &&
      !(config.suppressFormatterErrorsIFFAutoFormatOnSave && options.saving)
    );
  }

  /**
   * Get the formatters to use, raising if there is no formatter to use at all.
   *
   * The `noop` and `skip` pseudo-formatters are filtered out.
   */
  protected getFormattersToUse(
    options: IFormatOptions,
    language: string | null | undefined
  ): string[] {
    const formatters =
      options.formatter !== undefined
        ? [options.formatter]
        : this.getDefaultFormatters(options.config, language);
    if (formatters.length === 0) {
      throw new Error(
        'Unable to find default formatters to use, please file an issue on GitHub.'
      );
    }
    return formatters.filter(formatter => !NOOP_FORMATTERS.includes(formatter));
  }

  /**
   * Get the formatters configured as default for a given language.
   */
  private getDefaultFormatters(
    config: IConfig,
    language: string | null | undefined
  ): string[] {
    const defaultFormatter = language
      ? config.preferences?.default_formatter?.[language]
      : undefined;
    if (defaultFormatter instanceof Array) {
      return defaultFormatter;
    }
    return defaultFormatter !== undefined ? [defaultFormatter] : [];
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

  /**
   * Format all the code cells of a notebook.
   */
  public async formatAllCodeCells(
    options: JupyterlabNotebookCodeFormatter.IOptions
  ): Promise<IFormatResult> {
    return this.formatCells(false, options);
  }

  /**
   * Format the selected (or active) code cells of a notebook.
   */
  public async formatSelectedCodeCells(
    options: JupyterlabNotebookCodeFormatter.IOptions
  ): Promise<IFormatResult> {
    return this.formatCells(true, options);
  }

  /**
   * Find the panel of the open notebook with a given path, if any.
   */
  public findPanel(path: string): NotebookPanel | null {
    return (
      this.notebookTracker.find(panel => panel.context.path === path) ?? null
    );
  }

  /**
   * Resolve the notebook panel to format, raising if it cannot be found.
   */
  private resolvePanel(target?: NotebookTarget): NotebookPanel {
    if (typeof target === 'string') {
      const panel = this.findPanel(target);
      if (!panel) {
        throw new Error(`Could not find an open notebook with path: ${target}`);
      }
      return panel;
    }
    if (target instanceof NotebookPanel) {
      return target;
    }
    if (target) {
      // A `Notebook` was given, kept for backward compatibility.
      const panel =
        this.notebookTracker.find(candidate => candidate.content === target) ??
        null;
      if (!panel) {
        throw new Error('Could not find the panel of the given notebook');
      }
      return panel;
    }
    const panel = this.notebookTracker.currentWidget;
    if (!panel) {
      throw new Error(
        'There is no active notebook; please pass a `path` of an open notebook'
      );
    }
    return panel;
  }

  private getCodeCells(panel: NotebookPanel, selectedOnly = true): CodeCell[] {
    const codeCells: CodeCell[] = [];
    const notebook = panel.content;
    notebook.widgets.forEach((cell: Cell) => {
      if (cell.model.type === 'code') {
        if (!selectedOnly || notebook.isSelectedOrActive(cell)) {
          codeCells.push(cell as CodeCell);
        }
      }
    });
    return codeCells;
  }

  private getNotebookType(panel: NotebookPanel): string | null {
    // first, check the notebook's metadata for language info
    const metadata = panel.content.model?.sharedModel?.metadata;

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
    const sessionContext = panel.sessionContext;
    const kernelName = sessionContext?.session?.kernel?.name;
    if (kernelName) {
      const specs = sessionContext.specsManager.specs?.kernelspecs;
      if (specs && kernelName in specs) {
        return specs[kernelName]!.language;
      }
    }

    return null;
  }

  private async applyFormatters(
    panel: NotebookPanel,
    selectedCells: CodeCell[],
    formattersToUse: string[],
    options: JupyterlabNotebookCodeFormatter.IOptions
  ): Promise<IFormatterError[]> {
    const errors: IFormatterError[] = [];
    const config = options.config;
    const showErrors = this.shouldShowErrors(options);

    for (const formatterToUse of formattersToUse) {
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

      for (let i = 0; i < selectedCells.length; ++i) {
        const cell = selectedCells[i];
        const currentText = currentTexts[i];
        const formattedText = formattedTexts.code[i];
        const cellValueHasNotChanged =
          cell.model.sharedModel.source === currentText;
        if (cellValueHasNotChanged) {
          if (formattedText.error) {
            errors.push({
              index: i,
              formatter: formatterToUse,
              error: formattedText.error
            });
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
                panel.content.scrollToCell(cell);
                break;
              }
            }
          } else {
            cell.model.sharedModel.source = formattedText.code;
          }
        } else {
          const error = `Cell value changed since format request was sent, formatting for cell ${i} skipped.`;
          errors.push({ index: i, formatter: formatterToUse, error });
          if (showErrors) {
            await showErrorMessage('Jupyterlab Code Formatter Error', error);
          }
        }
      }
    }
    return errors;
  }

  private async formatCells(
    selectedOnly: boolean,
    options: JupyterlabNotebookCodeFormatter.IOptions
  ): Promise<IFormatResult> {
    if (this.working) {
      throw new FormattingInProgressError();
    }
    const panel = this.resolvePanel(options.target);
    try {
      this.working = true;
      const selectedCells = this.getCodeCells(panel, selectedOnly);
      if (selectedCells.length === 0) {
        return {
          path: panel.context.path,
          formatters: [],
          considered: 0,
          changed: 0,
          errors: []
        };
      }

      const formattersToUse = this.getFormattersToUse(
        options,
        this.getNotebookType(panel)
      );
      const originalTexts = selectedCells.map(
        cell => cell.model.sharedModel.source
      );
      const errors = await this.applyFormatters(
        panel,
        selectedCells,
        formattersToUse,
        options
      );
      return {
        path: panel.context.path,
        formatters: formattersToUse,
        considered: selectedCells.length,
        changed: selectedCells.filter(
          (cell, i) => cell.model.sharedModel.source !== originalTexts[i]
        ).length,
        errors
      };
    } finally {
      this.working = false;
    }
  }

  applicable(formatter: string, currentWidget: Widget) {
    const currentNotebookWidget = this.notebookTracker.currentWidget;
    // TODO: Handle showing just the correct formatter for the language later
    return currentNotebookWidget && currentWidget === currentNotebookWidget;
  }
}

export namespace JupyterlabNotebookCodeFormatter {
  /**
   * The options of a notebook formatting operation.
   */
  export interface IOptions extends IFormatOptions {
    /**
     * The notebook to format; when not given, the active notebook is used.
     */
    target?: NotebookTarget;
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

  /**
   * Format the content of a file editor.
   */
  public async formatEditor(
    options: JupyterlabFileEditorCodeFormatter.IOptions
  ): Promise<IFormatResult> {
    if (this.working) {
      throw new FormattingInProgressError();
    }
    const widget = this.resolveWidget(options.target);
    try {
      this.working = true;
      const formattersToUse = this.getFormattersToUse(
        options,
        this.getEditorType(widget)
      );
      const sharedModel = widget.content.editor.model.sharedModel;
      const originalText = sharedModel.source;
      const errors = await this.applyFormatters(
        widget,
        formattersToUse,
        options
      );
      return {
        path: widget.context.path,
        formatters: formattersToUse,
        considered: 1,
        changed: sharedModel.source !== originalText ? 1 : 0,
        errors
      };
    } finally {
      this.working = false;
    }
  }

  /**
   * Find the widget of the open file with a given path, if any.
   */
  public findWidget(path: string): IDocumentWidget<FileEditor> | null {
    return (
      this.editorTracker.find(widget => widget.context.path === path) ?? null
    );
  }

  /**
   * Resolve the file editor widget to format, raising if it cannot be found.
   */
  private resolveWidget(target?: EditorTarget): IDocumentWidget<FileEditor> {
    if (typeof target === 'string') {
      const widget = this.findWidget(target);
      if (!widget) {
        throw new Error(`Could not find an open file with path: ${target}`);
      }
      return widget;
    }
    if (target) {
      return target;
    }
    const widget = this.editorTracker.currentWidget;
    if (!widget) {
      throw new Error(
        'There is no active file editor; please pass a `path` of an open file'
      );
    }
    return widget;
  }

  private getEditorType(widget: IDocumentWidget<FileEditor>) {
    const mimeType = widget.content.model.mimeType;

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

  private async applyFormatters(
    widget: IDocumentWidget<FileEditor>,
    formattersToUse: string[],
    options: JupyterlabFileEditorCodeFormatter.IOptions
  ): Promise<IFormatterError[]> {
    const errors: IFormatterError[] = [];
    const config = options.config;
    const showErrors = this.shouldShowErrors(options);

    for (const formatterToUse of formattersToUse) {
      const sharedModel = widget.content.editor.model.sharedModel;
      const data = await this.formatCode(
        [sharedModel.source],
        formatterToUse,
        config[formatterToUse],
        false,
        config.cacheFormatters
      );
      const formattedText = data.code[0];
      if (formattedText.error) {
        errors.push({
          index: 0,
          formatter: formatterToUse,
          error: formattedText.error
        });
        if (showErrors) {
          await showErrorMessage(
            'Jupyterlab Code Formatter Error',
            formattedText.error
          );
        }
        continue;
      }
      sharedModel.source = formattedText.code;
    }
    return errors;
  }

  applicable(formatter: string, currentWidget: Widget) {
    const currentEditorWidget = this.editorTracker.currentWidget;
    // TODO: Handle showing just the correct formatter for the language later
    return currentEditorWidget && currentWidget === currentEditorWidget;
  }
}

export namespace JupyterlabFileEditorCodeFormatter {
  /**
   * The options of a file editor formatting operation.
   */
  export interface IOptions extends IFormatOptions {
    /**
     * The file to format; when not given, the active file editor is used.
     */
    target?: EditorTarget;
  }
}
