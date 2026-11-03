import { render, screen } from '@testing-library/react';
import App from './App';

// jsdom has no WebGL, so the app shows its plain fallback.
test('shows the fallback when WebGL is unavailable', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /Bonifasius Baron Betazara/i })).toBeInTheDocument();
});
