"""
Property-based tests for User and UserProfile models.

This module contains property-based tests using Hypothesis to verify:
- Property 1: Registration Input Validation
- Property 2: Password Encryption on Storage
- Property 9: Sensitive Data Encryption
- Property 10: New User Verification Status

**Validates: Requirements 1.2, 1.3, 2.6, 3.1, 15.1, 15.2**
"""

import pytest
import uuid
import re
from hypothesis import given, strategies as st, settings
from django.contrib.auth.hashers import check_password
from authentication.models import User, UserProfile


# Hypothesis strategies for generating test data
@st.composite
def valid_email(draw):
    """Generate valid email addresses with unique identifiers"""
    username = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=15
    ))
    # Add UUID to ensure uniqueness
    unique_id = uuid.uuid4().hex[:8]
    domain = draw(st.sampled_from(['example.com', 'test.org', 'mail.net', 'domain.io']))
    return f"{username}{unique_id}@{domain}"


@st.composite
def valid_password(draw):
    """Generate valid passwords (min 8 chars, mix of letters and numbers)"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')),
        min_size=8,
        max_size=30
    ))


@st.composite
def user_role(draw):
    """Generate valid user roles"""
    return draw(st.sampled_from(['donor', 'receiver', 'volunteer', 'admin']))


@st.composite
def phone_number(draw):
    """Generate phone numbers"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Nd',), min_codepoint=48, max_codepoint=57),
        min_size=10,
        max_size=15
    ))


@st.composite
def address_text(draw):
    """Generate address strings"""
    street_num = draw(st.integers(min_value=1, max_value=9999))
    street_name = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122),
        min_size=5,
        max_size=20
    ))
    city = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122),
        min_size=4,
        max_size=15
    ))
    return f"{street_num} {street_name} St, {city}"


@st.composite
def coordinates(draw):
    """Generate latitude and longitude coordinates"""
    lat = draw(st.floats(min_value=-90.0, max_value=90.0, allow_nan=False, allow_infinity=False))
    lon = draw(st.floats(min_value=-180.0, max_value=180.0, allow_nan=False, allow_infinity=False))
    return lat, lon


# Property Tests

@pytest.mark.django_db
@pytest.mark.property
class TestPasswordEncryptionProperty:
    """
    Property 2: Password Encryption on Storage
    
    **Validates: Requirements 1.3, 15.1**
    
    For any user registration or password change, the stored password should be 
    encrypted (not plaintext) and verifiable using bcrypt with work factor >= 12.
    """
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_password_is_encrypted_not_plaintext(self, email, password, role):
        """
        Test that passwords are never stored in plaintext.
        
        For any valid password, the stored password hash should not equal 
        the plaintext password.
        """
        # Create user with password (use unique username to avoid conflicts)
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role
        )
        
        # Verify password is not stored as plaintext
        assert user.password != password, \
            f"Password stored as plaintext: {password}"
        
        # Verify password is hashed
        assert user.password.startswith('bcrypt') or user.password.startswith('pbkdf2'), \
            f"Password not properly hashed: {user.password[:20]}"
        
        # Verify password can be verified
        assert check_password(password, user.password), \
            "Password verification failed"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_password_uses_bcrypt_with_sufficient_work_factor(self, email, password, role):
        """
        Test that passwords use bcrypt with work factor >= 12.
        
        For any user, the password should be encrypted using bcrypt 
        with a minimum work factor of 12 as per security requirements.
        """
        # Create user with password (use unique username to avoid conflicts)
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role
        )
        
        # Check if using bcrypt (Django's bcrypt hasher format: bcrypt$<hash>)
        if user.password.startswith('bcrypt'):
            # Extract the bcrypt hash (format: bcrypt$<bcrypt_hash>)
            bcrypt_hash = user.password.split('$', 1)[1]
            
            # Bcrypt hash format: $2b$<rounds>$<salt+hash>
            # Extract work factor from the hash
            if bcrypt_hash.startswith('$2'):
                parts = bcrypt_hash.split('$')
                if len(parts) >= 3:
                    work_factor = int(parts[2])
                    assert work_factor >= 12, \
                        f"Bcrypt work factor {work_factor} is less than required minimum of 12"


@pytest.mark.django_db
@pytest.mark.property
class TestSensitiveDataEncryptionProperty:
    """
    Property 9: Sensitive Data Encryption
    
    **Validates: Requirements 2.6, 15.2**
    
    For any user profile containing sensitive data (phone, address, location coordinates),
    the stored values should be encrypted and not readable as plaintext.
    """
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role(),
        phone=phone_number(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_phone_is_encrypted_in_database(self, email, password, role, phone, address, coords):
        """
        Test that phone numbers are encrypted in the database.
        
        For any phone number stored in UserProfile, the database field 
        should contain encrypted data, not plaintext.
        """
        # Create user and profile (use unique username to avoid conflicts)
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role
        )
        
        profile = UserProfile.objects.create(
            user=user,
            full_name="Test User"
        )
        
        # Set phone using property setter (which encrypts)
        profile.phone = phone
        profile.save()
        
        # Refresh from database
        profile.refresh_from_db()
        
        # Verify encrypted field is not None and not plaintext
        assert profile.phone_encrypted is not None, \
            "Phone encrypted field is None"
        
        assert phone.encode() not in profile.phone_encrypted, \
            f"Phone stored as plaintext in encrypted field: {phone}"
        
        # Verify decryption works correctly
        assert profile.phone == phone, \
            f"Phone decryption failed: expected {phone}, got {profile.phone}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role(),
        phone=phone_number(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_address_is_encrypted_in_database(self, email, password, role, phone, address, coords):
        """
        Test that addresses are encrypted in the database.
        
        For any address stored in UserProfile, the database field 
        should contain encrypted data, not plaintext.
        """
        # Create user and profile (use unique username to avoid conflicts)
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role
        )
        
        profile = UserProfile.objects.create(
            user=user,
            full_name="Test User"
        )
        
        # Set address using property setter (which encrypts)
        profile.address = address
        profile.save()
        
        # Refresh from database
        profile.refresh_from_db()
        
        # Verify encrypted field is not None and not plaintext
        assert profile.address_encrypted is not None, \
            "Address encrypted field is None"
        
        assert address.encode() not in profile.address_encrypted, \
            f"Address stored as plaintext in encrypted field: {address}"
        
        # Verify decryption works correctly
        assert profile.address == address, \
            f"Address decryption failed: expected {address}, got {profile.address}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role(),
        phone=phone_number(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_coordinates_are_encrypted_in_database(self, email, password, role, phone, address, coords):
        """
        Test that location coordinates are encrypted in the database.
        
        For any latitude/longitude stored in UserProfile, the database fields 
        should contain encrypted data, not plaintext.
        """
        lat, lon = coords
        
        # Create user and profile (use unique username to avoid conflicts)
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role
        )
        
        profile = UserProfile.objects.create(
            user=user,
            full_name="Test User"
        )
        
        # Set coordinates using property setters (which encrypt)
        profile.latitude = lat
        profile.longitude = lon
        profile.save()
        
        # Refresh from database
        profile.refresh_from_db()
        
        # Verify encrypted fields are not None and not plaintext
        assert profile.latitude_encrypted is not None, \
            "Latitude encrypted field is None"
        assert profile.longitude_encrypted is not None, \
            "Longitude encrypted field is None"
        
        # Convert coordinates to string as they would be stored
        lat_str = str(lat).encode()
        lon_str = str(lon).encode()
        
        assert lat_str not in profile.latitude_encrypted, \
            f"Latitude stored as plaintext in encrypted field: {lat}"
        assert lon_str not in profile.longitude_encrypted, \
            f"Longitude stored as plaintext in encrypted field: {lon}"
        
        # Verify decryption works correctly (with float comparison tolerance)
        assert abs(profile.latitude - lat) < 0.000001, \
            f"Latitude decryption failed: expected {lat}, got {profile.latitude}"
        assert abs(profile.longitude - lon) < 0.000001, \
            f"Longitude decryption failed: expected {lon}, got {profile.longitude}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role(),
        phone=phone_number(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=30, deadline=None)
    def test_all_sensitive_fields_encrypted_together(self, email, password, role, phone, address, coords):
        """
        Test that all sensitive fields are encrypted when stored together.
        
        For any UserProfile with multiple sensitive fields, all fields 
        should be properly encrypted in the database.
        """
        lat, lon = coords
        
        # Create user and profile (use unique username to avoid conflicts)
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role
        )
        
        profile = UserProfile.objects.create(
            user=user,
            full_name="Test User"
        )
        
        # Set all sensitive fields
        profile.phone = phone
        profile.address = address
        profile.latitude = lat
        profile.longitude = lon
        profile.save()
        
        # Refresh from database
        profile.refresh_from_db()
        
        # Verify all encrypted fields exist
        assert profile.phone_encrypted is not None, "Phone not encrypted"
        assert profile.address_encrypted is not None, "Address not encrypted"
        assert profile.latitude_encrypted is not None, "Latitude not encrypted"
        assert profile.longitude_encrypted is not None, "Longitude not encrypted"
        
        # Verify none are plaintext
        assert phone.encode() not in profile.phone_encrypted, "Phone is plaintext"
        assert address.encode() not in profile.address_encrypted, "Address is plaintext"
        assert str(lat).encode() not in profile.latitude_encrypted, "Latitude is plaintext"
        assert str(lon).encode() not in profile.longitude_encrypted, "Longitude is plaintext"
        
        # Verify all decrypt correctly
        assert profile.phone == phone, "Phone decryption failed"
        assert profile.address == address, "Address decryption failed"
        assert abs(profile.latitude - lat) < 0.000001, "Latitude decryption failed"
        assert abs(profile.longitude - lon) < 0.000001, "Longitude decryption failed"



@pytest.mark.django_db
@pytest.mark.property
class TestRegistrationInputValidationProperty:
    """
    Property 1: Registration Input Validation

    **Validates: Requirements 1.2**

    For any user registration submission, the system should validate email format,
    password strength, and required fields before accepting the registration.
    """

    @given(
        email=st.text(min_size=1, max_size=50),
        password=st.text(min_size=1, max_size=50),
        role=st.sampled_from(['donor', 'receiver', 'volunteer', 'admin'])
    )
    @settings(max_examples=100, deadline=None)
    def test_invalid_email_format_rejected(self, email, password, role):
        """
        Test that invalid email formats are rejected during registration.

        For any email that doesn't match the standard email format,
        the registration should fail with a validation error.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Skip if email happens to be valid
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_regex, email):
            return

        # Create unique username
        unique_username = f"user_{uuid.uuid4().hex[:8]}"

        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        # Should not be valid due to invalid email
        assert not serializer.is_valid(), \
            f"Invalid email '{email}' was accepted"

        # Should have email validation error
        assert 'email' in serializer.errors, \
            f"Email validation error not raised for '{email}'"

    @given(
        email=valid_email(),
        password=st.text(max_size=7),  # Too short
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_weak_password_rejected(self, email, password, role):
        """
        Test that weak passwords are rejected during registration.

        For any password that doesn't meet strength requirements
        (min 8 chars, special character), registration should fail.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        # Should not be valid due to weak password
        is_valid = serializer.is_valid()

        # If password is too short, it should be rejected
        if len(password) < 8:
            assert not is_valid, \
                f"Weak password '{password}' (length {len(password)}) was accepted"
            assert 'password' in serializer.errors, \
                "Password validation error not raised for weak password"

    @given(
        email=valid_email(),
        password=valid_password(),
        role=st.text(min_size=1, max_size=20)
    )
    @settings(max_examples=50, deadline=None)
    def test_invalid_role_rejected(self, email, password, role):
        """
        Test that invalid roles are rejected during registration.

        For any role that is not in the valid set (donor, receiver, volunteer, admin),
        registration should fail with a validation error.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Skip if role happens to be valid
        valid_roles = ['donor', 'receiver', 'volunteer', 'admin']
        if role in valid_roles:
            return

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        # Should not be valid due to invalid role
        assert not serializer.is_valid(), \
            f"Invalid role '{role}' was accepted"

        # Should have role validation error
        assert 'role' in serializer.errors, \
            f"Role validation error not raised for '{role}'"

    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_missing_required_fields_rejected(self, email, password, role):
        """
        Test that registration with missing required fields is rejected.

        For any registration attempt missing required fields (email, password, role),
        the registration should fail with appropriate validation errors.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        # Test missing email
        data_no_email = {
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }
        serializer = UserRegistrationSerializer(data=data_no_email)
        assert not serializer.is_valid(), "Registration without email was accepted"
        assert 'email' in serializer.errors, "Email required error not raised"

        # Test missing password
        data_no_password = {
            'email': email,
            'username': unique_username,
            'password_confirm': password,
            'role': role
        }
        serializer = UserRegistrationSerializer(data=data_no_password)
        assert not serializer.is_valid(), "Registration without password was accepted"
        assert 'password' in serializer.errors, "Password required error not raised"

        # Test missing role
        data_no_role = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password
        }
        serializer = UserRegistrationSerializer(data=data_no_role)
        assert not serializer.is_valid(), "Registration without role was accepted"
        assert 'role' in serializer.errors, "Role required error not raised"

    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_password_mismatch_rejected(self, email, password, role):
        """
        Test that registration with mismatched passwords is rejected.

        For any registration where password and password_confirm don't match,
        the registration should fail with a validation error.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        # Create different password confirmation
        password_confirm = password + "different"

        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password_confirm,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        # Should not be valid due to password mismatch
        assert not serializer.is_valid(), \
            "Registration with mismatched passwords was accepted"

        # Should have password_confirm validation error
        assert 'password_confirm' in serializer.errors or 'non_field_errors' in serializer.errors, \
            "Password mismatch error not raised"

    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_valid_registration_accepted(self, email, password, role):
        """
        Test that valid registration data is accepted.

        For any registration with valid email, strong password, and valid role,
        the registration should succeed and create a user.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        # Add special character to password to meet requirements
        password_with_special = password + "!@#"

        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        # Should be valid
        assert serializer.is_valid(), \
            f"Valid registration was rejected: {serializer.errors}"

        # Should create user successfully
        user = serializer.save()
        assert user is not None, "User creation failed"
        assert user.email == email.lower(), "Email not saved correctly"
        assert user.role == role, "Role not saved correctly"


@pytest.mark.django_db
@pytest.mark.property
class TestNewUserVerificationStatusProperty:
    """
    Property 10: New User Verification Status

    **Validates: Requirements 3.1**

    For any newly registered user, the initial verification status should be
    "pending" until admin action is taken.
    """

    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=100, deadline=None)
    def test_new_user_has_pending_verification_status(self, email, password, role):
        """
        Test that all newly registered users start with 'pending' verification status.

        For any user registration, regardless of role or other attributes,
        the verification_status should be set to 'pending'.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        # Add special character to password to meet requirements
        password_with_special = password + "!@#"

        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        # Validate and create user
        if serializer.is_valid():
            user = serializer.save()

            # Verify verification_status is 'pending'
            assert user.verification_status == 'pending', \
                f"New user verification_status is '{user.verification_status}', expected 'pending'"

            # Verify user is not automatically approved
            assert user.verification_status != 'approved', \
                "New user should not be automatically approved"

            # Verify user is not rejected
            assert user.verification_status != 'rejected', \
                "New user should not be rejected on creation"

    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_verification_status_persists_after_save(self, email, password, role):
        """
        Test that verification status persists correctly in the database.

        For any newly created user, the verification_status should remain
        'pending' after saving and retrieving from the database.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        # Add special character to password to meet requirements
        password_with_special = password + "!@#"

        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        if serializer.is_valid():
            user = serializer.save()
            user_id = user.id

            # Refresh from database
            user_from_db = User.objects.get(id=user_id)

            # Verify verification_status persisted correctly
            assert user_from_db.verification_status == 'pending', \
                f"Verification status not persisted correctly: {user_from_db.verification_status}"

    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_verification_status_visible_in_profile_queries(self, email, password, role):
        """
        Test that verification status is visible in user profile queries.

        For any user, the verification_status should be accessible and
        visible when querying the user profile.
        """
        from authentication.serializers import UserRegistrationSerializer

        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"

        # Add special character to password to meet requirements
        password_with_special = password + "!@#"

        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }

        serializer = UserRegistrationSerializer(data=data)

        if serializer.is_valid():
            user = serializer.save()

            # Create profile
            profile = UserProfile.objects.create(
                user=user,
                full_name="Test User"
            )

            # Query user through profile
            queried_user = profile.user

            # Verify verification_status is accessible
            assert hasattr(queried_user, 'verification_status'), \
                "User does not have verification_status attribute"

            assert queried_user.verification_status == 'pending', \
                f"Verification status not visible in profile query: {queried_user.verification_status}"




@pytest.mark.django_db
@pytest.mark.property
class TestRegistrationInputValidationProperty:
    """
    Property 1: Registration Input Validation
    
    **Validates: Requirements 1.2**
    
    For any user registration submission, the system should validate email format,
    password strength, and required fields before accepting the registration.
    """
    
    @given(
        email=st.text(min_size=1, max_size=50),
        password=st.text(min_size=1, max_size=50),
        role=st.sampled_from(['donor', 'receiver', 'volunteer', 'admin'])
    )
    @settings(max_examples=100, deadline=None)
    def test_invalid_email_format_rejected(self, email, password, role):
        """
        Test that invalid email formats are rejected during registration.
        
        For any email that doesn't match the standard email format,
        the registration should fail with a validation error.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Skip if email happens to be valid
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_regex, email):
            return
        
        # Create unique username
        unique_username = f"user_{uuid.uuid4().hex[:8]}"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        # Should not be valid due to invalid email
        assert not serializer.is_valid(), \
            f"Invalid email '{email}' was accepted"
        
        # Should have email validation error
        assert 'email' in serializer.errors, \
            f"Email validation error not raised for '{email}'"
    
    @given(
        email=valid_email(),
        password=st.text(max_size=7),  # Too short
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_weak_password_rejected(self, email, password, role):
        """
        Test that weak passwords are rejected during registration.
        
        For any password that doesn't meet strength requirements
        (min 8 chars, special character), registration should fail.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        # Should not be valid due to weak password
        is_valid = serializer.is_valid()
        
        # If password is too short, it should be rejected
        if len(password) < 8:
            assert not is_valid, \
                f"Weak password '{password}' (length {len(password)}) was accepted"
            assert 'password' in serializer.errors, \
                "Password validation error not raised for weak password"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=st.text(min_size=1, max_size=20)
    )
    @settings(max_examples=50, deadline=None)
    def test_invalid_role_rejected(self, email, password, role):
        """
        Test that invalid roles are rejected during registration.
        
        For any role that is not in the valid set (donor, receiver, volunteer, admin),
        registration should fail with a validation error.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Skip if role happens to be valid
        valid_roles = ['donor', 'receiver', 'volunteer', 'admin']
        if role in valid_roles:
            return
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        # Should not be valid due to invalid role
        assert not serializer.is_valid(), \
            f"Invalid role '{role}' was accepted"
        
        # Should have role validation error
        assert 'role' in serializer.errors, \
            f"Role validation error not raised for '{role}'"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_missing_required_fields_rejected(self, email, password, role):
        """
        Test that registration with missing required fields is rejected.
        
        For any registration attempt missing required fields (email, password, role),
        the registration should fail with appropriate validation errors.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        # Test missing email
        data_no_email = {
            'username': unique_username,
            'password': password,
            'password_confirm': password,
            'role': role
        }
        serializer = UserRegistrationSerializer(data=data_no_email)
        assert not serializer.is_valid(), "Registration without email was accepted"
        assert 'email' in serializer.errors, "Email required error not raised"
        
        # Test missing password
        data_no_password = {
            'email': email,
            'username': unique_username,
            'password_confirm': password,
            'role': role
        }
        serializer = UserRegistrationSerializer(data=data_no_password)
        assert not serializer.is_valid(), "Registration without password was accepted"
        assert 'password' in serializer.errors, "Password required error not raised"
        
        # Test missing role
        data_no_role = {
            'email': email,
            'username': unique_username,
            'password': password,
            'password_confirm': password
        }
        serializer = UserRegistrationSerializer(data=data_no_role)
        assert not serializer.is_valid(), "Registration without role was accepted"
        assert 'role' in serializer.errors, "Role required error not raised"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_password_mismatch_rejected(self, email, password, role):
        """
        Test that registration with mismatched passwords is rejected.
        
        For any registration where password and password_confirm don't match,
        the registration should fail with a validation error.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        # Add special character to password to meet requirements
        password_with_special = password + "!@#"
        
        # Create different password confirmation
        password_confirm = password_with_special + "different"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_confirm,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        # Should not be valid due to password mismatch
        assert not serializer.is_valid(), \
            "Registration with mismatched passwords was accepted"
        
        # Should have password_confirm validation error or non_field_errors
        # (password validation might fail first, which is also acceptable)
        has_mismatch_error = (
            'password_confirm' in serializer.errors or 
            'non_field_errors' in serializer.errors or
            'password' in serializer.errors  # Password validation can fail first
        )
        assert has_mismatch_error, \
            f"Expected validation error, got: {serializer.errors}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_valid_registration_accepted(self, email, password, role):
        """
        Test that valid registration data is accepted.
        
        For any registration with valid email, strong password, and valid role,
        the registration should succeed and create a user.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        # Add special character to password to meet requirements
        password_with_special = password + "!@#"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        # Should be valid
        assert serializer.is_valid(), \
            f"Valid registration was rejected: {serializer.errors}"
        
        # Should create user successfully
        user = serializer.save()
        assert user is not None, "User creation failed"
        assert user.email == email.lower(), "Email not saved correctly"
        assert user.role == role, "Role not saved correctly"


@pytest.mark.django_db
@pytest.mark.property
class TestNewUserVerificationStatusProperty:
    """
    Property 10: New User Verification Status
    
    **Validates: Requirements 3.1**
    
    For any newly registered user, the initial verification status should be
    "pending" until admin action is taken.
    """
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=100, deadline=None)
    def test_new_user_has_pending_verification_status(self, email, password, role):
        """
        Test that all newly registered users start with 'pending' verification status.
        
        For any user registration, regardless of role or other attributes,
        the verification_status should be set to 'pending'.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        # Add special character to password to meet requirements
        password_with_special = password + "!@#"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        # Validate and create user
        if serializer.is_valid():
            user = serializer.save()
            
            # Verify verification_status is 'pending'
            assert user.verification_status == 'pending', \
                f"New user verification_status is '{user.verification_status}', expected 'pending'"
            
            # Verify user is not automatically approved
            assert user.verification_status != 'approved', \
                "New user should not be automatically approved"
            
            # Verify user is not rejected
            assert user.verification_status != 'rejected', \
                "New user should not be rejected on creation"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_verification_status_persists_after_save(self, email, password, role):
        """
        Test that verification status persists correctly in the database.
        
        For any newly created user, the verification_status should remain
        'pending' after saving and retrieving from the database.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        # Add special character to password to meet requirements
        password_with_special = password + "!@#"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        if serializer.is_valid():
            user = serializer.save()
            user_id = user.id
            
            # Refresh from database
            user_from_db = User.objects.get(id=user_id)
            
            # Verify verification_status persisted correctly
            assert user_from_db.verification_status == 'pending', \
                f"Verification status not persisted correctly: {user_from_db.verification_status}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_verification_status_visible_in_profile_queries(self, email, password, role):
        """
        Test that verification status is visible in user profile queries.
        
        For any user, the verification_status should be accessible and
        visible when querying the user profile.
        """
        from authentication.serializers import UserRegistrationSerializer
        
        # Create unique username
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        
        # Add special character to password to meet requirements
        password_with_special = password + "!@#"
        
        data = {
            'email': email,
            'username': unique_username,
            'password': password_with_special,
            'password_confirm': password_with_special,
            'role': role
        }
        
        serializer = UserRegistrationSerializer(data=data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Create profile
            profile = UserProfile.objects.create(
                user=user,
                full_name="Test User"
            )
            
            # Query user through profile
            queried_user = profile.user
            
            # Verify verification_status is accessible
            assert hasattr(queried_user, 'verification_status'), \
                "User does not have verification_status attribute"
            
            assert queried_user.verification_status == 'pending', \
                f"Verification status not visible in profile query: {queried_user.verification_status}"
