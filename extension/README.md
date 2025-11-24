# ScrapeSense Chrome Extension

A powerful Chrome extension for visual web scraping with point-and-click element selection.

## Features

✨ **Visual Element Selection** - Click elements on any webpage to select data fields  
🔄 **Multi-Page Scraping** - Automatic pagination with configurable limits  
📊 **Multiple Export Formats** - CSV, XLSX, JSON  
📧 **Email & Telegram Export** - Send data directly to email or Telegram  
🔐 **Secure Authentication** - JWT-based auth with your ScrapeSense account  
💾 **Dashboard Integration** - All scraped data syncs with your dashboard  

## Installation

### For Development

1. Clone the repository
2. Navigate to the extension folder:
   ```bash
   cd extension
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the extension:
   ```bash
   npm run build
   ```

5. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

### For Users

1. Download the extension from [ScrapeSense Dashboard](https://cheerio-scrapsense.vercel.app/dashboard/extension)
2. Extract the ZIP file
3. Open `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the extracted folder

## Usage

### 1. Login

- Click the extension icon in your browser toolbar
- Sign in with your ScrapeSense account credentials

### 2. Start Scraping

- Navigate to any website
- Click the extension icon
- Click "Start Selecting"
- Hover and click on elements you want to scrape
- Selected elements will be highlighted in green

### 3. Extract Data

- After selecting fields, click "Extract Data"
- View the scraped data in the "Data" tab
- Data automatically syncs to your dashboard

### 4. Multi-Page Scraping (Optional)

- Enable "Auto-pagination" checkbox
- Click "Select Next Button" and click the pagination button on the page
- Set max pages limit
- Extension will automatically scrape multiple pages

### 5. Export Data

Choose from multiple export options:
- **CSV** - Download as CSV file
- **Excel** - Download as XLSX file
- **JSON** - Download as JSON file
- **Email** - Send to your email (configure in Settings)
- **Telegram** - Send to Telegram (configure in Settings)

### 6. Settings

Configure your export preferences:
- **Email Address** - Receive scraped data via email
- **Telegram Chat ID** - Get data sent to Telegram (get ID from @userinfobot)

## Development

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean dist folder
npm run clean
```

### Project Structure

```
extension/
├── src/
│   ├── popup/          # Popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts
│   ├── content/        # Content scripts
│   │   ├── content.ts
│   │   └── content.css
│   ├── background/     # Background service worker
│   │   └── background.ts
│   ├── utils/          # Utilities
│   │   ├── api-client.ts
│   │   ├── selector-generator.ts
│   │   ├── data-extractor.ts
│   │   └── export-manager.ts
│   └── types/          # TypeScript types
│       └── index.ts
├── manifest.json       # Extension manifest
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Permissions

The extension requires the following permissions:

- **activeTab** - Access current tab for scraping
- **storage** - Store user data and settings locally
- **scripting** - Inject content scripts into web pages
- **tabs** - Query active tab information
- **host_permissions** - Access to all URLs for scraping

## Privacy

- All data is stored securely in your ScrapeSense account
- Authentication tokens are stored locally using Chrome's secure storage API
- No data is shared with third parties
- See our [Privacy Policy](https://cheerio-scrapsense.vercel.app/privacy) for details

## Support

- **Dashboard**: [https://cheerio-scrapsense.vercel.app](https://cheerio-scrapsense.vercel.app)
- **Issues**: [GitHub Issues](https://github.com/jaiswal-sarthak/cheerio-scrapsense/issues)
- **Email**: jsarthak135@gmail.com

## License

MIT License - see LICENSE file for details

## Version

Current Version: 1.0.0
