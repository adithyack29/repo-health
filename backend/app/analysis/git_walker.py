import os
import tempfile
import shutil
from git import Repo
from datetime import datetime

class GitWalker:
    def __init__(self, repo_url: str, max_commits: int = 50):
        self.repo_url = repo_url
        self.max_commits = max_commits
        self.temp_dir = tempfile.mkdtemp()
        self.repo = None

    def clone(self):
        url = self.repo_url
        token = os.getenv("GITHUB_TOKEN")
        if token and "github.com" in url and "@github.com" not in url:
            if url.startswith("https://"):
                url = url.replace("https://", f"https://{token}@")
            elif url.startswith("http://"):
                url = url.replace("http://", f"http://{token}@")
                
        # Hide token in print logs
        print_url = url.replace(token, "****") if token else url
        print(f"Cloning {print_url} into {self.temp_dir}...")
        self.repo = Repo.clone_from(url, self.temp_dir)
        return self.temp_dir

    def get_total_commits(self):
        if not self.repo:
            raise Exception("Repository not cloned yet.")
        return int(self.repo.git.rev_list('--count', 'HEAD'))

    def get_commits(self):
        if not self.repo:
            raise Exception("Repository not cloned yet.")
        
        commits = list(self.repo.iter_commits('HEAD'))
        commits.reverse() # Oldest to newest
        
        commit_data = []
        for commit in commits:
            commit_data.append({
                "sha": commit.hexsha,
                "author": commit.author.name,
                "timestamp": datetime.fromtimestamp(commit.committed_date).isoformat(),
                "message": commit.message.strip()
            })
        return commit_data

    def checkout_commit(self, sha: str):
        if not self.repo:
            raise Exception("Repository not cloned yet.")
        self.repo.git.checkout(sha)

    def cleanup(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
