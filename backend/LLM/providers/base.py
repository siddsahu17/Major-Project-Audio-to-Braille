from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_message: str = None, **kwargs) -> str:
        """
        Generates text based on the prompt.
        :param prompt: The user prompt.
        :param system_message: (Optional) System instruction.
        :param kwargs: Additional arguments (e.g., temperature).
        :return: Generated string.
        """
        pass
