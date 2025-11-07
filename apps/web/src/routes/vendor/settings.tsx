/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/vendor/settings")({
    component: VendorSettingsPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to access vendor settings");
        }
        // Check if user is a vendor
        const vendorProfile = await orpc.vendor.getMyVendorProfile.call();
        if (!vendorProfile) {
            throw new Error("Must be a vendor to access vendor settings");
        }
        return { session, vendorProfile };
    },
});

function VendorSettingsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch vendor profile
    const { data: vendorProfile, isLoading } = useQuery({
        queryKey: ["vendor-profile"],
        queryFn: () => orpc.vendor.getMyVendorProfile.call(),
    });

    // Update vendor mutation
    const updateVendorMutation = useMutation({
        mutationFn: (data: {
            shopName?: string;
            description?: string;
            logo?: string;
        }) => orpc.vendor.updateVendorProfile.call(data),
        onSuccess: () => {
            toast.success("Vendor profile updated successfully!");
            queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
            navigate({ to: "/vendor/dashboard" });
        },
        onError: (error) => {
            toast.error(
                (error as Error).message || "Failed to update vendor profile"
            );
        },
    });

    const form = useForm({
        defaultValues: {
            shopName: vendorProfile?.shopName || "",
            description: vendorProfile?.description || "",
            logo: vendorProfile?.logo || "",
        },
        onSubmit: ({ value }) => {
            updateVendorMutation.mutate({
                shopName:
                    value.shopName !== vendorProfile?.shopName
                        ? value.shopName
                        : undefined,
                description:
                    value.description !== vendorProfile?.description
                        ? value.description
                        : undefined,
                logo:
                    value.logo !== vendorProfile?.logo ? value.logo : undefined,
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

    if (!vendorProfile) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="mb-4 font-bold text-2xl">
                    You're not a vendor yet
                </h1>
                <p className="mb-4 text-muted-foreground">
                    Create a vendor profile to access settings
                </p>
                <Button onClick={() => navigate({ to: "/become-vendor" })}>
                    Become a Vendor
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-3xl">Vendor Settings</h1>
                </div>
                <p className="text-muted-foreground">
                    Update your vendor profile information
                </p>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="font-semibold text-xl">
                        Vendor Information
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
                        <form.Field name="shopName">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        Shop Name
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
                                        placeholder="Tell customers about your shop..."
                                        rows={4}
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
                                            updateVendorMutation.isPending
                                        }
                                        type="submit"
                                    >
                                        {updateVendorMutation.isPending
                                            ? "Updating..."
                                            : "Update Profile"}
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
