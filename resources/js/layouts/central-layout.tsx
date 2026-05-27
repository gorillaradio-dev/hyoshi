import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';

export default function CentralLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return (
        <div className="flex min-h-svh flex-col bg-background">
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                <Link href="/" className="flex items-center gap-2">
                    <AppLogoIcon className="size-7 fill-current text-foreground" />
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2">
                            <UserInfo user={auth.user} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-lg">
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <main className="flex flex-1 flex-col">{children}</main>
        </div>
    );
}
