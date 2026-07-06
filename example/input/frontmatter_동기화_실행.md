# 보고서 Front Matter 동기화 실행

```yaml
report_harvester:
  action: sync_frontmatter
  target:
    folder: "example/input"
    include:
      - "*.md"
    exclude:
      - "readme*.md"
      - "*_실행.md"
  backup: true

  schema:
    report_type_A:
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
            - column: 유형 1
              key: 유형 1
            - column: 유형 2
              key: 유형 2
            - column: 유형 3
              key: 유형 3
            - column: 일정
              key: 일정
              include_children: true

        - header: 목적
          export:
            - column: 목적
              content: all

        - header: 결과
          export:
            - column: 결과
              content: all

        - header: 타임라인
          export:
            - column: 타임라인
              content: all
```
