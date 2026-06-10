import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { parseEmail, ParsedReservation } from './email-parser';
import { prisma } from './prisma';

export async function syncEmails(): Promise<{ processed: number; newReservations: number }> {
  console.log('[EmailSync] 동기화 시작...');
  
  const client = new ImapFlow({
    host: 'imap.naver.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.NAVER_EMAIL || '',
      pass: process.env.NAVER_EMAIL_PASSWORD || ''
    },
    logger: false, // 로깅 끄기
  });

  client.on('error', (err) => {
    console.error('[EmailSync] IMAP 클라이언트 에러 (타임아웃 등):', err.message);
  });

  let processed = 0;
  let newReservations = 0;

  try {
    // 1. IMAP 연결
    await client.connect();
    console.log('[EmailSync] IMAP 연결 성공');

    // 2. INBOX 선택
    const lock = await client.getMailboxLock('INBOX');
    try {
      // 3. 읽지 않은 메일 가져오기 (테스트 시엔 최근 메일 전체를 가져올 수도 있음)
      // 우선 안전하게 최근 3일치 혹은 UNSEEN 메일만 가져오는 로직 (여기서는 UNSEEN 사용)
      console.log('[EmailSync] 안 읽은 메일 검색 중...');
      const messages = client.fetch({ seen: false }, { source: true, uid: true, envelope: true });
      
      for await (const message of messages) {
        processed++;
        const messageId = message.envelope?.messageId || `uid-${message.uid}`;
        
        // 이미 등록된 메일인지 확인
        const existing = await prisma.reservation.findUnique({
          where: { emailId: messageId }
        });
        
        if (existing) {
          console.log(`[EmailSync] 이미 처리된 메일 무시: ${messageId}`);
          // 읽음 처리
          await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
          continue;
        }

        // 메일 본문 파싱
        if (!message.source) {
          console.log(`[EmailSync] 메일 본문 없음, 스킵: ${messageId}`);
          continue;
        }
        const parsedMail = await simpleParser(message.source);
        const subject = parsedMail.subject || '';
        const text = parsedMail.text || ''; // HTML을 파싱한 텍스트 
        
        // 취소 메일 스킵
        if (subject.includes('취소') || text.includes('취소')) {
          console.log(`[EmailSync] 취소 메일 스킵: ${subject}`);
          await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
          continue;
        }

        // 우리 예약 파서 실행
        const reservationData = parseEmail(subject, text, messageId);

        if (reservationData) {
          // DB 등록
          console.log(`[EmailSync] 예약 발견! DB 등록 중... (${reservationData.roomName}, ${reservationData.source})`);
          await prisma.reservation.create({
            data: {
              source: reservationData.source,
              roomName: reservationData.roomName,
              customerName: reservationData.customerName,
              startTime: reservationData.startTime,
              endTime: reservationData.endTime,
              price: reservationData.price,
              emailId: reservationData.emailId,
              usageLog: {
                create: {
                  headCount: reservationData.headCount,
                  purpose: "메일 자동 등록",
                }
              }
            }
          });
          newReservations++;
        } else {
          console.log(`[EmailSync] 예약 메일이 아님 (파싱 실패): ${subject}`);
        }

        // 처리 완료 후 읽음 표시
        await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('[EmailSync] 에러 발생:', err);
  } finally {
    // IMAP 연결 종료
    await client.logout();
    console.log(`[EmailSync] 동기화 종료. 확인: ${processed}건, 등록: ${newReservations}건`);
  }

  return { processed, newReservations };
}
