import App from './app';

const port: number | string = process.env.APP_PORT || 3339;

App.listen(port, (): void => {
  console.log(`Server is Running on port ${port}`);
});
