# Implementation Plan: Buffet Management and Food Distribution System

## Overview

This implementation plan breaks down the Buffet Management and Food Distribution System into incremental, testable tasks. The system connects food donors with receivers through volunteer coordination, built with Django REST Framework backend and React.js frontend.

The implementation follows a bottom-up approach: database models → backend APIs → frontend components → integration → testing. Each task builds on previous work, ensuring no orphaned code.

## Technology Stack

- **Backend**: Django 4.2+, Django REST Framework, Django Channels (WebSocket)
- **Frontend**: React.js 18+, React Router, Axios
- **Database**: SQLite3 (development), MySQL (production)
- **Authentication**: JWT tokens via djangorestframework-simplejwt
- **Testing**: pytest, Hypothesis (backend), Jest, fast-check (frontend)
- **Mapping**: Google Maps API or OpenStreetMap
- **Notifications**: Django email backend, in-app notifications

## Tasks


- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize Django project and React app
    - Create Django project with `django-admin startproject buffet_system`
    - Create Django apps: `authentication`, `food_listings`, `matching`, `volunteers`, `tracking`, `admin_dashboard`, `safety_analytics`
    - Initialize React app with `create-react-app` or Vite
    - Set up project directory structure following Django and React best practices
    - _Requirements: 20.1, 20.2_
  
  - [x] 1.2 Configure development environment
    - Install and configure Django REST Framework
    - Install djangorestframework-simplejwt for JWT authentication
    - Install Django Channels for WebSocket support
    - Configure CORS settings for React-Django communication
    - Set up SQLite3 database for development
    - Create `.env` file for environment variables (SECRET_KEY, DATABASE_URL, etc.)
    - _Requirements: 15.3_
  
  - [x] 1.3 Set up testing frameworks
    - Install pytest, pytest-django, Hypothesis for backend testing
    - Install Jest, React Testing Library, fast-check for frontend testing
    - Create test configuration files (pytest.ini, jest.config.js)
    - Set up test database configuration
    - Create test fixtures directory structure
    - _Requirements: Testing Strategy_
  
  - [ ]* 1.4 Configure CI/CD pipeline
    - Create GitHub Actions or GitLab CI configuration
    - Set up linting (flake8, eslint)
    - Configure automated test execution
    - Set up coverage reporting
    - _Requirements: 20.3_


- [x] 2. Database Models and Migrations
  - [x] 2.1 Create User and UserProfile models
    - Implement custom User model extending AbstractUser with role field and verification_status
    - Implement UserProfile model with encrypted fields (phone, address, coordinates)
    - Add role-specific JSON fields (dietary_preferences, food_types, available_time_slots)
    - Create model methods for encryption/decryption of sensitive data
    - Add average_rating and total_ratings fields
    - _Requirements: 1.1, 1.6, 2.1, 2.2, 2.3, 2.4, 2.6, 15.2_
  
  - [x] 2.2 Write property tests for User model
    - **Property 2: Password Encryption on Storage** - Verify passwords are bcrypt encrypted with work factor >= 12
    - **Property 9: Sensitive Data Encryption** - Verify phone, address, coordinates are encrypted
    - **Validates: Requirements 1.3, 2.6, 15.1, 15.2**
  
  - [x] 2.3 Create FoodListing model
    - Implement FoodListing model with all required fields (food_type, quantity, preparation_time, expiry_time, etc.)
    - Add dietary attribute fields (is_vegetarian, is_vegan, is_gluten_free, allergen_info)
    - Add status field with choices (available, reserved, completed, expired, cancelled)
    - Add freshness_score calculated field
    - Add images JSON field for image URLs
    - Create database indexes on expiry_time, status, donor_id
    - _Requirements: 4.1, 4.3, 4.5, 4.6_
  
  - [x] 2.4 Write property tests for FoodListing model
    - **Property 14: Food Listing Creation with Required Fields** - Verify all required fields are present
    - **Property 15: Future Expiry Time Validation** - Verify expiry time must be in future
    - **Property 16: Freshness Score Calculation** - Verify score consistency and calculation logic
    - **Property 17: Image Upload Limit Enforcement** - Verify max 5 images allowed
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
  
  - [x] 2.5 Create FoodRequest and Match models
    - Implement FoodRequest model with listing_id, receiver_id, requested_quantity, status
    - Add unique constraint on (listing_id, receiver_id) for active requests
    - Implement Match model linking FoodRequest to approved matches
    - Add status tracking fields (matched, in_progress, completed, cancelled)
    - Create indexes on listing_id, receiver_id, status
    - _Requirements: 7.1, 7.5, 8.2, 8.3_
  
  - [x] 2.6 Write property tests for FoodRequest model
    - **Property 27: Food Request Creation** - Verify request creation with required fields
    - **Property 28: Request Quantity Validation** - Verify requested quantity <= available quantity
    - **Property 30: Duplicate Request Prevention** - Verify unique constraint enforcement
    - **Validates: Requirements 7.1, 7.2, 7.5**
  
  - [x] 2.7 Create PickupCoordination and DeliveryTracking models
    - Implement PickupCoordination model with match_id, volunteer_id, locations, status
    - Add escalation_count field for tracking volunteer assignment attempts
    - Implement DeliveryTracking model with real-time location fields
    - Add status field with valid transitions (en_route_to_donor, at_donor, en_route_to_receiver, delivered)
    - Create indexes for efficient querying
    - _Requirements: 9.3, 9.5, 10.1, 10.2, 10.3_
  
  - [x] 2.8 Create Notification and Rating models
    - Implement Notification model with user_id, notification_type, message, is_read
    - Implement NotificationPreference model for user notification settings
    - Implement Rating model with match_id, rater_id, rated_user_id, rating_value (1-5)
    - Add indexes on user_id and is_read for notifications
    - _Requirements: 12.3, 12.4, 12.5, 17.1, 17.2_
  
  - [x] 2.9 Create SuccessStory, SearchPreference, and AuditLog models
    - Implement SuccessStory model with match_id, donor/receiver names, testimonial, photos
    - Implement SearchPreference model with user_id and filters JSON field
    - Implement AuditLog model for security logging with timestamp, action_type, IP address
    - Add is_public field to SuccessStory for privacy control
    - _Requirements: 13.1, 13.2, 13.3, 15.6, 18.1_
  
  - [x] 2.10 Generate and apply database migrations
    - Run `python manage.py makemigrations` for all models
    - Review generated migration files for correctness
    - Apply migrations with `python manage.py migrate`
    - Verify all tables, indexes, and constraints are created
    - Create initial data fixtures for testing (sample users, listings)
    - _Requirements: All database-related requirements_


- [x] 3. User Authentication Module (Backend)
  - [x] 3.1 Implement user registration API
    - Create registration serializer with validation for email format, password strength, required fields
    - Implement registration view handling POST /api/auth/register
    - Add password encryption using bcrypt with work factor 12
    - Set initial verification_status to 'pending'
    - Return appropriate error responses for validation failures
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  
  - [x] 3.2 Write property tests for registration
    - **Property 1: Registration Input Validation** - Test with random valid/invalid emails and passwords
    - **Property 2: Password Encryption on Storage** - Verify bcrypt encryption on all registrations
    - **Property 10: New User Verification Status** - Verify all new users start as 'pending'
    - **Validates: Requirements 1.2, 1.3, 3.1**
  
  - [x] 3.3 Implement login and JWT authentication
    - Create login serializer accepting email and password
    - Implement login view handling POST /api/auth/login
    - Generate JWT access and refresh tokens on successful authentication
    - Set token expiry to 24 hours
    - Return 401 error for invalid credentials
    - _Requirements: 1.4, 1.5, 1.7_
  
  - [x] 3.4 Write property tests for authentication
    - **Property 3: Valid Credential Authentication** - Test login with valid credentials
    - **Property 4: Invalid Credential Rejection** - Test login with invalid credentials
    - **Property 6: Session Expiration** - Test token expiry after 24 hours
    - **Validates: Requirements 1.4, 1.5, 1.7**
  
  - [x] 3.5 Implement role-based access control (RBAC)
    - Create custom permission classes for each role (IsDonor, IsReceiver, IsVolunteer, IsAdmin)
    - Implement permission checking in view decorators
    - Add role validation to protected endpoints
    - Return 403 Forbidden for unauthorized access attempts
    - _Requirements: 1.6_
  
  - [ ]* 3.6 Write property tests for RBAC
    - **Property 5: Role-Based Access Control** - Test access control for all role combinations
    - **Validates: Requirements 1.6**
  
  - [x] 3.7 Implement logout and token refresh
    - Create logout endpoint handling POST /api/auth/logout
    - Implement token blacklisting for logout
    - Create refresh token endpoint handling POST /api/auth/refresh-token
    - Verify session validity endpoint GET /api/auth/verify-session
    - _Requirements: 1.7_
  
  - [x] 3.8 Implement user profile management API
    - Create UserProfile serializer with role-specific fields
    - Implement profile creation on user registration
    - Create endpoints: GET/PUT /api/profile
    - Add encryption for sensitive fields (phone, address, coordinates)
    - Validate and save profile updates within 2 seconds
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 3.9 Write property tests for profile management
    - **Property 7: Profile Update Persistence** - Test profile updates are saved and retrievable
    - **Property 8: Role-Specific Profile Fields** - Test role-specific field storage
    - **Property 9: Sensitive Data Encryption** - Verify encryption of sensitive fields
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**
  
  - [x] 3.10 Implement audit logging for authentication
    - Create audit log entries for all login attempts (success and failure)
    - Log IP address, user agent, timestamp for each attempt
    - Implement rate limiting (5 attempts per 15 minutes per IP)
    - Log all administrative actions with full details
    - _Requirements: 15.6_
  
  - [ ]* 3.11 Write property tests for audit logging
    - **Property 67: Authentication Audit Logging** - Verify all auth attempts are logged
    - **Validates: Requirements 15.6**


- [x] 4. Admin Dashboard Module (Backend)
  - [x] 4.1 Implement user verification API
    - Create endpoint GET /api/admin/pending-verifications listing pending users
    - Create endpoint PUT /api/admin/users/{id}/verify for approval
    - Create endpoint PUT /api/admin/users/{id}/reject for rejection
    - Update user verification_status and is_active fields
    - Send email notifications on approval/rejection
    - Restrict access to admin role only
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 4.2 Write property tests for user verification
    - **Property 11: Admin User Approval Workflow** - Test approval activates account and sends notification
    - **Property 12: Admin User Rejection Workflow** - Test rejection deactivates account and sends notification
    - **Property 13: Verification Status Visibility** - Test status is visible in profile queries
    - **Validates: Requirements 3.3, 3.4, 3.5**
  
  - [x] 4.3 Implement admin dashboard metrics API
    - Create endpoint GET /api/admin/metrics returning user counts by role
    - Calculate total food listings, matches, completed deliveries
    - Calculate average response times (matching, volunteer assignment, delivery)
    - Display pending verifications, flagged content, system alerts
    - Cache metrics for 5 minutes to reduce database load
    - _Requirements: 14.1, 14.2, 14.4, 14.6_
  
  - [ ]* 4.4 Write property tests for admin metrics
    - **Property 59: Admin User Count Metrics** - Verify accurate user counts by role
    - **Property 60: Admin System Metrics** - Verify accurate listing/match/delivery counts
    - **Property 64: Response Time Metrics** - Verify response time calculations
    - **Validates: Requirements 14.1, 14.2, 14.6**
  
  - [x] 4.5 Implement admin reporting API
    - Create endpoint GET /api/admin/reports with filters (date range, role, location)
    - Implement filtering logic for all report types
    - Create endpoint POST /api/admin/reports/export for CSV/PDF export
    - Generate reports with all required data fields
    - Implement pagination for large reports (20 items per page)
    - _Requirements: 14.3, 14.5, 20.5_
  
  - [x] 4.6 Write property tests for admin reporting
    - **Property 61: Admin Report Filtering** - Test filtering by date range, role, location
    - **Property 63: Report Export** - Test CSV and PDF export with data integrity
    - **Validates: Requirements 14.3, 14.5**


- [-] 5. Food Listing Module (Backend)
  - [ ] 5.1 Implement food listing creation API
    - Create FoodListing serializer with all required fields
    - Implement POST /api/food-listings endpoint
    - Validate expiry_time is in the future
    - Calculate freshness_score based on preparation_time and expiry_time
    - Handle image uploads (max 5 images)
    - Publish listing within 5 seconds
    - Restrict to donor role only
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 5.2 Write property tests for listing creation
    - **Property 14: Food Listing Creation with Required Fields** - Test with random valid listing data
    - **Property 15: Future Expiry Time Validation** - Test rejection of past expiry times
    - **Property 16: Freshness Score Calculation** - Test score consistency and logic
    - **Property 17: Image Upload Limit Enforcement** - Test max 5 images constraint
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
  
  - [ ] 5.2 Implement food listing browsing and search API
    - Create GET /api/food-listings endpoint returning active listings
    - Implement filtering by food_type, dietary attributes, location distance, expiry_time
    - Implement sorting by freshness_score, distance, quantity, expiry_time
    - Calculate distance from receiver location to pickup location
    - Return listing details with images, quantity, expiry countdown, freshness_score
    - Implement pagination (20 items per page)
    - Restrict to receiver role
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 20.5_
  
  - [ ]* 5.3 Write property tests for listing browsing
    - **Property 18: Active Listing Visibility** - Test only active listings are returned
    - **Property 19: Food Listing Filtering** - Test filtering by all criteria
    - **Property 20: Food Listing Sorting** - Test sorting by all sort options
    - **Property 21: Distance Calculation** - Test distance calculation accuracy
    - **Property 22: Listing Detail Completeness** - Test all required fields are present
    - **Property 82: Pagination Implementation** - Test pagination with >20 results
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 20.5**
  
  - [ ] 5.4 Implement food listing comparison API
    - Create POST /api/food-listings/compare endpoint
    - Accept up to 4 listing IDs for comparison
    - Return comparison view with all required fields for each listing
    - Highlight differences between listings
    - Reject requests with more than 4 listings
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 5.5 Write property tests for listing comparison
    - **Property 23: Comparison Selection Limit** - Test max 4 listings constraint
    - **Property 24: Comparison View Data Completeness** - Test all required fields present
    - **Property 25: Comparison Difference Highlighting** - Test difference detection
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [ ] 5.6 Implement listing update and cancellation API
    - Create PUT /api/food-listings/{id} endpoint for updates
    - Allow edits only before match creation
    - Create DELETE /api/food-listings/{id} endpoint for cancellation
    - Require cancellation reason
    - Notify all receivers with pending requests on cancellation
    - _Requirements: 19.1, 19.2, 19.3_
  
  - [ ]* 5.7 Write property tests for listing modifications
    - **Property 75: Pre-Match Listing Edit Permission** - Test edit allowed before match
    - **Property 76: Listing Cancellation** - Test cancellation with reason
    - **Property 77: Cancellation Notification to Requesters** - Test notifications sent
    - **Validates: Requirements 19.1, 19.2, 19.3**
  
  - [ ] 5.8 Implement search preference persistence
    - Create GET/PUT /api/search-preferences endpoint
    - Save filter preferences to SearchPreference model
    - Auto-apply saved filters on browse page load
    - Allow clearing filters to reset to default
    - Save up to 5 recent search queries
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [ ]* 5.9 Write property tests for search preferences
    - **Property 72: Filter Preference Persistence Round-Trip** - Test save and auto-apply
    - **Property 73: Filter Reset** - Test clearing filters
    - **Property 74: Recent Search Query Limit** - Test max 5 queries with FIFO
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4**


- [ ] 6. Request and Matching Module (Backend)
  - [ ] 6.1 Implement food request submission API
    - Create FoodRequest serializer with validation
    - Implement POST /api/food-requests endpoint
    - Validate requested_quantity <= available_quantity
    - Prevent duplicate requests (unique constraint on listing_id, receiver_id)
    - Send notification to donor within 30 seconds
    - Allow special instructions field
    - Restrict to receiver role
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 6.2 Write property tests for food requests
    - **Property 27: Food Request Creation** - Test request creation with required fields
    - **Property 28: Request Quantity Validation** - Test quantity validation
    - **Property 29: Food Request Notification** - Test donor notification sent
    - **Property 30: Duplicate Request Prevention** - Test duplicate rejection
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**
  
  - [ ] 6.3 Implement request approval and matching API
    - Create PUT /api/food-requests/{id}/approve endpoint
    - Create Match record on approval
    - Update FoodListing status to 'reserved' or reduce available_quantity
    - Notify receiver within 30 seconds
    - Initiate volunteer assignment process
    - Restrict to donor role (only for their listings)
    - _Requirements: 8.1, 8.2, 8.3, 8.5_
  
  - [ ]* 6.4 Write property tests for matching
    - **Property 31: Donor Request Visibility** - Test donors see their pending requests
    - **Property 32: Match Creation and Notification** - Test match creation and notifications
    - **Property 33: Listing Quantity Update on Match** - Test quantity/status update
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [ ] 6.5 Implement request rejection API
    - Create PUT /api/food-requests/{id}/reject endpoint
    - Update request status to 'rejected'
    - Send notification to receiver with optional reason
    - Restrict to donor role
    - _Requirements: 8.4_
  
  - [ ]* 6.6 Write property tests for request rejection
    - **Property 34: Request Rejection Notification** - Test rejection notification with reason
    - **Validates: Requirements 8.4**
  
  - [ ] 6.7 Implement request cancellation API
    - Create DELETE /api/food-requests/{id} endpoint
    - Allow cancellation only for pending requests
    - For matched requests, require mutual agreement from donor and receiver
    - Notify assigned volunteer if cancellation occurs after assignment
    - _Requirements: 19.4, 19.5, 19.6_
  
  - [ ]* 6.8 Write property tests for request cancellation
    - **Property 78: Pre-Approval Request Cancellation** - Test pending request cancellation
    - **Property 79: Mutual Cancellation Agreement** - Test mutual agreement requirement
    - **Property 80: Volunteer Cancellation Notification** - Test volunteer notification
    - **Validates: Requirements 19.4, 19.5, 19.6**
  
  - [ ] 6.9 Implement match listing API
    - Create GET /api/matches endpoint
    - Return matches filtered by user role (donor, receiver, volunteer)
    - Include match status and related entities
    - Implement pagination
    - _Requirements: 8.1, 8.2_


- [ ] 7. Volunteer Coordination Module (Backend)
  - [ ] 7.1 Implement volunteer notification and assignment API
    - Create background task to notify available volunteers on match creation
    - Filter volunteers by location proximity to pickup area
    - Create GET /api/volunteer/available-matches endpoint
    - Display match details (donor location, receiver location, quantity, pickup time)
    - Implement escalation timer (15 minutes) for unassigned matches
    - _Requirements: 9.1, 9.2, 9.5_
  
  - [ ]* 7.2 Write property tests for volunteer notification
    - **Property 35: Location-Based Volunteer Notification** - Test location filtering
    - **Property 36: Match Detail Completeness** - Test all required details present
    - **Property 39: Volunteer Assignment Escalation** - Test escalation after 15 minutes
    - **Validates: Requirements 9.1, 9.2, 9.5**
  
  - [ ] 7.3 Implement volunteer assignment acceptance API
    - Create POST /api/volunteer/assignments/{id}/accept endpoint
    - Create PickupCoordination record on acceptance
    - Ensure only one volunteer can accept (use database transaction)
    - Notify donor and receiver on assignment
    - Return 409 Conflict if already assigned
    - Restrict to volunteer role
    - _Requirements: 9.3, 9.4_
  
  - [ ]* 7.4 Write property tests for volunteer assignment
    - **Property 37: Volunteer Assignment Creation** - Test coordination record creation and notifications
    - **Property 38: Single Volunteer Assignment** - Test only one volunteer can accept
    - **Validates: Requirements 9.3, 9.4**
  
  - [ ] 7.5 Implement volunteer assignment listing API
    - Create GET /api/volunteer/assignments endpoint
    - Return assignments for authenticated volunteer
    - Filter by status (pending, accepted, completed)
    - Include all coordination details
    - _Requirements: 9.2, 9.3_


- [ ] 8. Tracking and Status Module (Backend)
  - [ ] 8.1 Implement delivery tracking initialization API
    - Create POST /api/tracking/{coordination_id}/start endpoint
    - Create DeliveryTracking record with initial status "en_route_to_donor"
    - Record start timestamp
    - Restrict to assigned volunteer only
    - _Requirements: 10.1_
  
  - [ ]* 8.2 Write property tests for tracking initialization
    - **Property 40: Delivery Tracking Initialization** - Test tracking creation with correct initial status
    - **Validates: Requirements 10.1**
  
  - [ ] 8.3 Implement real-time location update API
    - Create PUT /api/tracking/{coordination_id}/location endpoint
    - Accept latitude and longitude coordinates
    - Update current_latitude and current_longitude fields
    - Update last_updated timestamp
    - Calculate and return ETA based on current location and destination
    - Restrict to assigned volunteer only
    - _Requirements: 10.2, 10.5_
  
  - [ ]* 8.4 Write property tests for location updates
    - **Property 41: Location Update Recording** - Test location updates are recorded
    - **Property 43: ETA Calculation** - Test ETA calculation with various locations
    - **Validates: Requirements 10.2, 10.5**
  
  - [ ] 8.5 Implement delivery status update API
    - Create PUT /api/tracking/{coordination_id}/status endpoint
    - Validate status transitions (en_route_to_donor → at_donor → en_route_to_receiver → delivered)
    - Update status and timestamps
    - Mark match as completed when status is 'delivered'
    - Trigger delivery confirmation prompt for receiver
    - Restrict to assigned volunteer only
    - _Requirements: 10.3, 10.4, 12.1_
  
  - [ ]* 8.6 Write property tests for status updates
    - **Property 42: Delivery Status Transitions** - Test valid status sequence enforcement
    - **Property 50: Delivery Confirmation Prompt** - Test confirmation prompt creation
    - **Validates: Requirements 10.3, 10.4, 12.1**
  
  - [ ] 8.7 Implement tracking visibility API
    - Create GET /api/tracking/{coordination_id} endpoint
    - Return real-time tracking data (location, status, ETA)
    - Allow access to donor, receiver, and assigned volunteer
    - Update location every 30 seconds via polling or WebSocket
    - _Requirements: 10.2, 10.6_
  
  - [ ]* 8.8 Write property tests for tracking visibility
    - **Property 44: Tracking Visibility** - Test donor and receiver can view tracking
    - **Validates: Requirements 10.6**
  
  - [ ] 8.9 Set up WebSocket for real-time updates (optional)
    - Configure Django Channels for WebSocket support
    - Create WebSocket consumer for tracking updates
    - Broadcast location updates to connected clients
    - Handle connection/disconnection gracefully
    - _Requirements: 10.2_


- [ ] 9. Food Safety and Analytics Module (Backend)
  - [ ] 9.1 Implement food safety alert system
    - Create background task (Celery or Django-Q) to check expiry times every 10 minutes
    - Send alert to donor when listing has 2 hours until expiry
    - Send alerts to donor, receiver, and volunteer when matched food has 1 hour until expiry
    - Automatically mark listings as 'expired' when expiry_time is reached
    - Remove expired listings from active listings
    - Send reminder notifications if food not picked up within 30 minutes of scheduled time
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  
  - [ ]* 9.2 Write property tests for safety alerts
    - **Property 45: Two-Hour Expiry Alert** - Test alert sent at 2-hour threshold
    - **Property 46: One-Hour Match Expiry Alert** - Test alerts sent to all parties at 1-hour threshold
    - **Property 47: Automatic Listing Expiration** - Test automatic expiration at expiry_time
    - **Property 49: Pickup Delay Reminder** - Test reminder sent after 30-minute delay
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.5**
  
  - [ ] 9.3 Implement expiry countdown display
    - Add computed field or method to calculate time remaining until expiry
    - Include countdown in all listing API responses
    - Format as human-readable (e.g., "2 hours 15 minutes")
    - _Requirements: 11.4_
  
  - [ ]* 9.4 Write property tests for expiry countdown
    - **Property 48: Expiry Countdown Display** - Test countdown calculation accuracy
    - **Validates: Requirements 11.4**
  
  - [ ] 9.5 Implement success story creation API
    - Create background task to auto-create SuccessStory on match completion
    - Include donor name, receiver name, food quantity, food type, completion date
    - Create POST /api/success-stories endpoint for testimonial submission
    - Allow receivers to add testimonials and photos
    - Set is_public flag based on user consent
    - _Requirements: 13.1, 13.2_
  
  - [ ]* 9.6 Write property tests for success stories
    - **Property 54: Success Story Creation** - Test auto-creation on match completion
    - **Property 55: Testimonial Submission** - Test testimonial and photo addition
    - **Validates: Requirements 13.1, 13.2**
  
  - [ ] 9.7 Implement success story display API
    - Create GET /api/success-stories endpoint for public dashboard
    - Filter to only show stories with is_public=true
    - Include anonymized or consented user information
    - Implement pagination
    - _Requirements: 13.3_
  
  - [ ]* 9.8 Write property tests for success story visibility
    - **Property 56: Public Success Story Visibility** - Test only public stories are shown
    - **Validates: Requirements 13.3**
  
  - [ ] 9.9 Implement impact metrics API
    - Create GET /api/analytics/impact endpoint
    - Calculate total meals saved (sum of completed match quantities)
    - Calculate total food weight donated (if unit is kg)
    - Calculate total users served (unique receivers in completed matches)
    - Cache metrics for 10 minutes
    - _Requirements: 13.4_
  
  - [ ]* 9.10 Write property tests for impact metrics
    - **Property 57: Impact Metrics Calculation** - Test accurate calculation of all metrics
    - **Validates: Requirements 13.4**
  
  - [ ] 9.11 Implement social media sharing API
    - Create GET /api/success-stories/{id}/share endpoint
    - Generate shareable links with Open Graph meta tags
    - Support sharing to Facebook, Twitter, LinkedIn
    - Include story image and description
    - _Requirements: 13.5_
  
  - [ ]* 9.12 Write property tests for social sharing
    - **Property 58: Success Story Sharing** - Test shareable link generation
    - **Validates: Requirements 13.5**


- [ ] 10. Notification System (Backend)
  - [ ] 10.1 Implement notification service
    - Create NotificationService class for sending notifications
    - Implement email notification using Django email backend
    - Implement in-app notification by creating Notification records
    - Support notification types: food_request, match_created, volunteer_assignment, safety_alert, delivery_update
    - Check user NotificationPreference before sending
    - _Requirements: 17.1, 17.2_
  
  - [ ]* 10.2 Write property tests for notifications
    - **Property 68: Notification Delivery Channels** - Test both email and in-app delivery
    - **Property 69: Notification Preference Management** - Test preference enforcement
    - **Validates: Requirements 17.1, 17.2**
  
  - [ ] 10.3 Implement notification preference API
    - Create GET/PUT /api/notification-preferences endpoint
    - Allow users to configure preferences for each notification type
    - Set default preferences (all enabled) on user registration
    - _Requirements: 17.2_
  
  - [ ] 10.4 Implement notification listing API
    - Create GET /api/notifications endpoint
    - Return notifications for authenticated user
    - Filter by is_read status
    - Mark notifications as read with PUT /api/notifications/{id}/read
    - Implement pagination
    - _Requirements: 17.6_
  
  - [ ]* 10.5 Write property tests for notification listing
    - **Property 71: Unread Notification Count** - Test accurate unread count calculation
    - **Validates: Requirements 17.6**
  
  - [ ] 10.6 Implement location-based listing notifications
    - When donor creates listing, query receivers within preferred distance
    - Send notifications to matching receivers
    - Include listing details in notification
    - _Requirements: 17.3_
  
  - [ ]* 10.7 Write property tests for location-based notifications
    - **Property 70: New Listing Notification to Nearby Receivers** - Test location-based filtering
    - **Validates: Requirements 17.3**


- [ ] 11. Rating and Feedback System (Backend)
  - [ ] 11.1 Implement rating submission API
    - Create POST /api/ratings endpoint
    - Accept match_id, rated_user_id, rating_type, rating_value (1-5), optional comment
    - Validate rating_value is between 1 and 5
    - Allow receivers to rate food_quality and volunteer_service
    - Allow donors to rate receiver and volunteer cooperation
    - Allow volunteers to rate donor and receiver cooperation
    - Prevent duplicate ratings for same match and rating type
    - _Requirements: 12.3, 12.4, 12.5_
  
  - [ ]* 11.2 Write property tests for ratings
    - **Property 52: Rating System** - Test all rating types and role permissions
    - **Validates: Requirements 12.3, 12.4, 12.5**
  
  - [ ] 11.3 Implement rating aggregation
    - Create background task to update user average_rating on new rating
    - Calculate average from all ratings for the user
    - Update total_ratings count
    - Display ratings on user profiles
    - _Requirements: 12.6_
  
  - [ ]* 11.4 Write property tests for rating aggregation
    - **Property 53: Average Rating Calculation** - Test accurate average calculation
    - **Validates: Requirements 12.6**
  
  - [ ] 11.5 Implement delivery confirmation API
    - Create POST /api/matches/{id}/confirm-delivery endpoint
    - Mark match as completed
    - Update completion timestamp
    - Trigger rating prompts for all parties
    - Restrict to receiver role
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 11.6 Write property tests for delivery confirmation
    - **Property 51: Match Completion on Confirmation** - Test match marked as completed
    - **Validates: Requirements 12.2**


- [ ] 12. Security and Performance (Backend)
  - [ ] 12.1 Implement security measures
    - Configure HTTPS/TLS for all endpoints
    - Implement CORS settings for React frontend
    - Add input sanitization for all user inputs
    - Implement output encoding to prevent XSS
    - Verify all database queries use Django ORM (parameterized queries)
    - Add CSRF protection for state-changing operations
    - _Requirements: 15.3, 15.4, 15.5_
  
  - [ ]* 12.2 Write property tests for security
    - **Property 65: SQL Injection Prevention** - Test parameterized queries with malicious inputs
    - **Property 66: XSS Prevention** - Test input sanitization and output encoding
    - **Validates: Requirements 15.4, 15.5**
  
  - [ ] 12.3 Implement caching strategy
    - Configure Redis for caching (optional, can use Django cache framework)
    - Cache user profiles for 10 minutes
    - Cache active listings for 2 minutes
    - Cache admin metrics for 5 minutes
    - Cache impact metrics for 10 minutes
    - Invalidate cache on data updates
    - _Requirements: 20.4_
  
  - [ ]* 12.4 Write property tests for caching
    - **Property 81: Data Caching** - Test cache hit/miss behavior
    - **Validates: Requirements 20.4**
  
  - [ ] 12.5 Optimize database queries
    - Add select_related and prefetch_related for foreign key queries
    - Verify all indexes are created (from migrations)
    - Add database query logging in development
    - Optimize N+1 query problems
    - _Requirements: 20.1, 20.2, 20.3_
  
  - [ ] 12.6 Implement API response time optimization
    - Ensure form submissions respond within 2 seconds
    - Ensure listing browse page loads within 3 seconds
    - Add database connection pooling
    - Implement async tasks for non-critical operations (emails, notifications)
    - _Requirements: 20.1, 20.2_


- [ ] 13. Checkpoint - Backend API Complete
  - Ensure all backend tests pass (unit and property tests)
  - Verify all API endpoints are documented (OpenAPI/Swagger)
  - Test API endpoints manually using Postman or similar tool
  - Verify database migrations are applied correctly
  - Check security measures are in place
  - Ask the user if questions arise or if they want to proceed to frontend development


- [ ] 14. Frontend Setup and Core Components (React)
  - [ ] 14.1 Set up React project structure
    - Create directory structure: components/, pages/, services/, utils/, hooks/, context/
    - Install dependencies: react-router-dom, axios, react-query, formik, yup
    - Configure Axios base URL and interceptors for JWT tokens
    - Set up React Router with routes for all pages
    - Create AuthContext for managing authentication state
    - _Requirements: 16.1, 16.2_
  
  - [ ] 14.2 Create authentication components
    - Create RegistrationForm component with role selection
    - Create LoginForm component
    - Implement form validation using Formik and Yup
    - Create AuthService for API calls (register, login, logout)
    - Store JWT tokens in localStorage
    - Implement automatic token refresh
    - Create ProtectedRoute component for role-based access
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_
  
  - [ ] 14.3 Create layout and navigation components
    - Create Header component with navigation menu
    - Create responsive navigation (hamburger menu for mobile)
    - Create Footer component
    - Create Sidebar component for role-specific navigation
    - Implement responsive design for screen widths 320px-1920px
    - Display unread notification count in header
    - _Requirements: 16.1, 16.3, 17.6_
  
  - [ ] 14.4 Create user profile components
    - Create ProfileForm component with role-specific fields
    - Create ProfileView component displaying user information
    - Implement profile update functionality
    - Display average rating and total ratings
    - Add location picker for address input (Google Maps or OpenStreetMap)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 12.6_
  
  - [ ] 14.5 Create notification components
    - Create NotificationList component displaying in-app notifications
    - Create NotificationBadge component showing unread count
    - Create NotificationPreferences component for settings
    - Implement mark as read functionality
    - Add real-time notification updates (polling or WebSocket)
    - _Requirements: 17.1, 17.2, 17.6_


- [ ] 15. Food Listing Pages (React - Donor)
  - [ ] 15.1 Create food listing creation page
    - Create FoodListingForm component with all required fields
    - Implement image upload with preview (max 5 images)
    - Add dietary attribute checkboxes (vegetarian, vegan, gluten-free)
    - Implement date/time pickers for preparation and expiry times
    - Validate expiry time is in the future
    - Display calculated freshness score
    - Show success message and redirect on successful creation
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_
  
  - [ ] 15.2 Create donor dashboard page
    - Display list of donor's active food listings
    - Show listing status (available, reserved, completed)
    - Display pending food requests for each listing
    - Add approve/reject buttons for requests
    - Show expiry countdown for each listing
    - Add edit and cancel buttons for listings
    - _Requirements: 4.1, 5.5, 8.1, 11.4_
  
  - [ ] 15.3 Create food request management interface
    - Display pending requests with receiver information
    - Show request details (quantity, pickup time preference, special instructions)
    - Implement approve request functionality
    - Implement reject request functionality with reason input
    - Show confirmation dialogs for actions
    - Update UI in real-time after approval/rejection
    - _Requirements: 8.1, 8.2, 8.4_


- [ ] 16. Food Browsing and Request Pages (React - Receiver)
  - [ ] 16.1 Create food listing browse page
    - Display grid/list of active food listings with images
    - Implement filter controls (food type, dietary attributes, distance, expiry)
    - Implement sort controls (freshness score, distance, quantity, expiry)
    - Display listing cards with key information (quantity, expiry countdown, freshness score, distance)
    - Implement pagination (20 items per page)
    - Auto-apply saved search preferences on page load
    - Add "Compare" checkbox on each listing card
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 18.1, 18.2, 20.5_
  
  - [ ] 16.2 Create food listing detail page
    - Display full listing details with image gallery
    - Show donor information (name, rating, location)
    - Display expiry countdown prominently
    - Show freshness score with visual indicator
    - Display dietary attributes and allergen information
    - Add "Request Food" button
    - Show distance from receiver location
    - _Requirements: 5.5, 11.4_
  
  - [ ] 16.3 Create food listing comparison page
    - Display up to 4 listings side-by-side
    - Show all comparison fields (food type, quantity, expiry, distance, dietary attributes, freshness score)
    - Highlight differences between listings
    - Add "Request" button for each listing
    - Enforce max 4 listings limit
    - Make responsive for mobile (stack vertically)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 16.4 Create food request submission interface
    - Create FoodRequestForm component
    - Input fields: requested quantity, pickup time preference, special instructions
    - Validate requested quantity <= available quantity
    - Show confirmation message on successful submission
    - Prevent duplicate requests for same listing
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  
  - [ ] 16.5 Create receiver dashboard page
    - Display list of receiver's food requests with status
    - Show matched food with delivery tracking link
    - Display completed deliveries with rating prompts
    - Add cancel button for pending requests
    - Show real-time status updates
    - _Requirements: 7.1, 8.2, 10.4, 12.1_


- [ ] 17. Volunteer Pages (React)
  - [ ] 17.1 Create volunteer dashboard page
    - Display available matches for assignment
    - Show match details (donor location, receiver location, food quantity, pickup time)
    - Add "Accept Assignment" button for each match
    - Display accepted assignments with status
    - Show active deliveries with tracking link
    - Display completed deliveries with rating prompts
    - _Requirements: 9.2, 9.3_
  
  - [ ] 17.2 Create delivery tracking interface for volunteers
    - Display current assignment details
    - Show map with donor and receiver locations
    - Add status update buttons (Start Pickup, Collected from Donor, Start Delivery, Delivered)
    - Implement location sharing (request geolocation permission)
    - Send location updates every 30 seconds
    - Display ETA to destination
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_


- [ ] 18. Delivery Tracking Pages (React - Donor & Receiver)
  - [ ] 18.1 Create real-time tracking page
    - Display map showing volunteer's current location
    - Show route from donor to receiver
    - Display delivery status (en route to donor, at donor, en route to receiver)
    - Show ETA to destination
    - Update location every 30 seconds (polling or WebSocket)
    - Display volunteer information (name, rating, contact)
    - Make accessible to both donor and receiver
    - _Requirements: 10.2, 10.3, 10.5, 10.6_
  
  - [ ] 18.2 Create delivery confirmation interface
    - Display confirmation prompt when delivery status is "delivered"
    - Add "Confirm Delivery" button for receiver
    - Show delivery details (time, quantity, volunteer)
    - Redirect to rating page after confirmation
    - _Requirements: 12.1, 12.2_


- [ ] 19. Rating and Feedback Pages (React)
  - [ ] 19.1 Create rating submission interface
    - Create RatingForm component with star rating input (1-5)
    - Add optional comment text area
    - Display rating prompts based on user role:
      - Receivers: rate food quality and volunteer service
      - Donors: rate receiver cooperation and volunteer service
      - Volunteers: rate donor and receiver cooperation
    - Show confirmation message on submission
    - Prevent duplicate ratings for same match
    - _Requirements: 12.3, 12.4, 12.5_
  
  - [ ] 19.2 Display ratings on user profiles
    - Show average rating with star visualization
    - Display total number of ratings
    - Show recent ratings with comments (if public)
    - _Requirements: 12.6_


- [ ] 20. Admin Dashboard Pages (React)
  - [ ] 20.1 Create admin dashboard overview page
    - Display user count metrics by role (donors, receivers, volunteers)
    - Show system metrics (total listings, matches, completed deliveries)
    - Display average response times (matching, volunteer assignment, delivery)
    - Show pending user verifications count
    - Display system alerts and flagged content
    - Add quick action buttons for common tasks
    - _Requirements: 14.1, 14.2, 14.4, 14.6_
  
  - [ ] 20.2 Create user verification page
    - Display list of pending user verifications
    - Show user details (email, role, registration date, profile info)
    - Add approve and reject buttons for each user
    - Implement reject reason input dialog
    - Update list in real-time after actions
    - Show verification history
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ] 20.3 Create admin reporting page
    - Implement filter controls (date range, user role, location)
    - Display report data in table format
    - Add export buttons (CSV, PDF)
    - Implement pagination for large reports
    - Show report generation timestamp
    - Add data visualization charts (optional)
    - _Requirements: 14.3, 14.5_


- [ ] 21. Success Stories and Impact Pages (React)
  - [ ] 21.1 Create success stories public dashboard
    - Display grid of success stories with images
    - Show story details (donor, receiver, food quantity, date)
    - Display testimonials
    - Add social media share buttons
    - Filter to only show public stories
    - Implement pagination
    - _Requirements: 13.3, 13.5_
  
  - [ ] 21.2 Create success story submission interface
    - Create form for receivers to add testimonials
    - Implement photo upload for success stories
    - Add consent checkbox for making story public
    - Show preview before submission
    - _Requirements: 13.2_
  
  - [ ] 21.3 Create impact metrics page
    - Display total meals saved with visual counter
    - Show total food weight donated
    - Display total users served
    - Add data visualizations (charts, graphs)
    - Show impact over time (daily, weekly, monthly)
    - Make shareable on social media
    - _Requirements: 13.4_


- [ ] 22. Mobile Responsiveness and Accessibility (React)
  - [ ] 22.1 Implement responsive design
    - Test all pages on screen widths 320px-1920px
    - Implement mobile-first CSS with media queries
    - Use responsive grid layouts (CSS Grid or Flexbox)
    - Optimize images for mobile (lazy loading, responsive images)
    - Implement touch-optimized controls (larger buttons, swipe gestures)
    - Test on actual mobile devices (iOS and Android)
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ] 22.2 Implement accessibility features
    - Add ARIA labels to all interactive elements
    - Ensure keyboard navigation works for all features
    - Add alt text to all images
    - Ensure sufficient color contrast (WCAG AA)
    - Test with screen readers
    - Add focus indicators for keyboard navigation
    - _Requirements: Accessibility compliance_


- [ ] 23. Checkpoint - Frontend Complete
  - Ensure all frontend components render correctly
  - Test all user flows manually (donor, receiver, volunteer, admin)
  - Verify responsive design on multiple devices
  - Test accessibility with keyboard navigation and screen readers
  - Verify all API integrations work correctly
  - Check for console errors and warnings
  - Ask the user if questions arise or if they want to proceed to integration testing


- [ ] 24. Integration Testing and End-to-End Flows
  - [ ] 24.1 Test donor flow end-to-end
    - Register as donor → Verify account → Create listing → Receive request → Approve request → Track delivery → Rate receiver and volunteer
    - Verify all notifications are sent correctly
    - Verify data persistence across steps
    - Test error scenarios (invalid data, network failures)
    - _Requirements: All donor-related requirements_
  
  - [ ]* 24.2 Write integration tests for donor flow
    - Create automated test covering complete donor workflow
    - Test with various data inputs
    - Verify database state at each step
  
  - [ ] 24.3 Test receiver flow end-to-end
    - Register as receiver → Verify account → Browse listings → Compare listings → Request food → Track delivery → Confirm delivery → Rate donor and volunteer → Submit testimonial
    - Verify search preferences are saved and applied
    - Test filter and sort functionality
    - Test error scenarios
    - _Requirements: All receiver-related requirements_
  
  - [ ]* 24.4 Write integration tests for receiver flow
    - Create automated test covering complete receiver workflow
    - Test with various search and filter combinations
    - Verify notifications and tracking work correctly
  
  - [ ] 24.5 Test volunteer flow end-to-end
    - Register as volunteer → Verify account → View available matches → Accept assignment → Start tracking → Update location → Update status → Complete delivery → Rate donor and receiver
    - Verify location updates are recorded
    - Test escalation when no volunteer accepts
    - Test error scenarios
    - _Requirements: All volunteer-related requirements_
  
  - [ ]* 24.6 Write integration tests for volunteer flow
    - Create automated test covering complete volunteer workflow
    - Test location tracking and status updates
    - Verify notifications to all parties
  
  - [ ] 24.7 Test admin flow end-to-end
    - Login as admin → View dashboard → Verify pending users → Generate reports → Export data
    - Test all metrics calculations
    - Verify report filtering and export
    - Test error scenarios
    - _Requirements: All admin-related requirements_
  
  - [ ]* 24.8 Write integration tests for admin flow
    - Create automated test covering admin workflows
    - Test report generation with various filters
    - Verify export functionality


- [ ] 25. Security Testing and Hardening
  - [ ] 25.1 Conduct security testing
    - Test SQL injection attempts on all input fields
    - Test XSS attacks with malicious scripts in inputs
    - Test CSRF protection on state-changing operations
    - Test authentication bypass attempts
    - Test authorization escalation attempts (accessing other roles' resources)
    - Test session hijacking scenarios
    - Verify rate limiting on login attempts
    - _Requirements: 15.1, 15.3, 15.4, 15.5, 15.6_
  
  - [ ]* 25.2 Run automated security scans
    - Run OWASP ZAP vulnerability scan
    - Run Bandit security linter on Python code
    - Run npm audit on frontend dependencies
    - Fix all critical and high-severity vulnerabilities
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ] 25.3 Verify encryption implementation
    - Verify passwords are bcrypt encrypted with work factor >= 12
    - Verify sensitive profile data is encrypted at rest
    - Verify HTTPS is enforced for all communications
    - Test that encrypted data cannot be read as plaintext
    - _Requirements: 15.1, 15.2, 15.3_


- [ ] 26. Performance Testing and Optimization
  - [ ] 26.1 Conduct performance testing
    - Test form submission response times (target: < 2 seconds)
    - Test listing browse page load time (target: < 3 seconds)
    - Run load test with 1000 concurrent users using Locust
    - Identify and fix performance bottlenecks
    - Test with large datasets (>10,000 listings)
    - _Requirements: 20.1, 20.2, 20.3, 20.5_
  
  - [ ]* 26.2 Optimize database queries
    - Use Django Debug Toolbar to identify slow queries
    - Add missing indexes if needed
    - Optimize N+1 query problems with select_related/prefetch_related
    - Test query performance with large datasets
    - _Requirements: 20.1, 20.2, 20.3_
  
  - [ ] 26.3 Implement and verify caching
    - Verify Redis caching is working (or Django cache framework)
    - Test cache hit rates for frequently accessed data
    - Verify cache invalidation on data updates
    - Measure performance improvement from caching
    - _Requirements: 20.4_
  
  - [ ] 26.4 Optimize frontend performance
    - Implement code splitting for React components
    - Optimize image loading (lazy loading, compression)
    - Minimize bundle size (tree shaking, minification)
    - Test page load times on slow networks (3G simulation)
    - Implement service worker for offline support (optional)
    - _Requirements: 16.4, 20.1, 20.2_


- [ ] 27. Deployment Preparation
  - [ ] 27.1 Configure production database
    - Set up MySQL database for production
    - Create database user with appropriate permissions
    - Update Django settings for production database
    - Run migrations on production database
    - Create database backup strategy
    - _Requirements: Technology Stack_
  
  - [ ] 27.2 Configure production environment
    - Set up environment variables for production (SECRET_KEY, DATABASE_URL, etc.)
    - Configure HTTPS/TLS certificates
    - Set up static file serving (WhiteNoise or CDN)
    - Configure media file storage (local or S3)
    - Set DEBUG=False in Django settings
    - Configure ALLOWED_HOSTS
    - _Requirements: 15.3, 20.1_
  
  - [ ] 27.3 Set up background task processing
    - Configure Celery or Django-Q for async tasks
    - Set up Redis as message broker
    - Configure periodic tasks (expiry checks, escalation timers)
    - Test background task execution
    - Set up task monitoring
    - _Requirements: 9.1, 9.5, 11.1, 11.2_
  
  - [ ] 27.4 Configure email service
    - Set up SMTP server or email service (SendGrid, Mailgun, AWS SES)
    - Configure Django email backend
    - Test email sending in production
    - Set up email templates
    - Configure email rate limiting
    - _Requirements: 3.3, 3.4, 17.1_
  
  - [ ] 27.5 Set up monitoring and logging
    - Configure application logging (file or cloud service)
    - Set up error tracking (Sentry or similar)
    - Configure uptime monitoring
    - Set up performance monitoring (APM)
    - Configure log rotation and retention
    - Set up alerts for critical errors
    - _Requirements: Testing Strategy - Monitoring_
  
  - [ ] 27.6 Create deployment documentation
    - Document deployment process step-by-step
    - Document environment variables and configuration
    - Document database setup and migrations
    - Document backup and recovery procedures
    - Document monitoring and troubleshooting
    - Create runbook for common issues
    - _Requirements: All requirements_
  
  - [ ] 27.7 Build and deploy application
    - Build React frontend for production (npm run build)
    - Collect Django static files (python manage.py collectstatic)
    - Create Docker images (optional)
    - Deploy to hosting platform (AWS, Heroku, DigitalOcean, etc.)
    - Run database migrations on production
    - Verify deployment is successful
    - Test all critical flows in production
    - _Requirements: All requirements_


- [ ] 28. Final Checkpoint - System Complete
  - Verify all 20 requirements are implemented and tested
  - Verify all 82 correctness properties have corresponding property tests
  - Run complete test suite (unit, property, integration tests)
  - Verify test coverage meets minimum thresholds (85% overall, 95% critical paths)
  - Test all user flows in production environment
  - Verify security measures are in place and tested
  - Verify performance meets requirements (response times, concurrent users)
  - Verify mobile responsiveness on actual devices
  - Review and address any remaining issues
  - Ask the user if they are satisfied with the implementation or if any changes are needed

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate complete user workflows
- Checkpoints ensure incremental validation and user feedback
- The implementation follows a bottom-up approach: models → APIs → UI → integration
- All code should be production-ready with proper error handling and security measures
- The system is designed to scale to 1000+ concurrent users with proper caching and optimization

## Implementation Guidelines

1. Follow Django and React best practices throughout
2. Write clean, maintainable, well-documented code
3. Implement comprehensive error handling at all layers
4. Use transactions for multi-step database operations
5. Validate all inputs on both frontend and backend
6. Write tests alongside implementation (TDD approach recommended)
7. Use meaningful variable and function names
8. Keep components small and focused (single responsibility)
9. Implement proper logging for debugging and monitoring
10. Consider edge cases and error scenarios in all implementations
