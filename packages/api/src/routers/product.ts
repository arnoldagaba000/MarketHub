/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import prisma from "@MarketHub/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type {
    ProductOrderByWithAggregationInput,
    ProductWhereInput,
} from "../../../db/prisma/generated/models";
import { protectedProcedure, publicProcedure } from "../index";

/**
 * Product Router - Handles all product-related operations
 *
 * This router manages:
 * - Creating and editing products (vendor-only)
 * - Listing and browsing products (public)
 * - Product search and filtering
 */

/**
 * Helper function to verify a user is a vendor and get their vendor profile
 * We'll use this in multiple procedures to avoid code duplication
 */
async function getVendorProfile(userId: string) {
    const vendor = await prisma.vendor.findUnique({
        where: { userId },
    });

    if (!vendor) {
        throw new ORPCError("FORBIDDEN", {
            message: "You must be a vendor to perform this action",
        });
    }

    if (!vendor.isApproved) {
        throw new ORPCError("FORBIDDEN", {
            message: "Your vendor account is pending approval",
        });
    }

    return vendor;
}

/**
 * Procedure: createProduct
 *
 * Allows vendors to add a new product to their shop.
 * Products start as active by default.
 */
export const createProduct = protectedProcedure
    .input(
        z.object({
            name: z
                .string()
                .min(3, "Product name must be at least 3 characters")
                .max(200, "Product name must be less than 200 characters"),
            description: z
                .string()
                .min(20, "Description must be at least 20 characters")
                .max(2000, "Description must be less than 2000 characters"),
            price: z
                .number()
                .positive("Price must be positive")
                .max(1_000_000, "Price seems unreasonably high"),
            stock: z
                .number()
                .int("Stock must be a whole number")
                .min(0, "Stock cannot be negative"),
            categoryId: z.cuid("Invalid category ID"),
            images: z
                .array(z.url("Each image must be a valid URL"))
                .min(1, "At least one image is required")
                .max(10, "Maximum 10 images allowed"),
        })
    )
    .handler(async ({ input, context }) => {
        // Verify the user is an approved vendor
        const vendor = await getVendorProfile(context.session.user.id);

        // Verify the category exists
        const category = await prisma.category.findUnique({
            where: { id: input.categoryId },
        });

        if (!category) {
            throw new ORPCError("NOT_FOUND", {
                message: "Category not found",
            });
        }

        // Create the product with its images in a single transaction
        // This ensures if something goes wrong, nothing gets saved
        const product = await prisma.product.create({
            data: {
                vendorId: vendor.id,
                categoryId: input.categoryId,
                name: input.name,
                description: input.description,
                price: input.price,
                stock: input.stock,
                isActive: true,
                // Create all images at once
                images: {
                    create: input.images.map((url, index) => ({
                        url,
                        order: index, // First image (index 0) is the main image
                    })),
                },
            },
            // Return the full product with related data
            include: {
                images: {
                    orderBy: { order: "asc" }, // Sort images by order
                },
                category: true,
                vendor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            success: true,
            message: "Product created successfully",
            product,
        };
    });

/**
 * Procedure: updateProduct
 *
 * Allows vendors to update their products.
 * Vendors can only update their own products.
 */
export const updateProduct = protectedProcedure
    .input(
        z.object({
            productId: z.cuid("Invalid product ID"),
            name: z.string().min(3).max(200).optional(),
            description: z.string().min(20).max(2000).optional(),
            price: z.number().positive().optional(),
            stock: z.number().int().min(0).optional(),
            categoryId: z.cuid().optional(),
            isActive: z.boolean().optional(),
        })
    )
    .handler(async ({ input, context }) => {
        const vendor = await getVendorProfile(context.session.user.id);

        // Verify the product exists and belongs to this vendor
        const existingProduct = await prisma.product.findUnique({
            where: { id: input.productId },
        });

        if (!existingProduct) {
            throw new ORPCError("NOT_FOUND", {
                message: "Product not found",
            });
        }

        if (existingProduct.vendorId !== vendor.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "You can only update your own products",
            });
        }

        // If changing category, verify it exists
        if (input.categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: input.categoryId },
            });

            if (!category) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Category not found",
                });
            }
        }

        // Update the product
        const { productId, ...updateData } = input;
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updateData,
            include: {
                images: {
                    orderBy: { order: "asc" },
                },
                category: true,
                vendor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            success: true,
            message: "Product updated successfully",
            product: updatedProduct,
        };
    });

/**
 * Procedure: getMyProducts
 *
 * Returns all products belonging to the current vendor.
 * Useful for vendor dashboard.
 */
export const getMyProducts = protectedProcedure.handler(async ({ context }) => {
    const vendor = await getVendorProfile(context.session.user.id);

    const products = await prisma.product.findMany({
        where: { vendorId: vendor.id },
        include: {
            images: {
                orderBy: { order: "asc" },
                take: 1, // Only get first image for list view
            },
            category: true,
            _count: {
                select: {
                    reviews: true,
                    orderItems: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return products;
});

/**
 * Procedure: listProducts
 *
 * Public endpoint to browse products with filtering and pagination.
 * This is what customers use to shop.
 */
export const listProducts = publicProcedure
    .input(
        z.object({
            // Filtering options
            categoryId: z.cuid().optional(),
            vendorId: z.cuid().optional(),
            search: z.string().min(1).max(100).optional(),
            minPrice: z.number().positive().optional(),
            maxPrice: z.number().positive().optional(),

            // Sorting
            sortBy: z
                .enum(["price_asc", "price_desc", "newest", "oldest"])
                .default("newest"),

            // Pagination
            page: z.number().int().positive().default(1),
            limit: z.number().int().positive().max(100).default(20),
        })
    )
    .handler(async ({ input }) => {
        const { page, limit, sortBy, ...filters } = input;

        // Build the where clause based on filters
        const where: ProductWhereInput = {
            isActive: true, // Only show active products
        };

        if (filters.categoryId) {
            where.categoryId = filters.categoryId;
        }

        if (filters.vendorId) {
            // Also check vendor is approved
            where.vendor = {
                id: filters.vendorId,
                isApproved: true,
            };
        }

        if (filters.search) {
            // Search in product name and description
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                {
                    description: {
                        contains: filters.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        if (filters.minPrice || filters.maxPrice) {
            where.price = {};
            if (filters.minPrice) {
                where.price.gte = filters.minPrice;
            }
            if (filters.maxPrice) {
                where.price.lte = filters.maxPrice;
            }
        }

        // Determine sort order
        let orderBy: ProductOrderByWithAggregationInput;
        switch (sortBy) {
            case "price_asc":
                orderBy = { price: "asc" };
                break;
            case "price_desc":
                orderBy = { price: "desc" };
                break;
            case "oldest":
                orderBy = { createdAt: "asc" };
                break;
            default:
                orderBy = { createdAt: "desc" };
                break;
        }

        // Execute queries in parallel for better performance
        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    images: {
                        orderBy: { order: "asc" },
                        take: 1, // Just main image for list view
                    },
                    category: true,
                    vendor: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            reviews: true,
                        },
                    },
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.product.count({ where }),
        ]);

        return {
            products,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount,
            },
        };
    });

/**
 * Procedure: getProduct
 *
 * Get detailed information about a single product.
 * Public endpoint - anyone can view product details.
 */
export const getProduct = publicProcedure
    .input(
        z.object({
            productId: z.cuid("Invalid product ID"),
        })
    )
    .handler(async ({ input }) => {
        const product = await prisma.product.findUnique({
            where: { id: input.productId },
            include: {
                images: {
                    orderBy: { order: "asc" },
                },
                category: true,
                vendor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                image: true,
                            },
                        },
                        _count: {
                            select: {
                                products: true,
                            },
                        },
                    },
                },
                reviews: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10, // Show latest 10 reviews
                },
                _count: {
                    select: {
                        reviews: true,
                    },
                },
            },
        });

        if (!product) {
            throw new ORPCError("NOT_FOUND", {
                message: "Product not found",
            });
        }

        // Don't show inactive products to non-owners
        if (!product.isActive) {
            throw new ORPCError("NOT_FOUND", {
                message: "Product not found",
            });
        }

        // Calculate average rating if there are reviews
        let averageRating: number | null = null;
        if (product.reviews.length > 0) {
            const totalRating = product.reviews.reduce(
                (sum, review) => sum + review.rating,
                0
            );
            averageRating = totalRating / product.reviews.length;
        }

        return {
            ...product,
            averageRating,
        };
    });

/**
 * Procedure: deleteProduct
 *
 * Soft delete - sets isActive to false instead of deleting.
 * This preserves order history.
 */
export const deleteProduct = protectedProcedure
    .input(
        z.object({
            productId: z.cuid("Invalid product ID"),
        })
    )
    .handler(async ({ input, context }) => {
        const vendor = await getVendorProfile(context.session.user.id);

        // Verify ownership
        const product = await prisma.product.findUnique({
            where: { id: input.productId },
        });

        if (!product) {
            throw new ORPCError("NOT_FOUND", {
                message: "Product not found",
            });
        }

        if (product.vendorId !== vendor.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "You can only delete your own products",
            });
        }

        // Soft delete by setting isActive to false
        await prisma.product.update({
            where: { id: input.productId },
            data: { isActive: false },
        });

        return {
            success: true,
            message: "Product deleted successfully",
        };
    });

/**
 * Export all product procedures as a router object
 */
export const productRouter = {
    createProduct,
    updateProduct,
    getMyProducts,
    listProducts,
    getProduct,
    deleteProduct,
};
