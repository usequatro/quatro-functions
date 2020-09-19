/**
 * Extension of Error to contain HTTP code information
 */
class HttpError extends Error {
  httpCode: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(httpCode: number, ...args: any[]) {
    super(...args);
    this.httpCode = httpCode;
  }

  getHttpCode() : number {
    return this.httpCode;
  }
}

export default HttpError;
