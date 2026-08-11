import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildDepositBalanceMessage,
  getReservationBalance,
  shouldSendDepositBalanceNotification,
} from "../src/lib/deposit-balance-policy.ts";

const now = new Date("2026-08-12T03:00:00.000Z");
const ended = new Date("2026-08-12T02:59:00.000Z");
const future = new Date("2026-08-12T03:01:00.000Z");

assert.equal(getReservationBalance({ price: 100_000, depositAmount: 30_000, isPaid: false }), 70_000);
assert.equal(getReservationBalance({ price: 100_000, depositAmount: 130_000, isPaid: false }), 0);
assert.equal(getReservationBalance({ price: 100_000, depositAmount: 30_000, isPaid: true }), 0);

const dueReservation = {
  status: "CONFIRMED",
  isNoShow: false,
  isPaid: false,
  price: 100_000,
  depositAmount: 30_000,
  endTime: ended,
  now,
};
assert.equal(shouldSendDepositBalanceNotification(dueReservation), true);
assert.equal(shouldSendDepositBalanceNotification({ ...dueReservation, endTime: future }), false);
assert.equal(shouldSendDepositBalanceNotification({ ...dueReservation, status: "CANCELLED" }), false);
assert.equal(shouldSendDepositBalanceNotification({ ...dueReservation, isPaid: true }), false);
assert.equal(shouldSendDepositBalanceNotification({ ...dueReservation, depositAmount: 0 }), false);

assert.equal(
  buildDepositBalanceMessage({
    roomName: "머무룸2",
    balance: 70_000,
    template: "{공간} 잔금은 {잔금}원입니다.",
  }),
  "머무룸2 잔금은 70,000원입니다.",
);

const notificationSource = fs.readFileSync(
  new URL("../src/lib/deposit-balance-notifications.ts", import.meta.url),
  "utf8",
);
const claimIndex = notificationSource.indexOf("prisma.customerMessage.create");
const sendIndex = notificationSource.indexOf("await sendReservationSituationMessage");
assert.ok(claimIndex >= 0 && sendIndex > claimIndex, "발송 전에 중복 방지 선점 기록을 생성해야 합니다.");
assert.match(notificationSource, /findUnique\(\{ where: \{ id: reservation\.id \} \}\)/);
assert.match(notificationSource, /excludeAppleWebPush: true/);

console.log("Deposit balance policy tests passed.");
