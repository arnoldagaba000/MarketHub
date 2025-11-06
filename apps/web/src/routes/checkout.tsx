import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/checkout")({
    component: CheckoutPage,
});

const shippingSchema = z.object({
    address: z.string().min(10, "Address must be at least 10 characters"),
});

function CheckoutPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch cart
    const { data: cart, isLoading: isCartLoading } = useQuery({
        queryKey: ["cart"],
        queryFn: () => orpc.cart.getCart.call(),
    });

    // Validate cart
    const { data: validation, isLoading: isValidating } = useQuery({
        queryKey: ["cart-validation"],
        queryFn: () => orpc.cart.validateCart.call(),
    });

    // Create order mutation
    const createOrderMutation = useMutation({
        mutationFn: (shippingAddress: string) =>
            orpc.order.createOrder.call({ shippingAddress }),
        onSuccess: (data) => {
            toast.success(
                `Order placed successfully! Created ${data.orders.length} orders.`
            );
            queryClient.invalidateQueries({ queryKey: ["cart"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            navigate({ to: "/orders" });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to create order");
        },
    });

    const form = useForm({
        defaultValues: {
            address: "",
        },
        onSubmit: async ({ value }) => {
            // Final validation check
            const cartValidation = await queryClient.fetchQuery({
                queryKey: ["cart-validation"],
                queryFn: () => orpc.cart.validateCart.call(),
            });

            if (!cartValidation.isValid) {
                toast.error("Some items in your cart are no longer available");
                return;
            }

            createOrderMutation.mutate(value.address);
        },
    });

    if (isCartLoading || isValidating) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    if (!cart || cart.summary.totalItems === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4 text-center">
                    <h2 className="font-bold text-2xl">Your cart is empty</h2>
                    <Button onClick={() => navigate({ to: "/products" })}>
                        Browse Products
                    </Button>
                </div>
            </div>
        );
    }

    const hasIssues = validation && !validation.isValid;

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="mb-8 font-bold text-3xl">Checkout</h1>

            {/* Validation Warnings */}
            {hasIssues && (
                <Card className="mb-6 border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <h3 className="font-semibold">Cart Issues</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {validation.issues.map((issue, index) => (
                            <div className="text-sm" key={index}>
                                <strong>{issue.productName}:</strong>{" "}
                                {issue.issue}
                            </div>
                        ))}
                        <Button
                            className="mt-2"
                            onClick={() => navigate({ to: "/cart" })}
                            size="sm"
                            variant="outline"
                        >
                            Update Cart
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Shipping Form */}
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-xl">
                                Shipping Address
                            </h2>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="space-y-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    form.handleSubmit();
                                }}
                            >
                                <form.Field name="address">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>
                                                Full Address
                                            </Label>
                                            <Input
                                                className="min-h-20"
                                                id={field.name}
                                                name={field.name}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="123 Main St, City, Country"
                                                value={field.state.value}
                                            />
                                            {field.state.meta.errors.map(
                                                (error) => (
                                                    <p
                                                        className="text-destructive text-sm"
                                                        key={error}
                                                    >
                                                        {error}
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    )}
                                </form.Field>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Order Items Summary */}
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-xl">
                                Order Items
                            </h2>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {cart.vendors.map((vendor) => (
                                <div key={vendor.vendorId}>
                                    <h3 className="mb-3 font-medium">
                                        {vendor.shopName}
                                    </h3>
                                    <div className="space-y-2">
                                        {vendor.items.map((item) => (
                                            <div
                                                className="flex justify-between text-sm"
                                                key={item.id}
                                            >
                                                <span className="text-muted-foreground">
                                                    {item.product.name} ×{" "}
                                                    {item.quantity}
                                                </span>
                                                <span className="font-medium">
                                                    $
                                                    {(
                                                        item.product.price *
                                                        item.quantity
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="my-3" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
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
                                    <span>{cart.summary.totalItems}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Orders
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

                            <div className="space-y-2 rounded bg-muted p-3 text-sm">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                    <p className="text-muted-foreground">
                                        {cart.summary.vendorCount} separate
                                        shipments from different vendors
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                    <p className="text-muted-foreground">
                                        You'll receive tracking information for
                                        each order
                                    </p>
                                </div>
                            </div>

                            <form.Subscribe>
                                {(state) => (
                                    <Button
                                        className="w-full"
                                        disabled={
                                            !state.canSubmit ||
                                            state.isSubmitting ||
                                            hasIssues ||
                                            createOrderMutation.isPending
                                        }
                                        onClick={() => form.handleSubmit()}
                                        size="lg"
                                    >
                                        {createOrderMutation.isPending
                                            ? "Placing Order..."
                                            : "Place Order"}
                                    </Button>
                                )}
                            </form.Subscribe>

                            <p className="text-center text-muted-foreground text-xs">
                                By placing your order, you agree to our terms
                                and conditions
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
