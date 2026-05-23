FROM python:3.11-slim

WORKDIR /app

# System dependencies — ffmpeg for audio, gcc for native wheels
RUN apt-get update && apt-get install -y \
    gcc g++ libffi-dev libssl-dev ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first (Docker layer cache optimization)
COPY pyproject.toml uv.lock ./

# Install all dependencies from pyproject.toml using the lockfile
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Hugging Face Spaces requires port 7860
EXPOSE 7860

# Use uv to run uvicorn so it uses the managed venv
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
