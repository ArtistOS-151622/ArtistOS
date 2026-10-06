import test from "node:test"
import assert from "node:assert/strict"
import { getUserPlanFeatures, PRO_STORAGE_BYTES, STARTER_STORAGE_BYTES } from "../lib/auth/plan-features.ts"

test("getUserPlanFeatures: identifies test user with Pro features", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date().toISOString(), is_test_user: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    },
  } as any

  const features = await getUserPlanFeatures(mockSupabase, 101)
  assert.equal(features.planTier, "test")
  assert.equal(features.hasWhatsAppAutomation, true)
  assert.equal(features.storageQuotaBytes, PRO_STORAGE_BYTES)
  assert.equal(features.storageQuotaMb, 100)
  assert.equal(features.isReadOnly, false)
})

test("getUserPlanFeatures: Starter plan has 10 MB and NO WhatsApp automation", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 40 * 86400000).toISOString(), is_test_user: false },
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
                    maybeSingle: async () => ({
                      data: {
                        id: 1,
                        status: "active",
                        next_billing_at: new Date(Date.now() + 15 * 86400000).toISOString(),
                        platform_subscriptions: {
                          id: 1,
                          name: "Starter",
                          amount_inr: 299,
                          billing_period: "/month",
                          has_whatsapp_automation: false,
                          storage_quota_mb: 10,
                        },
                      },
                      error: null,
                    }),
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

  const features = await getUserPlanFeatures(mockSupabase, 102)
  assert.equal(features.planTier, "starter")
  assert.equal(features.planName, "Starter")
  assert.equal(features.hasWhatsAppAutomation, false)
  assert.equal(features.storageQuotaBytes, STARTER_STORAGE_BYTES)
  assert.equal(features.storageQuotaMb, 10)
  assert.equal(features.isReadOnly, false)
  assert.equal(features.hasActiveSub, true)
})

test("getUserPlanFeatures: Pro plan has 100 MB and WhatsApp automation", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 40 * 86400000).toISOString(), is_test_user: false },
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
                    maybeSingle: async () => ({
                      data: {
                        id: 2,
                        status: "active",
                        next_billing_at: new Date(Date.now() + 20 * 86400000).toISOString(),
                        platform_subscriptions: {
                          id: 5,
                          name: "Pro",
                          amount_inr: 599,
                          billing_period: "/month",
                          has_whatsapp_automation: true,
                          storage_quota_mb: 100,
                        },
                      },
                      error: null,
                    }),
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

  const features = await getUserPlanFeatures(mockSupabase, 103)
  assert.equal(features.planTier, "pro")
  assert.equal(features.planName, "Pro")
  assert.equal(features.hasWhatsAppAutomation, true)
  assert.equal(features.storageQuotaBytes, PRO_STORAGE_BYTES)
  assert.equal(features.storageQuotaMb, 100)
  assert.equal(features.isReadOnly, false)
  assert.equal(features.hasActiveSub, true)
})

test("getUserPlanFeatures: Free Trial has 10 MB and NO WhatsApp automation", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 5 * 86400000).toISOString(), is_test_user: false },
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

  const features = await getUserPlanFeatures(mockSupabase, 104)
  assert.equal(features.planTier, "trial")
  assert.equal(features.hasWhatsAppAutomation, false)
  assert.equal(features.storageQuotaBytes, STARTER_STORAGE_BYTES)
  assert.equal(features.storageQuotaMb, 10)
  assert.equal(features.isReadOnly, false)
  assert.equal(features.hasActiveSub, false)
  assert.equal(features.trialDaysLeft > 0, true)
})

test("getUserPlanFeatures: 1-month trial expired enters read-only mode", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 31 * 86400000).toISOString(), is_test_user: false },
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

  const features = await getUserPlanFeatures(mockSupabase, 105)
  assert.equal(features.isReadOnly, true)
  assert.equal(features.hasActiveSub, false)
  assert.equal(features.subscriptionStatus, "expired")
  assert.equal(features.trialDaysLeft, 0)
})

test("getUserPlanFeatures: Halted plan enters read-only mode immediately", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 10 * 86400000).toISOString(), is_test_user: false },
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
                    maybeSingle: async () => ({
                      data: {
                        id: 5,
                        status: "halted",
                        next_billing_at: new Date(Date.now() + 10 * 86400000).toISOString(),
                        platform_subscriptions: {
                          id: 1,
                          name: "Starter",
                          has_whatsapp_automation: false,
                          storage_quota_mb: 10,
                        },
                      },
                      error: null,
                    }),
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

  const features = await getUserPlanFeatures(mockSupabase, 106)
  assert.equal(features.isReadOnly, true)
  assert.equal(features.hasActiveSub, false)
  assert.equal(features.subscriptionStatus, "halted")
})

test("getUserPlanFeatures: Cancelled plan after period ends enters read-only mode", async () => {
  const mockSupabase = {
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { created_at: new Date(Date.now() - 60 * 86400000).toISOString(), is_test_user: false },
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
                    maybeSingle: async () => ({
                      data: {
                        id: 6,
                        status: "cancelled",
                        next_billing_at: new Date(Date.now() - 2 * 86400000).toISOString(),
                        platform_subscriptions: {
                          id: 1,
                          name: "Starter",
                          has_whatsapp_automation: false,
                          storage_quota_mb: 10,
                        },
                      },
                      error: null,
                    }),
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

  const features = await getUserPlanFeatures(mockSupabase, 107)
  assert.equal(features.isReadOnly, true)
  assert.equal(features.hasActiveSub, false)
  assert.equal(features.subscriptionStatus, "cancelled")
})
