export async function sendKakaoAlimtalk(name: string, startTime: string, phone: string): Promise<boolean> {
  // 실제 서비스(Aligo, Solapi 등) 연동 시 여기에 API 호출 로직을 구현합니다.
  // API Key, Sender Key 등은 환경변수(.env)에서 안전하게 관리해야 합니다.
  
  console.log(`[카카오 알림톡 발송 모의] 대상: ${name}, 번호: ${phone}, 시간: ${startTime}`);
  console.log(`메시지: [머무룸] 안녕하세요 ${name}님, 잠시 후 예약하신 공간 이용이 시작될 예정입니다.`);
  
  // 모의 발송 성공 처리
  return true;
}
