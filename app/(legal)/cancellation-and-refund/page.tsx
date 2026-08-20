import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy | ArtistOS",
  description: "Cancellation and Refund Policy for ArtistOS",
};

export default function CancellationAndRefundPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#7c3aed] hover:prose-a:text-[#6d28d9]">
      <h1 className="text-3xl font-bold tracking-tight text-[#15172e] sm:text-4xl mb-4">
        Cancellation and Refund Policy
      </h1>
      <p className="text-sm text-[#666a82] mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <section className="space-y-6 text-[#3b3f62] leading-7">
        <p>
          At ArtistOS, we strive to ensure our beauty professionals and artists have the best experience managing their business. We understand that sometimes software might not be the right fit. This policy outlines your options for canceling your subscription and requesting a refund.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">1. Subscription Cancellations</h2>
        <p>
          You can request to cancel your ArtistOS subscription at any time. To cancel your subscription, please contact our support team at <a href="mailto:artistoscrm@gmail.com" className="font-medium text-[#7c3aed] hover:underline">artistoscrm@gmail.com</a> from your registered email address.
        </p>
        <p>
          Upon cancellation, your subscription will remain active until the end of your current billing cycle. You will not be charged for the subsequent billing cycle. We do not delete your data immediately upon cancellation, allowing you to reactivate your account later if you choose.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">2. Refund Eligibility</h2>
        
        <h3 className="text-lg font-medium text-[#232542] mt-6 mb-2">a. Monthly Subscriptions</h3>
        <p>
          Payments for monthly subscription plans are generally non-refundable. If you cancel your monthly subscription, you will retain access to your premium features until the end of the paid month.
        </p>

        <h3 className="text-lg font-medium text-[#232542] mt-6 mb-2">b. Annual Subscriptions</h3>
        <p>
          If you are on an annual subscription plan and decide to cancel within the first <strong>7 days</strong> of your initial purchase, you are eligible for a full refund. After 7 days, annual subscriptions are non-refundable. 
        </p>

        <h3 className="text-lg font-medium text-[#232542] mt-6 mb-2">c. Exceptions</h3>
        <p>
          We may grant refunds in exceptional circumstances at our sole discretion, such as major service disruptions or billing errors caused by us.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">3. How to Request a Refund</h2>
        <p>
          If you believe you are eligible for a refund based on the criteria above, please contact our support team within the eligible period. Provide your registered phone number, email address, and a brief explanation for your request.
        </p>
        <p>
          Approved refunds will be processed and credited back to your original payment method (via Razorpay) within 5-7 business days.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">4. Contact Us</h2>
        <p>
          If you have any questions or need assistance with cancellations or refunds, please reach out to us:
          <br />
          <a href="mailto:artistoscrm@gmail.com" className="font-medium text-[#7c3aed] hover:underline mt-2 inline-block">
            artistoscrm@gmail.com
          </a>
        </p>
      </section>
    </article>
  );
}
