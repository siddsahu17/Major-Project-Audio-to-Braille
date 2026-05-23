from .base import LLMProvider
import requests
import json

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "mistral"):
        self.base_url = base_url
        self.model = model

    def generate(self, prompt: str, system_message: str = "You are a helpful assistant.", **kwargs) -> str:
        url = f"{self.base_url}/api/generate"
        
        # Ollama API supports 'system', 'prompt', 'model', 'stream', and 'options' (for temp, etc)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_message,
            "stream": False
        }
        
        options = {}
        if "temperature" in kwargs:
            options["temperature"] = kwargs["temperature"]
            
        if options:
            payload["options"] = options
            
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()
        except requests.exceptions.RequestException as e:
            print(f"[OllamaProvider] Connection Error: {e}. Is Ollama running?")
            raise e
        except Exception as e:
            print(f"[OllamaProvider] Error: {e}")
            raise e
