from langchain_community.embeddings import HuggingFaceEmbeddings

_embedding_model = None

def get_embedding_model():
    """
    Returns a cached instance of HuggingFaceEmbeddings.
    Uses 'sentence-transformers/all-mpnet-base-v2' which produces 768-dimensional embeddings.
    """
    global _embedding_model
    if _embedding_model is None:
        model_name = "sentence-transformers/all-mpnet-base-v2"
        _embedding_model = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={'device': 'cpu'}
        )
    return _embedding_model
