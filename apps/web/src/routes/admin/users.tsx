/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shield, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/users")({
    component: AdminUsersPage,
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
            if (error && typeof error === "object" && "to" in error) {
                throw error;
            }
            throw redirect({
                to: "/dashboard",
                search: {
                    error: "You must be an admin to access this page",
                },
            });
        }
    },
});

function AdminUsersPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    // Fetch users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ["users", page, search],
        queryFn: () =>
            orpc.admin.listUsers.call({
                page,
                limit: 20,
                search: search || undefined,
            }),
    });

    // Make admin mutation
    const makeAdminMutation = useMutation({
        mutationFn: (userId: string) => orpc.admin.makeAdmin.call({ userId }),
        onSuccess: () => {
            toast.success("User granted admin status");
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["admins"] });
        },
        onError: (error) => {
            toast.error(
                (error as Error).message || "Failed to grant admin status"
            );
        },
    });

    // Remove admin mutation
    const removeAdminMutation = useMutation({
        mutationFn: (userId: string) => orpc.admin.removeAdmin.call({ userId }),
        onSuccess: () => {
            toast.success("Admin status removed");
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["admins"] });
        },
        onError: (error) => {
            toast.error(
                (error as Error).message || "Failed to remove admin status"
            );
        },
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-3xl">User Management</h1>
                </div>
                <p className="text-muted-foreground">
                    Manage users and admin permissions
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <Input
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search users by name or email..."
                    value={search}
                />
            </div>

            {/* Users List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[...new Array(5)].map((_, i) => (
                        <Skeleton className="h-24 w-full" key={i} />
                    ))}
                </div>
            // biome-ignore lint/style/noNestedTernary: For simplicity
            ) : usersData && usersData.users.length > 0 ? (
                <div className="space-y-4">
                    {usersData.users.map((user) => (
                        <Card key={user.id}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">
                                                {user.name}
                                            </h3>
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
                                        <p className="text-muted-foreground text-sm">
                                            {user.email}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <Badge variant="outline">
                                                {user._count.orders} orders
                                            </Badge>
                                            <Badge variant="outline">
                                                {user._count.reviews} reviews
                                            </Badge>
                                            <Badge variant="secondary">
                                                Joined{" "}
                                                {new Date(
                                                    user.createdAt
                                                ).toLocaleDateString()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {user.isAdmin ? (
                                            <Button
                                                disabled={
                                                    removeAdminMutation.isPending
                                                }
                                                onClick={() =>
                                                    removeAdminMutation.mutate(
                                                        user.id
                                                    )
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                <UserMinus className="mr-2 h-4 w-4" />
                                                Remove Admin
                                            </Button>
                                        ) : (
                                            <Button
                                                disabled={
                                                    makeAdminMutation.isPending
                                                }
                                                onClick={() =>
                                                    makeAdminMutation.mutate(
                                                        user.id
                                                    )
                                                }
                                                size="sm"
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Make Admin
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No users found
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {usersData && usersData.pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                    <Button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        variant="outline"
                    >
                        Previous
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                            Page {page} of {usersData.pagination.totalPages}
                        </span>
                    </div>
                    <Button
                        disabled={page >= usersData.pagination.totalPages}
                        onClick={() => setPage(page + 1)}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
