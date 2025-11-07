/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import prisma from "@MarketHub/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

/**
 * Admin Router - Handles admin-only operations
 *
 * This router manages:
 * - Vendor approval/rejection
 * - Admin user management
 * - Platform-wide operations
 */

/**
 * Helper function to verify a user is an admin
 */
async function verifyAdmin(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
        throw new ORPCError("FORBIDDEN", {
            message: "You must be an admin to perform this action",
        });
    }
}

/**
 * Procedure: approveVendor
 *
 * Allows admins to approve vendor applications.
 */
export const approveVendor = protectedProcedure
    .input(
        z.object({
            vendorId: z.cuid("Invalid vendor ID"),
        })
    )
    .handler(async ({ input, context }) => {
        await verifyAdmin(context.session.user.id);

        const vendor = await prisma.vendor.findUnique({
            where: { id: input.vendorId },
        });

        if (!vendor) {
            throw new ORPCError("NOT_FOUND", {
                message: "Vendor not found",
            });
        }

        if (vendor.isApproved) {
            throw new ORPCError("BAD_REQUEST", {
                message: "Vendor is already approved",
            });
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: input.vendorId },
            data: { isApproved: true },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: "Vendor approved successfully",
            vendor: updatedVendor,
        };
    });

/**
 * Procedure: rejectVendor
 *
 * Allows admins to reject vendor applications.
 * Note: This doesn't delete the vendor, just keeps them unapproved.
 */
export const rejectVendor = protectedProcedure
    .input(
        z.object({
            vendorId: z.cuid("Invalid vendor ID"),
        })
    )
    .handler(async ({ input, context }) => {
        await verifyAdmin(context.session.user.id);

        const vendor = await prisma.vendor.findUnique({
            where: { id: input.vendorId },
        });

        if (!vendor) {
            throw new ORPCError("NOT_FOUND", {
                message: "Vendor not found",
            });
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: input.vendorId },
            data: { isApproved: false },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: "Vendor rejected",
            vendor: updatedVendor,
        };
    });

/**
 * Procedure: listPendingVendors
 *
 * Returns all vendors pending approval.
 */
export const listPendingVendors = protectedProcedure.handler(
    async ({ context }) => {
        await verifyAdmin(context.session.user.id);

        const vendors = await prisma.vendor.findMany({
            where: { isApproved: false },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return vendors;
    }
);

/**
 * Procedure: listAllVendors
 *
 * Returns all vendors (approved and pending).
 */
export const listAllVendors = protectedProcedure
    .input(
        z
            .object({
                page: z.number().int().positive().default(1),
                limit: z.number().int().positive().max(100).default(20),
                status: z.enum(["all", "approved", "pending"]).default("all"),
            })
            .optional()
    )
    .handler(async ({ input, context }) => {
        await verifyAdmin(context.session.user.id);

        const { page = 1, limit = 20, status = "all" } = input || {};

        const where: { isApproved?: boolean } = {};
        if (status === "approved") {
            where.isApproved = true;
        } else if (status === "pending") {
            where.isApproved = false;
        }

        const [vendors, totalCount] = await Promise.all([
            prisma.vendor.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            createdAt: true,
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            orders: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.vendor.count({ where }),
        ]);

        return {
            vendors,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    });

/**
 * Procedure: makeAdmin
 *
 * Allows admins to grant admin status to other users.
 */
export const makeAdmin = protectedProcedure
    .input(
        z.object({
            userId: z.cuid("Invalid user ID"),
        })
    )
    .handler(async ({ input, context }) => {
        await verifyAdmin(context.session.user.id);

        // Prevent making yourself admin (should already be admin)
        if (input.userId === context.session.user.id) {
            throw new ORPCError("BAD_REQUEST", {
                message: "You are already an admin",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: input.userId },
        });

        if (!user) {
            throw new ORPCError("NOT_FOUND", {
                message: "User not found",
            });
        }

        if (user.isAdmin) {
            throw new ORPCError("BAD_REQUEST", {
                message: "User is already an admin",
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: input.userId },
            data: { isAdmin: true },
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
            },
        });

        return {
            success: true,
            message: "User granted admin status",
            user: updatedUser,
        };
    });

/**
 * Procedure: removeAdmin
 *
 * Allows admins to remove admin status from other users.
 * Cannot remove your own admin status.
 */
export const removeAdmin = protectedProcedure
    .input(
        z.object({
            userId: z.cuid("Invalid user ID"),
        })
    )
    .handler(async ({ input, context }) => {
        await verifyAdmin(context.session.user.id);

        // Prevent removing your own admin status
        if (input.userId === context.session.user.id) {
            throw new ORPCError("BAD_REQUEST", {
                message: "You cannot remove your own admin status",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: input.userId },
        });

        if (!user) {
            throw new ORPCError("NOT_FOUND", {
                message: "User not found",
            });
        }

        if (!user.isAdmin) {
            throw new ORPCError("BAD_REQUEST", {
                message: "User is not an admin",
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: input.userId },
            data: { isAdmin: false },
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
            },
        });

        return {
            success: true,
            message: "Admin status removed",
            user: updatedUser,
        };
    });

/**
 * Procedure: listAdmins
 *
 * Returns all admin users.
 */
export const listAdmins = protectedProcedure.handler(async ({ context }) => {
    await verifyAdmin(context.session.user.id);

    const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
                select: {
                    orders: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    return admins;
});

/**
 * Procedure: listUsers
 *
 * Returns all users with pagination.
 */
export const listUsers = protectedProcedure
    .input(
        z
            .object({
                page: z.number().int().positive().default(1),
                limit: z.number().int().positive().max(100).default(20),
                search: z.string().min(1).max(100).optional(),
            })
            .optional()
    )
    .handler(async ({ input, context }) => {
        await verifyAdmin(context.session.user.id);

        const { page = 1, limit = 20, search } = input || {};

        const where: {
            OR?: Array<{
                name?: { contains: string; mode?: "insensitive" };
                email?: { contains: string; mode?: "insensitive" };
            }>;
        } = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    emailVerified: true,
                    isAdmin: true,
                    createdAt: true,
                    _count: {
                        select: {
                            orders: true,
                            reviews: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        return {
            users,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    });

/**
 * Procedure: verifyEmail
 *
 * Allows users to verify their email address.
 * This would typically be called with a verification token from an email.
 */
export const verifyEmail = protectedProcedure
    .input(
        z.object({
            token: z.string().min(1, "Verification token is required"),
        })
    )
    .handler(async ({ input, context }) => {
        // Find verification record
        const verification = await prisma.verification.findFirst({
            where: {
                identifier: context.session.user.email,
                value: input.token,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!verification) {
            throw new ORPCError("BAD_REQUEST", {
                message: "Invalid or expired verification token",
            });
        }

        // Update user email as verified
        const user = await prisma.user.update({
            where: { id: context.session.user.id },
            data: { emailVerified: true },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            },
        });

        // Delete the verification token
        await prisma.verification.delete({
            where: { id: verification.id },
        });

        return {
            success: true,
            message: "Email verified successfully",
            user,
        };
    });

/**
 * Procedure: resendVerificationEmail
 *
 * Allows users to request a new verification email.
 * In a real application, this would send an email with a verification link.
 */
export const resendVerificationEmail = protectedProcedure.handler(
    async ({ context }) => {
        if (context.session.user.emailVerified) {
            throw new ORPCError("BAD_REQUEST", {
                message: "Email is already verified",
            });
        }

        // In a real application, you would:
        // 1. Generate a verification token
        // 2. Store it in the Verification table
        // 3. Send an email with the verification link
        // For now, we'll just return a success message

        // Generate a simple token (in production, use crypto.randomBytes)
        const token =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

        // Store verification token
        await prisma.verification.create({
            data: {
                identifier: context.session.user.email,
                value: token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });

        // TODO: Send email with verification link
        // For now, we'll return the token (in production, don't expose this)
        return {
            success: true,
            message:
                "Verification email sent. Check your inbox. (In development, token is returned)",
            // Remove this in production:
            token: process.env.NODE_ENV === "development" ? token : undefined,
        };
    }
);

/**
 * Procedure: getMyAdminStatus
 *
 * Returns whether the current user is an admin.
 */
export const getMyAdminStatus = protectedProcedure.handler(
    async ({ context }) => {
        // The protectedProcedure middleware ensures context.session.user exists
        const userId = context.session.user.id;

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    isAdmin: true,
                    emailVerified: true,
                },
            });

            // If user not found, return defaults (shouldn't happen with protectedProcedure)
            if (!user) {
                console.warn(`User ${userId} not found in database`);
                return {
                    isAdmin: false,
                    emailVerified: false,
                };
            }

            // Return boolean values (handle null/undefined)
            return {
                isAdmin: Boolean(user.isAdmin),
                emailVerified: Boolean(user.emailVerified),
            };
        } catch (error) {
            // Log the full error for debugging
            console.error("Error in getMyAdminStatus:", {
                error,
                userId,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            });
            
            // If it's already an ORPCError, re-throw it
            if (error instanceof ORPCError) {
                throw error;
            }
            
            // For database errors (like column doesn't exist), return defaults
            // This prevents the frontend from breaking if there's a schema mismatch
            return {
                isAdmin: false,
                emailVerified: false,
            };
        }
    }
);

/**
 * Export all admin procedures as a router object
 */
export const adminRouter = {
    approveVendor,
    rejectVendor,
    listPendingVendors,
    listAllVendors,
    makeAdmin,
    removeAdmin,
    listAdmins,
    listUsers,
    verifyEmail,
    resendVerificationEmail,
    getMyAdminStatus,
};
