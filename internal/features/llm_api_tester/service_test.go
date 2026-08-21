package llm_api_tester

import (
	"context"
	"testing"

	"github.com/ziyuanhe/flight/internal/platform/database"
	"github.com/ziyuanhe/flight/internal/platform/secrets"
)

type fakeAdapter struct {
	seenToken string
}

func (a *fakeAdapter) InterfaceType() InterfaceType { return InterfaceOpenAIChat }
func (a *fakeAdapter) RunCapability(_ context.Context, request CapabilityRequest, _ EventSink) CapabilityResult {
	a.seenToken = request.Token
	return CapabilityResult{Status: StatusPassed, Response: map[string]any{"capability": request.Capability}}
}

type fakeRegistry struct{ adapter TestAdapter }

func (r fakeRegistry) Adapter(interfaceType InterfaceType) (TestAdapter, bool) {
	return r.adapter, interfaceType == InterfaceOpenAIChat
}

func TestServicePersistsOnlySelectedCapabilitiesAndNeverReturnsToken(t *testing.T) {
	ctx := context.Background()
	db, err := database.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := database.ApplyMigrations(ctx, db, Migrations()); err != nil {
		t.Fatal(err)
	}
	box, err := secrets.NewBox("master-key-that-is-long-enough")
	if err != nil {
		t.Fatal(err)
	}
	repository := NewSQLiteRepository(db)
	service := NewService(repository, box)
	adapter := &fakeAdapter{}
	service.SetAdapters(fakeRegistry{adapter: adapter})
	token := "super-secret-token"
	provider, err := service.CreateProvider(ctx, ProviderInput{Name: "Provider", BaseURL: "https://example.com", Token: &token})
	if err != nil {
		t.Fatal(err)
	}
	model, err := service.CreateModel(ctx, provider.ID, ModelInput{Name: "model", InterfaceType: InterfaceOpenAIChat})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.RunPersistedCapabilities(ctx, model.ID, []CapabilityType{CapabilityToolUse}, nil); err != nil {
		t.Fatal(err)
	}
	if adapter.seenToken != token {
		t.Fatalf("adapter token = %q", adapter.seenToken)
	}
	if _, err := service.RunPersistedCapabilities(ctx, model.ID, []CapabilityType{CapabilityStream}, nil); err != nil {
		t.Fatal(err)
	}
	providers, err := service.ListProviders(ctx)
	if err != nil {
		t.Fatal(err)
	}
	result := providers[0].Models[0].Results
	if result[CapabilityToolUse].Status != StatusPassed || result[CapabilityStream].Status != StatusPassed {
		t.Fatalf("results = %#v", result)
	}
	if providers[0].TokenMasked == token || providers[0].HasToken == false {
		t.Fatal("provider token was exposed")
	}
}
