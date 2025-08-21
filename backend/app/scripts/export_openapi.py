import json
from pathlib import Path
from fastapi.openapi.utils import get_openapi
from app.main import app


def main() -> None:
    openapi_schema = app.openapi()
    out_path = Path(__file__).resolve().parents[1] / "openapi.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"Wrote OpenAPI schema to {out_path}")


if __name__ == "__main__":
    main()

