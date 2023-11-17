export default {
  baseURL: process.env.API_CIELO_BASEURL,
  headers: {
    AppAuthorization: process.env.API_CIELO_KEY,
  },
};
