import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { Constants } from './constants';

class JupyterlabCodeFormatterClient {
  public request(path: string, method: string, body: any): Promise<any> {
    const settings = ServerConnection.makeSettings();
    const fullUrl = URLExt.join(
      settings.baseUrl,
      Constants.SHORT_PLUGIN_NAME,
      path
    );
    return ServerConnection.makeRequest(
      fullUrl,
      {
        body,
        method,
        headers: new Headers({
          'Plugin-Version': Constants.PLUGIN_VERSION
        })
      },
      settings
    ).then(response => {
      if (response.status !== 200) {
        return response.text().then(() => {
          throw new ServerConnection.ResponseError(
            response,
            response.statusText
          );
        });
      }
      return response.text();
    });
  }

  public getAvailableFormatters() {
    return this.request('formatters', 'GET', null);
  }

  public getVersion() {
    return this.request('version', 'GET', null);
  }
}

export default JupyterlabCodeFormatterClient;
