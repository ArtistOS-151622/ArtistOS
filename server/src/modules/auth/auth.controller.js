import * as authService from "#src/modules/auth/auth.service.js"
import { clearSessionCookie, setSessionCookie } from "#src/utils/cookies.js"

export async function sendOtp(req, res) {
  res.json(await authService.sendOtp(req.body.phone))
}

export async function verifyOtp(req, res) {
  const { token, body } = await authService.verifyOtp(req.body.phone, req.body.otp)
  if (token) setSessionCookie(res, token)
  res.json(body)
}

export async function registerProfile(req, res) {
  const { token, body } = await authService.registerProfile(req.body)
  setSessionCookie(res, token)
  res.json(body)
}

export function logout(_req, res) {
  clearSessionCookie(res)
  res.json({ success: true })
}

export async function me(req, res) {
  res.json(await authService.getCurrentUser(req.artist))
}
