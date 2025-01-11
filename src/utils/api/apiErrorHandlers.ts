class GenericAPIErrorHandler {
  static handleAPIError(error: any): Response {
    let status = 500;
    let errorMessage = "An unexpected error occurred";
    let errorCode = "unknown_error";
    let errorType = "internal_server_error";

    if (error.response) {
      status = error.response.status;
      errorMessage = error.response.body?.message || errorMessage; 
      errorCode = error.response.body?.code || errorCode;
      errorType = error.response.body?.type || errorType; // Added to capture error type if available
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ 
      error: errorMessage, 
      status,
      code: errorCode,
      type: errorType
    }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

class OpenAIErrorHandler {
  static handleValidationError(field: string, result: ValidationResult): Response {
    return new Response(
      JSON.stringify({
        error: "Validation Error",
        field,
        details: result.errors
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  static handleOpenAIError(error: any): Response {
    let status = 500;
    let errorMessage = "An unexpected error occurred";
    let errorCode = "unknown_error";
    let errorType = "internal_server_error";

    if (error.response) {
      status = error.response.status;
      if (error.error && error.error.type) {
        errorType = error.error.type;
      }
      if (error.error && error.error.code) {
        errorCode = error.error.code;
      }
      if (status === 429) {
        errorMessage = "Rate limit exceeded";
        errorCode = "rate_limit_exceeded";
      } else if (status === 403 && error.error && error.error.code === 'unsupported_country_region_territory') {
        errorMessage = "Unsupported region";
        errorCode = "unsupported_country_region_territory";
        errorType = "request_forbidden";
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ 
      error: errorMessage, 
      status,
      code: errorCode,
      type: errorType
    }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export { GenericAPIErrorHandler, OpenAIErrorHandler };