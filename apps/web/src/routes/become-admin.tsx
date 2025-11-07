import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/become-admin")({
    component: BecomeAdminPage,
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in");
        }
        return { session };
    },
});

function BecomeAdminPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [adminCode, setAdminCode] = useState("");

    // Check if user is already admin
    const { data: adminStatus } = useQuery({
        queryKey: ["admin-status"],
        queryFn: () => orpc.admin.getMyAdminStatus.call(),
    });

    // Make admin mutation (this would typically require a special code or first user)
    const makeAdminMutation = useMutation({
        mutationFn: async () => {
            // For security, this should check if:
            // 1. User is the first user in the system, OR
            // 2. User has a valid admin code
            // For now, we'll check if there are no admins yet
            const admins = await orpc.admin.listAdmins.call();
            if (admins.length === 0) {
                // First user becomes admin automatically
                // In production, you'd use a special admin code or database seed
                // For now, we'll allow the first user to become admin
                return { success: true, message: "You are now an admin!" };
            }
            throw new Error(
                "Admin code required or you must be the first user"
            );
        },
        onSuccess: () => {
            // In a real app, you'd call an API to make yourself admin
            // For now, we'll just show a message
            toast.success(
                "If you're the first user, you can become admin. Otherwise, contact an existing admin."
            );
            queryClient.invalidateQueries({ queryKey: ["admin-status"] });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to become admin");
        },
    });

    if (adminStatus?.isAdmin) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8">
                <Card>
                    <CardContent className="p-6 text-center">
                        <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
                        <h2 className="mb-2 font-bold text-2xl">
                            You're already an admin!
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            You already have admin privileges
                        </p>
                        <Button
                            onClick={() => navigate({ to: "/admin/dashboard" })}
                        >
                            Go to Admin Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-8 text-center">
                <Shield className="mx-auto mb-4 h-16 w-16 text-primary" />
                <h1 className="mb-2 font-bold text-3xl">Become an Admin</h1>
                <p className="text-muted-foreground">
                    Request admin access to manage the platform
                </p>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="font-semibold text-xl">Admin Access</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted p-4 text-muted-foreground text-sm">
                        <p className="mb-2 font-medium">
                            How to become an admin:
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>
                                If you're the first user, you can become admin
                                automatically
                            </li>
                            <li>
                                Otherwise, you need an admin code from an
                                existing admin
                            </li>
                            <li>
                                Or ask an existing admin to grant you admin
                                status from the admin dashboard
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="admin-code">
                            Admin Code (Optional)
                        </Label>
                        <Input
                            id="admin-code"
                            onChange={(e) => setAdminCode(e.target.value)}
                            placeholder="Enter admin code if you have one"
                            value={adminCode}
                        />
                        <p className="text-muted-foreground text-xs">
                            Leave empty if you're the first user
                        </p>
                    </div>

                    <Button
                        className="w-full"
                        disabled={makeAdminMutation.isPending}
                        onClick={() => makeAdminMutation.mutate()}
                        size="lg"
                    >
                        {makeAdminMutation.isPending
                            ? "Processing..."
                            : "Request Admin Access"}
                    </Button>

                    <div className="rounded-lg bg-yellow-500/10 p-4 text-sm text-yellow-600">
                        <p className="font-medium">Note:</p>
                        <p>
                            In production, admin access should be granted by
                            existing admins through the admin dashboard, not
                            through this page.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
