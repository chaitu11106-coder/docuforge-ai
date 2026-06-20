import pdfplumber
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import anthropic
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    if not text.strip():
        print("Digital extraction empty — switching to OCR")
        images = convert_from_path(pdf_path)
        for image in images:
            text += pytesseract.image_to_string(image) + "\n"

    return text.strip()

def safe_parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Raw text was: {text}")
        return {}

def extract_invoice_fields(raw_text: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system="""You are a document extraction assistant for an accounting firm.
Extract invoice fields from the given text and return ONLY valid JSON.
No explanation. No markdown. No backticks. Just the JSON object.""",
        messages=[{
            "role": "user",
            "content": f"""Extract these fields from the invoice text below:
- invoice_number
- vendor_name
- amount (number only, no currency symbol)
- date (in YYYY-MM-DD format if possible)
- gst_number

If any field is not found, use null.

Invoice text:
{raw_text}

Return ONLY this JSON format:
{{
  "invoice_number": "",
  "vendor_name": "",
  "amount": "",
  "date": "",
  "gst_number": ""
}}"""
        }]
    )

    raw_response = response.content[0].text
    print(f"Claude response: {raw_response}")
    return safe_parse_json(raw_response)