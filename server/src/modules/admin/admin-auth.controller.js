import * as adminAuthService from "#src/modules/admin/admin-auth.service.js"
import { clearAdminCookie, setAdminCookie } from "#src/utils/cookies.js"
import { bodyOf } from "#src/utils/request.js"

export function login(req, res) {
  // req.ip honours X-Forwarded-For through Render's proxy (trust proxy is set).
  setAdminCookie(res, adminAuthService.login(req.ip ?? "unknown", bodyOf(req).password))
  res.json({ success: true })
}

export function logout(_req, res) {
  clearAdminCookie(res)
  res.json({ success: true })
}
