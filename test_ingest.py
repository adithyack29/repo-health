import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.api.routes import process_repository
from backend.app.storage.database import Base

engine = create_engine("sqlite:///backend/repohealth.db")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Starting manual ingest...")
try:
    process_repository("https://github.com/expressjs/express", db)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
