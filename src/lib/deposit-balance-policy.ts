export function normalizeMoneyAmount(value: unknown) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

export const DEFAULT_DEPOSIT_BALANCE_MESSAGE = [
  "[잔금 안내]",
  "안녕하세요. 머무룸입니다.",
  "{공간} 이용 후 남은 결제금액은 {잔금}원입니다.",
  "확인 후 결제 부탁드립니다.",
].join("\n");

export function getReservationBalance(input: {
  price: unknown;
  depositAmount: unknown;
  isPaid: boolean;
}) {
  if (input.isPaid) return 0;
  const price = normalizeMoneyAmount(input.price);
  const depositAmount = Math.min(price, normalizeMoneyAmount(input.depositAmount));
  return Math.max(0, price - depositAmount);
}

export function shouldSendDepositBalanceNotification(input: {
  status: string;
  isNoShow: boolean;
  isPaid: boolean;
  price: unknown;
  depositAmount: unknown;
  endTime: Date;
  now: Date;
}) {
  return input.status === "CONFIRMED"
    && !input.isNoShow
    && input.endTime.getTime() <= input.now.getTime()
    && normalizeMoneyAmount(input.depositAmount) > 0
    && getReservationBalance(input) > 0;
}

export function buildDepositBalanceMessage(input: {
  roomName: string;
  balance: number;
  template?: string | null;
}) {
  const balance = input.balance.toLocaleString("ko-KR");
  return (input.template?.trim() || DEFAULT_DEPOSIT_BALANCE_MESSAGE)
    .replaceAll("{{공간}}", input.roomName)
    .replaceAll("{공간}", input.roomName)
    .replaceAll("{{잔금}}", balance)
    .replaceAll("{잔금}", balance);
}
