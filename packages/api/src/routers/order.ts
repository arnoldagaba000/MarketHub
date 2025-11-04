/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import prisma from "@MarketHub/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Order } from "../../../db/prisma/generated/client";
import type { OrderWhereInput } from "../../../db/prisma/generated/models";
import { protectedProcedure } from "../index";

/**
 * Order Router - Handles order creation and management
 *
 * This is the most critical part of the e-commerce system.
 * Orders represent completed purchases and must be handled with care.
 *
 * Key concepts:
 * - Orders are created from cart items
 * - Each vendor gets a separate order (multi-vendor support)
 * - Stock is decremented atomically to prevent overselling
 * - Price is captured at checkout time (not current price)
 * - Orders can be tracked through multiple status stages
 */

/**
 * Helper function to verify vendor ownership of an order
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

    return vendor;
}

/**
 * Type for cart items with product and vendor information
 */
type CartItemWithProduct = Awaited<
    ReturnType<
        typeof prisma.cartItem.findMany<{
            include: {
                product: {
                    include: {
                        vendor: true;
                    };
                };
            };
        }>
    >
>[number];

/**
 * Validate cart items before order creation
 */
function validateCartItems(cartItems: CartItemWithProduct[]) {
    for (const item of cartItems) {
        if (!item.product.isActive) {
            throw new ORPCError("BAD_REQUEST", {
                message: `Product "${item.product.name}" is no longer available`,
            });
        }

        if (!item.product.vendor.isApproved) {
            throw new ORPCError("BAD_REQUEST", {
                message: `Vendor for "${item.product.name}" is no longer approved`,
            });
        }

        if (item.quantity > item.product.stock) {
            throw new ORPCError("BAD_REQUEST", {
                message: `Insufficient stock for "${item.product.name}". Only ${item.product.stock} available.`,
            });
        }
    }
}

/**
 * Group cart items by vendor ID
 */
function groupCartItemsByVendor(
    cartItems: CartItemWithProduct[]
): Map<string, CartItemWithProduct[]> {
    const vendorGroups = new Map<string, CartItemWithProduct[]>();
    for (const item of cartItems) {
        const vendorId = item.product.vendorId;
        if (!vendorGroups.has(vendorId)) {
            vendorGroups.set(vendorId, []);
        }
        vendorGroups.get(vendorId)?.push(item);
    }
    return vendorGroups;
}

/**
 * Procedure: createOrder
 *
 * Creates orders from the user's cart items.
 * This is a complex operation with multiple steps:
 * 1. Validate all cart items are still purchasable
 * 2. Group cart items by vendor
 * 3. Create separate orders for each vendor
 * 4. Decrement product stock
 * 5. Clear the cart
 *
 * All steps must succeed or the entire operation is rolled back.
 * This is called a "transaction" and ensures data consistency.
 */
export const createOrder = protectedProcedure
    .input(
        z.object({
            shippingAddress: z
                .string()
                .min(10, "Shipping address must be at least 10 characters")
                .max(500, "Shipping address is too long"),
        })
    )
    .handler(async ({ input, context }) => {
        // Use a transaction to ensure all-or-nothing behavior
        // If any step fails, everything is rolled back
        const orders = await prisma.$transaction(async (tx) => {
            // Step 1: Get all cart items with product details
            const cartItems = await tx.cartItem.findMany({
                where: { userId: context.session.user.id },
                include: {
                    product: {
                        include: {
                            vendor: true,
                        },
                    },
                },
            });

            if (cartItems.length === 0) {
                throw new ORPCError("BAD_REQUEST", {
                    message: "Your cart is empty",
                });
            }

            // Step 2: Validate all items
            validateCartItems(cartItems);

            // Step 3: Group items by vendor
            const vendorGroups = groupCartItemsByVendor(cartItems);

            // Step 4: Create an order for each vendor
            const createdOrders: Order[] = [];

            for (const [vendorId, items] of vendorGroups.entries()) {
                // Calculate total for this vendor's order
                const total = items.reduce(
                    (sum, item) => sum + item.product.price * item.quantity,
                    0
                );

                // Create the order
                const order = await tx.order.create({
                    data: {
                        userId: context.session.user.id,
                        vendorId,
                        shippingAddress: input.shippingAddress,
                        total,
                        status: "PENDING",
                        // Create order items
                        items: {
                            create: items.map((item) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                // Capture current price - important!
                                // This preserves the price the customer agreed to pay
                                price: item.product.price,
                            })),
                        },
                    },
                    include: {
                        items: {
                            include: {
                                product: {
                                    include: {
                                        images: {
                                            orderBy: { order: "asc" },
                                            take: 1,
                                        },
                                    },
                                },
                            },
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
                });

                // Step 5: Decrement stock for each product
                // This is critical to prevent overselling
                for (const item of items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                decrement: item.quantity,
                            },
                        },
                    });
                }

                createdOrders.push(order);
            }

            // Step 6: Clear the cart
            await tx.cartItem.deleteMany({
                where: { userId: context.session.user.id },
            });

            return createdOrders;
        });

        return {
            success: true,
            message: `Successfully created ${orders.length} order(s)`,
            orders,
        };
    });

/**
 * Procedure: getMyOrders
 *
 * Retrieves all orders placed by the current user.
 * Sorted by most recent first.
 */
export const getMyOrders = protectedProcedure
    .input(
        z
            .object({
                status: z
                    .enum([
                        "PENDING",
                        "CONFIRMED",
                        "SHIPPED",
                        "DELIVERED",
                        "CANCELLED",
                    ])
                    .optional(),
                page: z.number().int().positive().default(1),
                limit: z.number().int().positive().max(100).default(20),
            })
            .optional()
    )
    .handler(async ({ input, context }) => {
        const { status, page = 1, limit = 20 } = input || {};

        const where: OrderWhereInput = {
            userId: context.session.user.id,
        };

        if (status) {
            where.status = status;
        }

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: { order: "asc" },
                                        take: 1,
                                    },
                                },
                            },
                        },
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
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    });

/**
 * Procedure: getOrderById
 *
 * Get detailed information about a specific order.
 * Users can only view their own orders.
 * Vendors can view orders placed from them.
 */
export const getOrderById = protectedProcedure
    .input(
        z.object({
            orderId: z.cuid("Invalid order ID"),
        })
    )
    .handler(async ({ input, context }) => {
        const order = await prisma.order.findUnique({
            where: { id: input.orderId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                images: {
                                    orderBy: { order: "asc" },
                                },
                            },
                        },
                    },
                },
                vendor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!order) {
            throw new ORPCError("NOT_FOUND", {
                message: "Order not found",
            });
        }

        // Check if user has permission to view this order
        // Either they're the customer or they're the vendor
        const vendor = await prisma.vendor.findUnique({
            where: { userId: context.session.user.id },
        });

        const isCustomer = order.userId === context.session.user.id;
        const isVendor = vendor && order.vendorId === vendor.id;

        if (!(isCustomer || isVendor)) {
            throw new ORPCError("FORBIDDEN", {
                message: "You don't have permission to view this order",
            });
        }

        return order;
    });

/**
 * Procedure: getVendorOrders
 *
 * Retrieves all orders for the current vendor.
 * This is what vendors use to manage their order fulfillment.
 */
export const getVendorOrders = protectedProcedure
    .input(
        z
            .object({
                status: z
                    .enum([
                        "PENDING",
                        "CONFIRMED",
                        "SHIPPED",
                        "DELIVERED",
                        "CANCELLED",
                    ])
                    .optional(),
                page: z.number().int().positive().default(1),
                limit: z.number().int().positive().max(100).default(20),
            })
            .optional()
    )
    .handler(async ({ input, context }) => {
        const vendor = await getVendorProfile(context.session.user.id);

        const { status, page = 1, limit = 20 } = input || {};

        const where: OrderWhereInput = {
            vendorId: vendor.id,
        };

        if (status) {
            where.status = status;
        }

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: { order: "asc" },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    });

/**
 * Procedure: updateOrderStatus
 *
 * Allows vendors to update the status of their orders.
 * This is how vendors mark orders as confirmed, shipped, or delivered.
 *
 * Status flow: PENDING -> CONFIRMED -> SHIPPED -> DELIVERED
 * Orders can be cancelled from PENDING or CONFIRMED state.
 */
export const updateOrderStatus = protectedProcedure
    .input(
        z.object({
            orderId: z.cuid("Invalid order ID"),
            status: z.enum(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
        })
    )
    .handler(async ({ input, context }) => {
        const vendor = await getVendorProfile(context.session.user.id);

        // Verify the order exists and belongs to this vendor
        const order = await prisma.order.findUnique({
            where: { id: input.orderId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            throw new ORPCError("NOT_FOUND", {
                message: "Order not found",
            });
        }

        if (order.vendorId !== vendor.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "You can only update your own orders",
            });
        }

        // Validate status transitions
        // Can't mark a cancelled order as anything else
        if (order.status === "CANCELLED") {
            throw new ORPCError("BAD_REQUEST", {
                message: "Cannot update a cancelled order",
            });
        }

        // Can't mark a delivered order as anything else
        if (order.status === "DELIVERED") {
            throw new ORPCError("BAD_REQUEST", {
                message: "Cannot update a delivered order",
            });
        }

        // If cancelling, restore stock
        let updatedOrder: Order;
        if (input.status === "CANCELLED") {
            updatedOrder = await prisma.$transaction(async (tx) => {
                // Restore stock for all items
                for (const item of order.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                increment: item.quantity,
                            },
                        },
                    });
                }

                // Update order status
                return await tx.order.update({
                    where: { id: input.orderId },
                    data: { status: input.status },
                    include: {
                        items: {
                            include: {
                                product: {
                                    include: {
                                        images: {
                                            orderBy: { order: "asc" },
                                            take: 1,
                                        },
                                    },
                                },
                            },
                        },
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
            });
        } else {
            // Normal status update
            updatedOrder = await prisma.order.update({
                where: { id: input.orderId },
                data: { status: input.status },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: { order: "asc" },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });
        }

        return {
            success: true,
            message: `Order status updated to ${input.status}`,
            order: updatedOrder,
        };
    });

/**
 * Procedure: cancelOrder
 *
 * Allows customers to cancel their pending orders.
 * Can only cancel orders in PENDING or CONFIRMED status.
 * Stock is automatically restored.
 */
export const cancelOrder = protectedProcedure
    .input(
        z.object({
            orderId: z.cuid("Invalid order ID"),
            reason: z.string().min(5).max(500).optional(),
        })
    )
    .handler(async ({ input, context }) => {
        const order = await prisma.order.findUnique({
            where: { id: input.orderId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            throw new ORPCError("NOT_FOUND", {
                message: "Order not found",
            });
        }

        if (order.userId !== context.session.user.id) {
            throw new ORPCError("FORBIDDEN", {
                message: "You can only cancel your own orders",
            });
        }

        // Can only cancel pending or confirmed orders
        if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
            throw new ORPCError("BAD_REQUEST", {
                message: `Cannot cancel order with status ${order.status}`,
            });
        }

        // Cancel order and restore stock
        const cancelledOrder = await prisma.$transaction(async (tx) => {
            // Restore stock
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            increment: item.quantity,
                        },
                    },
                });
            }

            // Update order status
            return await tx.order.update({
                where: { id: input.orderId },
                data: { status: "CANCELLED" },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: { order: "asc" },
                                        take: 1,
                                    },
                                },
                            },
                        },
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
            });
        });

        return {
            success: true,
            message: "Order cancelled successfully",
            order: cancelledOrder,
        };
    });

/**
 * Export all order procedures as a router object
 */
export const orderRouter = {
    createOrder,
    getMyOrders,
    getOrderById,
    getVendorOrders,
    updateOrderStatus,
    cancelOrder,
};
