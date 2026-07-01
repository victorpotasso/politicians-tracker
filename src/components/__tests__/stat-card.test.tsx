import { render, screen } from '@testing-library/react';

import { StatCard } from '../stat-card';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="MPs tracked" value={197} hint="Current & former" />);
    expect(screen.getByText('MPs tracked')).toBeInTheDocument();
    expect(screen.getByText('197')).toBeInTheDocument();
    expect(screen.getByText('Current & former')).toBeInTheDocument();
  });
});
