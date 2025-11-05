import { Outlet } from "@tanstack/react-router";
import Header from "./header";

export function RootLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="mt-auto border-t py-8">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        <div>
                            <h3 className="mb-4 font-semibold">MarketHub</h3>
                            <p className="text-muted-foreground text-sm">
                                Your trusted multi-vendor marketplace for
                                quality products.
                            </p>
                        </div>

                        <div>
                            <h3 className="mb-4 font-semibold">Shop</h3>
                            <ul className="space-y-2 text-muted-foreground text-sm">
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/products"
                                    >
                                        All Products
                                    </a>
                                </li>
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/products?sort=newest"
                                    >
                                        New Arrivals
                                    </a>
                                </li>
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/products?sort=popular"
                                    >
                                        Popular
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="mb-4 font-semibold">Sell</h3>
                            <ul className="space-y-2 text-muted-foreground text-sm">
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/become-vendor"
                                    >
                                        Become a Vendor
                                    </a>
                                </li>
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/vendor/dashboard"
                                    >
                                        Vendor Dashboard
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="mb-4 font-semibold">Support</h3>
                            <ul className="space-y-2 text-muted-foreground text-sm">
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/help"
                                        rel="noopener"
                                        target="_blank"
                                    >
                                        Help Center
                                    </a>
                                </li>
                                <li>
                                    <a
                                        className="hover:text-primary"
                                        href="/contact"
                                        rel="noopener"
                                        target="_blank"
                                    >
                                        Contact Us
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 border-t pt-8 text-center text-muted-foreground text-sm">
                        <p>
                            &copy; {new Date().getFullYear()} MarketHub. All
                            rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
