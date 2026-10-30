package web

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestFrontendDeepLinks(t *testing.T) {
	assets := fstest.MapFS{
		"index.html":    {Data: []byte("<!doctype html><div id=\"root\"></div>")},
		"assets/app.js": {Data: []byte("console.log('flight')")},
	}
	for _, path := range []string{"/", "/music-theory", "/music-theory/lab", "/llm-api-tester"} {
		t.Run(path, func(t *testing.T) {
			response := httptest.NewRecorder()
			handler(assets).ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
			if response.Code != http.StatusOK || response.Header().Get("Location") != "" {
				t.Fatalf("deep link must serve HTML directly: status=%d location=%q", response.Code, response.Header().Get("Location"))
			}
			if response.Body.String() != string(assets["index.html"].Data) {
				t.Fatalf("unexpected HTML: %s", response.Body.String())
			}
		})
	}
	response := httptest.NewRecorder()
	handler(assets).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/assets/app.js", nil))
	if response.Code != http.StatusOK || response.Body.String() != string(assets["assets/app.js"].Data) {
		t.Fatalf("static asset was not served: %d %s", response.Code, response.Body.String())
	}
}
