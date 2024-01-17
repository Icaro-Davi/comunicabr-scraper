# Web scraper for website "gov.br"

This is a small work for collecting data from the gov.br website, most precisely from the [ComunicaBR]([https://](https://www.gov.br/secom/pt-br/acesso-a-informacao/comunicabr)) area. The scraper will obtain the data within the **iframe** tag that contains information about cities in Brazil.

This project uses **puppeteer-core** and **chromium browser** to navigate between pages and collect the necessary data, after collection the data will be filtered and stored in a spreadsheet and JSON file for caching.

If the website receives an update that changes the layout, this project will no longer work, if this happens, the scraper will need to update the logic to obtain the data again.

#### Steps to run te scraper

1. You can run this project just installing NodeJS via https://nodejs.org/en.
2. Open the terminal go to the project and run just **npm** to install dependencies.
3. After install run the script **npm start** to begin the data collection.
4. On the end, just run **npm run open:spreadsheet** to open the spreadsheet.

If you want to change something, inside the **src** folder you'll find the **configurations.js** file, there can change the **searchCitiesFromUF** property to extract data from new states in Brazil.
