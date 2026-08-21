package llm_api_tester

import (
	"context"
	"sync"
)

type modelScheduler struct {
	mu     sync.Mutex
	limits map[int64]*modelSemaphore
}

type modelSemaphore struct {
	mu    sync.Mutex
	limit int
	used  int
	wait  []chan struct{}
}

func newModelScheduler() *modelScheduler {
	return &modelScheduler{limits: make(map[int64]*modelSemaphore)}
}

func (s *modelScheduler) Acquire(ctx context.Context, modelID int64, configured *int) (func(), bool) {
	limit := defaultConcurrency
	if configured != nil {
		limit = *configured
	}
	s.mu.Lock()
	semaphore := s.limits[modelID]
	if semaphore == nil {
		semaphore = &modelSemaphore{limit: limit}
		s.limits[modelID] = semaphore
	} else {
		semaphore.mu.Lock()
		semaphore.limit = limit
		semaphore.mu.Unlock()
	}
	s.mu.Unlock()
	if !semaphore.acquire(ctx) {
		return func() {}, false
	}
	return semaphore.release, true
}

func (s *modelSemaphore) acquire(ctx context.Context) bool {
	s.mu.Lock()
	if s.used < s.limit {
		s.used++
		s.mu.Unlock()
		return true
	}
	wake := make(chan struct{})
	s.wait = append(s.wait, wake)
	s.mu.Unlock()
	select {
	case <-wake:
		return s.acquire(ctx)
	case <-ctx.Done():
		s.mu.Lock()
		for i, candidate := range s.wait {
			if candidate == wake {
				s.wait = append(s.wait[:i], s.wait[i+1:]...)
				break
			}
		}
		s.mu.Unlock()
		return false
	}
}

func (s *modelSemaphore) release() {
	s.mu.Lock()
	if s.used > 0 {
		s.used--
	}
	if len(s.wait) > 0 {
		wake := s.wait[0]
		s.wait = s.wait[1:]
		close(wake)
	}
	s.mu.Unlock()
}
