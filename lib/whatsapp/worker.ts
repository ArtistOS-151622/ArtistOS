export async function wakeWhatsAppWorker() {
  const workerUrl = process.env.WHATSAPP_WORKER_URL?.trim();
  if (!workerUrl) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    console.warn("Unable to wake WhatsApp worker:", error);
  } finally {
    clearTimeout(timeout);
  }
}
