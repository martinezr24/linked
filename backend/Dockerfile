# Multi-stage build for the Orbit Go backend.
# Build context must be the repository root so the sibling `migrations/`
# directory can be copied into the image.
#
#   docker build -f backend/Dockerfile -t orbit-backend .

FROM golang:1.26-alpine AS build
WORKDIR /src

# Cache dependencies first.
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Build the static binary.
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/orbit .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 appuser
WORKDIR /app

COPY --from=build /out/orbit /app/orbit
COPY migrations /app/migrations

ENV MIGRATIONS_DIR=/app/migrations
EXPOSE 8080
USER appuser

CMD ["/app/orbit"]
