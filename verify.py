from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    time.sleep(20) # wait for next.js to compile
    page.goto("http://localhost:3009/console/login", wait_until="networkidle")
    page.screenshot(path="/home/jules/verification/screenshots/login.png")
    browser.close()
