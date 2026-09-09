from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3009/console/login")
    page.wait_for_timeout(1000)

    # Hover over the disabled "Continue to console" button
    button = page.get_by_role("button", name="Continue to console")
    button.hover(force=True)
    page.wait_for_timeout(1000)

    # Take screenshot at the key moment
    page.screenshot(path="verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="."
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
