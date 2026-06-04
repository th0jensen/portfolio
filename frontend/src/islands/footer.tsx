import ilha from 'ilha';

export default ilha.render(() => {
  const year = String(new Date().getFullYear());
  return (
    <footer class='w-full max-w-6xl mx-auto px-6 py-8 border-t border-[hsl(var(--border)/0.25)] flex items-center justify-center'>
      <p class='text-sm text-[hsl(var(--muted-foreground))] font-medium tracking-tight m-0'>
        © {year} Thomas Jensen
      </p>
    </footer>
  );
});
