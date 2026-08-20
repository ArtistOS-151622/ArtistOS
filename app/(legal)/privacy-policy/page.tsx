import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ArtistOS",
  description: "Privacy Policy for ArtistOS",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#7c3aed] hover:prose-a:text-[#6d28d9]">
      <h1 className="text-3xl font-bold tracking-tight text-[#15172e] sm:text-4xl mb-4">
        Privacy Policy
      </h1>
      <p className="text-sm text-[#666a82] mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <section className="space-y-6 text-[#3b3f62] leading-7">
        <p>
          At ArtistOS (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we respect your privacy and are committed to protecting the personal data of our users (beauty professionals, salon owners, and artists) and their clients. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (artistos.in) or use our SaaS platform.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">1. Information We Collect</h2>
        
        <h3 className="text-lg font-medium text-[#232542] mt-6 mb-2">a. Information you provide to us</h3>
        <p>
          When you register for an ArtistOS account, we collect personal information such as your name, business name, email address, phone number, and billing details. If you use our platform to manage your business, you may also upload information about your services, portfolio, and pricing.
        </p>

        <h3 className="text-lg font-medium text-[#232542] mt-6 mb-2">b. Information you provide about your clients (Client CRM)</h3>
        <p>
          As part of the CRM and booking features, you may input or import personal data about your clients (e.g., their names, phone numbers, appointment history, and payment status). You retain all rights to this data. ArtistOS acts solely as a data processor for your client data and will never market to, sell, or contact your clients directly, except as initiated by you (e.g., via automated WhatsApp campaigns or booking confirmations).
        </p>

        <h3 className="text-lg font-medium text-[#232542] mt-6 mb-2">c. Automatically collected information</h3>
        <p>
          We automatically collect certain information when you visit, use, or navigate the platform. This information does not reveal your specific identity but may include device and usage information, such as your IP address, browser and device characteristics, operating system, and information about how and when you use our platform.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">2. How We Use Your Information</h2>
        <p>We use the information we collect or receive to:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Facilitate account creation and authentication.</li>
          <li>Provide, operate, and maintain our platform (including booking management, invoicing, and WhatsApp campaigns).</li>
          <li>Process your payments and manage your subscription.</li>
          <li>Send administrative information to you, such as updates to our terms, conditions, and policies.</li>
          <li>Respond to your customer support requests.</li>
          <li>Improve our platform, user experience, and overall service quality.</li>
        </ul>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">3. WhatsApp Campaigns and Messaging</h2>
        <p>
          ArtistOS integrates with WhatsApp APIs to allow you to send booking confirmations, reminders, and promotional campaigns to your clients. We do not read, monitor, or use the contents of your messages for our own purposes. You are solely responsible for ensuring you have the appropriate consent from your clients to send them messages via WhatsApp in compliance with local laws.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">4. Data Sharing and Disclosure</h2>
        <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We may process or share your data with third-party service providers, contractors, or agents who perform services for us (e.g., payment processors like Razorpay, cloud hosting providers, and communication APIs). We do not sell your personal data or your clients&apos; data to third parties.</p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure. You are responsible for keeping your password and account details secure.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">6. Your Privacy Rights</h2>
        <p>
          You may review, change, or terminate your account at any time. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases, subject to any legal obligations to retain certain data (such as billing records).
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">7. Contact Us</h2>
        <p>
          If you have questions or comments about this Privacy Policy, please contact us at:
          <br />
          <a href="mailto:artistoscrm@gmail.com" className="font-medium text-[#7c3aed] hover:underline mt-2 inline-block">
            artistoscrm@gmail.com
          </a>
        </p>
      </section>
    </article>
  );
}
