async function runTests() {
  console.log("=== STARTING INTEGRATION TESTS ===");
  
  // Test 1: Validation failure (query too short)
  try {
    const res = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatText: 'ab' }) // 2 chars, should fail
    });
    const data = await res.json();
    console.log("Test 1 (Short Query): Status =", res.status, "Error =", data.error);
  } catch (err) {
    console.error("Test 1 failed:", err);
  }

  // Test 2: Validation failure (query too long)
  try {
    const res = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatText: 'a'.repeat(101) }) // 101 chars, should fail
    });
    const data = await res.json();
    console.log("Test 2 (Long Query): Status =", res.status, "Error =", data.error);
  } catch (err) {
    console.error("Test 2 failed:", err);
  }

  // Test 3: Successful Query and Search Grounding
  try {
    console.log("Test 3 (Valid Query): Sending request... (This may take a few seconds to run Gemini with search)...");
    const res = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatText: 'Scholarships for single girl child in college' })
    });
    const data = await res.json();
    console.log("Test 3 (Valid Query): Status =", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Test 3 failed:", err);
  }

  // Test 4: Rate Limiting
  console.log("Test 4 (Rate Limiter): Sending 6 rapid requests to test rate limiter...");
  for (let i = 1; i <= 6; i++) {
    try {
      const res = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatText: 'Post office savings scheme details' })
      });
      const data = await res.json();
      console.log(`Request ${i}: Status =`, res.status, res.status === 429 ? "429 RATE LIMITED OK!" : "Allowed");
    } catch (err) {
      console.error(`Request ${i} failed:`, err);
    }
  }

  console.log("=== TESTS COMPLETE ===");
  process.exit(0);
}

runTests();
