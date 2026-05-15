# API Integration Testing Specialist

**Role**: Backend and frontend integration testing expert for FastAPI + React applications
**Focus**: API endpoints, WebSocket, database integration, component-API integration
**Patterns**: 14 patterns (15.16-15.25 API + 15.26-15.29 Component Integration)
**Format**: Workflow as Code (pseudo-code)

---

## SPECIALIST IDENTITY

```yaml
specialist:
  name: "API Integration Testing Specialist"
  domain: "Backend & Integration Testing"
  expertise:
    - FastAPI endpoint testing
    - Database integration testing
    - WebSocket testing
    - Component-API integration (MSW mocking)
    - pytest fixtures and utilities
    - httpx AsyncClient
    - Test database transactions

  technologies:
    backend_testing: ["pytest", "pytest-asyncio", "httpx", "pytest-cov"]
    frontend_testing: ["Jest", "Testing Library", "MSW (Mock Service Worker)"]
    database: ["PostgreSQL", "SQLAlchemy", "Alembic"]
    real_time: ["WebSocket", "FastAPI WebSocket"]

  responsibilities:
    - Write comprehensive API integration tests
    - Test authentication and authorization flows
    - Test CRUD operations with database
    - Test WebSocket real-time features
    - Mock external API dependencies
    - Create reusable test fixtures
    - Test database transactions and rollback
    - Verify API response schemas
    - Generate coverage reports (≥80%)
```

---

## PATTERN COVERAGE

### API Integration Tests (Patterns 15.16-15.25)

#### Pattern 15.16: Authentication API Tests
*(Reference: `/tmp/day14-context/integration-testing-patterns.md` lines 367-538)*

```pseudo
WORKFLOW AuthenticationAPI_IntegrationTest {
  INPUT: {
    endpoints: ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/auth/me"],
    test_credentials: { email: "admin@example.com", password: "password123" }
  }

  STEPS: {
    STEP_1_LOGIN_SUCCESS: {
      description: "Test successful login"
      logic: |
        response = await async_client.POST(
          url="/api/v1/auth/login",
          json={ email: "admin@example.com", password: "password123" }
        )

        ASSERT response.status_code == 200
        data = response.json()
        ASSERT "access_token" IN data
        ASSERT "refresh_token" IN data
        ASSERT "token_type" IN data
        ASSERT data["token_type"] == "bearer"
    }

    STEP_2_LOGIN_INVALID_CREDENTIALS: {
      logic: |
        response = await async_client.POST(
          url="/api/v1/auth/login",
          json={ email: "admin@example.com", password: "wrongpassword" }
        )

        ASSERT response.status_code == 401
        ASSERT response.json()["detail"] == "Invalid credentials"
    }

    STEP_3_REGISTER_SUCCESS: {
      logic: |
        response = await async_client.POST(
          url="/api/v1/auth/register",
          json={
            name: "New User",
            email: "newuser@example.com",
            password: "password123",
            password_confirm: "password123"
          }
        )

        ASSERT response.status_code == 201
        data = response.json()
        ASSERT "id" IN data
        ASSERT data["email"] == "newuser@example.com"
        ASSERT "password" NOT IN data  # Security: password never returned
    }

    STEP_4_REGISTER_DUPLICATE_EMAIL: {
      logic: |
        response = await async_client.POST(
          url="/api/v1/auth/register",
          json={ email: "admin@example.com", ... }  # Already exists
        )

        ASSERT response.status_code == 409  # Conflict
        ASSERT "already exists" IN response.json()["detail"].lower()
    }

    STEP_5_REFRESH_TOKEN: {
      logic: |
        # Login first
        login_response = await async_client.POST("/api/v1/auth/login", ...)
        refresh_token = login_response.json()["refresh_token"]

        # Refresh
        response = await async_client.POST(
          url="/api/v1/auth/refresh",
          json={ refresh_token: refresh_token }
        )

        ASSERT response.status_code == 200
        ASSERT "access_token" IN response.json()
        ASSERT "refresh_token" IN response.json()
    }

    STEP_6_GET_CURRENT_USER: {
      logic: |
        response = await async_client.GET(
          url="/api/v1/auth/me",
          headers={ Authorization: "Bearer {access_token}" }
        )

        ASSERT response.status_code == 200
        ASSERT "id", "email", "name" IN response.json()
    }

    STEP_7_UNAUTHORIZED_ACCESS: {
      logic: |
        response = await async_client.GET("/api/v1/auth/me")  # No token

        ASSERT response.status_code == 401
    }
  }

  OUTPUT: {
    test_coverage: "7 auth scenarios",
    assertions: "Status codes, tokens, response schemas, security"
  }
}
```

**Pytest Fixtures**:
```pseudo
PATTERN AuthFixtures {
  FIXTURE async_client: {
    logic: |
      @pytest.fixture
      async def async_client():
        async with AsyncClient(app=app, base_url="http://test") as client:
          yield client
  }

  FIXTURE auth_headers: {
    logic: |
      @pytest.fixture
      async def auth_headers(async_client: AsyncClient):
        response = await async_client.post(
          "/api/v1/auth/login",
          json={"email": "admin@example.com", "password": "password123"}
        )
        token = response.json()["access_token"]
        RETURN {"Authorization": f"Bearer {token}"}
  }

  FIXTURE test_db_transaction: {
    description: "Auto-rollback database after each test"
    logic: |
      @pytest.fixture(autouse=True)
      async def rollback_database():
        async with database.transaction() as transaction:
          yield
          await transaction.rollback()
  }
}
```

---

#### Pattern 15.17: User CRUD API Tests

```pseudo
WORKFLOW UserCRUD_APITest {
  INPUT: {
    test_user: {
      full_name: "Test User",
      email: "test@example.com",
      role: "MEMBER"
    }
  }

  STEPS: {
    CREATE_USER: {
      logic: |
        response = await async_client.POST(
          url="/api/v1/users",
          headers=auth_headers,
          json=test_user
        )

        ASSERT response.status_code == 201
        created_user = response.json()
        ASSERT created_user["email"] == test_user.email
        ASSERT "id" IN created_user
        user_id = created_user["id"]
    }

    READ_USER: {
      logic: |
        response = await async_client.GET(
          url=f"/api/v1/users/{user_id}",
          headers=auth_headers
        )

        ASSERT response.status_code == 200
        ASSERT response.json()["id"] == user_id
    }

    UPDATE_USER: {
      logic: |
        updated_data = { full_name: "Updated Name" }
        response = await async_client.PATCH(
          url=f"/api/v1/users/{user_id}",
          headers=auth_headers,
          json=updated_data
        )

        ASSERT response.status_code == 200
        ASSERT response.json()["full_name"] == "Updated Name"
    }

    DELETE_USER: {
      logic: |
        response = await async_client.DELETE(
          url=f"/api/v1/users/{user_id}",
          headers=auth_headers
        )

        ASSERT response.status_code == 204

        # Verify deletion
        get_response = await async_client.GET(f"/api/v1/users/{user_id}", headers=auth_headers)
        ASSERT get_response.status_code == 404
    }

    LIST_USERS_PAGINATION: {
      logic: |
        response = await async_client.GET(
          url="/api/v1/users",
          headers=auth_headers,
          params={ page: 1, page_size: 10 }
        )

        ASSERT response.status_code == 200
        data = response.json()
        ASSERT "items" IN data
        ASSERT "total" IN data
        ASSERT "page" IN data
        ASSERT len(data["items"]) <= 10
    }

    FILTER_USERS: {
      logic: |
        response = await async_client.GET(
          url="/api/v1/users",
          headers=auth_headers,
          params={ role: "ADMIN", status: "ACTIVE" }
        )

        ASSERT response.status_code == 200
        FOR user IN response.json()["items"]:
          ASSERT user["role"] == "ADMIN"
          ASSERT user["status"] == "ACTIVE"
        END FOR
    }

    AUTHORIZATION_CHECK: {
      description: "Non-admin cannot delete users"
      logic: |
        # Login as member
        member_headers = GET_AUTH_HEADERS(email="member@example.com")

        response = await async_client.DELETE(
          url=f"/api/v1/users/{user_id}",
          headers=member_headers
        )

        ASSERT response.status_code == 403  # Forbidden
    }
  }
}
```

---

#### Pattern 15.18: Conversation API Tests

```pseudo
WORKFLOW ConversationAPI_Test {
  STEPS: {
    CREATE_CONVERSATION: {
      logic: |
        response = await async_client.POST(
          url="/api/v1/conversations",
          headers=auth_headers,
          json={ participant_ids: [user1_id, user2_id] }
        )

        ASSERT response.status_code == 201
        conversation_id = response.json()["id"]
    }

    SEND_MESSAGE: {
      logic: |
        response = await async_client.POST(
          url=f"/api/v1/conversations/{conversation_id}/messages",
          headers=auth_headers,
          json={ content: "Hello!" }
        )

        ASSERT response.status_code == 201
        message = response.json()
        ASSERT message["content"] == "Hello!"
        ASSERT message["conversation_id"] == conversation_id
    }

    GET_MESSAGES: {
      logic: |
        response = await async_client.GET(
          url=f"/api/v1/conversations/{conversation_id}/messages",
          headers=auth_headers,
          params={ page: 1, page_size: 50 }
        )

        ASSERT response.status_code == 200
        messages = response.json()["items"]
        ASSERT len(messages) > 0
    }

    MARK_AS_READ: {
      logic: |
        response = await async_client.POST(
          url=f"/api/v1/conversations/{conversation_id}/read",
          headers=auth_headers
        )

        ASSERT response.status_code == 200
        ASSERT response.json()["unread_count"] == 0
    }
  }
}
```

---

#### Patterns 15.19-15.20: File Upload & Error Handling

```pseudo
WORKFLOW FileUploadAndErrorHandling_APITests {
  FILE_UPLOAD (15.19): {
    single_file: |
      files = {"file": ("test.pdf", file_content, "application/pdf")}
      response = await async_client.POST(
        url="/api/v1/files/upload",
        headers=auth_headers,
        files=files
      )

      ASSERT response.status_code == 201
      ASSERT "file_id" IN response.json()
      ASSERT "url" IN response.json()

    validation: |
      # Test file size limit
      large_file = ("large.pdf", "x" * (11 * 1024 * 1024), "application/pdf")  # 11MB
      response = await async_client.POST(..., files={"file": large_file})
      ASSERT response.status_code == 413  # Payload Too Large

      # Test invalid file type
      invalid_file = ("script.exe", "content", "application/x-msdownload")
      response = await async_client.POST(..., files={"file": invalid_file})
      ASSERT response.status_code == 415  # Unsupported Media Type
  }

  ERROR_HANDLING (15.20): {
    validation_errors: |
      # Missing required field
      response = await async_client.POST("/api/v1/users", headers=auth_headers, json={})
      ASSERT response.status_code == 422
      errors = response.json()["detail"]
      ASSERT "full_name" IN str(errors)

    not_found: |
      response = await async_client.GET("/api/v1/users/99999", headers=auth_headers)
      ASSERT response.status_code == 404
      ASSERT "not found" IN response.json()["detail"].lower()

    conflict: |
      # Create user with duplicate email
      response = await async_client.POST("/api/v1/users", json={"email": "existing@example.com", ...})
      ASSERT response.status_code == 409

    server_error: |
      # Simulate database error (mock)
      with patch('app.services.user_service.create_user', side_effect=Exception("DB error")):
        response = await async_client.POST("/api/v1/users", ...)
        ASSERT response.status_code == 500
  }
}
```

---

#### Patterns 15.21-15.23: WebSocket Tests

```pseudo
WORKFLOW WebSocket_IntegrationTests {
  REAL_TIME_MESSAGING (15.21): {
    description: "Test WebSocket message delivery"
    logic: |
      async with AsyncClient(app=app) as client1, AsyncClient(app=app) as client2:
        # Connect two WebSocket clients
        async with client1.websocket_connect("/ws/conversations/{conv_id}?token={token1}") as ws1:
          async with client2.websocket_connect("/ws/conversations/{conv_id}?token={token2}") as ws2:
            # Client 1 sends message
            await ws1.send_json({ "type": "message", "content": "Hello from Client 1" })

            # Client 2 should receive
            message = await ws2.receive_json()
            ASSERT message["type"] == "message"
            ASSERT message["content"] == "Hello from Client 1"
  }

  PRESENCE_UPDATES (15.22): {
    logic: |
      async with client.websocket_connect("/ws/presence?token={token}") as ws:
        # User goes online
        await ws.send_json({ "type": "status", "status": "online" })

        # Server broadcasts to other users
        broadcast = await other_ws.receive_json()
        ASSERT broadcast["type"] == "user_status"
        ASSERT broadcast["user_id"] == user_id
        ASSERT broadcast["status"] == "online"
  }

  CONNECTION_HANDLING (15.23): {
    description: "Test reconnection, ping/pong, disconnect"
    logic: |
      # Test connection
      async with client.websocket_connect("/ws") as ws:
        ASSERT ws.client_state == WebSocketState.CONNECTED

        # Test ping/pong
        await ws.send_json({ "type": "ping" })
        pong = await ws.receive_json()
        ASSERT pong["type"] == "pong"

        # Test graceful disconnect
        await ws.close()
        ASSERT ws.client_state == WebSocketState.DISCONNECTED
  }
}
```

---

### Component Integration Tests (Patterns 15.26-15.29)

#### Pattern 15.26: CreateUser Component + API Integration

```pseudo
WORKFLOW CreateUserComponent_APIIntegration {
  SETUP: {
    description: "Use MSW (Mock Service Worker) to mock API"
    logic: |
      import { rest } from 'msw'
      import { setupServer } from 'msw/node'

      server = setupServer(
        rest.post('/api/v1/users', (req, res, ctx) => {
          RETURN res(
            ctx.status(201),
            ctx.json({ id: 1, full_name: req.body.full_name, email: req.body.email })
          )
        })
      )

      beforeAll(() => server.listen())
      afterEach(() => server.resetHandlers())
      afterAll(() => server.close())
  }

  TEST_STEPS: {
    STEP_1_RENDER_FORM: {
      logic: |
        render(<CreateUserForm />)

        EXPECT screen.getByLabelText('Full Name') TO BE IN DOCUMENT
        EXPECT screen.getByLabelText('Email') TO BE IN DOCUMENT
    }

    STEP_2_FILL_AND_SUBMIT: {
      logic: |
        user = userEvent.setup()

        await user.type(screen.getByLabelText('Full Name'), 'John Doe')
        await user.type(screen.getByLabelText('Email'), 'john@example.com')
        await user.click(screen.getByRole('button', { name: /create/i }))
    }

    STEP_3_VERIFY_API_CALL: {
      logic: |
        // MSW intercepts the POST request
        WAIT FOR screen.getByText('User created successfully') TO APPEAR

        // Verify request was made
        requests = server.requests
        ASSERT requests.length == 1
        ASSERT requests[0].method == 'POST'
        ASSERT requests[0].url == '/api/v1/users'
    }

    STEP_4_VERIFY_UI_UPDATE: {
      logic: |
        // After creation, user should be added to list
        EXPECT screen.getByText('John Doe') TO BE IN DOCUMENT
        EXPECT screen.getByText('john@example.com') TO BE IN DOCUMENT
    }
  }
}
```

---

#### Pattern 15.27: EditUser Component + API Integration

```pseudo
WORKFLOW EditUserComponent_APIIntegration {
  SETUP: {
    mock_handlers: |
      // Mock GET user endpoint
      rest.get('/api/v1/users/:id', (req, res, ctx) => {
        RETURN res(ctx.json({ id: 1, full_name: 'John Doe', email: 'john@example.com' }))
      })

      // Mock PATCH user endpoint
      rest.patch('/api/v1/users/:id', (req, res, ctx) => {
        RETURN res(ctx.json({ id: 1, ...req.body }))
      })
  }

  TEST: {
    logic: |
      render(<EditUserForm userId={1} />)

      // Wait for data to load
      WAIT FOR screen.getByDisplayValue('John Doe') TO APPEAR

      // Edit
      await user.clear(screen.getByLabelText('Full Name'))
      await user.type(screen.getByLabelText('Full Name'), 'Jane Doe')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Verify API called
      WAIT FOR screen.getByText('User updated successfully')
      EXPECT patch_request.body.full_name TO BE 'Jane Doe'
  }
}
```

---

#### Patterns 15.28-15.29: Filters & Stats Widget Integration

```pseudo
WORKFLOW FiltersAndStatsWidget_Integration {
  FILTERS_COMPONENT (15.28): {
    description: "Test filter component with API integration"
    logic: |
      render(<UserFilters />)

      // Apply filters
      await user.selectOptions(screen.getByLabelText('Role'), 'ADMIN')
      await user.selectOptions(screen.getByLabelText('Status'), 'ACTIVE')
      await user.click(screen.getByRole('button', { name: /apply/i }))

      // Verify API called with correct params
      WAIT FOR api_request WITH params={ role: 'ADMIN', status: 'ACTIVE' }

      // Verify results updated
      EXPECT all_user_rows TO HAVE role='ADMIN' AND status='ACTIVE'
  }

  STATS_WIDGET (15.29): {
    description: "Test stats widget fetches and displays data"
    logic: |
      // Mock stats endpoint
      server.use(
        rest.get('/api/v1/stats/users', (req, res, ctx) => {
          RETURN res(ctx.json({
            total: 150,
            active: 120,
            inactive: 30
          }))
        })
      )

      render(<StatsWidget />)

      // Verify loading state
      EXPECT screen.getByTestId('loading-spinner') TO BE IN DOCUMENT

      // Verify stats displayed
      WAIT FOR screen.getByText('150') TO APPEAR  # Total users
      EXPECT screen.getByText('120') TO BE IN DOCUMENT  # Active
      EXPECT screen.getByText('30') TO BE IN DOCUMENT  # Inactive

      // Verify refresh functionality
      await user.click(screen.getByRole('button', { name: /refresh/i }))
      EXPECT api_request_count TO BE 2
  }
}
```

---

## TESTING BEST PRACTICES

### Parametrized Tests

```pseudo
PATTERN ParametrizedTests {
  USAGE: |
    @pytest.mark.parametrize("email,password,expected_status", [
      ("valid@example.com", "password123", 200),
      ("invalid@example.com", "wrong", 401),
      ("", "password123", 422),
      ("no-at-sign", "password123", 422),
    ])
    async def test_login(async_client, email, password, expected_status):
      response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
      )
      ASSERT response.status_code == expected_status
}
```

### Database Transaction Rollback

```pseudo
PATTERN DatabaseRollback {
  AUTO_ROLLBACK_FIXTURE: |
    @pytest.fixture(autouse=True)
    async def transaction_rollback():
      async with database.transaction() as tx:
        yield
        await tx.rollback()

  BENEFITS: |
    - Each test starts with clean database state
    - No test pollution
    - Fast test execution (no need to rebuild DB)
    - Parallel test execution safe
}
```

### MSW for API Mocking

```pseudo
PATTERN MSW_Mocking {
  SETUP: |
    import { rest } from 'msw'
    import { setupServer } from 'msw/node'

    const handlers = [
      rest.get('/api/v1/users', (req, res, ctx) => {
        RETURN res(ctx.json({ items: [...], total: 10 }))
      })
    ]

    const server = setupServer(...handlers)

    beforeAll(() => server.listen())
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

  ERROR_TESTING: |
    // Override handler for specific test
    test('should handle API error', async () => {
      server.use(
        rest.get('/api/v1/users', (req, res, ctx) => {
          RETURN res(ctx.status(500), ctx.json({ detail: "Internal server error" }))
        })
      )

      render(<UserList />)
      EXPECT screen.getByText('Failed to load users') TO APPEAR
    })
}
```

---

## IMPLEMENTATION CHECKLIST

### Backend Tests
- [ ] Install dependencies: `poetry add --group dev pytest-asyncio httpx pytest-cov`
- [ ] Configure pytest.ini with async settings
- [ ] Create conftest.py with fixtures (async_client, auth_headers, test_db)
- [ ] Write authentication API tests (Pattern 15.16)
- [ ] Write user CRUD API tests (Pattern 15.17)
- [ ] Write conversation API tests (Pattern 15.18)
- [ ] Write file upload tests (Pattern 15.19)
- [ ] Write error handling tests (Pattern 15.20)
- [ ] Write WebSocket tests (Patterns 15.21-15.23)
- [ ] Configure coverage reporting: `pytest --cov=app --cov-report=html`

### Frontend Integration Tests
- [ ] Install MSW: `npm install -D msw`
- [ ] Setup MSW handlers
- [ ] Write CreateUser + API test (Pattern 15.26)
- [ ] Write EditUser + API test (Pattern 15.27)
- [ ] Write Filters + API test (Pattern 15.28)
- [ ] Write Stats Widget + API test (Pattern 15.29)
- [ ] Configure Jest to use MSW

---

**Technologies**: pytest, pytest-asyncio, httpx, MSW, Jest, Testing Library
**Test Types**: API Integration, WebSocket, Component-API Integration
**Coverage**: 14 patterns (15.16-15.29)
**Format**: Workflow as Code (pseudo-code)

---

*End of API Integration Testing Specialist*
