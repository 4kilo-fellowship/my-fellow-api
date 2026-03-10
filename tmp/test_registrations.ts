import axios from "axios";

const BASE_URL = "http://localhost:5000/api/admin";
const TOKEN = "YOUR_ADMIN_TOKEN_HERE"; // You need to provide a valid token for testing

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
  },
});

async function testRegistrations() {
  try {
    console.log("--- Testing Pagination ---");
    const paginatedRes = await api.get("/registrations?page=1&limit=5");
    console.log("Pagination Result:", {
      count: paginatedRes.data.data.length,
      pagination: paginatedRes.data.pagination,
    });

    console.log("\n--- Testing Search (User Name) ---");
    // Replace with a name that exists in your DB
    const searchRes = await api.get("/registrations?search=Admin");
    console.log("Search Result:", {
      count: searchRes.data.data.length,
      firstMatch: searchRes.data.data[0]?.user?.fullName,
    });

    console.log("\n--- Testing Search (Event Title) ---");
    // Replace with an event title that exists in your DB
    const eventSearchRes = await api.get("/registrations?search=Prayer");
    console.log("Event Search Result:", {
      count: eventSearchRes.data.data.length,
      firstMatch: eventSearchRes.data.data[0]?.event?.title,
    });
  } catch (error: any) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

// Note: To run this, you need a running server and a valid token.
// Since I cannot run a full server here, I'll provide this as a reference script.
console.log(
  "Verification script prepared. Run with 'ts-node tmp/test_registrations.ts' if you have a running environment.",
);
// testRegistrations();
