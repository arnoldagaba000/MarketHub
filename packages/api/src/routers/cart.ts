/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import prisma from "@MarketHub/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

/**
 * Cart Router - Handles shopping cart operations
 *
 * The shopping cart is persistent and stored in the database.
 * This means a user's cart survives across sessions and devices.
 *
 * Key features:
 * - Add products with quantity validation
 * - Update quantities with stock checking
 * - Remove individual items or clear entire cart
 * - Calculate totals with current prices
 */

/**
 * Procedure: addToCart
 *
 * Adds a product to the user's cart with the specified quantity.
 * If the product is already in the cart, it increases the quantity.
 *
 * Stock validation happens here to prevent overselling.
 */
export const addToCart = protectedProcedure
    .input(
        z.object({
            productId: z.cuid("Invalid product ID"),
            quantity: z
                .number()
                .int("Quantity must be a whole number")
                .positive("Quantity must be at least 1")
                .max(100, "Maximum quantity per item is 100"),
        })
    )
    .handler(async ({ input, context }) => {
        // First, verify the product exists and is available for purchase
        const product = await prisma.product.findUnique({
            where: { id: input.productId },
            include: {
                vendor: true,
            },
        });

        if (!product) {
            throw new ORPCError("NOT_FOUND", {
                message: "Product not found",
            });
        }

        if (!product.isActive) {
            throw new ORPCError("BAD_REQUEST", {
                message: "This product is no longer available",
            });
        }

        if (!product.vendor.isApproved) {
            throw new ORPCError("BAD_REQUEST", {
                message: "This product is from an unapproved vendor",
            });
        }

        // Check if product already exists in cart
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                userId_productId: {
                    userId: context.session.user.id,
                    productId: input.productId,
                },
            },
        });

        // Calculate the new quantity (existing + requested)
        const newQuantity = existingCartItem
            ? existingCartItem.quantity + input.quantity
            : input.quantity;

        // Validate stock availability
        if (newQuantity > product.stock) {
            throw new ORPCError("BAD_REQUEST", {
                message: `Only ${product.stock} items available in stock. You ${
                    existingCartItem
                        ? `already have ${existingCartItem.quantity} in your cart`
                        : "requested too many"
                }.`,
            });
        }

        // Either update existing cart item or create new one
        const cartItem = await prisma.cartItem.upsert({
            where: {
                userId_productId: {
                    userId: context.session.user.id,
                    productId: input.productId,
                },
            },
            update: {
                quantity: newQuantity,
            },
            create: {
                userId: context.session.user.id,
                productId: input.productId,
                quantity: input.quantity,
            },
            include: {
                product: {
                    include: {
                        images: {
                            orderBy: { order: "asc" },
                            take: 1, // Just need the main image
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
        });

        return {
            success: true,
            message: existingCartItem
                ? "Cart updated successfully"
                : "Product added to cart",
            cartItem,
        };
    });

/**
 * Procedure: updateCartItemQuantity
 *
 * Updates the quantity of a cart item.
 * Can increase or decrease quantity, but must stay within stock limits.
 */
export const updateCartItemQuantity = protectedProcedure
    .input(
        z.object({
            cartItemId: z.cuid("Invalid cart item ID"),
            quantity: z
                .number()
                .int("Quantity must be a whole number")
                .positive("Quantity must be at least 1")
                .max(100, "Maximum quantity per item is 100"),
        })
    )
    .handler(async ({ input, context }) => {
        // Verify the cart item exists and belongs to this user
        const cartItem = await prisma.cartItem.findUnique({
            where: { id: input.cartItemId },
            include: {
                product: true,
            },
        });

        if (!cartItem) {
            throw new ORPCError("NOT_FOUND", {
                message: "Cart item not found",
            });
        }

        if (cartItem.userId !== context.session.user.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "This cart item doesn't belong to you",
            });
        }

        // Validate new quantity against stock
        if (input.quantity > cartItem.product.stock) {
            throw new ORPCError("BAD_REQUEST", {
                message: `Only ${cartItem.product.stock} items available in stock`,
            });
        }

        // Update the quantity
        const updatedCartItem = await prisma.cartItem.update({
            where: { id: input.cartItemId },
            data: { quantity: input.quantity },
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
        });

        return {
            success: true,
            message: "Cart updated successfully",
            cartItem: updatedCartItem,
        };
    });

/**
 * Procedure: removeFromCart
 *
 * Removes a specific item from the cart.
 */
export const removeFromCart = protectedProcedure
    .input(
        z.object({
            cartItemId: z.string().cuid("Invalid cart item ID"),
        })
    )
    .handler(async ({ input, context }) => {
        // Verify ownership before deleting
        const cartItem = await prisma.cartItem.findUnique({
            where: { id: input.cartItemId },
        });

        if (!cartItem) {
            throw new ORPCError("NOT_FOUND", {
                message: "Cart item not found",
            });
        }

        if (cartItem.userId !== context.session.user.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "This cart item doesn't belong to you",
            });
        }

        await prisma.cartItem.delete({
            where: { id: input.cartItemId },
        });

        return {
            success: true,
            message: "Item removed from cart",
        };
    });

/**
 * Procedure: clearCart
 *
 * Removes all items from the user's cart.
 * Useful after checkout or if user wants to start fresh.
 */
export const clearCart = protectedProcedure.handler(async ({ context }) => {
    const result = await prisma.cartItem.deleteMany({
        where: { userId: context.session.user.id },
    });

    return {
        success: true,
        message: `Removed ${result.count} items from cart`,
        itemsRemoved: result.count,
    };
});

/**
 * Procedure: getCart
 *
 * Retrieves the user's complete cart with all items, prices, and totals.
 * This is the main endpoint used to display the cart page.
 *
 * Returns cart items grouped by vendor, which is important because
 * each vendor ships separately.
 */
export const getCart = protectedProcedure.handler(async ({ context }) => {
    // Fetch all cart items with full product details
    const cartItems = await prisma.cartItem.findMany({
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
    });

    // Calculate totals and group by vendor
    // We group by vendor because each vendor ships separately
    const vendorGroups = new Map<string, typeof cartItems>();

    for (const item of cartItems) {
        const vendorId = item.product.vendorId;
        if (!vendorGroups.has(vendorId)) {
            vendorGroups.set(vendorId, []);
        }
        vendorGroups.get(vendorId)?.push(item);
    }

    // Calculate subtotal for each vendor and overall total
    const vendors = Array.from(vendorGroups.entries()).map(
        ([vendorId, items]) => {
            const subtotal = items.reduce(
                (sum, item) => sum + item.product.price * item.quantity,
                0
            );

            return {
                vendorId,
                vendorName: items[0]?.product.vendor.user.name,
                shopName: items[0]?.product.vendor.shopName,
                items,
                subtotal,
                itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            };
        }
    );

    const grandTotal = vendors.reduce(
        (sum, vendor) => sum + vendor.subtotal,
        0
    );
    const totalItems = vendors.reduce(
        (sum, vendor) => sum + vendor.itemCount,
        0
    );

    return {
        vendors,
        summary: {
            grandTotal,
            totalItems,
            vendorCount: vendors.length,
        },
    };
});

/**
 * Procedure: validateCart
 *
 * Checks if all items in the cart are still valid for purchase.
 * This includes checking:
 * - Products still exist and are active
 * - Sufficient stock is available
 * - Vendors are still approved
 *
 * Should be called before checkout to catch issues early.
 */
export const validateCart = protectedProcedure.handler(async ({ context }) => {
    const cartItems = await prisma.cartItem.findMany({
        where: { userId: context.session.user.id },
        include: {
            product: {
                include: {
                    vendor: true,
                },
            },
        },
    });

    const issues: Array<{
        cartItemId: string;
        productName: string;
        issue: string;
    }> = [];

    for (const item of cartItems) {
        // Check if product is still active
        if (!item.product.isActive) {
            issues.push({
                cartItemId: item.id,
                productName: item.product.name,
                issue: "Product is no longer available",
            });
            continue;
        }

        // Check if vendor is still approved
        if (!item.product.vendor.isApproved) {
            issues.push({
                cartItemId: item.id,
                productName: item.product.name,
                issue: "Vendor is no longer approved",
            });
            continue;
        }

        // Check stock availability
        if (item.quantity > item.product.stock) {
            issues.push({
                cartItemId: item.id,
                productName: item.product.name,
                issue: `Only ${item.product.stock} items available (you have ${item.quantity} in cart)`,
            });
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
});

/**
 * Export all cart procedures as a router object
 */
export const cartRouter = {
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    getCart,
    validateCart,
};
