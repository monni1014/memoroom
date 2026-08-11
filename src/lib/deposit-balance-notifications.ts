import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { createAdminAlert, resolveAdminAlertByDedupeKey } from "@/lib/admin-alerts";
import {
  buildDepositBalanceMessage,
  getReservationBalance,
  shouldSendDepositBalanceNotification,
} from "@/lib/deposit-balance-policy";
import { getKstDateParts } from "@/lib/kst-time";
import { isValidKoreanMobilePhone, normalizeKoreanPhone } from "@/lib/phone-number";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push-notifications";
import { getSituationMessageTemplates } from "@/lib/situation-message-templates";
import { sendReservationSituationMessage } from "@/lib/solapi-sms";

const SITUATION_TYPE = "DEPOSIT_BALANCE_REMINDER";
const MESSAGE_PREFIX = "situation:deposit-balance:";
const ALERT_PREFIX = "deposit-balance-notification:";
const ATTEMPT_PREFIX = "attempt:";
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function messageDedupeKey(reservationId: string) {
  return `${MESSAGE_PREFIX}${reservationId}`;
}

function alertDedupeKey(reservationId: string) {
  return `${ALERT_PREFIX}${reservationId}`;
}

function formatClock(value: Date) {
  const parts = getKstDateParts(value);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

async function recordFailure(
  reservation: {
    id: string;
    roomName: string;
    customerName: string | null;
    startTime: Date;
    endTime: Date;
  },
  reason: string,
) {
  await createAdminAlert({
    type: "DEPOSIT_BALANCE_NOTIFICATION_FAILED",
    severity: "CRITICAL",
    title: "예약 잔금 안내 실패",
    message: `${reservation.roomName} / ${reservation.customerName || "이름 미확인"} / ${formatClock(reservation.startTime)}~${formatClock(reservation.endTime)} / ${reason}`,
    dedupeKey: alertDedupeKey(reservation.id),
  });
}

export async function sendDueDepositBalanceNotifications(
  now = new Date(),
  options: { forceDryRun?: boolean } = {},
) {
  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      isNoShow: false,
      isPaid: false,
      depositAmount: { gt: 0 },
      endTime: {
        gte: new Date(now.getTime() - LOOKBACK_MS),
        lte: now,
      },
      messages: {
        none: { dedupeKey: { startsWith: MESSAGE_PREFIX } },
      },
    },
    orderBy: [{ endTime: "asc" }, { id: "asc" }],
    take: 100,
  });

  const template = (await getSituationMessageTemplates()).find((item) => item.key === SITUATION_TYPE);
  let sentCount = 0;
  let dryRunCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const reservation of reservations) {
    if (!shouldSendDepositBalanceNotification({ ...reservation, now })) {
      skippedCount += 1;
      continue;
    }

    const phone = normalizeKoreanPhone(reservation.phone);
    if (!isValidKoreanMobilePhone(phone)) {
      failedCount += 1;
      await recordFailure(reservation, "고객 전화번호가 없어 문자를 보낼 수 없습니다.");
      continue;
    }

    const balance = getReservationBalance(reservation);
    const body = buildDepositBalanceMessage({
      roomName: reservation.roomName,
      balance,
      template: template?.content,
    });
    const dedupeKey = messageDedupeKey(reservation.id);
    const attemptId = randomUUID();

    try {
      await prisma.customerMessage.create({
        data: {
          direction: "OUTBOUND",
          channel: "LMS",
          status: "SENDING",
          senderNumber: "",
          recipientNumber: phone,
          customerPhone: phone,
          body,
          providerMessageId: `${ATTEMPT_PREFIX}${attemptId}`,
          dedupeKey,
          reservationId: reservation.id,
          occurredAt: now,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skippedCount += 1;
        continue;
      }
      throw error;
    }

    // 발송 직전 최신 상태를 다시 확인해, 다른 기기에서 결제 완료/취소한 예약에는 보내지 않는다.
    const latest = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    if (!latest || !shouldSendDepositBalanceNotification({ ...latest, now })) {
      await prisma.customerMessage.delete({ where: { dedupeKey } });
      skippedCount += 1;
      continue;
    }

    const latestBalance = getReservationBalance(latest);
    const latestBody = buildDepositBalanceMessage({
      roomName: latest.roomName,
      balance: latestBalance,
      template: template?.content,
    });
    let result;
    try {
      result = await sendReservationSituationMessage({
        reservationId: latest.id,
        notificationAttemptId: attemptId,
        messageDedupeKey: dedupeKey,
        situationType: SITUATION_TYPE,
        phone: latest.phone,
        subject: template?.subject || "예약 잔금 안내",
        text: latestBody,
      }, { forceDryRun: options.forceDryRun });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "알 수 없는 발송 오류";
      await prisma.customerMessage.update({
        where: { dedupeKey },
        data: { status: "FAILED", body: latestBody },
      });
      failedCount += 1;
      await recordFailure(latest, reason);
      continue;
    }

    await prisma.customerMessage.update({
      where: { dedupeKey },
      data: {
        status: result.success ? (result.dryRun ? "DRY_RUN" : "SUBMITTED") : "FAILED",
        channel: result.channel,
        senderNumber: result.from,
        recipientNumber: result.to || phone,
        customerPhone: result.to || phone,
        body: result.text,
        providerMessageId: result.messageId || `${ATTEMPT_PREFIX}${attemptId}`,
      },
    });

    if (!result.success) {
      failedCount += 1;
      await recordFailure(latest, result.error || "솔라피 발송 실패");
      continue;
    }

    await resolveAdminAlertByDedupeKey(alertDedupeKey(latest.id));
    if (result.dryRun) {
      dryRunCount += 1;
      continue;
    }

    sentCount += 1;
    await sendPushNotification({
      title: "예약 잔금 안내 발송",
      body: `${latest.roomName} / ${latest.customerName || "이름 미확인"} / 잔금 ${latestBalance.toLocaleString("ko-KR")}원 / ${formatClock(latest.startTime)}~${formatClock(latest.endTime)}`,
      url: `/usage?reservationId=${latest.id}`,
      tag: `deposit-balance-${latest.id}`,
    }, { excludeAppleWebPush: true });
  }

  return {
    success: failedCount === 0,
    checkedCount: reservations.length,
    sentCount,
    dryRunCount,
    failedCount,
    skippedCount,
  };
}
