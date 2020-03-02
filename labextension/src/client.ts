import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { Constants } from './constants';

class JupyterlabCodeFormatterClient {
  public request(
    path: string,
    method: string,
    body: any,
    settings: ServerConnection.ISettings
  ): Promise<any> {
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
          // TODO: Use package.json info
          'Plugin-Version': '1.2.0'
        })
      },
      settings
    ).then(response => {
      if (response.status !== 200) {
        return response.text().then(data => {
          throw new ServerConnection.ResponseError(response, data);
        });
      }
      return response.text();
    });
  }

  public getAvailableFormatters() {
    return this.request(
      'formatters',
      'GET',
      null,
      ServerConnection.defaultSettings
    );
  }
}

export default JupyterlabCodeFormatterClient;
