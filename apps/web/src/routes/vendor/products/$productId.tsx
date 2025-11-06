import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/vendor/products/$productId")({
    component: EditProductPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to edit products");
        }
        return { session };
    },
});

function EditProductPage() {
    const { productId } = Route.useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch product
    const { data: product, isLoading } = useQuery({
        queryKey: ["product", productId],
        queryFn: () => orpc.product.getProduct.call({ productId }),
    });

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => orpc.category.listCategories.call(),
    });

    // Update product mutation
    const updateProductMutation = useMutation({
        mutationFn: (data: {
            productId: string;
            name?: string;
            description?: string;
            price?: number;
            stock?: number;
            categoryId?: string;
            isActive?: boolean;
        }) => orpc.product.updateProduct.call(data),
        onSuccess: () => {
            toast.success("Product updated successfully!");
            queryClient.invalidateQueries({ queryKey: ["product", productId] });
            queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
            navigate({ to: "/vendor/dashboard" });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to update product");
        },
    });

    // Delete product mutation
    const deleteProductMutation = useMutation({
        mutationFn: () => orpc.product.deleteProduct.call({ productId }),
        onSuccess: () => {
            toast.success("Product deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
            navigate({ to: "/vendor/dashboard" });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to delete product");
        },
    });

    const form = useForm({
        defaultValues: {
            name: product?.name || "",
            description: product?.description || "",
            price: product?.price || 0,
            stock: product?.stock || 0,
            categoryId: product?.categoryId || "",
            isActive: product?.isActive ?? true,
        },
        onSubmit: ({ value }) => {
            updateProductMutation.mutate({
                productId,
                name: value.name !== product?.name ? value.name : undefined,
                description:
                    value.description !== product?.description
                        ? value.description
                        : undefined,
                price: value.price !== product?.price ? value.price : undefined,
                stock: value.stock !== product?.stock ? value.stock : undefined,
                categoryId:
                    value.categoryId !== product?.categoryId
                        ? value.categoryId
                        : undefined,
                isActive:
                    value.isActive !== product?.isActive
                        ? value.isActive
                        : undefined,
            });
        },
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="mb-4 font-bold text-2xl">Product not found</h1>
                <Button onClick={() => navigate({ to: "/vendor/dashboard" })}>
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="font-bold text-3xl">Edit Product</h1>
                <p className="text-muted-foreground">
                    Update your product information
                </p>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="font-semibold text-xl">
                        Product Information
                    </h2>
                </CardHeader>
                <CardContent>
                    <form
                        className="space-y-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                    >
                        <form.Field name="name">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        Product Name
                                    </Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        value={field.state.value}
                                    />
                                    {field.state.meta.errors.map((error) => (
                                        <p
                                            className="text-destructive text-sm"
                                            key={error}
                                        >
                                            {error}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="description">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        Description
                                    </Label>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        rows={6}
                                        value={field.state.value}
                                    />
                                    {field.state.meta.errors.map((error) => (
                                        <p
                                            className="text-destructive text-sm"
                                            key={error}
                                        >
                                            {error}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </form.Field>

                        <div className="grid gap-4 md:grid-cols-2">
                            <form.Field name="price">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>
                                            Price ($)
                                        </Label>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    Number(e.target.value)
                                                )
                                            }
                                            step="0.01"
                                            type="number"
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

                            <form.Field name="stock">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>
                                            Stock Quantity
                                        </Label>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    Number(e.target.value)
                                                )
                                            }
                                            type="number"
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
                        </div>

                        <form.Field name="categoryId">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Category</Label>
                                    <Select
                                        onValueChange={field.handleChange}
                                        value={field.state.value}
                                    >
                                        <SelectTrigger id={field.name}>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories?.map((category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {field.state.meta.errors.map((error) => (
                                        <p
                                            className="text-destructive text-sm"
                                            key={error}
                                        >
                                            {error}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="isActive">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Status</Label>
                                    <Select
                                        onValueChange={(value) =>
                                            field.handleChange(value === "true")
                                        }
                                        value={
                                            field.state.value ? "true" : "false"
                                        }
                                    >
                                        <SelectTrigger id={field.name}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">
                                                Active
                                            </SelectItem>
                                            <SelectItem value="false">
                                                Inactive
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </form.Field>

                        <div className="flex gap-4">
                            <Button
                                onClick={() =>
                                    navigate({ to: "/vendor/dashboard" })
                                }
                                type="button"
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <form.Subscribe>
                                {(state) => (
                                    <Button
                                        disabled={
                                            !state.canSubmit ||
                                            state.isSubmitting ||
                                            updateProductMutation.isPending
                                        }
                                        type="submit"
                                    >
                                        {updateProductMutation.isPending
                                            ? "Updating..."
                                            : "Update Product"}
                                    </Button>
                                )}
                            </form.Subscribe>
                            <Button
                                disabled={deleteProductMutation.isPending}
                                onClick={() => {
                                    if (
                                        confirm(
                                            "Are you sure you want to delete this product? This action cannot be undone."
                                        )
                                    ) {
                                        deleteProductMutation.mutate();
                                    }
                                }}
                                type="button"
                                variant="destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
