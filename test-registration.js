import fetch from 'node-fetch'; // If node-fetch is not available, I'll use native fetch if node version allows it, or I'll just use a simple http request.
// Wait, I can just use a simple script that works in this environment.

async function test() {
  const baseUrl = 'http://localhost:3000/api/events';
  
  console.log('--- Registering for event ---');
  const regResponse = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test User',
      phoneNumber: '0912345678',
      department: 'Computer Science',
      yearOfStudy: '3',
      eventTitle: 'Summer Mission'
    })
  });
  const regData = await regResponse.json();
  console.log('Registration Response:', JSON.stringify(regData, null, 2));

  console.log('\n--- Fetching all registrations ---');
  const allRegsResponse = await fetch(`${baseUrl}/registrations`);
  const allRegsData = await allRegsResponse.json();
  console.log('All Registrations:', JSON.stringify(allRegsData, null, 2));

  console.log('\n--- Fetching registrations for "Summer Mission" ---');
  const eventRegsResponse = await fetch(`${baseUrl}/registrations/Summer Mission`);
  const eventRegsData = await eventRegsResponse.json();
  console.log('Event Registrations:', JSON.stringify(eventRegsData, null, 2));
}

test().catch(console.error);
