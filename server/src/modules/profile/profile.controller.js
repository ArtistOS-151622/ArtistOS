import * as profileService from "#src/modules/profile/profile.service.js"
import { setSessionCookie } from "#src/utils/cookies.js"

export async function getProfile(req, res) {
  res.json(await profileService.getProfile(req.artist.id))
}

export async function updateProfile(req, res) {
  const { token, body } = await profileService.updateProfile(req.artist.id, req.body)
  setSessionCookie(res, token)
  res.json(body)
}
