# WRC-Analyst-Extension
WRC Analyst Extension
An unofficial browser extension for extracting and analyzing multiplayer event data from EA Sports WRC club pages on Racenet.

English
Hungarian

⚠️ Important Limitation
Due to Racenet's DOM pagination structure, this extension can only extract data for the first 20-21 participants per event stage directly from the page. For complete event analysis involving all participants, please use the built-in Multi-Stage CSV Analyzer feature with exported data files.

Features
Direct Data Extraction: Extracts stage and overall times from Racenet club pages.
Interactive Charts: Performance trends, consistency ratings, pace evolution, and car comparisons (SVG based).
Multi-Stage CSV Analyzer: Upload multiple CSV files to calculate combined total times and differences across an entire event.
Bilingual UI: Fully translated English and Hungarian interface (English by default).
Data Export: Download extracted data as a structured .json file.
Installation (Developer Mode)
Since this extension is not published on the Chrome Web Store, you must install it manually:

Download or clone this repository.
Open Google Chrome and go to chrome://extensions/.
Enable Developer mode (toggle in the top right corner).
Click Load unpacked.
Select the root folder of this project (the folder containing manifest.json).
The extension icon will appear in your browser toolbar. Pin it for easy access.
Navigate to a WRC club event page on Racenet and click the icon.

Usage
Open a club event on racenet.com/ea_sports_wrc/clubs/...
Click the extension icon to open the sidebar.
Click "Load Event" to scan the current page.
Click "Collect All Stage Data" to automatically cycle through stages and gather data.
Click "Open Analysis" to view charts and statistics.
(Optional) Click "Multi Stage - CSV Analyzer" to use the offline CSV merger.

Technologies
Vanilla JavaScript (No frameworks)
SVG based custom charts (No external charting libraries like Chart.js)
Chrome Extension Manifest V3

Support
If you find this tool useful, you can support the development via Ko-fi.
<script type='text/javascript' src='https://storage.ko-fi.com/cdn/widget/Widget_2.js'></script><script type='text/javascript'>kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'T6T71NZ3ZL');kofiwidget2.draw();</script> 
