package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
)

// Box encrypts short application secrets using AES-GCM. The raw master key is
// never stored; a SHA-256 derivation gives the cipher a fixed-size key.
type Box struct {
	open func([]byte) (cipher.AEAD, error)
}

// NewBox derives an authenticated-encryption key from the deployment secret.
func NewBox(masterKey string) (*Box, error) {
	key := sha256.Sum256([]byte(masterKey))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("create secret cipher: %w", err)
	}
	return &Box{open: func(_ []byte) (cipher.AEAD, error) { return cipher.NewGCM(block) }}, nil
}

// Encrypt returns a nonce and ciphertext. Both values are safe to store in
// separate database columns.
func (b *Box) Encrypt(plaintext string) (nonce, ciphertext []byte, err error) {
	aead, err := b.open(nil)
	if err != nil {
		return nil, nil, err
	}
	nonce = make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("generate encryption nonce: %w", err)
	}
	ciphertext = aead.Seal(nil, nonce, []byte(plaintext), nil)
	return nonce, ciphertext, nil
}

// Decrypt authenticates and returns a stored secret.
func (b *Box) Decrypt(nonce, ciphertext []byte) (string, error) {
	aead, err := b.open(nil)
	if err != nil {
		return "", err
	}
	plaintext, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt secret: %w", err)
	}
	return string(plaintext), nil
}
