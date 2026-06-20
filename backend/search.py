import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from database import get_connection
import os
import pickle

# Load the embedding model once when this file is imported
model = SentenceTransformer("all-MiniLM-L6-v2")

INDEX_PATH = "faiss_index.bin"
IDS_PATH = "faiss_ids.pkl"


def build_index():
    """
    Pull all invoices from PostgreSQL, embed their raw_text,
    and build a fresh FAISS index. Run this after every upload.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, raw_text FROM invoices WHERE raw_text IS NOT NULL")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if not rows:
        print("No invoices to index yet")
        return

    invoice_ids = [row[0] for row in rows]
    texts = [row[1] for row in rows]

    # convert text into embeddings (vectors of numbers)
    embeddings = model.encode(texts, convert_to_numpy=True)

    # build FAISS index using L2 (euclidean) distance
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype("float32"))

    # save index + the invoice_ids list (so we know which vector maps to which invoice)
    faiss.write_index(index, INDEX_PATH)
    with open(IDS_PATH, "wb") as f:
        pickle.dump(invoice_ids, f)

    print(f"FAISS index built with {len(invoice_ids)} invoices")


def search_invoices(query: str, top_k: int = 5):
    """
    Search invoices by meaning. Returns top_k most similar invoice_ids
    along with their similarity distance.
    """
    if not os.path.exists(INDEX_PATH):
        return []

    index = faiss.read_index(INDEX_PATH)
    with open(IDS_PATH, "rb") as f:
        invoice_ids = pickle.load(f)

    # embed the search query the same way invoices were embedded
    query_embedding = model.encode([query], convert_to_numpy=True).astype("float32")

    # find the top_k closest vectors
    distances, indices = index.search(query_embedding, min(top_k, len(invoice_ids)))

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        results.append({
            "invoice_id": invoice_ids[idx],
            "distance": float(dist)
        })

    return results