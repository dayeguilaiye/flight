package llm_api_tester

import "context"

// Repository owns this feature's tables while using the application's shared
// database handle.
type Repository interface {
	ListProviders(context.Context) ([]storedProvider, error)
	CreateProvider(context.Context, storedProvider) (storedProvider, error)
	UpdateProvider(context.Context, storedProvider) (storedProvider, error)
	DeleteProvider(context.Context, int64) error
	CreateModel(context.Context, storedModel) (storedModel, error)
	UpdateModel(context.Context, storedModel) (storedModel, error)
	DeleteModel(context.Context, int64) error
	GetModel(context.Context, int64) (storedModel, error)
	UpsertCapabilityResult(context.Context, int64, CapabilityType, CapabilityResult) error
}
