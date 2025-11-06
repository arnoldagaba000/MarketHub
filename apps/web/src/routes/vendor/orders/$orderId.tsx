/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/vendor/orders/$orderId")({
    component: VendorOrderDetailPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to view orders");
        }
        return { session };
    },
});

function VendorOrderDetailPage() {
    const { orderId } = Route.useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch order details
    const { data: order, isLoading } = useQuery({
        queryKey: ["vendor-order", orderId],
        queryFn: () => orpc.order.getOrderById.call({ orderId }),
    });

    // Update order status mutation
    const updateStatusMutation = useMutation({
        mutationFn: (
            status: "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED"
        ) => orpc.order.updateOrderStatus.call({ orderId, status }),
        onSuccess: () => {
            toast.success("Order status updated successfully!");
            queryClient.invalidateQueries({
                queryKey: ["vendor-order", orderId],
            });
            queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
        },
        onError: (error) => {
            toast.error(
                (error as Error).message || "Failed to update order status"
            );
        },
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
                <Button onClick={() => navigate({ to: "/vendor/dashboard" })}>
                    Back to Dashboard
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

    const canUpdateStatus =
        order.status !== "CANCELLED" && order.status !== "DELIVERED";

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-8">
                <Button
                    onClick={() => navigate({ to: "/vendor/dashboard" })}
                    variant="outline"
                >
                    ← Back to Dashboard
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
                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-xl">
                                Customer Information
                            </h2>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <p className="font-medium text-sm">Name</p>
                                <p className="text-muted-foreground">
                                    {order.user.name}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-sm">Email</p>
                                <p className="text-muted-foreground">
                                    {order.user.email}
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

                            {canUpdateStatus && (
                                <div className="space-y-2 border-t pt-4">
                                    <label className="font-medium text-sm">
                                        Update Order Status
                                    </label>

                                    <Select
                                        onValueChange={(value) => {
                                            updateStatusMutation.mutate(
                                                value as
                                                    | "CONFIRMED"
                                                    | "SHIPPED"
                                                    | "DELIVERED"
                                                    | "CANCELLED"
                                            );
                                        }}
                                        value={order.status}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PENDING">
                                                Pending
                                            </SelectItem>
                                            <SelectItem value="CONFIRMED">
                                                Confirmed
                                            </SelectItem>
                                            <SelectItem value="SHIPPED">
                                                Shipped
                                            </SelectItem>
                                            <SelectItem value="DELIVERED">
                                                Delivered
                                            </SelectItem>
                                            <SelectItem value="CANCELLED">
                                                Cancelled
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-muted-foreground text-xs">
                                        {updateStatusMutation.isPending &&
                                            "Updating..."}
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
