export interface PasswordResetEmailConfiguration {
  apiKey: string;
  from: string;
  baseUrl: URL;
}

export class PasswordResetEmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetEmailConfigurationError";
  }
}

export function getPasswordResetEmailConfiguration(): PasswordResetEmailConfiguration {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();

  if (!apiKey || !from || !configuredBaseUrl) {
    throw new PasswordResetEmailConfigurationError(
      "Set RESEND_API_KEY, EMAIL_FROM, and APP_BASE_URL to enable password reset emails.",
    );
  }

  if (/[\r\n]/.test(from)) {
    throw new PasswordResetEmailConfigurationError(
      "EMAIL_FROM contains invalid characters.",
    );
  }

  let baseUrl: URL;

  try {
    baseUrl = new URL(configuredBaseUrl);
  } catch {
    throw new PasswordResetEmailConfigurationError(
      "APP_BASE_URL must be an absolute URL.",
    );
  }

  if (
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.pathname !== "/"
  ) {
    throw new PasswordResetEmailConfigurationError(
      "APP_BASE_URL must be a site origin without a path or credentials.",
    );
  }

  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    throw new PasswordResetEmailConfigurationError(
      "APP_BASE_URL must use HTTPS in production.",
    );
  }

  return { apiKey, from, baseUrl };
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "'",
  };

  return value.replace(/[&<>\"']/g, (character) => entities[character] ?? character);
}

export async function sendPasswordResetEmail(
  configuration: PasswordResetEmailConfiguration,
  email: string,
  token: string,
) {
  const resetUrl = new URL("/reset-password", configuration.baseUrl);
  resetUrl.searchParams.set("token", token);

  const escapedUrl = escapeHtml(resetUrl.toString());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuration.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: configuration.from,
      to: [email],
      subject: "Reset your TOQAEE password",
      text:
        `We received a request to reset your TOQAEE password. ` +
        `Use this link within 30 minutes: ${resetUrl.toString()}\n\n` +
        `If you did not request this, you can safely ignore this email.`,

      html: `
        <p>We received a request to reset your TOQAEE password.</p>
        <p>
          <a href="${escapedUrl}">
            Reset your password
          </a>
        </p>
        <p>
          This link expires in 30 minutes.
        </p>
        <p>
          If you did not request this, you can safely ignore this email.
        </p>
      `,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Password reset email provider returned HTTP ${response.status}.`,
    );
  }
}