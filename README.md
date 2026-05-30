# math-note

정적 HTML/CSS/JS로 만든 수학 노트입니다. 화면 구조는 `index.html`에 두고, 실제 단원 콘텐츠는 `data/site.json`에서 불러옵니다.

## 구조

```text
.
├─ index.html
├─ style.css
├─ script.js
├─ data/
│  ├─ site.json
│  └─ problems.json
└─ images/
   ├─ problems/
   └─ solutions/
```

## 콘텐츠 수정

`data/site.json`의 `sections` 배열에 단원 데이터를 추가하거나 수정합니다.

```json
{
  "id": "exp",
  "nav": "지수·로그",
  "html": "<div class=\"sec\" id=\"exp\">...</div>"
}
```

수식은 기존처럼 `$...$`, `$$...$$` 형태로 넣으면 KaTeX가 렌더링합니다. JSON 안에서 LaTeX 백슬래시는 `\\frac`처럼 두 번 써야 합니다.

## 이동과 복원

상단 메뉴와 전체 개요 항목을 누르면 해당 단원으로 이동합니다. 가능한 경우 전체 개요 항목은 같은 제목의 카드까지 바로 스크롤합니다.

현재 보고 있는 단원은 주소 해시와 브라우저 로컬 저장소에 같이 저장됩니다.

```text
http://127.0.0.1:8000/#seq
```

해시가 있으면 해시가 우선이고, 해시가 없으면 마지막으로 보던 단원을 복원합니다.

## 예시문제 추가

문제 이미지는 원하는 위치에 두고, `data/problems.json`의 `problems` 배열에 항목을 추가합니다.

```json
{
  "id": "2026-csat-22",
  "title": "2026학년도 수능 22번",
  "sectionId": "seq",
  "conceptTitle": "계차수열 일반화 공식",
  "problemImage": "images/problems/2026-csat-22.png",
  "solutionImage": "images/solutions/2026-csat-22-solution.png"
}
```

`conceptTitle`이 개념 카드 제목과 맞으면 해당 카드 맨 아래에 접이식 예시문제 링크가 자동으로 생깁니다. 링크를 누르면 아래 주소처럼 문제 상세 화면으로 이동합니다.

```text
http://127.0.0.1:8000/#problem/2026-csat-22
```

해설은 이미지 대신 글로 넣을 수도 있습니다.

```json
{
  "id": "seq-sample",
  "title": "수열 예시문제",
  "sectionId": "seq",
  "conceptTitle": "계차수열 일반화 공식",
  "problemImage": "images/problems/seq-sample.png",
  "solutionHtml": "<p>양변을 1부터 n-1까지 더하면 됩니다.</p>"
}
```

## 로컬 실행

JSON을 `fetch()`로 읽기 때문에 파일을 직접 더블클릭하지 말고 로컬 서버로 실행합니다.

```bash
python -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8000/`로 접속합니다.
