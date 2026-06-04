/**
 * Custom error type used across the API.
 * Pass an HTTP status code so the global error handler can send the right response.
 */
class HttpError extends Error {
  /** HTTP status code sent to the client (e.g. 401, 404, 500). */
  public code: number;

  /**
   * @param message - Error text returned in `{ success: false, error: message }`
   * @param errorCode - HTTP status code for this error
   */
  constructor(message: string, errorCode: number) {
    super(message);
    this.code = errorCode;
  }
}

export default HttpError;
