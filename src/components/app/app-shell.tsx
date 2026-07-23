"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { ProfileAvatarButton } from "@/components/app/profile-avatar-button";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { createClient } from "@/lib/supabase/client";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;

export function AppShell({
  user,
  companyName,
  roleName,
  tenantId,
  isPlatformAdmin,
  children,
}: {
  user: User;
  companyName: string | null;
  roleName: string | null;
  tenantId: string | null;
  isPlatformAdmin: boolean;
  children: React.ReactNode;
}) {
  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "";

  const savedWidth = user.user_metadata?.sidebar_width as number | undefined;
  const initialWidth =
    savedWidth && savedWidth >= MIN_SIDEBAR_WIDTH && savedWidth <= MAX_SIDEBAR_WIDTH
      ? savedWidth
      : DEFAULT_SIDEBAR_WIDTH;
  const [width, setWidth] = useState(initialWidth);
  const widthRef = useRef(initialWidth);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // Persists the chosen width on the user's own account (user_metadata, same
  // mechanism already used for full_name/avatar_url) so it follows them
  // across devices — not just this browser's localStorage.
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const next = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, dragStartRef.current.width + (e.clientX - dragStartRef.current.x))
      );
      widthRef.current = next;
      setWidth(next);
    }
    async function onMouseUp() {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { sidebar_width: widthRef.current } });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    dragStartRef.current = { x: e.clientX, width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <header className="flex items-center justify-between border-b border-(--border-default) px-5 py-3">
        <div className="flex items-center gap-3">
          <Wordmark />
          {companyName && (
            <>
              <span className="text-(--border-default)">|</span>
              <span className="text-[14px] font-semibold text-(--ink)">{companyName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          <ProfileAvatarButton userId={user.id} />
          <UserMenu firstName={firstName} />
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          style={{ width: `${width}px` }}
          className="relative hidden shrink-0 border-r border-(--border-default) bg-(--bg-surface) md:flex md:flex-col"
        >
          <SidebarNav roleName={roleName} tenantId={tenantId} isPlatformAdmin={isPlatformAdmin} />
          <div
            onMouseDown={startDrag}
            role="separator"
            aria-orientation="vertical"
            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-(--brand-500)/40"
          />
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
