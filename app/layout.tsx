import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Project Operations",
	description: "Secure project management workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
		>
			<body className="min-h-full">
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
