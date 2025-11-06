import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/become-vendor")({
    component: BecomeVendorPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to become a vendor");
        }
        return { session };
    },
});

function BecomeVendorPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Check if user is already a vendor
    const { data: vendorProfile, isLoading: isChecking } = useQuery({
        queryKey: ["vendor-profile"],
        queryFn: () => orpc.vendor.getMyVendorProfile.call(),
    });

    // Create vendor mutation
    const createVendorMutation = useMutation({
        mutationFn: (data: {
            shopName: string;
            description?: string;
            logo?: string;
        }) => orpc.vendor.becomeVendor.call(data),
        onSuccess: () => {
            toast.success("Vendor profile created! Awaiting admin approval.");
            queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
            navigate({ to: "/vendor/dashboard" });
        },
        onError: (error) => {
            toast.error(
                (error as Error).message || "Failed to create vendor profile"
            );
        },
    });

    const form = useForm({
        defaultValues: {
            shopName: "",
            description: "",
            logo: "",
        },
        onSubmit: ({ value }) => {
            createVendorMutation.mutate({
                shopName: value.shopName,
                description: value.description || undefined,
                logo: value.logo || undefined,
            });
        },
    });

    if (isChecking) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    // If already a vendor, redirect to dashboard
    if (vendorProfile) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="p-6 text-center">
                        <Store className="mx-auto mb-4 h-12 w-12 text-primary" />
                        <h2 className="mb-2 font-bold text-2xl">
                            You're already a vendor!
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            You already have a vendor profile. Visit your
                            dashboard to manage your shop.
                        </p>
                        <Button
                            onClick={() =>
                                navigate({ to: "/vendor/dashboard" })
                            }
                        >
                            Go to Vendor Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-8 text-center">
                <Store className="mx-auto mb-4 h-16 w-16 text-primary" />
                <h1 className="mb-2 font-bold text-3xl">Become a Vendor</h1>
                <p className="text-muted-foreground">
                    Start selling your products on MarketHub
                </p>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="font-semibold text-xl">
                        Vendor Information
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Fill in your shop details to get started. Your profile
                        will be reviewed by our admin team.
                    </p>
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
                        <form.Field name="shopName">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        Shop Name{" "}
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
                                        placeholder="My Awesome Shop"
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
                                        Description
                                    </Label>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="Tell customers about your shop..."
                                        rows={4}
                                        value={field.state.value}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Optional: Describe what makes your shop
                                        special
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

                        <form.Field name="logo">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Logo URL</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="https://example.com/logo.png"
                                        type="url"
                                        value={field.state.value}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Optional: URL to your shop logo image
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

                        <div className="rounded-lg bg-muted p-4 text-muted-foreground text-sm">
                            <p className="mb-2 font-medium">
                                What happens next?
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>Your vendor profile will be created</li>
                                <li>
                                    Our admin team will review your application
                                </li>
                                <li>
                                    Once approved, you can start adding products
                                </li>
                                <li>
                                    You'll receive an email notification when
                                    approved
                                </li>
                            </ul>
                        </div>

                        <form.Subscribe>
                            {(state) => (
                                <Button
                                    className="w-full"
                                    disabled={
                                        !state.canSubmit ||
                                        state.isSubmitting ||
                                        createVendorMutation.isPending
                                    }
                                    size="lg"
                                    type="submit"
                                >
                                    {createVendorMutation.isPending
                                        ? "Creating..."
                                        : "Create Vendor Profile"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
