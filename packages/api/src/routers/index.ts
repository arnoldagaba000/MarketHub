import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { cartRouter } from "./cart";
import { categoryRouter } from "./category";
import { orderRouter } from "./order";
import { productRouter } from "./product";
import { reviewRouter } from "./review";
import { vendorRouter } from "./vendor";

export const appRouter = {
    healthCheck: publicProcedure.handler(() => "OK"),
    privateData: protectedProcedure.handler(({ context }) => ({
        message: "This is private",
        user: context.session?.user,
    })),

    // Vendor endpoints
    vendor: vendorRouter,

    // Product endpoints
    product: productRouter,

    // Category endpoints
    category: categoryRouter,

    // Order processing
    order: orderRouter,

    // Shopping cart
    cart: cartRouter,

    // Product reviews
    review: reviewRouter,

    // Admin endpoints
    admin: adminRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
