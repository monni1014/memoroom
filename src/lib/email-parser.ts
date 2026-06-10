import { format, parse } from 'date-fns';

export interface ParsedReservation {
  source: string;       // "naver" | "spacecloud"
  roomName: string;     // "머무룸1" | "머무룸2"
  customerName: string; // 고객명
  startTime: Date;
  endTime: Date;
  price: number;
  headCount: number;
  emailId: string;
}

/**
 * 스페이스클라우드 메일 파서
 */
export function parseSpaceCloudEmail(subject: string, text: string, messageId: string): ParsedReservation | null {
  try {
    // 1. 공간 추출 (제목에서 "예약하기 1" 또는 "예약하기 2" 등)
    let roomName = "머무룸1";
    if (subject.includes("예약하기 2")) roomName = "머무룸2";
    else if (subject.includes("예약하기 3")) roomName = "머무룸3";

    // 2. 예약내용 (시간) 추출: "2026/06/11 17시 - 21시"
    const timeMatch = text.match(/예약내용\s+(\d{4}\/\d{2}\/\d{2})\s+(\d+)시\s*-\s*(\d+)시/);
    if (!timeMatch) return null;
    
    const dateStr = timeMatch[1];
    const startHour = parseInt(timeMatch[2], 10);
    const endHour = parseInt(timeMatch[3], 10);

    const startTime = parse(`${dateStr} ${startHour}:00`, 'yyyy/MM/dd HH:mm', new Date());
    const endTime = parse(`${dateStr} ${endHour}:00`, 'yyyy/MM/dd HH:mm', new Date());

    // 3. 인원 추출: "10명"
    const headMatch = text.match(/이용인원\s+(\d+)명/);
    const headCount = headMatch ? parseInt(headMatch[1], 10) : 1;

    // 4. 예약자명 추출: "이무진"
    const nameMatch = text.match(/예약자명\s+([^\n]+)/);
    const customerName = nameMatch ? nameMatch[1].trim() : "스페이스클라우드 예약";

    // 5. 금액 추출: "₩100,000"
    const priceMatch = text.match(/결제금액\s+[^\d]*([\d,]+)/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;

    return {
      source: "spacecloud",
      roomName,
      customerName,
      startTime,
      endTime,
      price,
      headCount,
      emailId: messageId,
    };
  } catch (e) {
    console.error("SpaceCloud 파싱 에러:", e);
    return null;
  }
}

/**
 * 네이버플레이스 메일 파서
 */
export function parseNaverEmail(subject: string, text: string, messageId: string): ParsedReservation | null {
  try {
    // 1. 공간 추출: "예약상품 머무룸 예약하기 1"
    let roomName = "머무룸1";
    if (text.includes("예약하기 2")) roomName = "머무룸2";
    else if (text.includes("예약하기 3")) roomName = "머무룸3";

    // 2. 금액 및 인원 추출: "결제 금액 머무룸 예약하기 1(1) 24,000원"
    const priceMatch = text.match(/결제\s*금액\s*.*?\(\s*(\d+)\s*\)\s*([\d,]+)원/);
    let headCount = 1;
    let price = 0;
    if (priceMatch) {
      headCount = parseInt(priceMatch[1], 10);
      price = parseInt(priceMatch[2].replace(/,/g, ''), 10);
    } else {
      // 대안 정규식 (형식이 조금 다를 경우 대비)
      const fallbackPriceMatch = text.match(/([\d,]+)원/);
      if (fallbackPriceMatch) price = parseInt(fallbackPriceMatch[1].replace(/,/g, ''), 10);
      
      const fallbackHeadMatch = text.match(/\(\s*(\d+)\s*\)/);
      if (fallbackHeadMatch) headCount = parseInt(fallbackHeadMatch[1], 10);
    }

    // 3. 시간 추출: "예약일시 2026.06.03(화) 오후 6:00~오후 7:30"
    const timeMatch = text.match(/예약일시\s+(\d{4}\.\d{2}\.\d{2}).*?(오전|오후)\s*(\d+):(\d+)\s*~\s*(오전|오후)\s*(\d+):(\d+)/);
    if (!timeMatch) return null;

    const dateStr = timeMatch[1].replace(/\./g, '/'); // 2026/06/03
    
    let startHour = parseInt(timeMatch[3], 10);
    if (timeMatch[2] === "오후" && startHour !== 12) startHour += 12;
    if (timeMatch[2] === "오전" && startHour === 12) startHour = 0;
    const startMin = parseInt(timeMatch[4], 10);

    let endHour = parseInt(timeMatch[6], 10);
    if (timeMatch[5] === "오후" && endHour !== 12) endHour += 12;
    if (timeMatch[5] === "오전" && endHour === 12) endHour = 0;
    const endMin = parseInt(timeMatch[7], 10);

    const startTime = new Date(`${dateStr} ${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
    const endTime = new Date(`${dateStr} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`);

    // 4. 예약자명 추출 (네이버 메일은 보통 본문에 명확히 안 보일 수 있으므로 일단 더미값, 추후 보강)
    const customerName = "네이버 예약"; 

    return {
      source: "naver",
      roomName,
      customerName,
      startTime,
      endTime,
      price,
      headCount,
      emailId: messageId,
    };
  } catch (e) {
    console.error("Naver 파싱 에러:", e);
    return null;
  }
}

/**
 * 통합 파서
 */
export function parseEmail(subject: string, text: string, messageId: string): ParsedReservation | null {
  // 스페이스클라우드 판별
  if (subject.includes("스페이스클라우드") || text.includes("스페이스클라우드") || subject.includes("호스트님")) {
    return parseSpaceCloudEmail(subject, text, messageId);
  }
  
  // 네이버 판별
  if (subject.includes("네이버 예약") || text.includes("네이버 예약") || subject.includes("확정 되었습니다")) {
    return parseNaverEmail(subject, text, messageId);
  }

  return null; // 알 수 없는 메일
}
