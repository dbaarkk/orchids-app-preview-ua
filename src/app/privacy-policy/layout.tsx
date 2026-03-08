import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read the Urban Auto Privacy Policy to understand how we collect, use, and protect your personal data and location information.',
  alternates: {
    canonical: '/privacy-policy',
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
