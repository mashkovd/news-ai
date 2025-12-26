FROM python:3.10-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Generate requirements.txt from lock file and install dependencies into system python
RUN uv export --frozen --format=requirements-txt > requirements.txt && \
    uv pip install --system --no-cache -r requirements.txt

# Copy application code
COPY . .

# Build MkDocs documentation
RUN mkdocs build || true

# Create database directory
RUN mkdir -p /app/data

# Expose the port the app runs on
EXPOSE 8000

# Use single worker to avoid APScheduler issues with multiprocessing
# For production without scheduler, you can use multiple workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

