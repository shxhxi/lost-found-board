export default function ThemeScript() {
  const script = `
    (() => {
      try {
        const saved = window.localStorage.getItem('theme');
        const preference =
          saved === 'light' || saved === 'dark' || saved === 'system'
            ? saved
            : 'system';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldUseDark =
          preference === 'dark' || (preference === 'system' && prefersDark);

        document.documentElement.classList.toggle('dark', shouldUseDark);
      } catch {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}