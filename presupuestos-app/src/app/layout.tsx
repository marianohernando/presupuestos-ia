import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PresupuestosIA - Gestión de Clientes y Presupuestos",
  description: "Herramienta interna para gestión de clientes y generación de presupuestos asistidos por IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TooltipProvider>
          <MainLayout>{children}</MainLayout>
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
