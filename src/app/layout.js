import './globals.css';

export const metadata = {
  title: 'Power Fundraiser AI | Donor Management Platform',
  description: 'AI-Powered Donor Intelligence for Nonprofit Fundraising',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
