/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import prisma from "@MarketHub/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "..";

/**
 * Vendor Router - Handles all vendor-related operations
 *
 * This router manages:
 * - Creating vendor profiles (becoming a vendor)
 * - Viewing vendor information
 * - Updating vendor profiles
 */

/**
 * Procedure: becomeVendor
 *
 * Allows an authenticated user to create a vendor profile.
 * Think of this as "opening a shop" - once you're a vendor, you can start selling.
 *
 * Important: A user can only have ONE vendor profile. If they try to create
 * another one, we'll return an error.
 */
export const becomeVendor = protectedProcedure
    .input(
        z.object({
            shopName: z
                .string()
                .min(3, "Shop name must be at least 3 characters")
                .max(100, "Shop name must be less than 100 characters"),
            description: z
                .string()
                .min(10, "Description must be at least 10 characters")
                .max(500, "Description must be less than 500 characters")
                .optional(),
            logo: z.url("Logo must be a valid URL").optional(),
        })
    )
    .handler(async ({ context, input }) => {
        // First, check if this user is already a vendor
        // This prevents duplicate vendor profiles
        const existingVendor = await prisma.vendor.findUnique({
            where: { userId: context.session.user.id },
        });

        if (existingVendor) {
            throw new ORPCError("CONFLICT", {
                message: "User is already a vendor",
            });
        }

        // Create the vendor profile
        // This is a database transaction - if something goes wrong, nothing is saved
        const vendor = await prisma.vendor.create({
            data: {
                userId: context.session.user.id,
                shopName: input.shopName,
                description: input.description,
                logo: input.logo,
                // New vendors start as not approved (admin approval required)
                isApproved: false,
            },
            // Include the user information in the response
            // This is useful for showing the full profile on the frontend
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return {
            success: true,
            message:
                "Vendor profile created successfully! Awaiting admin approval.",
            vendor,
        };
    });

/**
 * Procedure: getMyVendorProfile
 *
 * Retrieves the current user's vendor profile if they have one.
 * Returns null if they're not a vendor yet.
 *
 * This is useful for:
 * - Checking if a user is already a vendor
 * - Displaying vendor dashboard information
 * - Conditional UI rendering (show/hide "Become a Vendor" button)
 */
export const getMyVendorProfile = protectedProcedure.handler(
    async ({ context }) => {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: context.session.user.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                // Also include counts of related data for dashboard stats
                _count: {
                    select: {
                        products: true,
                        orders: true,
                    },
                },
            },
        });

        return vendor;
    }
);

/**
 * Procedure: updateVendorProfile
 *
 * Allows vendors to update their shop information.
 * They can change shop name, description, and logo.
 */
export const updateVendorProfile = protectedProcedure
    .input(
        z.object({
            shopName: z.string().min(3).max(100).optional(),
            description: z.string().min(10).max(500).optional(),
            logo: z.url().optional(),
        })
    )
    .handler(async ({ input, context }) => {
        // First verify the user is actually a vendor
        const existingVendor = await prisma.vendor.findUnique({
            where: { userId: context.session.user.id },
        });

        if (!existingVendor) {
            throw new ORPCError("NOT_FOUND", {
                message: "You don't have a vendor profile",
            });
        }

        // Update only the fields that were provided
        // If a field is undefined, Prisma will ignore it
        const updatedVendor = await prisma.vendor.update({
            where: { userId: context.session.user.id },
            data: {
                ...(input.shopName && { shopName: input.shopName }),
                ...(input.description && { description: input.description }),
                ...(input.logo && { logo: input.logo }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: "Vendor profile updated successfully",
            vendor: updatedVendor,
        };
    });

/**
 * Procedure: getVendorById
 *
 * Public endpoint to view any vendor's profile.
 * This is what customers see when they visit a vendor's shop page.
 */
export const getVendorById = protectedProcedure
    .input(
        z.object({
            vendorId: z.cuid("Invalid vendor ID"),
        })
    )
    .handler(async ({ input }) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id: input.vendorId },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
                // Include product count for display
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new ORPCError("NOT_FOUND", {
                message: "Vendor not found",
            });
        }

        // Don't show unapproved vendors to public
        if (!vendor.isApproved) {
            throw new ORPCError("FORBIDDEN", {
                message: "This vendor is not yet approved",
            });
        }

        return vendor;
    });

/**
 * Export all vendor procedures as a router object
 * This gets imported into the main app router
 */
export const vendorRouter = {
    becomeVendor,
    getMyVendorProfile,
    updateVendorProfile,
    getVendorById,
};
