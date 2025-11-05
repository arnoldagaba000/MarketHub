import type { AppRouterClient } from "@MarketHub/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
    createRootRouteWithContext,
    HeadContent,
    Outlet,
    useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useState } from "react";
import Header from "@/components/layout/header";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { link, type orpc } from "@/utils/orpc";
import "../index.css";
import { RootLayout } from "@/components/layout/root-layout";

export type RouterAppContext = {
    orpc: typeof orpc;
    queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
    component: RootLayout,
    head: () => ({
        meta: [
            {
                title: "MarketHub",
            },
            {
                name: "description",
                content: "MarketHub is a web application",
            },
        ],
        links: [
            {
                rel: "icon",
                href: "/favicon.ico",
            },
        ],
    }),
});

function RootComponent() {
    const isFetching = useRouterState({
        select: (s) => s.isLoading,
    });

    const [client] = useState<AppRouterClient>(() => createORPCClient(link));
    const [orpcUtils] = useState(() => createTanstackQueryUtils(client));

    return (
        <>
            <HeadContent />
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                disableTransitionOnChange
                storageKey="vite-ui-theme"
            >
                <div className="grid h-svh grid-rows-[auto_1fr]">
                    <Header />
                    {isFetching ? <Loader /> : <Outlet />}
                </div>
                <Toaster richColors />
            </ThemeProvider>
            <TanStackRouterDevtools position="bottom-left" />
            <ReactQueryDevtools
                buttonPosition="bottom-right"
                position="bottom"
            />
        </>
    );
}
