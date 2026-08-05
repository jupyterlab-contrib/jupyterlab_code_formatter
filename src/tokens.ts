import {
  ReadonlyJSONObject,
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';

/**
 * The arguments accepted by the formatting commands.
 */
export interface IFormatArguments extends IFormatOptions {
  /**
   * The path of the document to format.
   *
   * If not given, the currently active document is used.
   * The document has to be open in JupyterLab.
   */
  path?: string;
}

/**
 * The configuration of this extension: the composite value of the settings
 * defined in `schema/settings.json`.
 */
export interface IConfig extends ReadonlyPartialJSONObject {
  /**
   * The preferences of the user.
   */
  preferences?: {
    /**
     * The formatters to use for a given language when no formatter was
     * requested explicitly; a single formatter or a chain of formatters.
     */
    default_formatter?: {
      [language: string]: string | string[] | undefined;
    };
  };
  /**
   * Whether to format the document when it is saved.
   */
  formatOnSave: boolean;
  /**
   * Whether to cache the results of the formatter availability checks.
   */
  cacheFormatters: boolean;
  /**
   * Whether to never report the formatter errors to the user.
   */
  suppressFormatterErrors: boolean;
  /**
   * Whether to not report the formatter errors when formatting on save.
   */
  suppressFormatterErrorsIFFAutoFormatOnSave: boolean;
  /**
   * The options passed to the individual formatters, keyed by formatter name,
   * for example `black` or `isort`.
   */
  [formatter: string]: ReadonlyPartialJSONValue | undefined;
}

/**
 * The options of a formatting operation.
 *
 * Any new option should be added here rather than as a new argument of the
 * formatting methods and of the commands.
 */
export interface IFormatOptions {
  /**
   * Whether to report the errors to the user in a dialog.
   *
   * Programmatic callers should pass `false` to prevent the operation from
   * waiting for the user to dismiss the dialogs; the errors are then only
   * available in `IFormatResult.errors` and in the rejection reason.
   *
   * When not given, the `suppressFormatterErrors` and
   * `suppressFormatterErrorsIFFAutoFormatOnSave` settings are used.
   */
  showDialogs?: boolean;
}

/**
 * An error raised by a formatter for a single fragment of code.
 */
export interface IFormatterError {
  /**
   * The index of the offending code cell (always 0 for file editors).
   */
  index: number;
  /**
   * The name of the formatter which raised the error.
   */
  formatter: string;
  /**
   * The error message as reported by the formatter.
   */
  error: string;
}

/**
 * The outcome of a formatting operation, as returned by the commands.
 */
export interface IFormatResult {
  /**
   * The path of the formatted document.
   */
  path: string;
  /**
   * The formatters which were applied, in the order of application.
   *
   * The `noop` and `skip` pseudo-formatters are not included.
   */
  formatters: string[];
  /**
   * The number of code fragments which were considered for formatting:
   * the number of code cells for notebooks, and 1 for file editors.
   */
  considered: number;
  /**
   * The number of code fragments which were modified.
   */
  changed: number;
  /**
   * The errors reported by the formatters, if any.
   */
  errors: IFormatterError[];
}

/**
 * The JSON schema of the arguments accepted by the formatting commands.
 */
export const FORMAT_ARGUMENTS_SCHEMA: ReadonlyJSONObject = {
  title: 'Formatting command arguments',
  type: 'object',
  properties: {
    path: {
      type: 'string',
      title: 'Path',
      description:
        'The path of the document to format; defaults to the active document. The document has to be open in JupyterLab.'
    },
    showDialogs: {
      type: 'boolean',
      title: 'Show dialogs',
      description:
        'Whether to report the errors to the user in a dialog; defaults to the value implied by the `suppressFormatterErrors` settings. Pass `false` to avoid waiting for the user to dismiss the dialogs.'
    }
  }
};
