package llm_api_tester

import "github.com/ziyuanhe/flight/internal/platform/database"

// Migrations returns this feature's schema changes for the application-level
// migration coordinator.
func Migrations() []database.Migration {
	return []database.Migration{{
		Name: "llm_api_tester.0001_initial",
		SQL: `
CREATE TABLE providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL,
    token_ciphertext BLOB NOT NULL,
    token_nonce BLOB NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    interface_type TEXT NOT NULL,
    max_concurrency INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX models_provider_id_idx ON models(provider_id);

CREATE TABLE model_capability_results (
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    capability_type TEXT NOT NULL,
    status TEXT NOT NULL,
    request_json TEXT,
    response_json TEXT,
    error_json TEXT,
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    ttft_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    output_tokens_per_second REAL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (model_id, capability_type)
);
CREATE INDEX model_capability_results_model_id_idx ON model_capability_results(model_id);
`,
	}}
}
