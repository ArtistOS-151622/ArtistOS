import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | ArtistOS",
  description: "Terms and Conditions for ArtistOS",
};

export default function TermsAndConditionsPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#7c3aed] hover:prose-a:text-[#6d28d9]">
      <h1 className="text-3xl font-bold tracking-tight text-[#15172e] sm:text-4xl mb-4">
        Terms and Conditions
      </h1>
      <p className="text-sm text-[#666a82] mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <section className="space-y-6 text-[#3b3f62] leading-7">
        <p>
          Welcome to ArtistOS. These Terms and Conditions outline the rules and regulations for the use of ArtistOS&apos;s Website and SaaS platform, located at artistos.in.
        </p>
        <p>
          By accessing this website and using our platform, we assume you accept these terms and conditions. Do not continue to use ArtistOS if you do not agree to take all of the terms and conditions stated on this page.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">1. License and Access</h2>
        <p>
          Subject to your compliance with these Terms, ArtistOS grants you a limited, non-exclusive, non-transferable, non-sublicensable license to access and make use of the ArtistOS platform for your professional beauty or artist business. 
        </p>
        <p>You must not:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Republish material from ArtistOS.</li>
          <li>Sell, rent, or sub-license material or software from ArtistOS.</li>
          <li>Reproduce, duplicate, or copy software or assets from ArtistOS.</li>
          <li>Redistribute content from ArtistOS unless specifically made for redistribution (such as your public portfolio links).</li>
        </ul>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">2. User Accounts</h2>
        <p>
          To access certain features of the platform, you may be required to register for an account using your mobile number. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">3. Acceptable Use of WhatsApp Campaigns</h2>
        <p>
          ArtistOS provides tools to send automated messages and campaigns via WhatsApp to your clients. By using these features, you agree to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Only send messages to clients who have explicitly opted-in to receive communications from your business.</li>
          <li>Comply with all anti-spam laws, including the guidelines set by WhatsApp (Meta) for business messaging.</li>
          <li>Not send unsolicited, harassing, defamatory, or illegal content.</li>
        </ul>
        <p>
          ArtistOS reserves the right to suspend your campaign privileges or terminate your account if we receive reports of spam or abuse originating from your account.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">4. Subscriptions and Payments</h2>
        <p>
          Access to premium features of ArtistOS requires an active subscription. By selecting a subscription plan, you agree to pay the applicable recurring fees. Payments are processed securely via our third-party payment provider (Razorpay). 
        </p>
        <p>
          For details regarding cancellations and refunds, please refer to our <a href="/cancellation-and-refund">Cancellation and Refund Policy</a>.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">5. Disclaimer of Warranties</h2>
        <p>
          The ArtistOS platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">6. Limitation of Liability</h2>
        <p>
          In no event shall ArtistOS or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ArtistOS, even if ArtistOS or an authorized representative has been notified orally or in writing of the possibility of such damage.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">7. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at:
          <br />
          <a href="mailto:artistoscrm@gmail.com" className="font-medium text-[#7c3aed] hover:underline mt-2 inline-block">
            artistoscrm@gmail.com
          </a>
        </p>
      </section>
    </article>
  );
}
