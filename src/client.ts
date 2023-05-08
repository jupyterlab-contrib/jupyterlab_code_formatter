import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { Constants } from './constants';

class JupyterlabCodeFormatterClient {
  public request(path: string, method: string, body: any): Promise<any> {
    const settings = ServerConnection.makeSettings();
    const fullUrl = URLExt.join(settings.baseUrl, Constants.PLUGIN_NAME, path);
    return ServerConnection.makeRequest(
      fullUrl,
      {
        body,
        method
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

  public getAvailableFormatters(cache: boolean) {
    return this.request('formatters' + (cache ? '?cached' : ''), 'GET', null);
  }
}

export default JupyterlabCodeFormatterClient;
