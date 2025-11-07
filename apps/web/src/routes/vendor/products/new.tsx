/** biome-ignore-all lint/style/noMagicNumbers: Ignore  */

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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

export const Route = createFileRoute("/vendor/products/new")({
    component: NewProductPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to create products");
        }
        // Check if user is an approved vendor
        const vendorProfile = await orpc.vendor.getMyVendorProfile.call();
        if (!vendorProfile) {
            throw new Error("Must be a vendor to create products");
        }
        if (!vendorProfile.isApproved) {
            throw new Error("Your vendor account is pending approval");
        }
        return { session, vendorProfile };
    },
});

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 200;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PRICE = 1_000_000;
const MIN_IMAGES = 1;
const MAX_IMAGES = 10;

const productSchema = z.object({
    name: z.string().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH),
    description: z
        .string()
        .min(MIN_DESCRIPTION_LENGTH)
        .max(MAX_DESCRIPTION_LENGTH),
    price: z.number().positive().max(MAX_PRICE),
    stock: z.number().int().min(0),
    categoryId: z.string().cuid(),
    images: z.array(z.string().url()).min(MIN_IMAGES).max(MAX_IMAGES),
});

function NewProductPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => orpc.category.listCategories.call(),
    });

    // Create product mutation
    const createProductMutation = useMutation({
        mutationFn: (data: z.infer<typeof productSchema>) =>
            orpc.product.createProduct.call(data),
        onSuccess: () => {
            toast.success("Product created successfully!");
            queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
            navigate({ to: "/vendor/dashboard" });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to create product");
        },
    });

    const form = useForm({
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            stock: 0,
            categoryId: "",
            images: [""],
        },
        onSubmit: ({ value }) => {
            const validated = productSchema.parse({
                ...value,
                price: Number(value.price),
                stock: Number(value.stock),
                images: value.images.filter((img) => img.trim() !== ""),
            });
            createProductMutation.mutate(validated);
        },
    });

    const addImageField = () => {
        form.setFieldValue("images", [...form.state.values.images, ""]);
    };

    const removeImageField = (index: number) => {
        const newImages = form.state.values.images.filter(
            (_, i) => i !== index
        );
        form.setFieldValue("images", newImages.length > 0 ? newImages : [""]);
    };

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="font-bold text-3xl">Add New Product</h1>
                <p className="text-muted-foreground">
                    Create a new product listing for your shop
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
                                        Product Name{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="Enter product name"
                                        required
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
                                        Description{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="Describe your product in detail..."
                                        required
                                        rows={6}
                                        value={field.state.value}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Minimum 20 characters
                                    </p>
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
                                            Price ($){" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
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
                                            placeholder="0.00"
                                            required
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
                                            Stock Quantity{" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
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
                                            placeholder="0"
                                            required
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
                                    <Label htmlFor={field.name}>
                                        Category{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
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

                        <form.Field name="images">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>
                                        Product Images{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <div className="space-y-2">
                                        {field.state.value.map(
                                            (image, index) => (
                                                <div
                                                    className="flex gap-2"
                                                    key={index}
                                                >
                                                    <Input
                                                        onChange={(e) => {
                                                            const newImages = [
                                                                ...field.state
                                                                    .value,
                                                            ];
                                                            newImages[index] =
                                                                e.target.value;
                                                            field.handleChange(
                                                                newImages
                                                            );
                                                        }}
                                                        placeholder="https://example.com/image.jpg"
                                                        type="url"
                                                        value={image}
                                                    />
                                                    {field.state.value.length >
                                                        1 && (
                                                        <Button
                                                            onClick={() =>
                                                                removeImageField(
                                                                    index
                                                                )
                                                            }
                                                            type="button"
                                                            variant="outline"
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                    {field.state.value.length < 10 && (
                                        <Button
                                            onClick={addImageField}
                                            type="button"
                                            variant="outline"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Image
                                        </Button>
                                    )}
                                    <p className="text-muted-foreground text-xs">
                                        At least 1 image required, maximum 10
                                        images
                                    </p>
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
                                            createProductMutation.isPending
                                        }
                                        type="submit"
                                    >
                                        {createProductMutation.isPending
                                            ? "Creating..."
                                            : "Create Product"}
                                    </Button>
                                )}
                            </form.Subscribe>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
