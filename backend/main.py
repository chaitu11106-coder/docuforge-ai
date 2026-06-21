from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
from database import create_tables, save_invoice, get_all_invoices, get_anomaly_flags
from extractor import extract_text_from_pdf, extract_invoice_fields
from anomaly import run_anomaly_detection

try:
    from search import build_index, search_invoices
    SEARCH_ENABLED = True
except ImportError:
    SEARCH_ENABLED = False
    def build_index(): pass
    def search_invoices(query, top_k=5): return []

app = FastAPI(title="DocuForge AI", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

UPLOAD_DIR = "uploads"

@app.on_event("startup")
def startup():
    create_tables()
    print("DocuForge AI is running")

@app.get("/")
def root():
    return {"message": "DocuForge AI is running"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"File saved: {file_path}")

    raw_text = extract_text_from_pdf(file_path)
    print(f"Extracted {len(raw_text)} characters")

    if not raw_text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    extracted_data = extract_invoice_fields(raw_text)
    print(f"Extracted data: {extracted_data}")

    if not extracted_data:
        raise HTTPException(status_code=500, detail="Claude extraction failed")

    invoice_id = save_invoice(extracted_data, raw_text, file.filename)

    # run anomaly detection after every new invoice
    anomaly_result = run_anomaly_detection()

    # rebuild the search index to include this new invoice (no-op if search disabled)
    build_index()

    return {
        "message": "Invoice processed successfully",
        "invoice_id": invoice_id,
        "extracted": extracted_data,
        "anomalies_detected": anomaly_result["flags_detected"]
    }

@app.get("/invoices")
def list_invoices():
    invoices = get_all_invoices()
    return {"invoices": invoices, "count": len(invoices)}

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int):
    invoices = get_all_invoices()
    for inv in invoices:
        if inv["id"] == invoice_id:
            return inv
    raise HTTPException(status_code=404, detail="Invoice not found")

@app.get("/anomalies")
def list_anomalies():
    flags = get_anomaly_flags()
    return {"flags": flags, "count": len(flags)}

@app.post("/anomalies/run")
def trigger_anomaly_detection():
    """Manually re-run anomaly detection on all invoices."""
    result = run_anomaly_detection()
    return result

class SearchQuery(BaseModel):
    query: str

@app.post("/search")
def search(payload: SearchQuery):
    if not SEARCH_ENABLED:
        return {"query": payload.query, "results": [], "message": "Semantic search is disabled in this deployment"}

    results = search_invoices(payload.query)

    all_invoices = get_all_invoices()
    invoice_map = {inv["id"]: inv for inv in all_invoices}

    enriched = []
    for r in results:
        invoice = invoice_map.get(r["invoice_id"])
        if invoice:
            enriched.append({**invoice, "similarity_distance": r["distance"]})

    return {"query": payload.query, "results": enriched}