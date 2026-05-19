from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from ..storage.database import get_db, engine
from ..storage import models
from ..analysis.git_walker import GitWalker
from ..analysis.parser import CodeParser
from ..metrics.calculator import MetricsCalculator
from ..graph.builder import GraphBuilder
from ..ai.explainer import AIExplainer

models.Base.metadata.create_all(bind=engine)

router = APIRouter()

class IngestRequest(BaseModel):
    repo_url: str

def process_repository(repo_url: str, db: Session):
    # 1. Create Repo entry
    db_repo = models.Repository(url=repo_url)
    db.add(db_repo)
    db.commit()
    db.refresh(db_repo)

    walker = GitWalker(repo_url)
    parser = CodeParser()
    metrics_calc = MetricsCalculator()
    graph_builder = GraphBuilder()
    ai_explainer = AIExplainer()
    
    try:
        repo_dir = walker.clone()
        
        # Save total commits count
        db_repo.total_commits = walker.get_total_commits()
        db.commit()
        
        commits = walker.get_commits()
        
        prev_commit = None
        for c_data in commits:
            walker.checkout_commit(c_data['sha'])
            
            # Parse code
            parsed_data = parser.walk_directory(repo_dir)
            
            # Calculate metrics
            metrics = metrics_calc.calculate_for_directory(repo_dir, parsed_data)
            
            # Build graph
            graph_json = graph_builder.build_from_parsed_data(parsed_data)
            
            # Calculate complexity drift
            drift = 0.0
            if prev_commit:
                drift = metrics['complexity_score'] - prev_commit.complexity_score
            
            # Store commit
            db_commit = models.Commit(
                repo_id=db_repo.id,
                sha=c_data['sha'],
                author=c_data['author'],
                timestamp=c_data['timestamp'],
                message=c_data['message'],
                complexity_score=metrics['complexity_score'],
                complexity_drift=drift,
                test_coverage=metrics['test_coverage'],
                hotspot_risk=metrics['hotspot_risk'],
                dependency_rot=metrics['dependency_rot'],
                architectural_stability=metrics['architectural_stability'],
                composite_health=metrics['composite_health'],
                graph_data=graph_json
            )
            
            db.add(db_commit)
            db.commit()
            db.refresh(db_commit)
            prev_commit = db_commit
            
    finally:
        walker.cleanup()


@router.post("/ingest")
async def ingest_repository(request: IngestRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if already ingested
    existing = db.query(models.Repository).filter(models.Repository.url == request.repo_url).first()
    if existing:
        return {"status": "success", "repo_id": existing.id, "message": "Already ingested"}
        
    # Queue background processing (for hackathon demo, we might want this sync, but let's do async)
    background_tasks.add_task(process_repository, request.repo_url, db)
    return {"status": "processing", "message": f"Ingestion started for {request.repo_url}. Check timeline in a few moments."}

@router.get("/repositories")
async def get_repositories(db: Session = Depends(get_db)):
    repos = db.query(models.Repository).all()
    return {"status": "success", "repositories": [{"id": r.id, "url": r.url} for r in repos]}

@router.get("/timeline/{repo_id}")
async def get_timeline(repo_id: int, db: Session = Depends(get_db)):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    commits = db.query(models.Commit).filter(models.Commit.repo_id == repo_id).order_by(models.Commit.id.asc()).all()
    timeline = []
    import re
    for c in commits:
        is_pr_commit = bool(re.search(r'#\d+', c.message)) or c.message.strip().startswith('Merge')
        timeline.append({
            "id": c.id,
            "sha": c.sha,
            "author": c.author,
            "timestamp": c.timestamp,
            "message": c.message,
            "composite_health": c.composite_health,
            "complexity_score": c.complexity_score,
            "complexity_drift": c.complexity_drift,
            "test_coverage": c.test_coverage,
            "hotspot_risk": c.hotspot_risk,
            "dependency_rot": c.dependency_rot,
            "architectural_stability": c.architectural_stability,
            "is_pr": is_pr_commit,
            "ai_explanation": c.ai_explanation
        })
    return {
        "status": "success", 
        "repo_url": repo.url,
        "total_commits_in_repo": repo.total_commits,
        "timeline": timeline
    }

@router.get("/graph/{commit_sha}")
async def get_graph(commit_sha: str, db: Session = Depends(get_db)):
    commit = db.query(models.Commit).filter(models.Commit.sha == commit_sha).first()
    if not commit:
        raise HTTPException(status_code=404, detail="Commit not found")
    return {"status": "success", "graph": commit.graph_data}

@router.get("/diff/{commit_sha_1}/{commit_sha_2}")
async def get_graph_diff(commit_sha_1: str, commit_sha_2: str, db: Session = Depends(get_db)):
    # For a real diff, we'd compare the graph elements.
    # Here we just return both for the frontend to compute diffs if needed, 
    # or we can compute added/removed nodes here.
    c1 = db.query(models.Commit).filter(models.Commit.sha == commit_sha_1).first()
    c2 = db.query(models.Commit).filter(models.Commit.sha == commit_sha_2).first()
    
    if not c1 or not c2:
        raise HTTPException(status_code=404, detail="Commit not found")
        
    return {
        "status": "success",
        "base_graph": c1.graph_data,
        "target_graph": c2.graph_data
    }

@router.post("/ai-explanation/{repo_id}/{commit_sha}")
async def generate_explanation(repo_id: int, commit_sha: str, db: Session = Depends(get_db)):
    # Find commit and previous commit
    commits = db.query(models.Commit).filter(models.Commit.repo_id == repo_id).order_by(models.Commit.id.asc()).all()
    
    target_idx = -1
    for i, c in enumerate(commits):
        if c.sha == commit_sha:
            target_idx = i
            break
            
    if target_idx <= 0:
        return {"status": "success", "explanation": "Initial commit, no drop to explain."}
        
    curr = commits[target_idx]
    prev = commits[target_idx - 1]
    
    # Don't use cached explanation if it was an error message
    is_error_msg = curr.ai_explanation and ("Failed to generate explanation" in curr.ai_explanation or "Error code" in curr.ai_explanation)
    
    if curr.ai_explanation and not is_error_msg:
        return {"status": "success", "explanation": curr.ai_explanation}
        
    explainer = AIExplainer()
    explanation = await explainer.generate_explanation(
        {"message": curr.message, "composite_health": curr.composite_health, "complexity_score": curr.complexity_score, "dependency_rot": curr.dependency_rot, "hotspot_risk": curr.hotspot_risk},
        {"composite_health": prev.composite_health, "complexity_score": prev.complexity_score, "dependency_rot": prev.dependency_rot, "hotspot_risk": prev.hotspot_risk}
    )
    
    curr.ai_explanation = explanation
    db.commit()
    
    return {"status": "success", "explanation": explanation}
