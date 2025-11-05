import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Menu, Package, ShoppingCart, Store, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const Header = () => {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Get current user session
    const { data: session } = useQuery({
        queryKey: ["session"],
        queryFn: () => authClient.getSession(),
    });

    // Get vendor profile if user is a vendor
    const { data: vendorProfile } = useQuery({
        queryKey: ["vendor-profile"],
        queryFn: () => orpc.vendor.getMyVendorProfile.call(),
        enabled: !!session?.data?.user,
    });

    // Get cart to show item count
    const { data: cart } = useQuery({
        queryKey: ["cart"],
        queryFn: () => orpc.cart.getCart.call(),
        enabled: !!session?.data?.user,
    });

    const handleLogout = async () => {
        await authClient.signOut();
        router.navigate({ to: "/login" });
    };

    const cartItemCount = cart?.summary.totalItems || 0;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo and Brand */}
                <Link className="flex items-center space-x-2" to="/">
                    <Store className="h-6 w-6 text-primary" />
                    <span className="font-bold text-xl">MarketHub</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden items-center space-x-6 md:flex">
                    <Link
                        className="font-medium text-sm transition-colors hover:text-primary"
                        to="/products"
                    >
                        Shop
                    </Link>

                    {session?.data?.user && (
                        <Link
                            className="font-medium text-sm transition-colors hover:text-primary"
                            to="/orders"
                        >
                            My Orders
                        </Link>
                    )}

                    {vendorProfile && (
                        <Link
                            className="flex items-center gap-1 font-medium text-sm transition-colors hover:text-primary"
                            to="/vendor/dashboard"
                        >
                            <Package className="h-4 w-4" />
                            Vendor Dashboard
                        </Link>
                    )}
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-4">
                    {/* Cart Button */}
                    {session?.data?.user && (
                        <Link to="/cart">
                            <Button
                                className="relative"
                                size="icon"
                                variant="ghost"
                            >
                                <ShoppingCart className="h-5 w-5" />
                                {cartItemCount > 0 && (
                                    <span className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                                        {cartItemCount}
                                    </span>
                                )}
                            </Button>
                        </Link>
                    )}

                    {/* User Menu or Auth Buttons */}
                    {session?.data?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
                                    <User className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="font-medium text-sm leading-none">
                                            {session.data.user.name}
                                        </p>
                                        <p className="text-muted-foreground text-xs leading-none">
                                            {session.data.user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                    <Link
                                        className="cursor-pointer"
                                        to="/orders"
                                    >
                                        <Package className="mr-2 h-4 w-4" />
                                        My Orders
                                    </Link>
                                </DropdownMenuItem>

                                {vendorProfile ? (
                                    <DropdownMenuItem asChild>
                                        <Link
                                            className="cursor-pointer"
                                            to="/vendor/dashboard"
                                        >
                                            <Store className="mr-2 h-4 w-4" />
                                            Vendor Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem asChild>
                                        <Link
                                            className="cursor-pointer"
                                            to="/become-vendor"
                                        >
                                            <Store className="mr-2 h-4 w-4" />
                                            Become a Vendor
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="hidden items-center space-x-2 md:flex">
                            <Link to="/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link to="/register">
                                <Button>Sign Up</Button>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu */}
                    <Sheet
                        onOpenChange={setMobileMenuOpen}
                        open={mobileMenuOpen}
                    >
                        <SheetTrigger asChild className="md:hidden">
                            <Button size="icon" variant="ghost">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            className="w-[300px] sm:w-[400px]"
                            side="right"
                        >
                            <nav className="mt-8 flex flex-col space-y-4">
                                <Link
                                    className="font-medium text-lg"
                                    onClick={() => setMobileMenuOpen(false)}
                                    to="/products"
                                >
                                    Shop
                                </Link>

                                {session?.data?.user && (
                                    <>
                                        <Link
                                            className="font-medium text-lg"
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                            to="/orders"
                                        >
                                            My Orders
                                        </Link>

                                        {vendorProfile ? (
                                            <Link
                                                className="font-medium text-lg"
                                                onClick={() =>
                                                    setMobileMenuOpen(false)
                                                }
                                                to="/vendor/dashboard"
                                            >
                                                Vendor Dashboard
                                            </Link>
                                        ) : (
                                            <Link
                                                className="font-medium text-lg"
                                                onClick={() =>
                                                    setMobileMenuOpen(false)
                                                }
                                                to="/become-vendor"
                                            >
                                                Become a Vendor
                                            </Link>
                                        )}

                                        <Button
                                            className="justify-start"
                                            onClick={handleLogout}
                                            variant="outline"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </Button>
                                    </>
                                )}

                                {!session?.data?.user && (
                                    <div className="flex flex-col space-y-2">
                                        <Link
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                            to="/login"
                                        >
                                            <Button
                                                className="w-full"
                                                variant="outline"
                                            >
                                                Login
                                            </Button>
                                        </Link>
                                        <Link
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                            to="/register"
                                        >
                                            <Button className="w-full">
                                                Sign Up
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
};

export default Header;
