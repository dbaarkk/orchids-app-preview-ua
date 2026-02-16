'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="mobile-container bg-white min-h-screen flex flex-col p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 mb-8 hover:text-primary transition-colors w-fit"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Urban Auto Privacy Policy</h1>
      
      <div className="space-y-6 text-gray-600 text-sm leading-relaxed overflow-y-auto pb-10">
        <section>
          <p className="font-semibold text-gray-900">Effective date: January 22, 2026</p>
          <p className="mt-2">Urban Auto (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains what data we collect, how we use it, and your rights.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">1. Information We Collect</h2>
          
          <p className="font-semibold text-gray-800 mt-3 mb-1">Account Information</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
          </ul>

          <p className="font-semibold text-gray-800 mt-3 mb-1">Booking &amp; Service Information</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Vehicle details</li>
            <li>Service requests</li>
            <li>Pickup/service address</li>
          </ul>

          <p className="font-semibold text-gray-800 mt-3 mb-1">Location Data (Optional)</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Precise location is collected only when you grant permission.</li>
            <li>Used only to auto-fill your pickup/service address.</li>
            <li>Location is not collected in the background.</li>
          </ul>

          <p className="font-semibold text-gray-800 mt-3 mb-1">Device &amp; Log Information</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device type, app version, crash logs, and technical diagnostics.</li>
            <li>Used for security, fraud prevention, and app performance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
          <p className="mb-2">We use collected data only for legitimate service purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To create and manage your account.</li>
            <li>To process and manage service bookings.</li>
            <li>To assign garages, mechanics, or service providers.</li>
            <li>To send booking updates, notifications, and support messages.</li>
            <li>To prevent fraud, abuse, and unauthorized activity.</li>
            <li>To improve app performance, reliability, and user experience.</li>
          </ul>
          <p className="mt-2">We collect only the minimum data necessary to provide our services.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">3. Legal Basis for Processing (Where Applicable)</h2>
          <p className="mb-2">Depending on your region, we process data based on:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your consent (e.g., location permission).</li>
            <li>Service necessity (to complete bookings and provide services).</li>
            <li>Legal obligations (e.g., accounting, fraud prevention, compliance).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">4. How We Share Information</h2>
          <p className="mb-2">We do not sell personal data.</p>
          <p className="mb-2">We only share limited data when necessary:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Service partners / garages / mechanics — only the information required to complete your booking.</li>
            <li>Payment providers — to process secure transactions.</li>
            <li>Technology providers (e.g., hosting, analytics, crash reporting) — to operate and improve the app.</li>
          </ul>
          <p className="mt-2">All partners are required to protect your data and use it only for service-related purposes.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Booking and transaction records are retained for support, legal, and accounting purposes.</li>
            <li>Data is kept only as long as necessary.</li>
            <li>You may request deletion of your personal data at any time.</li>
          </ul>

          <p className="font-semibold text-gray-800 mt-3 mb-1">Deletion Requests</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email: <a href="mailto:theurbanauto@gmail.com" className="text-primary hover:underline">theurbanauto@gmail.com</a></li>
            <li>Requests are processed within 7–30 days.</li>
            <li>Some records may be retained if required by law (e.g., financial records, fraud prevention).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">6. Data Security</h2>
          <p className="mb-2">We use industry-standard safeguards to protect your data, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encrypted data transmission (HTTPS).</li>
            <li>Secure data storage.</li>
            <li>Access control and restricted internal access.</li>
            <li>Monitoring for unauthorized activity.</li>
          </ul>
          <p className="mt-2">No system is 100% secure, but we continuously work to protect your information.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">7. Children&apos;s Privacy</h2>
          <p>Urban Auto is not intended for children under 13. We do not knowingly collect data from children. If we discover such data, it will be deleted promptly.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">8. Your Privacy Rights</h2>
          <p className="mb-2">Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your personal data.</li>
            <li>Correct inaccurate information.</li>
            <li>Request deletion of your data.</li>
            <li>Withdraw consent (e.g., location permission via device settings).</li>
          </ul>
          <p className="mt-2">To exercise your rights, contact: <a href="mailto:theurbanauto@gmail.com" className="text-primary hover:underline">theurbanauto@gmail.com</a></p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">9. Location Permission Disclosure</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Location access is optional.</li>
            <li>Used only to auto-fill your pickup/service address.</li>
            <li>The app works without granting location permission.</li>
            <li>Location is not tracked in the background.</li>
            <li>Location data is not used for advertising.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">10. International Data Processing</h2>
          <p>Your data may be processed on servers located outside your country. We take reasonable steps to ensure your data remains protected under applicable privacy laws.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">11. Policy Updates</h2>
          <p>We may update this Privacy Policy periodically. Significant changes will be notified within the app. Continued use of the app means you accept the updated policy.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">12. Contact</h2>
          <p>For privacy questions or data requests:</p>
          <p className="mt-1">Email: <a href="mailto:theurbanauto@gmail.com" className="text-primary hover:underline">theurbanauto@gmail.com</a></p>
        </section>
      </div>
    </div>
  );
}
