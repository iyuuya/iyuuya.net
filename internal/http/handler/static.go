package handler

import (
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

func Static(root string) http.Handler {
	fsys := os.DirFS(root)
	files := http.FileServerFS(fsys)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !staticExists(fsys, r.URL.Path) {
			NotFound(w, r)
			return
		}
		files.ServeHTTP(w, r)
	})
}

func staticExists(fsys fs.FS, urlPath string) bool {
	name := strings.TrimPrefix(path.Clean("/"+urlPath), "/")
	if name == "" || name == "." {
		_, err := fs.Stat(fsys, "index.html")
		return err == nil
	}

	info, err := fs.Stat(fsys, name)
	if err != nil {
		return false
	}
	if info.IsDir() {
		_, err := fs.Stat(fsys, path.Join(name, "index.html"))
		return err == nil
	}
	return true
}
