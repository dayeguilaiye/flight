package web

import (
	"bytes"
	"embed"
	"io/fs"
	"net/http"
	"strings"
	"time"
)

// Dist contains the frontend build output. The directory is populated by the
// frontend build before a production Go binary is compiled.
//
//go:embed dist/*
var Dist embed.FS

// Handler serves static assets and falls back to index.html for client routes.
func Handler() http.Handler {
	staticFS, err := fs.Sub(Dist, "dist")
	if err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "frontend unavailable", http.StatusInternalServerError)
		})
	}
	return handler(staticFS)
}

func handler(staticFS fs.FS) http.Handler {
	files := http.FileServer(http.FS(staticFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if _, err := fs.Stat(staticFS, path); err == nil {
			if path == "index.html" {
				w.Header().Set("Cache-Control", "no-cache")
			}
			files.ServeHTTP(w, r)
			return
		}
		if index, err := fs.ReadFile(staticFS, "index.html"); err == nil {
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(index))
			return
		}
		http.Error(w, "frontend not built", http.StatusNotFound)
	})
}
