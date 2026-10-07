import assert from "node:assert/strict"
import test from "node:test"
import { isTestUser, TEST_USER_OTP } from "../lib/auth/otp.ts"
import { checkIsReadOnly } from "../lib/auth/subscription.ts"
import { getUserPlanFeatures, PRO_STORAGE_BYTES } from "../lib/auth/plan-features.ts"

test("TEST_USER_OTP is fixed to 123456", () => {
  assert.equal(TEST_USER_OTP, "123456")
})

test("isTestUser correctly queries users table for is_test_user flag", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                if (val === "9876543210") return { data: { is_test_user: true }, error: null }
                if (val === "1111111111") return { data: { is_test_user: false }, error: null }
                return { data: null, error: null }
              },
            }),
          }),
        }
      }
      return {}
    },
  } as any

  assert.equal(await isTestUser("9876543210", mockSupabase), true)
  assert.equal(await isTestUser("+91 9876543210", mockSupabase), true)
  assert.equal(await isTestUser("1111111111", mockSupabase), false)
  assert.equal(await isTestUser("0000000000", mockSupabase), false)
})

test("checkIsReadOnly: free user bypasses read-only mode without subscription", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 60 * 86400000).toISOString(), is_free_user: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    },
  } as any

  const isReadOnly = await checkIsReadOnly(mockSupabase, 99)
  assert.equal(isReadOnly, false)
})

test("test user without is_free_user has general user plan features, while free user has full unlimited access", async () => {
  // Free User
  const mockSupabaseFree = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date().toISOString(), is_free_user: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    },
  } as any

  const freeFeatures = await getUserPlanFeatures(mockSupabaseFree, 1)
  assert.equal(freeFeatures.planTier, "free")
  assert.equal(freeFeatures.hasWhatsAppAutomation, true)
  assert.equal(freeFeatures.storageQuotaBytes, PRO_STORAGE_BYTES)
  assert.equal(freeFeatures.storageQuotaMb, 100)
  assert.equal(freeFeatures.isReadOnly, false)

  // Test User (not free) -> behaves as general user
  const mockSupabaseTestOnly = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date().toISOString(), is_free_user: false },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "user_subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    },
  } as any

  const testUserFeatures = await getUserPlanFeatures(mockSupabaseTestOnly, 2)
  assert.equal(testUserFeatures.planTier, "trial")
  assert.equal(testUserFeatures.hasWhatsAppAutomation, false)
})
