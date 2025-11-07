/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/dashboard")({
    component: AdminDashboardPage,
    beforeLoad: async ({ location }) => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw redirect({
                to: "/login",
                search: {
                    redirect: location.href,
                },
            });
        }
        // Check if user is an admin
        try {
            const adminStatus = await orpc.admin.getMyAdminStatus.call();
            if (!adminStatus.isAdmin) {
                throw redirect({
                    to: "/dashboard",
                    search: {
                        error: "You must be an admin to access this page",
                    },
                });
            }
            return { session, adminStatus };
        } catch (error) {
            // If it's already a redirect, re-throw it
            if (error && typeof error === "object" && "to" in error) {
                throw error;
            }
            // Otherwise redirect to dashboard
            throw redirect({
                to: "/dashboard",
                search: {
                    error: "You must be an admin to access this page",
                },
            });
        }
    },
});

function AdminDashboardPage() {
    // Fetch pending vendors
    const { data: pendingVendors, isLoading: isPendingLoading } = useQuery({
        queryKey: ["pending-vendors"],
        queryFn: () => orpc.admin.listPendingVendors.call(),
    });

    // Fetch all vendors
    const { data: vendorsData, isLoading: isVendorsLoading } = useQuery({
        queryKey: ["all-vendors"],
        queryFn: () =>
            orpc.admin.listAllVendors.call({
                page: 1,
                limit: 10,
                status: "all",
            }),
    });

    // Fetch admins
    const { data: admins, isLoading: isAdminsLoading } = useQuery({
        queryKey: ["admins"],
        queryFn: () => orpc.admin.listAdmins.call(),
    });

    // Fetch users
    const { data: usersData, isLoading: isUsersLoading } = useQuery({
        queryKey: ["users"],
        queryFn: () => orpc.admin.listUsers.call({ page: 1, limit: 10 }),
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-3xl">Admin Dashboard</h1>
                </div>
                <p className="text-muted-foreground">
                    Manage vendors, users, and platform settings
                </p>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Pending Vendors
                        </CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {isPendingLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                pendingVendors?.length || 0
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Awaiting approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Total Vendors
                        </CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {isVendorsLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                vendorsData?.pagination.totalCount || 0
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            All vendors
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">
                            {isUsersLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                usersData?.pagination.totalCount || 0
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Platform users
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs className="space-y-4" defaultValue="vendors">
                <TabsList>
                    <TabsTrigger value="vendors">Vendors</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="admins">Admins</TabsTrigger>
                </TabsList>

                {/* Vendors Tab */}
                <TabsContent className="space-y-4" value="vendors">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold text-xl">
                            Vendor Management
                        </h2>
                        <Link to="/admin/vendors">
                            <Button variant="outline">View All Vendors</Button>
                        </Link>
                    </div>

                    {/* Pending Vendors */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Approval</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isPendingLoading ? (
                                <div className="space-y-4">
                                    {[...new Array(3)].map((_, i) => (
                                        <Skeleton
                                            className="h-20 w-full"
                                            key={i}
                                        />
                                    ))}
                                </div>
                                // biome-ignore lint/style/noNestedTernary: For simplicity
                            ) : pendingVendors && pendingVendors.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingVendors.map((vendor) => (
                                        <VendorCard
                                            key={vendor.id}
                                            vendor={vendor}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground">
                                    No pending vendors
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent className="space-y-4" value="users">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold text-xl">
                            User Management
                        </h2>
                        <Link to="/admin/users">
                            <Button variant="outline">View All Users</Button>
                        </Link>
                    </div>

                    {isUsersLoading ? (
                        <div className="space-y-4">
                            {[...new Array(5)].map((_, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton loader
                                <Skeleton className="h-16 w-full" key={i} />
                            ))}
                        </div>
                        // biome-ignore lint/style/noNestedTernary: For simplicity
                    ) : usersData && usersData.users.length > 0 ? (
                        <div className="space-y-2">
                            {usersData.users.map((user) => (
                                <UserCard key={user.id} user={user} />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                                No users found
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Admins Tab */}
                <TabsContent className="space-y-4" value="admins">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold text-xl">
                            Admin Management
                        </h2>
                        <Link to="/admin/admins">
                            <Button variant="outline">Manage Admins</Button>
                        </Link>
                    </div>

                    {isAdminsLoading ? (
                        <div className="space-y-4">
                            {[...new Array(3)].map((_, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton loader
                                <Skeleton className="h-16 w-full" key={i} />
                            ))}
                        </div>
                        // biome-ignore lint/style/noNestedTernary: For simplicity
                    ) : admins && admins.length > 0 ? (
                        <div className="space-y-2">
                            {admins.map((admin) => (
                                <AdminCard admin={admin} key={admin.id} />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                                No admins found
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function VendorCard({
    vendor,
}: {
    vendor: {
        id: string;
        shopName: string;
        description: string | null;
        createdAt: Date;
        user: { name: string; email: string };
        _count: { products: number };
    };
}) {
    const queryClient = useQueryClient();

    const approveMutation = useMutation({
        mutationFn: () =>
            orpc.admin.approveVendor.call({ vendorId: vendor.id }),
        onSuccess: () => {
            toast.success("Vendor approved successfully");
            queryClient.invalidateQueries({ queryKey: ["pending-vendors"] });
            queryClient.invalidateQueries({ queryKey: ["all-vendors"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to approve vendor");
        },
    });

    const rejectMutation = useMutation({
        mutationFn: () => orpc.admin.rejectVendor.call({ vendorId: vendor.id }),
        onSuccess: () => {
            toast.success("Vendor rejected");
            queryClient.invalidateQueries({ queryKey: ["pending-vendors"] });
            queryClient.invalidateQueries({ queryKey: ["all-vendors"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to reject vendor");
        },
    });

    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex-1">
                <h3 className="font-semibold">{vendor.shopName}</h3>
                <p className="text-muted-foreground text-sm">
                    by {vendor.user.name} ({vendor.user.email})
                </p>
                {vendor.description && (
                    <p className="mt-1 text-muted-foreground text-sm">
                        {vendor.description}
                    </p>
                )}
                <div className="mt-2 flex gap-2">
                    <Badge variant="outline">
                        {vendor._count.products} products
                    </Badge>
                    <Badge variant="secondary">
                        Created{" "}
                        {new Date(vendor.createdAt).toLocaleDateString()}
                    </Badge>
                </div>
            </div>
            <div className="flex gap-2">
                <Button
                    disabled={
                        approveMutation.isPending || rejectMutation.isPending
                    }
                    onClick={() => approveMutation.mutate()}
                    size="sm"
                    variant="default"
                >
                    Approve
                </Button>
                <Button
                    disabled={
                        approveMutation.isPending || rejectMutation.isPending
                    }
                    onClick={() => rejectMutation.mutate()}
                    size="sm"
                    variant="outline"
                >
                    Reject
                </Button>
            </div>
        </div>
    );
}

function UserCard({
    user,
}: {
    user: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        isAdmin: boolean;
        createdAt: Date;
        _count: { orders: number; reviews: number };
    };
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{user.name}</h3>
                    {user.isAdmin && (
                        <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-600">
                            Admin
                        </Badge>
                    )}
                    {user.emailVerified ? (
                        <Badge className="border-green-500/20 bg-green-500/10 text-green-600">
                            Verified
                        </Badge>
                    ) : (
                        <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">
                            Unverified
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground text-sm">{user.email}</p>
                <div className="mt-2 flex gap-2">
                    <Badge variant="outline">{user._count.orders} orders</Badge>
                    <Badge variant="outline">
                        {user._count.reviews} reviews
                    </Badge>
                </div>
            </div>
        </div>
    );
}

function AdminCard({
    admin,
}: {
    admin: {
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        _count: { orders: number };
    };
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{admin.name}</h3>
                    <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-600">
                        Admin
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{admin.email}</p>
                <p className="text-muted-foreground text-xs">
                    Admin since {new Date(admin.createdAt).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
}
