/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Filter, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

// Define search params schema
type ProductSearchParams = {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "price_asc" | "price_desc" | "newest" | "oldest";
    page?: number;
};

export const Route = createFileRoute("/products")({
    component: ProductsPage,
    validateSearch: (search: Record<string, unknown>): ProductSearchParams => ({
        search: (search.search as string) || undefined,
        category: (search.category as string) || undefined,
        minPrice: search.minPrice ? Number(search.minPrice) : undefined,
        maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
        sortBy: (search.sortBy as ProductSearchParams["sortBy"]) || "newest",
        page: search.page ? Number(search.page) : 1,
    }),
});

function ProductsPage() {
    const navigate = useNavigate();
    const searchParams = Route.useSearch();
    const [searchInput, setSearchInput] = useState(searchParams.search || "");

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => orpc.category.listCategories.call(),
    });

    // Fetch products with current filters
    const { data: productsData, isLoading } = useQuery({
        queryKey: ["products", searchParams],
        queryFn: () =>
            orpc.product.listProducts.call({
                search: searchParams.search,
                categoryId: searchParams.category,
                minPrice: searchParams.minPrice,
                maxPrice: searchParams.maxPrice,
                sortBy: searchParams.sortBy || "newest",
                page: searchParams.page || 1,
                limit: 20,
            }),
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({
            search: {
                ...searchParams,
                search: searchInput || undefined,
                page: 1,
            },
        });
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        navigate({
            search: { ...searchParams, [key]: value, page: 1 },
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="mb-4 font-bold text-4xl">Shop Products</h1>
                <p className="text-muted-foreground">
                    Discover amazing products from trusted vendors
                </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
                {/* Search Bar */}
                <form className="flex gap-2" onSubmit={handleSearch}>
                    <div className="relative flex-1">
                        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
                        <Input
                            className="pl-10"
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search products..."
                            type="text"
                            value={searchInput}
                        />
                    </div>
                    <Button type="submit">Search</Button>
                </form>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Filters:</span>
                    </div>

                    {/* Category Filter */}
                    <Select
                        onValueChange={(value) =>
                            handleFilterChange(
                                "category",
                                value === "all" ? undefined : value
                            )
                        }
                        value={searchParams.category || "all"}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories?.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name} ({category._count.products})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Sort Filter */}
                    <Select
                        onValueChange={(value) =>
                            handleFilterChange(
                                "sortBy",
                                value as ProductSearchParams["sortBy"]
                            )
                        }
                        value={searchParams.sortBy || "newest"}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="price_asc">
                                Price: Low to High
                            </SelectItem>
                            <SelectItem value="price_desc">
                                Price: High to Low
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(searchParams.search ||
                        searchParams.category ||
                        searchParams.sortBy !== "newest") && (
                        <Button
                            onClick={() => {
                                setSearchInput("");
                                navigate({ search: { page: 1 } });
                            }}
                            size="sm"
                            variant="ghost"
                        >
                            Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Results Info */}
            {productsData && (
                <div className="mb-6 text-muted-foreground text-sm">
                    Showing {productsData.products.length} of{" "}
                    {productsData.pagination.totalCount} products
                </div>
            )}

            {/* Products Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            ) : // biome-ignore lint/style/noNestedTernary: For simplicity
            productsData?.products.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="mb-4 text-muted-foreground">
                        No products found
                    </p>
                    <Button
                        onClick={() => {
                            setSearchInput("");
                            navigate({ search: { page: 1 } });
                        }}
                        variant="outline"
                    >
                        Clear Filters
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {productsData?.products.map((product) => (
                        <Link
                            key={product.id}
                            params={{ productId: product.id }}
                            to="/products/$productId"
                        >
                            <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                                {/* Product Image */}
                                <div className="aspect-square overflow-hidden">
                                    {product.images[0] ? (
                                        // biome-ignore lint/correctness/useImageSize: No need for image size
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
                                    {/* Category Badge */}
                                    <Badge className="mb-2" variant="secondary">
                                        {product.category.name}
                                    </Badge>

                                    {/* Product Name */}
                                    <h3 className="mb-2 line-clamp-2 font-semibold">
                                        {product.name}
                                    </h3>

                                    {/* Vendor */}
                                    <p className="mb-2 text-muted-foreground text-sm">
                                        by {product.vendor.user.name}
                                    </p>

                                    {/* Reviews */}
                                    {product._count.reviews > 0 && (
                                        <p className="text-muted-foreground text-xs">
                                            {product._count.reviews} reviews
                                        </p>
                                    )}
                                </CardContent>

                                <CardFooter className="flex items-center justify-between p-4 pt-0">
                                    {/* Price */}
                                    <span className="font-bold text-2xl">
                                        ${product.price.toFixed(2)}
                                    </span>

                                    {/* Stock Status */}
                                    {product.stock === 0 ? (
                                        <Badge variant="destructive">
                                            Out of Stock
                                        </Badge>
                                    ) : // biome-ignore lint/style/noNestedTernary: For simplicity
                                    product.stock < 10 ? (
                                        <Badge variant="outline">
                                            Only {product.stock} left
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">
                                            In Stock
                                        </Badge>
                                    )}
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {productsData && productsData.pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                    <Button
                        disabled={!searchParams.page || searchParams.page === 1}
                        onClick={() =>
                            navigate({
                                search: {
                                    ...searchParams,
                                    page: (searchParams.page || 1) - 1,
                                },
                            })
                        }
                        variant="outline"
                    >
                        Previous
                    </Button>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                            Page {searchParams.page || 1} of{" "}
                            {productsData.pagination.totalPages}
                        </span>
                    </div>

                    <Button
                        disabled={!productsData.pagination.hasMore}
                        onClick={() =>
                            navigate({
                                search: {
                                    ...searchParams,
                                    page: (searchParams.page || 1) + 1,
                                },
                            })
                        }
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
