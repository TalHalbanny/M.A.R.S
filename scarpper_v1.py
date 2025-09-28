from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.chrome.options import Options
import json
import time

# Paths
chrome_driver_path = r"C:\Users\MSService\repositories\M.A.R.S-1\chromedriver.exe"
json_path = r"C:\Users\MSService\repositories\M.A.R.S-1\shuttle_data.json"

chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--window-size=1920,1080")

service = Service(executable_path=chrome_driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)

urlpath = "http://10.0.0.103/#/Admin1"
shuttle_management = "http://10.0.0.103/#/State1"

def log_in(url, brwoserdriver):
    brwoserdriver.get(url)
    time.sleep(3)
    try:
        username_field = brwoserdriver.find_element(By.ID, "username")
        password_field = brwoserdriver.find_element(By.ID, "password")
        language_field = brwoserdriver.find_element(By.ID, "English")
        login_button = brwoserdriver.find_element(By.XPATH, '//*[@id="container"]/button')

        username_field.send_keys("admin")
        password_field.send_keys("admin")
        Select(language_field).select_by_visible_text("English")
        login_button.click()
        time.sleep(3)

        brwoserdriver.get(shuttle_management)
        time.sleep(2)
        return True
    except Exception as e:
        print(f"Login error: {e}")
        return False

def commit_scrap(browserdriver):
    try:
        WebDriverWait(browserdriver, 10).until(
            lambda d: d.find_elements(By.TAG_NAME, "table")
        )
        table = browserdriver.find_element(By.TAG_NAME, "table")
        rows = table.find_elements(By.TAG_NAME, "tr")
        classified_data = []

        for row in rows:
            cols = row.find_elements(By.TAG_NAME, "td")
            row_data = [c.text.strip() for c in cols[:4]]
            if row_data:
                shuttle = row_data[0] if len(row_data) > 0 else "N/A"
                location = row_data[1] if len(row_data) > 1 else "N/A"
                status = row_data[2] if len(row_data) > 2 else "N/A"
                ip = row_data[3] if len(row_data) > 3 else "N/A"

                level, aisle = "N/A", "N/A"
                if "/" in location:
                    level_str, aisle_str = location.split("/")
                    level = level_str
                    aisle = "11" if aisle_str.startswith("111") else aisle_str[0]

                classified_data.append({
                    "Shuttle": shuttle,
                    "Level": level,
                    "Aisle": aisle,
                    "Status": status,
                    "IP": ip
                })
        return classified_data
    except Exception as e:
        print(f"Scraping error: {e}")
        return []

# --- Main execution ---
if __name__ == "__main__":
    try:
        if log_in(urlpath, driver):
            while True:
                shuttle_data = commit_scrap(driver)

                # Ensure always 73 entries
                if len(shuttle_data) < 73:
                    for i in range(len(shuttle_data), 73):
                        shuttle_data.append({
                            "Shuttle": f"Unknown-{i+1}",
                            "Level": "N/A",
                            "Aisle": "N/A",
                            "Status": "Unavailable",
                            "IP": "N/A"
                        })
                elif len(shuttle_data) > 73:
                    shuttle_data = shuttle_data[:73]

                # Overwrite JSON file completely
                with open(json_path, "w") as f:
                    json.dump(shuttle_data, f, indent=2)

                print(f"Updated JSON with {len(shuttle_data)} records.")

                # wait before next scrape
                time.sleep(3)
    finally:
        driver.quit()

