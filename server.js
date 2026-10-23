const AppServer = require('./src/AppServer');
const app = new AppServer(process.env.PORT || 3000);
app.start();