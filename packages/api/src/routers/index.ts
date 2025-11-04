import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { categoryRouter } from "./category";
import { productRouter } from "./product";
import { vendorRouter } from "./vendor";

export const appRouter = {
    healthCheck: publicProcedure.handler(() => "OK"),
    privateData: protectedProcedure.handler(({ context }) => ({
        message: "This is private",
        user: context.session?.user,
    })),

    // Vendor endpoints - nested under 'vendor' namespace
    vendor: vendorRouter,

    // Product endpoints - nested under 'product' namespace
    product: productRouter,

    // Category endpoints - nested under 'category' namespace
    category: categoryRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
