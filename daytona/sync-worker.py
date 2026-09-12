from pathlib import Path
import json
root = Path(__file__).resolve().parent.parent
(root / 'frontend/convex/lib/pdfWorker.ts').write_text('// Generated from daytona/pdf_worker.py by daytona/sync-worker.py.\nexport const PDF_WORKER = ' + json.dumps((root / 'daytona/pdf_worker.py').read_text()) + ';\n')
