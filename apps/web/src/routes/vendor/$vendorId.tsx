import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/vendor/$vendorId")({
    component: VendorProfilePage,
    // Public route - anyone can view vendor profiles
});

function VendorProfilePage() {
    const { vendorId } = Route.useParams();

    // Fetch vendor profile
    const { data: vendor, isLoading } = useQuery({
        queryKey: ["vendor", vendorId],
        queryFn: () => orpc.vendor.getVendorById.call({ vendorId }),
    });

    // Fetch vendor products
    const { data: productsData, isLoading: isProductsLoading } = useQuery({
        queryKey: ["vendor-products", vendorId],
        queryFn: () =>
            orpc.product.listProducts.call({
                vendorId,
                page: 1,
                limit: 20,
            }),
        enabled: !!vendor,
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="mb-4 font-bold text-2xl">Vendor not found</h1>
                <Link to="/products">
                    <Button>Back to Products</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Vendor Header */}
            <Card className="mb-8">
                <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                        {vendor.logo && (
                            <div className="h-24 w-24 overflow-hidden rounded-full border">
                                {/* biome-ignore lint/correctness/useImageSize: Ignore useImageSize */}
                                <img
                                    alt={vendor.shopName}
                                    className="h-full w-full object-cover"
                                    src={vendor.logo}
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                <h1 className="font-bold text-3xl">
                                    {vendor.shopName}
                                </h1>
                            </div>
                            <p className="text-muted-foreground">
                                by {vendor.user.name}
                            </p>
                            {vendor.description && (
                                <p className="mt-4 text-muted-foreground">
                                    {vendor.description}
                                </p>
                            )}
                            <div className="mt-4 flex items-center gap-4">
                                <Badge variant="secondary">
                                    {vendor._count.products} Products
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products Section */}
            <div className="mb-8">
                <h2 className="mb-4 font-bold text-2xl">Products</h2>
                {isProductsLoading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {/** biome-ignore lint/style/noMagicNumbers: Ignore magic numbers */}
                        {[...new Array(8)].map((_, i) => (
                            <Card key={i}>
                                <Skeleton className="h-48 w-full" />
                                <CardContent className="space-y-2 p-4">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    // biome-ignore lint/style/noNestedTernary: For simplicity
                ) : productsData && productsData.products.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                                        <Badge
                                            className="mb-2"
                                            variant="secondary"
                                        >
                                            {product.category.name}
                                        </Badge>
                                        <h3 className="mb-2 line-clamp-2 font-semibold">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xl">
                                                ${product.price.toFixed(2)}
                                            </span>
                                            {product.stock === 0 ? (
                                                <Badge variant="destructive">
                                                    Out of Stock
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    In Stock
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            No products available from this vendor yet
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
