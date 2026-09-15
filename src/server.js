const app = require("./app");
const env = require("./config/env");

app.listen(env.PORT, () => {
  console.log(
    `Server running on port ${env.PORT} in ${env.NODE_ENV} mode`
  );
});