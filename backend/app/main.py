import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import routes

# Load local .env manually on startup (dependency-free)
try:
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()
except Exception as e:
    print(f"Error loading manual .env: {e}")


app = FastAPI(
    title="Repo Health Intelligence",
    description="A platform that analyzes how a Git repository evolves over time.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Repo Health Intelligence API"}
