from .base import LLMProvider
from openai import OpenAI
import os

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def generate(self, prompt: str, system_message: str = "You are a helpful assistant.", **kwargs) -> str:
        try:
            messages = []
            if system_message:
                messages.append({"role": "system", "content": system_message})
            messages.append({"role": "user", "content": prompt})

            # Filter kwargs to only include valid OpenAI parameters if needed, 
            # but for now we pass them through (cleaning up 'options' if passed from Ollama logic)
            # OpenAI doesn't take 'options', so we might need to handle specific params like temperature.
            
            completion_params = {
                "model": self.model,
                "messages": messages
            }
            
            if "temperature" in kwargs:
                completion_params["temperature"] = kwargs["temperature"]
            
            response = self.client.chat.completions.create(**completion_params)
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[OpenAIProvider] Error: {e}")
            raise e
