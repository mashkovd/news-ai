# Technical Implementation Details

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   FastAPI       │────▶│   n8n           │
│   (HTML/JS)     │     │   Backend       │     │   Workflow      │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │   SQLite DB     │     │   Gemini AI     │
                        │                 │     │                 │
                        └─────────────────┘     └─────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.10+) |
| Database | SQLite with SQLAlchemy |
| Scheduler | APScheduler |
| Frontend | HTML, CSS, JavaScript |
| AI Model | Google Gemini / OpenAI GPT-4o |
| Workflow | n8n |
| Deployment | Docker, Uvicorn |

---

## AI Agent Framework

The AI agent is built using **PydanticAI**, a framework designed for creating robust and structured AI applications.

### Key Features:
- Type-safe AI interactions
- Structured output parsing
- Error handling and validation

---

## Market Data Source

Stock quotes and market data are fetched through the API provided by Libertex:

```
https://app.libertex.com/spa/instruments
```

This API provides up-to-date market information necessary for trading operations like buying and selling stocks.

---

## AI Model

The assistant's core intelligence is powered by **Google Gemini** (or OpenAI's GPT-4o).

### Capabilities:
- Natural language understanding
- Decision-making and analysis
- User interaction capabilities
- Complex trading command execution

---

## Scheduler

News generation is automated using **APScheduler** with AsyncIO support.

### Features:
- Cron-based scheduling
- CET timezone support
- Multiple times per day
- Day-of-week selection
- Immediate execution option ("Now")

### Configuration:

```python
scheduler = AsyncIOScheduler(timezone=pytz.timezone('Europe/Berlin'))
```

---

## Database Schema

### NewsItem

```python
class NewsItem(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(Text)
    assets = Column(String)  # JSON array
    language = Column(String)
    published = Column(Boolean, default=False)
    source = Column(String, default="manual")
    created_at = Column(DateTime)
```

### ScheduleItem

```python
class ScheduleItem(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True)
    asset = Column(String)
    language = Column(String)
    days = Column(String)   # JSON array
    times = Column(String)  # JSON array
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime)
```

---

## Functional Workflow

1. **User Login**
   - QR code authentication
   - Google authentication
   - Secure and seamless access

2. **Command Execution**
   - Chatbot interface interprets user commands
   - GPT-4o model processes requests
   - Example: "Generate news for BTCUSDT"

3. **API Integration**
   - Trading commands trigger API calls
   - Real-time stock data fetching
   - Trade execution

4. **Portfolio Updates**
   - Real-time portfolio updates
   - Latest transactions reflected
   - Market changes displayed

---

## Deployment

### Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY . .

RUN pip install uv
RUN uv sync

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "8"]
```

### Environment Variables

```bash
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/...
```

---

## Development

### Running Locally

```bash
# Install dependencies
uv sync

# Run with hot reload
uv run uvicorn main:app --reload --port 8000

# Run MkDocs documentation
uv run mkdocs serve
```

### Building Documentation

```bash
uv run mkdocs build
```

