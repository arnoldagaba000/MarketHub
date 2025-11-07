import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Store, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
    component: HomeComponent,
});

function HomeComponent() {
    const healthCheck = useQuery(orpc.healthCheck.queryOptions());

    // Fetch featured products
    const { data: productsData } = useQuery({
        queryKey: ["featured-products"],
        queryFn: () =>
            orpc.product.listProducts.call({
                page: 1,
                limit: 6,
                sortBy: "newest",
            }),
    });

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => orpc.category.listCategories.call(),
    });

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
            {/* Hero Section */}
            <div className="mb-12 text-center">
                <h1 className="mb-4 font-bold text-4xl">
                    Welcome to MarketHub
                </h1>
                <p className="mb-8 text-lg text-muted-foreground">
                    Discover amazing products from trusted vendors
                </p>
                <div className="flex justify-center gap-4">
                    <Link to="/products">
                        <Button size="lg">
                            <ShoppingBag className="mr-2 h-5 w-5" />
                            Shop Now
                        </Button>
                    </Link>
                    <Link to="/become-vendor">
                        <Button size="lg" variant="outline">
                            <Store className="mr-2 h-5 w-5" />
                            Become a Vendor
                        </Button>
                    </Link>
                </div>
            </div>

            {/* API Status */}
            <Card className="mb-12">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="mb-2 font-semibold text-xl">
                                API Status
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                Check if the backend is running
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-3 w-3 rounded-full ${
                                    healthCheck.data
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                }`}
                            />
                            <span className="text-muted-foreground text-sm">
                                {healthCheck.isLoading
                                    ? "Checking..."
                                    : // biome-ignore lint/style/noNestedTernary: For simplicity
                                      healthCheck.data
                                      ? "Connected"
                                      : "Disconnected"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Categories */}
            {categories && categories.length > 0 && (
                <div className="mb-12">
                    <h2 className="mb-6 font-bold text-2xl">
                        Shop by Category
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                search={{ category: category.id }}
                                to="/products"
                            >
                                <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                                    <CardContent className="p-6">
                                        <h3 className="mb-2 font-semibold text-lg">
                                            {category.name}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            {category._count.products} products
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Featured Products */}
            {productsData && productsData.products.length > 0 && (
                <div className="mb-12">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="font-bold text-2xl">
                            Featured Products
                        </h2>
                        <Link to="/products">
                            <Button variant="ghost">View All</Button>
                        </Link>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {productsData.products.map((product) => (
                            <Link
                                key={product.id}
                                params={{ productId: product.id }}
                                to="/products/$productId"
                            >
                                <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                                    {/* Product Image */}
                                    <div className="aspect-square overflow-hidden">
                                        {product.images[0] ? (
                                            // biome-ignore lint/correctness/useImageSize: Ignore useImageSize
                                            <img
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                                src={product.images[0].url}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-muted">
                                                <span className="text-muted-foreground">
                                                    No image
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <CardContent className="p-4">
                                        <h3 className="mb-2 line-clamp-2 font-semibold">
                                            {product.name}
                                        </h3>
                                        <p className="mb-2 text-muted-foreground text-sm">
                                            by {product.vendor.user.name}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xl">
                                                ${product.price.toFixed(2)}
                                            </span>
                                            {product.stock === 0 ? (
                                                <span className="text-muted-foreground text-xs">
                                                    Out of Stock
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    In Stock
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Features */}
            <div className="grid gap-6 sm:grid-cols-3">
                <Card>
                    <CardContent className="p-6 text-center">
                        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-primary" />
                        <h3 className="mb-2 font-semibold text-lg">
                            Shop Products
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Browse thousands of products from verified vendors
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 text-center">
                        <Store className="mx-auto mb-4 h-12 w-12 text-primary" />
                        <h3 className="mb-2 font-semibold text-lg">
                            Become a Vendor
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Start selling your products and reach new customers
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 text-center">
                        <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
                        <h3 className="mb-2 font-semibold text-lg">
                            Secure Shopping
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Safe and secure transactions with order tracking
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
