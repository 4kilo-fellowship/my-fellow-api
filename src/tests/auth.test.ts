import request from "supertest";
import app from "../app.js";

describe("POST /api/auth/signin", () => {
  it("should return 400 if body is empty", async () => {
    const res = await request(app).post("/api/auth/signin").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if phoneNumber is missing", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
