import { render, screen } from '@testing-library/react';
import Summary from './Summary';

const baseData = {
  summary: {
    total_miles: 1200,
    total_drive_hours: 21.8,
    total_trip_hours: 40.5,
    num_days: 2,
    cycle_hours_start: 8,
    cycle_hours_end: 30,
  },
  stops: [{ kind: 'fuel', time: '2026-01-05T15:00:00', miles: 1000, location: 'Amarillo, TX' }],
  route: { approximate: false },
};

describe('Summary', () => {
  it('renders the headline trip stats', () => {
    render(<Summary data={baseData} />);
    expect(screen.getByText('Total distance')).toBeInTheDocument();
    expect(screen.getByText('1,200 mi')).toBeInTheDocument();
    expect(screen.getByText('21.8 h')).toBeInTheDocument();
  });

  it('lists planned stops with their location', () => {
    render(<Summary data={baseData} />);
    expect(screen.getByText('Planned stops & rests')).toBeInTheDocument();
    expect(screen.getByText('Amarillo, TX')).toBeInTheDocument();
  });

  it('shows the approximate-route warning only when flagged', () => {
    const { rerender } = render(<Summary data={baseData} />);
    expect(screen.queryByText(/approximate straight-line route/i)).not.toBeInTheDocument();

    rerender(<Summary data={{ ...baseData, route: { ...baseData.route, approximate: true } }} />);
    expect(screen.getByText(/approximate straight-line route/i)).toBeInTheDocument();
  });
});
