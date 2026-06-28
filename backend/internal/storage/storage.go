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
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
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

// DeleteByPrefix removes every stored object whose key starts with prefix.
// For S3/R2 it lists and batch-deletes matching objects; for local storage it
// removes the corresponding directory tree. Missing objects are not an error.
func (c *Client) DeleteByPrefix(ctx context.Context, prefix string) error {
	if c.UsesS3() {
		paginator := s3.NewListObjectsV2Paginator(c.s3, &s3.ListObjectsV2Input{
			Bucket: aws.String(c.bucket),
			Prefix: aws.String(prefix),
		})
		for paginator.HasMorePages() {
			page, err := paginator.NextPage(ctx)
			if err != nil {
				return err
			}
			if len(page.Contents) == 0 {
				continue
			}
			ids := make([]s3types.ObjectIdentifier, 0, len(page.Contents))
			for _, obj := range page.Contents {
				ids = append(ids, s3types.ObjectIdentifier{Key: obj.Key})
			}
			if _, err := c.s3.DeleteObjects(ctx, &s3.DeleteObjectsInput{
				Bucket: aws.String(c.bucket),
				Delete: &s3types.Delete{Objects: ids, Quiet: aws.Bool(true)},
			}); err != nil {
				return err
			}
		}
		return nil
	}
	dir := filepath.Join(c.localDir, filepath.FromSlash(prefix))
	if err := os.RemoveAll(dir); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
