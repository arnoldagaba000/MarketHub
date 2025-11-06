/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ShoppingCart, Star, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/products/$productId")({
    component: ProductDetailPage,
});

function ProductDetailPage() {
    const { productId } = Route.useParams();
    const queryClient = useQueryClient();
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);

    // Fetch product details
    const { data: product, isLoading } = useQuery({
        queryKey: ["product", productId],
        queryFn: () => orpc.product.getProduct.call({ productId }),
    });

    // Fetch reviews
    const { data: reviewsData } = useQuery({
        queryKey: ["product-reviews", productId],
        queryFn: () =>
            orpc.review.getProductReviews.call({
                productId,
                page: 1,
                limit: 10,
                sortBy: "newest",
            }),
    });

    // Add to cart mutation
    const addToCartMutation = useMutation({
        mutationFn: (quantities: number) =>
            orpc.cart.addToCart.call({ productId, quantity: quantities }),
        onSuccess: () => {
            toast.success("Added to cart!");
            queryClient.invalidateQueries({ queryKey: ["cart"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to add to cart");
        },
    });

    const handleAddToCart = () => {
        if (quantity < 1 || quantity > (product?.stock || 0)) {
            toast.error("Invalid quantity");
            return;
        }
        addToCartMutation.mutate(quantity);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid gap-8 md:grid-cols-2">
                    <Skeleton className="aspect-square w-full" />
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="mb-4 font-bold text-2xl">Product not found</h1>
                <Link to="/products">
                    <Button>Back to Products</Button>
                </Link>
            </div>
        );
    }

    const isOutOfStock = product.stock === 0;
    const isLowStock = product.stock < 10 && product.stock > 0;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <div className="mb-6 text-muted-foreground text-sm">
                <Link className="hover:text-primary" to="/products">
                    Products
                </Link>
                {" / "}
                <Link
                    className="hover:text-primary"
                    search={{ category: product.category.id }}
                    to="/products"
                >
                    {product.category.name}
                </Link>
                {" / "}
                <span className="text-foreground">{product.name}</span>
            </div>

            {/* Main Product Section */}
            <div className="mb-12 grid gap-8 md:grid-cols-2">
                {/* Image Gallery */}
                <div className="space-y-4">
                    {/* Main Image */}
                    <div className="aspect-square overflow-hidden rounded-lg border">
                        {product.images[selectedImage] ? (
                            // biome-ignore lint/correctness/useImageSize: Ignore useImageSize
                            <img
                                alt={product.name}
                                className="h-full w-full object-cover"
                                src={product.images[selectedImage].url}
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                                <span className="text-muted-foreground">
                                    No image available
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Image Thumbnails */}
                    {product.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                            {product.images.map((image, index) => (
                                <button
                                    className={`aspect-square overflow-hidden rounded border-2 transition-all ${
                                        selectedImage === index
                                            ? "border-primary"
                                            : "border-transparent hover:border-muted-foreground"
                                    }`}
                                    key={image.id}
                                    onClick={() => setSelectedImage(index)}
                                    type="button"
                                >
                                    {/** biome-ignore lint/correctness/useImageSize: Ignore useImageSize */}
                                    <img
                                        alt={`${product.name} ${index + 1}`}
                                        className="h-full w-full object-cover"
                                        src={image.url}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    {/* Category Badge */}
                    <Badge variant="secondary">{product.category.name}</Badge>

                    {/* Product Name */}
                    <h1 className="font-bold text-3xl">{product.name}</h1>

                    {/* Vendor Info */}
                    <Link
                        className="flex items-center gap-2 text-muted-foreground text-sm hover:text-primary"
                        params={{ vendorId: product.vendor.id }}
                        to="/vendor/$vendorId"
                    >
                        <Store className="h-4 w-4" />
                        <span>
                            {product.vendor.shopName} by{" "}
                            {product.vendor.user.name}
                        </span>
                    </Link>

                    {/* Rating */}
                    {product.averageRating && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center">
                                {[...new Array(5)].map((_, i) => (
                                    <Star
                                        className={`h-5 w-5 ${
                                            i <
                                            Math.round(product.averageRating!)
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-muted-foreground"
                                        }`}
                                        key={i}
                                    />
                                ))}
                            </div>
                            <span className="text-muted-foreground text-sm">
                                {product.averageRating.toFixed(1)} (
                                {product._count.reviews} reviews)
                            </span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="font-bold text-4xl">
                        ${product.price.toFixed(2)}
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                        // biome-ignore lint/style/noNestedTernary: For simplicity
                        ) : isLowStock ? (
                            <Badge
                                className="border-orange-500 text-orange-500"
                                variant="outline"
                            >
                                Only {product.stock} left in stock
                            </Badge>
                        ) : (
                            <Badge
                                className="border-green-600 text-green-600"
                                variant="outline"
                            >
                                In Stock ({product.stock} available)
                            </Badge>
                        )}
                    </div>

                    <Separator />

                    {/* Add to Cart Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="font-medium" htmlFor="quantity">
                                Quantity:
                            </label>
                            <Input
                                className="w-24"
                                disabled={isOutOfStock}
                                id="quantity"
                                max={product.stock}
                                min="1"
                                onChange={(e) =>
                                    setQuantity(Number(e.target.value))
                                }
                                type="number"
                                value={quantity}
                            />
                        </div>

                        <Button
                            className="w-full"
                            disabled={
                                isOutOfStock || addToCartMutation.isPending
                            }
                            onClick={handleAddToCart}
                            size="lg"
                        >
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            {addToCartMutation.isPending
                                ? "Adding..."
                                : "Add to Cart"}
                        </Button>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <h2 className="font-semibold text-xl">Description</h2>
                        <p className="whitespace-pre-line text-muted-foreground">
                            {product.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div className="mb-12">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-bold text-2xl">Customer Reviews</h2>
                    {product._count.reviews > 0 && (
                        <div className="text-muted-foreground text-sm">
                            {product._count.reviews}{" "}
                            {product._count.reviews === 1
                                ? "review"
                                : "reviews"}
                        </div>
                    )}
                </div>

                {reviewsData && reviewsData.reviews.length > 0 ? (
                    <div className="space-y-6">
                        {/* Rating Summary */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Average Rating */}
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="mb-2 font-bold text-5xl">
                                            {reviewsData.statistics.averageRating.toFixed(
                                                1
                                            )}
                                        </div>
                                        <div className="mb-2 flex items-center">
                                            {[...new Array(5)].map((_, i) => (
                                                <Star
                                                    className={`h-5 w-5 ${
                                                        i <
                                                        Math.round(
                                                            reviewsData
                                                                .statistics
                                                                .averageRating
                                                        )
                                                            ? "fill-yellow-400 text-yellow-400"
                                                            : "text-muted-foreground"
                                                    }`}
                                                    key={i}
                                                />
                                            ))}
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            Based on{" "}
                                            {
                                                reviewsData.statistics
                                                    .totalReviews
                                            }{" "}
                                            reviews
                                        </div>
                                    </div>

                                    {/* Rating Distribution */}
                                    <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map((rating) => {
                                            const count =
                                                reviewsData.statistics
                                                    .ratingDistribution[
                                                    rating as keyof typeof reviewsData.statistics.ratingDistribution
                                                ];
                                            const percentage =
                                                (count /
                                                    reviewsData.statistics
                                                        .totalReviews) *
                                                100;

                                            return (
                                                <div
                                                    className="flex items-center gap-2"
                                                    key={rating}
                                                >
                                                    <span className="w-8 text-sm">
                                                        {rating} ★
                                                    </span>
                                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full bg-yellow-400"
                                                            style={{
                                                                width: `${percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="w-12 text-right text-muted-foreground text-sm">
                                                        {count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Individual Reviews */}
                        <div className="space-y-4">
                            {reviewsData.reviews.map((review) => (
                                <Card key={review.id}>
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-start justify-between">
                                            <div>
                                                <div className="mb-1 font-medium">
                                                    {review.user.name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex">
                                                        {[...new Array(5)].map(
                                                            (_, i) => (
                                                                <Star
                                                                    className={`h-4 w-4 ${
                                                                        i <
                                                                        review.rating
                                                                            ? "fill-yellow-400 text-yellow-400"
                                                                            : "text-muted-foreground"
                                                                    }`}
                                                                    key={i}
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                    <span className="text-muted-foreground text-sm">
                                                        {new Date(
                                                            review.createdAt
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {review.comment && (
                                            <p className="text-muted-foreground">
                                                {review.comment}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            No reviews yet. Be the first to review this product!
                        </CardContent>
                    </Card>
                )}

                {/* Review Creation Form */}
                <ReviewForm productId={productId} />
            </div>
        </div>
    );
}

function ReviewForm({ productId }: { productId: string }) {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    // Check if user can review
    const { data: canReview } = useQuery({
        queryKey: ["can-review", productId],
        queryFn: () => orpc.review.canReviewProduct.call({ productId }),
    });

    // Create review mutation
    const createReviewMutation = useMutation({
        mutationFn: (data: { rating: number; comment?: string }) =>
            orpc.review.createReview.call({ productId, ...data }),
        onSuccess: () => {
            toast.success("Review submitted successfully!");
            queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
            queryClient.invalidateQueries({ queryKey: ["product", productId] });
            queryClient.invalidateQueries({ queryKey: ["can-review", productId] });
            setShowForm(false);
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to submit review");
        },
    });

    if (!canReview?.canReview) {
        return null;
    }

    if (!showForm) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Button onClick={() => setShowForm(true)} variant="outline">
                        Write a Review
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <h3 className="font-semibold text-lg">Write a Review</h3>
            </CardHeader>
            <CardContent>
                <ReviewFormContent
                    onSubmit={(data) => {
                        createReviewMutation.mutate(data);
                    }}
                    onCancel={() => setShowForm(false)}
                    isLoading={createReviewMutation.isPending}
                />
            </CardContent>
        </Card>
    );
}

function ReviewFormContent({
    onSubmit,
    onCancel,
    isLoading,
}: {
    onSubmit: (data: { rating: number; comment?: string }) => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating < 1 || rating > 5) {
            toast.error("Please select a rating");
            return;
        }
        onSubmit({ rating, comment: comment.trim() || undefined });
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
                <Label>Rating</Label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            className="focus:outline-none"
                            onClick={() => setRating(star)}
                            type="button"
                        >
                            <Star
                                className={`h-8 w-8 ${
                                    star <= rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground"
                                }`}
                            />
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <Label htmlFor="review-comment">Comment (optional)</Label>
                <Textarea
                    id="review-comment"
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows={4}
                    value={comment}
                />
            </div>
            <div className="flex gap-2">
                <Button
                    disabled={isLoading}
                    onClick={onCancel}
                    type="button"
                    variant="outline"
                >
                    Cancel
                </Button>
                <Button disabled={isLoading || rating === 0} type="submit">
                    {isLoading ? "Submitting..." : "Submit Review"}
                </Button>
            </div>
        </form>
    );
}
