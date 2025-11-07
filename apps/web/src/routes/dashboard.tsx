/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useQuery } from "@tanstack/react-query";
import {
    createFileRoute,
    Link,
    redirect,
    useSearch,
} from "@tanstack/react-router";
import { Package, Shield, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
    component: RouteComponent,
    validateSearch: (search: Record<string, unknown>) => ({
        error: (search.error as string) || undefined,
    }),
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
    const search = useSearch({ from: "/dashboard" });

    // Fetch user data
    const privateData = useQuery(orpc.privateData.queryOptions());

    // Fetch admin status
    const { data: adminStatus } = useQuery({
        queryKey: ["admin-status"],
        queryFn: () => orpc.admin.getMyAdminStatus.call(),
        enabled: !!session.data?.user,
    });

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

    // Show error message if redirected with error
    useEffect(() => {
        if (search?.error) {
            toast.error(search.error);
        }
    }, [search?.error]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="font-bold text-3xl">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session.data?.user.name}!
                </p>
            </div>

            {/* Admin Banner */}
            {adminStatus?.isAdmin && (
                <Card className="mb-6 border-purple-500/20 bg-purple-500/5">
                    <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-3">
                            <Shield className="h-6 w-6 text-purple-600" />
                            <div>
                                <h3 className="font-semibold text-lg">
                                    Administrator Access
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    You have admin privileges to manage the
                                    platform
                                </p>
                            </div>
                        </div>
                        <Link to="/admin/dashboard">
                            <Button className="bg-purple-600 hover:bg-purple-700">
                                <Shield className="mr-2 h-4 w-4" />
                                Go to Admin Dashboard
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

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

                {adminStatus?.isAdmin && (
                    <Card className="border-purple-500/20 bg-purple-500/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">
                                Admin Status
                            </CardTitle>
                            <Shield className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">
                                <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-600">
                                    Admin
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Platform administrator
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
                                <Badge className="border-green-500/20 bg-green-500/10 text-green-600">
                                    Connected
                                </Badge>
                            ) : (
                                <Badge className="border-red-500/20 bg-red-500/10 text-red-600">
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
                        {adminStatus?.isAdmin && (
                            <Link to="/admin/dashboard">
                                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                    <Shield className="mr-2 h-4 w-4" />
                                    Admin Dashboard
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
                                    Add New Product
                                </Button>
                            </Link>
                            <Link to="/vendor/settings">
                                <Button className="w-full" variant="outline">
                                    Vendor Settings
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
        </div>
    );
}
