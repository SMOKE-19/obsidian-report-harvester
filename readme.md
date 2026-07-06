# Markdown 보고서 자동화 목적 정리

## 목적

이 작업의 목적은 사람이 Obsidian/Markdown으로 작성한 보고서를 정해진 규칙에 따라 다시 활용할 수 있게 만드는 것이다.

핵심 흐름은 다음 세 가지다.

1. 서식 Markdown에서 Excel 추출 규칙 YAML 초안을 만든다.
2. 작성된 Markdown 보고서들을 읽어 Excel 표로 변환한다.
3. 작성된 Markdown 보고서 상단에 YAML front matter를 자동 입력하거나 갱신한다.

LLM 없이도 반복 실행할 수 있도록 Python 스크립트와 `report_schema.yaml` 규칙 파일로 동작하게 구성했다.

## 기본 개념

### Markdown 보고서

보고서는 `### 헤더`와 bullet list를 기준으로 읽는다.

예:

```md
### 메타데이터

- 보고서 제목: 보고서1
- 담당자: 담당자1
- 시료:
  - 시료1
    - 시료 설명

### 결과

- 결과 항목
  - 세부 결과
```

### report_schema.yaml

`report_schema.yaml`은 Excel 또는 front matter로 뽑을 값을 지정하는 추출 규칙 파일이다.

중요한 키는 다음과 같다.

- `header`: Markdown 문서의 `### 헤더` 이름
- `export`: 해당 헤더에서 추출할 항목 목록
- `key`: 특정 bullet key의 값만 추출
- `content: all`: 해당 헤더 아래 내용을 통째로 추출
- `include_children: true`: 하위 bullet까지 같은 셀/값에 포함
- `column`: Excel 컬럼명 또는 front matter key 이름

예:

```yaml
- header: 메타데이터
  export:
    - column: 보고서 제목
      key: 보고서 제목
    - column: 시료
      key: 시료
      include_children: true

- header: 결과
  export:
    - column: 결과
      content: all
```

## 스크립트 역할

### md_template_to_schema.py

서식 Markdown을 읽어서 `report_schema.yaml` 초안을 만든다.

사용 시점:

- 새 보고서 서식을 만들었을 때
- 서식의 `### 헤더`나 최상위 bullet key가 바뀌었을 때
- 사람이 YAML을 처음부터 쓰지 않고 초안을 만들고 싶을 때

실행:

```powershell
python md_template_to_schema.py --template report_type_A.md --output report_schema.yaml
```

생성된 YAML에서 불필요한 `export` 항목만 지우면 바로 사용할 수 있다.

### md_reports_to_xlsx.py

작성된 Markdown 보고서들을 읽고 Excel 파일을 만든다.

입력:

- 현재 폴더의 `.md` 파일들
- `report_schema.yaml`

출력:

- `report_table.xlsx`

실행:

```powershell
python md_reports_to_xlsx.py
```

Excel에서는 Markdown 파일 하나가 한 행이 된다.

기본 컬럼:

- `파일 생성 시각`
- `파일명`
- `report_schema.yaml`에 지정한 export 컬럼들

### schema_to_blank_md.py

`report_schema.yaml`을 바탕으로 빈 Markdown 보고서 양식을 만든다.

사용 시점:

- 현재 추출 규칙에 맞는 빈 입력 파일을 만들고 싶을 때
- `report_schema.yaml` 기반으로 간단한 작성 템플릿을 만들 때

실행:

```powershell
python schema_to_blank_md.py --schema report_schema.yaml --output blank_report.md
```

### md_reports_to_frontmatter.py

작성된 Markdown 보고서를 읽고, 추출 값을 문서 상단 YAML front matter에 삽입하거나 갱신한다.

사용 시점:

- Obsidian 속성으로 보고서 값을 검색/정렬/필터링하고 싶을 때
- 본문 bullet 값을 front matter에도 동기화하고 싶을 때

단일 파일 실행:

```powershell
python md_reports_to_frontmatter.py --input report_type_A_test.md
```

전체 `.md` 파일 실행:

```powershell
python md_reports_to_frontmatter.py
```

기본적으로 `.bak` 백업 파일을 만든다.

백업 없이 실행:

```powershell
python md_reports_to_frontmatter.py --input report_type_A_test.md --no-backup
```

## 링크와 이미지 처리

Excel/front matter 추출 시 기본적으로 bullet 안의 이미지와 링크는 제거한다.

제거 대상 예:

```md
![[image.png]]
![alt](image.png)
[[문서]]
[사이트](https://example.com)
https://example.com
```

단, 추출 대상 `key` 또는 `column` 이름에 `link`나 `링크`가 들어가면 URL은 보존한다.

예:

```md
- 참고 link: [사이트](https://example.com) https://example.org
```

추출 결과:

```text
https://example.com https://example.org
```

이미지 링크는 `link` 키여도 제거한다.

## 전체 흐름 예시

### 1. 서식에서 YAML 초안 생성

```powershell
python md_template_to_schema.py --template report_type_A.md --output report_schema.yaml
```

### 2. YAML에서 불필요한 export 항목 삭제

예를 들어 `유형 3`이 필요 없으면 해당 블록을 지운다.

```yaml
- column: 유형 3
  key: 유형 3
```

### 3. 작성된 Markdown들을 Excel로 변환

```powershell
python md_reports_to_xlsx.py
```

### 4. 필요하면 front matter 삽입

```powershell
python md_reports_to_frontmatter.py --input report_type_A_test.md
```

## 현재 파일 구성

- `manifest.json`: Obsidian 플러그인 메타데이터
- `main.ts`: 플러그인 진입점과 명령 팔레트 액션 연결
- `src/schema.ts`: Markdown 서식에서 `report_schema.yaml` 생성, schema 로딩
- `src/markdownParser.ts`: `### 헤더`와 bullet list 파싱, 링크/이미지 제거
- `src/extractor.ts`: schema 기준으로 Markdown 보고서 값을 행 데이터로 추출
- `src/frontmatter.ts`: 추출 값을 YAML front matter에 삽입/갱신
- `src/template.ts`: schema 기준 빈 Markdown 보고서 생성
- `src/xlsxExport.ts`: 추출 행 데이터를 `.xlsx`로 생성
- `src/runConfig.ts`: 실행 노트의 YAML 코드블럭 파싱/검증
- `src/runNote.ts`: 보고서 Markdown에서 실행 노트 초안 생성
- `src/settings.ts`: Obsidian 설정 탭
- `src/i18n.ts`: Obsidian 언어 설정에 따른 영어/한국어 병기 문구
- `main.js`: 빌드된 Obsidian 플러그인 실행 파일
- `styles.css`: 플러그인 스타일 파일
- `report_type_A.md`: 보고서 A 서식 Markdown
- `report_type_A_test.md`: 실제 입력 예시 Markdown
- `report_schema.yaml`: 추출 규칙 YAML
- `md_template_to_schema.py`: 서식 Markdown에서 YAML 초안 생성
- `md_reports_to_xlsx.py`: Markdown 보고서들을 Excel로 변환
- `schema_to_blank_md.py`: YAML에서 빈 Markdown 생성
- `md_reports_to_frontmatter.py`: Markdown에 YAML front matter 삽입/갱신
- `report_table.xlsx`: 생성된 Excel 결과물

## Obsidian 플러그인 구조

기존 Python 스크립트는 `python/` 폴더에 보존하고, 실제 Obsidian 플러그인은 TypeScript 단독 구조로 구현한다.

설정값:

- `기본 포함 패턴 (Default include patterns)`: 새 실행 노트에 입력할 `target.include` 기본값
- `기본 제외 패턴 (Default exclude patterns)`: 새 실행 노트에 입력할 `target.exclude` 기본값
- `기본 XLSX 출력 폴더 (Default XLSX output folder)`: XLSX 실행 노트 초안의 출력 폴더
- `front matter 동기화 전 백업 (Back up before front matter sync)`: front matter 실행 노트 초안의 `backup` 기본값

명령 팔레트:

Obsidian 언어 설정이 한국어면 한국어가 먼저 표시되고, 그 외 언어에서는 영어가 먼저 표시된다.

- `Report Harvester: 현재 실행 노트 실행 (Report Harvester: Run current execution note)`
- `Report Harvester: 현재 보고서에서 XLSX 실행 노트 생성 (Report Harvester: Create XLSX execution note from current report)`
- `Report Harvester: 현재 보고서에서 front matter 실행 노트 생성 (Report Harvester: Create front matter execution note from current report)`

한국어 환경 검색어:

- `Report Harvester`
- `스키마`
- `빈 보고서`
- `XLSX`
- `front matter`
- `동기화`

### 실행 노트 기반 흐름

Obsidian에서 직접 편집하기 어려운 별도 `report_schema.yaml` 대신, Markdown 실행 노트 안의 YAML 코드블럭으로 추출 작업을 정의할 수 있다.

Excel 추출 실행 노트 예:

```yaml
report_harvester:
  action: export_xlsx
  target:
    folder: "example/input"
    include:
      - "*.md"
    exclude:
      - "readme*.md"
      - "*_실행.md"
  output_xlsx: "example/output/report_table.xlsx"

  schema:
    report_type_A:
      heading_level: 3
      headers:
        - header: 메타데이터
          export:
            - column: 보고서 제목
              key: 보고서 제목
```

front matter 동기화 실행 노트 예:

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
```

실행 노트 생성 흐름:

1. 보고서 또는 보고서 템플릿 Markdown을 연다.
2. `Report Harvester: 현재 보고서에서 XLSX 실행 노트 생성` 또는 `Report Harvester: 현재 보고서에서 front matter 실행 노트 생성`을 실행한다.
3. 생성된 실행 노트의 `target`, `output_xlsx`, `schema`를 필요에 맞게 수정한다.
4. 실행 노트를 연 상태에서 `Report Harvester: 현재 실행 노트 실행`을 실행한다.

빌드:

```bash
npm install
npm run build
```

배포 파일:

- `manifest.json`
- `main.js`
- `styles.css`
