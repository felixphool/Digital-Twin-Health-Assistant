import io
import tempfile
import subprocess
from typing import Tuple, Optional


def _scan_with_clamd(file_bytes: bytes) -> Tuple[bool, Optional[str]]:
    try:
        import clamd  # type: ignore
    except Exception:
        return False, None

    try:
        # Try local UNIX socket first, then TCP localhost
        try:
            client = clamd.ClamdUnixSocket()
            client.ping()
        except Exception:
            client = clamd.ClamdNetworkSocket(host="127.0.0.1", port=3310)
            client.ping()

        result = client.instream(io.BytesIO(file_bytes))
        # Expected format: {'stream': ('FOUND'|'OK', 'Malware.Name'|None)}
        if result and isinstance(result, dict) and "stream" in result:
            status, signature = result["stream"][0], result["stream"][1]
            if status == "FOUND":
                return True, signature or "malware detected"
            return False, None
    except Exception:
        return False, None

    return False, None


def _scan_with_clamscan(file_bytes: bytes) -> Tuple[bool, Optional[str]]:
    """Fallback: shell out to clamscan if available."""
    try:
        proc = subprocess.run(["which", "clamscan"], capture_output=True, text=True)
        if proc.returncode != 0:
            return False, None
    except Exception:
        return False, None

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            tmp_path = tmp.name

        scan = subprocess.run([
            "clamscan",
            "--no-summary",
            tmp_path,
        ], capture_output=True, text=True)

        # clamscan return codes: 0 = OK, 1 = found, 2 = error
        if scan.returncode == 1:
            signature = scan.stdout.strip() or scan.stderr.strip() or "malware detected"
            return True, signature
        if scan.returncode == 0:
            return False, None
        # treat errors conservatively as unknown
        return False, None
    finally:
        if tmp_path:
            try:
                subprocess.run(["rm", "-f", tmp_path])
            except Exception:
                pass


def is_malicious_file(file_bytes: bytes) -> Tuple[bool, Optional[str]]:
    """Return (malicious, reason). If scanners unavailable, returns (False, None)."""
    # Try clamd daemon first (fast, streaming)
    malicious, reason = _scan_with_clamd(file_bytes)
    if malicious:
        return True, reason

    # Fallback to clamscan binary
    malicious, reason = _scan_with_clamscan(file_bytes)
    if malicious:
        return True, reason

    # No scanners or clean
    return False, None


