import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dr Ali Alameer",
  description:
    "Lecturer in Artificial Intelligence at the University of Salford. Machine vision, natural language processing and responsible AI.",
};

// Applies a saved theme choice before first paint. With no saved choice the
// attribute stays unset and the CSS follows prefers-color-scheme. data-js lets
// the CSS hide scroll-reveal blocks only when a script is there to show them.
const themeScript = `(function(){document.documentElement.setAttribute("data-js","");try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
