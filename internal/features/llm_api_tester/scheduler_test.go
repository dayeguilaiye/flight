package llm_api_tester

import (
	"context"
	"testing"
	"time"
)

func TestModelSchedulerIsIndependentAndHonorsCancellation(t *testing.T) {
	scheduler := newModelScheduler()
	releaseA, ok := scheduler.Acquire(context.Background(), 1, intPointer(1))
	if !ok {
		t.Fatal("first model slot not acquired")
	}
	secondDone := make(chan bool, 1)
	go func() {
		release, acquired := scheduler.Acquire(context.Background(), 1, intPointer(1))
		secondDone <- acquired
		if acquired {
			release()
		}
	}()
	select {
	case <-secondDone:
		t.Fatal("second request bypassed model limit")
	case <-time.After(20 * time.Millisecond):
	}
	releaseB, acquired := scheduler.Acquire(context.Background(), 2, intPointer(1))
	if !acquired {
		t.Fatal("different model was blocked by model 1")
	}
	releaseB()
	releaseA()
	select {
	case acquired := <-secondDone:
		if !acquired {
			t.Fatal("waiting request was not released")
		}
	case <-time.After(time.Second):
		t.Fatal("waiting request did not finish")
	}

	release, acquired := scheduler.Acquire(context.Background(), 3, intPointer(1))
	if !acquired {
		t.Fatal("model 3 slot not acquired")
	}
	cancelCtx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, acquired := scheduler.Acquire(cancelCtx, 3, intPointer(1)); acquired {
		t.Fatal("cancelled request acquired a slot")
	}
	release()
}

func intPointer(value int) *int { return &value }
