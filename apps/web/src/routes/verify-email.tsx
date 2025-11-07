import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/verify-email")({
    component: VerifyEmailPage,
    validateSearch: (search: Record<string, unknown>) => ({
        token: (search.token as string) || undefined,
    }),
    beforeLoad: async () => {
        const session = await authClient.getSession();
        if (!session.data) {
            throw new Error("Must be logged in to verify email");
        }
        return { session };
    },
});

function VerifyEmailPage() {
    const navigate = useNavigate();
    const { token } = Route.useSearch();
    const [isVerifying, setIsVerifying] = useState(false);

    // Check admin status
    const { data: adminStatus } = useQuery({
        queryKey: ["admin-status"],
        queryFn: () => orpc.admin.getMyAdminStatus.call(),
    });

    // Verify email mutation
    const verifyEmailMutation = useMutation({
        mutationFn: (verificationToken: string) =>
            orpc.admin.verifyEmail.call({ token: verificationToken }),
        onSuccess: () => {
            toast.success("Email verified successfully!");
            navigate({ to: "/profile" });
        },
        onError: (error) => {
            toast.error((error as Error).message || "Failed to verify email");
        },
    });

    // Resend verification email mutation
    const resendMutation = useMutation({
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

    // If token is provided, verify automatically
    if (token && !isVerifying) {
        setIsVerifying(true);
        verifyEmailMutation.mutate(token);
    }

    if (adminStatus?.emailVerified) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8">
                <Card>
                    <CardContent className="p-6 text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-600" />
                        <h2 className="mb-2 font-bold text-2xl">
                            Email Verified
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Your email address has been verified
                        </p>
                        <Button onClick={() => navigate({ to: "/profile" })}>
                            Go to Profile
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <Card>
                <CardHeader>
                    <div className="mb-2 flex items-center gap-2">
                        <Mail className="h-6 w-6 text-primary" />
                        <h1 className="font-bold text-2xl">
                            Verify Your Email
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Please verify your email address to continue
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {token ? (
                        <div className="text-center">
                            {verifyEmailMutation.isPending ? (
                                <div className="space-y-2">
                                    <div className="text-muted-foreground">
                                        Verifying your email...
                                    </div>
                                </div>
                            // biome-ignore lint/style/noNestedTernary: For simplicity
                            ) : verifyEmailMutation.isError ? (
                                <div className="space-y-4">
                                    <XCircle className="mx-auto h-16 w-16 text-red-600" />
                                    <h3 className="font-semibold text-lg">
                                        Verification Failed
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {verifyEmailMutation.error?.message ||
                                            "Invalid or expired verification token"}
                                    </p>
                                    <Button
                                        onClick={() => resendMutation.mutate()}
                                        variant="outline"
                                    >
                                        Resend Verification Email
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                We've sent a verification email to your address.
                                Please check your inbox and click the
                                verification link.
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Didn't receive the email? Check your spam folder
                                or request a new verification email.
                            </p>
                            <Button
                                className="w-full"
                                disabled={resendMutation.isPending}
                                onClick={() => resendMutation.mutate()}
                            >
                                {resendMutation.isPending
                                    ? "Sending..."
                                    : "Resend Verification Email"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
