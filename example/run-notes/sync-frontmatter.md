# 보고서 Front Matter 동기화 실행

```yaml
report_harvester:
  action: sync_frontmatter
  target:
    folder: "example/reports"
    include:
      - "*.md"
    exclude:
      - "readme*.md"
      - "*_실행.md"
  backup: true

  schema:
    sample_report:
      heading_level: 3
      headers:
        - header: 메타데이터
          export:
            - column: 보고서 제목
              key: 보고서 제목
            - column: 담당자
              key: 담당자
            - column: 시료
              key: 시료
              include_children: true
            - column: 상태
              key: 상태
```
