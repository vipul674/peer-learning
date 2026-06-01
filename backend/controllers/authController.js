import { env } from "../config.js";

const normalizeConfiguredUrl = (value) => {
  const parsed = new URL(value);
  return parsed.toString().replace(/\/$/, "");
};

export const buildFrontendBaseUrl = () => {
  const configuredBaseUrl =
    env.PASSWORD_RESET_BASE_URL || env.FRONTEND_URL || env.CLIENT_URL;

  if (configuredBaseUrl) {
    return normalizeConfiguredUrl(configuredBaseUrl);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PASSWORD_RESET_BASE_URL or FRONTEND_URL must be configured in production for password reset links."
    );
  }

  return "http://localhost:5173";
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  buildFrontendBaseUrl();
  res.json({ message: `Password reset link sent to ${email}` });
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  res.json({ message: `Password reset successful for token ${token}` });
};
