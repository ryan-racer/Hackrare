/**
 * Auth0 Management API client
 *
 * Requires a Machine-to-Machine application in Auth0 with scopes:
 *   create:users  create:user_tickets  read:users  update:users
 *
 * Set in .env:
 *   AUTH0_MANAGEMENT_CLIENT_ID     (M2M app client ID)
 *   AUTH0_MANAGEMENT_CLIENT_SECRET (M2M app client secret)
 *   AUTH0_DOMAIN                   (already set)
 *   APP_BASE_URL                   (already set)
 */

// Cache the management token in-process (expires after ~23h)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getManagementToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const domain = process.env.AUTH0_DOMAIN!;
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID!;
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!;

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth0 Management token error: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

/**
 * Create (or find) a user in Auth0 via the Management API.
 * Returns the Auth0 user_id.
 */
export async function createAuth0User(email: string, name: string): Promise<string> {
  const domain = process.env.AUTH0_DOMAIN!;
  const token = await getManagementToken();

  // Check if user already exists
  const searchRes = await fetch(
    `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (searchRes.ok) {
    const users = await searchRes.json() as Array<{ user_id: string }>;
    if (users.length > 0) return users[0].user_id;
  }

  // Create new user with a random temporary password
  const tempPassword = `Tmp_${Math.random().toString(36).slice(2, 10)}!1A`;
  const createRes = await fetch(`https://${domain}/api/v2/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connection: "Username-Password-Authentication",
      email,
      name,
      password: tempPassword,
      email_verified: false,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Auth0 create user error: ${err}`);
  }

  const user = await createRes.json() as { user_id: string };
  return user.user_id;
}

/**
 * Generate a password-change ticket for the given Auth0 user_id.
 * Auth0 will send the "Set up your password" email automatically.
 * Returns the ticket URL (can also be shown in the UI as a fallback).
 */
export async function sendPasswordSetupEmail(
  auth0UserId: string
): Promise<string> {
  const domain = process.env.AUTH0_DOMAIN!;
  const token = await getManagementToken();
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const res = await fetch(`https://${domain}/api/v2/tickets/password-change`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: auth0UserId,
      result_url: `${appBaseUrl}/auth/login`,
      mark_email_as_verified: true,
      ttl_sec: 604800, // 7 days
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth0 password ticket error: ${err}`);
  }

  const data = await res.json() as { ticket: string };
  return data.ticket;
}

/** Returns true if Management API credentials are configured */
export function managementApiConfigured(): boolean {
  return !!(
    process.env.AUTH0_MANAGEMENT_CLIENT_ID &&
    process.env.AUTH0_MANAGEMENT_CLIENT_SECRET
  );
}
