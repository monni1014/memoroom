# 프로젝트 인수인계 문서 (Meomuroom DX)

본 문서는 다른 AI 어시스턴트(Claude 등)가 기존 작업 맥락을 파악하고 이어서 작업을 진행할 수 있도록 작성된 요약본입니다.

## 1. 프로젝트 개요 및 기술 스택
- **프레임워크**: Next.js 16 (App Router 사용, `src/app` 구조)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS, `lucide-react` (아이콘)
- **데이터베이스**: SQLite + Prisma ORM (`@prisma/client`)
- **주요 라이브러리**: `imapflow` (IMAP 메일 연동), `mailparser` (메일 파싱), `date-fns` (날짜 처리)

## 2. 지금까지 구현된 주요 기능 (V3)
- **대시보드 UI (`src/app/page.tsx`)**:
  - 누적 매출, 예약 건수, 공간별(머무룸1/2) 예약, 최근 예약 목록 카드 렌더링.
  - Next.js 서버 캐싱 문제를 방지하기 위해 `export const dynamic = "force-dynamic";` 적용됨.
- **캘린더 뷰 (`src/app/calendar/page.tsx` & `CalendarView.tsx`)**:
  - 월간 달력 형태로 예약 현황 블록 표시.
  - 공간별 필터링 (전체/머무룸1/머무룸2) 탭 적용.
- **네이버 메일 자동 동기화 (`src/lib/email-sync.ts` & `email-parser.ts`)**:
  - `imap.naver.com`에 접근하여 안 읽은(`seen: false`) 메일을 가져옵니다.
  - 예약 확정 메일에서 '이용일시', '결제금액', '예약자명', '공간명'을 정규식으로 추출하여 SQLite DB에 저장합니다.
  - 저장 후 해당 메일은 IMAP에서 읽음(`\Seen`) 처리됩니다.
  - 타임아웃 에러를 방지하기 위해 `client.logout()` 등에 `try-catch` 및 에러 이벤트 리스너가 추가되어 안정성이 확보(V3 패치)되었습니다.

## 3. 발생했던 주요 이슈 및 해결책
- **문제 1: 가짜 데이터(Dummy)가 지워지지 않고 UI에 계속 나타남**
  - **원인**: Next.js App Router의 브라우저 캐시(Router Cache) 또는 정적 페이지 생성 캐시.
  - **해결**: `.next` 폴더를 날리고 DB(`dev.db`)를 강제 초기화한 후, 각 페이지 상단에 `force-dynamic`을 명시하여 해결함. 사용자에게는 Ctrl+F5(강력 새로고침)를 안내함.
- **문제 2: IMAP 파싱 실패 및 500 에러 타임아웃**
  - **원인**: 네이버 예약 메일 본문의 "예약일시" 단어가 특정 예약에서는 "이용일시"로 오는 케이스 발생. 또한 긴 동기화 과정에서 소켓 타임아웃 발생 시 API 서버가 크래시.
  - **해결**: 정규식을 `(?:예약일시|이용일시)`로 유연하게 수정하고, `imapflow` 에러에 대한 방어 로직(catch) 추가 완료.

---

## 4. [중요] 다음으로 이어서 진행해야 할 목표 작업 (취소 메일 연동)

사용자가 **"예약 취소"** 기능을 방금 새롭게 요청했습니다. 다음 작업자는 아래의 요구사항을 반영하여 코드를 업데이트해야 합니다.

### 🎯 요구사항
네이버 예약에서 취소 메일이 올 경우:
1. DB에서 해당 예약을 찾아 아예 삭제하는 것이 아니라, 취소 상태(`status: 'CANCELLED'`)로 변경해야 합니다.
2. 취소 메일 본문에 기재된 **"환불수수료"** (예: `환불수수료 15,000원(결제금액의 100%)`)를 파싱하여, 기존 예약의 `price`(매출액)를 해당 수수료 금액으로 덮어씁니다. (취소 수수료도 매출이므로).
3. 대시보드와 캘린더 UI에서 취소된 예약은 회색(bg-slate-200 등)으로 표시하거나 🚫 모양의 배지를 달아서 구별해야 합니다.

### 🛠️ 구현 권장 사항 (Implementation Plan)
1. **DB 변경 (`schema.prisma`)**
   - `Reservation` 모델에 `status String @default("CONFIRMED")` 필드 추가 후 `npx prisma db push` 실행.
2. **파서 수정 (`email-parser.ts`)**
   - 메일 제목이 "예약을 취소 하셨습니다" 이거나 본문에 취소 키워드가 있을 경우를 분류.
   - 정규식 `/환불수수료\s+([\d,]+)원/` 을 이용해 수수료 금액 추출.
   - 반환 객체에 `isCancelled: true` 추가.
3. **동기화 로직 수정 (`email-sync.ts`)**
   - 취소 메일인 경우 새로운 예약을 `create`하는 대신, 시간/공간/고객명 등의 정보를 바탕으로 `findFirst`로 기존 예약을 찾고, `update` 구문으로 `status: "CANCELLED"`와 `price`를 변경하도록 로직 분기.
4. **UI 업데이트 (`page.tsx`, `CalendarView.tsx`)**
   - `status === "CANCELLED"` 조건에 따라 스타일링 분기 처리 (색상 변경 및 취소선 추가).
