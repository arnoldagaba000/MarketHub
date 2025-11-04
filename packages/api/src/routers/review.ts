/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import prisma from "@MarketHub/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { ReviewOrderByWithAggregationInput } from "../../../db/prisma/generated/models";
import { protectedProcedure, publicProcedure } from "../index";

/**
 * Review Router - Handles product reviews and ratings
 *
 * Key features:
 * - Users can only review products they've purchased
 * - One review per user per product (can be updated)
 * - Public viewing of reviews
 * - Average rating calculations
 *
 * Business rule: You must have received the product to review it.
 * This prevents fake reviews and ensures reviewers have actual experience.
 */

/**
 * Procedure: createReview
 *
 * Creates a review for a product.
 * User must have purchased and received the product.
 */
export const createReview = protectedProcedure
    .input(
        z.object({
            productId: z.cuid("Invalid product ID"),
            rating: z
                .number()
                .int("Rating must be a whole number")
                .min(1, "Rating must be at least 1 star")
                .max(5, "Rating must be at most 5 stars"),
            comment: z
                .string()
                .min(10, "Review must be at least 10 characters")
                .max(1000, "Review must be less than 1000 characters")
                .optional(),
        })
    )
    .handler(async ({ input, context }) => {
        // Step 1: Verify the product exists
        const product = await prisma.product.findUnique({
            where: { id: input.productId },
        });

        if (!product) {
            throw new ORPCError("NOT_FOUND", {
                message: "Product not found",
            });
        }

        // Step 2: Check if user has already reviewed this product
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId: {
                    userId: context.session.user.id,
                    productId: input.productId,
                },
            },
        });

        if (existingReview) {
            throw new ORPCError("CONFLICT", {
                message:
                    "You have already reviewed this product. Use updateReview to modify it.",
            });
        }

        // Step 3: Verify user has purchased and received this product
        // We check for orders with status DELIVERED containing this product
        const hasPurchased = await prisma.orderItem.findFirst({
            where: {
                productId: input.productId,
                order: {
                    userId: context.session.user.id,
                    status: "DELIVERED",
                },
            },
        });

        if (!hasPurchased) {
            throw new ORPCError("FORBIDDEN", {
                message:
                    "You can only review products you have purchased and received",
            });
        }

        // Step 4: Create the review
        const review = await prisma.review.create({
            data: {
                userId: context.session.user.id,
                productId: input.productId,
                rating: input.rating,
                comment: input.comment,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
                product: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: "Review submitted successfully",
            review,
        };
    });

/**
 * Procedure: updateReview
 *
 * Allows users to update their existing reviews.
 */
export const updateReview = protectedProcedure
    .input(
        z.object({
            reviewId: z.cuid("Invalid review ID"),
            rating: z.number().int().min(1).max(5).optional(),
            comment: z.string().min(10).max(1000).optional(),
        })
    )
    .handler(async ({ input, context }) => {
        // Verify the review exists and belongs to this user
        const existingReview = await prisma.review.findUnique({
            where: { id: input.reviewId },
        });

        if (!existingReview) {
            throw new ORPCError("NOT_FOUND", {
                message: "Review not found",
            });
        }

        if (existingReview.userId !== context.session.user.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "You can only update your own reviews",
            });
        }

        // Update the review
        const { reviewId, ...updateData } = input;
        const updatedReview = await prisma.review.update({
            where: { id: reviewId },
            data: updateData,
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
                product: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: "Review updated successfully",
            review: updatedReview,
        };
    });

/**
 * Procedure: deleteReview
 *
 * Allows users to delete their reviews.
 */
export const deleteReview = protectedProcedure
    .input(
        z.object({
            reviewId: z.cuid("Invalid review ID"),
        })
    )
    .handler(async ({ input, context }) => {
        // Verify ownership
        const review = await prisma.review.findUnique({
            where: { id: input.reviewId },
        });

        if (!review) {
            throw new ORPCError("NOT_FOUND", {
                message: "Review not found",
            });
        }

        if (review.userId !== context.session.user.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "You can only delete your own reviews",
            });
        }

        await prisma.review.delete({
            where: { id: input.reviewId },
        });

        return {
            success: true,
            message: "Review deleted successfully",
        };
    });

/**
 * Procedure: getProductReviews
 *
 * Public endpoint to view all reviews for a product.
 * Includes rating distribution statistics.
 */
export const getProductReviews = publicProcedure
    .input(
        z.object({
            productId: z.cuid("Invalid product ID"),
            page: z.number().int().positive().default(1),
            limit: z.number().int().positive().max(100).default(10),
            sortBy: z
                .enum(["newest", "oldest", "highest", "lowest"])
                .default("newest"),
        })
    )
    .handler(async ({ input }) => {
        const { productId, page, limit, sortBy } = input;

        // Determine sort order
        let orderBy: ReviewOrderByWithAggregationInput;
        switch (sortBy) {
            case "oldest":
                orderBy = { createdAt: "asc" };
                break;
            case "highest":
                orderBy = { rating: "desc" };
                break;
            case "lowest":
                orderBy = { rating: "asc" };
                break;
            default:
                orderBy = { createdAt: "desc" };
                break;
        }

        // Fetch reviews and total count in parallel
        const [reviews, totalCount, allReviews] = await Promise.all([
            prisma.review.findMany({
                where: { productId },
                include: {
                    user: {
                        select: {
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.review.count({ where: { productId } }),
            // Get all reviews for statistics calculation
            prisma.review.findMany({
                where: { productId },
                select: { rating: true },
            }),
        ]);

        // Calculate statistics
        let averageRating = 0;
        const ratingDistribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
        };

        if (allReviews.length > 0) {
            // Calculate average
            const totalRating = allReviews.reduce(
                (sum, review) => sum + review.rating,
                0
            );
            averageRating = totalRating / allReviews.length;

            // Calculate distribution
            for (const review of allReviews) {
                ratingDistribution[
                    review.rating as keyof typeof ratingDistribution
                ] += 1;
            }
        }

        return {
            reviews,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
            statistics: {
                averageRating,
                totalReviews: totalCount,
                ratingDistribution,
            },
        };
    });

/**
 * Procedure: getMyReviews
 *
 * Returns all reviews written by the current user.
 */
export const getMyReviews = protectedProcedure
    .input(
        z
            .object({
                page: z.number().int().positive().default(1),
                limit: z.number().int().positive().max(100).default(20),
            })
            .optional()
    )
    .handler(async ({ input, context }) => {
        const { page = 1, limit = 20 } = input || {};

        const [reviews, totalCount] = await Promise.all([
            prisma.review.findMany({
                where: { userId: context.session.user.id },
                include: {
                    product: {
                        include: {
                            images: {
                                orderBy: { order: "asc" },
                                take: 1,
                            },
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
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.review.count({ where: { userId: context.session.user.id } }),
        ]);

        return {
            reviews,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    });

/**
 * Procedure: canReviewProduct
 *
 * Checks if the current user is eligible to review a product.
 * Returns whether they can review and why or why not.
 */
export const canReviewProduct = protectedProcedure
    .input(
        z.object({
            productId: z.string().cuid("Invalid product ID"),
        })
    )
    .handler(async ({ input, context }) => {
        // Check if already reviewed
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId: {
                    userId: context.session.user.id,
                    productId: input.productId,
                },
            },
        });

        if (existingReview) {
            return {
                canReview: false,
                reason: "You have already reviewed this product",
                existingReview,
            };
        }

        // Check if purchased and delivered
        const purchasedOrder = await prisma.orderItem.findFirst({
            where: {
                productId: input.productId,
                order: {
                    userId: context.session.user.id,
                    status: "DELIVERED",
                },
            },
            include: {
                order: {
                    select: {
                        id: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!purchasedOrder) {
            return {
                canReview: false,
                reason: "You must purchase and receive this product to review it",
            };
        }

        return {
            canReview: true,
            reason: "You are eligible to review this product",
            purchaseDate: purchasedOrder.order.createdAt,
        };
    });

/**
 * Export all review procedures as a router object
 */
export const reviewRouter = {
    createReview,
    updateReview,
    deleteReview,
    getProductReviews,
    getMyReviews,
    canReviewProduct,
};
