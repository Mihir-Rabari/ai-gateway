from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # Mock API calls to bypass authentication and load dashboard data
        page.route('**/api/v1/auth/session', lambda route: route.fulfill(status=200, json={"user": {"id": "1", "email": "test@example.com"}}))
        page.route('**/api/v1/usage/summary', lambda route: route.fulfill(status=200, json={"last7Days": {"dailyRequests": [{"date": "2023-10-01", "count": 10}, {"date": "2023-10-02", "count": 20}]}, "thisMonth": {"totalRequests": 30, "totalTokens": 100, "avgLatencyMs": 50, "successRate": 0.99, "topModels": [{"model": "gpt-4", "count": 15}, {"model": "claude-2", "count": 15}]}}))
        page.route('**/api/v1/billing/transactions', lambda route: route.fulfill(status=200, json=[]))
        page.route('**/api/v1/apps', lambda route: route.fulfill(status=200, json=[]))

        page.goto('http://localhost:3009/dashboard')

        # We also need to log in perhaps? No, mocking the session should be enough if the app routes correctly.
        # Wait for page and charts to render
        page.wait_for_timeout(5000)
        page.screenshot(path='dashboard.png')
        context.close()
        browser.close()

if __name__ == '__main__':
    verify()
