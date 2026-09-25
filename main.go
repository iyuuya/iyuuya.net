package main

import (
	"log"
	"net/http"
	"os"

	"github.com/iyuuya/iyuuya.net/internal/http/handler"
	"github.com/iyuuya/iyuuya.net/internal/http/middleware"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/error", func(w http.ResponseWriter, r *http.Request) {
		panic("This is a test panic")
	})
	mux.Handle("/", handler.Static("public"))
	h := middleware.Use(mux, middleware.Recoverer, middleware.Logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(http.ListenAndServe(":"+port, h))
}
