import { NextResponse } from "next/server"

import {
  clearFailedLogins,
  getClientIp,
  isAdminPasswordValid,
  isLoginRateLimited,
  recordFailedLogin,
} from "@/lib/auth/admin"
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminToken,
} from "@/lib/auth/session"

export async function POST(request: Request) {
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedPassword) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 })
  }

  const ip = getClientIp(request)
  if (isLoginRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please try again later." },
      { status: 429 }
    )
  }

  let password: unknown
  try {
    password = ((await request.json()) as { password?: unknown })?.password
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  if (!isAdminPasswordValid(password, expectedPassword)) {
    recordFailedLogin(ip)
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  clearFailedLogins(ip)

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
  return response
}
