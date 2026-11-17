import { createIsland } from '@ilha/void/server';
import { useShared } from '@ilha/void';
import type { View } from 'ilha';
import header from '../islands/header.tsx';
import footer from '../islands/footer.tsx';

const Header = createIsland(header, { id: 'header', hydrate: 'load' });
const Footer = createIsland(footer, { id: 'footer', hydrate: 'load' });

export default function Layout({ children }: { children: View }) {
  const { path } = useShared<{ path: string }>();
  return (
    <main class='site-layout'>
      {
        /* iOS 26 Safari tints its bars from the fixed box at each viewport edge,
          and pixel-samples one without a plain colour (the blurred header). These
          give it the page background to read; clipped to text, they paint nothing. */
      }
      <div aria-hidden='true' class='edge-tint top-0' />
      <div aria-hidden='true' class='edge-tint bottom-0' />
      <Header path={path} />
      <div class='site-page-content'>
        <div class='site-page-main'>{children}</div>
        <Footer />
      </div>
    </main>
  );
}
