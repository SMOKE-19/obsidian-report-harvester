from pathlib import Path
import argparse
import re

import yaml


ROOT = Path(__file__).resolve().parent
DEFAULT_TEMPLATE_PATH = ROOT / "report_type_A.md"
DEFAULT_OUTPUT_PATH = ROOT / "report_schema.yaml"


class IndentDumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def strip_comment_blocks(text: str) -> str:
    return re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)


def clean_text(text: str) -> str:
    text = text.strip()
    if text.startswith("==") and text.endswith("=="):
        text = text[2:-2].strip()
    return text.replace("`", "").strip()


def split_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current = None

    for raw_line in strip_comment_blocks(text).splitlines():
        line = raw_line.rstrip()
        heading = re.match(r"^###\s+(.+?)\s*$", line)
        if heading:
            current = heading.group(1).strip()
            sections[current] = []
            continue
        if current is not None:
            sections[current].append(line)

    return sections


def top_level_bullets(lines: list[str]) -> list[dict]:
    bullets = []
    current = None

    for line in lines:
        match = re.match(r"^(\s*)-\s+(.*)$", line)
        if not match:
            continue

        indent = len(match.group(1))
        text = clean_text(match.group(2))
        if indent == 0:
            key = text.split(":", 1)[0].strip()
            current = {"key": key, "has_children": False}
            bullets.append(current)
        elif current is not None:
            current["has_children"] = True

    return bullets


def build_header_export(header: str, lines: list[str], first_header: bool) -> dict:
    bullets = top_level_bullets(lines)
    header_schema = {"header": header, "export": []}

    if first_header and bullets:
        for bullet in bullets:
            export_spec = {
                "column": bullet["key"],
                "key": bullet["key"],
            }
            if bullet["has_children"]:
                export_spec["include_children"] = True
            header_schema["export"].append(export_spec)
        return header_schema

    header_schema["export"].append({"column": header, "content": "all"})
    return header_schema


def build_schema(template_path: Path) -> dict:
    sections = split_sections(template_path.read_text(encoding="utf-8"))
    report_key = template_path.stem

    return {
        report_key: {
            "heading_level": 3,
            "headers": [
                build_header_export(header, lines, first_header=index == 0)
                for index, (header, lines) in enumerate(sections.items())
            ],
        }
    }


def dump_schema(schema: dict, output_path: Path) -> None:
    content = yaml.dump(
        schema,
        Dumper=IndentDumper,
        allow_unicode=True,
        sort_keys=False,
        width=1000,
    )
    output_path.write_text(
        "# Markdown 보고서에서 Excel로 내보낼 컬럼 규칙입니다.\n"
        "# 불필요한 export 항목은 지우고, 통째로 내보낼 헤더는 content: all을 유지합니다.\n"
        + content,
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate report_schema.yaml for md_reports_to_xlsx.py.")
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    args = parser.parse_args()

    schema = build_schema(args.template)
    dump_schema(schema, args.output)
    print(f"created: {args.output}")


if __name__ == "__main__":
    main()
