import "dotenv/config";

async function testLogin(email: string) {
  const baseUrl = "http://localhost:3000";
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const setCookies = csrfRes.headers.getSetCookie();
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = setCookies.find(c => c.includes(csrfToken)) || setCookies[setCookies.length - 1];
  const csrfCookieVal = csrfCookie.split(";")[0];

  const params = new URLSearchParams();
  params.append("email", email);
  params.append("password", "Password123");
  params.append("csrfToken", csrfToken);
  params.append("redirectTo", "/");

  const authRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookieVal
    },
    body: params.toString()
  });

  console.log(`[${email}] status:`, authRes.status, "location:", authRes.headers.get("location"));
}

async function run() {
  await testLogin("admin@dbu.edu.et");
  await testLogin("pao@dbu.edu.et");
  await testLogin("head@dbu.edu.et");
  await testLogin("inventory@dbu.edu.et");
  await testLogin("auditor@dbu.edu.et");
}

run();
