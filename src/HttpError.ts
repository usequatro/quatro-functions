/**
 * Extension of Error to contain HTTP code information
 */
class HttpError extends Error {
  httpCode: number;

  constructor(httpCode: number, ...args: any[]) {
    super(...args);
    this.httpCode = httpCode;
  }

  getHttpCode() : number {
    return this.httpCode;
  }
}

export default HttpError;
