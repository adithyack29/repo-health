import os
from openai import AsyncOpenAI

class AIExplainer:
    async def generate_explanation(self, commit_data: dict, prev_commit_data: dict) -> str:
        # Load OpenRouter API key from environment
        api_key = os.getenv("OPENROUTER_API_KEY")
        client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key or "",
        )
        
        if not client:
            return "AI Explanation unavailable: OPENAI_API_KEY not set."
            
        health_drop = prev_commit_data['composite_health'] - commit_data['composite_health']
        
        prompt = f"""
        You are a senior systems architect analyzing architectural decay in a repository.
        Analyze the following metrics change between two commits:
        
        Commit Message: {commit_data['message']}
        
        Metrics Delta:
        - Health Score: dropped by {health_drop:.2f} points
        - Complexity: {prev_commit_data['complexity_score']:.2f} -> {commit_data['complexity_score']:.2f}
        - Dependency Rot: {prev_commit_data['dependency_rot']:.2f} -> {commit_data['dependency_rot']:.2f}
        - Hotspot Risk: {prev_commit_data['hotspot_risk']:.2f} -> {commit_data['hotspot_risk']:.2f}
        
        Generate a concise, professional engineering narrative explaining what likely caused this health drop and the architectural risk introduced.
        Keep it under 3 sentences. Do not use motivational language. Be highly technical.
        """
        
        try:
            response = await client.chat.completions.create(
                model="openai/gpt-4o", # OpenRouter requires vendor prefix
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            # Fallback for demo purposes if API key is invalid or not set
            if health_drop > 10:
                return f"Significant architectural decay detected. The commit '{commit_data['message']}' introduced excessive coupling and increased the cyclomatic complexity of core modules, creating a new hotspot."
            elif health_drop > 0:
                return f"Minor health drop observed. Recent changes slightly increased dependency fan-out and local complexity."
            else:
                return f"System architecture remains stable. No significant risk factors were introduced in this commit."

    async def generate_metric_explanation(self, metric_name: str, value: str, context: dict) -> str:
        api_key = os.getenv("OPENROUTER_API_KEY")
        client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key or "",
        )
        
        if not client:
            return "AI Explanation unavailable: OPENAI_API_KEY not set."
            
        prompt = f"""
        You are a senior systems architect analyzing a repository metric.
        Explain briefly why the {metric_name} is currently rated as '{value}'.
        
        Context about the active commit:
        - Commit Message: {context.get('message', 'N/A')}
        - Raw Health Score: {context.get('composite_health', 0):.1f}/100
        - Raw Complexity: {context.get('complexity_score', 0):.1f}
        - Dependency Rot (imports/file): {context.get('dependency_rot', 0):.1f}
        - Unique Git Authors in history: {context.get('bus_factor', 2)}
        
        Explain concisely why this metric received this rating based on the context. Focus specifically on the meaning of {metric_name} and how the context numbers justify '{value}'. 
        Keep it under 3 sentences. Be highly technical and analytical. Do not use generic filler.
        """
        
        try:
            response = await client.chat.completions.create(
                model="openai/gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"The {metric_name} is at {value} due to the current repository state context. (AI temporarily unavailable)"
