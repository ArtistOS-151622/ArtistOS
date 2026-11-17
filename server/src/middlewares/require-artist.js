import { ARTIST_SESSION_COOKIE } from "#src/config/constants.js"
import { unauthorized } from "#src/utils/api-error.js"
import { getAllCookieValues } from "#src/utils/cookies.js"
import { verifyArtistToken } from "#src/utils/session-token.js"

function bearerToken(req) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ")
  return scheme?.toLowerCase() === "bearer" && token ? token : null
}

/** Resolves the artist from a Bearer token or any `artist_session` cookie value, else null. */
export function getArtistSession(req) {
  const candidates = [bearerToken(req), ...getAllCookieValues(req.headers.cookie, ARTIST_SESSION_COOKIE)]
  for (const token of candidates) {
    const session = token && verifyArtistToken(token)
    if (session) return session
  }
  return null
}

/** Requires a logged-in artist; sets `req.artist`. */
export function requireArtist(req, _res, next) {
  const artist = getArtistSession(req)
  if (!artist) return next(unauthorized())
  req.artist = artist
  next()
}
