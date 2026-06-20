import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    return conn

def create_tables():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id          SERIAL PRIMARY KEY,
            invoice_no  VARCHAR(50),
            vendor_name TEXT,
            amount      NUMERIC(12,2),
            date        TEXT,
            gst_number  VARCHAR(30),
            status      TEXT DEFAULT 'pending',
            raw_text    TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id           SERIAL PRIMARY KEY,
            invoice_id   INTEGER REFERENCES invoices(id),
            file_name    TEXT,
            doc_type     TEXT DEFAULT 'invoice',
            extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS anomaly_flags (
            id          SERIAL PRIMARY KEY,
            invoice_id  INTEGER REFERENCES invoices(id),
            flag_type   TEXT,
            reason      TEXT,
            flagged_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()
    print("Tables created successfully")

def save_invoice(data: dict, raw_text: str, file_name: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO invoices (invoice_no, vendor_name, amount, date, gst_number, status, raw_text)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        data.get("invoice_number"),
        data.get("vendor_name"),
        data.get("amount"),
        data.get("date"),
        data.get("gst_number"),
        "pending",
        raw_text
    ))

    invoice_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO documents (invoice_id, file_name)
        VALUES (%s, %s)
    """, (invoice_id, file_name))

    conn.commit()
    cursor.close()
    conn.close()
    return invoice_id

def get_all_invoices():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT i.id, i.invoice_no, i.vendor_name, i.amount,
               i.date, i.gst_number, i.status, i.created_at,
               COUNT(f.id) as flag_count
        FROM invoices i
        LEFT JOIN anomaly_flags f ON i.id = f.invoice_id
        GROUP BY i.id
        ORDER BY i.created_at DESC
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    invoices = []
    for row in rows:
        invoices.append({
            "id": row[0],
            "invoice_no": row[1],
            "vendor_name": row[2],
            "amount": float(row[3]) if row[3] else None,
            "date": row[4],
            "gst_number": row[5],
            "status": row[6],
            "created_at": str(row[7]),
            "flag_count": row[8]
        })

    return invoices

def get_anomaly_flags(invoice_id: int = None):
    conn = get_connection()
    cursor = conn.cursor()

    if invoice_id:
        cursor.execute("""
            SELECT id, invoice_id, flag_type, reason, flagged_at
            FROM anomaly_flags
            WHERE invoice_id = %s
        """, (invoice_id,))
    else:
        cursor.execute("""
            SELECT id, invoice_id, flag_type, reason, flagged_at
            FROM anomaly_flags
        """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    flags = []
    for row in rows:
        flags.append({
            "id": row[0],
            "invoice_id": row[1],
            "flag_type": row[2],
            "reason": row[3],
            "flagged_at": str(row[4])
        })

    return flags