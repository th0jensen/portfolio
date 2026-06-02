import ilha from 'ilha';

export default ilha.render(() => {
  return (
    <section id='error' class='error-container'>
      <h1>Error 404: Page Not Found</h1>
      <p>The page you're looking for doesn't exist or something went wrong.</p>
      <a href='/' class='btn btn-primary'>
        Go Home
      </a>
    </section>
  );
});
