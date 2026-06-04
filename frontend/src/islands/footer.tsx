import ilha from 'ilha';

export default ilha.render(() => {
  const year = String(new Date().getFullYear());
  return (
    <footer class='site-footer'>
      <p>© {year} Thomas Jensen</p>
    </footer>
  );
});
