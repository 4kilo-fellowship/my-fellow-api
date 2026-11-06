import assert from "node:assert/strict";
import test from "node:test";
import { JamiService } from "../src/services/jami.service.js";
import { paymentInitSchema } from "../src/validators/payment.validator.js";

test("JamiService normalizes Ethiopian phone numbers accurately", () => {
  const service = new JamiService();

  assert.equal(service.normalizeEthiopianPhone("0912345678"), "251912345678");
  assert.equal(service.normalizeEthiopianPhone("912345678"), "251912345678");
  assert.equal(service.normalizeEthiopianPhone("+251912345678"), "251912345678");
  assert.equal(service.normalizeEthiopianPhone("0712345678"), "251712345678");
  assert.equal(service.normalizeEthiopianPhone("712345678"), "251712345678");
  assert.equal(service.normalizeEthiopianPhone("251912345678"), "251912345678");
  assert.equal(service.normalizeEthiopianPhone(undefined), undefined);
});

test("paymentInitSchema validates giving inputs and enforces bounds", () => {
  // Valid payload
  const valid = paymentInitSchema.parse({
    amount: 100,
    email: "student@aau.edu.et",
    phone: "0911223344",
  });
  assert.equal(valid.amount, 100);
  assert.equal(valid.reason, "Donation");

  // Rejects non-positive or sub-1 ETB amounts
  assert.throws(() => {
    paymentInitSchema.parse({
      amount: 0,
      email: "test@example.com",
    });
  });

  // Rejects invalid email if provided
  assert.throws(() => {
    paymentInitSchema.parse({
      amount: 50,
      email: "not-an-email",
    });
  });

  // Accepts payload without email (optional)
  const withoutEmail = paymentInitSchema.parse({
    amount: 150,
  });
  assert.equal(withoutEmail.amount, 150);
  assert.equal(withoutEmail.email, undefined);
});
