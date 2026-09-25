package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStaticServesFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "hello.txt"), []byte("ok"), 0o644); err != nil {
		t.Fatal(err)
	}

	rec := httptest.NewRecorder()
	Static(dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/hello.txt", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	body, _ := io.ReadAll(rec.Body)
	if string(body) != "ok" {
		t.Fatalf("body = %q", body)
	}
}

func TestStaticServesIndex(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>home</h1>"), 0o644); err != nil {
		t.Fatal(err)
	}

	rec := httptest.NewRecorder()
	Static(dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if !strings.Contains(rec.Body.String(), "<h1>home</h1>") {
		t.Fatalf("body = %q", rec.Body.String())
	}
}

func TestStaticMissingUsesNotFound(t *testing.T) {
	rec := httptest.NewRecorder()
	Static(t.TempDir()).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/missing.txt", nil))

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	if !strings.Contains(rec.Body.String(), "Not Found") {
		t.Fatalf("body = %q", rec.Body.String())
	}
}

func TestStaticRejectsDirectory(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, "css"), 0o755); err != nil {
		t.Fatal(err)
	}

	rec := httptest.NewRecorder()
	Static(dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/css", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET /css status = %d, want %d", rec.Code, http.StatusNotFound)
	}

	rec = httptest.NewRecorder()
	Static(dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/css/", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET /css/ status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestMuxStaticWithNotFoundCatchAll(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "app.js"), []byte("1"), 0o644); err != nil {
		t.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.Handle("/", Static(dir))

	root := httptest.NewRecorder()
	mux.ServeHTTP(root, httptest.NewRequest(http.MethodGet, "/", nil))
	if root.Code != http.StatusNotFound {
		t.Fatalf("GET / without index.html status = %d, want %d", root.Code, http.StatusNotFound)
	}

	file := httptest.NewRecorder()
	mux.ServeHTTP(file, httptest.NewRequest(http.MethodGet, "/app.js", nil))
	if file.Code != http.StatusOK {
		t.Fatalf("GET /app.js status = %d, want %d", file.Code, http.StatusOK)
	}

	missing := httptest.NewRecorder()
	mux.ServeHTTP(missing, httptest.NewRequest(http.MethodGet, "/missing", nil))
	if missing.Code != http.StatusNotFound {
		t.Fatalf("GET /missing status = %d, want %d", missing.Code, http.StatusNotFound)
	}
}
