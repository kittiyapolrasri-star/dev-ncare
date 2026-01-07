import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'PharmaCare ERP | ระบบบริหารจัดการร้านยา',
    description: 'ระบบบริหารจัดการร้านยาและคลังยาแบบครบวงจร รองรับหลายสาขา VAT/Non-VAT',
    keywords: ['pharmacy', 'erp', 'inventory', 'drug management', 'ร้านยา', 'คลังยา'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="th" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body className="min-h-screen bg-gray-50">
                <Providers>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#fff',
                                color: '#1f2937',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#22c55e',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}
