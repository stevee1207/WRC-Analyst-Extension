# WRC-Analyst-Extension

WRC Analyst Extension
An unofficial browser extension for extracting and analyzing multiplayer event data from EA Sports WRC club pages on Racenet.

This is my first "application", so it’s likely to have bugs... Since it turned out to be quite complex, I tried to simplify it as much as possible, but don’t expect any further updates from here on out. If you’re a fan of the WRC game, feel free to use it and have fun playing against your friends.

## ✨ Samples (others in the sample_images folder)

(Example: some brief analysis)

<img width="400" alt="image" src="https://github.com/user-attachments/assets/65023f41-5bba-47b7-90ae-351152bf0ffd" />

(Example: multi-day CSV summary)

<img width="500" alt="image" src="https://github.com/user-attachments/assets/f949e629-03ea-4d3c-a292-9c99f9a7b862" />

## ⚠️ Limitation

- Due to Racenet's DOM pagination structure, **this extension can only extract data for the first 20 participants per event stage directly from the page.** For complete event analysis involving all participants, please use the built-in Multi-Stage CSV Analyzer feature with exported data files.

- **You can only analyze the data within a small group of acquaintances—a maximum of 20 people!** Ideal for groups of friends to **organize multi-day competitions** and **calculate final scores.**

## ✨ Features

- **Direct Data Extraction:** Extracts stage and overall times from Racenet club pages.
- **Interactive SVG Charts:** Performance trends, consistency ratings, pace evolution, and car comparisons without external dependencies.
- **Multi-Stage CSV Analyzer:** Upload multiple CSV files to calculate combined total times and differences.
- **Bilingual UI:** Fully translated English and Hungarian interface (English by default).
- **Data Export:** Download extracted data as a structured .json file if you want to use elswhere.

## 📦 Installation (Developer Mode)

Download from the release page: [Releases page](/WRC-Analyst-Extension/releases/tag/v0.1)

Since this extension is not published on the Chrome Web Store, you must install it manually:

**Method 1: Load Unpacked**

- Download or clone this repository.
- Open Google Chrome and go to chrome://extensions/.
- Enable Developer mode (toggle in the top right corner).
- Click Load unpacked.
- Select the root folder of this project (the folder containing manifest.json).
- The extension icon will appear in your browser toolbar. Pin it for easy access.

**Method 2: Drag & Drop**

- Extract the downloaded .zip file to a folder on your computer.
- Simply drag and drop that folder into the Chrome extensions page (chrome://extensions/).
(Be sure not to move or delete the folder while it is in use!)
- Navigate to a WRC club event page on Racenet to start using it.

## 🚀 Usage

**Simple Event Analyze**
- Open a club event on racenet dot com and go to the club page
- Click the extension icon to open the sidebar or refresh the page with F5.
- Click "Load Event" to scan the current page.
- Click "Collect All Stage Data" to automatically cycle through stages and gather data.
- Click "Open Analysis" to view charts and statistics.

**PRO - Multi Stage CSV Analyzer**

This option great if you and your friend seperate a WRC event to more days!
- Download the event resoults from the clubs (export CSV from the club day 1, club day 2 etc...)
- Click "Multi Stage - CSV Analyzer" to use the offline CSV merger.
- Open the CSV files and click Analyze
- Summarizes the daily results and displays the aggregated results in a table by day

## 💖 Support

If you find this tool useful, you can support via Ko-fi.

<a href='https://ko-fi.com/T6T71NZ3ZL' target='_blank'><img height='58' style='border:0px;height:58px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## 🌐 Languages

- English
- Hungarian

## ⚙️ Removal

If you don't like the add-on, removal is easy:

- Go to chrome://extensions/.
- Find the WRC Analyst Extension.
- Click **Remove**.
- You can now safely delete the downloaded extension folder from your computer.

## ✒️ Technologies

- Vanilla JavaScript (No frameworks)
- SVG based custom charts (No external charting libraries like Chart.js)
- Chrome Extension Manifest V3

![Chrome Version](https://img.shields.io/badge/Chrome-Manifest%20V3-brightgreen)
![Language](https://img.shields.io/badge/Language-Javascript-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)
