from abc import ABC, abstractmethod

class DatabaseService(ABC):
    """
    Abstract interface for database operations.
    This defines the contract that any database service (e.g. Supabase, PostgreSQL) must implement.
    """

    @abstractmethod
    def get_user_by_email(self, email: str):
        """
        Retrieve user details using their email address.
        """
        pass

    @abstractmethod
    def deduct_user_credit(self, user_id: str, amount: int):
        """
        Deduct a specific amount of credits from the user's account.
        """
        pass

    @abstractmethod
    def save_chat_history(self, user_id: str, message: dict):
        """
        Save a chat message to the user's chat history.
        """
        pass
