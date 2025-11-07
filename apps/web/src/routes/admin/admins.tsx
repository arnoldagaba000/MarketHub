/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shield, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/admins")({
    component: AdminAdminsPage,
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

function AdminAdminsPage() {
    const queryClient = useQueryClient();
    const { session } = Route.useRouteContext();

    // Fetch admins
    const { data: admins, isLoading } = useQuery({
        queryKey: ["admins"],
        queryFn: () => orpc.admin.listAdmins.call(),
    });

    // Remove admin mutation
    const removeAdminMutation = useMutation({
        mutationFn: (userId: string) => orpc.admin.removeAdmin.call({ userId }),
        onSuccess: () => {
            toast.success("Admin status removed");
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
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
                    <h1 className="font-bold text-3xl">Admin Management</h1>
                </div>
                <p className="text-muted-foreground">
                    Manage admin users and permissions
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[...new Array(3)].map((_, i) => (
                        <Skeleton className="h-24 w-full" key={i} />
                    ))}
                </div>
            // biome-ignore lint/style/noNestedTernary: For simplicity
            ) : admins && admins.length > 0 ? (
                <div className="space-y-4">
                    {admins.map((admin) => (
                        <Card key={admin.id}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">
                                                {admin.name}
                                            </h3>
                                            <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-600">
                                                Admin
                                            </Badge>
                                            {admin.id ===
                                                session.data?.user.id && (
                                                <Badge variant="secondary">
                                                    You
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            {admin.email}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <Badge variant="outline">
                                                {admin._count.orders} orders
                                            </Badge>
                                            <Badge variant="secondary">
                                                Admin since{" "}
                                                {new Date(
                                                    admin.createdAt
                                                ).toLocaleDateString()}
                                            </Badge>
                                        </div>
                                    </div>
                                    {admin.id !== session.data?.user.id && (
                                        <Button
                                            disabled={
                                                removeAdminMutation.isPending
                                            }
                                            onClick={() =>
                                                removeAdminMutation.mutate(
                                                    admin.id
                                                )
                                            }
                                            size="sm"
                                            variant="outline"
                                        >
                                            <UserMinus className="mr-2 h-4 w-4" />
                                            Remove Admin
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No admins found
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
