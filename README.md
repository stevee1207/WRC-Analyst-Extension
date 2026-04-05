# WRC-Analyst-Extension

WRC Analyst Extension
An unofficial browser extension for extracting and analyzing multiplayer event data from EA Sports WRC club pages on Racenet.

## ⚠️ Important Limitation

- Due to Racenet's DOM pagination structure, this extension can only extract data for the first 20-21 participants per event stage directly from the page. For complete event analysis involving all participants, please use the built-in Multi-Stage CSV Analyzer feature with exported data files.

## ✨ Features

- Direct Data Extraction: Extracts stage and overall times from Racenet club pages.
- Interactive SVG Charts: Performance trends, consistency ratings, pace evolution, and car comparisons without external dependencies.
- Multi-Stage CSV Analyzer: Upload multiple CSV files to calculate combined total times and differences.
- Bilingual UI: Fully translated English and Hungarian interface (English by default).
- Data Export: Download extracted data as a structured .json file.

## 📦 Installation (Developer Mode)

Since this extension is not published on the Chrome Web Store, you must install it manually:

- Download or clone this repository.
- Open Google Chrome and go to chrome://extensions/.
- Enable Developer mode (toggle in the top right corner).
- Click Load unpacked.
- Select the root folder of this project (the folder containing manifest.json).
- The extension icon will appear in your browser toolbar. Pin it for easy access.
- Navigate to a WRC club event page on Racenet and click the icon.

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

If you find this tool useful, you can support the development via Ko-fi.

<a href='https://ko-fi.com/T6T71NZ3ZL' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## 🌐 Languages

- English
- Hungarian

## ✒️ Technologies

- Vanilla JavaScript (No frameworks)
- SVG based custom charts (No external charting libraries like Chart.js)
- Chrome Extension Manifest V3

