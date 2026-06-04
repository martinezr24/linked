package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Client struct {
	bucket    string
	s3        *s3.Client
	presigner *s3.PresignClient
	localDir  string
}

func NewFromEnv() (*Client, error) {
	bucket := os.Getenv("S3_BUCKET")
	if bucket != "" {
		cfg, err := awsconfig.LoadDefaultConfig(context.Background())
		if err != nil {
			return nil, err
		}
		client := s3.NewFromConfig(cfg, func(o *s3.Options) {
			if endpoint := os.Getenv("S3_ENDPOINT"); endpoint != "" {
				o.BaseEndpoint = aws.String(endpoint)
				o.UsePathStyle = true
			}
		})
		return &Client{
			bucket:    bucket,
			s3:        client,
			presigner: s3.NewPresignClient(client),
		}, nil
	}
	dir := os.Getenv("UPLOAD_DIR")
	if dir == "" {
		dir = "./data/uploads"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Client{localDir: dir}, nil
}

func (c *Client) UsesS3() bool {
	return c.bucket != ""
}

func (c *Client) ObjectKey(relationshipID, userID, photoDate, ext string) string {
	ext = strings.TrimPrefix(ext, ".")
	if ext == "" {
		ext = "jpg"
	}
	return fmt.Sprintf("photos/%s/%s/%s.%s", relationshipID, userID, photoDate, ext)
}

func (c *Client) PresignPut(ctx context.Context, objectKey, contentType string, ttl time.Duration) (string, error) {
	if c.UsesS3() {
		out, err := c.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(c.bucket),
			Key:         aws.String(objectKey),
			ContentType: aws.String(contentType),
		}, s3.WithPresignExpires(ttl))
		if err != nil {
			return "", err
		}
		return out.URL, nil
	}
	return fmt.Sprintf("/api/photos/upload-local?key=%s", objectKey), nil
}

func (c *Client) SignGet(ctx context.Context, objectKey string, ttl time.Duration) (string, error) {
	if c.UsesS3() {
		out, err := c.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(c.bucket),
			Key:    aws.String(objectKey),
		}, s3.WithPresignExpires(ttl))
		if err != nil {
			return "", err
		}
		return out.URL, nil
	}
	_ = ttl
	return fmt.Sprintf("/api/photos/file?key=%s", objectKey), nil
}

func (c *Client) LocalPath(objectKey string) string {
	return filepath.Join(c.localDir, filepath.FromSlash(objectKey))
}

func (c *Client) SaveLocal(objectKey string, data []byte) error {
	path := c.LocalPath(objectKey)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func (c *Client) ReadLocal(objectKey string) ([]byte, error) {
	return os.ReadFile(c.LocalPath(objectKey))
}
