# Buffet Management and Food Distribution System

A full-stack web application that connects food donors with receivers through volunteer coordination, reducing food waste while addressing hunger.

## Technology Stack

### Backend
- Django 5.2+
- Django REST Framework
- Django Channels (WebSocket)
- djangorestframework-simplejwt (JWT Authentication)
- SQLite3 (Development) / MySQL (Production)

### Frontend
- React.js 19+
- Vite
- Axios (API calls)

### Testing
- Backend: pytest, pytest-django, Hypothesis
- Frontend: Vitest, React Testing Library, fast-check

## Project Structure

```
.
├── buffet_system/          # Django project settings
├── authentication/         # User authentication app
├── food_listings/          # Food listing management app
├── matching/               # Request and matching app
├── volunteers/             # Volunteer coordination app
├── tracking/               # Delivery tracking app
├── admin_dashboard/        # Admin dashboard app
├── safety_analytics/       # Food safety and analytics app
├── frontend/               # React frontend application
├── venv/                   # Python virtual environment
├── .env                    # Environment variables (not in git)
├── .env.example            # Example environment variables
├── pytest.ini              # Pytest configuration
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Setup Instructions

### Backend Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create superuser:
```bash
python manage.py createsuperuser
```

6. Run development server:
```bash
python manage.py runserver
```

Backend will be available at: http://localhost:8000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

## Testing

### Backend Tests

Run all tests:
```bash
pytest
```

Run specific test file:
```bash
pytest authentication/tests/test_registration.py
```

Run with coverage:
```bash
pytest --cov
```

### Frontend Tests

Run all tests:
```bash
cd frontend
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Development Workflow

1. Backend API development in Django apps
2. Frontend component development in React
3. Write property-based tests for correctness
4. Integration testing across frontend and backend
5. Manual testing with real data

## API Documentation

API endpoints will be available at:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## Environment Variables

See `.env.example` for required environment variables:
- `SECRET_KEY`: Django secret key
- `DEBUG`: Debug mode (True/False)
- `DATABASE_URL`: Database connection string
- `EMAIL_*`: Email configuration for notifications
- `FRONTEND_URL`: Frontend application URL

## Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Submit pull request

## License

[Add your license here]
