from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True)
    total_commits = Column(Integer, default=0)
    
    commits = relationship("Commit", back_populates="repository")

class Commit(Base):
    __tablename__ = "commits"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"))
    sha = Column(String, index=True)
    author = Column(String)
    timestamp = Column(String)
    message = Column(String)
    
    # Metrics
    complexity_score = Column(Float, default=0.0)
    complexity_drift = Column(Float, default=0.0)
    test_coverage = Column(Float, default=80.0)
    hotspot_risk = Column(Float, default=0.0)
    dependency_rot = Column(Float, default=0.0)
    architectural_stability = Column(Float, default=100.0)
    composite_health = Column(Float, default=100.0)
    
    # JSON Data for graph and hotspots
    graph_data = Column(JSON, nullable=True)
    hotspots = Column(JSON, nullable=True)
    
    # AI Explanation
    ai_explanation = Column(String, nullable=True)
    
    repository = relationship("Repository", back_populates="commits")
