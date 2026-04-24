import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileView from '../ProfileView';

describe('ProfileView', () => {
  it('should display message when no profile data', () => {
    render(<ProfileView profile={null} />);
    expect(screen.getByText('No profile data available')).toBeInTheDocument();
  });

  it('should display basic profile information', () => {
    const profile = {
      email: 'test@example.com',
      role: 'donor',
      full_name: 'Test User',
      phone: '1234567890',
      address: '123 Test St',
      verification_status: 'approved',
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('Donor')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('should display rating information when ratings exist', () => {
    const profile = {
      email: 'test@example.com',
      role: 'donor',
      full_name: 'Test User',
      verification_status: 'approved',
      average_rating: 4.5,
      total_ratings: 10,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.getByText(/4.5/)).toBeInTheDocument();
    expect(screen.getByText(/10 ratings/)).toBeInTheDocument();
  });

  it('should not display rating section when no ratings', () => {
    const profile = {
      email: 'test@example.com',
      role: 'donor',
      full_name: 'Test User',
      verification_status: 'approved',
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.queryByText('Ratings')).not.toBeInTheDocument();
  });

  it('should display receiver-specific fields', () => {
    const profile = {
      email: 'receiver@example.com',
      role: 'receiver',
      full_name: 'Receiver User',
      verification_status: 'approved',
      dietary_preferences: ['Vegetarian', 'Gluten-free'],
      allergies: ['Peanuts', 'Dairy'],
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.getByText('Dietary Information')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Gluten-free')).toBeInTheDocument();
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
  });

  it('should display donor-specific fields', () => {
    const profile = {
      email: 'donor@example.com',
      role: 'donor',
      full_name: 'Donor User',
      verification_status: 'approved',
      organization_name: 'Test Restaurant',
      food_types: ['Indian', 'Chinese'],
      operating_hours: { monday: '9:00-17:00' },
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.getByText('Organization Information')).toBeInTheDocument();
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Indian')).toBeInTheDocument();
    expect(screen.getByText('Chinese')).toBeInTheDocument();
  });

  it('should display volunteer-specific fields', () => {
    const profile = {
      email: 'volunteer@example.com',
      role: 'volunteer',
      full_name: 'Volunteer User',
      verification_status: 'approved',
      available_time_slots: ['Weekday Mornings', 'Weekend Afternoons'],
      transportation_capacity: 50,
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.getByText('Volunteer Information')).toBeInTheDocument();
    expect(screen.getByText('Weekday Mornings')).toBeInTheDocument();
    expect(screen.getByText('Weekend Afternoons')).toBeInTheDocument();
    expect(screen.getByText('50 servings')).toBeInTheDocument();
  });

  it('should display "Not provided" for missing optional fields', () => {
    const profile = {
      email: 'test@example.com',
      role: 'donor',
      full_name: '',
      verification_status: 'pending',
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.getByText('Not provided')).toBeInTheDocument();
  });

  it('should display correct verification status colors', () => {
    const approvedProfile = {
      email: 'test@example.com',
      role: 'donor',
      full_name: 'Test User',
      verification_status: 'approved',
      average_rating: 0,
      total_ratings: 0,
    };

    const { rerender } = render(<ProfileView profile={approvedProfile} />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    const pendingProfile = { ...approvedProfile, verification_status: 'pending' };
    rerender(<ProfileView profile={pendingProfile} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();

    const rejectedProfile = { ...approvedProfile, verification_status: 'rejected' };
    rerender(<ProfileView profile={rejectedProfile} />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should not display phone and address if not provided', () => {
    const profile = {
      email: 'test@example.com',
      role: 'donor',
      full_name: 'Test User',
      verification_status: 'approved',
      average_rating: 0,
      total_ratings: 0,
    };

    render(<ProfileView profile={profile} />);

    expect(screen.queryByText('Phone')).not.toBeInTheDocument();
    expect(screen.queryByText('Address')).not.toBeInTheDocument();
  });
});
