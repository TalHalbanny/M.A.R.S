from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import time
import copy
import datetime


# Paths and URLs
chrome_driver_path = r"C:\Users\MSService\repositories\M.A.R.S-1\chromedriver.exe"
json_path = r"C:\Users\MSService\repositories\M.A.R.S-1\shuttle_data.json"
urlpath = "http://10.0.0.103/#/Admin1"
shuttle_management = "http://10.0.0.103/#/State1"

# CHROME OPTIONS
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--window-size=1920,1080")

# DRIVER
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)

# LOGIN FUNCTION
def log_in(url, browserdriver):
    browserdriver.get(url)
    time.sleep(2)
    try:
        username_field = browserdriver.find_element(By.ID, "username")
        password_field = browserdriver.find_element(By.ID, "password")
        language_field = browserdriver.find_element(By.ID, "English")
        login_button = browserdriver.find_element(By.XPATH, '//*[@id="container"]/button')

        username_field.send_keys("admin")
        password_field.send_keys("admin")
        Select(language_field).select_by_visible_text("English")
        login_button.click()
        time.sleep(3)

        browserdriver.get(shuttle_management)
        return True
    except Exception as e:
        print(f"Login error: {e}")
        return False

# SCRAPING FUNCTION
def commit_scrap(browserdriver):
    """Scrape table data only"""
    try:
        WebDriverWait(browserdriver, 10).until(lambda d: d.find_elements(By.TAG_NAME, "table"))
        table = browserdriver.find_element(By.TAG_NAME, "table")
        rows = table.find_elements(By.TAG_NAME, "tr")

        classified_data = {}
        for row in rows:
            cols = row.find_elements(By.TAG_NAME, "td")
            if not cols:
                continue

            shuttle = cols[0].text.strip()
            if shuttle == "" or shuttle == "N/A":
                continue

            location = cols[1].text.strip() if len(cols) > 1 else "N/A"
            status = cols[2].text.strip() if len(cols) > 2 else "N/A"
            ip = cols[3].text.strip() if len(cols) > 3 else "N/A"


            task_no_link = "N/A"

            if len(cols) > 7:
                try:
                    # Wait briefly for the <a> tag to exist in the correct column
                    a_tag = WebDriverWait(cols[7], 2).until(
                        EC.presence_of_element_located((By.TAG_NAME, "a"))
                    )
                    href = a_tag.get_attribute("href")
                    if href and href.strip():
                        task_no_link = href.strip()
                except:
                    task_no_link = "N/A"

            execution_phase = "No Current Phase"
            if len(cols) > 8:
                text_val = cols[8].text.strip()
                if text_val and text_val != "/":
                    execution_phase = text_val

            level, aisle = "N/A", "N/A"
            if "/" in location:
                try:
                    level_str, aisle_str = location.split("/")
                    level = level_str
                    aisle = "11" if aisle_str.startswith("111") else aisle_str[0]
                except:
                    pass

            classified_data[shuttle] = {
                "Shuttle": shuttle,
                "Level": level,
                "Aisle": aisle,
                "Status": status,
                "IP": ip,
                "ExecutionPhase": execution_phase,
                "TaskNoLink": task_no_link,  # added this
            }

        return classified_data
    except Exception as e:
        print(f"Scraping error: {e}")
        return {}

# MAIN
if __name__ == "__main__":
    try:
        if not log_in(urlpath, driver):
            raise Exception("Login failed")

        print("\n--- STARTING LIVE DATA SCRAPING ---")

        while True:
            live_data = commit_scrap(driver)
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Load existing JSON to preserve OperationLink & TaskNoLink
            try:
                with open(json_path, "r") as f:
                    existing_data = json.load(f)
            except:
                existing_data = []

            # Merge live data while keeping existing OperationLink & TaskNoLink if present
            current_report = []
            for shuttle_id, stats in live_data.items():
                merged_info = copy.deepcopy(stats)
                existing_entry = next((item for item in existing_data if item.get("Shuttle") == shuttle_id), {})

                if "OperationLink" in existing_entry:
                    merged_info["OperationLink"] = existing_entry["OperationLink"]

                if "TaskNoLink" in existing_entry:
                    merged_info["TaskNoLink"] = existing_entry["TaskNoLink"]

                current_report.append(merged_info)

            # Save updated JSON
            try:
                with open(json_path, "w") as f:
                    json.dump(current_report, f, indent=4)
                print(f"[{current_time}] JSON updated with {len(current_report)} shuttles.")
            except Exception as e:
                print(f"Error saving JSON: {e}")

            time.sleep(3)

    except KeyboardInterrupt:
        print("Scraper stopped manually.")
    finally:
        driver.quit()
        print("Browser closed.")
