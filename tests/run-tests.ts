import assert from 'assert';
import http from 'http';
import { app, initializeServer } from '../src/server/app.ts';
import axios from 'axios';

async function runTestSuite() {
  console.log('--- STARTING SUPPORTFLOW AUTOMATED TEST SUITE ---');

  await initializeServer();

  // Start test server on random port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;

  console.log(`Test server running at ${baseUrl}`);

  const ts = Date.now();
  const adminEmail = `admin.${ts}@internal.test`;
  const agentEmail = `agent.${ts}@internal.test`;
  const req1Email = `requester1.${ts}@internal.test`;
  const req2Email = `requester2.${ts}@internal.test`;
  const testPassword = 'Password123!';

  let adminToken = '';
  let adminId = 0;
  let agentToken = '';
  let agentId = 0;
  let req1Token = '';
  let req1Id = 0;
  let req2Token = '';
  let testTicketId = 0;

  try {
    // SETUP: Register test accounts
    console.log('Setup: Registering test users for verification...');
    const regAdmin = await axios.post(`${baseUrl}/auth/register`, {
      name: 'Test Administrator',
      email: adminEmail,
      password: testPassword,
      role: 'ADMIN',
    });
    adminToken = regAdmin.data.token;
    adminId = regAdmin.data.user.id;

    const regAgent = await axios.post(`${baseUrl}/auth/register`, {
      name: 'Test Support Agent',
      email: agentEmail,
      password: testPassword,
      role: 'SUPPORT_AGENT',
    });
    agentToken = regAgent.data.token;
    agentId = regAgent.data.user.id;

    const regReq1 = await axios.post(`${baseUrl}/auth/register`, {
      name: 'Test Requester 1',
      email: req1Email,
      password: testPassword,
      role: 'REQUESTER',
    });
    req1Token = regReq1.data.token;
    req1Id = regReq1.data.user.id;

    const regReq2 = await axios.post(`${baseUrl}/auth/register`, {
      name: 'Test Requester 2',
      email: req2Email,
      password: testPassword,
      role: 'REQUESTER',
    });
    req2Token = regReq2.data.token;
    console.log('✓ PASS: User registration and token creation works.');

    // TEST 1: Login works
    console.log('Testing 1: Login works...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: adminEmail,
      password: testPassword,
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token, 'Token must be present in login response');
    console.log('✓ PASS: Login works.');

    // TEST 2: Unauthenticated API requests return 401
    console.log('Testing 2: Unauthenticated requests return 401...');
    try {
      await axios.get(`${baseUrl}/tickets`);
      assert.fail('Should have thrown 401');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 401);
      console.log('✓ PASS: Unauthenticated API requests return 401.');
    }

    // TEST 3: Requester creates a ticket
    console.log('Testing 3: Requester can create a ticket...');
    const createRes = await axios.post(
      `${baseUrl}/tickets`,
      {
        subject: 'Database connection pool timeout during scheduled export',
        description: 'Nightly batch sync stalled with connection acquisition timeout on pool.',
        category: 'Performance',
        priority: 'HIGH',
        tryingToDo: 'Execute batch warehouse export',
        expectedResult: 'Export completes within 30 seconds',
        actualResult: 'Timeout exception thrown at record 5000',
        errorMessage: 'ConnectionPoolTimeoutException: pool exhausted',
      },
      {
        headers: { Authorization: `Bearer ${req1Token}` },
      }
    );
    assert.strictEqual(createRes.status, 201);
    assert.ok(createRes.data.ticket.ticketNumber.startsWith('SF-'));
    testTicketId = createRes.data.ticket.id;
    console.log(`✓ PASS: Requester created ticket #${testTicketId} (${createRes.data.ticket.ticketNumber}).`);

    // TEST 4: Requester cannot access another user's ticket (403)
    console.log("Testing 4: Requester cannot access another user's ticket...");
    try {
      await axios.get(`${baseUrl}/tickets/${testTicketId}`, {
        headers: { Authorization: `Bearer ${req2Token}` },
      });
      assert.fail('Requester 2 should not be able to view Requester 1 ticket');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 403);
      console.log("✓ PASS: Requester data isolation enforced (403 Forbidden).");
    }

    // TEST 5: Admin opens ticket and assigns to Agent
    console.log('Testing 5: Admin can assign ticket to an agent...');
    const assignRes = await axios.patch(
      `${baseUrl}/tickets/${testTicketId}/assign`,
      { assigneeId: agentId },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.data.ticket.assigneeId, agentId);
    console.log('✓ PASS: Admin assigned ticket to agent.');

    // TEST 6: Assigned user sees ticket in My Work
    console.log('Testing 6: Assigned user sees it in My Work (assignee=me)...');
    const myWorkRes = await axios.get(`${baseUrl}/tickets?assignee=me`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert.strictEqual(myWorkRes.status, 200);
    const hasTicketInMyWork = myWorkRes.data.tickets.some((t: any) => t.id === testTicketId);
    assert.ok(hasTicketInMyWork, 'Ticket must be returned in My Work queue');
    console.log('✓ PASS: Assigned ticket appears in agent My Work.');

    // TEST 7: Assigned user changes status OPEN -> IN_PROGRESS
    console.log('Testing 7: Status transition OPEN -> IN_PROGRESS persists...');
    const inProgressRes = await axios.patch(
      `${baseUrl}/tickets/${testTicketId}/status`,
      { status: 'IN_PROGRESS', comment: 'Investigating query traces and active handles.' },
      { headers: { Authorization: `Bearer ${agentToken}` } }
    );
    assert.strictEqual(inProgressRes.status, 200);
    assert.strictEqual(inProgressRes.data.ticket.status, 'IN_PROGRESS');

    // Refresh ticket and verify persistence
    const refreshedTicket = await axios.get(`${baseUrl}/tickets/${testTicketId}`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert.strictEqual(refreshedTicket.data.ticket.status, 'IN_PROGRESS');
    console.log('✓ PASS: Status transition OPEN -> IN_PROGRESS persisted after refresh.');

    // TEST 8: Assigned user changes IN_PROGRESS -> RESOLVED
    console.log('Testing 8: Status transition IN_PROGRESS -> RESOLVED persists...');
    const resolvedRes = await axios.patch(
      `${baseUrl}/tickets/${testTicketId}/status`,
      { status: 'RESOLVED', comment: 'Applied connection pool size bump and release fix.' },
      { headers: { Authorization: `Bearer ${agentToken}` } }
    );
    assert.strictEqual(resolvedRes.status, 200);
    assert.strictEqual(resolvedRes.data.ticket.status, 'RESOLVED');
    console.log('✓ PASS: Status transition IN_PROGRESS -> RESOLVED succeeded.');

    // TEST 9: History reflects the status changes and assignments
    console.log('Testing 9: History audit trail reflects events...');
    const historyDetail = await axios.get(`${baseUrl}/tickets/${testTicketId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const events = historyDetail.data.history;
    assert.ok(events.length >= 3, 'Must have at least CREATED, ASSIGNED, STATUS_CHANGED events');
    const hasAssignedEvent = events.some((e: any) => e.eventType === 'ASSIGNED');
    const hasStatusEvent = events.some((e: any) => e.eventType === 'STATUS_CHANGED');
    assert.ok(hasAssignedEvent, 'ASSIGNED event must exist in history');
    assert.ok(hasStatusEvent, 'STATUS_CHANGED event must exist in history');
    console.log('✓ PASS: Ticket history timeline tracks all audit events.');

    // TEST 10: Admin can reassign or unassign ticket
    console.log('Testing 10: Admin can reassign or unassign ticket...');
    const unassignRes = await axios.patch(
      `${baseUrl}/tickets/${testTicketId}/assign`,
      { assigneeId: null },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert.strictEqual(unassignRes.status, 200);
    assert.strictEqual(unassignRes.data.ticket.assigneeId, null);

    // Reassign back to agent
    await axios.patch(
      `${baseUrl}/tickets/${testTicketId}/assign`,
      { assigneeId: agentId },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ PASS: Admin can unassign and reassign ticket.');

    // TEST 11: Profile endpoint loads without 404
    console.log('Testing 11: Profile endpoint /users/profile loads without 404...');
    const profileRes = await axios.get(`${baseUrl}/users/profile`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.data.user.id, agentId);
    assert.ok(profileRes.data.stats, 'Profile stats must be returned');
    assert.strictEqual(typeof profileRes.data.stats.assignedCount, 'number');
    console.log('✓ PASS: Profile page endpoint loads without 404 and displays real DB stats.');

    // TEST 12: Dashboard counts reflect real database data
    console.log('Testing 12: Dashboard summary reflects real database data...');
    const dashRes = await axios.get(`${baseUrl}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(dashRes.status, 200);
    assert.ok(dashRes.data.summary.total >= 1, 'Total tickets count must reflect created ticket');
    assert.strictEqual(typeof dashRes.data.summary.open, 'number');
    assert.strictEqual(typeof dashRes.data.summary.resolved, 'number');
    console.log('✓ PASS: Dashboard counts reflect real database records.');

    // TEST 13: Invalid attachments rejected
    console.log('Testing 13: Invalid attachments are rejected with clear error...');
    try {
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const fakeBody = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="virus.exe"\r\nContent-Type: application/x-msdownload\r\n\r\nfake-payload\r\n--${boundary}--\r\n`;

      await axios.post(`${baseUrl}/tickets/${testTicketId}/attachments`, fakeBody, {
        headers: {
          Authorization: `Bearer ${agentToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
      });
      assert.fail('Should reject invalid file type');
    } catch (err: any) {
      assert.ok(err.response?.status >= 400);
      console.log('✓ PASS: Invalid attachments (.exe) rejected.');
    }

    // TEST 14: Gemini AI summary succeeds with structured output
    console.log('Testing 14: Gemini AI summary produces structured output...');
    const aiSuccessRes = await axios.post(
      `${baseUrl}/tickets/${testTicketId}/ai-summary`,
      {},
      { headers: { Authorization: `Bearer ${agentToken}` } }
    );
    assert.strictEqual(aiSuccessRes.status, 200);
    assert.strictEqual(aiSuccessRes.data.success, true);
    assert.ok(aiSuccessRes.data.summary.issueSummary, 'issueSummary must be present');
    assert.ok(aiSuccessRes.data.summary.impact, 'impact must be present');
    assert.ok(
      Array.isArray(aiSuccessRes.data.summary.suggestedTroubleshootingSteps),
      'suggestedTroubleshootingSteps must be array'
    );
    console.log('✓ PASS: Gemini AI summary succeeds and returns structured summary.');

    // TEST 15: AI failure produces 503 without breaking ticket
    console.log('Testing 15: AI failure returns 503 and does not break ticket...');
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'invalid-test-key';
    let failedAsExpected = false;
    try {
      await axios.post(
        `${baseUrl}/tickets/${testTicketId}/ai-summary`,
        {},
        { headers: { Authorization: `Bearer ${agentToken}` } }
      );
    } catch (err: any) {
      if (err.name === 'AssertionError') throw err;
      failedAsExpected = true;
      assert.strictEqual(err.response?.status, 503);
      assert.strictEqual(err.response?.data?.success, false);
      assert.ok(err.response?.data?.message?.includes('AI summary is temporarily unavailable'));
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
    assert.ok(failedAsExpected, 'Must return 503 error when AI fails');

    const intactTicket = await axios.get(`${baseUrl}/tickets/${testTicketId}`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert.strictEqual(intactTicket.data.ticket.id, testTicketId);
    console.log('✓ PASS: AI failure returns 503 and preserves ticket.');

    console.log('\n=============================================');
    console.log('ALL 15 INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================\n');
  } finally {
    server.close();
  }
}

runTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
