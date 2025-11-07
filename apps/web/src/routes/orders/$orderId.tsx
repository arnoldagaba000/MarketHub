/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/orders/$orderId")({
    component: OrderDetailPage,
    beforeLoad: async ({ params }) => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to view orders");
        }
        // Verify user owns this order or is the vendor
        const order = await orpc.order.getOrderById.call({
            orderId: params.orderId,
        });
        if (!order) {
            throw new Error("Order not found");
        }
        // Check if user is the customer or the vendor
        const vendorProfile = await orpc.vendor.getMyVendorProfile.call();
        const isCustomer = order.userId === session.data.user.id;
        const isVendor = vendorProfile && order.vendorId === vendorProfile.id;
        if (!(isCustomer || isVendor)) {
            throw new Error("You don't have permission to view this order");
        }
        return { session, order, vendorProfile };
    },
});

function OrderDetailPage() {
    const { orderId } = Route.useParams();
    const navigate = useNavigate();

    // Fetch order details
    const { data: order, isLoading } = useQuery({
        queryKey: ["order", orderId],
        queryFn: () => orpc.order.getOrderById.call({ orderId }),
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="mb-4 font-bold text-2xl">Order not found</h1>
                <Button onClick={() => navigate({ to: "/orders" })}>
                    Back to Orders
                </Button>
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

    const canCancel =
        order.status === "PENDING" || order.status === "CONFIRMED";

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-8">
                <Button
                    onClick={() => navigate({ to: "/orders" })}
                    variant="outline"
                >
                    ← Back to Orders
                </Button>
            </div>

            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-3xl">
                            Order #{order.id.slice(-8).toUpperCase()}
                        </h1>
                        <p className="text-muted-foreground">
                            Placed on{" "}
                            {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <Badge
                        className={getStatusColor(order.status)}
                        variant="outline"
                    >
                        {order.status}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Vendor Info */}
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-xl">Vendor</h2>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <p className="font-medium text-sm">Shop Name</p>
                                <p className="text-muted-foreground">
                                    {order.vendor.shopName}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-sm">Vendor</p>
                                <p className="text-muted-foreground">
                                    {order.vendor.user.name}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Items */}
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-xl">
                                Order Items
                            </h2>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.items.map((item) => (
                                <div
                                    className="flex items-center gap-4 rounded-lg border p-4"
                                    key={item.id}
                                >
                                    {item.product.images[0] && (
                                        <div className="h-20 w-20 overflow-hidden rounded border">
                                            {/* biome-ignore lint/correctness/useImageSize: Ignore useImageSize */}
                                            <img
                                                alt={item.product.name}
                                                className="h-full w-full object-cover"
                                                src={item.product.images[0].url}
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
                                        {(item.price * item.quantity).toFixed(
                                            2
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                <h2 className="font-semibold text-xl">
                                    Shipping Address
                                </h2>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                {order.shippingAddress}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <h2 className="font-semibold text-xl">
                                Order Summary
                            </h2>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Items
                                    </span>
                                    <span>{order.items.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Subtotal
                                    </span>
                                    <span>${order.total.toFixed(2)}</span>
                                </div>
                                <div className="border-t pt-2">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>${order.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {canCancel && (
                                <div className="border-t pt-4">
                                    <p className="mb-2 text-muted-foreground text-sm">
                                        You can cancel this order if it hasn't
                                        been shipped yet.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
