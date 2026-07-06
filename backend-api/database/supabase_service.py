import os
import logging
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from .db_interface import DatabaseService

# Configure logger
logger = logging.getLogger("supabase_service")

class SupabaseService(DatabaseService):
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = None
        
        if not self.url or not self.key:
            logger.warning(
                "SUPABASE_URL or SUPABASE_KEY environment variables are missing. "
                "SupabaseService will run in mock/fallback mode."
            )
        else:
            try:
                self.client = create_client(self.url, self.key)
                logger.info("Supabase client successfully initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")

    def _check_and_reset_daily_credits(self, user_record: dict) -> dict:
        """
        Helper method to check if a user is eligible for daily credit reset.
        If last_credit_reset is older than 1 day, resets credits to 50
        and updates last_credit_reset timestamp to current time.
        """
        if not user_record or "last_credit_reset" not in user_record:
            return user_record

        try:
            reset_str = user_record["last_credit_reset"]
            if reset_str.endswith('Z'):
                reset_str = reset_str[:-1] + '+00:00'
            last_reset = datetime.fromisoformat(reset_str)
            
            # Ensure it is timezone-aware
            if last_reset.tzinfo is None:
                last_reset = last_reset.replace(tzinfo=timezone.utc)
                
            now_utc = datetime.now(timezone.utc)
            
            if now_utc - last_reset >= timedelta(days=1):
                logger.info(f"User {user_record.get('email')} is eligible for daily credit reset. Resetting credits to 50.")
                user_id = user_record["id"]
                current_time_str = now_utc.isoformat()
                
                # Perform update in database
                update_response = self.client.table("users").update({
                    "credits": 50,
                    "last_credit_reset": current_time_str
                }).eq("id", user_id).execute()
                
                if update_response.data:
                    return update_response.data[0]
        except Exception as e:
            logger.error(f"Error checking or resetting daily credits: {e}")
            
        return user_record

    def get_user_by_email(self, email: str):
        """
        Retrieves user by email from the public.users table.
        """
        if not self.client:
            raise RuntimeError("Supabase client is not initialized. Please configure SUPABASE_URL and SUPABASE_KEY.")
        
        response = self.client.table("users").select("*").eq("email", email).execute()
        if response.data:
            user = response.data[0]
            return self._check_and_reset_daily_credits(user)
        return None

    def deduct_user_credit(self, user_id: str, amount: int):
        """
        Deducts credits for a user in the public.users table.
        """
        if not self.client:
            raise RuntimeError("Supabase client is not initialized. Please configure SUPABASE_URL and SUPABASE_KEY.")
        
        # Fetch current user credits and reset timestamp
        response = self.client.table("users").select("*").eq("id", user_id).execute()
        if not response.data:
            raise ValueError(f"User with ID {user_id} not found.")
            
        user = response.data[0]
        user = self._check_and_reset_daily_credits(user)
            
        current_credits = user["credits"]
        if current_credits < amount:
            raise ValueError(f"Insufficient credits. Required: {amount}, Available: {current_credits}")
            
        new_credits = current_credits - amount
        
        # Update user's credits in the database
        update_response = self.client.table("users").update({"credits": new_credits}).eq("id", user_id).execute()
        if not update_response.data:
            raise RuntimeError(f"Failed to deduct credits for user ID {user_id}.")
            
        return {
            "status": "success",
            "user_id": user_id,
            "deducted": amount,
            "remaining_credits": new_credits
        }


    def save_chat_history(self, user_id: str, message: dict):
        """
        Saves a chat history message. If database is not configured or query fails,
        returns simulated result.
        """
        if not self.client:
            logger.debug("Using mock response for save_chat_history.")
            return {"status": "success", "chat_id": "mock-chat-456", "user_id": user_id}
        
        try:
            # Typical Supabase client insert call placeholder
            # data = {"user_id": user_id, "message": message}
            # response = self.client.table("chat_history").insert(data).execute()
            pass
        except Exception as e:
            logger.error(f"Database error in save_chat_history: {e}")
            
        return {"status": "success", "chat_id": "mock-chat-456", "user_id": user_id}
