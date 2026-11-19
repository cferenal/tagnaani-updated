import "@/api/base44Client";
import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { Base44Scripts } from "base44:document";
import appCss from "@/index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tagna-Ani · Empowering Farmers Through Knowledge and Technology" },
      {
        name: "description",
        content:
          "Tagna-Ani: Empowering Farmers Through Knowledge and Technology. Kaalaman at teknolohiya para sa magsasaka.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/logo.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Manrope:wght@300..800&display=swap",
      },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const fullPage = ["/", "/guides/sms", "/guides/app", "/about", "/contact", "/admin"].includes(pathname);
  if (fullPage) {
    return <AuthProvider><div className="public-scroll"><Outlet /></div><Toaster /></AuthProvider>;
  }
  return (
    <AuthProvider>
      <div className="app-viewport"><Outlet /></div>
      <Toaster
        position="top-center"
        offset="20px"
        toastOptions={{
          style: {
            maxWidth: "320px",
            borderRadius: "16px",
            border: "1.5px solid #643100",
            background: "#F6E6D4",
            color: "#643100",
            fontWeight: 700,
          },
        }}
      />
    </AuthProvider>
  );
}

function RootDocument({ children }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body data-react-root="true">
        {children}
        <Base44Scripts />
        <Scripts />
      </body>
    </html>
  );
}