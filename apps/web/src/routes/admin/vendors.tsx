/** biome-ignore-all lint/style/noMagicNumbers: Ignore magic numbers */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/vendors")({
    component: AdminVendorsPage,
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

function AdminVendorsPage() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<"all" | "approved" | "pending">("all");
    const [page, setPage] = useState(1);

    // Fetch vendors
    const { data: vendorsData, isLoading } = useQuery({
        queryKey: ["all-vendors", status, page],
        queryFn: () =>
            orpc.admin.listAllVendors.call({ page, limit: 20, status }),
    });

    // Approve vendor mutation
    const approveMutation = useMutation({
        mutationFn: (vendorId: string) =>
            orpc.admin.approveVendor.call({ vendorId }),
        onSuccess: () => {
            toast.success("Vendor approved successfully");
            queryClient.invalidateQueries({ queryKey: ["all-vendors"] });
            queryClient.invalidateQueries({ queryKey: ["pending-vendors"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to approve vendor");
        },
    });

    // Reject vendor mutation
    const rejectMutation = useMutation({
        mutationFn: (vendorId: string) =>
            orpc.admin.rejectVendor.call({ vendorId }),
        onSuccess: () => {
            toast.success("Vendor rejected");
            queryClient.invalidateQueries({ queryKey: ["all-vendors"] });
            queryClient.invalidateQueries({ queryKey: ["pending-vendors"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to reject vendor");
        },
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-3xl">Vendor Management</h1>
                </div>
                <p className="text-muted-foreground">
                    Approve or reject vendor applications
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4">
                <Select
                    onValueChange={(v) => setStatus(v as typeof status)}
                    value={status}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Vendors List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[...new Array(5)].map((_, i) => (
                        <Skeleton className="h-32 w-full" key={i} />
                    ))}
                </div>
            // biome-ignore lint/style/noNestedTernary: For simplicity
            ) : vendorsData && vendorsData.vendors.length > 0 ? (
                <div className="space-y-4">
                    {vendorsData.vendors.map((vendor) => (
                        <Card key={vendor.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">
                                            {vendor.shopName}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            by {vendor.user.name} (
                                            {vendor.user.email})
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            vendor.isApproved
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {vendor.isApproved
                                            ? "Approved"
                                            : "Pending"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {vendor.description && (
                                    <p className="text-muted-foreground">
                                        {vendor.description}
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <Badge variant="outline">
                                        {vendor._count.products} products
                                    </Badge>
                                    <Badge variant="outline">
                                        {vendor._count.orders} orders
                                    </Badge>
                                    <Badge variant="secondary">
                                        Created{" "}
                                        {new Date(
                                            vendor.createdAt
                                        ).toLocaleDateString()}
                                    </Badge>
                                </div>
                                {!vendor.isApproved && (
                                    <div className="flex gap-2">
                                        <Button
                                            disabled={
                                                approveMutation.isPending ||
                                                rejectMutation.isPending
                                            }
                                            onClick={() =>
                                                approveMutation.mutate(
                                                    vendor.id
                                                )
                                            }
                                            size="sm"
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            disabled={
                                                approveMutation.isPending ||
                                                rejectMutation.isPending
                                            }
                                            onClick={() =>
                                                rejectMutation.mutate(vendor.id)
                                            }
                                            size="sm"
                                            variant="outline"
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No vendors found
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {vendorsData && vendorsData.pagination.totalPages > 1 && (
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
                            Page {page} of {vendorsData.pagination.totalPages}
                        </span>
                    </div>
                    <Button
                        disabled={page >= vendorsData.pagination.totalPages}
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
