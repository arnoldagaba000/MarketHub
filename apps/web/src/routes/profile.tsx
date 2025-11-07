import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Mail, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/profile")({
    component: ProfilePage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            redirect({
                to: "/login",
                throw: true,
            });
        }
        return { session };
    },
});

function ProfilePage() {
    const { session } = Route.useRouteContext();

    // Fetch vendor profile if exists
    const { data: vendorProfile } = useQuery({
        queryKey: ["vendor-profile"],
        queryFn: () => orpc.vendor.getMyVendorProfile.call(),
        enabled: !!session.data?.user,
    });

    // Fetch user orders count
    const { data: ordersData } = useQuery({
        queryKey: ["orders-count"],
        queryFn: () => orpc.order.getMyOrders.call({ page: 1, limit: 1 }),
        enabled: !!session.data?.user,
    });

    // Fetch cart count
    const { data: cart } = useQuery({
        queryKey: ["cart"],
        queryFn: () => orpc.cart.getCart.call(),
        enabled: !!session.data?.user,
    });

    // Fetch admin status
    const { data: adminStatus } = useQuery({
        queryKey: ["admin-status"],
        queryFn: () => orpc.admin.getMyAdminStatus.call(),
        enabled: !!session.data?.user,
    });

    // Resend verification email mutation
    const resendVerificationMutation = useMutation({
        mutationFn: () => orpc.admin.resendVerificationEmail.call(),
        onSuccess: (data) => {
            toast.success("Verification email sent!");
            if (data.token && process.env.NODE_ENV === "development") {
                toast.info(`Development token: ${data.token}`);
            }
        },
        onError: (error) => {
            toast.error(
                (error as Error).message || "Failed to send verification email"
            );
        },
    });

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-2">
                    <User className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-3xl">My Profile</h1>
                </div>
                <p className="text-muted-foreground">
                    Manage your account information
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* User Information */}
                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-xl">
                            Account Information
                        </h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="font-medium text-sm">Name</p>
                            <p className="text-muted-foreground">
                                {session.data?.user.name}
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-sm">Email</p>
                            <p className="text-muted-foreground">
                                {session.data?.user.email}
                            </p>
                        </div>
                        {session.data?.user.image && (
                            <div>
                                <p className="font-medium text-sm">Avatar</p>
                                {/* biome-ignore lint/correctness/useImageSize: Ignore useImageSize */}
                                <img
                                    alt="Avatar"
                                    className="mt-2 h-16 w-16 rounded-full"
                                    src={session.data.user.image}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Account Statistics */}
                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-xl">Statistics</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="font-medium text-sm">Total Orders</p>
                            <p className="text-muted-foreground">
                                {ordersData?.pagination.totalCount || 0}
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-sm">Cart Items</p>
                            <p className="text-muted-foreground">
                                {cart?.summary.totalItems || 0}
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-sm">Email Status</p>
                            {adminStatus?.emailVerified ? (
                                <Badge className="border-green-500/20 bg-green-500/10 text-green-600">
                                    Verified
                                </Badge>
                            ) : (
                                <div className="space-y-2">
                                    <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">
                                        Unverified
                                    </Badge>
                                    <Button
                                        className="mt-2"
                                        disabled={
                                            resendVerificationMutation.isPending
                                        }
                                        onClick={() =>
                                            resendVerificationMutation.mutate()
                                        }
                                        size="sm"
                                        variant="outline"
                                    >
                                        <Mail className="mr-2 h-4 w-4" />
                                        Resend Verification Email
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-sm">Vendor Status</p>
                            {vendorProfile ? (
                                <Badge
                                    className={
                                        vendorProfile.isApproved
                                            ? "border-green-500/20 bg-green-500/10 text-green-600"
                                            : "border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
                                    }
                                    variant="outline"
                                >
                                    {vendorProfile.isApproved
                                        ? "Approved Vendor"
                                        : "Pending Approval"}
                                </Badge>
                            ) : (
                                <p className="text-muted-foreground">
                                    Not a vendor
                                </p>
                            )}
                        </div>
                        {adminStatus?.isAdmin && (
                            <div>
                                <p className="font-medium text-sm">
                                    Admin Status
                                </p>
                                <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-600">
                                    Admin
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-6">
                <CardHeader>
                    <h2 className="font-semibold text-xl">Quick Actions</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link to="/orders">
                        <Button className="w-full" variant="outline">
                            View Orders
                        </Button>
                    </Link>
                    {cart && cart.summary.totalItems > 0 && (
                        <Link to="/cart">
                            <Button className="w-full" variant="outline">
                                View Cart ({cart.summary.totalItems} items)
                            </Button>
                        </Link>
                    )}
                    {vendorProfile ? (
                        <>
                            <Link to="/vendor/dashboard">
                                <Button className="w-full" variant="outline">
                                    Vendor Dashboard
                                </Button>
                            </Link>
                            <Link to="/vendor/settings">
                                <Button className="w-full" variant="outline">
                                    Vendor Settings
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <Link to="/become-vendor">
                            <Button className="w-full" variant="outline">
                                Become a Vendor
                            </Button>
                        </Link>
                    )}
                    {adminStatus?.isAdmin && (
                        <Link to="/admin/dashboard">
                            <Button className="w-full" variant="outline">
                                Admin Dashboard
                            </Button>
                        </Link>
                    )}
                    {!adminStatus?.isAdmin && (
                        <Link to="/become-admin">
                            <Button className="w-full" variant="outline">
                                Become an Admin
                            </Button>
                        </Link>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
