"""
DroneOps - 見積・請求書 Word生成ヘルパー
既存の main.py に追記してください。
"""
import subprocess, tempfile, json, os
from pathlib import Path

# generate_estimate_invoice.js のパスを環境に合わせて変更
JS_SCRIPT = Path(__file__).parent / "generate_estimate_invoice.js"

def _run_docx_generator(doc_type: str, payload: dict) -> str:
    """Node.jsスクリプトを呼び出してdocxを生成し、一時ファイルパスを返す"""
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, default=str)
        json_path = f.name

    out_path = json_path.replace(".json", ".docx")
    result = subprocess.run(
        ["node", str(JS_SCRIPT), doc_type, json_path, out_path],
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )
    os.unlink(json_path)

    if result.returncode != 0:
        raise RuntimeError(f"docx generation failed: {result.stderr}")
    return out_path


def generate_estimate_docx(estimate, project, customer) -> str:
    payload = {
        "doc": {
            "id": estimate.id,
            "estimate_number": estimate.estimate_number,
            "issue_date": estimate.issue_date.isoformat() if estimate.issue_date else None,
            "valid_until": estimate.valid_until.isoformat() if estimate.valid_until else None,
            "subtotal": estimate.subtotal,
            "tax_rate": estimate.tax_rate,
            "tax_amount": estimate.tax_amount,
            "total": estimate.total,
            "status": estimate.status,
            "notes": estimate.notes,
            "items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "unit_price": item.unit_price,
                    "amount": item.amount,
                }
                for item in sorted(estimate.items, key=lambda x: x.sort_order)
            ]
        },
        "project": {
            "name": project.name if project else "",
            "contact_name": getattr(project, "contact_name", ""),
        },
        "customer": {
            "company_name": customer.company if customer else "",
            "postal_code": getattr(customer, "postal_code", ""),
            "address": getattr(customer, "address", ""),
        }
    }
    return _run_docx_generator("estimate", payload)


def generate_invoice_docx(invoice, project, customer) -> str:
    payload = {
        "doc": {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "estimate_id": invoice.estimate_id,
            "issue_date": invoice.issue_date.isoformat() if invoice.issue_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "subtotal": invoice.subtotal,
            "tax_rate": invoice.tax_rate,
            "tax_amount": invoice.tax_amount,
            "total": invoice.total,
            "status": invoice.status,
            "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
            "notes": invoice.notes,
            "items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "unit_price": item.unit_price,
                    "amount": item.amount,
                }
                for item in sorted(invoice.items, key=lambda x: x.sort_order)
            ]
        },
        "project": {
            "name": project.name if project else "",
            "contact_name": getattr(project, "contact_name", ""),
        },
        "customer": {
            "company_name": customer.company if customer else "",
            "postal_code": getattr(customer, "postal_code", ""),
            "address": getattr(customer, "address", ""),
        }
    }
    return _run_docx_generator("invoice", payload)
