/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/orders")({
    component: OrdersPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to view orders");
        }
        return { session };
    },
});

function OrdersPage() {
    // Fetch user orders
    const { data: ordersData, isLoading } = useQuery({
        queryKey: ["orders"],
        queryFn: () => orpc.order.getMyOrders.call({ page: 1, limit: 50 }),
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4">
                    {[...new Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-48" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!ordersData || ordersData.orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4 text-center">
                    <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h2 className="font-bold text-2xl">No orders yet</h2>
                    <p className="text-muted-foreground">
                        Start shopping to see your orders here
                    </p>
                    <Link to="/products">
                        <Button>Browse Products</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
                return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
            case "CONFIRMED":
                return "bg-blue-500/10 text-blue-600 border-blue-500/20";
            case "SHIPPED":
                return "bg-purple-500/10 text-purple-600 border-purple-500/20";
            case "DELIVERED":
                return "bg-green-500/10 text-green-600 border-green-500/20";
            case "CANCELLED":
                return "bg-red-500/10 text-red-600 border-red-500/20";
            default:
                return "bg-muted text-muted-foreground";
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="font-bold text-3xl">My Orders</h1>
                <p className="text-muted-foreground">
                    View and track your order history
                </p>
            </div>

            <div className="space-y-6">
                {ordersData.orders.map((order) => (
                    <Card key={order.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <h3 className="font-semibold text-lg">
                                            Order #
                                            {order.id.slice(-8).toUpperCase()}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            Placed on{" "}
                                            {new Date(
                                                order.createdAt
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    className={getStatusColor(order.status)}
                                    variant="outline"
                                >
                                    {order.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Vendor Info */}
                            <div className="rounded-lg bg-muted p-4">
                                <p className="font-medium text-sm">Vendor</p>
                                <p className="text-muted-foreground">
                                    {order.vendor.shopName} by{" "}
                                    {order.vendor.user.name}
                                </p>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3">
                                <p className="font-medium text-sm">Items</p>
                                {order.items.map((item) => (
                                    <div
                                        className="flex items-center gap-4 rounded-lg border p-3"
                                        key={item.id}
                                    >
                                        {item.product.images[0] && (
                                            <div className="h-16 w-16 overflow-hidden rounded border">
                                                {/* biome-ignore lint/correctness/useImageSize: Ignore useImageSize */}
                                                <img
                                                    alt={item.product.name}
                                                    className="h-full w-full object-cover"
                                                    src={
                                                        item.product.images[0]
                                                            .url
                                                    }
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <Link
                                                className="font-medium hover:text-primary"
                                                params={{
                                                    productId: item.product.id,
                                                }}
                                                to="/products/$productId"
                                            >
                                                {item.product.name}
                                            </Link>
                                            <p className="text-muted-foreground text-sm">
                                                Quantity: {item.quantity} × $
                                                {item.price.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="font-semibold">
                                            $
                                            {(
                                                item.price * item.quantity
                                            ).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Shipping Address */}
                            <div className="rounded-lg bg-muted p-4">
                                <p className="font-medium text-sm">
                                    Shipping Address
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {order.shippingAddress}
                                </p>
                            </div>

                            {/* Order Total */}
                            <div className="flex items-center justify-between border-t pt-4">
                                <span className="font-semibold text-lg">
                                    Total
                                </span>
                                <span className="font-bold text-xl">
                                    ${order.total.toFixed(2)}
                                </span>
                            </div>

                            {/* Actions */}
                            {(order.status === "PENDING" ||
                                order.status === "CONFIRMED") && (
                                <Link
                                    params={{ orderId: order.id }}
                                    to="/orders/$orderId"
                                >
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                    >
                                        View Order Details
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pagination */}
            {ordersData.pagination.totalPages > 1 && (
                <div className="mt-8 text-center text-muted-foreground text-sm">
                    Page {ordersData.pagination.page} of{" "}
                    {ordersData.pagination.totalPages}
                </div>
            )}
        </div>
    );
}
