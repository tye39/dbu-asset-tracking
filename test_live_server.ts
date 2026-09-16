async function runLiveTests() {
  console.log("================================================================================");
  console.log("                 RUNNING LIVE DEV SERVER RBAC & AUTH TESTS                      ");
  console.log("================================================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Verify Login Page
  const loginRes = await fetch(`${baseUrl}/login`);
  console.log(`[TEST 1] GET /login -> HTTP ${loginRes.status} (${loginRes.status === 200 ? "PASSED" : "FAILED"})`);

  // Define test accounts
  const testAccounts = [
    { role: "SYSTEM_ADMINISTRATOR", email: "admin@dbu.edu.et", password: "Password123", expectedDashboard: "/admin/dashboard" },
    { role: "PROPERTY_ADMINISTRATION_OFFICER", email: "pao@dbu.edu.et", password: "Password123", expectedDashboard: "/pao/dashboard" },
    { role: "DEPARTMENT_HEAD", email: "head@dbu.edu.et", password: "Password123", expectedDashboard: "/head/dashboard" },
    { role: "STAFF_MEMBER", email: "staff@dbu.edu.et", password: "Password123", expectedDashboard: "/staff/dashboard" },
    { role: "MAINTENANCE_TECHNICIAN", email: "tech@dbu.edu.et", password: "Password123", expectedDashboard: "/tech/dashboard" },
    { role: "INTERNAL_AUDITOR", email: "auditor@dbu.edu.et", password: "Password123", expectedDashboard: "/auditor/dashboard" },
    { role: "INVENTORY_PERSON", email: "inventory@dbu.edu.et", password: "Password123", expectedDashboard: "/inventory" },
  ];

  let allLoginsPassed = true;
  const sessions: Record<string, string> = {};

  for (const acc of testAccounts) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[TEST ROLE] ${acc.role} (${acc.email})`);
    console.log(`--------------------------------------------------------------------------------`);

    // Fetch fresh CSRF token
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
    const setCookies = csrfRes.headers.getSetCookie();
    const csrfCookie = setCookies.find(c => c.startsWith("authjs.csrf-token="));
    const csrfCookieVal = csrfCookie ? csrfCookie.split(";")[0] : "";
    const { csrfToken } = await csrfRes.json();

    const params = new URLSearchParams();
    params.append("email", acc.email);
    params.append("password", acc.password);
    params.append("csrfToken", csrfToken);
    params.append("redirectTo", "/");

    // Authenticate
    const authRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": csrfCookieVal
      },
      body: params.toString()
    });

    const authSetCookies = authRes.headers.getSetCookie();
    const sessionCookie = authSetCookies.find(c => c.startsWith("authjs.session-token="));
    const sessionCookieVal = sessionCookie ? sessionCookie.split(";")[0] : "";

    if (!sessionCookieVal) {
      console.log(`❌ FAILED: No session token received for ${acc.email}. Status: ${authRes.status}`);
      allLoginsPassed = false;
      continue;
    }

    sessions[acc.role] = sessionCookieVal;

    // Follow redirect to root path "/" to test role-based destination resolution
    const rootRes = await fetch(`${baseUrl}/`, {
      redirect: "manual",
      headers: {
        "Cookie": sessionCookieVal
      }
    });

    const redirectLocation = rootRes.headers.get("location");
    const redirectUrl = redirectLocation ? new URL(redirectLocation, baseUrl).pathname : "NONE";

    const isMatch = redirectUrl === acc.expectedDashboard;
    console.log(`- Authenticated Session Created: YES`);
    console.log(`- Target Dashboard Redirect:    ${redirectUrl}`);
    console.log(`- Expected Dashboard:           ${acc.expectedDashboard}`);
    console.log(`- Result:                       ${isMatch ? "✅ PASSED (CORRECT DASHBOARD)" : "❌ FAILED"}`);

    if (!isMatch) allLoginsPassed = false;
  }

  // 3. Test Unauthorized Access (RBAC Protection)
  console.log(`\n================================================================================`);
  console.log(`                  TESTING RBAC ROUTE PROTECTION (STEP 13)                       `);
  console.log(`================================================================================\n`);

  const staffCookie = sessions["STAFF_MEMBER"];
  let allRbacPassed = true;

  if (staffCookie) {
    const forbiddenPaths = ["/admin/dashboard", "/pao/dashboard", "/inventory"];
    for (const path of forbiddenPaths) {
      const res = await fetch(`${baseUrl}${path}`, {
        redirect: "manual",
        headers: { "Cookie": staffCookie }
      });
      const location = res.headers.get("location");
      const redirectedPath = location ? new URL(location, baseUrl).pathname : "ALLOWED";
      const blocked = redirectedPath === "/staff/dashboard" || res.status === 403;
      console.log(`- Staff Member accessing "${path}":`);
      console.log(`  Redirected to: ${redirectedPath} (Status: ${res.status})`);
      console.log(`  Access Blocked: ${blocked ? "✅ YES (PROTECTED)" : "❌ NO (SECURITY LEAK)"}`);
      if (!blocked) allRbacPassed = false;
    }
  }

  // Test unauthenticated access to admin
  const unauthRes = await fetch(`${baseUrl}/admin/dashboard`, { redirect: "manual" });
  const unauthLocation = unauthRes.headers.get("location");
  const unauthPath = unauthLocation ? new URL(unauthLocation, baseUrl).pathname : "NONE";
  console.log(`\n- Unauthenticated user accessing "/admin/dashboard":`);
  console.log(`  Redirected to: ${unauthPath} (Status: ${unauthRes.status})`);
  console.log(`  Protected:     ${unauthPath === "/login" ? "✅ YES" : "❌ NO"}`);
  if (unauthPath !== "/login") allRbacPassed = false;

  console.log(`\n================================================================================`);
  console.log(`SUMMARY:`);
  console.log(`- ALL 7 ROLE LOGIN & REDIRECTS: ${allLoginsPassed ? "✅ ALL PASSED" : "❌ FAILED"}`);
  console.log(`- RBAC ROUTE PROTECTION:        ${allRbacPassed ? "✅ ALL PASSED" : "❌ FAILED"}`);
  console.log(`================================================================================\n`);
}

runLiveTests().catch(console.error);
