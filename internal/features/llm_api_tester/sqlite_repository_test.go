package llm_api_tester

import (
	"context"
	"testing"

	"github.com/ziyuanhe/flight/internal/platform/database"
)

func TestSQLiteRepositoryKeepsUnselectedCapabilityResults(t *testing.T) {
	ctx := context.Background()
	db, err := database.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := database.ApplyMigrations(ctx, db, Migrations()); err != nil {
		t.Fatal(err)
	}
	repository := NewSQLiteRepository(db)
	provider, err := repository.CreateProvider(ctx, storedProvider{
		Provider:        Provider{Name: "test", BaseURL: "https://example.com"},
		TokenCiphertext: []byte("ciphertext"),
		TokenNonce:      []byte("nonce"),
	})
	if err != nil {
		t.Fatal(err)
	}
	model, err := repository.CreateModel(ctx, storedModel{Model: Model{ProviderID: provider.ID, Name: "model", InterfaceType: InterfaceOpenAIChat}})
	if err != nil {
		t.Fatal(err)
	}
	if err := repository.UpsertCapabilityResult(ctx, model.ID, CapabilityToolUse, CapabilityResult{Status: StatusPassed, Response: map[string]any{"ok": true}}); err != nil {
		t.Fatal(err)
	}
	if err := repository.UpsertCapabilityResult(ctx, model.ID, CapabilityStream, CapabilityResult{Status: StatusFailed, Error: "timeout"}); err != nil {
		t.Fatal(err)
	}

	providers, err := repository.ListProviders(ctx)
	if err != nil {
		t.Fatal(err)
	}
	results := providers[0].Models[0].Results
	if results[CapabilityToolUse].Status != StatusPassed {
		t.Fatalf("tool use result = %#v", results[CapabilityToolUse])
	}
	if results[CapabilityStream].Status != StatusFailed {
		t.Fatalf("stream result = %#v", results[CapabilityStream])
	}
}
