"use client";

import { useState } from "react";
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

  // Persists the chosen width on the user's own account (user_metadata, same
  // mechanism already used for full_name/avatar_url) so it follows them
  // across devices — not just this browser's localStorage.
  //
  // Uses Pointer Capture (not document-level mousemove/mouseup) so the
  // handle keeps receiving move/up events even if the pointer leaves the
  // handle — or the browser viewport entirely — mid-drag. Without capture,
  // releasing the button outside the handle's bounds never fires our
  // mouseup listener, and the resize keeps following the pointer forever
  // until some later stray mouseup elsewhere on the page.
  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragStartX = String(e.clientX);
    e.currentTarget.dataset.dragStartWidth = String(width);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function computeNextWidth(e: React.PointerEvent<HTMLDivElement>): number | null {
    const { dragStartX, dragStartWidth } = e.currentTarget.dataset;
    if (dragStartX === undefined || dragStartWidth === undefined) return null;
    return Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, Number(dragStartWidth) + (e.clientX - Number(dragStartX)))
    );
  }

  function onDrag(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextWidth(e);
    if (next !== null) setWidth(next);
  }

  async function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextWidth(e);
    delete e.currentTarget.dataset.dragStartX;
    delete e.currentTarget.dataset.dragStartWidth;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (next === null) return;
    setWidth(next);
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { sidebar_width: next } });
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
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="separator"
            aria-orientation="vertical"
            className="absolute right-0 top-0 h-full w-1.5 touch-none cursor-col-resize hover:bg-(--brand-500)/40"
          />
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
