/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Package, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
    component: RouteComponent,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            redirect({
                to: "/login",
                throw: true,
            });
        }
        return { session };
    },
});

function RouteComponent() {
    const { session } = Route.useRouteContext();

    // Fetch user data
    const privateData = useQuery(orpc.privateData.queryOptions());

    // Fetch vendor profile if exists
    const { data: vendorProfile } = useQuery({
        queryKey: ["vendor-profile"],
        queryFn: () => orpc.vendor.getMyVendorProfile.call(),
        enabled: !!session.data?.user,
    });

    // Fetch user orders
    const { data: ordersData } = useQuery({
        queryKey: ["orders"],
        queryFn: () => orpc.order.getMyOrders.call({ page: 1, limit: 5 }),
        enabled: !!session.data?.user,
    });

    // Fetch cart
    const { data: cart } = useQuery({
        queryKey: ["cart"],
        queryFn: () => orpc.cart.getCart.call(),
        enabled: !!session.data?.user,
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="font-bold text-3xl">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session.data?.user.name}!
                </p>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Cart Items
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {cart ? cart.summary.totalItems : 0}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Items in your cart
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Total Orders
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {ordersData ? ordersData.pagination.totalCount : 0}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            All time orders
                        </p>
                    </CardContent>
                </Card>

                {vendorProfile && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">
                                Vendor Status
                            </CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">
                                {vendorProfile.isApproved ? (
                                    <Badge className="border-green-500/20 bg-green-500/10 text-green-600">
                                        Approved
                                    </Badge>
                                ) : (
                                    <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">
                                        Pending
                                    </Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {vendorProfile.isApproved
                                    ? "Your shop is active"
                                    : "Awaiting approval"}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            API Status
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {privateData.data ? (
                                <Badge variant="default">Connected</Badge>
                            ) : (
                                <Badge variant="destructive">
                                    Disconnected
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            API connection
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="mb-8 grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link to="/products">
                            <Button className="w-full" variant="outline">
                                Browse Products
                            </Button>
                        </Link>
                        <Link to="/orders">
                            <Button className="w-full" variant="outline">
                                View Orders
                            </Button>
                        </Link>
                        {cart && cart.summary.totalItems > 0 && (
                            <Link to="/cart">
                                <Button className="w-full" variant="outline">
                                    View Cart ({cart.summary.totalItems} items)
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>

                {vendorProfile ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendor Dashboard</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link to="/vendor/dashboard">
                                <Button className="w-full" variant="outline">
                                    Manage Shop
                                </Button>
                            </Link>
                            <Link to="/vendor/products/new">
                                <Button className="w-full" variant="outline">
                                    Add Product
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Become a Vendor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-muted-foreground text-sm">
                                Start selling your products on MarketHub
                            </p>
                            <Link to="/become-vendor">
                                <Button className="w-full">
                                    Become a Vendor
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Recent Orders */}
            {ordersData && ordersData.orders.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Orders</CardTitle>
                            <Link to="/orders">
                                <Button variant="ghost">View All</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {ordersData.orders.slice(0, 3).map((order) => (
                                <div
                                    className="flex items-center justify-between rounded-lg border p-4"
                                    key={order.id}
                                >
                                    <div>
                                        <p className="font-medium">
                                            Order #
                                            {order.id.slice(-8).toUpperCase()}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            {new Date(
                                                order.createdAt
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">
                                            ${order.total.toFixed(2)}
                                        </p>
                                        <Badge variant="outline">
                                            {order.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
