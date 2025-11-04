import prisma from "@MarketHub/db";
import { publicProcedure } from "../index";

/**
 * Category Router - Simple public endpoints for browsing categories
 *
 * Categories are managed by admins through database seeding,
 * so we only need read operations here.
 */

/**
 * Procedure: listCategories
 *
 * Returns all available product categories.
 * Public endpoint - anyone can view categories.
 */
export const listCategories = publicProcedure.handler(async () => {
    const categories = await prisma.category.findMany({
        include: {
            _count: {
                select: {
                    // Count only active products from approved vendors
                    products: {
                        where: {
                            isActive: true,
                            vendor: {
                                isApproved: true,
                            },
                        },
                    },
                },
            },
        },
        orderBy: { name: "asc" },
    });

    return categories;
});

/**
 * Export category procedures
 */
export const categoryRouter = {
    listCategories,
};
