# Daily 5:00 AM Artist WhatsApp Bookings Summary Plan

## 1. Executive Summary
This feature automatically delivers a daily morning summary of today's confirmed appointments to artists every morning at **5:00 AM IST (Asia/Kolkata)** via WhatsApp.

### Access Criteria
* **Pro Plan Subscribers**: Users on an active Pro subscription with `platform_subscriptions.has_whatsapp_automation = true` and `isReadOnly = false`.
* **Free Users**: Users flagged with `is_free_user = true`.
* **Phone Verification**: Artist must have a valid phone number stored on their user record.
* **Booking Filter**: Only bookings where `booking_date = today` (IST) and `status = 'confirmed'`.

---

## 2. Best WhatsApp Meta Template Specification

Submit this exact template in **Meta Business Manager** -> **WhatsApp Manager** -> **Message Templates**.

### Template Meta Settings
* **Template Name**: `artist_daily_agenda` *(Lowercase and underscores only)*
* **Category**: `UTILITY` *(Ensures highest approval rate & lowest cost per conversation)*
* **Language**: `English` (`en` or `en_US`)

### Template Structure

#### Header (Optional - Recommended)
* **Type**: `Text`
* **Text**: `Today's Booking Schedule 📅`

#### Body (Copy-Paste Text)
```text
Good morning {{1}}! 🌅

Here is your confirmed booking schedule for today, {{2}}:

Total Bookings: {{3}}
Today's Schedule:
{{4}}

Wishing you a great and productive day!
```

#### Footer (Optional - Recommended)
* **Text**: `ArtistOS CRM`

#### Buttons (Optional - Recommended Call-to-Action)
* **Type**: `Call to Action`
* **Button Type**: `Visit Website`
* **Button Text**: `Open My Schedule`
* **URL Type**: `Static`
* **Website URL**: `https://artistos.in/bookings`

---

### Meta Verification Sample Values (Mandatory for Approval)
When submitting to Meta, enter these exact sample values in the sample verification modal:
* `{{1}}`: `Sneha Patel`
* `{{2}}`: `24 Oct 2026`
* `{{3}}`: `2 Bookings`
* `{{4}}`: `1) 10:00 AM - Pooja Sharma (+91 9876543210) - Bridal Makeup, Bandra West \n 2) 03:30 PM - Riya Shah (+91 9123456780) - Party Makeup, Studio`

*(Note: In Meta's sample input box, if Meta does not allow pressing Enter, enter it in one line as sample. In actual WhatsApp dispatch, ArtistOS sends it cleanly line-by-line with each customer's mobile number).*

> **Crucial Meta Compliance Tips**:
> 1. **Category**: Choose **`UTILITY`** (DO NOT select Marketing, otherwise Meta will scrutinize and charge higher rates).
> 2. **Parameter Formatting**: Meta API parameters cannot contain newlines (`\n`). The backend will automatically format multiple bookings using clean bullet numbers and pipe separators (e.g. `1) ... | 2) ...`).
> 3. **Approval Time**: Utility templates with clear sample values are usually approved automatically within 1 to 15 minutes by Meta AI.

---

## 3. Technical Architecture & Implementation Steps

```
[GitHub Actions Cron: 23:30 UTC / 5:00 AM IST]
                    │
                    ▼
[GET /api/cron/notifications/daily-agenda] (Bearer CRON_SECRET)
                    │
                    ▼
[lib/whatsapp/daily-artist-agenda.ts: scanDailyArtistAgenda()]
                    │
   ┌────────────────┴────────────────┐
   ▼                                 ▼
1. Fetch eligible artists        2. Query today's confirmed bookings
   (is_free_user OR Pro Plan)       (booking_date = today, status = confirmed)
   └────────────────┬────────────────┘
                    ▼
3. Deduplication Check in `notification_events`
   (Avoid sending duplicate if already sent today)
                    │
                    ▼
4. Format {{1}}, {{2}}, {{3}}, {{4}}
   (Sanitize to comply with Meta Cloud API rules)
                    │
                    ▼
5. Send via `sendWhatsAppTemplate()` -> Meta Cloud API
                    │
                    ▼
6. Log to `notification_events` (status: 'sent' / 'failed')
```

---

## 4. Detailed Component Breakdown

### Step 1: Scanner Service (`lib/whatsapp/daily-artist-agenda.ts`)
* Calculate today's date in `Asia/Kolkata` using `toWallClock(new Date(), APP_TIMEZONE)`.
* Query all eligible artists with phone numbers:
  * Users where `is_free_user = true`
  * OR users with active subscription on a plan having `has_whatsapp_automation = true` and `isReadOnly = false`.
* For each artist:
  * Fetch confirmed bookings for `booking_date = todayLocal.date`.
  * **Zero Bookings Policy**: If an artist has 0 bookings today, skip sending by default (avoids unnecessary WhatsApp API charges).
  * Build sanitized parameters:
    * `{{1}}`: Artist Name / Studio Name
    * `{{2}}`: Display Date (e.g. `24 Oct 2026`)
    * `{{3}}`: `${count} ${count === 1 ? 'Booking' : 'Bookings'}`
    * `{{4}}`: Multi-line schedule string with customer phone numbers:
      `1) 10:00 AM - Customer Name (📞 +91 9876543210)\n   Bridal Makeup, Bandra West\n\n2) 03:30 PM - Customer 2 (📞 +91 9123456780)\n   Hair Styling, Studio`
  * Check deduplication in `notification_events`:
    * `event_type = 'artist_daily_agenda'`
    * `entity_type = 'user'`
    * `entity_id = artist.id`
    * `url = '/bookings?date=' + todayDate`
    * Skip if already sent today.
  * Dispatch message via `sendWhatsAppTemplate()` and record audit event.

### Step 2: Cron API Route (`app/api/cron/notifications/daily-agenda/route.ts`)
* Endpoint: `GET /api/cron/notifications/daily-agenda`
* Authorization check against `process.env.CRON_SECRET`.
* Invokes `scanDailyArtistAgenda(supabase)` with admin Supabase client.
* Returns JSON:
  ```json
  {
    "status": true,
    "scannedArtists": 12,
    "sent": 5,
    "skipped": 7,
    "failed": 0,
    "details": [...]
  }
  ```

### Step 3: GitHub Actions Schedule (`.github/workflows/cron.yml`)
* 5:00 AM IST corresponds to **23:30 UTC** of the previous calendar day.
* Add cron schedule:
  ```yaml
  name: Cron Jobs

  on:
    schedule:
      - cron: '*/5 * * * *'  # Booking reminders & dispatch (every 5 min)
      - cron: '30 23 * * *'  # Daily 5:00 AM IST Artist WhatsApp agenda
      - cron: '0 3 * * *'    # Expire shares
  ```
* Add workflow job step:
  ```yaml
  daily-agenda:
    name: Daily 5AM Artist Agenda
    if: github.event_name == 'workflow_dispatch' || github.event.schedule == '30 23 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Daily Agenda API
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/notifications/daily-agenda" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            --fail-with-body --show-error --silent
  ```

### Step 4: Unit Testing (`tests/daily-agenda-whatsapp.test.ts`)
* Test coverage for:
  1. Artist with Pro plan receiving agenda with multiple bookings.
  2. Free user artist receiving agenda with bookings.
  3. Starter plan artist getting skipped.
  4. Deduplication preventing duplicate sends on same day.
  5. Correct string formatting without prohibited newlines.

---

## 5. Verification Checklist Before Going Live
- [ ] Submit `artist_daily_agenda` template on Meta WhatsApp Manager.
- [ ] Wait for Meta status to change to **Active / Approved**.
- [ ] Test template send manually using `/api/whatsapp/test` route.
- [ ] Deploy backend scanner and cron route.
- [ ] Add `CRON_SECRET` and `APP_URL` in GitHub Actions secrets.
- [ ] Verify test execution via GitHub Actions `workflow_dispatch`.
