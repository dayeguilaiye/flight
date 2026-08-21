package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
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
	files := http.FileServer(http.FS(staticFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if _, err := fs.Stat(staticFS, path); err == nil {
			files.ServeHTTP(w, r)
			return
		}
		if _, err := fs.Stat(staticFS, "index.html"); err == nil {
			r2 := r.Clone(r.Context())
			r2.URL.Path = "/index.html"
			files.ServeHTTP(w, r2)
			return
		}
		http.Error(w, "frontend not built", http.StatusNotFound)
	})
}
