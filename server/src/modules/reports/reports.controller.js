import * as reportsService from "#src/modules/reports/reports.service.js"
import { queryParam } from "#src/utils/request.js"

/** Filters shared by every report; empty strings count as "not set", as before. */
function commonFilters(req) {
  return {
    search: queryParam(req, "search")?.trim() || "",
    startDate: queryParam(req, "start_date") || null,
    endDate: queryParam(req, "end_date") || null,
  }
}

export async function customers(req, res) {
  res.json(
    await reportsService.customersReport(req.artist.id, {
      ...commonFilters(req),
      sort: queryParam(req, "sort") || "recent",
    })
  )
}

export async function services(req, res) {
  res.json(
    await reportsService.servicesReport(req.artist.id, {
      ...commonFilters(req),
      sort: queryParam(req, "sort") || "most_used",
    })
  )
}

export async function payments(req, res) {
  res.json(
    await reportsService.paymentsReport(req.artist.id, {
      ...commonFilters(req),
      paymentType: queryParam(req, "payment_type") || "all",
      view: queryParam(req, "view") || "all",
    })
  )
}
