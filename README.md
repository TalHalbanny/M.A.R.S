#  MARS (Maintenance and Reporting System)

## Author: Tal Halbanny


MARS was developed for an automated warehouse system. The purpose of MARS is to monitor the state of robots, document issues, and see the history of repeating issues on certain equipment.

---

## Application Screenshots

Here is a visual overview of the MARS Monitoring System interface:

### Main Dashboard
The main view provides a consolidated overview of all system operations.

![MARS Main Dashboard](./assets/dashboard.png)

### Create Technician Task
A dedicated interface for technical crew members to log new issues or leave handover notes.

![Create New Technician Task](./assets/task.png)

### Real-Time Monitoring
The monitoring screen displays the live status of every individual shuttle robot.

![Real-Time Monitoring View](./assets/monitoring.png)

---

##  Features

*   **Monitoring Automated Robot System:** The application shows the real-time state of each robot in the warehouse.
*   **Access Every Robot PLC Screen:** Allows authorized users to enter the advanced PLC interface.
*   **Tasks:** Enables technical crew members to leave notes and task assignments.
*   **History:** Displays a comprehensive history of issues for all warehouse equipment.
*   **Latest Issues:** The most recent issues are prominently displayed on the main view.

---

##  Monitoring Guide

Use this guide to interpret the visual indicators in the monitoring dashboard:

### Shuttle Robot Status Colors
*   <span style="color:green">**Green**</span>: Healthy Robot.
*   <span style="color:#FFC300">**Yellow**</span>: Robot is currently in a task.
*   <span style="color:red">**Red**</span>: Abnormal Shuttle (requires attention).
*   <span style="color:blue">**Blue**</span>: Shuttle was clicked while abnormal (please wait for system response).

### Alerts and Indicators
*   **Sound Off / On:** A toggle switch allows the user to enable or disable an audible alarm for broken shuttles.
*   **Indicator:** The indicator in the top right corner of the main view indicates if there is a new broken shuttle robot on the list.

---

## ⚙️ Installation & First Use

*   **Internal Network Application:** MARS is an internal use application tightly integrated into the local workplace network.
*   **Network Connection:** To use MARS and receive up-to-date information, the user must be connected to the local warehouse network with a steady and reliable connection.
