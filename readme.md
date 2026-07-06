# Report Harvester

Report Harvester는 Obsidian의 Markdown 보고서를 실행 노트 기반으로 읽어 XLSX 표로 내보내거나 YAML front matter에 동기화하는 플러그인이다.

별도 `report_schema.yaml`을 직접 편집하는 흐름이 아니라, Obsidian 노트 안의 YAML 코드블럭을 실행 설정으로 사용한다.

## 주요 기능

- 현재 실행 노트의 `report_harvester` YAML 코드블럭 실행
- 보고서 또는 보고서 템플릿에서 XLSX 추출 실행 노트 초안 생성
- 보고서 또는 보고서 템플릿에서 front matter 동기화 실행 노트 초안 생성
- `### 헤더`와 bullet list 기반 값 추출
- 링크/이미지 마크업 정리 및 링크 컬럼의 URL 보존
- Obsidian 언어 설정이 한국어이면 한국어 명령명을 먼저 표시

## 명령 팔레트

한국어 환경에서는 한국어가 먼저, 그 외 언어에서는 영어가 먼저 표시된다.

- `Report Harvester: 현재 실행 노트 실행 (Report Harvester: Run current execution note)`
- `Report Harvester: 현재 보고서에서 XLSX 실행 노트 생성 (Report Harvester: Create XLSX execution note from current report)`
- `Report Harvester: 현재 보고서에서 front matter 실행 노트 생성 (Report Harvester: Create front matter execution note from current report)`

## 실행 노트 형식

실행 노트는 Markdown 문서이며, 내부에 `yaml` 코드블럭을 하나 둔다.

```yaml
report_harvester:
  action: export_xlsx
  target:
    folder: "example/reports"
    include:
      - "*.md"
    exclude:
      - "readme*.md"
      - "*_실행.md"
  output_xlsx: "example/output/report_table.xlsx"

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
        - header: 결과
          export:
            - column: 결과
              content: all
```

`action` 값:

- `export_xlsx`: 대상 보고서를 XLSX로 내보낸다.
- `sync_frontmatter`: 대상 보고서의 front matter를 갱신한다.

`target` 값:

- `folder`: Vault 기준 대상 폴더
- `include`: 포함할 파일 패턴
- `exclude`: 제외할 파일 패턴

## 예제

현재 저장소의 예제는 실행 노트 기반 흐름만 보여준다.

- [sample-report-1.md](example/reports/sample-report-1.md)
- [sample-report-2.md](example/reports/sample-report-2.md)
- [export-xlsx.md](example/run-notes/export-xlsx.md)
- [sync-frontmatter.md](example/run-notes/sync-frontmatter.md)

예제 사용 순서:

1. Obsidian vault에 플러그인을 설치한다.
2. `example/run-notes/export-xlsx.md`를 연다.
3. 명령 팔레트에서 `Report Harvester: 현재 실행 노트 실행`을 실행한다.
4. `example/output/report_table.xlsx`가 생성되는지 확인한다.
5. `example/run-notes/sync-frontmatter.md`를 열고 같은 명령을 실행해 보고서 front matter 동기화를 확인한다.

## 설정

설정 탭은 실행 노트 초안 생성에 들어갈 기본값만 관리한다.

- `기본 포함 패턴`: 새 실행 노트의 `target.include`
- `기본 제외 패턴`: 새 실행 노트의 `target.exclude`
- `기본 XLSX 출력 폴더`: 새 XLSX 실행 노트의 출력 폴더
- `front matter 동기화 전 백업`: 새 front matter 실행 노트의 `backup`

## 프로젝트 구조

```text
.
├── main.ts
├── manifest.json
├── styles.css
├── .github/
│   └── workflows/
│       └── release.yml
├── src/
│   ├── extractor.ts
│   ├── frontmatter.ts
│   ├── i18n.ts
│   ├── markdownParser.ts
│   ├── runConfig.ts
│   ├── runNote.ts
│   ├── schema.ts
│   ├── settings.ts
│   ├── types.ts
│   └── xlsxExport.ts
└── example/
    ├── reports/
    └── run-notes/
```

`main.js`는 Obsidian 배포용 번들이며 로컬 빌드 또는 GitHub Actions에서 생성된다. 생성 파일이므로 Git에는 커밋하지 않는다.

## 개발

```bash
npm install
npm run build
npm audit
```

`npm run build`를 실행하면 로컬에 `main.js`가 생성된다. 이 파일은 `.gitignore` 대상이다.

표준 Obsidian 배포 파일:

- `manifest.json`
- `main.js`
- `styles.css`

GitHub Release 산출물은 `v0.1.0` 같은 버전 태그를 push하면 `.github/workflows/release.yml`이 생성한다. Release에는 zip 패키지와 개별 `manifest.json`, `main.js`, `styles.css` 파일이 첨부된다.

## 보관된 이전 자료

초기 Python 스크립트와 이전 예제는 `example.old/` 아래에 로컬 보관한다. 이 폴더는 `.gitignore`에 포함되어 GitHub에는 올리지 않는다.
