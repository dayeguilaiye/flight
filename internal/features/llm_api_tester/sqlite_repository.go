package llm_api_tester

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ziyuanhe/flight/internal/platform/database"
)

type sqliteRepository struct{ db *database.DB }

// NewSQLiteRepository creates a repository backed by the shared application DB.
func NewSQLiteRepository(db *database.DB) Repository {
	return &sqliteRepository{db: db}
}

func (r *sqliteRepository) ListProviders(ctx context.Context) ([]storedProvider, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, description, base_url, token_ciphertext, token_nonce, created_at, updated_at FROM providers ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("list providers: %w", err)
	}
	defer rows.Close()

	var providers []storedProvider
	for rows.Next() {
		provider, err := scanProvider(rows)
		if err != nil {
			return nil, fmt.Errorf("scan provider: %w", err)
		}
		providers = append(providers, provider)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate providers: %w", err)
	}
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("close providers: %w", err)
	}
	for i := range providers {
		providers[i].Models, err = r.modelsForProvider(ctx, providers[i].ID)
		if err != nil {
			return nil, err
		}
	}
	return providers, nil
}

func (r *sqliteRepository) CreateProvider(ctx context.Context, provider storedProvider) (storedProvider, error) {
	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `INSERT INTO providers (name, description, base_url, token_ciphertext, token_nonce, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, provider.Name, provider.Description, provider.BaseURL, provider.TokenCiphertext, provider.TokenNonce, now.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano))
	if err != nil {
		return storedProvider{}, fmt.Errorf("create provider: %w", err)
	}
	provider.ID, err = result.LastInsertId()
	if err != nil {
		return storedProvider{}, fmt.Errorf("read provider id: %w", err)
	}
	provider.CreatedAt, provider.UpdatedAt = now, now
	provider.Models = []Model{}
	return provider, nil
}

func (r *sqliteRepository) UpdateProvider(ctx context.Context, provider storedProvider) (storedProvider, error) {
	now := time.Now().UTC()
	var result sql.Result
	var err error
	if len(provider.TokenCiphertext) > 0 && len(provider.TokenNonce) > 0 {
		result, err = r.db.ExecContext(ctx, `UPDATE providers SET name = ?, description = ?, base_url = ?, token_ciphertext = ?, token_nonce = ?, updated_at = ? WHERE id = ?`, provider.Name, provider.Description, provider.BaseURL, provider.TokenCiphertext, provider.TokenNonce, now.Format(time.RFC3339Nano), provider.ID)
	} else {
		result, err = r.db.ExecContext(ctx, `UPDATE providers SET name = ?, description = ?, base_url = ?, updated_at = ? WHERE id = ?`, provider.Name, provider.Description, provider.BaseURL, now.Format(time.RFC3339Nano), provider.ID)
	}
	if err != nil {
		return storedProvider{}, fmt.Errorf("update provider: %w", err)
	}
	if affected, err := result.RowsAffected(); err != nil || affected == 0 {
		if err != nil {
			return storedProvider{}, fmt.Errorf("inspect provider update: %w", err)
		}
		return storedProvider{}, sql.ErrNoRows
	}
	provider.UpdatedAt = now
	return provider, nil
}

func (r *sqliteRepository) DeleteProvider(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM providers WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete provider: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("inspect provider delete: %w", err)
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *sqliteRepository) CreateModel(ctx context.Context, model storedModel) (storedModel, error) {
	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `INSERT INTO models (provider_id, name, interface_type, max_concurrency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, model.ProviderID, model.Name, model.InterfaceType, model.MaxConcurrency, now.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano))
	if err != nil {
		return storedModel{}, fmt.Errorf("create model: %w", err)
	}
	model.ID, err = result.LastInsertId()
	if err != nil {
		return storedModel{}, fmt.Errorf("read model id: %w", err)
	}
	model.CreatedAt, model.UpdatedAt = now, now
	model.Results = make(map[CapabilityType]CapabilityResult)
	return model, nil
}

func (r *sqliteRepository) UpdateModel(ctx context.Context, model storedModel) (storedModel, error) {
	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `UPDATE models SET name = ?, interface_type = ?, max_concurrency = ?, updated_at = ? WHERE id = ?`, model.Name, model.InterfaceType, model.MaxConcurrency, now.Format(time.RFC3339Nano), model.ID)
	if err != nil {
		return storedModel{}, fmt.Errorf("update model: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return storedModel{}, fmt.Errorf("inspect model update: %w", err)
	}
	if affected == 0 {
		return storedModel{}, sql.ErrNoRows
	}
	model.UpdatedAt = now
	return model, nil
}

func (r *sqliteRepository) DeleteModel(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM models WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete model: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("inspect model delete: %w", err)
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *sqliteRepository) GetModel(ctx context.Context, id int64) (storedModel, error) {
	var model storedModel
	var interfaceType, createdAt, updatedAt string
	if err := r.db.QueryRowContext(ctx, `
		SELECT m.id, m.provider_id, m.name, m.interface_type, m.max_concurrency, m.created_at, m.updated_at,
		       p.base_url, p.token_ciphertext, p.token_nonce
		FROM models m JOIN providers p ON p.id = m.provider_id
		WHERE m.id = ?
	`, id).Scan(&model.ID, &model.ProviderID, &model.Name, &interfaceType, &model.MaxConcurrency, &createdAt, &updatedAt, &model.ProviderBaseURL, &model.ProviderTokenCiphertext, &model.ProviderTokenNonce); err != nil {
		if err == sql.ErrNoRows {
			return storedModel{}, err
		}
		return storedModel{}, fmt.Errorf("get model: %w", err)
	}
	model.InterfaceType = InterfaceType(interfaceType)
	var err error
	model.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return storedModel{}, err
	}
	model.UpdatedAt, err = parseTime(updatedAt)
	if err != nil {
		return storedModel{}, err
	}
	model.Results, err = r.resultsForModel(ctx, id)
	if err != nil {
		return storedModel{}, err
	}
	return model, nil
}

func (r *sqliteRepository) UpsertCapabilityResult(ctx context.Context, modelID int64, capability CapabilityType, result CapabilityResult) error {
	requestJSON, err := marshalNullable(result.Request)
	if err != nil {
		return fmt.Errorf("encode capability request: %w", err)
	}
	responseJSON, err := marshalNullable(result.Response)
	if err != nil {
		return fmt.Errorf("encode capability response: %w", err)
	}
	errorJSON, err := marshalNullable(result.Error)
	if err != nil {
		return fmt.Errorf("encode capability error: %w", err)
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO model_capability_results (model_id, capability_type, status, request_json, response_json, error_json, started_at, completed_at, duration_ms, ttft_ms, input_tokens, output_tokens, output_tokens_per_second, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(model_id, capability_type) DO UPDATE SET
			status = excluded.status,
			request_json = excluded.request_json,
			response_json = excluded.response_json,
			error_json = excluded.error_json,
			started_at = excluded.started_at,
			completed_at = excluded.completed_at,
			duration_ms = excluded.duration_ms,
			ttft_ms = excluded.ttft_ms,
			input_tokens = excluded.input_tokens,
			output_tokens = excluded.output_tokens,
			output_tokens_per_second = excluded.output_tokens_per_second,
			updated_at = excluded.updated_at
	`, modelID, capability, result.Status, requestJSON, responseJSON, errorJSON, nullableTime(result.StartedAt), nullableTime(result.CompletedAt), result.DurationMs, result.TTFTMs, result.InputTokens, result.OutputTokens, result.OutputTokensPerSecond, time.Now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("upsert capability result: %w", err)
	}
	return nil
}

func (r *sqliteRepository) modelsForProvider(ctx context.Context, providerID int64) ([]Model, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, provider_id, name, interface_type, max_concurrency, created_at, updated_at FROM models WHERE provider_id = ? ORDER BY id`, providerID)
	if err != nil {
		return nil, fmt.Errorf("list models: %w", err)
	}
	defer rows.Close()
	var models []Model
	for rows.Next() {
		var model Model
		var interfaceType string
		var createdAt, updatedAt string
		if err := rows.Scan(&model.ID, &model.ProviderID, &model.Name, &interfaceType, &model.MaxConcurrency, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan model: %w", err)
		}
		model.InterfaceType = InterfaceType(interfaceType)
		model.CreatedAt, err = parseTime(createdAt)
		if err != nil {
			return nil, err
		}
		model.UpdatedAt, err = parseTime(updatedAt)
		if err != nil {
			return nil, err
		}
		models = append(models, model)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("close models: %w", err)
	}
	for i := range models {
		models[i].Results, err = r.resultsForModel(ctx, models[i].ID)
		if err != nil {
			return nil, err
		}
	}
	return models, nil
}

func (r *sqliteRepository) resultsForModel(ctx context.Context, modelID int64) (map[CapabilityType]CapabilityResult, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT capability_type, status, request_json, response_json, error_json, started_at, completed_at, duration_ms, ttft_ms, input_tokens, output_tokens, output_tokens_per_second FROM model_capability_results WHERE model_id = ?`, modelID)
	if err != nil {
		return nil, fmt.Errorf("list capability results: %w", err)
	}
	defer rows.Close()
	results := make(map[CapabilityType]CapabilityResult)
	for rows.Next() {
		var capability, status string
		var requestJSON, responseJSON, errorJSON sql.NullString
		var startedAt, completedAt sql.NullString
		var durationMs, ttftMs, inputTokens, outputTokens sql.NullInt64
		var throughput sql.NullFloat64
		if err := rows.Scan(&capability, &status, &requestJSON, &responseJSON, &errorJSON, &startedAt, &completedAt, &durationMs, &ttftMs, &inputTokens, &outputTokens, &throughput); err != nil {
			return nil, fmt.Errorf("scan capability result: %w", err)
		}
		result := CapabilityResult{Status: CapabilityStatus(status)}
		result.Request = decodeNullableJSON(requestJSON)
		result.Response = decodeNullableJSON(responseJSON)
		result.Error = decodeNullableJSON(errorJSON)
		if startedAt.Valid {
			parsed, err := parseTime(startedAt.String)
			if err != nil {
				return nil, err
			}
			result.StartedAt = &parsed
		}
		if completedAt.Valid {
			parsed, err := parseTime(completedAt.String)
			if err != nil {
				return nil, err
			}
			result.CompletedAt = &parsed
		}
		result.DurationMs = nullableInt64(durationMs)
		result.TTFTMs = nullableInt64(ttftMs)
		result.InputTokens = nullableInt64(inputTokens)
		result.OutputTokens = nullableInt64(outputTokens)
		if throughput.Valid {
			result.OutputTokensPerSecond = &throughput.Float64
		}
		results[CapabilityType(capability)] = result
	}
	return results, rows.Err()
}

func scanProvider(scanner interface{ Scan(...any) error }) (storedProvider, error) {
	var provider storedProvider
	var createdAt, updatedAt string
	if err := scanner.Scan(&provider.ID, &provider.Name, &provider.Description, &provider.BaseURL, &provider.TokenCiphertext, &provider.TokenNonce, &createdAt, &updatedAt); err != nil {
		return storedProvider{}, err
	}
	var err error
	provider.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return storedProvider{}, err
	}
	provider.UpdatedAt, err = parseTime(updatedAt)
	return provider, err
}

func parseTime(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse timestamp %q: %w", value, err)
	}
	return parsed, nil
}

func marshalNullable(value any) (any, error) {
	if value == nil {
		return nil, nil
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return string(encoded), nil
}

func decodeNullableJSON(value sql.NullString) any {
	if !value.Valid || value.String == "" {
		return nil
	}
	var decoded any
	if json.Unmarshal([]byte(value.String), &decoded) != nil {
		return value.String
	}
	return decoded
}

func nullableTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func nullableInt64(value sql.NullInt64) *int64 {
	if !value.Valid {
		return nil
	}
	return &value.Int64
}
