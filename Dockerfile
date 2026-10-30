# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:24-alpine AS frontend
WORKDIR /src/frontend
RUN npm install --global pnpm@12.4.1
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN mkdir -p /src/internal/web && pnpm build && test -s /src/internal/web/dist/index.html

FROM --platform=$BUILDPLATFORM golang:1.26.10-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
COPY --from=frontend /src/internal/web/dist/ internal/web/dist/
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/flight ./cmd/flight

FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata sqlite \
    && addgroup -g 10001 flight \
    && adduser -D -H -u 10001 -G flight flight \
    && mkdir -p /var/lib/flight && chown flight:flight /var/lib/flight
COPY --from=backend /out/flight /usr/local/bin/flight
ENV FLIGHT_HTTP_ADDR=:8080 FLIGHT_DATA_DIR=/var/lib/flight
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/flight"]
