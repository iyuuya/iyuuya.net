package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/iyuuya/iyuuya.net/internal/http/handler"
	"github.com/iyuuya/iyuuya.net/internal/http/middleware"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/{$}", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, World!")
	})
	mux.HandleFunc("/error", func(w http.ResponseWriter, r *http.Request) {
		panic("This is a test panic")
	})
	mux.HandleFunc("/", handler.NotFound)
	h := middleware.Use(mux, middleware.Recoverer, middleware.Logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(http.ListenAndServe(":"+port, h))
}
