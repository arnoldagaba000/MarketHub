import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/cart")({
    component: CartPage,
    beforeLoad: async ({ context }) => {
        const session = await context.queryClient.fetchQuery({
            queryKey: ["session"],
            queryFn: () =>
                import("@/lib/auth-client").then((m) =>
                    m.authClient.getSession()
                ),
        });

        if (!session.data) {
            throw new Error("Must be logged in to view cart");
        }
    },
});

function CartPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch cart
    const { data: cart, isLoading } = useQuery({
        queryKey: ["cart"],
        queryFn: () => orpc.cart.getCart.call(),
    });

    // Update quantity mutation
    const updateQuantityMutation = useMutation({
        mutationFn: ({
            cartItemId,
            quantity,
        }: {
            cartItemId: string;
            quantity: number;
        }) => orpc.cart.updateCartItemQuantity.call({ cartItemId, quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cart"] });
        },
        onError: (error) => {
          toast.error((error as Error).message  || "Failed to update quantity");
        },
    });

    // Remove item mutation
    const removeItemMutation = useMutation({
        mutationFn: (cartItemId: string) =>
            orpc.cart.removeFromCart.call({ cartItemId }),
        onSuccess: () => {
            toast.success("Item removed from cart");
            queryClient.invalidateQueries({ queryKey: ["cart"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to remove item");
        },
    });

    // Clear cart mutation
    const clearCartMutation = useMutation({
        mutationFn: () => orpc.cart.clearCart.call(),
        onSuccess: () => {
            toast.success("Cart cleared");
            queryClient.invalidateQueries({ queryKey: ["cart"] });
        },
    });

    const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            return;
        }
        updateQuantityMutation.mutate({ cartItemId, quantity: newQuantity });
    };

    const handleRemoveItem = (cartItemId: string) => {
        removeItemMutation.mutate(cartItemId);
    };

    const handleCheckout = () => {
        navigate({ to: "/checkout" });
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">Loading cart...</div>
            </div>
        );
    }

    if (!cart || cart.summary.totalItems === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4 text-center">
                    <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h2 className="font-bold text-2xl">Your cart is empty</h2>
                    <p className="text-muted-foreground">
                        Add some products to your cart to see them here
                    </p>
                    <Link to="/products">
                        <Button>Browse Products</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="font-bold text-3xl">Shopping Cart</h1>
                {cart.summary.totalItems > 0 && (
                    <Button
                        disabled={clearCartMutation.isPending}
                        onClick={() => clearCartMutation.mutate()}
                        variant="outline"
                    >
                        Clear Cart
                    </Button>
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Cart Items */}
                <div className="space-y-6 lg:col-span-2">
                    {cart.vendors.map((vendor) => (
                        <Card key={vendor.vendorId}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">
                                            {vendor.shopName}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            by {vendor.vendorName}
                                        </p>
                                    </div>
                                    <div className="text-muted-foreground text-sm">
                                        {vendor.itemCount}{" "}
                                        {vendor.itemCount === 1
                                            ? "item"
                                            : "items"}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {vendor.items.map((item) => (
                                    <div key={item.id}>
                                        <div className="flex gap-4">
                                            {/* Product Image */}
                                            <Link
                                                className="shrink-0"
                                                params={{
                                                    productId: item.product.id,
                                                }}
                                                to="/products/$productId"
                                            >
                                                <div className="h-24 w-24 overflow-hidden rounded border">
                                                    {item.product.images[0] ? (
                                                        // biome-ignore lint/correctness/useImageSize: Ignore useImageSize
                                                        <img
                                                            alt={
                                                                item.product
                                                                    .name
                                                            }
                                                            className="h-full w-full object-cover"
                                                            src={
                                                                item.product
                                                                    .images[0]
                                                                    .url
                                                            }
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center bg-muted">
                                                            <span className="text-muted-foreground text-xs">
                                                                No image
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            {/* Product Info */}
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    className="hover:text-primary"
                                                    params={{
                                                        productId:
                                                            item.product.id,
                                                    }}
                                                    to="/products/$productId"
                                                >
                                                    <h4 className="line-clamp-2 font-medium">
                                                        {item.product.name}
                                                    </h4>
                                                </Link>

                                                <div className="mt-2 flex items-center gap-4">
                                                    {/* Quantity Selector */}
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            disabled={
                                                                item.quantity <=
                                                                    1 ||
                                                                updateQuantityMutation.isPending
                                                            }
                                                            onClick={() =>
                                                                handleQuantityChange(
                                                                    item.id,
                                                                    item.quantity -
                                                                        1
                                                                )
                                                            }
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            -
                                                        </Button>
                                                        <Input
                                                            className="w-16 text-center"
                                                            max={
                                                                item.product
                                                                    .stock
                                                            }
                                                            min="1"
                                                            onChange={(e) =>
                                                                handleQuantityChange(
                                                                    item.id,
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }
                                                            type="number"
                                                            value={
                                                                item.quantity
                                                            }
                                                        />
                                                        <Button
                                                            disabled={
                                                                item.quantity >=
                                                                    item.product
                                                                        .stock ||
                                                                updateQuantityMutation.isPending
                                                            }
                                                            onClick={() =>
                                                                handleQuantityChange(
                                                                    item.id,
                                                                    item.quantity +
                                                                        1
                                                                )
                                                            }
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            +
                                                        </Button>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="font-semibold">
                                                        $
                                                        {(
                                                            item.product.price *
                                                            item.quantity
                                                        ).toFixed(2)}
                                                    </div>
                                                </div>

                                                {/* Stock Warning */}
                                                {item.quantity >
                                                    item.product.stock && (
                                                    <p className="mt-1 text-destructive text-sm">
                                                        Only{" "}
                                                        {item.product.stock}{" "}
                                                        available in stock
                                                    </p>
                                                )}

                                                <div className="mt-1 text-muted-foreground text-sm">
                                                    $
                                                    {item.product.price.toFixed(
                                                        2
                                                    )}{" "}
                                                    each
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <Button
                                                disabled={
                                                    removeItemMutation.isPending
                                                }
                                                onClick={() =>
                                                    handleRemoveItem(item.id)
                                                }
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <Separator className="mt-4" />
                                    </div>
                                ))}
                            </CardContent>

                            <CardFooter className="justify-between">
                                <span className="font-medium">Subtotal:</span>
                                <span className="font-bold text-lg">
                                    ${vendor.subtotal.toFixed(2)}
                                </span>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <h3 className="font-semibold text-lg">
                                Order Summary
                            </h3>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Items
                                    </span>
                                    <span>{cart.summary.totalItems}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Vendors
                                    </span>
                                    <span>{cart.summary.vendorCount}</span>
                                </div>

                                <Separator />

                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>
                                        ${cart.summary.grandTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded bg-muted p-3 text-muted-foreground text-sm">
                                <p className="mb-1">
                                    💡 You're buying from{" "}
                                    {cart.summary.vendorCount}{" "}
                                    {cart.summary.vendorCount === 1
                                        ? "vendor"
                                        : "different vendors"}
                                </p>
                                <p>Each vendor ships separately</p>
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleCheckout}
                                size="lg"
                            >
                                Proceed to Checkout
                            </Button>

                            <Link className="block" to="/products">
                                <Button
                                    className="w-full"
                                    size="lg"
                                    variant="outline"
                                >
                                    Continue Shopping
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
