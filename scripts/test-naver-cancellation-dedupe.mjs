import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/naver-rpa-sync.ts", import.meta.url), "utf8");

assert.match(
  source,
  /processedEmail\.updateMany\([\s\S]*?reservationId:\s*keptReservationId/,
  "detached cancellation cleanup must re-link processed emails",
);
assert.match(
  source,
  /customerMessage\.updateMany\([\s\S]*?reservationId:\s*keptReservationId/,
  "detached cancellation cleanup must re-link customer messages",
);
assert.match(
  source,
  /removedDetachedPending\s*=\s*await deleteDetachedCancellationPending\([\s\S]*?changed:\s*removedDetachedPending/,
  "already-cancelled canonical reservations must still remove the detached cancellation row",
);

console.log("naver cancellation dedupe regression checks passed");
