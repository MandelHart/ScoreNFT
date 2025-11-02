import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ScoreNFT - Privacy-Preserving Quiz Scoring",
  description: "A decentralized quiz platform with encrypted score storage and NFT generation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-gray-50 text-gray-900 antialiased`}>
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 z-[-20]"></div>
        <main className="flex flex-col max-w-screen-xl mx-auto pb-20 min-w-[850px]">
          <nav className="flex w-full px-3 md:px-0 h-fit py-10 justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">ScoreNFT</h1>
          </nav>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}

