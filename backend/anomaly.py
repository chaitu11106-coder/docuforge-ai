import pandas as pd
from database import get_connection

def get_invoices_dataframe():
    """Load all invoices from PostgreSQL into a Pandas DataFrame."""
    conn = get_connection()
    df = pd.read_sql_query("""
        SELECT id, invoice_no, vendor_name, amount, date, gst_number, status
        FROM invoices
        WHERE amount IS NOT NULL
    """, conn)
    conn.close()
    return df


def detect_anomalies():
    """
    Run all anomaly checks and return a list of flags.
    Each flag is a dict: {invoice_id, flag_type, reason}
    """
    df = get_invoices_dataframe()
    flags = []

    if df.empty:
        print("No invoices to analyze yet")
        return flags

    # ---- Check 1: Amount is 2x above the vendor's average ----
    vendor_avg = df.groupby("vendor_name")["amount"].mean()

    for _, row in df.iterrows():
        avg_for_vendor = vendor_avg.get(row["vendor_name"], 0)
        if avg_for_vendor > 0 and row["amount"] > (avg_for_vendor * 2):
            flags.append({
                "invoice_id": row["id"],
                "flag_type": "HIGH_AMOUNT_OUTLIER",
                "reason": f"Amount {row['amount']} is more than 2x the vendor average ({avg_for_vendor:.2f})"
            })

    # ---- Check 2: Duplicate invoice numbers from the same vendor ----
    duplicates = df[df.duplicated(subset=["invoice_no", "vendor_name"], keep=False)]
    for _, row in duplicates.iterrows():
        flags.append({
            "invoice_id": row["id"],
            "flag_type": "DUPLICATE_INVOICE",
            "reason": f"Invoice number {row['invoice_no']} appears multiple times for vendor {row['vendor_name']}"
        })

    # ---- Check 3: Suspiciously round amounts (ending in 000) ----
    for _, row in df.iterrows():
        if row["amount"] % 1000 == 0 and row["amount"] >= 10000:
            flags.append({
                "invoice_id": row["id"],
                "flag_type": "ROUND_AMOUNT",
                "reason": f"Amount {row['amount']} is suspiciously round — common fraud pattern"
            })

    # ---- Check 4: Same vendor, same amount, multiple invoices ----
    vendor_amount_counts = df.groupby(["vendor_name", "amount"]).size()
    repeated = vendor_amount_counts[vendor_amount_counts > 1]

    for (vendor, amount), count in repeated.items():
        matching = df[(df["vendor_name"] == vendor) & (df["amount"] == amount)]
        for _, row in matching.iterrows():
            flags.append({
                "invoice_id": row["id"],
                "flag_type": "REPEATED_AMOUNT",
                "reason": f"{vendor} has {count} invoices for the exact same amount {amount} — possible duplicate billing"
            })

    return flags


def save_flags_to_db(flags: list):
    """Save detected anomaly flags into the anomaly_flags table."""
    if not flags:
        return 0

    conn = get_connection()
    cursor = conn.cursor()

    # clear old flags before re-running detection (avoids duplicate flags)
    cursor.execute("DELETE FROM anomaly_flags")

    for flag in flags:
        cursor.execute("""
            INSERT INTO anomaly_flags (invoice_id, flag_type, reason)
            VALUES (%s, %s, %s)
        """, (flag["invoice_id"], flag["flag_type"], flag["reason"]))

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Saved {len(flags)} anomaly flags")
    return len(flags)


def run_anomaly_detection():
    """Main function — detect and save anomalies. Call this after every upload."""
    flags = detect_anomalies()
    count = save_flags_to_db(flags)
    return {"flags_detected": count, "flags": flags}