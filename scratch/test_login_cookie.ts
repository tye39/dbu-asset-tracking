import "dotenv/config";

async function testLogin() {
  const baseUrl = "http://localhost:3000";
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const setCookies = csrfRes.headers.getSetCookie();
  const { csrfToken } = await csrfRes.json();

  // Find the exact matching csrf cookie
  const csrfCookie = setCookies.find(c => c.includes(csrfToken)) || setCookies[setCookies.length - 1];
  const csrfCookieVal = csrfCookie.split(";")[0];

  const params = new URLSearchParams();
  params.append("email", "admin@dbu.edu.et");
  params.append("password", "Password123");
  params.append("csrfToken", csrfToken);
  params.append("redirectTo", "/admin/dashboard");

  const authRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookieVal
    },
    body: params.toString()
  });

  console.log("Auth response status:", authRes.status);
  console.log("Auth response headers location:", authRes.headers.get("location"));
  console.log("Auth response set-cookies:", authRes.headers.getSetCookie());
}

testLogin().catch(console.error);
