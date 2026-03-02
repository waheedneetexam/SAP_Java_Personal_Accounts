cd /home/user/projects/SAP_Java_Personal_Accounts/PricingApp
  npm install -g pm2
  pm2 start "PORT=4006 npm start" --name pricingapp
  pm2 save
  pm2 startup
  Useful checks:

  pm2 status
  pm2 logs pricingapp
  pm2 restart pricingapp