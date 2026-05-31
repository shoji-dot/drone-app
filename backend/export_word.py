"""
export_word.py - 様式２・３ Word出力（FastAPI用）
node export_word_gen.js を subprocess で呼び出してバイト列を返す
"""

import subprocess
import tempfile
import json
import os
from pathlib import Path

# export_word_gen.js のパス（main.py と同じディレクトリに置く）
_JS_PATH = Path(__file__).parent / "export_word_gen.js"


def _run_js(record: dict, mode: str) -> bytes:
    """
    mode: "shiki2" or "shiki3"
    JSONをstdinで渡し、docxバイト列をstdoutで受け取る
    """
    payload = json.dumps({"mode": mode, "record": record})
    result = subprocess.run(
        ["node", str(_JS_PATH)],
        input=payload.encode("utf-8"),
        capture_output=True,
        timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"export_word_gen.js error: {result.stderr.decode()}")
    return result.stdout


def generate_shiki2_word(record: dict) -> bytes:
    """
    様式２（日常点検記録）を .docx で返す

    record = {
        registration_id, nr, drone_name,
        inspected_at, place, inspector_name,
        weather, temperature, result, notes,
        items: [{checked: bool, note: str}, ...]  # 9項目
    }
    """
    return _run_js(record, "shiki2")


def generate_shiki3_word(record: dict) -> bytes:
    """
    様式３（点検整備記録）を .docx で返す

    record = {
        registration_id, nr, drone_name,
        entries: [{
            performed_at, total_flight_time,
            detail, reason, place, engineer, remarks
        }, ...]
    }
    """
    return _run_js(record, "shiki3")
