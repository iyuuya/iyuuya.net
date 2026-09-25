package middleware

import (
	"net/http"
)

// Use wraps handler with middlewares. The first middleware is outermost.
func Use(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}
