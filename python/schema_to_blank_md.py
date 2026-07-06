from pathlib import Path
import argparse

import yaml


ROOT = Path(__file__).resolve().parent
DEFAULT_SCHEMA_PATH = ROOT / "report_schema.yaml"
DEFAULT_OUTPUT_PATH = ROOT / "blank_report.md"


def load_report_schema(schema_path: Path, report_key: str | None = None) -> tuple[str, dict]:
    with schema_path.open(encoding="utf-8") as file:
        schema = yaml.safe_load(file)

    if not schema:
        raise ValueError(f"Empty schema: {schema_path}")

    if report_key:
        if report_key not in schema:
            available = ", ".join(schema)
            raise KeyError(f"Report key '{report_key}' not found. Available: {available}")
        return report_key, schema[report_key]

    key = next(iter(schema))
    return key, schema[key]


def heading_marker(level: int) -> str:
    return "#" * max(level, 1)


def render_key_export(export_spec: dict) -> list[str]:
    key = export_spec["key"]
    lines = [f"- {key}: "]

    if export_spec.get("include_children"):
        lines.append("  - ")

    return lines


def render_content_export() -> list[str]:
    return ["- "]


def render_header(header_spec: dict, heading_level: int) -> list[str]:
    lines = [f"{heading_marker(heading_level)} {header_spec['header']}", ""]

    for export_spec in header_spec.get("export", []):
        if export_spec.get("key"):
            lines.extend(render_key_export(export_spec))
        elif export_spec.get("content") == "all":
            lines.extend(render_content_export())

    return lines


def build_markdown(report_schema: dict) -> str:
    heading_level = int(report_schema.get("heading_level", 3))
    lines: list[str] = []

    for header_spec in report_schema.get("headers", []):
        if lines:
            lines.append("")
        lines.extend(render_header(header_spec, heading_level))

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a blank Markdown report from report_schema.yaml.")
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--report-key", default=None)
    args = parser.parse_args()

    _, report_schema = load_report_schema(args.schema, args.report_key)
    args.output.write_text(build_markdown(report_schema), encoding="utf-8")
    print(f"created: {args.output}")


if __name__ == "__main__":
    main()
