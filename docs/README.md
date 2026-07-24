# Control Tower API Documentation

This folder contains project-level API documentation and an importable request collection.

## Contents

- `controltower-api.postman_collection.json`: Postman Collection v2.1 JSON that can be imported into Bruno.
- `README.md`: this documentation page.

## Runtime Defaults

- Default local base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`
- Health endpoint: `GET /control/health`

## Authentication

The API uses two authentication mechanisms:

- `x-api-key` header (`GLOBAL_API_KEY` in environment variables)
- `Authorization: Bearer <jwt>` header

### Guard behavior

Home Management routes use a composite guard:

1. If `x-api-key` is present, it must match `GLOBAL_API_KEY`.
2. If `x-api-key` is absent, JWT validation is attempted.
3. If neither succeeds, the request is rejected.

Practical implication: do not send an incorrect `x-api-key` together with a valid JWT, because the key check runs first and fails fast.

## Route Prefixes

### System

- `GET /`
- `GET /control/health`

### Auth

- Prefix: `/auth`
- Routes include: `status`, `login`, `signup`, `me`, and biometric registration/authentication endpoints.

### Home Management

All routes below are prefixed with `/home-management`:

- `/products`
- `/stock-products`
- `/shopping-list-products`
- `/shops`
- `/tasks`
- `/tags`
- `/recipes`
- `/settings`
- `/expenses`
- `/shifts`

## Collection Summary

The generated collection currently includes 107 requests grouped by module:

- Auth: 7
- Control: 1
- Expenses: 9
- Products: 9
- Recipes: 14
- Settings: 6
- Shifts: 10
- Shopping List: 9
- Shops: 7
- Stock: 9
- System: 1
- Tags: 9
- Tasks: 16

## Import in Bruno

1. Open Bruno.
2. Click `Import Collection`.
3. Choose `Postman Collection`.
4. Select `docs/controltower-api.postman_collection.json`.
5. Configure collection variables:
   - `baseUrl` (for example `http://localhost:3000`)
   - `apiKey` (your `GLOBAL_API_KEY`)
   - `jwtToken` (JWT from `/auth/login`)

## Suggested Request Order

1. `POST /auth/status`
2. `POST /auth/login`
3. Set `jwtToken` from login response
4. Call Home Management endpoints with either:
   - valid `x-api-key`, or
   - valid `Authorization: Bearer <jwt>`

## Maintenance Notes

The collection reflects current route decorators and router module paths.

If you add, remove, or rename endpoints, update `docs/controltower-api.postman_collection.json` so Bruno imports stay aligned with the API.
