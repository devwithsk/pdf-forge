from database.db_interface import DatabaseService
from database.supabase_service import SupabaseService

# Thread-safe or simple lazy-loaded singleton instance of the database service
_db_service_instance = None

def get_db_service() -> DatabaseService:
    """
    Dependency injection provider for the DatabaseService.
    Returns a singleton instance of SupabaseService.
    """
    global _db_service_instance
    if _db_service_instance is None:
        _db_service_instance = SupabaseService()
    return _db_service_instance
