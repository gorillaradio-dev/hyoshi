import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useTenant } from '@/hooks/use-tenant';

export function TenantMobileHeader() {
    const { auth } = usePage().props;
    const tenant = useTenant();

    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <Link href={`/app/${tenant.slug}/dashboard`} className="flex items-center gap-2">
                <AppLogoIcon className="size-6 fill-current text-foreground" />
                <span className="truncate text-sm font-semibold">{tenant.name}</span>
            </Link>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-auto gap-2 px-2 py-1">
                        <UserInfo user={auth.user} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-lg">
                    <UserMenuContent user={auth.user} />
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
