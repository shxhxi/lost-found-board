import HeaderNav from './header-nav';
import AccountMenu from './account-menu';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/65 dark:border-emerald-950/40 dark:bg-zinc-950/65">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-6 py-4 sm:px-8 xl:px-10 2xl:px-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            East Bay Community Board
          </p>
          <HeaderNav />
        </div>

        <AccountMenu />
      </div>
    </header>
  );
}