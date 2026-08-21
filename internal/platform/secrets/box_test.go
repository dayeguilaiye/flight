package secrets

import "testing"

func TestBoxRoundTrip(t *testing.T) {
	box, err := NewBox("master-key-that-is-long-enough")
	if err != nil {
		t.Fatal(err)
	}
	nonce, ciphertext, err := box.Encrypt("secret-token")
	if err != nil {
		t.Fatal(err)
	}
	got, err := box.Decrypt(nonce, ciphertext)
	if err != nil {
		t.Fatal(err)
	}
	if got != "secret-token" {
		t.Fatalf("got %q", got)
	}
	if _, err := box.Decrypt(nonce, append([]byte{}, ciphertext[:len(ciphertext)-1]...)); err == nil {
		t.Fatal("tampered ciphertext accepted")
	}
}
