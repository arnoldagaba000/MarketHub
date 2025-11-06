/** biome-ignore-all lint/style/noMagicNumbers: <explanation> */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
    Package,
    Plus,
    Settings,
    ShoppingBag,
    Store,
    TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/vendor/dashboard")({
    component: VendorDashboardPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to access vendor dashboard");
        }
        return { session };
    },
});

function VendorDashboardPage() {
    const navigate = useNavigate();

    // Fetch vendor profile
    const { data: vendorProfile, isLoading: isVendorLoading } = useQuery({
        queryKey: ["vendor-profile"],
        queryFn: () => orpc.vendor.getMyVendorProfile.call(),
    });

    // Fetch vendor products
    const { data: products, isLoading: isProductsLoading } = useQuery({
        queryKey: ["vendor-products"],
        queryFn: () => orpc.product.getMyProducts.call(),
        enabled: !!vendorProfile,
    });

    // Fetch vendor orders
    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: ["vendor-orders"],
        queryFn: () => orpc.order.getVendorOrders.call({ page: 1, limit: 10 }),
        enabled: !!vendorProfile,
    });

    if (isVendorLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!vendorProfile) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="p-6 text-center">
                        <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h2 className="mb-2 font-bold text-2xl">
                            You're not a vendor yet
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Create a vendor profile to start selling on
                            MarketHub
                        </p>
                        <Button
                            onClick={() => navigate({ to: "/become-vendor" })}
                        >
                            Become a Vendor
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isApproved = vendorProfile.isApproved;
    const totalProducts = products?.length || 0;
    const totalOrders = ordersData?.orders.length || 0;
    const pendingOrders =
        ordersData?.orders.filter((o) => o.status === "PENDING").length || 0;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-3xl">Vendor Dashboard</h1>
                        <p className="text-muted-foreground">
                            Manage your shop and products
                        </p>
                    </div>
                    {isApproved && (
                        <Button
                            onClick={() =>
                                navigate({ to: "/vendor/products/new" })
                            }
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    )}
                </div>
            </div>

            {/* Approval Status */}
            {!isApproved && (
                <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <h3 className="mb-1 font-semibold text-lg">
                                    Awaiting Approval
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Your vendor profile is pending admin
                                    approval. You'll be able to add products
                                    once approved.
                                </p>
                            </div>
                            <Badge
                                className="border-yellow-500 text-yellow-600"
                                variant="outline"
                            >
                                Pending
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Total Products
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {isProductsLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                totalProducts
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {isApproved
                                ? "Active products"
                                : "Awaiting approval"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Total Orders
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {isOrdersLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                totalOrders
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            All time orders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Pending Orders
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {isOrdersLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                pendingOrders
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Require attention
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs className="space-y-4" defaultValue="products">
                <TabsList>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Products Tab */}
                <TabsContent className="space-y-4" value="products">
                    {isProductsLoading ? (
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
                    // biome-ignore lint/style/noNestedTernary: For simplicity
                    ) : products && products.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {products.map((product) => (
                                <Card key={product.id}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="line-clamp-2 text-lg">
                                                    {product.name}
                                                </CardTitle>
                                                <p className="text-muted-foreground text-sm">
                                                    {product.category.name}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    product.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {product.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {product.images[0] && (
                                            <div className="aspect-square overflow-hidden rounded border">
                                                {/* biome-ignore lint/correctness/useImageSize: Ignore useImageSize */}
                                                <img
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                    src={product.images[0].url}
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xl">
                                                ${product.price.toFixed(2)}
                                            </span>
                                            <span className="text-muted-foreground text-sm">
                                                Stock: {product.stock}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1"
                                                onClick={() =>
                                                    navigate({
                                                        to: "/vendor/products/$productId",
                                                        params: {
                                                            productId:
                                                                product.id,
                                                        },
                                                    })
                                                }
                                                variant="outline"
                                            >
                                                Edit
                                            </Button>
                                            <Link
                                                params={{
                                                    productId: product.id,
                                                }}
                                                to="/products/$productId"
                                            >
                                                <Button
                                                    className="flex-1"
                                                    variant="outline"
                                                >
                                                    View
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <h3 className="mb-2 font-semibold text-lg">
                                    No products yet
                                </h3>
                                <p className="mb-4 text-muted-foreground text-sm">
                                    {isApproved
                                        ? "Start by adding your first product"
                                        : "Add products after approval"}
                                </p>
                                {isApproved && (
                                    <Button
                                        onClick={() =>
                                            navigate({
                                                to: "/vendor/products/new",
                                            })
                                        }
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Product
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent className="space-y-4" value="orders">
                    {isOrdersLoading ? (
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
                    // biome-ignore lint/style/noNestedTernary: For simplicity
                    ) : ordersData && ordersData.orders.length > 0 ? (
                        <div className="space-y-4">
                            {ordersData.orders.map((order) => (
                                <Card key={order.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg">
                                                    Order #
                                                    {order.id
                                                        .slice(-8)
                                                        .toUpperCase()}
                                                </CardTitle>
                                                <p className="text-muted-foreground text-sm">
                                                    {new Date(
                                                        order.createdAt
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Badge variant="outline">
                                                {order.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-sm">
                                                {order.items.length} items
                                            </span>
                                            <span className="font-bold text-lg">
                                                ${order.total.toFixed(2)}
                                            </span>
                                        </div>
                                        <Button
                                            className="w-full"
                                            onClick={() =>
                                                navigate({
                                                    to: "/vendor/dashboard",
                                                    search: { orderId: order.id },
                                                })
                                            }
                                            variant="outline"
                                        >
                                            View Details
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <h3 className="mb-2 font-semibold text-lg">
                                    No orders yet
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Orders will appear here when customers
                                    purchase your products
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent className="space-y-4" value="settings">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                <CardTitle>Vendor Settings</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg bg-muted p-4">
                                <p className="font-medium text-sm">Shop Name</p>
                                <p className="text-muted-foreground">
                                    {vendorProfile.shopName}
                                </p>
                            </div>
                            {vendorProfile.description && (
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="font-medium text-sm">
                                        Description
                                    </p>
                                    <p className="text-muted-foreground">
                                        {vendorProfile.description}
                                    </p>
                                </div>
                            )}
                            <Button
                                onClick={() =>
                                    navigate({ to: "/vendor/dashboard" })
                                }
                                variant="outline"
                            >
                                Edit Profile
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
