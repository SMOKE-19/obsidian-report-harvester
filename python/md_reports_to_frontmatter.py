from pathlib import Path
import argparse
import re

import yaml

import md_reports_to_xlsx as extractor


ROOT = Path(__file__).resolve().parent
DEFAULT_SCHEMA_PATH = ROOT / "report_schema.yaml"


class FrontMatterDumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def str_presenter(dumper, data):
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


FrontMatterDumper.add_representer(str, str_presenter)


def has_frontmatter(text: str) -> bool:
    return text.startswith("---\n") or text.startswith("---\r\n")


def split_frontmatter(text: str) -> tuple[dict, str]:
    if not has_frontmatter(text):
        return {}, text

    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", text, flags=re.DOTALL)
    if not match:
        return {}, text

    raw_frontmatter = match.group(1)
    body = text[match.end() :]
    parsed = yaml.safe_load(raw_frontmatter) or {}
    if not isinstance(parsed, dict):
        parsed = {}
    return parsed, body


def frontmatter_from_row(row: dict[str, str], export_specs: list[dict]) -> dict[str, str]:
    frontmatter = {}
    for spec in export_specs:
        column = spec["column"]
        value = row.get(column)
        if value not in ("", None):
            frontmatter[column] = value
    return frontmatter


def dump_frontmatter(data: dict) -> str:
    content = yaml.dump(
        data,
        Dumper=FrontMatterDumper,
        allow_unicode=True,
        sort_keys=False,
        width=1000,
    ).strip()
    return f"---\n{content}\n---\n\n"


def apply_frontmatter(path: Path, export_specs: list[dict], backup: bool) -> None:
    text = path.read_text(encoding="utf-8")
    existing_frontmatter, body = split_frontmatter(text)
    row = extractor.build_rows([path], export_specs)[0]
    new_frontmatter = {**existing_frontmatter, **frontmatter_from_row(row, export_specs)}
    new_text = dump_frontmatter(new_frontmatter) + body.lstrip("\ufeff")

    if backup:
        backup_path = path.with_suffix(path.suffix + ".bak")
        if not backup_path.exists():
            backup_path.write_text(text, encoding="utf-8")

    path.write_text(new_text, encoding="utf-8")


def markdown_paths(root: Path, pattern: str) -> list[Path]:
    return sorted(path for path in root.glob(pattern) if path.is_file())


def main() -> None:
    parser = argparse.ArgumentParser(description="Add or update YAML front matter in Markdown reports.")
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA_PATH)
    parser.add_argument("--input", type=Path, default=None, help="Single Markdown file to update.")
    parser.add_argument("--pattern", default="*.md", help="Glob pattern used when --input is omitted.")
    parser.add_argument("--no-backup", action="store_true", help="Do not create .bak files before editing.")
    args = parser.parse_args()

    extractor.SCHEMA_PATH = args.schema
    export_specs = extractor.load_export_specs()
    targets = [args.input] if args.input else markdown_paths(ROOT, args.pattern)

    for path in targets:
        apply_frontmatter(path, export_specs, backup=not args.no_backup)
        print(f"updated: {path}")


if __name__ == "__main__":
    main()
