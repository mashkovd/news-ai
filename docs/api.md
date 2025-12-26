# API Documentation

## Overview

The AI News Generator provides a REST API for managing news and schedules.

---

## Base URL

```
https://news-ai.mbank.space/
```

---

## Endpoints

### News

#### Get All News

```http
GET /news
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `asset` | string | Filter by asset (e.g., BTCUSDT) |
| `source` | string | Filter by source (manual/scheduled) |

**Response:**

```json
[
  {
    "id": 1,
    "title": "BTCUSDT: Market Analysis",
    "description": "Bitcoin has shown...",
    "assets": "[\"BTCUSDT\"]",
    "language": "en",
    "published": false,
    "source": "manual",
    "created_at": "2025-12-26T10:00:00"
  }
]
```

---

#### Generate News

```http
POST /get-asset-value
```

**Request Body:**

```json
{
  "asset": "BTCUSDT",
  "language": "en"
}
```

**Response:**

```json
[
  {
    "result": "={\"title\": \"...\", \"description\": \"...\", \"assets\": [\"BTCUSDT\"], \"language\": \"en\"}"
  }
]
```

---

#### Update News

```http
PUT /news/{news_id}
```

**Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "published": true
}
```

---

#### Delete News

```http
DELETE /news/{news_id}
```

---

#### Publish News

```http
POST /news/{news_id}/publish
```

---

#### Delete All News

```http
DELETE /news/all
```

---

### Schedules

#### Get All Schedules

```http
GET /schedules
```

**Response:**

```json
[
  {
    "id": 1,
    "asset": "BTCUSDT",
    "language": "en",
    "days": "[\"Mon\", \"Tue\", \"Wed\"]",
    "times": "[\"08:00\", \"12:00\"]",
    "is_active": true,
    "created_at": "2025-12-26T10:00:00"
  }
]
```

---

#### Create Schedule

```http
POST /schedules
```

**Request Body:**

```json
{
  "asset": "BTCUSDT",
  "language": "en",
  "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "times": ["08:00", "12:00", "16:00"]
}
```

---

#### Toggle Schedule

```http
PUT /schedules/{schedule_id}/toggle
```

---

#### Run Schedule Now

```http
POST /schedules/{schedule_id}/run
```

Manually triggers news generation for a schedule.

---

#### Delete Schedule

```http
DELETE /schedules/{schedule_id}
```

---

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 404 | Resource not found |
| 422 | Validation error |
| 500 | Internal server error |

---

## Rate Limits

Currently, there are no rate limits applied to the API.

